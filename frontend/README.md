# Frontend

Vue 3 + Vite + Tailwind CSS. No vue-i18n: all guest-facing RSVP copy
(accept/decline/companion labels, greeting text) is host-authored free text
stored per party, not translated UI strings.

## Dev commands

```bash
npm run dev --workspace=frontend      # Vite dev server with hot reload, proxies /api to http://localhost:3000
npm run build --workspace=frontend    # production build to dist/
npm run preview --workspace=frontend  # serve the built dist/ output locally
npm test --workspace=frontend         # Vitest + @testing-library/vue
```

The dev server proxy (`vite.config.js`) expects a locally running backend
on port 3000 (`npm run dev --workspace=backend`).

## Component overview

- **`App.vue`** – root component: `BackgroundLayer` behind everything, then
  `AppHeader`/`router-view`/`AppFooter` on top, so the background is visible
  on every page.
- **`router/index.js`** – routes `/guest` (guest, requires a verified invite
  code), `/` (host login), `/parties`, `/parties/:id` (both host-only).
  `/:slug` is registered **last** as a catch-all vanity-URL route so it never
  shadows `/`, `/parties`, `/guest` - it's the only entry point for guests,
  who always reach the app via a party's own link (`/<slug>?invite-code=`).
  Two navigation guards: `meta.requiresAuth` (host session via
  `stores/hostAuth.js`) and `meta.requiresGuest` (verified invite code via
  `stores/guestSession.js`, restored from `sessionStorage` on reload).
- **`stores/hostAuth.js`** (Pinia) – host session: login/logout,
  `fetchCurrentHost()` checks `GET /api/auth/me` on app start. No
  register/reset-password – hosts are CLI-only (`backend/src/cli`).
- **`stores/guestSession.js`** (Pinia) – a guest's resolved invite: the code
  itself is kept in `sessionStorage` so a reload on `/guest` re-resolves it
  instead of bouncing back to the entry form; `verify(code)` calls the
  public lookup endpoint, `respond(status, companion)` submits/updates the
  RSVP.
- **`api/client.js`** – fetch wrapper with `credentials: 'include'` (host
  auth cookie) and centralized `401` handling (redirects to `/`, the host
  login, except for the initial `/auth/me` check). Also supports `FormData`
  bodies (image upload) without JSON-encoding them.
- **`views/GuestEntryView.vue`** – used for `/:slug`; an invite code form
  that auto-submits when `?invite-code=` is present, and otherwise lets the
  guest type one in. Checks that the resolved party's slug matches the URL,
  rejecting codes that belong to a different party.
- **`views/GuestView.vue`** – greets the guest, shows the optional
  greeting text, accept/decline buttons with the party's own labels, a
  companion checkbox (only if the party's `companion_field_visible` **and**
  this invite's `allow_companion` are both true), resubmittable until the
  party's `event_date` passes, after which a plain expired message replaces
  the form.
- **`views/HostLoginView.vue`** – host login form.
- **`views/HostPartiesView.vue`** – lists parties and creates new ones
  (`components/PartyForm.vue`) in a single view.
- **`views/HostPartyDetailView.vue`** – one party's settings form
  (`PartyForm.vue`, reused from creation), `components/ImageGallery.vue`
  (upload/delete background images) and the invite management section
  (`components/InviteForm.vue` + `components/InviteTable.vue`, live RSVP
  status), plus party deletion.
- **`components/BackgroundLayer.vue`** – fixed, full-viewport, behind
  everything (`-z-10`). Neutral `bg-secondary` color until "verified" (host
  logged in, or guest code confirmed), then fetches one random image via the
  backend and renders it with plain `background-size: cover;
  background-position: center` – static, no zoom animation. Falls back to
  the neutral color if the party (or, for a host, all of their parties) has
  no uploaded images.
- **`components/PartyForm.vue`** – name, slug, event date, RSVP labels,
  companion-field visibility; reused for both create and edit.
- **`components/ImageGallery.vue`** – thumbnail grid with per-image delete
  and a file input for upload; self-contained (fetches/refetches its own
  party's images).
- **`components/InviteForm.vue`** / **`components/InviteTable.vue`** – add
  or edit a guest invite (name, greeting text, whether a companion is
  allowed) and list all of a party's invites with their live status.
- **`components/FormField.vue`** – generic label+input/textarea/checkbox.
- **`components/ConfirmDialog.vue`** – generic delete confirmation dialog.
- **`components/AppHeader.vue`** / **`components/AppFooter.vue`** – logo,
  visible on desktop/mobile respectively; logout button shown only once a
  host is logged in.

## Backend API used by this frontend

All under `/api`, JSON unless noted. Field names follow the data model in
the project plan (`parties`, `invites`, `party_images`).

- `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` – host session.
- `GET /parties`, `POST /parties`, `GET /parties/:id`, `PUT /parties/:id`,
  `DELETE /parties/:id` – host-only party CRUD.
- `GET /parties/:id/images`, `POST /parties/:id/images` (multipart,
  field `image`), `DELETE /parties/:id/images/:imageId` – host-only.
- `GET /parties/:id/invites`, `POST /parties/:id/invites`,
  `PUT /invites/:id`, `DELETE /invites/:id` – host-only.
- `GET /invites/lookup?code=` (public) – resolves an invite code to
  `{ guest_name, greeting_text, allow_companion, status, companion_response,
  expired, party: { id, name, slug, accept_label, decline_label,
  companion_field_label, companion_field_visible } }`.
- `POST /invites/:code/rsvp` (public) – body `{ status, companion }`,
  returns the updated `{ status, companion_response, expired }`; rejected
  once expired.
- `GET /images/:id/file` (public) – streams the stored image bytes.
- `GET /parties/:id/random-background` (public) – `{ url }` for one random
  image of that party, used on the guest-facing pages.
- `GET /images/random-background` (host-only) – same shape, random across
  all of the logged-in host's parties, used outside of a single party's
  context (e.g. the parties list).

## Tests

Vitest + `@testing-library/vue` + jsdom (`src/test/setup.js`). `api/client`
is mocked with `vi.mock` in view/component specs so tests don't depend on a
running backend; Pinia stores are seeded directly via `$patch` where needed.
