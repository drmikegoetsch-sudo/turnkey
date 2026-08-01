import { z } from "zod";

const planStatus = z.enum(["yes", "no", "in_progress"]);

export const intakeSchema = z.object({
  name: z.string().min(1, "Required").max(200),
  email: z.string().email("Enter a valid email").max(200),
  phone: z.string().min(7, "Enter a valid phone number").max(30),
  alt_phone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().min(5, "Required").max(300),
  meeting_availability: z.string().min(1, "Required").max(500),
  design_services: z.enum(["yes", "no", "not_sure"], {
    message: "Please choose one",
  }),
  overall_budget: z.string().min(1, "Required").max(200),
  referral_source: z.string().min(1, "Required").max(300),
  project_type: z.string().max(100).optional().or(z.literal("")),
  project1_description: z
    .string()
    .min(10, "Tell us a bit more about the project")
    .max(5000),
  project1_budget: z.string().min(1, "Required").max(200),
  project1_has_plans: planStatus.optional(),
  desired_start: z.string().max(300).optional().or(z.literal("")),
  completion_date: z.string().max(300).optional().or(z.literal("")),
  additional_projects: z.string().max(2000).optional().or(z.literal("")),
  project2_description: z.string().max(5000).optional().or(z.literal("")),
  project2_budget: z.string().max(200).optional().or(z.literal("")),
  project2_has_plans: planStatus.optional(),
  project3_description: z.string().max(5000).optional().or(z.literal("")),
  project3_budget: z.string().max(200).optional().or(z.literal("")),
  project3_has_plans: planStatus.optional(),
  // Honeypot — real users never fill this.
  website: z.string().max(0).optional().or(z.literal("")),
});

export type IntakeInput = z.infer<typeof intakeSchema>;

export const PLAN_STATUS_LABELS: Record<z.infer<typeof planStatus>, string> = {
  yes: "Yes",
  no: "No",
  in_progress: "In progress",
};

export const DESIGN_SERVICES_LABELS = {
  yes: "Yes",
  no: "No",
  not_sure: "Not sure yet",
} as const;
