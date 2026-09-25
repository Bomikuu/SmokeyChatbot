# SmokeyChatBot working conventions

## Dashboard stack

- The owner dashboard is React + TypeScript + Tailwind CSS v4. Keep dashboard source in `.ts` and `.tsx`; do not add `.js` or `.jsx` source files.
- Use the official shadcn CLI for shared UI primitives. The project was initialized with `npx shadcn@latest init --base radix --preset nova` and components were added with `npx shadcn@latest add`. Keep `dashboard/components.json` and the generated `src/components/ui/` source. Customize those local files to match `DESIGN.md` when needed.
- Use arrow functions for JavaScript and TypeScript functions, including React components, event handlers, utilities, and edits to generated shadcn components. Avoid `function` declarations and expressions in code we maintain.
- Keep code readable: descriptive names, explicit domain types, small components, and formatted multiline JSX. Avoid packed one-line handlers or large mixed-purpose files.
- `dashboard/src/App.tsx` coordinates authentication, site selection, and top-level state only. Put screen behavior in `src/features/<feature>/`, shared presentation in `src/components/`, API calls in `src/api/`, configuration and general utilities in `src/lib/`, and domain types in `src/types/`.
- Keep the OpenAI key and owner authorization on the Django server. API modules call the existing Django endpoints and do not put secrets in the browser.

## Product and validation

- Read `PRODUCT.md` and `DESIGN.md` before changing user-facing behavior or styling. Preserve the quiet cobalt and cloud dashboard, compact controls, and accessible focus states.
- Keep widget behavior separate from the owner dashboard. The website widget is plain JavaScript so it can run directly on host pages without React.
- Do not run test suites or production builds unless the user requests them. Use focused validation for changed code and report what was actually checked.
