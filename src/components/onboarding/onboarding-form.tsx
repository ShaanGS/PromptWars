"use client";

import { useState, useTransition } from "react";
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
      handle: handle || name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").slice(0, 24),
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

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Menon" />
          </Field>
          <Field label="Handle">
            <Input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="priya"
            />
          </Field>
          <Field label="Department">
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger>
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
              <SelectTrigger>
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
        <Field label="One line about you">
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} maxLength={200} />
        </Field>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Skills — proof links count 1.0×, claims 0.6×</h2>
        {skills.map((s, i) => (
          <div key={i} className="grid items-center gap-2 sm:grid-cols-[150px_1fr_1fr_24px]">
            <Select
              value={s.skill}
              onValueChange={(v) => setSkills((xs) => xs.map((x, j) => (j === i ? { ...x, skill: v } : x)))}
            >
              <SelectTrigger>
                <SelectValue placeholder="skill" />
              </SelectTrigger>
              <SelectContent>
                {SKILL_VOCAB.map((sk) => (
                  <SelectItem key={sk} value={sk}>
                    {sk}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-3">
              <Slider
                value={[s.proficiency * 100]}
                min={10}
                max={100}
                step={10}
                onValueChange={([v]) =>
                  setSkills((xs) => xs.map((x, j) => (j === i ? { ...x, proficiency: v / 100 } : x)))
                }
              />
              <span className="w-10 font-mono text-xs text-muted-foreground tabular-nums">
                {Math.round(s.proficiency * 100)}%
              </span>
            </div>
            <Input
              value={s.proofUrl}
              onChange={(e) =>
                setSkills((xs) => xs.map((x, j) => (j === i ? { ...x, proofUrl: e.target.value } : x)))
              }
              placeholder="proof URL (repo, project)"
            />
            <button
              aria-label="Remove skill"
              className="text-muted-foreground transition-colors hover:text-destructive"
              onClick={() => setSkills((xs) => xs.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        ))}
        {skills.length < 6 && (
          <Button
            variant="secondary"
            size="sm"
            className="self-start press-feedback"
            onClick={() => setSkills((xs) => [...xs, { skill: "", proficiency: 0.5, proofUrl: "" }])}
          >
            Add skill
          </Button>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">When can you actually work?</h2>
        <div className="overflow-x-auto">
          <div className="grid min-w-105 grid-cols-[70px_repeat(7,1fr)] gap-1 text-center text-xs">
            <span />
            {DAYS.map((d) => (
              <span key={d} className="py-1 text-muted-foreground">
                {d}
              </span>
            ))}
            {BLOCKS.map((block) => (
              <FragmentRow
                key={block.key}
                block={block}
                slots={slots}
                toggleSlot={toggleSlot}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <Field label={`Experience — ${experience}/5`}>
          <Slider value={[experience]} min={1} max={5} step={1} onValueChange={([v]) => setExperience(v)} />
        </Field>
        <Field label={`Commitment — ${commitment}/5`}>
          <Slider value={[commitment]} min={1} max={5} step={1} onValueChange={([v]) => setCommitment(v)} />
        </Field>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        size="lg"
        onClick={submit}
        disabled={pending || name.trim().length < 2}
        className="press-feedback self-start"
      >
        {pending ? "Saving…" : "Join the pool"}
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function FragmentRow({
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
      <span className="py-1.5 text-left text-muted-foreground">{block.label}</span>
      {DAYS.map((_, day) => {
        const key = `${block.key}-${day}`;
        const on = slots.has(key);
        return (
          <button
            key={key}
            aria-pressed={on}
            onClick={() => toggleSlot(key)}
            className={`h-7 rounded-sm border transition-colors ${
              on
                ? "border-primary/60 bg-primary/25"
                : "border-border bg-card hover:bg-surface-2"
            }`}
          />
        );
      })}
    </>
  );
}
