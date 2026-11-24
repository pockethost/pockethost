package main

import (
	"os"
	"strings"
	"testing"
)

// TestTokenEnvPrecedence checks the P1_TOKEN PocketOne reads after applyTokenEnv: POCKETHOST_TOKEN, else P1_TOKEN.
func TestTokenEnvPrecedence(t *testing.T) {
	cases := []struct {
		name string
		env  map[string]string
		want string
	}{
		{"none", nil, ""},
		{"POCKETHOST_TOKEN only", map[string]string{"POCKETHOST_TOKEN": "ph"}, "ph"},
		{"P1_TOKEN only", map[string]string{"P1_TOKEN": "p1"}, "p1"},
		{"POCKETHOST_TOKEN wins over P1_TOKEN", map[string]string{"POCKETHOST_TOKEN": "ph", "P1_TOKEN": "p1"}, "ph"},
		{"blank POCKETHOST_TOKEN falls back", map[string]string{"POCKETHOST_TOKEN": "  ", "P1_TOKEN": "p1"}, "p1"},
		{"POCKETHOST_TOKEN is trimmed", map[string]string{"POCKETHOST_TOKEN": " ph\n"}, "ph"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			for _, k := range []string{"P1_TOKEN", "POCKETHOST_TOKEN"} { // t.Setenv restores both after the test
				t.Setenv(k, tc.env[k])
			}
			applyTokenEnv()
			if got := strings.TrimSpace(os.Getenv("P1_TOKEN")); got != tc.want { // PocketOne trims too
				t.Errorf("P1_TOKEN = %q, want %q", got, tc.want)
			}
		})
	}
}
