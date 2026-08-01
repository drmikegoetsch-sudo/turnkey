"use client";

// Shared field set for creating and editing a board column.

import {
  COLUMN_COLORS,
  COLUMN_KINDS,
  COLOR_DOT_CLASSES,
  KIND_HINTS,
  KIND_LABELS,
  type ColumnColor,
  type ColumnKind,
} from "@/lib/stages";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ColumnFormState = {
  label: string;
  description: string;
  kind: ColumnKind;
  color: ColumnColor;
};

export function ColumnFormFields({
  value,
  onChange,
}: {
  value: ColumnFormState;
  onChange: (next: ColumnFormState) => void;
}) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label>Column name</Label>
        <Input
          value={value.label}
          placeholder="e.g. Waiting on Permits"
          onChange={(e) => onChange({ ...value, label: e.target.value })}
        />
      </div>

      <div className="grid gap-1.5">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {COLUMN_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              aria-pressed={value.color === c}
              onClick={() => onChange({ ...value, color: c })}
              className={`size-7 rounded-full ${COLOR_DOT_CLASSES[c]} ${
                value.color === c
                  ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                  : ""
              }`}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label>What happens in this column?</Label>
        <Select
          value={value.kind}
          onValueChange={(v) => onChange({ ...value, kind: v as ColumnKind })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLUMN_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {KIND_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{KIND_HINTS[value.kind]}</p>
      </div>

      <div className="grid gap-1.5">
        <Label>Description (optional)</Label>
        <Textarea
          rows={2}
          placeholder="A note to yourselves about what belongs here."
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </div>
    </div>
  );
}
