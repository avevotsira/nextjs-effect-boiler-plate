"use client";

import { useId } from "react";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

/**
 * A radio option as a bordered card (shadcn's choice-card pattern): a big
 * target whose title and help text sit inside the label, so the choice
 * explains itself before anyone picks it.
 */
export function ChoiceCard({
  value,
  title,
  description,
  className,
  ...props
}: Omit<React.ComponentProps<typeof FieldLabel>, "children"> & {
  value: string;
  title: React.ReactNode;
  description?: React.ReactNode;
}) {
  const id = useId();
  return (
    <FieldLabel
      htmlFor={id}
      data-slot="choice-card"
      className={cn("cursor-pointer", className)}
      {...props}
    >
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>{title}</FieldTitle>
          {description && <FieldDescription>{description}</FieldDescription>}
        </FieldContent>
        <RadioGroupItem value={value} id={id} />
      </Field>
    </FieldLabel>
  );
}
