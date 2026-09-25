import React, { useEffect, useState } from "react";
import { Cat, ChevronRight, Code2, Database, FileText, ImagePlus, LayoutDashboard, LogOut, MessageSquare, Plus, RefreshCw, Settings2, Trash2, Upload } from "lucide-react";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";

let csrfToken = "";
const publicApiUrl = (import.meta.env.VITE_PUBLIC_API_URL || "http://localhost:8000").replace(/\/$/, "");

async function api(path, options = {}) {
  const method = options.method || "GET";
  if (method !== "GET" && !csrfToken) {
    const csrfResponse = await fetch("/api/auth/csrf", { credentials: "include" });
    csrfToken = (await csrfResponse.json()).csrfToken;
  }
  const headers = { ...(options.headers || {}) };
  if (method !== "GET") headers["X-CSRFToken"] = csrfToken;
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const response = await fetch(`/api${path}`, { credentials: "include", ...options, headers });
  let data;
  try { data = await response.json(); } catch { data = {}; }
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  if (path === "/auth/login" || path === "/auth/logout") csrfToken = "";
  return data;
}

function Field({ label, help, children }) {
  const id = React.useId();
  const directControl = React.isValidElement(children) && (children.type === Input || children.type === Textarea || children.type === "select" || children.type === "input");
  return <div>{directControl ? <label htmlFor={id}>{label}</label> : <p className="mb-[7px] text-[13px] font-semibold text-[#334155]">{label}</p>}{directControl ? React.cloneElement(children, { id }) : children}{help && <p className="field-help">{help}</p>}</div>;
}

function Notice({ message, error = false }) {
  if (!message) return null;
  return <p role={error ? "alert" : "status"} className={`rounded-md border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-[#2149dc]"}`}>{message}</p>;
}

function AuthScreen({ onLogin }) {
  const [view, setView] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const verified = new URLSearchParams(window.location.search).get("verified");

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      if (view === "signup") {
        const result = await api("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) });
        setNotice(result.message);
        setView("login");
        setPassword("");
      } else {
        const result = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
        onLogin(result);
      }
    } catch (issue) { setError(issue.message); }
    finally { setBusy(false); }
  }

  return <main className="grid min-h-screen lg:grid-cols-[1.05fr_.95fr]">
    <section className="flex flex-col justify-between bg-[#0b1733] p-8 text-white md:p-14">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg border border-white/20 bg-white/10"><Cat size={22} /></span><span className="text-lg font-bold tracking-tight">SmokeyChatBot</span></div>
      <div className="max-w-xl py-24"><p className="mb-5 text-xs font-bold uppercase tracking-[.2em] text-[#9bb9ff]">The website companion</p><h1 className="text-5xl font-semibold leading-[1.05] tracking-[-.05em] md:text-6xl">Answers that belong to your website.</h1><p className="mt-7 max-w-md text-lg leading-8 text-slate-300">Give your visitors a helpful guide. Use Smokey, bring your own mascot, or keep the chat simple.</p></div>
      <p className="text-xs text-slate-400">A focused free beta for public website content.</p>
    </section>
    <section className="flex items-center justify-center px-6 py-14"><div className="w-full max-w-md space-y-7">
      <div><p className="text-xs font-bold uppercase tracking-[.17em] text-[#2f5bff]">Owner dashboard</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.04em]">{view === "signup" ? "Create your account" : "Welcome back"}</h2><p className="mt-2 text-sm text-slate-500">{view === "signup" ? "Set up a site and add its knowledge in minutes." : "Manage your chatbot and website content."}</p></div>
      {verified === "1" && <Notice message="Email verified. You can sign in now." />}
      {verified === "0" && <Notice message="That verification link is invalid or expired." error />}
      <Notice message={notice} /><Notice message={error} error />
      <form onSubmit={submit} className="space-y-5"><Field label="Email address"><Input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></Field><Field label="Password" help={view === "signup" ? "Use at least 12 characters." : undefined}><Input type="password" autoComplete={view === "signup" ? "new-password" : "current-password"} required minLength={view === "signup" ? 12 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} /></Field><Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : view === "signup" ? "Create account" : "Sign in"}</Button></form>
      <p className="text-sm text-slate-500">{view === "signup" ? "Already have an account?" : "New to SmokeyChatBot?"} <button type="button" className="font-semibold text-[#2f5bff] hover:underline" onClick={() => { setView(view === "signup" ? "login" : "signup"); setError(""); setNotice(""); }}>{view === "signup" ? "Sign in" : "Create an account"}</button></p>
    </div></section>
  </main>;
}

