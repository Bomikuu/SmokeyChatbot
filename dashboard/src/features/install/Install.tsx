import { useState } from "react";
import { Notice } from "@/components/common/Notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { publicApiUrl } from "@/lib/config";
import type { Site } from "@/types/site";

export const Install = ({ site }: { site: Site }) => {
  const [copied, setCopied] = useState("");
  const script = `<script src="${publicApiUrl}/api/widget/script" data-site-id="${site.id}" data-api-base-url="${publicApiUrl}" defer></script>`;
  const npm = `npm install /path/to/SmokeyChatBot/widget\n\nimport { mountSmokeyChatBot } from "smokeychatbot-widget";\n\nmountSmokeyChatBot({\n  siteId: "${site.id}",\n  apiBaseUrl: "${publicApiUrl}",\n});`;

  const copy = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(successMessage);
    } catch {
      setCopied("Copy failed; select the text instead.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Install SmokeyChatBot</CardTitle>
        <p className="text-sm text-slate-500">
          The widget mounts into your page directly. It does not use an embed or iframe.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-[#2149dc]">
          First add your website origin in Site settings. Serve this website over HTTPS in
          production.
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Plain HTML</h3>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                void copy(script, "HTML copied");
              }}
            >
              Copy
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-[#0b1733] p-4 text-xs leading-6 text-white">
            <code>{script}</code>
          </pre>
          <p className="field-help">Place the script before your closing body tag.</p>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">npm / JavaScript</h3>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                void copy(npm, "npm example copied");
              }}
            >
              Copy
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-[#0b1733] p-4 text-xs leading-6 text-white">
            <code>{npm}</code>
          </pre>
        </div>
        <Notice message={copied} />
        <p className="text-xs text-slate-500">
          Replace the local package path with a Git package URL when you publish this repository.
        </p>
      </CardContent>
    </Card>
  );
};
