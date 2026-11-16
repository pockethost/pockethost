package main

import (
	"fmt"
	"runtime/debug"
	"strings"

	"github.com/pockethost/pocketone/ext/pocker"
)

// Version is this PocketHost release (5.0.0-alpha.1, ...), stamped by goreleaser (-X main.Version={{ .Version }}).
// A build outside a release reads "dev".
var Version = "dev"

// upstreamModule is PocketBase's module path, which PocketOne keeps; go.mod requires it at the upstream version
// PocketOne is built on (v0.42.2 since PocketOne v0.0.1-alpha.6) and replaces it with PocketOne.
const upstreamModule = "ganigeorgiev.com/pocketbase/pocketbase"

// versionString is what `pockethost version` and `pockethost --version` print:
// "5.0.0-alpha.1 (PocketOne 0.0.1-alpha.2, PocketBase 0.41.1)". PocketOne's version is the release a release build
// stamps in, else the pinned commit ("0.0.2-dev+4700768d").
func versionString() string {
	return fmt.Sprintf("%s (PocketOne %s, PocketBase %s)", Version, pocker.Version(), upstreamVersion(readBuildInfo()))
}

func readBuildInfo() *debug.BuildInfo {
	bi, _ := debug.ReadBuildInfo()
	return bi
}

// upstreamVersion is the PocketBase version PocketOne is built on: the required version of PocketBase's module,
// before the replace that swaps in PocketOne.
func upstreamVersion(bi *debug.BuildInfo) string {
	if bi != nil {
		for _, d := range bi.Deps {
			if d.Path == upstreamModule && d.Version != "" && d.Version != "(devel)" {
				return strings.TrimPrefix(d.Version, "v")
			}
		}
	}
	return "unknown"
}
