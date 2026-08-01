"use client";

import { useState, useTransition } from "react";
import { addAppointment, deleteAppointment } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarPlus, X } from "lucide-react";

type Appointment = {
  id: string;
  kind: string;
  startsAt: string;
  location: string | null;
  notes: string | null;
};

export function AppointmentsPanel({
  projectId,
  appointments,
}: {
  projectId: string;
  appointments: Appointment[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({ starts_at: "", location: "", notes: "" });
  // Yesterday's cutoff, fixed at mount so the list doesn't reshuffle mid-render.
  const [cutoff] = useState(() => Date.now() - 86400000);

  const upcoming = appointments.filter(
    (a) => new Date(a.startsAt).getTime() >= cutoff
  );
  const past = appointments.filter(
    (a) => new Date(a.startsAt).getTime() < cutoff
  );

  function Row({ a, muted }: { a: Appointment; muted?: boolean }) {
    return (
      <div
        className={`flex items-start justify-between gap-2 rounded-md border p-2.5 ${
          muted ? "opacity-60" : ""
        }`}
      >
        <div className="text-sm">
          <p className="font-medium">
            {new Date(a.startsAt).toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
          {a.location ? (
            <p className="text-xs text-muted-foreground">{a.location}</p>
          ) : null}
          {a.notes ? <p className="text-xs">{a.notes}</p> : null}
        </div>
        <button
          type="button"
          aria-label="Delete appointment"
          onClick={() =>
            startTransition(async () => {
              const res = await deleteAppointment(projectId, a.id);
              if (!res.ok) toast.error(res.error);
            })
          }
        >
          <X className="size-4 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Appointments</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <CalendarPlus className="size-4" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Appointment</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label>Date &amp; time</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) =>
                    setForm({ ...form, starts_at: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Location</Label>
                <Input
                  placeholder="Defaults to the property address"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Notes</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                disabled={pending || !form.starts_at}
                onClick={() =>
                  startTransition(async () => {
                    const res = await addAppointment(projectId, form);
                    if (res.ok) {
                      setOpen(false);
                      setForm({ starts_at: "", location: "", notes: "" });
                    } else {
                      toast.error(res.error);
                    }
                  })
                }
              >
                {pending ? "Adding…" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="grid gap-2">
        {upcoming.map((a) => (
          <Row key={a.id} a={a} />
        ))}
        {past.length > 0 ? (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">
              {past.length} past appointment{past.length > 1 ? "s" : ""}
            </summary>
            <div className="mt-2 grid gap-2">
              {past.map((a) => (
                <Row key={a.id} a={a} muted />
              ))}
            </div>
          </details>
        ) : null}
        {appointments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing scheduled for this project.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
