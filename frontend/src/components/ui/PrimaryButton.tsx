import { ButtonHTMLAttributes } from "react";

type PrimaryButtonVariant = "primary" | "secondary" | "ghost";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: PrimaryButtonVariant;
};

function variantClassName(variant: PrimaryButtonVariant): string {
  switch (variant) {
    case "secondary":
      return "border border-[var(--line-strong)] bg-white text-[var(--text-primary)] hover:bg-slate-50";
    case "ghost":
      return "border border-transparent bg-transparent text-[var(--text-secondary)] hover:bg-slate-100";
    case "primary":
    default:
      return "border border-transparent bg-gradient-to-br from-[var(--brand-600)] to-[var(--brand-700)] text-white hover:from-[var(--brand-500)] hover:to-[var(--brand-600)]";
  }
}

const baseClassName =
  "inline-flex h-10 items-center justify-center rounded-[var(--radius-md)] px-4 text-sm font-semibold tracking-[0.01em] shadow-sm transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-300)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55";

export function PrimaryButton({ className, variant = "primary", ...props }: PrimaryButtonProps) {
  const mergedClassName = [baseClassName, variantClassName(variant), className].filter(Boolean).join(" ");
  return <button className={mergedClassName} {...props} />;
}