const tabs = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "settings", label: "Site settings", Icon: Settings2 },
  { id: "appearance", label: "Appearance", Icon: Cat },
  { id: "knowledge", label: "Knowledge", Icon: Database },
  { id: "install", label: "Install", Icon: Code2 },
];

function Overview({ site }) {
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { let live = true; api(`/owner/sites/${site.id}/usage`).then((result) => { if (live) setUsage(result); }).catch((issue) => { if (live) setError(issue.message); }); return () => { live = false; }; }, [site.id]);
  return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
    <Card><CardContent><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Today</p><p className="mt-3 text-3xl font-semibold">{usage?.today ?? "—"}</p><p className="mt-1 text-xs text-slate-500">of {usage?.dailyLimit ?? "—"} site requests</p></CardContent></Card>
    <Card><CardContent><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">All your sites today</p><p className="mt-3 text-3xl font-semibold">{usage?.ownerToday ?? "—"}</p><p className="mt-1 text-xs text-slate-500">of {usage?.ownerDailyLimit ?? "—"} owner requests</p></CardContent></Card>
    <Card><CardContent><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Last 30 days</p><p className="mt-3 text-3xl font-semibold">{usage?.last30Days?.requests ?? "—"}</p><p className="mt-1 text-xs text-slate-500">visitor questions answered or declined</p></CardContent></Card>
    <Card><CardContent><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Answer mode</p><p className="mt-3 text-2xl font-semibold capitalize">{site.mode}</p><p className="mt-1 text-xs text-slate-500">{site.mode === "general" ? "Broad answers, no live web" : "Answers from your sources"}</p></CardContent></Card>
  </div><Notice message={error} error /><Card><CardHeader><CardTitle>Getting started</CardTitle></CardHeader><CardContent><ol className="space-y-3 text-sm text-slate-600"><li>1. Add your website’s exact origin in Site settings.</li><li>2. Upload public documents or paste content in Knowledge.</li><li>3. Choose your launcher in Appearance.</li><li>4. Copy the installation snippet into your website.</li></ol></CardContent></Card></div>;
}

function SiteSettings({ site, onSave, onDelete }) {
  const [name, setName] = useState(site.name);
  const [mode, setMode] = useState(site.mode);
  const [origins, setOrigins] = useState(site.allowedOrigins.join("\n"));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { await onSave({ name, mode, allowedOrigins: origins.split(/\r?\n/).map((item) => item.trim()).filter(Boolean) }); setNotice("Site settings saved."); }
    catch (issue) { setError(issue.message); }
    finally { setBusy(false); }
  }

  return <div className="space-y-6"><Card><CardHeader><CardTitle>Site settings</CardTitle><p className="text-sm text-slate-500">Choose what Smokey answers and where the widget can run.</p></CardHeader><CardContent><form className="space-y-6" onSubmit={submit}>
    <Field label="Site name"><Input value={name} maxLength={100} required onChange={(event) => setName(event.target.value)} /></Field>
    <Field label="Answer mode" help="Portfolio and store modes answer only from approved sources. General mode answers broad questions without live browsing."><select value={mode} onChange={(event) => setMode(event.target.value)}><option value="portfolio">Portfolio</option><option value="store">Store</option><option value="general">General</option></select></Field>
    <Field label="Allowed website origins" help="One origin per line, such as https://example.com. Include the protocol and any port. HTTP is allowed only for localhost."><Textarea value={origins} onChange={(event) => setOrigins(event.target.value)} placeholder="https://example.com" /></Field>
    <Notice message={notice} /><Notice message={error} error /><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
  </form></CardContent></Card><Card className="border-red-200"><CardHeader><CardTitle>Delete this site</CardTitle></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-4"><p className="max-w-lg text-sm text-slate-500">Removes the chatbot, uploaded sources, mascot asset, and its indexed knowledge. This cannot be undone.</p><Button type="button" variant="destructive" onClick={onDelete}><Trash2 size={15} /> Delete site</Button></CardContent></Card></div>;
}

