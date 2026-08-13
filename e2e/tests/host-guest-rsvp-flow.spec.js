import { test, expect } from '@playwright/test';

import { runBackendCli } from '../helpers/dockerCli.js';

// Covers the plan's core E2E flow (Testing / E2E section): host creates a
// party and an invite, a guest opens the invite link and accepts with a
// companion, the host sees the updated status live, then the guest switches
// their answer to decline and the host sees that update too.
test('Host creates a party and an invite, guest accepts with a companion then switches to decline, host sees each update live', async ({
  page,
  browser,
}) => {
  // Hosts only ever exist via the CLI (no self-registration, see plan,
  // Roles & core flows).
  const hostUsername = `e2e-host-${Date.now()}`;
  const hostPassword = 'E2e-Host-Passwort-1!';
  runBackendCli('host:create', [hostUsername, hostPassword]);

  const partyName = `E2E Party ${Date.now()}`;
  const partySlug = `e2e-party-${Date.now()}`;
  const futureEventDate = '2099-12-31';
  const acceptLabel = 'Yes, I will be there!';
  const declineLabel = 'Sorry, cannot make it';
  const companionFieldLabel = 'Bringing a companion?';
  const guestName = `E2E Guest ${Date.now()}`;
  const greetingText = 'We are so happy to celebrate with you!';

  // --- Host: log in ---
  await page.goto('/invite');
  await page.getByLabel('Username').fill(hostUsername);
  await page.getByLabel('Password').fill(hostPassword);
  await page.getByRole('button', { name: 'Log in' }).click();
  await page.waitForURL((url) => url.pathname === '/invite/parties');

  // --- Host: create a party ---
  await page.getByLabel('Name').fill(partyName);
  await page.getByLabel('Slug').fill(partySlug);
  await page.getByLabel('Event date').fill(futureEventDate);
  const createPartyResponse = page.waitForResponse(
    (response) => response.request().method() === 'POST'
      && new URL(response.url()).pathname === '/api/parties',
  );
  await page.getByRole('button', { name: 'Create party' }).click();
  const party = await (await createPartyResponse).json();

  // Party settings (labels, companion field) live on the party's own page
  // (plan: `/invite/parties/:id`), not on the creation form.
  await page.goto(`/invite/parties/${party.id}`);
  await page.getByLabel('Accept label').fill(acceptLabel);
  await page.getByLabel('Decline label').fill(declineLabel);
  await page.getByLabel('Companion field label').fill(companionFieldLabel);
  await page.getByLabel('Companion field visible').check();
  await page.getByRole('button', { name: 'Save' }).click();

  // --- Host: create an invite for a guest, with companion allowed ---
  await page.getByLabel('Guest name').fill(guestName);
  await page.getByLabel('Greeting text').fill(greetingText);
  await page.getByLabel('Allow companion').check();
  const createInviteResponse = page.waitForResponse(
    (response) => response.request().method() === 'POST'
      && new URL(response.url()).pathname === `/api/parties/${party.id}/invites`,
  );
  await page.getByRole('button', { name: 'Add guest' }).click();
  const invite = await (await createInviteResponse).json();

  const inviteRow = page.getByRole('row', { name: new RegExp(guestName) });
  await expect(inviteRow).toContainText(/pending/i);

  // --- Guest: opens the invite link in their own session and accepts with a companion ---
  const guestContext = await browser.newContext();
  const guestPage = await guestContext.newPage();
  await guestPage.goto(`/?invite-code=${invite.invite_code}`);
  await guestPage.waitForURL((url) => url.pathname === '/guest');
  await expect(guestPage.getByText(guestName)).toBeVisible();
  await expect(guestPage.getByText(greetingText)).toBeVisible();

  await guestPage.getByLabel(companionFieldLabel).check();
  const acceptResponse = guestPage.waitForResponse(
    (response) => response.request().method() === 'POST'
      && new URL(response.url()).pathname === `/api/invites/${invite.invite_code}/rsvp`,
  );
  await guestPage.getByRole('button', { name: acceptLabel }).click();
  const acceptResult = await (await acceptResponse).json();
  expect(acceptResult.status).toBe('accepted');
  expect(acceptResult.companion_response).toBe(true);

  // --- Host: sees the accepted status live ---
  await page.reload();
  await expect(inviteRow).toContainText(/accepted/i);

  // --- Guest: switches the answer to decline ---
  const declineResponse = guestPage.waitForResponse(
    (response) => response.request().method() === 'POST'
      && new URL(response.url()).pathname === `/api/invites/${invite.invite_code}/rsvp`,
  );
  await guestPage.getByRole('button', { name: declineLabel }).click();
  const declineResult = await (await declineResponse).json();
  expect(declineResult.status).toBe('declined');

  // --- Host: sees the declined status live ---
  await page.reload();
  await expect(inviteRow).toContainText(/declined/i);

  await guestContext.close();
});
