"use client";

// Shared chrome for one question in the intake flow: big friendly heading,
// optional helper text, and a consistent glass surface.

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

export function QuestionShell({
  index,
  title,
  subtitle,
  hint,
  children,
  onNext,
  onBack,
  canGoBack,
  nextLabel = "Continue",
  disabled,
  submitting,
  optional,
  onSkip,
}: {
  index: number;
  title: string;
  subtitle?: string;
  hint?: string;
  children: React.ReactNode;
  onNext: () => void;
  onBack: () => void;
  canGoBack: boolean;
  nextLabel?: string;
  disabled?: boolean;
  submitting?: boolean;
  optional?: boolean;
  onSkip?: () => void;
}) {
  return (
    <div
      key={index}
      className="animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="glass rounded-2xl p-6 sm:p-8">
        <h2 className="font-heading text-2xl leading-tight font-semibold tracking-tight sm:text-3xl">
          {title}
          {optional ? (
            <span className="ml-2 align-middle text-sm font-normal text-muted-foreground">
              optional
            </span>
          ) : null}
        </h2>
        {subtitle ? (
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
        ) : null}

        <div className="mt-6">{children}</div>

        {hint ? (
          <p className="mt-4 text-xs text-muted-foreground">{hint}</p>
        ) : null}

        <div className="mt-8 flex items-center gap-3">
          <Button
            size="lg"
            onClick={onNext}
            disabled={disabled || submitting}
            className="glass-cta gap-2 rounded-full px-7 font-semibold shadow-none hover:bg-transparent"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Sending…
              </>
            ) : (
              <>
                {nextLabel} <ArrowRight className="size-4" />
              </>
            )}
          </Button>

          {optional && onSkip ? (
            <Button variant="ghost" onClick={onSkip} disabled={submitting}>
              Skip
            </Button>
          ) : null}

          {canGoBack ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              disabled={submitting}
              aria-label="Previous question"
              className="ml-auto rounded-full text-muted-foreground"
            >
              <ArrowLeft className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// Large tappable choice card — the primary selection control in the flow.
export function ChoiceCard({
  label,
  description,
  selected,
  onSelect,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full rounded-xl border p-4 text-left transition-all ${
        selected
          ? "border-primary bg-primary/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)]"
          : "border-white/70 bg-white/45 hover:-translate-y-0.5 hover:bg-white/65"
      } backdrop-blur-md`}
    >
      <span className="block font-medium">{label}</span>
      {description ? (
        <span className="mt-0.5 block text-sm text-muted-foreground">
          {description}
        </span>
      ) : null}
    </button>
  );
}

export function Chip({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`rounded-full border px-4 py-2 text-sm transition-all ${
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-white/70 bg-white/45 hover:bg-white/70"
      } backdrop-blur-md`}
    >
      {label}
    </button>
  );
}
