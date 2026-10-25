import type { InputHTMLAttributes } from "react";

export const btn = "btn";
export const btn2 = "btn alt";

export function Field({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="label">
      {label}
      <input {...props} className="input" />
    </label>
  );
}

export const Alert = ({ children }: { children?: string | null }) =>
  children ? <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm font-medium text-danger">{children}</p> : null;
