"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createSquad, type SquadInput } from "@/actions/projects";
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
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { SKILL_VOCAB } from "@/lib/constants";

const NO_EVENT = "none";
const MAX_REQUIREMENTS = 6;

type Skill = (typeof SKILL_VOCAB)[number];
type Row = {
  key: number;
  skill: Skill;
  roleLabel: string;
  weight: number;
  /** Held as 0–100 for the slider; divided down to the engine's 0–1 on submit. */
  minPct: number;
};

const newRow = (key: number): Row => ({
  key,
  skill: SKILL_VOCAB[0],
  roleLabel: "",
  weight: 2,
  minPct: 40,
});

export function NewSquadForm({
  events,
  initialEventId,
}: {
  events: { id: string; title: string }[];
  initialEventId?: string;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventId, setEventId] = useState(initialEventId ?? NO_EVENT);
  const [rows, setRows] = useState<Row[]>([newRow(0)]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nextKey = useRef(1);

  const patch = (key: number, changes: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...changes } : r)));

  const addRow = () =>
    setRows((rs) =>
      rs.length >= MAX_REQUIREMENTS ? rs : [...rs, newRow(nextKey.current++)],
    );

  const removeRow = (key: number) =>
    setRows((rs) => (rs.length <= 1 ? rs : rs.filter((r) => r.key !== key)));

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const input: SquadInput = {
      title,
      description: description.trim() || undefined,
      eventId: eventId === NO_EVENT ? undefined : eventId,
      requirements: rows.map((r) => ({
        skill: r.skill,
        roleLabel: r.roleLabel.trim() || undefined,
        weight: r.weight,
        minProficiency: r.minPct / 100,
      })),
    };
    startTransition(async () => {
      // A successful create redirects server-side, so control only returns here
      // when something went wrong.
      const result = await createSquad(input);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <div className="g-card p-6 sm:p-8">
      <form onSubmit={submit} className="flex flex-col gap-8">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="squad-title">Title</Label>
            <Input
              id="squad-title"
              className="rounded-xl"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Campus lost-and-found agent"
              required
              minLength={3}
              maxLength={80}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="squad-description">Description</Label>
            <Textarea
              id="squad-description"
              className="rounded-xl"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What you are building, and what a good week looks like."
              maxLength={400}
              rows={3}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="squad-event">Event</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger id="squad-event" className="w-full rounded-xl">
                <SelectValue placeholder="No event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_EVENT}>No event</SelectItem>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-ink-muted">
              Tie the squad to a hackathon and it shows up on that event page.
            </p>
          </div>
        </div>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-[-0.02em]">Requirements</h2>
            <p className="mt-1 text-sm text-ink-muted">
              One skill per slot. Weight is how much it matters; the floor is the
              proficiency a person needs before they count at all.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {rows.map((row, i) => (
              <div
                key={row.key}
                className="rise-in relative rounded-xl border border-border bg-surface-2 p-4"
                style={
                  { "--rise-delay": `${Math.min(i * 40, 320)}ms` } as React.CSSProperties
                }
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="g-figure flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      aria-label={`Remove requirement ${i + 1}`}
                      className="press flex size-8 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-surface-3 hover:text-destructive"
                    >
                      <Trash2 className="size-4" strokeWidth={2.2} />
                    </button>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`skill-${row.key}`}>Skill</Label>
                    <Select
                      value={row.skill}
                      onValueChange={(v) => patch(row.key, { skill: v as Skill })}
                    >
                      <SelectTrigger
                        id={`skill-${row.key}`}
                        className="w-full rounded-xl bg-card"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SKILL_VOCAB.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`role-${row.key}`}>Role label</Label>
                    <Input
                      id={`role-${row.key}`}
                      className="rounded-xl bg-card"
                      value={row.roleLabel}
                      onChange={(e) => patch(row.key, { roleLabel: e.target.value })}
                      placeholder="Frontend"
                      maxLength={40}
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`weight-${row.key}`}>Weight</Label>
                      <span className="g-figure text-xs font-semibold text-primary">
                        {row.weight}
                      </span>
                    </div>
                    <Slider
                      id={`weight-${row.key}`}
                      min={1}
                      max={3}
                      step={1}
                      value={[row.weight]}
                      onValueChange={([v]) => patch(row.key, { weight: v })}
                      aria-label={`Weight for requirement ${i + 1}`}
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`min-${row.key}`}>Min proficiency</Label>
                      <span className="g-figure text-xs font-semibold text-primary">
                        {row.minPct}%
                      </span>
                    </div>
                    <Slider
                      id={`min-${row.key}`}
                      min={0}
                      max={100}
                      step={10}
                      value={[row.minPct]}
                      onValueChange={([v]) => patch(row.key, { minPct: v })}
                      aria-label={`Minimum proficiency for requirement ${i + 1}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={addRow}
              disabled={rows.length >= MAX_REQUIREMENTS}
              className="press rounded-full border border-border font-semibold"
            >
              <Plus className="size-4" strokeWidth={2.6} />
              Add requirement
            </Button>
            {rows.length >= MAX_REQUIREMENTS && (
              <p className="mt-2 text-xs text-ink-muted">
                Six slots is the ceiling. Past that, nobody is accountable for anything.
              </p>
            )}
          </div>
        </section>

        {error && (
          <p className="text-sm text-destructive">
            {error}
            {error === "Create your profile first" && (
              <>
                {" — "}
                <Link
                  href="/onboarding"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  start here
                </Link>
                .
              </>
            )}
          </p>
        )}

        <div className="sticky bottom-20 z-10 -mx-6 -mb-6 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-border bg-card/95 px-6 py-4 backdrop-blur sm:-mx-8 sm:-mb-8 sm:px-8 lg:bottom-0">
          <span className="text-xs text-ink-subtle">You join as the first member.</span>
          <Button
            type="submit"
            disabled={pending}
            className="press rounded-full font-semibold"
          >
            {pending ? "Opening…" : "Open the squad"}
          </Button>
        </div>
      </form>
    </div>
  );
}
