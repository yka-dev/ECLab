import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import logoImage from "/LOGO.png";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    toast.success("Nouveau mot de passe enregistré.");
    setTimeout(() => setLoading(false), 600);
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-500 to-white p-[1px] shadow-[0_18px_48px_rgba(0,0,0,0.28),0_0_20px_rgba(255,255,255,0.1)]">
        <Card className="overflow-hidden rounded-[calc(1.5rem-1px)] border-0 bg-background p-0">
          <CardContent className="grid p-0 md:grid-cols-2">
            <form className="p-6 md:p-8" onSubmit={handleSubmit}>
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">
                    Réinitialiser votre mot de passe
                  </h1>
                  <p className="text-muted-foreground text-balance">
                    Entrez votre nouveau mot de passe puis confirmez-le.
                  </p>
                </div>
                <Field>
                  <FieldLabel htmlFor="new-password">
                    Entrez nouveau mot de passe
                  </FieldLabel>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirm-password">
                    Confirmer nouveau mot de passe
                  </FieldLabel>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </Field>
                <FieldDescription>
                  {error || "Choisissez un mot de passe sécurisé."}
                </FieldDescription>
                <Field>
                  <Button type="submit" disabled={loading}>
                    Enregistrer
                  </Button>
                </Field>
                <FieldDescription className="text-center">
                  <Link to="/login">Retour à la connexion</Link>
                </FieldDescription>
              </FieldGroup>
            </form>
            <div className="relative hidden h-full min-h-96 bg-black md:block">
              <img
                src={logoImage}
                alt="Image"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
