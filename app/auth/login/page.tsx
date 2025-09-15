import { LoginForm } from "@/components/login-form";
import { AuthHashHandler } from "@/components/auth-hash-handler";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <AuthHashHandler />
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
