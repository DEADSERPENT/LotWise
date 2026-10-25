import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api, type User } from "../../shared/lib/api";
import { Alert, CarIcon, Field, btn } from "../../shared/ui";
import { useSession } from "./AuthProvider";

export function AuthForm() {
  const { signIn } = useSession();
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mismatch, setMismatch] = useState(false);

  const auth = useMutation({
    mutationFn: () => api<{ user: User; accessToken: string }>(`/auth/${register ? "register" : "login"}`, "POST", { email, password }),
    onSuccess: (res) => signIn(res.user, res.accessToken),
    onError: () => setPassword(""),
  });

  const submit = () => {
    const bad = register && password !== confirm;
    setMismatch(bad);
    if (!bad) auth.mutate();
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative flex flex-col justify-between overflow-hidden bg-ink bg-[radial-gradient(90%_55%_at_0%_0%,rgb(217_72_15/0.35),transparent_65%)] p-8 text-[#f6f3ec] lg:p-14">
        <span className="relative z-10 text-3xl font-extrabold tracking-tight">Lot<span className="logo-slash text-accent">/</span>wise</span>
        <span aria-hidden className="orb pointer-events-none absolute -right-24 top-1/3 size-80 rounded-full bg-accent/25 blur-3xl" />
        <div className="relative py-12">
          <h1 className="rise max-w-xl text-5xl leading-[1.05] font-extrabold tracking-tight lg:text-6xl">
            Every unit, <span className="text-accent">on the record.</span>
          </h1>
          <p className="rise mt-5 max-w-md text-lg text-[#f6f3ec]/70 [animation-delay:150ms]">
            Know exactly which cars you have, who sold what, and when. Stock can never go negative, and every purchase and restock is recorded.
          </p>
        </div>
        <div aria-hidden className="relative -mx-8 h-20 lg:-mx-14">
          <CarIcon category="SEDAN" className="drive absolute bottom-0.5 h-14 w-32 text-[#f6f3ec]" />
          <div className="road absolute inset-x-0 bottom-0 h-0.5" />
        </div>
      </aside>

      <main className="flex items-center justify-center p-6">
        <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="rise w-full max-w-sm space-y-5 [animation-delay:250ms]" aria-label={register ? "Create account" : "Sign in"}>
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">{register ? "Create your account" : "Welcome back"}</h2>
            <p className="mt-1 text-muted">{register ? "New accounts get staff access." : "Sign in to the inventory desk."}</p>
          </div>
          <Field label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Password" type="password" required minLength={register ? 8 : undefined} autoComplete={register ? "new-password" : "current-password"}
            value={password} onChange={(e) => setPassword(e.target.value)} />
          {register && <Field label="Confirm password" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
          <Alert>{mismatch ? "Passwords do not match." : auth.error?.message}</Alert>
          <button className={`${btn} h-11 w-full`} disabled={auth.isPending} aria-busy={auth.isPending}>{register ? "Create account" : "Sign in"}</button>
          <button type="button" className="text-sm font-medium text-muted underline underline-offset-4 hover:text-fg" onClick={() => setRegister(!register)}>
            {register ? "Have an account? Sign in" : "New here? Create an account"}
          </button>
        </form>
      </main>
    </div>
  );
}
