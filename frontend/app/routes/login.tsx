import { Link } from "react-router";
import { LoginForm } from "~/components/login-form";
import { Button } from "~/components/ui/button";

export default function Login() {
    return  <div className="bg-muted relative flex min-h-svh flex-col items-center justify-center p-6 md:p-10">
      <div className="absolute left-6 top-6 md:left-10 md:top-10">
        <Button asChild size="lg" className="rounded-full px-8">
          <Link to="/">Retour</Link>
        </Button>
      </div>
      <div className="w-full max-w-sm md:max-w-4xl">
        <LoginForm />
      </div>
    </div>
}
