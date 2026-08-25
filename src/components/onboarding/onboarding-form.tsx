"use client";

import { useState, useTransition } from "react";
import { Link2, Plus, X } from "lucide-react";
import { saveProfile, type ProfileInput } from "@/actions/onboarding";
import { DEPTS, SKILL_VOCAB } from "@/lib/constants";
import type { AvailabilityWindow } from "@/engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const BLOCKS = [
  { key: "morning", label: "Morning", start: "09:00", end: "13:00" },
  { key: "evening", label: "Evening", start: "18:00", end: "21:00" },
  { key: "late", label: "Late", start: "21:30", end: "23:30" },
] as const;

type SkillDraft = { skill: string; proficiency: number; proofUrl: string };

export function OnboardingForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [dept, setDept] = useState<string>("CSE");
  const [year, setYear] = useState(2);
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState(3);
  const [commitment, setCommitment] = useState(4);
  const [slots, setSlots] = useState<Set<string>>(new Set(["evening-2", "evening-4"]));
  const [skills, setSkills] = useState<SkillDraft[]>([
    { skill: "react", proficiency: 0.6, proofUrl: "" },
  ]);

  const toggleSlot = (key: string) =>
    setSlots((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const submit = () => {
    const availability: AvailabilityWindow[] = [];
    for (const block of BLOCKS) {
      for (let day = 0; day < 7; day++) {
        if (slots.has(`${block.key}-${day}`)) {
          availability.push({
            day: day as AvailabilityWindow["day"],
            start: block.start,
            end: block.end,
          });
        }
      }
    }
    const input: ProfileInput = {
      name,
      handle:
        handle || name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").slice(0, 24),
      dept: dept as ProfileInput["dept"],
      year,
      bio: bio || undefined,
      experienceLevel: experience,
      commitmentLevel: commitment,
      availability,
      skills: skills
        .filter((s) => s.skill)
        .map((s) => ({
          skill: s.skill as ProfileInput["skills"][number]["skill"],
          proficiency: s.proficiency,
          proofUrl: s.proofUrl || undefined,
        })),
    };
    setError(null);
    startTransition(async () => {
      const res = await saveProfile(input);
      if (res?.error) setError(res.error);
    });
  };

  const verified = skills.filter((s) => s.proofUrl).length;

  return (
    <div className="flex flex-col gap-5">
      <section className="g-card p-5 sm:p-7">
        <h2 className="text-base font-semibold tracking-[-0.02em]">Who you are</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Priya Menon"
              className="rounded-xl"
            />
          </Field>
          <Field label="Handle" hint="your profile URL">
            <Input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="priya"
              className="rounded-xl"
            />
          </Field>
          <Field label="Department">
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Year">
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    Year {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="One line about you" hint="optional">
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              maxLength={200}
              placeholder="Third-year CSE. Built two ML side projects, want a designer."
              className="rounded-xl"
            />
          </Field>
        </div>
      </section>

      <section className="g-card p-5 sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold tracking-[-0.02em]">What you bring</h2>
          <p className="text-xs text-ink-muted">
            <span className="g-figure font-semibold text-foreground">{verified}</span> of{" "}
            <span className="g-figure font-semibold text-foreground">{skills.length}</span>{" "}
            backed by a link
          </p>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-ink-muted">
          A skill with a proof link counts in full. Without one it counts at 0.6× —
          self-reported tags are the least reliable thing on any profile.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          {skills.map((s, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface-2 p-4">
              <div className="flex items-center gap-2">
                <Select
                  value={s.skill}
                  onValueChange={(v) =>
                    setSkills((xs) => xs.map((x, j) => (j === i ? { ...x, skill: v } : x)))
                  }
                >
                  <SelectTrigger className="w-full rounded-lg bg-card">
                    <SelectValue placeholder="pick a skill" />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_VOCAB.map((sk) => (
                      <SelectItem key={sk} value={sk}>
                        {sk}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {skills.length > 1 && (
                  <button
                    aria-label="Remove skill"
                    onClick={() => setSkills((xs) => xs.filter((_, j) => j !== i))}
                    className="press flex size-9 shrink-0 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-surface-3 hover:text-destructive"
                  >
                    <X className="size-4" strokeWidth={2.4} />
                  </button>
                )}
              </div>

              <div className="mt-3 flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs text-ink-muted">Proficiency</span>
                <Slider
                  value={[s.proficiency * 100]}
                  min={10}
                  max={100}
                  step={10}
                  onValueChange={([v]) =>
                    setSkills((xs) =>
                      xs.map((x, j) => (j === i ? { ...x, proficiency: v / 100 } : x)),
                    )
                  }
                />
                <span className="g-figure w-10 shrink-0 text-right text-xs font-semibold">
                  {Math.round(s.proficiency * 100)}%
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Link2 className="size-4 shrink-0 text-ink-subtle" strokeWidth={2.2} />
                <Input
                  value={s.proofUrl}
                  onChange={(e) =>
                    setSkills((xs) =>
                      xs.map((x, j) => (j === i ? { ...x, proofUrl: e.target.value } : x)),
                    )
                  }
                  placeholder="Link a repo or past project"
                  className="rounded-lg bg-card"
                />
              </div>
            </div>
          ))}
        </div>

        {skills.length < 6 && (
          <Button
            variant="secondary"
            size="sm"
            className="press mt-3 rounded-full border border-border font-semibold"
            onClick={() =>
              setSkills((xs) => [...xs, { skill: "", proficiency: 0.5, proofUrl: "" }])
            }
          >
            <Plus className="size-3.5" strokeWidth={2.6} />
            Add skill
          </Button>
        )}
      </section>

      <section className="g-card p-5 sm:p-7">
        <h2 className="text-base font-semibold tracking-[-0.02em]">When you are free</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Squads score on shared hours, not just skills. Tap the blocks you can
          actually show up for.
        </p>
        <div className="mt-4 overflow-x-auto">
          <div className="grid min-w-[420px] grid-cols-[64px_repeat(7,1fr)] gap-1.5 text-center text-xs">
            <span />
            {DAYS.map((d) => (
              <span key={d} className="pb-1 font-medium text-ink-subtle">
                {d}
              </span>
            ))}
            {BLOCKS.map((block) => (
              <BlockRow
                key={block.key}
                block={block}
                slots={slots}
                toggleSlot={toggleSlot}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field label={`Experience — ${experience} of 5`}>
            <Slider
              value={[experience]}
              min={1}
              max={5}
              step={1}
              onValueChange={([v]) => setExperience(v)}
            />
          </Field>
          <Field label={`Commitment — ${commitment} of 5`}>
            <Slider
              value={[commitment]}
              min={1}
              max={5}
              step={1}
              onValueChange={([v]) => setCommitment(v)}
            />
          </Field>
        </div>
      </section>

      {error && (
        <p className="rounded-xl bg-destructive/8 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <Button
          size="lg"
          onClick={submit}
          disabled={pending || name.trim().length < 2}
          className="press h-12 rounded-full px-7 font-semibold"
        >
          {pending ? "Saving" : "Join the pool"}
        </Button>
        <span className="text-xs text-ink-subtle">
          You show up in squad rankings straight away.
        </span>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="justify-between text-xs font-semibold text-ink-muted">
        {label}
        {hint && <span className="font-normal text-ink-subtle">{hint}</span>}
      </Label>
      {children}
    </div>
  );
}

function BlockRow({
  block,
  slots,
  toggleSlot,
}: {
  block: (typeof BLOCKS)[number];
  slots: Set<string>;
  toggleSlot: (key: string) => void;
}) {
  return (
    <>
      <span className="flex items-center text-left text-xs font-medium text-ink-muted">
        {block.label}
      </span>
      {DAYS.map((_, day) => {
        const key = `${block.key}-${day}`;
        const on = slots.has(key);
        return (
          <button
            key={key}
            aria-label={`${block.label} ${DAYS[day]}`}
            aria-pressed={on}
            onClick={() => toggleSlot(key)}
            className={`h-9 rounded-lg border transition-colors duration-150 ${
              on
                ? "border-accent bg-primary-soft"
                : "border-border bg-card hover:bg-surface-2"
            }`}
          />
        );
      })}
    </>
  );
}
