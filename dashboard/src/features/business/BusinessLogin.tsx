import { useState, type FormEvent } from "react";
import { Cat } from "lucide-react";
import { businessLogin, type BusinessOwner } from "@/api/business";
import { Field } from "@/components/common/Field";
import { Notice } from "@/components/common/Notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeSelect } from "@/features/theme/ThemeSelect";
import { errorMessage } from "@/lib/errors";
import { BusinessMascot } from "./BusinessFeedback";

export const BusinessLogin = ({
  onLogin,
  initialError = "",
}: {
  onLogin: (owner: BusinessOwner) => void;
  initialError?: string;
}) => {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(initialError);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter your email address and password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      onLogin(await businessLogin(email.trim(), password));
      setPassword("");
    } catch (issue) {
      setError(errorMessage(issue));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="flex flex-col justify-between bg-muted px-8 py-10 md:px-14">
        <a href="/" className="flex w-fit items-center gap-3 text-lg font-semibold">
          <Cat className="size-7 text-primary" />
          Smokey
        </a>
        <div className="max-w-lg py-14 lg:py-24">
          <BusinessMascot />
          <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            A clearer picture of your business.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
            Ask about attendance, late arrivals, and daily totals. Choose your AI, make Smokey your
            own, and keep every report close.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">Your business records. Your AI connection.</p>
      </section>
      <section className="relative flex items-center justify-center px-6 py-14">
        <div className="absolute right-5 top-5">
          <ThemeSelect />
        </div>
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Sign in to Smokey</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Use your connected business account to manage your assistant.
            </p>
          </div>
          <Notice message={error} error />
          <form noValidate onSubmit={submit} className="space-y-5">
            <Field label="Email or username">
              <Input
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={busy}
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={busy}
              />
            </Field>
            {busy && <BusinessMascot state="searching" text="Signing you in…" />}
            <Button className="w-full" type="submit" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="border-t pt-5 text-sm leading-6 text-muted-foreground">
            Managing a public website chatbot?{" "}
            <a className="font-medium text-primary underline underline-offset-4" href="/websites">
              Open website management
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
};
