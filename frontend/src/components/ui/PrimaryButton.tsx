import { ButtonHTMLAttributes } from "react";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

const baseClassName =
  "rounded-xl bg-gradient-to-br from-slate-900 to-blue-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-55";

export function PrimaryButton({ className, ...props }: PrimaryButtonProps) {
  const mergedClassName = className ? `${baseClassName} ${className}` : baseClassName;
  return <button className={mergedClassName} {...props} />;
}
