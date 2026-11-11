package deploy

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Prefix is where the deploy API lives on every instance host.
const Prefix = "/_ph/deploy/v1"

const (
	maxJSONBytes      = 20 << 20
	maxBundleBytes    = 64 << 20 // compressed upload per request; Cloudflare caps bodies at 100 MB
	maxBundleRawBytes = 256 << 20
)

// Instance is what the deploy API needs to know about the instance a request's host names.
type Instance struct {
	ID, Subdomain, OwnerID      string
	Power                       bool
	Suspension, OwnerSuspension string
	// Elsewhere, if set, means another edge serves the instance (421 with this message).
	Elsewhere string
}

// DeployRecord is a row in the mothership's deploys collection.
type DeployRecord struct {
	Instance      string  `json:"instance"`
	User          string  `json:"user"`
	Status        string  `json:"status"` // success | failed
	FileCount     int     `json:"file_count"`
	UploadedCount float64 `json:"uploaded_count"`
	UploadedBytes float64 `json:"uploaded_bytes"`
	TotalBytes    int64   `json:"total_bytes"`
	Commit        string  `json:"commit"`
	Message       string  `json:"message"`
	Source        string  `json:"source"`
	TokenLabel    string  `json:"token_label"`
	Error         string  `json:"error"`
}

// Backend is the control plane: instance lookup, token checks and deploy history.
type Backend interface {
	Lookup(host string) (Instance, bool)
	// VerifyPAT and VerifyJWT return *AuthError for a refused token; any other error is treated as an outage.
	VerifyPAT(ctx context.Context, token, ip string) (PATResult, error)
	VerifyJWT(ctx context.Context, token string) (userID string, err error)
	RecordDeploy(ctx context.Context, rec DeployRecord) (id string, err error)
}

// Instances is the part of Pocker's Manager the deploy API uses.
type Instances interface {
	Running(id string) bool
	InstanceDir(id string) (string, bool)
	WithInstanceStopped(ctx context.Context, id string, fn func(dir string) error) error
	StartInstance(ctx context.Context, id string) error
}

// Options configure the API.
type Options struct {
	Backend Backend
	// Instances returns the running Manager (nil until the server has started).
	Instances func() Instances
	// PBRoot holds instance folders (<PBRoot>/<id>) for instances the Manager doesn't know.
	PBRoot string
	// DataRoot holds deploy stores (<DataRoot>/<id>).
	DataRoot string
	// PlatformPaths are code-set paths that aren't the customer's: never compared or deleted.
	PlatformPaths []string
	// IsRemote, if set, reports hosts whose instance another edge runs: their requests go to next (which forwards
	// them) instead of being answered here.
	IsRemote func(host string) bool
	Logger   *slog.Logger
}

// API serves /_ph/deploy/v1 on instance hosts.
type API struct {
	opts  Options
	auth  *authResolver
	log   *slog.Logger
	locks sync.Map // instance id -> *sync.Mutex

	mu     sync.Mutex
	stores map[string]*Store
}

// New creates the deploy API.
func New(opts Options) *API {
	log := opts.Logger
	if log == nil {
		log = slog.Default()
	}
	return &API{opts: opts, auth: newAuthResolver(opts.Backend), log: log.With("component", "deploy"), stores: map[string]*Store{}}
}

// Wrap routes deploy API requests to the API and everything else to next.
func (a *API) Wrap(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		isAPI := r.URL.Path == Prefix || strings.HasPrefix(r.URL.Path, Prefix+"/")
		isLogs := r.URL.Path == "/logs" && (r.Method == http.MethodPost || r.Method == http.MethodOptions)
		if (!isAPI && !isLogs) || (a.opts.IsRemote != nil && a.opts.IsRemote(hostOf(r))) {
			next.ServeHTTP(w, r)
			return
		}
		if isLogs {
			openCORS(w, r)
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			if err := a.dashboardLogs(w, r); err != nil {
				a.fail(w, err)
			}
			return
		}
		a.ServeHTTP(w, r)
	})
}

// httpError is an answer with a status and JSON body {status, message, ...extra}.
type httpError struct {
	status  int
	message string
	extra   map[string]any
}

func (e *httpError) Error() string { return e.message }

