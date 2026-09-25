# API outline

Owner endpoints require a Django session and CSRF token for mutations. Call `GET /api/auth/csrf` before the first mutation and send `X-CSRFToken` thereafter. Public widget endpoints use an exact allowed website origin; the site ID is public and is not a secret.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/auth/csrf` | Set CSRF cookie and return token |
| POST | `/api/auth/signup` | Email/password sign-up |
| GET | `/api/auth/verify?token=...` | Verify email, then redirect |
| POST | `/api/auth/login` | Start owner session |
| POST | `/api/auth/logout` | End owner session |
| GET | `/api/auth/me` | Current owner |
| GET, POST | `/api/owner/sites` | List or create sites |
| GET, PATCH, DELETE | `/api/owner/sites/{siteId}` | Read, update, delete owned site |
| GET, POST, DELETE | `/api/owner/sites/{siteId}/asset` | Read, upload, remove custom mascot image |
| GET, POST | `/api/owner/sites/{siteId}/sources` | List or add knowledge |
| POST, DELETE | `/api/owner/sites/{siteId}/sources/{sourceId}` | Retry failed source or delete it |
| GET | `/api/owner/sites/{siteId}/usage` | Request and token totals |
| GET | `/api/widget/{siteId}/config` | Public widget settings |
| POST | `/api/widget/{siteId}/chat` | Visitor question and up to ten recent messages |
| GET | `/api/widget/{siteId}/asset` | Public custom mascot image |
| GET | `/api/widget/default-asset` | Default Smokey sprite |
| GET | `/api/widget/script` | Classic browser widget script |

Chat request: `{ "message": "...", "history": [{ "role": "user", "content": "..." }] }`. Chat response: `{ "answer": "...", "sources": ["Source title"] }`. Errors return `{ "error": "..." }` with a relevant HTTP status.
