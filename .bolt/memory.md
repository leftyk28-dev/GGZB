# Project memory

## Product intent & audience

- Web application involving user account creation and authentication
- Previously enforced one-account-per-device restriction; now supports multiple accounts per device
- Russian-speaking user; UI or support context may require Russian-language considerations

## Brand personality & voice

- Responses delivered in Russian when user communicates in Russian
- Direct, task-oriented communication style

## Visual design & UX direction

- Vite + React project with Tailwind CSS, Lucide React icons, and `@/` path alias (per `.bolt/prompt`)
- No additional inferred visual direction yet

## Decisions, constraints & rationale

- One-account-per-device limitation removed server-side to allow multiple accounts on a single device
- Project includes a server/backend component with deployable functions
- Build and deploy pipeline exists; changes verified against build success
- Prior session work may need re-verification to confirm edits persisted to deployment

## Open questions & assumptions

- Exact tech stack of server/backend (functions platform, database) is unspecified
- Account authentication mechanism (email, OAuth, device ID, etc.) is not yet confirmed
- Whether the GitHub repository import feature is the primary product surface or a secondary tool is unclear
- Unknown if other device-based restrictions or tracking logic remain elsewhere in the codebase