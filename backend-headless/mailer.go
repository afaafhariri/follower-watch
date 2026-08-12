package main

import (
	"fmt"
	"net/smtp"
	"os"
	"strings"
)

// sendEmail delivers the report over SMTP (STARTTLS, e.g. Gmail with an app
// password on port 587).
func sendEmail(subject, body string) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")
	if port == "" {
		port = "587"
	}
	if host == "" || user == "" || pass == "" {
		return fmt.Errorf("missing SMTP configuration: set SMTP_HOST, SMTP_USER and SMTP_PASS")
	}

	from := os.Getenv("EMAIL_FROM")
	if from == "" {
		from = user
	}
	to := os.Getenv("EMAIL_TO")
	if to == "" {
		to = user
	}
	var recipients []string
	for _, r := range strings.Split(to, ",") {
		if r = strings.TrimSpace(r); r != "" {
			recipients = append(recipients, r)
		}
	}

	var msg strings.Builder
	fmt.Fprintf(&msg, "From: %s\r\n", from)
	fmt.Fprintf(&msg, "To: %s\r\n", strings.Join(recipients, ", "))
	fmt.Fprintf(&msg, "Subject: %s\r\n", subject)
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: text/plain; charset=\"UTF-8\"\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(body)

	auth := smtp.PlainAuth("", user, pass, host)
	return smtp.SendMail(host+":"+port, auth, from, recipients, []byte(msg.String()))
}
