import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Intake = {
  meeting_availability: string | null;
  design_services: string | null;
  overall_budget: string | null;
  referral_source: string | null;
  project1_description: string | null;
  project1_budget: string | null;
  project1_has_plans: string | null;
  project2_description: string | null;
  project2_budget: string | null;
  project2_has_plans: string | null;
  project3_description: string | null;
  project3_budget: string | null;
  project3_has_plans: string | null;
  desired_start: string | null;
  completion_date: string | null;
  additional_projects: string | null;
  created_at: string;
};

function Item({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-sm">{value}</dd>
    </div>
  );
}

const PLAN_LABELS: Record<string, string> = {
  yes: "Yes",
  no: "No",
  in_progress: "In progress",
};

const DESIGN_LABELS: Record<string, string> = {
  yes: "Yes",
  no: "No",
  not_sure: "Not sure yet",
};

export function IntakeDetails({ intake }: { intake: Intake }) {
  const projects = [
    {
      n: 1,
      desc: intake.project1_description,
      budget: intake.project1_budget,
      plans: intake.project1_has_plans,
    },
    {
      n: 2,
      desc: intake.project2_description,
      budget: intake.project2_budget,
      plans: intake.project2_has_plans,
    },
    {
      n: 3,
      desc: intake.project3_description,
      budget: intake.project3_budget,
      plans: intake.project3_has_plans,
    },
  ].filter((p) => p.desc || p.budget);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Original Work Inquiry{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {new Date(intake.created_at).toLocaleDateString()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Item label="Meeting availability" value={intake.meeting_availability} />
          <Item
            label="Interested in design services"
            value={
              intake.design_services
                ? (DESIGN_LABELS[intake.design_services] ?? intake.design_services)
                : null
            }
          />
          <Item label="Total all-in budget" value={intake.overall_budget} />
          <Item label="How they heard about us" value={intake.referral_source} />
          <Item label="Desired start" value={intake.desired_start} />
          <Item label="Completion date" value={intake.completion_date} />
        </dl>
        {projects.map((p) => (
          <div key={p.n} className="mt-4 rounded-lg bg-muted/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Project #{p.n}
            </p>
            <dl className="mt-2 grid gap-3">
              <Item label="Description" value={p.desc} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Item label="Budget" value={p.budget} />
                <Item
                  label="Has drawings / plans"
                  value={p.plans ? (PLAN_LABELS[p.plans] ?? p.plans) : null}
                />
              </div>
            </dl>
          </div>
        ))}
        <div className="mt-4">
          <Item
            label="Additional projects mentioned"
            value={intake.additional_projects}
          />
        </div>
      </CardContent>
    </Card>
  );
}