const frameNames = ["idle", "walk1", "walk2", "speak", "sleep"];
function Appearance({ site, onSave }) {
  const [mode, setMode] = useState(site.mascotMode);
  const [assetType, setAssetType] = useState(site.customAssetType);
  const [accent, setAccent] = useState(site.accentColor);
  const [roaming, setRoaming] = useState(site.roaming);
  const [columns, setColumns] = useState(site.spriteColumns);
  const [rows, setRows] = useState(site.spriteRows);
  const [frames, setFrames] = useState(site.spriteFrames || {});
  const [hasAsset, setHasAsset] = useState(site.hasCustomAsset);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [assetVersion, setAssetVersion] = useState(0);

  async function save(event) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { await onSave({ mascotMode: mode, customAssetType: assetType, accentColor: accent, roaming, spriteColumns: Number(columns), spriteRows: Number(rows), spriteFrames: frames }); setNotice("Appearance saved."); }
    catch (issue) { setError(issue.message); }
    finally { setBusy(false); }
  }
  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true); setError(""); setNotice("");
    try { const body = new FormData(); body.append("file", file); await api(`/owner/sites/${site.id}/asset`, { method: "POST", body }); setHasAsset(true); setAssetVersion((value) => value + 1); setNotice("Mascot image uploaded."); }
    catch (issue) { setError(issue.message); }
    finally { setBusy(false); event.target.value = ""; }
  }
  async function removeAsset() {
    setBusy(true); setError("");
    try { await api(`/owner/sites/${site.id}/asset`, { method: "DELETE" }); setHasAsset(false); setNotice("Custom image removed."); }
    catch (issue) { setError(issue.message); }
    finally { setBusy(false); }
  }
  function setFrame(name, axis, value) {
    setFrames((current) => ({ ...current, [name]: axis === 0 ? [Number(value), current[name]?.[1] ?? 0] : [current[name]?.[0] ?? 0, Number(value)] }));
  }

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"><Card><CardHeader><CardTitle>Appearance</CardTitle><p className="text-sm text-slate-500">Keep Smokey, bring your own mascot, or use a standard chat button.</p></CardHeader><CardContent className="space-y-6"><form onSubmit={save} className="space-y-6">
    <Field label="Launcher"><div className="grid gap-2 sm:grid-cols-3">{[["smokey", "Smokey"], ["custom", "Custom mascot"], ["standard", "Standard chat"]].map(([value, label]) => <button key={value} type="button" onClick={() => setMode(value)} aria-pressed={mode === value} className={`rounded-lg border px-3 py-4 text-left text-sm font-semibold transition ${mode === value ? "border-[#2f5bff] bg-[#eff6ff] text-[#2149dc]" : "border-[#dce4ef] bg-white text-slate-600 hover:border-slate-400"}`}>{label}</button>)}</div></Field>
    <div className="grid gap-5 sm:grid-cols-2"><Field label="Accent color"><div className="flex items-center gap-2"><Input type="color" aria-label="Choose accent color" value={accent} onChange={(event) => setAccent(event.target.value)} className="h-10 w-14 cursor-pointer p-1" /><Input aria-label="Accent color hex value" value={accent} onChange={(event) => setAccent(event.target.value)} maxLength={7} className="mono" /></div></Field><Field label="Desktop movement" help="Mobile visitors get a stationary launcher."><label className="flex h-10 items-center gap-3 text-sm font-normal"><input type="checkbox" checked={roaming} onChange={(event) => setRoaming(event.target.checked)} className="size-4 accent-[#2f5bff]" /> Allow mascot to roam</label></Field></div>
    {mode === "custom" && <div className="space-y-5 rounded-lg border border-[#dce4ef] bg-[#f8fafc] p-5"><Field label="Custom image type"><select value={assetType} onChange={(event) => setAssetType(event.target.value)}><option value="static">Static image</option><option value="sprite">Animated sprite sheet</option></select></Field>{assetType === "sprite" && <><div className="grid grid-cols-2 gap-4"><Field label="Columns"><Input type="number" min="1" max="16" value={columns} onChange={(event) => setColumns(event.target.value)} /></Field><Field label="Rows"><Input type="number" min="1" max="16" value={rows} onChange={(event) => setRows(event.target.value)} /></Field></div><p className="text-xs text-slate-500">Frame positions start at 0 in the top-left corner. Set walking frames for animation.</p><div className="grid gap-3">{frameNames.map((name) => <div key={name} className="grid grid-cols-[1fr_70px_70px] items-center gap-3"><span className="text-sm capitalize">{name}</span><Input type="number" min="0" max={Math.max(0, Number(columns) - 1)} aria-label={`${name} column`} value={frames[name]?.[0] ?? 0} onChange={(event) => setFrame(name, 0, event.target.value)} /><Input type="number" min="0" max={Math.max(0, Number(rows) - 1)} aria-label={`${name} row`} value={frames[name]?.[1] ?? 0} onChange={(event) => setFrame(name, 1, event.target.value)} /></div>)}</div></>}</div>}
    <Notice message={notice} /><Notice message={error} error /><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save appearance"}</Button>
  </form>{mode === "custom" && <div className="space-y-3 border-t border-[#e2e8f0] pt-6"><p className="text-sm font-semibold">Mascot image</p><p className="text-xs text-slate-500">Upload a public PNG or WebP image under 5 MB. For sprite sheets, each grid cell should be the same size.</p><div className="flex flex-wrap items-center gap-3"><label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-[#cbd5e1] bg-white px-4 text-sm font-semibold hover:bg-slate-50"><ImagePlus size={16} /> Upload image<input type="file" accept="image/png,image/webp" className="sr-only" onChange={upload} disabled={busy} /></label>{hasAsset && <Button type="button" variant="outline" onClick={removeAsset} disabled={busy}>Remove image</Button>}</div></div>}</CardContent></Card>
  <Card className="self-start"><CardHeader><CardTitle>Preview</CardTitle></CardHeader><CardContent><div className="relative flex h-80 items-end justify-end overflow-hidden rounded-lg border border-[#dce4ef] bg-[#eef3fa] p-5"><div className="absolute left-5 top-5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">Your website</div>{mode === "standard" ? <div style={{ backgroundColor: accent }} className="grid size-14 place-items-center rounded-2xl text-white"><MessageSquare size={24} /></div> : mode === "smokey" ? <div role="img" aria-label="Smokey preview" className="h-32 w-24 bg-no-repeat [image-rendering:pixelated]" style={{ backgroundImage: `url(${publicApiUrl}/api/widget/default-asset)`, backgroundSize: "400% 200%", backgroundPosition: "0 0" }} /> : hasAsset && assetType === "sprite" ? <div role="img" aria-label="Custom sprite preview" className="h-28 w-28 bg-no-repeat [image-rendering:pixelated]" style={{ backgroundImage: `url(/api/owner/sites/${site.id}/asset?v=${assetVersion})`, backgroundSize: `${Number(columns) * 100}% ${Number(rows) * 100}%`, backgroundPosition: `${Number(columns) > 1 ? (frames.idle?.[0] || 0) * 100 / (Number(columns) - 1) : 0}% ${Number(rows) > 1 ? (frames.idle?.[1] || 0) * 100 / (Number(rows) - 1) : 0}%` }} /> : hasAsset ? <img key={assetVersion} src={`/api/owner/sites/${site.id}/asset?v=${assetVersion}`} alt="Custom mascot preview" className="max-h-28 max-w-28 object-contain" /> : <div className="grid size-24 place-items-center rounded-lg border border-dashed border-slate-300 bg-white text-xs text-slate-400">Upload image</div>}</div><p className="mt-3 text-xs text-slate-500">The live widget adapts its size and position to each visitor’s screen.</p></CardContent></Card></div>;
}

function Knowledge({ site }) {
  const [sources, setSources] = useState([]);
  const [mode, setMode] = useState("text");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function load() { const result = await api(`/owner/sites/${site.id}/sources`); setSources(result.sources); }
  useEffect(() => { load().catch((issue) => setError(issue.message)); }, [site.id]);

  async function add(event) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      let payload;
      if (mode === "file") { payload = new FormData(); payload.append("file", file); if (title.trim()) payload.append("title", title.trim()); }
      else payload = JSON.stringify({ title: title.trim(), body: body.trim() });
      const result = await api(`/owner/sites/${site.id}/sources`, { method: "POST", body: payload });
      setSources((current) => [result.source, ...current]);
      setTitle(""); setBody(""); setFile(null);
      setNotice(result.source.status === "error" ? "Source saved, but indexing failed. Retry from the list below." : "Source added. Indexing may take a moment.");
    } catch (issue) { setError(issue.message); }
    finally { setBusy(false); }
  }
  async function action(source, method) {
    if (method === "DELETE" && !window.confirm(`Delete “${source.title}” and its indexed content?`)) return;
    setError(""); setNotice("");
    try { await api(`/owner/sites/${site.id}/sources/${source.id}`, { method }); await load(); setNotice(method === "DELETE" ? "Source deleted." : "Indexing retried."); }
    catch (issue) { setError(issue.message); }
  }

  return <div className="space-y-6"><Card><CardHeader><CardTitle>Add knowledge</CardTitle><p className="text-sm text-slate-500">Add only information you want website visitors to see. Portfolio and store answers use these sources.</p></CardHeader><CardContent><form onSubmit={add} className="space-y-5"><div className="flex gap-2"><Button type="button" variant={mode === "text" ? "default" : "outline"} size="sm" onClick={() => setMode("text")}>Paste text</Button><Button type="button" variant={mode === "file" ? "default" : "outline"} size="sm" onClick={() => setMode("file")}>Upload file</Button></div><Field label="Source title"><Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required={mode === "text"} placeholder={mode === "file" ? "Optional — defaults to filename" : "About my work"} /></Field>{mode === "text" ? <Field label="Content" help="Up to 50,000 characters."><Textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={50000} required placeholder="Write the facts visitors may ask about…" /></Field> : <Field label="Document" help="PDF, TXT, or Markdown, up to 10 MB."><Input type="file" accept=".pdf,.txt,.md" required onChange={(event) => setFile(event.target.files?.[0] || null)} /></Field>}<Notice message={notice} /><Notice message={error} error /><Button type="submit" disabled={busy || (mode === "file" && !file)}><Upload size={16} />{busy ? "Adding…" : "Add source"}</Button></form></CardContent></Card>
    <Card><CardHeader className="flex-row items-center justify-between"><div><CardTitle>Sources</CardTitle><p className="mt-1 text-sm text-slate-500">{sources.length} of 25 allowed in the free beta</p></div><Button type="button" variant="ghost" size="icon" aria-label="Refresh source statuses" onClick={() => load().catch((issue) => setError(issue.message))}><RefreshCw size={17} /></Button></CardHeader><CardContent>{sources.length ? <ul className="divide-y divide-slate-100">{sources.map((source) => <li key={source.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="flex min-w-0 items-start gap-3"><FileText size={18} className="mt-0.5 shrink-0 text-[#2f5bff]" /><div className="min-w-0"><p className="truncate text-sm font-semibold">{source.title}</p><p className="mt-1 text-xs text-slate-500">{source.kind} · {source.status}</p>{source.error && <p className="mt-1 text-xs text-red-700">{source.error}</p>}</div></div><div className="flex gap-2">{source.status === "error" && <Button type="button" variant="outline" size="sm" onClick={() => action(source, "POST")}>Retry</Button>}<Button type="button" variant="ghost" size="icon" aria-label={`Delete ${source.title}`} onClick={() => action(source, "DELETE")}><Trash2 size={16} /></Button></div></li>)}</ul> : <p className="py-8 text-center text-sm text-slate-500">No sources yet. Add one above to teach this chatbot about your site.</p>}</CardContent></Card></div>;
}

