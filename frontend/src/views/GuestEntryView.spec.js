import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';

import GuestEntryView from './GuestEntryView.vue';
import i18n from '../i18n';

const { apiClient } = vi.hoisted(() => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../api/client', () => ({ apiClient }));

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'guest-entry', component: GuestEntryView },
      { path: '/:slug', name: 'guest-entry-party', component: GuestEntryView },
      { path: '/guest', name: 'guest', component: { template: '<div>RSVP</div>' } },
    ],
  });
}

const lookupResponse = {
  guest_name: 'Anna',
  greeting_text: '',
  allow_companion: true,
  status: 'pending',
  companion_response: null,
  expired: false,
  party: { id: 'party-1', slug: 'summer', accept_label: 'Yes', decline_label: 'No', companion_field_visible: true },
};

describe('GuestEntryView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiClient.get.mockReset();
  });

  it('auto-submits when ?invite-code= is present and navigates to /guest', async () => {
    apiClient.get.mockResolvedValueOnce(lookupResponse);
    const router = createTestRouter();
    router.push('/?invite-code=abc123');
    await router.isReady();

    render(GuestEntryView, { global: { plugins: [router, i18n] } });

    await waitFor(() => expect(router.currentRoute.value.path).toBe('/guest'));
    expect(apiClient.get).toHaveBeenCalledWith('/invites/lookup', { code: 'abc123' });
  });

  it('shows an error for an unknown invite code', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('not found'));
    const router = createTestRouter();
    router.push('/');
    await router.isReady();

    render(GuestEntryView, { global: { plugins: [router, i18n] } });

    await fireEvent.update(screen.getByLabelText('Invite code'), 'wrong');
    await fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Invalid or unknown invite code.')).toBeInTheDocument();
    expect(router.currentRoute.value.path).toBe('/');
  });

  it('rejects a code that resolves to a different party than the vanity slug', async () => {
    apiClient.get.mockResolvedValueOnce(lookupResponse);
    const router = createTestRouter();
    router.push('/wedding');
    await router.isReady();

    render(GuestEntryView, { global: { plugins: [router, i18n] } });

    await fireEvent.update(screen.getByLabelText('Invite code'), 'abc123');
    await fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('This invite code is not valid for this party.')).toBeInTheDocument();
    expect(router.currentRoute.value.path).toBe('/wedding');
  });
});
