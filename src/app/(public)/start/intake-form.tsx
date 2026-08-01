"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  intakeSchema,
  type IntakeInput,
  PLAN_STATUS_LABELS,
  DESIGN_SERVICES_LABELS,
} from "@/lib/schemas/intake";
import { submitIntake } from "./actions";
import { uploadPhoto } from "@/lib/upload-client";
import { PhotoPicker } from "@/components/photo-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="leading-snug">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

function RadioRow({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: Record<string, string>;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(options).map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
            value === key
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-card hover:bg-accent"
          }`}
          aria-pressed={value === key}
          data-name={name}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function IntakeForm({ projectTypes }: { projectTypes: string[] }) {
  const router = useRouter();
  const [photos, setPhotos] = useState<File[]>([]);
  const [extraProjects, setExtraProjects] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<IntakeInput>({
    resolver: zodResolver(intakeSchema),
    defaultValues: { design_services: undefined },
  });

  const designServices = watch("design_services");
  const p1Plans = watch("project1_has_plans");
  const p2Plans = watch("project2_has_plans");
  const p3Plans = watch("project3_has_plans");
  const projectType = watch("project_type");

  async function onSubmit(data: IntakeInput) {
    setSubmitting(true);
    try {
      const result = await submitIntake(data);
      if (!result.ok) {
        toast.error(result.error);
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
            `${failed} photo${failed > 1 ? "s" : ""} didn't upload — we still received your inquiry.`
          );
        }
      }
      router.push("/start/thanks");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
      {/* Honeypot */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
        {...register("website")}
      />

      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Name" required error={errors.name?.message}>
            <Input {...register("name")} autoComplete="name" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" required error={errors.email?.message}>
              <Input
                type="email"
                {...register("email")}
                autoComplete="email"
              />
            </Field>
            <Field label="Phone #" required error={errors.phone?.message}>
              <Input type="tel" {...register("phone")} autoComplete="tel" />
            </Field>
          </div>
          <Field label="Alt. Phone #" error={errors.alt_phone?.message}>
            <Input type="tel" {...register("alt_phone")} />
          </Field>
          <Field
            label="Address"
            required
            error={errors.address?.message}
          >
            <Input
              {...register("address")}
              autoComplete="street-address"
              placeholder="Street, City, State"
            />
          </Field>
          <Field
            label="Meeting Availability (Specific Days/Times)"
            required
            error={errors.meeting_availability?.message}
          >
            <Textarea
              {...register("meeting_availability")}
              rows={2}
              placeholder="e.g. Weekdays after 4pm, Saturday mornings"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About Your Project</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field
            label="We offer in-house design services. Would this be helpful to you and your project?"
            required
            error={errors.design_services?.message}
          >
            <RadioRow
              name="design_services"
              options={DESIGN_SERVICES_LABELS}
              value={designServices}
              onChange={(v) =>
                setValue("design_services", v as IntakeInput["design_services"], {
                  shouldValidate: true,
                })
              }
            />
          </Field>
          <Field
            label="Do you have an idea of your total all-in budget? (Include a range if possible)"
            required
            error={errors.overall_budget?.message}
          >
            <Input
              {...register("overall_budget")}
              placeholder="e.g. $20,000 – $30,000"
            />
          </Field>
          <Field
            label="How did you hear about us?"
            required
            error={errors.referral_source?.message}
          >
            <Input {...register("referral_source")} />
          </Field>
          <Field label="What type of work is this?">
            <div className="flex flex-wrap gap-2">
              {projectTypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setValue("project_type", projectType === t ? "" : t)
                  }
                  className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                    projectType === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card hover:bg-accent"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project #1</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field
            label="Can you describe the project in detail?"
            required
            error={errors.project1_description?.message}
          >
            <Textarea {...register("project1_description")} rows={4} />
          </Field>
          <Field
            label="What is your budget for this project?"
            required
            error={errors.project1_budget?.message}
          >
            <Input {...register("project1_budget")} />
          </Field>
          <Field label="Do you have drawings or plans already?">
            <RadioRow
              name="project1_has_plans"
              options={PLAN_STATUS_LABELS}
              value={p1Plans}
              onChange={(v) =>
                setValue(
                  "project1_has_plans",
                  v as IntakeInput["project1_has_plans"]
                )
              }
            />
          </Field>
          <Field label="Photos of the space (optional)">
            <PhotoPicker files={photos} onChange={setPhotos} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timing</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="When would you want the project(s) to start?">
              <Input {...register("desired_start")} />
            </Field>
            <Field label="Is there a completion date for any of the projects?">
              <Input {...register("completion_date")} />
            </Field>
          </div>
          <Field label="Are there additional projects you're interested in?">
            <Textarea {...register("additional_projects")} rows={2} />
          </Field>
        </CardContent>
      </Card>

      {extraProjects >= 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Project #2</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Can you describe the project in detail?">
              <Textarea {...register("project2_description")} rows={3} />
            </Field>
            <Field label="Do you have drawings or plans already?">
              <RadioRow
                name="project2_has_plans"
                options={PLAN_STATUS_LABELS}
                value={p2Plans}
                onChange={(v) =>
                  setValue(
                    "project2_has_plans",
                    v as IntakeInput["project2_has_plans"]
                  )
                }
              />
            </Field>
            <Field label="What is your budget for this project?">
              <Input {...register("project2_budget")} />
            </Field>
          </CardContent>
        </Card>
      ) : null}

      {extraProjects >= 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Project #3</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Can you describe the project in detail?">
              <Textarea {...register("project3_description")} rows={3} />
            </Field>
            <Field label="Do you have drawings or plans already?">
              <RadioRow
                name="project3_has_plans"
                options={PLAN_STATUS_LABELS}
                value={p3Plans}
                onChange={(v) =>
                  setValue(
                    "project3_has_plans",
                    v as IntakeInput["project3_has_plans"]
                  )
                }
              />
            </Field>
            <Field label="What is your budget for this project?">
              <Input {...register("project3_budget")} />
            </Field>
          </CardContent>
        </Card>
      ) : null}

      {extraProjects < 2 ? (
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => setExtraProjects((n) => n + 1)}
        >
          + Add another project
        </Button>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={submitting}
        className="w-full sm:w-auto"
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Submitting…
          </>
        ) : (
          "Submit Inquiry"
        )}
      </Button>
    </form>
  );
}
