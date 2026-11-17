package edge

import (
	"bufio"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestDockerLog(t *testing.T) {
	root := t.TempDir()
	log := DockerLog(root)
	log("inst1", false, "Server started at http://0.0.0.0:8090")
	log("inst1", true, "failed to apply migration 1726243362_created_itens.js: ReferenceError: Dao is not defined")
	log("../escape", true, "ignored")

	f, err := os.Open(filepath.Join(root, "inst1", "logs", "exec.log"))
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	var got []map[string]string
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		var e map[string]string
		if err := json.Unmarshal(sc.Bytes(), &e); err != nil {
			t.Fatalf("not a JSON line: %q", sc.Text())
		}
		got = append(got, e)
	}
	if len(got) != 2 || got[0]["stream"] != "stdout" || got[1]["stream"] != "stderr" ||
		!strings.Contains(got[1]["message"], "Dao is not defined") || got[1]["time"] == "" {
		t.Fatalf("exec.log: %v", got)
	}
	if _, err := os.Stat(filepath.Join(filepath.Dir(root), "escape")); err == nil {
		t.Fatal("wrote outside the root")
	}
}

func TestDockerLogRotates(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "inst1", "logs", "exec.log")
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, make([]byte, execLogMaxSize), 0o644); err != nil {
		t.Fatal(err)
	}
	DockerLog(root)("inst1", false, "after rotation")
	if st, err := os.Stat(path + ".1"); err != nil || st.Size() != execLogMaxSize {
		t.Fatalf("exec.log.1: %v", err)
	}
	if b, _ := os.ReadFile(path); !strings.Contains(string(b), "after rotation") || len(b) > 200 {
		t.Fatalf("new exec.log: %q", b)
	}
}
