# OMNIA EYE — Frontend

The frontend for the OMNIA EYE intelligence workspace: Latest news, Top today,
tokens, source trackers, company views and configurable panels.

## Run

```sh
npm ci
npm run dev
```

```sh
npm test
npm run typecheck
npm run build
```

## Included

- Independent panels with saved workspaces, filters, presets and window controls.
- X, Reddit, YouTube, website, GitHub, Instagram and Truth Social views.
- Author context, media, company identities and publication times.
- Fourteen starter presets, keyword groups and optional notification sounds.
- Account, archive and Bags interface components.

This is frontend source. Collectors, API servers, databases, credentials, contract
execution and production records are excluded. The bundled snapshot is empty;
it makes the interface boot without pretending that a live feed is connected.
Data-backed panels require the same-origin services described in
[Integration](docs/integration.md). No public production service is configured
as a proxy or fallback.

The default design preview answers feed requests locally with empty results and
blocks account writes. A small notice identifies this mode. To integrate your
own services, set `VITE_CONNECTED_FRONTEND=true` before starting or building.
Never use the preview transport as an authorization layer.

The cinematic homepage and the former canvas motion study are excluded from
this revision. Ordinary panel transitions and accessibility preferences remain.

## Source map

| Directory                | Responsibility                                   |
| ------------------------ | ------------------------------------------------ |
| `src/product/terminal`   | Panels, workspaces, preset matching and alerts   |
| `src/product/components` | Feed cards, media, logos and trackers            |
| `src/product/data`       | Read-only repository and data contracts          |
| `src/product/archive`    | Archive views and relationship graph             |
| `src/product/account`    | Client identity, preferences and account screens |
| `src/product/tokens`     | Token presentation                               |
| `src/product/bags`       | Bags interface                                   |
| `scripts`                | Isolated frontend behavior tests                 |

## Rights

Copyright © 2026 OMNIA EYE. Source available for portfolio and evaluation.
See [LICENSE](LICENSE). Third-party names and marks identify their respective
platforms and companies; their inclusion does not imply endorsement.
