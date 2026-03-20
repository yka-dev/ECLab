package email

import (
	"bytes"
	"context"
	"html/template"

	brevo "github.com/getbrevo/brevo-go/lib"
)

type Email struct {
	client *brevo.APIClient
}

func New(api_key string) Email {
	cfg := brevo.NewConfiguration()
	cfg.AddDefaultHeader("api-key", api_key)
	br := brevo.NewAPIClient(cfg)

	return Email{
		client: br,
	}
}

func (e *Email) SendPasswordResetEmail(ctx context.Context, email, url string) error {
	tmpl := template.Must(template.ParseFiles("email.html"))
	var buf bytes.Buffer
	tmpl.Execute(&buf, map[string]interface{}{
		"ResetURL": url,
	})
	e.client.TransactionalEmailsApi.SendTransacEmail(ctx, brevo.SendSmtpEmail{
		To:          []brevo.SendSmtpEmailTo{{Email: email}},
		Subject:     "Réinitialiser votre mot de passe ECLab",
		HtmlContent: buf.String(),
	})
	return nil
}
