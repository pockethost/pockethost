package edge

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

// client talks to the mothership as a superuser. It has its own transport: Pocker's egress policy guards Go's default
// transport, and the mothership is on a private address.
type client struct {
	base       string
	user, pass string
	http       *http.Client

	mu    sync.Mutex
	token string
}

func newClient(base, user, pass string) *client {
	tr := &http.Transport{
		DialContext:         (&net.Dialer{Timeout: 10 * time.Second, KeepAlive: 30 * time.Second}).DialContext,
		MaxIdleConnsPerHost: 8,
		IdleConnTimeout:     90 * time.Second,
	}
	return &client{base: base, user: user, pass: pass, http: &http.Client{Transport: tr}}
}

func (c *client) auth(ctx context.Context) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.token != "" {
		return c.token, nil
	}
	body, _ := json.Marshal(map[string]string{"identity": c.user, "password": c.pass})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.base+"/api/collections/_superusers/auth-with-password", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(io.LimitReader(res.Body, 512))
		return "", fmt.Errorf("mothership auth: %d %s", res.StatusCode, b)
	}
	var out struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		return "", err
	}
	c.token = out.Token
	return c.token, nil
}

func (c *client) resetToken() {
	c.mu.Lock()
	c.token = ""
	c.mu.Unlock()
}

// do sends a JSON request as superuser; on 401 it re-authenticates once.
func (c *client) do(ctx context.Context, method, path string, in, out any) error {
	for attempt := 0; attempt < 2; attempt++ {
		token, err := c.auth(ctx)
		if err != nil {
			return err
		}
		var body io.Reader
		if in != nil {
			b, err := json.Marshal(in)
			if err != nil {
				return err
			}
			body = bytes.NewReader(b)
		}
		req, err := http.NewRequestWithContext(ctx, method, c.base+path, body)
		if err != nil {
			return err
		}
		req.Header.Set("Authorization", token)
		if in != nil {
			req.Header.Set("Content-Type", "application/json")
		}
		res, err := c.http.Do(req)
		if err != nil {
			return err
		}
		func() {
			defer res.Body.Close()
			switch {
			case res.StatusCode == http.StatusUnauthorized && attempt == 0:
				c.resetToken()
				err = errRetry
			case res.StatusCode >= 300:
				b, _ := io.ReadAll(io.LimitReader(res.Body, 512))
				err = &statusError{Method: method, Path: path, Status: res.StatusCode, Body: b}
			case out != nil:
				err = json.NewDecoder(res.Body).Decode(out)
			}
		}()
		if !errors.Is(err, errRetry) {
			return err
		}
	}
	return errors.New("mothership: unauthorized")
}

var errRetry = errors.New("retry")

// statusError is a non-2xx answer from the mothership.
type statusError struct {
	Method, Path string
	Status       int
	Body         []byte
}

func (e *statusError) Error() string {
	return fmt.Sprintf("%s %s: %d %s", e.Method, e.Path, e.Status, e.Body)
}

// message is PocketBase's {"message": ...} from the body, if any.
func (e *statusError) message() string {
	var b struct {
		Message string `json:"message"`
	}
	_ = json.Unmarshal(e.Body, &b)
	return b.Message
}

// realtimeEvent is one message from PocketBase's realtime stream.
type realtimeEvent struct {
	Name string
	Data []byte
}

// subscribe opens PocketBase's realtime stream and subscribes to topics. Events arrive on the channel until the
// stream ends (the channel is then closed); the first event is always PB_CONNECT.
func (c *client) subscribe(ctx context.Context, topics []string) (<-chan realtimeEvent, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.base+"/api/realtime", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "text/event-stream")
	res, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	if res.StatusCode != http.StatusOK {
		res.Body.Close()
		return nil, fmt.Errorf("realtime: %d", res.StatusCode)
	}
	events := make(chan realtimeEvent, 64)
	connected := make(chan string, 1)
	go func() {
		defer close(events)
		defer res.Body.Close()
		r := bufio.NewReaderSize(res.Body, 64<<10)
		var name string
		var data bytes.Buffer
		for {
			line, err := r.ReadString('\n')
			if err != nil {
				return
			}
			line = strings.TrimRight(line, "\r\n")
			switch {
			case line == "":
				if name != "" || data.Len() > 0 {
					ev := realtimeEvent{Name: name, Data: append([]byte(nil), data.Bytes()...)}
					if ev.Name == "PB_CONNECT" {
						var hello struct {
							ClientID string `json:"clientId"`
						}
						_ = json.Unmarshal(ev.Data, &hello)
						select {
						case connected <- hello.ClientID:
						default:
						}
					}
					select {
					case events <- ev:
					case <-ctx.Done():
						return
					}
				}
				name = ""
				data.Reset()
			case strings.HasPrefix(line, "event:"):
				name = strings.TrimSpace(line[len("event:"):])
			case strings.HasPrefix(line, "data:"):
				if data.Len() > 0 {
					data.WriteByte('\n')
				}
				data.WriteString(strings.TrimPrefix(line[len("data:"):], " "))
			}
		}
	}()

	var clientID string
	select {
	case clientID = <-connected:
	case <-time.After(15 * time.Second):
		res.Body.Close()
		return nil, errors.New("realtime: no PB_CONNECT")
	case <-ctx.Done():
		res.Body.Close()
		return nil, ctx.Err()
	}
	if err := c.do(ctx, http.MethodPost, "/api/realtime", map[string]any{"clientId": clientID, "subscriptions": topics}, nil); err != nil {
		res.Body.Close()
		return nil, err
	}
	return events, nil
}

// listUpdatedSince pages through a collection's records updated since t.
func (c *client) listUpdatedSince(ctx context.Context, collection string, since time.Time) ([]json.RawMessage, error) {
	var all []json.RawMessage
	filter := fmt.Sprintf("updated >= '%s'", since.UTC().Format("2006-01-02 15:04:05.000Z"))
	for page := 1; ; page++ {
		var out struct {
			Items      []json.RawMessage `json:"items"`
			TotalPages int               `json:"totalPages"`
		}
		q := url.Values{"filter": {filter}, "perPage": {"500"}, "page": {fmt.Sprint(page)}, "skipTotal": {"0"}}
		if err := c.do(ctx, http.MethodGet, "/api/collections/"+collection+"/records?"+q.Encode(), nil, &out); err != nil {
			return nil, err
		}
		all = append(all, out.Items...)
		if page >= out.TotalPages || len(out.Items) == 0 {
			return all, nil
		}
	}
}
