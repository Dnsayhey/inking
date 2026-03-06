import { ComponentPropsWithoutRef, forwardRef } from "react";

type TextInputProps = ComponentPropsWithoutRef<"input"> & {
  invalid?: boolean;
};

const baseClassName =
  "h-10 w-full rounded-[var(--radius-md)] border bg-white px-3 text-sm text-[var(--text-primary)] shadow-sm outline-none transition placeholder:text-[var(--text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--brand-300)]";

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className, invalid = false, ...props },
  ref,
) {
  const stateClassName = invalid
    ? "border-rose-300 focus:border-rose-400 focus-visible:ring-rose-200"
    : "border-[var(--line-strong)] focus:border-[var(--brand-500)]";
  const mergedClassName = [baseClassName, stateClassName, className].filter(Boolean).join(" ");
  return <input ref={ref} className={mergedClassName} {...props} />;
});
