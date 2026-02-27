import { ComponentPropsWithoutRef, forwardRef } from "react";

type TextInputProps = ComponentPropsWithoutRef<"input">;

const baseClassName =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-600";

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className, ...props },
  ref,
) {
  const mergedClassName = className ? `${baseClassName} ${className}` : baseClassName;
  return <input ref={ref} className={mergedClassName} {...props} />;
});
