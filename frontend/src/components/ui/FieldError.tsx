import { ReactNode } from "react";

type FieldErrorProps = {
  children: ReactNode;
};

export function FieldError({ children }: FieldErrorProps) {
  return <p className="mt-0.5 text-xs text-red-600">{children}</p>;
}
