"use client";

// Typeform-style intake, condensed: six themed screens instead of one
// question per field, so a homeowner glides through in under two minutes.
// Collects the same data the old Airtable Work Inquiry did and posts it
// through the same server action.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { intakeSchema, type IntakeInput } from "@/lib/schemas/intake";
import { submitIntake } from "./actions";
import { uploadPhoto } from "@/lib/upload-client";
import { PhotoPicker } from "@/components/photo-picker";
import { QuestionShell, Chip } from "./question-shell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowRight, Check } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIMES = ["Morning", "Afternoon", "Evening"];

const START_OPTIONS = [
  "As soon as possible",
  "Within 1 month",
  "1–3 months",
  "3–6 months",
  "Just planning ahead",
];

const REFERRAL_OPTIONS = [
  "Google search",
  "Facebook",
  "Referred by friend or family",
  "Saw a job site / truck",
  "Repeat customer",
  "Other",
];

const PLAN_OPTIONS = [
  ["yes", "Yes, I have plans"],
  ["in_progress", "In progress"],
  ["no", "Not yet"],
] as const;

const DESIGN_OPTIONS = [
  ["yes", "Yes, I'd like that"],
  ["not_sure", "Not sure — tell me more"],
  ["no", "No thanks"],
] as const;

const BUDGET_MAX = 200000;

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

// Small heading for grouped questions within one screen.
function Group({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium">
        {label}
        {optional ? (
          <span className="ml-1.5 font-normal text-muted-foreground">
            (optional)
          </span>
        ) : null}
      </p>
      {children}
    </div>
  );
}

type Answers = {
  name: string;
  email: string;
  phone: string;
  alt_phone: string;
  address: string;
  project_type: string;
  description: string;
  budgetValue: number;
  budgetUnsure: boolean;
  hasPlans: "yes" | "no" | "in_progress" | "";
  designServices: "yes" | "no" | "not_sure" | "";
  startWhen: string;
  completionDate: string;
  days: string[];
  times: string[];
  availabilityNotes: string;
  referral: string;
  referralOther: string;
  additional: string;
};

const EMPTY: Answers = {
  name: "",
  email: "",
  phone: "",
  alt_phone: "",
  address: "",
  project_type: "",
  description: "",
  budgetValue: 25000,
  budgetUnsure: false,
  hasPlans: "",
  designServices: "",
  startWhen: "",
  completionDate: "",
  days: [],
  times: [],
  availabilityNotes: "",
  referral: "",
  referralOther: "",
  additional: "",
};

type Step = {
  id: string;
  title: string;
  subtitle?: string;
  hint?: string;
  optional?: boolean;
  valid: boolean;
  render: () => React.ReactNode;
};

