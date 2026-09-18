# Frontend integration

The client uses same-origin HTTP paths. This repository does not implement them.
The host must provide authentication and authorization on the server; client
visibility checks are not access controls.

By default, `src/design-preview.js` substitutes empty responses in the browser
so the complete layout can be reviewed without a backend. It disables sign-in,
rejects writes and does not provide a live stream. Its `fullAccess` field selects
the presentation only and never grants access to a real service. Set
`VITE_CONNECTED_FRONTEND=true` at build/start time to disable this transport.

| Path                       | Purpose                                           |
| -------------------------- | ------------------------------------------------- |
| `/app-data/snapshot.json`  | Initial repository; an empty snapshot is included |
| `/api/feed/access`         | Public feed access state                          |
| `/api/feed/snapshot`       | Current repository data                           |
| `/api/feed/search`         | Filtered, paginated global search                 |
| `/api/feed/top`            | Ranked topics                                     |
| `/api/feed/tokens`         | Token records                                     |
| `/api/feed/social`         | Social posts and profile metadata                 |
| `/api/feed/updates`        | Server-sent update notifications                  |
| `/api/feed/archive-index`  | Archive graph index                               |
| `/api/feed/archive-events` | Paginated archive records                         |
| `/api/feed/event`          | Full event detail                                 |
| `/api/account/config`      | Public sign-in configuration                      |
| `/api/account/*`           | Authenticated preferences and account operations  |

No wallet signing, session or data backend is configured by the repository.
Sign-in, account synchronization, submissions and rewards must be verified
against an independently configured backend before being presented as available.

Guest workspace preferences are stored locally. The empty snapshot contains no
production records. Previewing it does not prove collector coverage, fresh market
data, successful account operations or a functioning stream.

The media cache manifest is deliberately empty. Remote media URLs supplied by
a connected service remain subject to the client URL rules and provider access.
