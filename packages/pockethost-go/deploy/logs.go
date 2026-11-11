package deploy

import (
	"bufio"
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

var (
	logPoll      = 500 * time.Millisecond
	logPingEvery = 25 * time.Second
)

// logs: GET /logs?n=100 streams the instance's exec.log as server-sent events, one "log" event per entry
// ({message, stream, time}), after replaying the last n (0..1000). Any token that can reach the instance may read.
func (a *API) logs(w http.ResponseWriter, r *http.Request) error {
	c, err := a.authorize(r, false)
	if err != nil {
		return err
	}
	n, _ := strconv.Atoi(strings.TrimSpace(r.URL.Query().Get("n")))
	if r.URL.Query().Get("n") == "" {
		n = 100
	}
	return streamLog(w, r, c.dir, min(max(n, 0), 1000))
}

// streamLog writes <dir>/logs/exec.log as server-sent events until the client goes away.
func streamLog(w http.ResponseWriter, r *http.Request, dir string, n int) error {
	h := w.Header()
	h.Set("Content-Type", "text/event-stream; charset=UTF-8")
	h.Set("Connection", "keep-alive")
	h.Set("Cache-Control", "no-store")
	h.Set("X-Accel-Buffering", "no")
	w.WriteHeader(200)
	rc := http.NewResponseController(w)
	_ = rc.Flush()

	send := func(line []byte) bool {
		line = bytes.TrimRight(line, "\r\n")
		if len(bytes.TrimSpace(line)) == 0 {
			return true
		}
		var entry map[string]any
		if json.Unmarshal(line, &entry) != nil {
			entry = map[string]any{"stream": "stdout", "message": string(line), "time": time.Now().UTC().Format("2006-01-02T15:04:05.000Z")}
		}
		b, _ := json.Marshal(entry)
		if _, err := w.Write([]byte("event: log\ndata: " + string(b) + "\n\n")); err != nil {
			return false
		}
		return true
	}

	path := filepath.Join(dir, "logs", "exec.log")
	t := &tailer{path: path}
	for _, line := range t.start(n) {
		if !send(line) {
			return errHeadersSent
		}
	}
	_ = rc.Flush()

	poll := time.NewTicker(logPoll)
	defer poll.Stop()
	ping := time.NewTicker(logPingEvery)
	defer ping.Stop()
	defer t.close()
	for {
		select {
		case <-r.Context().Done():
			return nil
		case <-ping.C:
			if _, err := w.Write([]byte(": ping\n\n")); err != nil {
				return nil
			}
			_ = rc.Flush()
		case <-poll.C:
			lines := t.poll()
			for _, line := range lines {
				if !send(line) {
					return nil
				}
			}
			if len(lines) > 0 {
				_ = rc.Flush()
			}
		}
	}
}

// tailer follows a log file that Pocker rotates (exec.log → exec.log.1) by size: it reopens when the file is
// replaced or shrinks, and waits for a file that doesn't exist yet.
type tailer struct {
	path    string
	f       *os.File
	ino     os.FileInfo
	off     int64
	partial []byte
}

// start returns the last n complete lines and positions at the end.
func (t *tailer) start(n int) [][]byte {
	if !t.open() {
		return nil
	}
	st, _ := t.f.Stat()
	size := st.Size()
	// read back far enough for n lines (bounded)
	const chunk = 64 << 10
	var buf []byte
	pos := size
	for pos > 0 && bytes.Count(buf, []byte("\n")) <= n && len(buf) < 8<<20 {
		step := min(int64(chunk), pos)
		pos -= step
		b := make([]byte, step)
		if _, err := t.f.ReadAt(b, pos); err != nil && err != io.EOF {
			break
		}
		buf = append(b, buf...)
	}
	t.off = size
	end := bytes.LastIndexByte(buf, '\n')
	if end < 0 {
		t.off = size - int64(len(buf))
		return nil
	}
	t.off = size - int64(len(buf)-end-1) // re-read an unfinished last line later
	lines := bytes.Split(buf[:end], []byte("\n"))
	if pos > 0 && len(lines) > 0 {
		lines = lines[1:] // first one may be cut
	}
	if n == 0 {
		return nil
	}
	if len(lines) > n {
		lines = lines[len(lines)-n:]
	}
	return lines
}

func (t *tailer) open() bool {
	f, err := os.Open(t.path)
	if err != nil {
		return false
	}
	st, err := f.Stat()
	if err != nil {
		f.Close()
		return false
	}
	t.f, t.ino, t.off, t.partial = f, st, 0, nil
	return true
}

func (t *tailer) close() {
	if t.f != nil {
		t.f.Close()
		t.f = nil
	}
}

// poll returns complete lines appended since the last call.
func (t *tailer) poll() [][]byte {
	if t.f == nil {
		if !t.open() {
			return nil
		}
	} else if st, err := os.Stat(t.path); err == nil && (!os.SameFile(st, t.ino) || st.Size() < t.off) {
		// rotated or truncated: finish nothing more from the old file, start the new one from the top
		t.close()
		if !t.open() {
			return nil
		}
	}
	if _, err := t.f.Seek(t.off, io.SeekStart); err != nil {
		return nil
	}
	data, _ := io.ReadAll(bufio.NewReader(io.LimitReader(t.f, 4<<20)))
	t.off += int64(len(data))
	data = append(t.partial, data...)
	end := bytes.LastIndexByte(data, '\n')
	if end < 0 {
		t.partial = data
		return nil
	}
	t.partial = append([]byte{}, data[end+1:]...)
	return bytes.Split(data[:end], []byte("\n"))
}

// dashboardLogs: POST /logs {instanceId, n, auth} with "Authorization: <PocketBase token>" is the dashboard's live log
// view (the Node edge's RealtimeLog). The owner's login token may read; the body's instanceId (id or subdomain) must
// be the instance the host names. CORS stays open: the dashboard calls it from its own origin.
func (a *API) dashboardLogs(w http.ResponseWriter, r *http.Request) error {
	host := hostOf(r)
	inst, ok := a.opts.Backend.Lookup(host)
	if !ok {
		return errf(404, "%s not found", host)
	}
	var body struct {
		InstanceID string `json:"instanceId"`
		N          *int   `json:"n"`
		Auth       string `json:"auth"`
	}
	b, err := io.ReadAll(http.MaxBytesReader(w, r.Body, 64<<10))
	if err != nil {
		return err
	}
	if json.Unmarshal(b, &body) != nil || body.InstanceID == "" {
		return errf(400, "instanceId required")
	}
	token := strings.TrimSpace(r.Header.Get("Authorization"))
	if bearerToken(token) == "" && token != "" {
		token = "Bearer " + token
	}
	if token == "" {
		token = cookieToken(body.Auth)
	}
	auth, err := a.auth.resolve(r.Context(), token, clientIP(r), false)
	if err != nil {
		return err
	}
	if auth.Via == "pat" || inst.OwnerID != auth.UserID || (body.InstanceID != inst.ID && body.InstanceID != inst.Subdomain) {
		return errf(404, "%s not found", host)
	}
	if inst.Elsewhere != "" {
		return errf(http.StatusMisdirectedRequest, "%s", inst.Elsewhere)
	}
	n := 100
	if body.N != nil {
		n = min(max(*body.N, 0), 1000)
	}
	return streamLog(w, r, a.instanceDir(inst.ID), n)
}

// cookieToken reads the token from a PocketBase auth cookie ("pb_auth=<url-encoded JSON {token, ...}>; ...").
func cookieToken(cookie string) string {
	v := strings.TrimSpace(cookie)
	if _, after, ok := strings.Cut(v, "="); ok && !strings.HasPrefix(v, "{") && !strings.HasPrefix(v, "%7B") {
		v = after
	}
	v, _, _ = strings.Cut(v, ";")
	if u, err := url.QueryUnescape(v); err == nil {
		v = u
	}
	var c struct {
		Token string `json:"token"`
	}
	if json.Unmarshal([]byte(v), &c) != nil || c.Token == "" {
		return ""
	}
	return "Bearer " + c.Token
}

// openCORS is the permissive CORS the Node firewall gave edge routes.
func openCORS(w http.ResponseWriter, r *http.Request) {
	h := w.Header()
	h.Set("Access-Control-Allow-Origin", "*")
	h.Set("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS")
	if v := r.Header.Get("Access-Control-Request-Headers"); v != "" {
		h.Set("Access-Control-Allow-Headers", v)
	}
}
