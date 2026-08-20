import { test, expect } from '@playwright/test';

import { runBackendCli } from '../helpers/dockerCli.js';

// Covers the plan's last E2E flow (Testing / E2E section): an invite
// belonging to a party whose event_date is in the past shows the expired
// state and rejects further RSVP changes (event_date doubles as the expiry
// for every invite in the party, see plan, Data model).
test('An invite in a party with a past event date shows the expired state and rejects RSVP changes', async ({
  page,
  browser,
  request,
}) => {
  const hostUsername = `e2e-host-expired-${Date.now()}`;
  const hostPassword = 'E2e-Host-Passwort-2!';
  runBackendCli('host:create', [hostUsername, hostPassword]);

  const partyName = `E2E Past Party ${Date.now()}`;
  const partySlug = `e2e-past-party-${Date.now()}`;
  const pastEventDate = '2020-01-01';
  const guestName = `E2E Expired Guest ${Date.now()}`;

  await page.goto('/');
  await page.getByLabel('Username').fill(hostUsername);
  await page.getByLabel('Password').fill(hostPassword);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL((url) => url.pathname === '/parties');

  await page.getByLabel('Name').fill(partyName);
  await page.getByLabel('Slug').fill(partySlug);
  await page.getByLabel('Event date').fill(pastEventDate);
  const createPartyResponse = page.waitForResponse(
    (response) => response.request().method() === 'POST'
      && new URL(response.url()).pathname === '/api/parties',
  );
  await page.getByRole('button', { name: 'Create party' }).click();
  const party = await (await createPartyResponse).json();

  await page.goto(`/parties/${party.id}`);
  await page.getByLabel('Guest name').fill(guestName);
  await page.getByLabel('Greeting text').fill('See you soon!');
  const createInviteResponse = page.waitForResponse(
    (response) => response.request().method() === 'POST'
      && new URL(response.url()).pathname === `/api/parties/${party.id}/invites`,
  );
  await page.getByRole('button', { name: 'Add guest' }).click();
  const invite = await (await createInviteResponse).json();

  // Contract check: the public lookup endpoint already flags it as expired.
  const lookupResponse = await request.get(`/api/invites/lookup?code=${invite.invite_code}`);
  expect(lookupResponse.ok()).toBeTruthy();
  const lookup = await lookupResponse.json();
  expect(lookup.expired).toBe(true);

  // Guest UI: opens the invite link and only sees the expired state.
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await guestPage.goto(`/${partySlug}?invite-code=${invite.invite_code}`);
  await guestPage.waitForURL((url) => url.pathname === '/guest');
  // Not just /expired/i: the fixture guest name itself contains "Expired",
  // which would also match the "Hello ..." heading and make this ambiguous.
  await expect(guestPage.getByText(/already took place/i)).toBeVisible();

  // Backend enforcement: rejects an RSVP change even if attempted directly,
  // regardless of what the UI shows.
  const rsvpResponse = await request.post(`/api/invites/${invite.invite_code}/rsvp`, {
    data: { status: 'accepted' },
  });
  expect(rsvpResponse.ok()).toBeFalsy();

  await guestContext.close();
});
