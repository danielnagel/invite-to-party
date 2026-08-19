import { test, expect } from '@playwright/test';

import { runBackendCli } from '../helpers/dockerCli.js';

// Covers the group-invite feature: one invite link with a primary guest plus
// two additional named guests, each answering independently on the same
// GuestView (see backend/src/routes/invites.js POST .../guests/:guestId/rsvp
// and frontend/src/views/GuestView.vue).
test('Group invite: host adds two extra guest names, each answers independently, host sees all three statuses', async ({
  page,
  browser,
}) => {
  const hostUsername = `e2e-group-host-${Date.now()}`;
  const hostPassword = 'E2e-Host-Passwort-1!';
  runBackendCli('host:create', [hostUsername, hostPassword]);

  const partyName = `E2E Group Party ${Date.now()}`;
  const partySlug = `e2e-group-party-${Date.now()}`;
  const guestName = `E2E Primary ${Date.now()}`;
  const additionalGuestOne = 'E2E Bob';
  const additionalGuestTwo = 'E2E Carol';

  // --- Host: log in, create a party ---
  await page.goto('/');
  await page.getByLabel('Username').fill(hostUsername);
  await page.getByLabel('Password').fill(hostPassword);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL((url) => url.pathname === '/parties');

  await page.getByLabel('Name').fill(partyName);
  await page.getByLabel('Slug').fill(partySlug);
  await page.getByLabel('Event date').fill('2099-12-31');
  const createPartyResponse = page.waitForResponse(
    (response) => response.request().method() === 'POST'
      && new URL(response.url()).pathname === '/api/parties',
  );
  await page.getByRole('button', { name: 'Create party' }).click();
  const party = await (await createPartyResponse).json();
  await page.goto(`/parties/${party.id}`);

  // --- Host: create an invite with two additional named guests ---
  await page.getByLabel('Guest name').fill(guestName);
  await page.getByRole('button', { name: 'Add another guest' }).click();
  await page.getByLabel('Additional guest 1 name').fill(additionalGuestOne);
  await page.getByRole('button', { name: 'Add another guest' }).click();
  await page.getByLabel('Additional guest 2 name').fill(additionalGuestTwo);

  const createInviteResponse = page.waitForResponse(
    (response) => response.request().method() === 'POST'
      && new URL(response.url()).pathname === `/api/parties/${party.id}/invites`,
  );
  await page.getByRole('button', { name: 'Add guest' }).click();
  const invite = await (await createInviteResponse).json();
  expect(invite.guests).toHaveLength(2);
  const [bob, carol] = invite.guests;

  // --- Guest: opens the invite link and sees a combined greeting with 3 RSVP rows ---
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await guestPage.goto(`/${partySlug}?invite-code=${invite.invite_code}`);
  await guestPage.waitForURL((url) => url.pathname === '/guest');

  await expect(guestPage.getByRole('heading')).toContainText(guestName);
  await expect(guestPage.getByRole('heading')).toContainText(additionalGuestOne);
  await expect(guestPage.getByRole('heading')).toContainText(additionalGuestTwo);
  await expect(guestPage.getByText(additionalGuestOne, { exact: true })).toBeVisible();
  await expect(guestPage.getByText(additionalGuestTwo, { exact: true })).toBeVisible();

  // The party creation form pre-fills friendly accept/decline labels (see
  // frontend/src/components/PartyForm.vue) rather than leaving them blank
  // for the backend's raw "Accept"/"Decline" defaults.
  const acceptButtons = guestPage.getByRole('button', { name: 'Yes, I will be there' });
  const declineButtons = guestPage.getByRole('button', { name: "No, I can't make it" });

  // Primary guest accepts.
  await acceptButtons.nth(0).click();
  // Bob (first additional guest) accepts.
  const bobAcceptResponse = guestPage.waitForResponse(
    (response) => response.request().method() === 'POST'
      && new URL(response.url()).pathname === `/api/invites/${invite.invite_code}/guests/${bob.id}/rsvp`,
  );
  await acceptButtons.nth(1).click();
  await bobAcceptResponse;
  // Carol (second additional guest, third row overall) declines.
  const carolDeclineResponse = guestPage.waitForResponse(
    (response) => response.request().method() === 'POST'
      && new URL(response.url()).pathname === `/api/invites/${invite.invite_code}/guests/${carol.id}/rsvp`,
  );
  await declineButtons.nth(2).click();
  await carolDeclineResponse;

  // --- Host: sees all three statuses reflected in the invite table ---
  await page.reload();
  const inviteRow = page.getByRole('row', { name: new RegExp(guestName) });
  await expect(inviteRow).toContainText(/accepted/i);
  await expect(inviteRow).toContainText(additionalGuestOne);
  await expect(inviteRow).toContainText(additionalGuestTwo);

  await guestContext.close();
});
