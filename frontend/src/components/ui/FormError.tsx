import { ReactNode } from "react";

type FormErrorProps = {
  children: ReactNode;
};

export function FormError({ children }: FormErrorProps) {
  return <p className="text-sm font-semibold text-red-700">{children}</p>;
}
