import { useState } from "react";
import { ImageOff, UserRound, Receipt } from "lucide-react";
export const ReportRecordImage = ({
  source,
  kind = "product",
}: {
  source?: unknown;
  kind?: string;
}) => {
  const src =
    typeof source === "string" && (/^https?:\/\//.test(source) || /^\/media\//.test(source))
      ? source
      : "";
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const Icon = kind === "employee" ? UserRound : kind === "order" ? Receipt : ImageOff;
  return (
    <span
      className={`flex size-9 shrink-0 items-center justify-center overflow-hidden border bg-muted text-muted-foreground ${kind === "employee" ? "rounded-full" : "rounded-md"}`}
    >
      {src && failedSource !== src ? (
        <img
          src={src}
          width={36}
          height={36}
          className="size-full object-cover"
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedSource(src)}
        />
      ) : (
        <Icon
          className="size-4"
          role="img"
          aria-label={`${kind === "employee" ? "Employee photo" : kind === "order" ? "Order image" : "Product image"} unavailable`}
        />
      )}
    </span>
  );
};
