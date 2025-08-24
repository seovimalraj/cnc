import AuthForm from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="text-2xl font-semibold mb-6">Sign in</h1>
      <AuthForm mode="login" />
    </div>
  );
}
