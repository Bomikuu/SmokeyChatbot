# Provider contracts

Checked against official documentation on 2026-10-27:

- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs): Responses API, `text.format.json_schema`, `store: false`.
- [Anthropic structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs): Messages API, `output_config.format`, API-key header.
- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output): GenerateContent, JSON MIME type and response JSON schema.
- [OpenRouter structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs): Chat completions, strict response format and required parameters.

Catalog entries are candidates, not claims that a key has model access. A connection
must pass an explicit structured-generation check for its selected model. This check
can consume provider tokens and is recorded in application usage. No live provider
calls are part of automated verification. Model IDs are selected from provider
catalogs rather than defaulted to a potentially outdated model name.

Network errors and unreadable responses retain unknown usage. The module does not
follow redirects, accept custom endpoints, retry paid calls or substitute a global key.
