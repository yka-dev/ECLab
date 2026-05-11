package email

import (
	"bytes"
	"context"
	"fmt"
	"html/template"

	brevo "github.com/getbrevo/brevo-go/lib"
)

// Email encapsule le client Brevo pour l'envoi de courriels transactionnels.
// On passe par une struct pour pouvoir injecter un faux client dans les tests.
type Email struct {
	client *brevo.APIClient
}

// New configure et retourne un client Brevo pret a l'emploi.
func New(cleAPI string) Email {
	cfg := brevo.NewConfiguration()
	cfg.AddDefaultHeader("api-key", cleAPI)
	return Email{
		client: brevo.NewAPIClient(cfg),
	}
}

// SendPasswordResetEmail envoie un courriel de reinitialisation de mot de passe
// a partir du gabarit HTML email.html, en y injectant l'URL de reinitialisation.
func (e *Email) SendPasswordResetEmail(ctx context.Context, courriel, url string) error {
	// Le gabarit est lu depuis le disque a chaque appel.
	// Si les performances deviennent un enjeu, precalculer le gabarit dans New().
	gabarit, err := template.ParseFiles("email.html")
	if err != nil {
		return fmt.Errorf("impossible de charger le gabarit email : %w", err)
	}

	var buf bytes.Buffer
	if err := gabarit.Execute(&buf, map[string]any{"ResetURL": url}); err != nil {
		return fmt.Errorf("impossible de generer le contenu du courriel : %w", err)
	}

	// L'API Brevo retourne une reponse et une erreur que l'original ignorait toutes les deux.
	_, _, err = e.client.TransactionalEmailsApi.SendTransacEmail(ctx, brevo.SendSmtpEmail{
		To:          []brevo.SendSmtpEmailTo{{Email: courriel}},
		Subject:     "Reinitialiser votre mot de passe ECLab",
		HtmlContent: buf.String(),
	})
	if err != nil {
		return fmt.Errorf("echec de l'envoi du courriel a %q : %w", courriel, err)
	}

	return nil
}
