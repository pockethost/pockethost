package deploy

import (
	"encoding/json"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
)

// codeSetParityPaths are the paths the Node edge uses to keep the CLI's and the server's code set in step.
var codeSetParityPaths = []string{"pb_hooks/main.pb.js", "pb_migrations/1_init.js", "pb_public/index.html", "pb_public/a/b/c.css",
	"pb_schema.json", "package.json", "bun.lock", "bun.lockb", "patches/x.patch", "patches", "pb_data", "pb_data/data.db",
	"node_modules/x.js", "node_modules", "node_modules/marked/lib/marked.cjs", "node_modules/a/node_modules/b/index.js",
	"node_modules/@scope/pkg/dist/index.mjs", "node_modules/.bin/x", "node_modules/x/.github/workflow.yml",
	"node_modules/x/.gitignore", "node_modules/../pb_data/data.db", "pb_public/node_modules/x.js",
	"patches/node_modules/x.patch", "pb_hooks/node_modules/x.js", "pb_public/.gitkeep", "pb_hooks/.git/config", "README.md",
	"src/index.ts", "../x", "pb_hooks/../x", "/pb_hooks/x", "pb_hooks//x", "pb_hooks\\x", ""}

// TestCLICompat runs the pockethost CLI's own deploy, files and logs code against this API. It needs bun and a
// pockethost checkout (POCKETHOST_CLI_DIR, default /root/pockethost/packages/cli); otherwise it is skipped.
func TestCLICompat(t *testing.T) {
	cliDir := os.Getenv("POCKETHOST_CLI_DIR")
	if cliDir == "" {
		cliDir = "/root/pockethost/packages/cli"
	}
	bun, err := exec.LookPath("bun")
	if err != nil {
		if home, _ := os.UserHomeDir(); home != "" {
			bun = filepath.Join(home, ".bun", "bin", "bun")
		}
	}
	if _, err := os.Stat(filepath.Join(cliDir, "src/lib/deployApi.ts")); err != nil {
		t.Skip("no pockethost CLI checkout")
	}
	if _, err := os.Stat(bun); err != nil {
		t.Skip("no bun")
	}

	f := newAPIFixture(t)
	f.be.insts = map[string]Instance{"myapp.localhost": f.be.insts["myapp.example.com"]}
	f.api.log = slog.New(slog.NewTextHandler(io.Discard, nil))
	ln, err := net.Listen("tcp", "[::]:0") // dual stack: *.localhost may resolve to ::1 or 127.0.0.1
	if err != nil {
		t.Fatal(err)
	}
	srv := &http.Server{Handler: f.api.Wrap(http.NotFoundHandler())}
	go srv.Serve(ln)
	t.Cleanup(func() { srv.Close() })
	port := strconv.Itoa(ln.Addr().(*net.TCPAddr).Port)

	script, _ := filepath.Abs("testdata/cli_compat.ts")
	parity, _ := json.Marshal(codeSetParityPaths)
	cmd := exec.Command(bun, script)
	cmd.Dir = cliDir
	cmd.Env = append(os.Environ(),
		"CLI_DIR="+cliDir, "INST_DIR="+f.instFile(""), "PARITY_PATHS="+string(parity),
		"POCKETHOST_MOTHERSHIP_URL=http://central.localhost:"+port, "POCKETHOST_HOME="+t.TempDir(),
		"POCKETHOST_TOKEN="+testPAT, "GITHUB_SHA=", "GITHUB_ACTIONS=")
	out, err := cmd.CombinedOutput()
	t.Logf("%s", out)
	if err != nil {
		t.Fatalf("CLI run failed: %v", err)
	}
	for _, line := range strings.Split(string(out), "\n") {
		if rest, ok := strings.CutPrefix(line, "PARITY "); ok {
			var cliSays []bool
			if err := json.Unmarshal([]byte(rest), &cliSays); err != nil {
				t.Fatal(err)
			}
			for i, p := range codeSetParityPaths {
				if cliSays[i] != isCodePath(p) {
					t.Errorf("code set differs for %q: CLI %v, server %v", p, cliSays[i], isCodePath(p))
				}
			}
			return
		}
	}
	t.Fatal("no parity output")
}