func errf(status int, format string, args ...any) error {
	return &httpError{status: status, message: fmt.Sprintf(format, args...)}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func (a *API) fail(w http.ResponseWriter, err error) {
	body := func(status int, msg string) map[string]any { return map[string]any{"status": status, "message": msg} }
	var (
		he *httpError
		me *ManifestError
		be *BundleError
		mb *MissingBlobsError
		ce *ConflictError
		ae *AuthError
		mx *http.MaxBytesError
	)
	switch {
	case errors.As(err, &he):
		b := body(he.status, he.message)
		for k, v := range he.extra {
			b[k] = v
		}
		writeJSON(w, he.status, b)
	case errors.As(err, &ae):
		writeJSON(w, ae.Status, body(ae.Status, ae.Message))
	case errors.As(err, &me), errors.As(err, &be):
		writeJSON(w, 400, body(400, err.Error()))
	case errors.As(err, &mb):
		b := body(409, mb.Error())
		b["missing"] = mb.Missing
		writeJSON(w, 409, b)
	case errors.As(err, &ce):
		writeJSON(w, 409, body(409, ce.Error()))
	case errors.As(err, &mx):
		writeJSON(w, 413, body(413, "Request too large"))
	default:
		a.log.Error("deploy API error", "error", err)
		writeJSON(w, 500, body(500, "Deploy failed: "+err.Error()))
	}
}

func hostOf(r *http.Request) string {
	h := strings.ToLower(r.Host)
	if i := strings.LastIndexByte(h, ':'); i >= 0 && !strings.Contains(h[i:], "]") {
		if _, err := strconv.Atoi(h[i+1:]); err == nil {
			h = h[:i]
		}
	}
	return h
}

// clientIP: the edge sits behind Cloudflare (and possibly a proxy), so the peer address is rarely the client.
func clientIP(r *http.Request) string {
	if v := strings.TrimSpace(r.Header.Get("Cf-Connecting-Ip")); v != "" {
		return v
	}
	if v := strings.TrimSpace(strings.Split(r.Header.Get("X-Forwarded-For"), ",")[0]); v != "" {
		return v
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

type reqCtx struct {
	inst  Instance
	auth  Auth
	store *Store
	dir   string
}

func (a *API) instances() Instances {
	if a.opts.Instances == nil {
		return nil
	}
	return a.opts.Instances()
}

func (a *API) instanceDir(id string) string {
	if m := a.instances(); m != nil {
		if d, ok := m.InstanceDir(id); ok {
			return d
		}
	}
	return filepath.Join(a.opts.PBRoot, id)
}

func (a *API) storeFor(id, dir string) *Store {
	a.mu.Lock()
	defer a.mu.Unlock()
	s, ok := a.stores[id]
	if !ok || s.instanceDir != dir {
		s = newStore(filepath.Join(a.opts.DataRoot, id), dir, a.opts.PlatformPaths)
		a.stores[id] = s
	}
	return s
}

// lock serializes commits and file writes per instance.
func (a *API) lock(id string) func() {
	m, _ := a.locks.LoadOrStore(id, &sync.Mutex{})
	mu := m.(*sync.Mutex)
	mu.Lock()
	return mu.Unlock
}

// authorize resolves the instance by host and checks the token. Not yours and not in the token's scope get the same
// 404, so tokens can't probe instance names.
func (a *API) authorize(r *http.Request, needWrite bool) (*reqCtx, error) {
	host := hostOf(r)
	inst, ok := a.opts.Backend.Lookup(host)
	if !ok {
		return nil, errf(404, "%s not found", host)
	}
	auth, err := a.auth.resolve(r.Context(), r.Header.Get("Authorization"), clientIP(r), false)
	if err != nil {
		return nil, err
	}
	// the token's instances may have just been edited in the dashboard: re-check before refusing
	if auth.Via == "pat" && inst.OwnerID == auth.UserID && !auth.allows(inst.ID, inst.OwnerID) {
		if auth, err = a.auth.resolve(r.Context(), r.Header.Get("Authorization"), clientIP(r), true); err != nil {
			return nil, err
		}
	}
	if inst.OwnerID != auth.UserID || !auth.allows(inst.ID, inst.OwnerID) {
		return nil, errf(404, "%s not found", host)
	}
	if needWrite && !auth.can("write") {
		return nil, errf(403, "This token is read-only. Create a token with write access to deploy.")
	}
	if s := strings.TrimSpace(inst.OwnerSuspension); s != "" {
		return nil, errf(403, "%s", s)
	}
	if s := strings.TrimSpace(inst.Suspension); s != "" {
		return nil, errf(403, "%s", s)
	}
	if inst.Elsewhere != "" {
		return nil, errf(http.StatusMisdirectedRequest, "%s", inst.Elsewhere)
	}
	dir := a.instanceDir(inst.ID)
	return &reqCtx{inst: inst, auth: auth, store: a.storeFor(inst.ID, dir), dir: dir}, nil
}

func readJSON(w http.ResponseWriter, r *http.Request) (map[string]any, error) {
	b, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxJSONBytes))
	if err != nil {
		return nil, err
	}
	body := map[string]any{}
	if len(strings.TrimSpace(string(b))) == 0 {
		return body, nil
	}
	if err := json.Unmarshal(b, &body); err != nil {
		return nil, errf(400, "Invalid JSON body: %v", err)
	}
	return body, nil
}

func clip(v any, max int) string {
	s, _ := v.(string)
	if r := []rune(s); len(r) > max {
		return string(r[:max])
	}
	return s
}

// num follows JavaScript's Number(v) || 0 for the values a client sends.
func num(v any) float64 {
	switch x := v.(type) {
	case float64:
		return x
	case string:
		f, err := strconv.ParseFloat(strings.TrimSpace(x), 64)
		if err == nil {
			return f
		}
	case bool:
		if x {
			return 1
		}
	}
	return 0
}

func (a *API) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, Prefix), "/")
	var err error
	switch {
	case path == "/whoami" && r.Method == http.MethodGet:
		err = a.whoami(w, r)
	case path == "/check" && r.Method == http.MethodPost:
		err = a.check(w, r)
	case path == "/blobs" && r.Method == http.MethodPost:
		err = a.blobs(w, r)
	case path == "/commit" && r.Method == http.MethodPost:
		err = a.commit(w, r)
	case path == "/files" && (r.Method == http.MethodGet || r.Method == http.MethodHead):
		err = a.listFiles(w, r)
	case path == "/files" && r.Method == http.MethodDelete:
		err = a.deleteFile(w, r)
	case path == "/files/raw" && (r.Method == http.MethodGet || r.Method == http.MethodHead):
		err = a.readFile(w, r)
	case path == "/files/raw" && r.Method == http.MethodPut:
		err = a.writeFile(w, r)
	case path == "/logs" && r.Method == http.MethodGet:
		err = a.logs(w, r)
	default:
		err = errf(404, "Not found")
	}
	if err != nil && err != errHeadersSent {
		a.fail(w, err)
	}
}

