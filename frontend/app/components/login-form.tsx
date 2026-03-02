import { useState } from "react";
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
import speedImage from "/speedddd.png";
import { redirect } from "react-router";
import { toast } from "sonner";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    fetch(`${import.meta.env.VITE_API_ENDPOINT}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }).then((response) => {
      if (!response.ok) {
        response.text().then((err) => setError(err));
        setLoading(false);
      } else {
        toast.success("Connexion réussie");
        setTimeout(() => {
          redirect("/projects");
        }, 1000);
      }
    });
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Bonjour</h1>
                <p className="text-muted-foreground text-balance">
                  Connectez vous dans votre compte ECLab
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Mot de Passe</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto text-sm underline-offset-2 hover:underline"
                  >
                    Mot de Passe Oublié?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
              <FieldDescription>{error}</FieldDescription>
              <Field>
                <Button type="submit" disabled={loading}>
                  Se Connecter
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
                  <span className="sr-only">Se connecter avec Google</span>
                </Button>
              </Field>*/}
              <FieldDescription className="text-center">
                vous n'avez pas de compte ? <a href="/signup">S'inscrire</a>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="bg-muted relative hidden md:block h-full min-h-96">
            <img
              src={speedImage}
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        En cliquant sur continuer, vous acceptez nos{" "}
        <a href="#">Conditions d'utilisation</a> et notre{" "}
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
