import { ForgotPasswordForm } from "~/components/reset-password-form";
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
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
