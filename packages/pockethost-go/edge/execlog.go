package edge

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// execLogMaxSize is where an instance's exec.log rotates to exec.log.1, as Pocker rotates it.
const execLogMaxSize = 10 << 20

// DockerLog is the docker provider's OnLog for PocketHost: each container's output is appended to its instance's
// <root>/<id>/logs/exec.log, the file the dashboard's log view reads (deploy/logs.go), as JSON lines
// {message, stream, time} in the format Pocker writes for in-process instances. The file is opened per line, so idle
// instances hold no descriptors.
func DockerLog(root string) func(instanceID string, stderr bool, line string) {
	var locks sync.Map // instance id -> *sync.Mutex (one writer per file)
	return func(id string, stderr bool, line string) {
		if id == "" || filepath.Base(id) != id {
			return
		}
		stream := "stdout"
		if stderr {
			stream = "stderr"
		}
		b, err := json.Marshal(struct {
			Message string `json:"message"`
			Stream  string `json:"stream"`
			Time    string `json:"time"`
		}{line, stream, time.Now().UTC().Format(time.RFC3339Nano)})
		if err != nil {
			return
		}
		b = append(b, '\n')
		mu, _ := locks.LoadOrStore(id, &sync.Mutex{})
		mu.(*sync.Mutex).Lock()
		defer mu.(*sync.Mutex).Unlock()
		appendExecLog(filepath.Join(root, id, "logs", "exec.log"), b)
	}
}

func appendExecLog(path string, b []byte) {
	if st, err := os.Stat(path); err == nil && st.Size()+int64(len(b)) > execLogMaxSize {
		_ = os.Rename(path, path+".1")
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return
	}
	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return
	}
	_, _ = f.Write(b)
	_ = f.Close()
}
