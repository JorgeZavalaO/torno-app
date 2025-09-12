"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";

type Field = {
  name: string;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "password";
  textarea?: boolean;
  required?: boolean;
  maxLength?: number;
};

export default function CreateEditDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  initialValues = {},
  submitLabel = "Guardar",
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: Field[];
  initialValues?: Record<string, string | undefined | null>;
  submitLabel?: string;
  onSubmit: (fd: FormData) => Promise<unknown> | unknown;
}) {
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {};
    for (const f of fields) {
      v[f.name] = (initialValues?.[f.name] ?? "") as string;
    }
    return v;
  });

  // reset when dialog opens with different initial values
  const key = JSON.stringify(initialValues ?? {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={key} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData();
            for (const f of fields) {
              const val = values[f.name] ?? "";
              if (val || f.required) fd.set(f.name, val);
            }
            startTransition(async () => {
              await onSubmit(fd);
            });
          }}
          className="space-y-4"
        >
          {fields.map((f) => (
            <div key={f.name} className="space-y-2">
              <Label htmlFor={`ced-${f.name}`}>{f.label}{f.required ? " *" : ""}</Label>
              {f.textarea ? (
                <Textarea
                  id={`ced-${f.name}`}
                  value={values[f.name] ?? ""}
                  maxLength={f.maxLength}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.name]: e.target.value }))}
                  placeholder={f.placeholder}
                  rows={3}
                />
              ) : (
                <Input
                  id={`ced-${f.name}`}
                  type={f.type ?? "text"}
                  value={values[f.name] ?? ""}
                  maxLength={f.maxLength}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.name]: e.target.value }))}
                  placeholder={f.placeholder}
                  required={f.required}
                />
              )}
            </div>
          ))}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
