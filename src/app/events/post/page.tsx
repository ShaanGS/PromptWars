"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { postEvent } from "@/actions/events";
import { AppShell, Page, PageHead } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Kept in sync with the one branch in postEvent that we answer with a link.
const NO_PROFILE = "Create your profile first";

export default function PostEventPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      // On success the action redirects to /events and never returns.
      const result = await postEvent(formData);
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
      }
    });
  }

  return (
    <AppShell>
      <Page>
        <div className="mx-auto w-full max-w-2xl">
          <Link
            href="/events"
            className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" strokeWidth={2} />
            Events
          </Link>

          <PageHead
            title="Post an event"
            sub="It appears on the events list with your name on it. Squads form underneath."
          />

          <form onSubmit={onSubmit} className="g-card flex flex-col gap-5 p-6 sm:p-8">
            <Field id="title" label="Title">
              <Input
                id="title"
                name="title"
                required
                maxLength={160}
                autoComplete="off"
                className="h-11 rounded-xl"
              />
            </Field>

            <Field id="host" label="Host" hint="optional">
              <Input
                id="host"
                name="host"
                maxLength={120}
                autoComplete="off"
                placeholder="Department, club or company"
                className="h-11 rounded-xl"
              />
            </Field>

            <Field id="external_url" label="Link" hint="optional">
              <Input
                id="external_url"
                name="external_url"
                type="url"
                inputMode="url"
                autoComplete="off"
                placeholder="https://"
                className="h-11 rounded-xl"
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="mode" label="Mode" hint="optional">
                <Select name="mode">
                  <SelectTrigger
                    id="mode"
                    className="w-full rounded-xl data-[size=default]:h-11"
                  >
                    <SelectValue placeholder="Not set" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="in_person">In person</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field id="location" label="Location" hint="optional">
                <Input
                  id="location"
                  name="location"
                  maxLength={160}
                  autoComplete="off"
                  placeholder="SRM KTR, Tech Park"
                  className="h-11 rounded-xl"
                />
              </Field>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="starts_at" label="Starts" hint="optional">
                <Input
                  id="starts_at"
                  name="starts_at"
                  type="date"
                  className="g-figure h-11 rounded-xl"
                />
              </Field>

              <Field id="deadline_at" label="Registration closes" hint="optional">
                <Input
                  id="deadline_at"
                  name="deadline_at"
                  type="datetime-local"
                  className="g-figure h-11 rounded-xl"
                />
              </Field>
            </div>

            <Field id="tags" label="Tags" hint="comma separated">
              <Input
                id="tags"
                name="tags"
                autoComplete="off"
                placeholder="ai, fintech, 36-hour"
                className="h-11 rounded-xl"
              />
            </Field>

            {error && (
              <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-destructive">
                {error}
                {error === NO_PROFILE && (
                  <>
                    {" — "}
                    <Link
                      href="/onboarding"
                      className="font-semibold text-accent underline underline-offset-4"
                    >
                      set one up
                    </Link>
                    .
                  </>
                )}
              </p>
            )}

            <div className="flex items-center gap-3 border-t border-border pt-6">
              <Button
                type="submit"
                disabled={pending}
                className="press h-11 rounded-full font-semibold"
              >
                {pending ? "Posting…" : "Post event"}
              </Button>
              <Button
                asChild
                variant="ghost"
                type="button"
                className="press h-11 rounded-full font-semibold text-ink-muted"
              >
                <Link href="/events">Cancel</Link>
              </Button>
            </div>
          </form>
        </div>
      </Page>
    </AppShell>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="justify-between font-semibold">
        {label}
        {hint && <span className="text-xs font-normal text-ink-subtle">{hint}</span>}
      </Label>
      {children}
    </div>
  );
}
