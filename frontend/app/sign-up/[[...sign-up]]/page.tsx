import { SignUp } from "@clerk/nextjs";
import AuthShell, { clerkAppearance } from "@/components/AuthShell";

export default function SignUpPage() {
  return (
    <AuthShell
      subtitle="Create your account"
      title={
        <>
          Check it <em className="font-black">before</em> you share it.
        </>
      }
    >
      <SignUp appearance={clerkAppearance} />
    </AuthShell>
  );
}