// errHeadersSent: a streaming handler failed after answering; nothing more to write.
var errHeadersSent = errors.New("headers sent")

func (a *API) whoami(w http.ResponseWriter, r *http.Request) error {
	c, err := a.authorize(r, false)
	if err != nil {
		return err
	}
	var token any
	if c.auth.TokenLabel != "" {
		token = c.auth.TokenLabel
	}
	writeJSON(w, 200, map[string]any{
		"instance": map[string]any{"id": c.inst.ID, "subdomain": c.inst.Subdomain},
		"via":      c.auth.Via, "token": token, "scopes": c.auth.Scopes,
	})
	return nil
}

func (a *API) check(w http.ResponseWriter, r *http.Request) error {
	c, err := a.authorize(r, true)
	if err != nil {
		return err
	}
	body, err := readJSON(w, r)
	if err != nil {
		return err
	}
	m, err := validateManifest(body["files"])
	if err != nil {
		return err
	}
	missing, err := c.store.findMissing(m, body["nodeModules"] == true)
	if err != nil {
		return err
	}
	a.log.Debug("check", "instance", c.inst.ID, "files", len(m), "missing", len(missing))
	writeJSON(w, 200, map[string]any{"missing": missing})
	return nil
}

func (a *API) blobs(w http.ResponseWriter, r *http.Request) error {
	c, err := a.authorize(r, true)
	if err != nil {
		return err
	}
	b, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxBundleBytes))
	if err != nil {
		return err
	}
	if len(b) == 0 {
		return errf(400, "Empty upload")
	}
	entries, err := decodeBundle(b, maxBundleRawBytes)
	if err != nil {
		return err
	}
	stored := 0
	for _, e := range entries {
		ok, err := c.store.putBlob(e.hash, e.data)
		if err != nil {
			return err
		}
		if ok {
			stored++
		}
	}
	writeJSON(w, 200, map[string]any{"received": len(entries), "stored": stored})
	return nil
}

type commitResult struct {
	DeployID            *string        `json:"deployId"`
	Instance            map[string]any `json:"instance"`
	FileCount           int            `json:"fileCount"`
	Written             []string       `json:"written"`
	Deleted             []string       `json:"deleted"`
	WrittenCount        int            `json:"writtenCount"`
	DeletedCount        int            `json:"deletedCount"`
	Unchanged           int            `json:"unchanged"`
	TotalBytes          int64          `json:"totalBytes"`
	ReplacedNodeModules bool           `json:"replacedNodeModules"`
	NothingChanged      bool           `json:"nothingChanged"`
	WasRunning          bool           `json:"wasRunning"`
	Restarted           bool           `json:"restarted"`
	StartError          string         `json:"startError,omitempty"`
}

