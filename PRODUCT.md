# SmokeyChatBot

SmokeyChatBot is a website-installed chatbot for site owners. A site owner can choose the original Smokey sprite, upload a static image or sprite sheet, or use a conventional chat launcher. The visitor should get a useful answer without leaving the host website.

Portfolio and store modes are grounded in public owner-provided files or text. General mode answers broader questions without live web or store-system access. The first release is a capped free beta with public sign-up, one server-side OpenAI key, and no server-side visitor transcripts.

The owner dashboard manages multiple sites and keeps their knowledge separate. The website widget works with plain HTML or an npm import; it mounts directly in the host page. Visitor-safe content, accessible controls, predictable mobile behavior, and cost limits are required for launch.

## Optional host reporting runtime

The reusable Smokey assistant package can be installed in a host such as PixelCore.
Host businesses bring their own AI connections and model choices; host-owned
authorization and report tools govern internal data. This capability is separate
from the standalone public widget and its legacy server-key/indexing workflow.
The dashboard is white-first with Light/Dark/System themes and mascot feedback
paired with readable, accessible progress messages.

## Standalone business workspace — 2026-10-27

The standalone React dashboard now opens a business assistant login by default.
It authenticates with the connected host and exposes business selection, provider
connections/model discovery, mascot settings, application limits, AI usage, report
generation and saved reports. Authorization and private business records remain
owned by the host. Existing website owner management remains at `/websites` and
keeps its separate owner authentication and public-knowledge workflow.