export function IntakeForm({ projectTypes }: { projectTypes: string[] }) {
  const router = useRouter();
  const [a, setA] = useState<Answers>(EMPTY);
  const [photos, setPhotos] = useState<File[]>([]);
  const [step, setStep] = useState(-1); // -1 = welcome screen
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof Answers>(key: K, value: Answers[K]) {
    setA((prev) => ({ ...prev, [key]: value }));
  }

  function toggle(key: "days" | "times", value: string) {
    setA((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));
  }

  const budgetLabel = a.budgetUnsure
    ? "Not sure yet"
    : a.budgetValue >= BUDGET_MAX
      ? `${money(BUDGET_MAX)}+`
      : money(a.budgetValue);

  const availability = useMemo(() => {
    const parts = [
      a.days.join(", "),
      a.times.join(" / "),
      a.availabilityNotes.trim(),
    ].filter(Boolean);
    return parts.join(" · ");
  }, [a.days, a.times, a.availabilityNotes]);

  const referralValue =
    a.referral === "Other" ? a.referralOther.trim() : a.referral;

  const firstName = a.name.trim().split(" ")[0];

  const steps: Step[] = [
    // ------------------------------------------------ 1 · who you are
    {
      id: "about-you",
      title: "First, tell us about yourself.",
      subtitle: "We'll reach out within 48 hours to schedule a visit.",
      valid:
        a.name.trim().length > 0 &&
        /\S+@\S+\.\S+/.test(a.email) &&
        a.phone.trim().length >= 7,
      render: () => (
        <div className="grid gap-4">
          <Group label="Your name">
            <Input
              autoFocus
              value={a.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Jane Smith"
              autoComplete="name"
              className="h-12 bg-white/70 backdrop-blur-sm"
            />
          </Group>
          <Group label="Email">
            <Input
              type="email"
              value={a.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="h-12 bg-white/70 backdrop-blur-sm"
            />
          </Group>
          <div className="grid gap-4 sm:grid-cols-2">
            <Group label="Phone">
              <Input
                type="tel"
                value={a.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="(555) 123-4567"
                autoComplete="tel"
                className="h-12 bg-white/70 backdrop-blur-sm"
              />
            </Group>
            <Group label="Alt. phone" optional>
              <Input
                type="tel"
                value={a.alt_phone}
                onChange={(e) => set("alt_phone", e.target.value)}
                className="h-12 bg-white/70 backdrop-blur-sm"
              />
            </Group>
          </div>
        </div>
      ),
    },
    // ------------------------------------------------ 2 · the project
    {
      id: "project",
      title: firstName
        ? `Thanks, ${firstName}. Where's the project?`
        : "Where's the project?",
      valid: a.address.trim().length >= 5 && a.project_type.length > 0,
      render: () => (
        <div className="grid gap-5">
          <Group label="Project address">
            <Input
              autoFocus
              value={a.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="412 Oak Street, Springfield, MO"
              autoComplete="street-address"
              className="h-12 bg-white/70 backdrop-blur-sm"
            />
          </Group>
          <Group label="What kind of work is it?">
            <div className="flex flex-wrap gap-2">
              {projectTypes.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  selected={a.project_type === t}
                  onSelect={() => set("project_type", t)}
                />
              ))}
            </div>
          </Group>
        </div>
      ),
    },
    // ------------------------------------------------ 3 · describe it
    {
      id: "details",
      title: "Tell us about the project.",
      subtitle:
        "The more detail the better — and photos of the space help us understand the job before we visit.",
      hint: "Tip: press ⌘ + Enter to continue.",
      valid: a.description.trim().length >= 10,
      render: () => (
        <div className="grid gap-5">
          <Textarea
            autoFocus
            rows={5}
            value={a.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="We'd like to gut our kitchen — new cabinets, quartz counters, and move the sink to the island…"
            className="bg-white/70 text-base backdrop-blur-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) next();
            }}
          />
          <Group label="Photos of the space" optional>
            <PhotoPicker files={photos} onChange={setPhotos} />
          </Group>
        </div>
      ),
    },
    // ------------------------------------------------ 4 · budget & plans
    {
      id: "budget-plans",
      title: "Let's talk budget and plans.",
      subtitle:
        "A ballpark is fine — nothing is locked in. It just helps us recommend the right approach.",
      valid: a.hasPlans !== "" && a.designServices !== "",
      render: () => (
        <div className="grid gap-6">
          <div className="grid gap-4">
            <div className="text-center">
              <span className="font-heading text-3xl font-semibold tracking-tight">
                {budgetLabel}
              </span>
            </div>
            <Slider
              value={[a.budgetValue]}
              onValueChange={([v]) => {
                set("budgetValue", v);
                set("budgetUnsure", false);
              }}
              min={2500}
              max={BUDGET_MAX}
              step={2500}
              disabled={a.budgetUnsure}
              className={a.budgetUnsure ? "opacity-40" : ""}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{money(2500)}</span>
              <Chip
                label="Not sure yet"
                selected={a.budgetUnsure}
                onSelect={() => set("budgetUnsure", !a.budgetUnsure)}
              />
              <span>{money(BUDGET_MAX)}+</span>
            </div>
          </div>
          <Group label="Do you already have drawings or plans?">
            <div className="flex flex-wrap gap-2">
              {PLAN_OPTIONS.map(([value, label]) => (
                <Chip
                  key={value}
                  label={label}
                  selected={a.hasPlans === value}
                  onSelect={() => set("hasPlans", value)}
                />
              ))}
            </div>
          </Group>
          <Group label="Would our in-house design services help?">
            <div className="flex flex-wrap gap-2">
              {DESIGN_OPTIONS.map(([value, label]) => (
                <Chip
                  key={value}
                  label={label}
                  selected={a.designServices === value}
                  onSelect={() => set("designServices", value)}
                />
              ))}
            </div>
          </Group>
        </div>
      ),
    },
    // ------------------------------------------------ 5 · timing & visit
    {
      id: "timing",
      title: "When works for you?",
      valid: a.startWhen.length > 0 && availability.length > 0,
      render: () => (
        <div className="grid gap-6">
          <Group label="When would you like to start?">
            <div className="flex flex-wrap gap-2">
              {START_OPTIONS.map((o) => (
                <Chip
                  key={o}
                  label={o}
                  selected={a.startWhen === o}
                  onSelect={() => set("startWhen", o)}
                />
              ))}
            </div>
          </Group>
          <Group label="Any deadline we should know about?" optional>
            <Input
              type="date"
              value={a.completionDate}
              onChange={(e) => set("completionDate", e.target.value)}
              className="h-12 w-full max-w-xs bg-white/70 backdrop-blur-sm"
            />
          </Group>
          <Group label="When are you usually free for a visit?">
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => (
                  <Chip
                    key={d}
                    label={d}
                    selected={a.days.includes(d)}
                    onSelect={() => toggle("days", d)}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {TIMES.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    selected={a.times.includes(t)}
                    onSelect={() => toggle("times", t)}
                  />
                ))}
              </div>
              <Input
                value={a.availabilityNotes}
                onChange={(e) => set("availabilityNotes", e.target.value)}
                placeholder="Anything else — “after 4pm is best”, “call first”…"
                className="h-12 bg-white/70 backdrop-blur-sm"
              />
            </div>
          </Group>
        </div>
      ),
    },
    // ------------------------------------------------ 6 · final details
    {
      id: "final",
      title: "Last one — a couple of quick details.",
      valid: referralValue.length > 0,
      render: () => (
        <div className="grid gap-6">
          <Group label="How did you hear about us?">
            <div className="flex flex-wrap gap-2">
              {REFERRAL_OPTIONS.map((o) => (
                <Chip
                  key={o}
                  label={o}
                  selected={a.referral === o}
                  onSelect={() => set("referral", o)}
                />
              ))}
            </div>
            {a.referral === "Other" ? (
              <Input
                autoFocus
                value={a.referralOther}
                onChange={(e) => set("referralOther", e.target.value)}
                placeholder="Tell us where you found us"
                className="h-12 bg-white/70 backdrop-blur-sm"
              />
            ) : null}
          </Group>
          <Group label="Any other projects on your list?" optional>
            <Textarea
              rows={3}
              value={a.additional}
              onChange={(e) => set("additional", e.target.value)}
              placeholder="We're also thinking about redoing the deck next spring…"
              className="bg-white/70 text-base backdrop-blur-sm"
            />
          </Group>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const progress = step < 0 ? 0 : ((step + 1) / steps.length) * 100;
  const isLast = step === steps.length - 1;

  function next() {
    if (step < 0) {
      setStep(0);
      return;
    }
    if (!steps[step].valid) return;
    if (isLast) {
      void handleSubmit();
      return;
    }
    setStep((s) => s + 1);
  }

  function skip() {
    if (isLast) void handleSubmit();
    else setStep((s) => s + 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const budgetText = a.budgetUnsure ? "Not sure yet" : budgetLabel;
      const payload: IntakeInput = {
        name: a.name.trim(),
        email: a.email.trim(),
        phone: a.phone.trim(),
        alt_phone: a.alt_phone.trim(),
        address: a.address.trim(),
        meeting_availability: availability,
        design_services: (a.designServices || "not_sure") as
          IntakeInput["design_services"],
        overall_budget: budgetText,
        referral_source: referralValue,
        project_type: a.project_type,
        project1_description: a.description.trim(),
        project1_budget: budgetText,
        project1_has_plans: (a.hasPlans || undefined) as
          IntakeInput["project1_has_plans"],
        desired_start: a.startWhen,
        completion_date: a.completionDate,
        additional_projects: a.additional.trim(),
        website: "",
      };

      const parsed = intakeSchema.safeParse(payload);
      if (!parsed.success) {
        toast.error("Something's missing — please check your answers.");
        setSubmitting(false);
        return;
      }

      const result = await submitIntake(parsed.data);
      if (!result.ok) {
        toast.error(result.error);
        setSubmitting(false);
        return;
      }

      if (photos.length > 0 && result.grant) {
        let failed = 0;
        for (const file of photos) {
          try {
            await uploadPhoto(file, {
              projectId: result.projectId,
              photoType: "before",
              auth: { context: "intake", grant: result.grant },
            });
          } catch {
            failed += 1;
          }
        }
        if (failed > 0) {
          toast.warning(
            `${failed} photo${failed > 1 ? "s" : ""} didn't upload — we still got your inquiry.`
          );
        }
      }

      router.push("/start/thanks");
    } catch {
      toast.error("Something went wrong — please try again.");
      setSubmitting(false);
    }
  }

  // Welcome screen
  if (step < 0) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="glass rounded-2xl p-8 sm:p-10">
          <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            Let&apos;s talk about your project.
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Six quick screens — about two minutes. We&apos;ll get back to you
            within 48 hours to schedule a visit.
          </p>
          <Button
            size="lg"
            onClick={next}
            className="glass-cta mt-8 gap-2 rounded-full px-8 text-base font-semibold shadow-none hover:bg-transparent"
          >
            Get started <ArrowRight className="size-4" />
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            Press Enter at any point to move to the next screen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      onKeyDown={(e) => {
        if (
          e.key === "Enter" &&
          !e.shiftKey &&
          (e.target as HTMLElement).tagName !== "TEXTAREA"
        ) {
          e.preventDefault();
          next();
        }
      }}
    >
      {/* Progress */}
      <div className="mb-5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/40 backdrop-blur-sm">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Step {step + 1} of {steps.length}
        </p>
      </div>

      <QuestionShell
        index={step}
        title={current.title}
        subtitle={current.subtitle}
        hint={current.hint}
        optional={current.optional}
        onSkip={current.optional ? skip : undefined}
        canGoBack={step > 0}
        onBack={() => setStep((s) => Math.max(0, s - 1))}
        onNext={next}
        disabled={!current.valid}
        submitting={submitting}
        nextLabel={isLast ? "Submit inquiry" : "Continue"}
      >
        {current.render()}
      </QuestionShell>

      {isLast ? (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Check className="size-3.5" /> You&apos;ll get a confirmation on the
          next screen.
        </p>
      ) : null}
    </div>
  );
}
