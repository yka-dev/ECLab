import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import logoImage from "/LOGO.png";
import { useState } from "react";
import { toast } from "sonner";
import { redirect, useNavigate } from "react-router";

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [retype, setRetype] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (retype !== password) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    fetch(`${import.meta.env.VITE_API_ENDPOINT}/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        email,
        password,
      }),
    }).then((response) => {
      if (!response.ok) {
        response.text().then((err) => setError(error));
        setLoading(false);
      } else {
        toast.success("Votre compte ECLab a été créé avec succès");
        setTimeout(() => {
          navigate("/projects")
        }, 1000);
      }
    });
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="rounded-3xl from-zinc-950 via-zinc-500 to-white p-[1px]">
        <Card className="overflow-hidden rounded-[calc(1.5rem-1px)] border-0 bg-background p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Créer votre compte</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  Entrez votre e-mail ci-dessous pour créer votre compte ECLab
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">E-mail</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => {setEmail(e.target.value); setLoading(false)}}
                  required
                />
                <FieldDescription>
                  Nous l&apos;utiliserons pour vous contacter. Nous ne
                  partagerons votre e-mail avec personne d&apos;autre.
                </FieldDescription>
              </Field>
              <Field>
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => {setPassword(e.target.value.trimStart()); setLoading(false)}}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirmer le mot de passe
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={retype}
                      onChange={(e) => {setRetype(e.target.value.trimStart()); setLoading(false)}}
                      required
                    />
                  </Field>
                </Field>
                <FieldDescription>
                  {error != "" ? error : "Doit contenir au moins 8 caractères."}
                </FieldDescription>
              </Field>
              <Field>
                <Button type="submit" disabled={loading}>
                  Créer un compte
                </Button>
              </Field>
              {/*<FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Ou continuer avec
              </FieldSeparator>
              <Field className="grid grid-cols-1 gap-4">
                <Button variant="outline" type="button">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                      fill="currentColor"
                    />
                  </svg>
                  <span className="sr-only">S&apos;inscrire avec Google</span>
                </Button>
              </Field>*/}
              <FieldDescription className="text-center">
                Vous avez déjà un compte ? <a href="/login">Se connecter</a>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="relative hidden bg-black md:block">
            <img
              src={logoImage}
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
          </div>
          </CardContent>
        </Card>
      </div>
      <FieldDescription className="px-6 text-center">
        En cliquant sur continuer, vous acceptez nos{" "}
        <a href="#">Conditions d&apos;utilisation</a> et{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            alert("vous êtes pas assez important");
          }}
        >
          Politique de confidentialité
        </a>
        .
      </FieldDescription>
    </div>
  );
}