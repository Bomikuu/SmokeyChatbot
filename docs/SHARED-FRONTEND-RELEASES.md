# Frontend releases and rollback

A Git edit changes local source. Production hosts receive UI changes only after a
compatible frontend artifact is built, deployed and selected. Already-open
workspaces keep their loaded module until reload; a channel update never swaps an
active controller or repeats a generation.

## Release gate

The commands below are a release procedure, **not checks already performed**.
The repository forbids routine production builds. Run these only after an explicit
build/release request and complete the browser acceptance checklist in
[verification](SHARED-FRONTEND-VERIFICATION.md) before cutting over production.

1. Choose a new immutable semantic version. Set `sdkVersion` in
   `dashboard/src/sdk/contracts.ts` to that same value. Preserve the adapter major
   and minimum host API minor for compatible changes; breaking contracts require
   a separate major channel and host update.
2. From `dashboard`, run `npm run typecheck` and `npm run check:assistant`, then
   `npm run build:module` when authorized. The standalone application has its own
   existing build command.
3. Package without promoting a real channel:

```bash
npm run release:module -- --version 1.0.0 --output /tmp/smokey-release-review
```

The script requires an existing `dist-module` build. It copies hash-named ESM,
chunks, CSS/fonts and the mascot into `releases/1.0.0`, then writes `release.json`.
It refuses to overwrite an existing version. `--source` accepts a trusted archived
module build directory. Synthetic packaging checks exercise this behavior without
building the application or changing a real channel.

4. Inspect the actual output: no bare package imports, all CSS/image/font/chunk
   references inside the release, correct MIME, and matching module exports.
   Deploy the complete release directory before publishing its channel manifest.
5. After acceptance, package to the served directory and atomically promote:

```bash
npm run release:module -- --version 1.0.0 --promote
```

This uses `SmokeyChatbot/releases/ui`, first completes the immutable version
folder, then atomically replaces `channels/stable-v1.json`. It retains the previous
pointer as `previous-v1.json`. Do not invoke the package command twice for the same
already-packaged version; promote a reviewed `release.json` using the atomic
pointer procedure below instead.

PixelCore mounts that directory read-only at `/smokey-ui`. Its Nginx locations
serve `/smokey-assets/channels/` with `no-cache`, and immutable release assets with
a one-year cache and `nosniff`. `.mjs` uses JavaScript MIME; CSS uses `text/css`.
Hosts deployed elsewhere must copy/sync the release directory to their own trusted
same-origin asset location. A local sibling mount does not distribute files to
other servers.

After the cutover gates pass, set PixelCore to:

```dotenv
NUXT_PUBLIC_SMOKEY_UI_MODE=module
NUXT_PUBLIC_SMOKEY_UI_SOURCE=release
NUXT_PUBLIC_SMOKEY_UI_MANIFEST=/smokey-assets/channels/stable-v1.json
```

Compose forwards these settings. Recreate the frontend when changing its runtime
configuration. Compatible subsequent UI releases need only asset/channel delivery,
not another PixelCore frontend build. Host API/permissions/adapter changes can still
require changes in both repositories. Production defaults to legacy/release until
cutover; its base Compose configuration never starts Vite.

## Atomic promotion / rollback of an existing artifact

Keep previous release folders. From the machine owning `releases/ui`, use a
reviewed `release.json` as the next channel (example rolls back to 1.0.0):

```bash
python3 - <<'PY'
from pathlib import Path
import json, os
root = Path('releases/ui')
source = root / 'releases/1.0.0/release.json'
payload = source.read_bytes()
assert json.loads(payload)['release'] == '1.0.0'
channel = root / 'channels/stable-v1.json'
channel.parent.mkdir(parents=True, exist_ok=True)
if channel.exists():
    (root / 'channels/previous-v1.json').write_bytes(channel.read_bytes())
temporary = channel.with_suffix('.json.next')
temporary.write_bytes(payload)
os.replace(temporary, channel)
PY
```

Run from the Smokey repository root. Use a single deployment writer. Reload to
load the selected release; mounted sessions retain their current version. A cached
immutable asset must never be edited in place. An unavailable or incompatible
manifest shows a retryable module error; it does not import an arbitrary URL or
silently enable the legacy implementation. Rollback changes UI delivery, not
provider credentials, report data, backend migrations or remote job status.

After approved cutover, remove the temporary legacy Vue screens/controller and
migration switch in Task 9. Until then, legacy mode is an explicit rollout choice,
not a second UI to continue developing.
