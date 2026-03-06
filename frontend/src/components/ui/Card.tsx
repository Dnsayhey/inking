import { ComponentPropsWithoutRef } from "react";

type CardTone = "default" | "muted" | "elevated";

type CardProps = ComponentPropsWithoutRef<"div"> & {
  tone?: CardTone;
};

function toneClassName(tone: CardTone): string {
  switch (tone) {
    case "muted":
      return "bg-[var(--bg-panel-muted)]";
    case "elevated":
      return "bg-[var(--bg-panel)] shadow-[var(--shadow-md)]";
    case "default":
    default:
      return "bg-[var(--bg-panel)] shadow-[var(--shadow-sm)]";
  }
}

const baseClassName = "rounded-[var(--radius-lg)] border border-[var(--line-soft)]";

export function Card({ className, tone = "default", ...props }: CardProps) {
  const mergedClassName = [baseClassName, toneClassName(tone), className].filter(Boolean).join(" ");
  return <div className={mergedClassName} {...props} />;
}
