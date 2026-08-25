import { AppShell, Page, PageHead } from "@/components/app-shell";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";

export default function OnboardingPage() {
  return (
    <AppShell>
      <Page className="max-w-3xl">
        <PageHead
          title="Join the pool"
          sub="Two minutes. Squads rank you by what you add to them, not by how long your list is — one proven skill beats five claims."
        />
        <OnboardingForm />
      </Page>
    </AppShell>
  );
}
