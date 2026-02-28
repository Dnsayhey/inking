import { ComponentPropsWithoutRef } from "react";

type CardProps = ComponentPropsWithoutRef<"div">;

const baseClassName = "rounded-2xl border border-surface-line bg-white";

export function Card({ className, ...props }: CardProps) {
  const mergedClassName = className ? `${baseClassName} ${className}` : baseClassName;
  return <div className={mergedClassName} {...props} />;
}
