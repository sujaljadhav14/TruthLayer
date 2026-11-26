import { SignIn } from "@clerk/nextjs";
import AuthShell, { clerkAppearance } from "@/components/AuthShell";

export default function SignInPage() {
  return (
    <AuthShell
      subtitle="Welcome back"
      title={
        <>
          Know if it&apos;s <em className="font-black">real</em>.
        </>
      }
    >
      <SignIn appearance={clerkAppearance} />
    </AuthShell>
  );
}
