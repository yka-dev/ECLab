package email

import (
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