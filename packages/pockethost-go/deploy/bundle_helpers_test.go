package deploy

import (
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/binary"
)

// encodeBundle is the CLI's encoder (packages/cli/src/lib/deployBundle.ts), for tests.
func encodeBundle(blobs ...[]byte) []byte {
	var raw bytes.Buffer
	raw.Write(bundleMagic)
	for _, b := range blobs {
		sum := sha256.Sum256(b)
		raw.Write(sum[:])
		_ = binary.Write(&raw, binary.BigEndian, uint32(len(b)))
		raw.Write(b)
	}
	var gz bytes.Buffer
	w := gzip.NewWriter(&gz)
	_, _ = w.Write(raw.Bytes())
	_ = w.Close()
	return gz.Bytes()
}

// encodeRaw gzips raw bytes (tests).
func encodeRaw(raw []byte) []byte {
	var gz bytes.Buffer
	w := gzip.NewWriter(&gz)
	_, _ = w.Write(raw)
	_ = w.Close()
	return gz.Bytes()
}