func first(s []string, n int) []string {
	if len(s) > n {
		return s[:n]
	}
	return s
}

func (a *API) commit(w http.ResponseWriter, r *http.Request) error {
	c, err := a.authorize(r, true)
	if err != nil {
		return err
	}
	body, err := readJSON(w, r)
	if err != nil {
		return err
	}
	m, err := validateManifest(body["files"])
	if err != nil {
		return err
	}
	nodeModules := body["nodeModules"] == true
	base := DeployRecord{
		Instance: c.inst.ID, User: c.auth.UserID, FileCount: len(m), TokenLabel: c.auth.TokenLabel,
		Commit: clip(body["commit"], 100), Message: clip(body["message"], 500), Source: clip(body["source"], 100),
		UploadedCount: num(body["uploadedCount"]), UploadedBytes: num(body["uploadedBytes"]),
	}
	// history and restarts outlive a client that hangs up
	ctx := context.WithoutCancel(r.Context())
	record := func(rec DeployRecord) (string, error) {
		rctx, cancel := context.WithTimeout(ctx, 15*time.Second)
		defer cancel()
		return a.opts.Backend.RecordDeploy(rctx, rec)
	}

	unlock := a.lock(c.inst.ID)
	defer unlock()

	_ = c.store.cleanTmp()
	// slow work (copying, hashing) happens here, before the instance is touched
	st, err := c.store.stage(m, nodeModules)
	if err != nil {
		return err
	}
	changed := append(append([]string{}, st.plan.toWrite...), st.plan.toDelete...)
	if st.replaceNodeModules {
		changed = append(changed, nodeModulesDir)
	}
	nothingChanged := len(changed) == 0
	// static files are served from disk and each rename is atomic, so pb_public-only deploys skip the restart
	needsRestart := false
	for _, p := range changed {
		if !strings.HasPrefix(p, "pb_public/") {
			needsRestart = true
			break
		}
	}

	var applied *applyResult
	wasRunning := false
	mgr := a.instances()
	if needsRestart && mgr != nil {
		if _, known := mgr.InstanceDir(c.inst.ID); known {
			wasRunning = mgr.Running(c.inst.ID)
			err = mgr.WithInstanceStopped(ctx, c.inst.ID, func(string) error {
				var aerr error
				applied, aerr = c.store.apply(m, st)
				return aerr
			})
		} else {
			applied, err = c.store.apply(m, st)
		}
	} else {
		applied, err = c.store.apply(m, st)
	}
	if err != nil {
		_ = os.RemoveAll(st.stagingDir)
		rec := base
		rec.Status, rec.Error = "failed", clip(err.Error(), 2000)
		_, _ = record(rec)
		return err
	}

	var deployID *string
	if !nothingChanged {
		rec := base
		rec.Status, rec.TotalBytes = "success", applied.totalBytes
		id, rerr := record(rec)
		if rerr != nil || id == "" {
			if rerr != nil {
				a.log.Warn("could not record deploy", "instance", c.inst.ID, "error", rerr)
			}
			id = fmt.Sprintf("local-%d", time.Now().UnixMilli())
		}
		deployID = &id
		if err := c.store.recordManifest(id, m); err != nil {
			a.log.Warn("recordManifest failed", "instance", c.inst.ID, "error", err)
		}
		if _, err := c.store.gc(keepManifests); err != nil {
			a.log.Warn("deploy gc failed", "instance", c.inst.ID, "error", err)
		}
	}

	restarted, startError := false, ""
	if wasRunning && c.inst.Power && mgr != nil {
		if err := mgr.StartInstance(ctx, c.inst.ID); err != nil {
			startError = err.Error()
		} else {
			restarted = true
		}
	}

	id := "<none>"
	if deployID != nil {
		id = *deployID
	}
	a.log.Info("deploy", "id", id, "instance", c.inst.ID, "subdomain", c.inst.Subdomain,
		"written", len(applied.written), "deleted", len(applied.deleted), "unchanged", applied.unchanged, "restarted", restarted)
	writeJSON(w, 200, commitResult{
		DeployID: deployID, Instance: map[string]any{"id": c.inst.ID, "subdomain": c.inst.Subdomain}, FileCount: len(m),
		Written: first(applied.written, 500), Deleted: first(applied.deleted, 500),
		WrittenCount: len(applied.written), DeletedCount: len(applied.deleted), Unchanged: applied.unchanged,
		TotalBytes: applied.totalBytes, ReplacedNodeModules: applied.replacedNodeModule, NothingChanged: nothingChanged,
		WasRunning: wasRunning, Restarted: restarted, StartError: startError,
	})
	return nil
}
