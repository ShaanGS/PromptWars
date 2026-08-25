import { Nav } from "@/components/nav";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export default function OnboardingPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <div className="mb-8 max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">Join the pool</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Two minutes. Squads rank you by what you add to them, not by how long
            your list is — one proven skill beats five claims.
          </p>
        </div>
        <OnboardingForm />
      </main>
    </>
  );
}
