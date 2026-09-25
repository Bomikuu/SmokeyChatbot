import { useEffect, useState } from "react";
import { getUsage } from "@/api/sites";
import { Notice } from "@/components/common/Notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { errorMessage } from "@/lib/errors";
import type { Site, Usage } from "@/types/site";

export const Overview = ({ site }: { site: Site }) => {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    getUsage(site.id)
      .then((result) => {
        if (live) setUsage(result);
      })
      .catch((issue: unknown) => {
        if (live) setError(errorMessage(issue));
      });
    return () => {
      live = false;
    };
  }, [site.id]);

  const stats = [
    { label: "Today", value: usage?.today, detail: `of ${usage?.dailyLimit ?? "—"} site requests` },
    {
      label: "All your sites today",
      value: usage?.ownerToday,
      detail: `of ${usage?.ownerDailyLimit ?? "—"} owner requests`,
    },
    {
      label: "Last 30 days",
      value: usage?.last30Days?.requests,
      detail: "visitor questions answered or declined",
    },
    {
      label: "Answer mode",
      value: site.mode,
      detail: site.mode === "general" ? "Broad answers, no live web" : "Answers from your sources",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {stat.label}
              </p>
              <p className="mt-3 text-3xl font-semibold capitalize">{stat.value ?? "—"}</p>
              <p className="mt-1 text-xs text-slate-500">{stat.detail}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Notice message={error} error />
      <Card>
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-slate-600">
            <li>1. Add your website’s exact origin in Site settings.</li>
            <li>2. Upload public documents or paste content in Knowledge.</li>
            <li>3. Choose your launcher in Appearance.</li>
            <li>4. Copy the installation snippet into your website.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};
