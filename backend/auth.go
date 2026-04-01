package followercount

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type UserInfo struct {
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

type AuthResponse struct {
	Authenticated bool      `json:"authenticated"`
	User          *UserInfo `json:"user,omitempty"`
}

type sessionData struct {
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
	Exp     int64  `json:"exp"`
}

var googleOAuthConfig *oauth2.Config

func getOAuthConfig() *oauth2.Config {
	if googleOAuthConfig != nil {
		return googleOAuthConfig
	}
	googleOAuthConfig = &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}
	return googleOAuthConfig
}

func getSessionSecret() []byte {
	secret := os.Getenv("SESSION_SECRET")
	if secret == "" {
		log.Fatal("SESSION_SECRET environment variable is required")
	}
	return []byte(secret)
}

func signSession(data sessionData) (string, error) {
	payload, err := json.Marshal(data)
	if err != nil {
		return "", err
	}
	encoded := base64.URLEncoding.EncodeToString(payload)
	mac := hmac.New(sha256.New, getSessionSecret())
	mac.Write([]byte(encoded))
	sig := hex.EncodeToString(mac.Sum(nil))
	return encoded + "." + sig, nil
}

func verifySession(cookie string) (*sessionData, error) {
	parts := strings.SplitN(cookie, ".", 2)
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid session format")
	}
	encoded, sig := parts[0], parts[1]

	mac := hmac.New(sha256.New, getSessionSecret())
	mac.Write([]byte(encoded))
	expectedSig := hex.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(sig), []byte(expectedSig)) {
		return nil, fmt.Errorf("invalid session signature")
	}

	payload, err := base64.URLEncoding.DecodeString(encoded)
	if err != nil {
		return nil, err
	}

	var data sessionData
	if err := json.Unmarshal(payload, &data); err != nil {
		return nil, err
	}

	if time.Now().Unix() > data.Exp {
		return nil, fmt.Errorf("session expired")
	}

	return &data, nil
}

func generateStateToken() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func HandleGoogleLogin(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w, r)
	state := generateStateToken()

	http.SetCookie(w, &http.Cookie{
		Name:     "oauth_state",
		Value:    state,
		Path:     "/",
		MaxAge:   300,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	url := getOAuthConfig().AuthCodeURL(state)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func HandleGoogleCallback(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w, r)

	stateCookie, err := r.Cookie("oauth_state")
	if err != nil || stateCookie.Value != r.URL.Query().Get("state") {
		http.Error(w, "Invalid state parameter", http.StatusBadRequest)
		return
	}

	// Clear state cookie
	http.SetCookie(w, &http.Cookie{
		Name:   "oauth_state",
		Value:  "",
		Path:   "/",
		MaxAge: -1,
	})

	code := r.URL.Query().Get("code")
	token, err := getOAuthConfig().Exchange(r.Context(), code)
	if err != nil {
		log.Printf("OAuth exchange error: %v", err)
		http.Error(w, "Failed to exchange token", http.StatusInternalServerError)
		return
	}

	client := getOAuthConfig().Client(r.Context(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		log.Printf("Failed to get user info: %v", err)
		http.Error(w, "Failed to get user info", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	var userInfo UserInfo
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		http.Error(w, "Failed to parse user info", http.StatusInternalServerError)
		return
	}

	session := sessionData{
		Email:   userInfo.Email,
		Name:    userInfo.Name,
		Picture: userInfo.Picture,
		Exp:     time.Now().Add(24 * time.Hour).Unix(),
	}

	sessionCookie, err := signSession(session)
	if err != nil {
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    sessionCookie,
		Path:     "/",
		MaxAge:   86400,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	// Redirect to frontend
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "/"
	}
	http.Redirect(w, r, frontendURL, http.StatusTemporaryRedirect)
}

func HandleAuthMe(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	cookie, err := r.Cookie("session")
	if err != nil {
		sendJSON(w, http.StatusOK, AuthResponse{Authenticated: false})
		return
	}

	session, err := verifySession(cookie.Value)
	if err != nil {
		sendJSON(w, http.StatusOK, AuthResponse{Authenticated: false})
		return
	}

	sendJSON(w, http.StatusOK, AuthResponse{
		Authenticated: true,
		User: &UserInfo{
			Email:   session.Email,
			Name:    session.Name,
			Picture: session.Picture,
		},
	})
}

func HandleLogout(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w, r)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "session",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	sendJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// RequireAuth wraps a handler to require authentication
func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		setCORSHeaders(w, r)
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		cookie, err := r.Cookie("session")
		if err != nil {
			sendError(w, http.StatusUnauthorized, "Authentication required")
			return
		}

		if _, err := verifySession(cookie.Value); err != nil {
			sendError(w, http.StatusUnauthorized, "Invalid or expired session")
			return
		}

		next(w, r)
	}
}
