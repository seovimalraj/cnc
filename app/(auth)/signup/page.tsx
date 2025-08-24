import AuthForm from "@/components/auth/AuthForm";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="text-2xl font-semibold mb-6">Create your account</h1>
      <AuthForm mode="signup" />
    </div>
  );
}
