import { useState, type FormEvent } from "react";
import { Cat } from "lucide-react";
import { signIn, signUp, type Owner } from "@/api/auth";
import { Field } from "@/components/common/Field";
import { Notice } from "@/components/common/Notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/lib/errors";

interface AuthScreenProps {
  onLogin: (owner: Owner) => void;
}

export const AuthScreen = ({ onLogin }: AuthScreenProps) => {
  const [view, setView] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const verified = new URLSearchParams(window.location.search).get("verified");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (view === "signup") {
        const result = await signUp(email, password);
        setNotice(result.message);
        setView("login");
        setPassword("");
      } else {
        onLogin(await signIn(email, password));
      }
    } catch (issue) {
      setError(errorMessage(issue));
    } finally {
      setBusy(false);
    }
  };

  const switchView = () => {
    setView(view === "signup" ? "login" : "signup");
    setError("");
    setNotice("");
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
      <section className="flex flex-col justify-between bg-[#0b1733] p-8 text-white md:p-14">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg border border-white/20 bg-white/10">
            <Cat size={22} />
          </span>
          <span className="text-lg font-bold tracking-tight">SmokeyChatBot</span>
        </div>
        <div className="max-w-xl py-24">
          <p className="mb-5 text-xs font-bold uppercase tracking-[.2em] text-[#9bb9ff]">
            The website companion
          </p>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-.04em] md:text-6xl">
            Answers that belong to your website.
          </h1>
          <p className="mt-7 max-w-md text-lg leading-8 text-slate-300">
            Give your visitors a helpful guide. Use Smokey, bring your own mascot, or keep the chat
            simple.
          </p>
        </div>
        <p className="text-xs text-slate-400">A focused free beta for public website content.</p>
      </section>

      <section className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-md space-y-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.17em] text-[#2f5bff]">
              Owner dashboard
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-.04em]">
              {view === "signup" ? "Create your account" : "Welcome back"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {view === "signup"
                ? "Set up a site and add its knowledge in minutes."
                : "Manage your chatbot and website content."}
            </p>
          </div>

          {verified === "1" && <Notice message="Email verified. You can sign in now." />}
          {verified === "0" && (
            <Notice message="That verification link is invalid or expired." error />
          )}
          <Notice message={notice} />
          <Notice message={error} error />

          <form onSubmit={submit} className="space-y-5">
            <Field label="Email address">
              <Input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </Field>
            <Field
              label="Password"
              help={view === "signup" ? "Use at least 12 characters." : undefined}
            >
              <Input
                type="password"
                autoComplete={view === "signup" ? "new-password" : "current-password"}
                required
                minLength={view === "signup" ? 12 : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : view === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <p className="text-sm text-slate-500">
            {view === "signup" ? "Already have an account?" : "New to SmokeyChatBot?"}{" "}
            <button
              type="button"
              className="font-semibold text-[#2f5bff] hover:underline"
              onClick={switchView}
            >
              {view === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
};
