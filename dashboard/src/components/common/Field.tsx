import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface FieldProps {
  label: string;
  help?: string;
  children: ReactNode;
}

export const Field = ({ label, help, children }: FieldProps) => {
  const id = useId();
  const isControl =
    isValidElement(children) &&
    (children.type === Input ||
      children.type === Textarea ||
      children.type === "select" ||
      children.type === "input");

  return (
    <div>
      {isControl ? (
        <label htmlFor={id}>{label}</label>
      ) : (
        <p className="mb-[7px] text-[13px] font-semibold text-[#334155]">{label}</p>
      )}
      {isControl ? cloneElement(children as ReactElement<{ id?: string }>, { id }) : children}
      {help && <p className="field-help">{help}</p>}
    </div>
  );
};
