package main

import (
	"os"
	"strings"
)

// tokenEnv is the CI token variable `pockethost` documents and reads first. PocketOne reads P1_TOKEN, so the binary
// copies POCKETHOST_TOKEN onto it; P1_TOKEN is the fallback when POCKETHOST_TOKEN is empty.
const tokenEnv = "POCKETHOST_TOKEN"

// applyTokenEnv copies a non-blank POCKETHOST_TOKEN onto P1_TOKEN, over any P1_TOKEN, before PocketOne reads the
// environment. Processes `pockethost` starts inherit the result.
func applyTokenEnv() {
	if v := strings.TrimSpace(os.Getenv(tokenEnv)); v != "" {
		_ = os.Setenv("P1_TOKEN", v)
	}
}
