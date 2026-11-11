package deploy

import (
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"io"
)

// Upload bundle: gzip("PHB1" + repeated [32-byte sha256][uint32 BE length][bytes]). Content-addressed, so it carries
// no paths; every hash is verified. The CLI's encoder is packages/cli/src/lib/deployBundle.ts.

var bundleMagic = []byte("PHB1")

// BundleError is a user-facing bundle problem (400).
type BundleError struct{ msg string }

func (e *BundleError) Error() string { return e.msg }

type bundleEntry struct {
	hash string
	data []byte
}

func decodeBundle(gz []byte, maxOutputBytes int64) ([]bundleEntry, error) {
	r, err := gzip.NewReader(bytes.NewReader(gz))
	if err != nil {
		return nil, &BundleError{"Could not decompress bundle: " + err.Error()}
	}
	raw, err := io.ReadAll(io.LimitReader(r, maxOutputBytes+1))
	if err != nil {
		return nil, &BundleError{"Could not decompress bundle: " + err.Error()}
	}
	if int64(len(raw)) > maxOutputBytes {
		return nil, &BundleError{"Could not decompress bundle: " + errors.New("output exceeds the size limit").Error()}
	}
	if len(raw) < 4 || !bytes.Equal(raw[:4], bundleMagic) {
		return nil, &BundleError{"Not a PocketHost deploy bundle"}
	}
	var out []bundleEntry
	off := 4
	for off < len(raw) {
		if off+36 > len(raw) {
			return nil, &BundleError{"Truncated bundle"}
		}
		hash := hex.EncodeToString(raw[off : off+32])
		n := int(binary.BigEndian.Uint32(raw[off+32 : off+36]))
		off += 36
		if n > len(raw)-off {
			return nil, &BundleError{"Truncated bundle"}
		}
		data := raw[off : off+n]
		off += n
		sum := sha256.Sum256(data)
		if hex.EncodeToString(sum[:]) != hash {
			return nil, &BundleError{"Hash mismatch for " + hash}
		}
		out = append(out, bundleEntry{hash, data})
	}
	return out, nil
}
