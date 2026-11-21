package edge

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
)

// backupToken matches the Node edge: base64url(HMAC-SHA256(secret, "backup-token:<id>")). Each edge derives it from
// its own backup_token_secret, so the mothership never holds the secret.
func backupToken(secret, instanceID string) string {
	if secret == "" {
		return ""
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte("backup-token:" + instanceID))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
