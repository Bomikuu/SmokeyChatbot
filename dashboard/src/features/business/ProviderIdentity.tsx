import { Check, CircleAlert, CircleDashed, Cpu, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import openai from "@/assets/providers/openai.svg";
import anthropic from "@/assets/providers/claude.svg";
import gemini from "@/assets/providers/gemini.svg";
import openrouter from "@/assets/providers/openrouter.svg";
import {
  exampleCost,
  modelDetails,
  pricingCheckedAt,
  providerDetails,
  usd,
} from "./providerCatalog";
const marks: Record<string, string> = { openai, anthropic, gemini, openrouter };
export const ProviderIcon = ({
  provider,
  small = false,
}: {
  provider: string;
  small?: boolean;
}) => (
  <span
    className={`inline-flex shrink-0 items-center justify-center rounded-xl border border-border bg-white ${small ? "size-8" : "size-11"}`}
    aria-hidden="true"
  >
    {marks[provider] ? (
      <img src={marks[provider]} alt="" className={small ? "size-4" : "size-6"} />
    ) : (
      <Cpu className="size-5 text-slate-700" />
    )}
  </span>
);
export const ConnectionStatus = ({
  status,
  isDefault = false,
}: {
  status: string;
  isDefault?: boolean;
}) => {
  const ready = status === "ready";
  const pending = ["untested", "unchecked", "pending", "unverified"].includes(status);
  const Icon = ready ? Check : pending ? CircleDashed : CircleAlert;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        variant="outline"
        className={ready ? "smokey-status-ready gap-1.5" : "gap-1.5 text-muted-foreground"}
      >
        <Icon className="size-3" aria-hidden="true" />
        {ready ? "Connected" : pending ? "Needs verification" : "Needs attention"}
      </Badge>
      {isDefault && (
        <Badge variant="secondary" className="gap-1.5 text-primary">
          <ShieldCheck className="size-3" aria-hidden="true" />
          Default
        </Badge>
      )}
    </div>
  );
};
export const ModelPricing = ({
  provider,
  model,
  compact = false,
}: {
  provider: string;
  model: string;
  compact?: boolean;
}) => {
  const details = modelDetails(provider, model);
  const source = details?.source || providerDetails(provider)?.pricing;
  return (
    <div className="space-y-1.5 text-xs leading-5 text-muted-foreground">
      {details ? (
        <>
          <p className="tabular-nums">
            <span className="font-medium text-foreground">
              {usd(details.input)} input · {usd(details.output)} output
            </span>{" "}
            / 1M tokens (USD)
          </p>
          {!compact && (
            <p>
              Example: ≈{usd(exampleCost(details), 5)} per call with 1,000 input + 500 output
              tokens.
            </p>
          )}
        </>
      ) : (
        <p>Pricing unavailable here. Check this exact model’s rates with your provider.</p>
      )}
      {source && (
        <a
          className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-foreground"
          href={source}
          target="_blank"
          rel="noreferrer"
        >
          Provider pricing{details && !compact ? ` · checked ${pricingCheckedAt}` : ""}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </div>
  );
};