function Install({ site }) {
  const [copied, setCopied] = useState("");
  const script = `<script src="${publicApiUrl}/api/widget/script" data-site-id="${site.id}" data-api-base-url="${publicApiUrl}" defer></script>`;
  const npm = `npm install /path/to/SmokeyChatBot/widget\n\nimport { mountSmokeyChatBot } from "smokeychatbot-widget";\n\nmountSmokeyChatBot({\n  siteId: "${site.id}",\n  apiBaseUrl: "${publicApiUrl}",\n});`;
  async function copy(value, type) { try { await navigator.clipboard.writeText(value); setCopied(type); } catch { setCopied("Copy failed; select the text instead."); } }
  return <div className="space-y-6"><Card><CardHeader><CardTitle>Install SmokeyChatBot</CardTitle><p className="text-sm text-slate-500">The widget mounts into your page directly. It does not use an embed or iframe.</p></CardHeader><CardContent className="space-y-5"><div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-[#2149dc]">First add your website origin in Site settings. Serve this website over HTTPS in production.</div><div><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">Plain HTML</h3><Button type="button" size="sm" variant="outline" onClick={() => copy(script, "HTML copied")}>Copy</Button></div><pre className="overflow-x-auto rounded-lg bg-[#0b1733] p-4 text-xs leading-6 text-white"><code>{script}</code></pre><p className="field-help">Place the script before your closing body tag.</p></div><div><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold">npm / JavaScript</h3><Button type="button" size="sm" variant="outline" onClick={() => copy(npm, "npm example copied")}>Copy</Button></div><pre className="overflow-x-auto rounded-lg bg-[#0b1733] p-4 text-xs leading-6 text-white"><code>{npm}</code></pre></div><Notice message={copied} /><p className="text-xs text-slate-500">Replace the local package path with a Git package URL when you publish this repository.</p></CardContent></Card></div>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [sites, setSites] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [tab, setTab] = useState("overview");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const site = sites.find((item) => item.id === selectedId) || null;

  async function loadSites() {
    const result = await api("/owner/sites");
    setSites(result.sites);
    setSelectedId((current) => current && result.sites.some((item) => item.id === current) ? current : result.sites[0]?.id || null);
  }
  useEffect(() => {
    api("/auth/me").then(async (result) => { setUser(result); await loadSites(); }).catch(() => {}).finally(() => setChecking(false));
  }, []);
  async function loggedIn(result) { setUser(result); try { await loadSites(); } catch (issue) { setError(issue.message); } }
  async function createSite(event) {
    event.preventDefault(); setCreating(true); setError("");
    try { const result = await api("/owner/sites", { method: "POST", body: JSON.stringify({ name: newName }) }); setSites((current) => [result.site, ...current]); setSelectedId(result.site.id); setNewName(""); setTab("settings"); }
    catch (issue) { setError(issue.message); }
    finally { setCreating(false); }
  }
  async function saveSite(fields) {
    const result = await api(`/owner/sites/${site.id}`, { method: "PATCH", body: JSON.stringify(fields) });
    setSites((current) => current.map((item) => item.id === result.site.id ? result.site : item));
    return result.site;
  }
  async function deleteSite() {
    if (!window.confirm(`Delete “${site.name}” and all of its knowledge? This cannot be undone.`)) return;
    try { await api(`/owner/sites/${site.id}`, { method: "DELETE" }); const remaining = sites.filter((item) => item.id !== site.id); setSites(remaining); setSelectedId(remaining[0]?.id || null); setTab("overview"); }
    catch (issue) { setError(issue.message); }
  }
  async function signOut() { try { await api("/auth/logout", { method: "POST" }); } finally { setUser(null); setSites([]); setSelectedId(null); } }

  if (checking) return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading SmokeyChatBot…</div>;
  if (!user) return <AuthScreen onLogin={loggedIn} />;
  return <div className="min-h-screen lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
    <aside className="border-b border-[#dce4ef] bg-white lg:min-h-screen lg:border-b-0 lg:border-r"><div className="flex items-center gap-3 border-b border-[#edf1f5] px-6 py-5"><span className="grid size-9 place-items-center rounded-lg bg-[#2f5bff] text-white"><Cat size={20} /></span><span className="text-base font-bold tracking-tight">SmokeyChatBot</span></div><div className="p-4"><p className="px-2 text-[11px] font-bold uppercase tracking-[.15em] text-slate-400">Your sites</p><div className="mt-3 space-y-1">{sites.map((item) => <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setTab("overview"); setError(""); }} className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${selectedId === item.id ? "bg-[#eff6ff] font-semibold text-[#2149dc]" : "text-slate-600 hover:bg-slate-100"}`}><span className="truncate">{item.name}</span><ChevronRight size={15} /></button>)}</div><form onSubmit={createSite} className="mt-5 space-y-2"><label htmlFor="new-site" className="sr-only">New site name</label><Input id="new-site" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="New site name" maxLength={100} required /><Button type="submit" variant="outline" size="sm" className="w-full" disabled={creating || sites.length >= 5}><Plus size={15} /> Add site</Button></form></div><div className="mt-6 border-t border-[#edf1f5] p-4 lg:mt-16"><p className="truncate px-2 text-xs text-slate-500" title={user.email}>{user.email}</p><Button type="button" variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={signOut}><LogOut size={15} /> Sign out</Button></div></aside>
    <main className="min-w-0 px-5 py-7 md:px-10 md:py-9"><div className="mx-auto max-w-6xl"><Notice message={error} error />{site ? <><div className="mb-8 flex flex-wrap items-end justify-between gap-3"><div><div className="mb-2 flex items-center gap-2"><Badge>Site</Badge><span className="text-xs capitalize text-slate-500">{site.mode} mode</span></div><h1 className="text-3xl font-semibold tracking-[-.04em] md:text-4xl">{site.name}</h1><p className="mt-2 text-sm text-slate-500">Configure the website companion your visitors will meet.</p></div><span className="mono break-all text-xs text-slate-400">{site.id}</span></div><nav aria-label="Site sections" className="mb-7 flex gap-1 overflow-x-auto border-b border-[#dce4ef]">{tabs.map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => { setTab(id); setError(""); }} aria-current={tab === id ? "page" : undefined} className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium ${tab === id ? "border-[#2f5bff] text-[#2149dc]" : "border-transparent text-slate-500 hover:text-slate-900"}`}><Icon size={16} />{label}</button>)}</nav>{tab === "overview" && <Overview key={site.id} site={site} />}{tab === "settings" && <SiteSettings key={site.id} site={site} onSave={saveSite} onDelete={deleteSite} />}{tab === "appearance" && <Appearance key={site.id} site={site} onSave={saveSite} />}{tab === "knowledge" && <Knowledge key={site.id} site={site} />}{tab === "install" && <Install key={site.id} site={site} />}</> : <div className="flex min-h-[70vh] items-center justify-center"><div className="max-w-md text-center"><span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#eff6ff] text-[#2f5bff]"><MessageSquare size={30} /></span><h1 className="mt-5 text-3xl font-semibold tracking-tight">Create your first chatbot</h1><p className="mt-3 text-sm leading-6 text-slate-500">Give it a site name in the sidebar, then add public information it can answer from.</p></div></div>}</div></main>
  </div>;
}
