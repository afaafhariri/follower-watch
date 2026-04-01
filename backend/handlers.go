package followercount

import (
	"net/http"
)

func HandleGetLastResult(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w, r)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodGet {
		sendError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	email := UserEmailFromContext(r.Context())
	if email == "" {
		sendError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	cached, err := GetResult(r.Context(), hashEmail(email))
	if err != nil {
		sendJSON(w, http.StatusOK, map[string]interface{}{
			"success": false,
			"error":   "no cached result",
		})
		return
	}

	sendJSON(w, http.StatusOK, map[string]interface{}{
		"success":   true,
		"result":    cached.Result,
		"cached_at": cached.CachedAt,
	})
}

func HandleDeleteLastResult(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w, r)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodDelete {
		sendError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	email := UserEmailFromContext(r.Context())
	if email == "" {
		sendError(w, http.StatusUnauthorized, "Authentication required")
		return
	}

	if err := DeleteResult(r.Context(), hashEmail(email)); err != nil {
		sendError(w, http.StatusInternalServerError, "Failed to delete cached result")
		return
	}

	sendJSON(w, http.StatusOK, map[string]bool{"success": true})
}
