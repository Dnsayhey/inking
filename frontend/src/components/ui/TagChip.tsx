import { ButtonHTMLAttributes, ReactNode } from "react";

type TagChipVariant = "filter" | "filterSelected" | "muted";

type TagChipProps = {
  variant?: TagChipVariant;
  children: ReactNode;
  className?: string;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  color?: string | null;
};

function variantClassName(variant: TagChipVariant): string {
  switch (variant) {
    case "filterSelected":
      return "border-[var(--brand-600)] bg-[var(--brand-600)] text-white";
    case "muted":
      return "border-[var(--line-soft)] bg-slate-100 text-[var(--text-secondary)]";
    case "filter":
    default:
      return "border-[var(--line-strong)] bg-[var(--brand-50)] text-[var(--brand-700)] hover:border-[var(--brand-300)]";
  }
}

const baseClassName =
  "rounded-full border px-2.5 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-300)]";

function hexToRgba(hex: string, alpha: number): string | null {
  const raw = hex.trim().replace("#", "");
  const normalized = raw.length === 3 ? raw.split("").map((c) => `${c}${c}`).join("") : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function TagChip(props: TagChipProps) {
  const variant = props.variant ?? "filter";
  const mergedClassName = [baseClassName, variantClassName(variant), props.className].filter(Boolean).join(" ");
  const tint = props.color ? hexToRgba(props.color, 0.14) : null;
  const customStyle = props.color
    ? variant === "filterSelected"
      ? { borderColor: props.color, backgroundColor: props.color, color: "#ffffff" }
      : { borderColor: props.color, backgroundColor: tint ?? undefined, color: props.color }
    : undefined;

  if (props.onClick) {
    return (
      <button className={mergedClassName} onClick={props.onClick} style={customStyle} type={props.type ?? "button"}>
        {props.children}
      </button>
    );
  }

  return (
    <span className={mergedClassName} style={customStyle}>
      {props.children}
    </span>
  );
}
