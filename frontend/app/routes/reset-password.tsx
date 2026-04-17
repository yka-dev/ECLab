import { Link } from "react-router";
import { ForgotPasswordForm } from "~/components/reset-password-form";
import { Button } from "~/components/ui/button";
import type { Route } from "./+types/reset-password";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ECLab | Mot de passe oublié" },
    {
      name: "description",
      content: "Réinitialisez votre mot de passe ECLab.",
    },
  ];
}

export default function ForgotPassword() {
  return (
    <div className="bg-muted relative flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="absolute left-6 top-6 md:left-10 md:top-10">
        <Button asChild size="lg" className="rounded-full px-8">
          <Link to="/">Retour</Link>
        </Button>
      </div>
      <div className="w-full max-w-sm md:max-w-4xl">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
