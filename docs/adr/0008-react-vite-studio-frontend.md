# ADR 0008: Use one React and Vite studio frontend

Status: Accepted, migration in progress

## Context

The working local editor began as `public/index.html` plus imperative browser JavaScript. A later React/Vite/Vinext surface embedded that editor in an iframe. Extending both surfaces would duplicate shell behavior, styling, state boundaries, and tests just before adding 3D and conversational generation.

## Decision

React 19, TypeScript, and Vite will be the single canonical frontend for local development and future independently hosted delivery. The studio is a browser application, not a native desktop application, not a separate marketing site, and not a ChatGPT-hosted application. Current development is localhost-only; ADR 0009 defines the future AWS runtime.

- The shared React shell discovers engine UI modules rather than hard-coding engine document fields.
- Each engine UI owns its reducer, persistence adapter, editor, inspector, asset panel, export action, and shortcuts.
- Canvas drawing and binary import/export stay in imperative, testable utilities behind React hooks and refs.
- Domain schemas, validation, rendering, and export rules remain in `packages/*`; they do not move into React components.
- Existing browser storage keys and export behavior remain compatible during migration.
- The current iframe and static editor are removed only after both engine workflows pass equivalent local checks. Future deployment checks begin only after the AWS environment exists.

## Consequences

The migration temporarily keeps the verified static editor as a compatibility surface. New 3D and AI UI work waits until the React shell owns engine selection and the humanoid 2D editor. Browser-safe package entry points are needed so frontend code does not duplicate UV logic or import Node-only modules.
