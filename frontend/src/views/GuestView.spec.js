import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';

import GuestView from './GuestView.vue';
import { useGuestSessionStore } from '../stores/guestSession';
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

function seedGuestSession(overrides = {}) {
  const store = useGuestSessionStore();
  store.$patch({
    code: 'abc123',
    guestName: 'Anna',
    greetingText: 'So happy you can join us!',
    allowCompanion: true,
    status: 'pending',
    companionResponse: null,
    expired: false,
    party: {
      id: 'party-1',
      name: 'Summer Party',
      slug: 'summer',
      accept_label: 'Yes, count me in',
      decline_label: 'Sorry, not this time',
      companion_field_label: 'Bringing someone?',
      companion_field_visible: true,
    },
    ...overrides,
  });
  return store;
}

describe('GuestView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiClient.post.mockReset();
  });

  it('greets the guest by name and shows the greeting text', () => {
    seedGuestSession();
    render(GuestView, { global: { plugins: [i18n] } });

    expect(screen.getByText('Hello Anna')).toBeInTheDocument();
    expect(screen.getByText('So happy you can join us!')).toBeInTheDocument();
  });

  it('shows the companion field only when the party and the invite both allow it', () => {
    seedGuestSession({ allowCompanion: false });
    render(GuestView, { global: { plugins: [i18n] } });

    expect(screen.queryByText('Bringing someone?')).not.toBeInTheDocument();
  });

  it('submits the accept response with the party-specific label', async () => {
    apiClient.post.mockResolvedValueOnce({ status: 'accepted', companion_response: true, expired: false });
    seedGuestSession();
    render(GuestView, { global: { plugins: [i18n] } });

    await fireEvent.click(screen.getByRole('checkbox'));
    await fireEvent.click(screen.getByRole('button', { name: 'Yes, count me in' }));

    expect(apiClient.post).toHaveBeenCalledWith('/invites/abc123/rsvp', { status: 'accepted', companion: true });
  });

  it('shows a plain expired state instead of the RSVP form', () => {
    seedGuestSession({ expired: true });
    render(GuestView, { global: { plugins: [i18n] } });

    expect(screen.getByText(/already took place/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Yes, count me in' })).not.toBeInTheDocument();
  });

  it('greets a group invite by all names and shows one RSVP row per guest', () => {
    seedGuestSession({
      guests: [
        { id: 'guest-1', name: 'Bob', status: 'pending' },
        { id: 'guest-2', name: 'Carol', status: 'pending' },
      ],
    });
    render(GuestView, { global: { plugins: [i18n] } });

    expect(screen.getByText('Hello Anna, Bob, and Carol')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Yes, count me in' })).toHaveLength(3);
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Carol')).toBeInTheDocument();
  });

  it('submits a non-primary guest\'s response to their own rsvp endpoint', async () => {
    apiClient.post.mockResolvedValueOnce({ id: 'guest-1', status: 'accepted' });
    seedGuestSession({
      guests: [{ id: 'guest-1', name: 'Bob', status: 'pending' }],
    });
    render(GuestView, { global: { plugins: [i18n] } });

    const acceptButtons = screen.getAllByRole('button', { name: 'Yes, count me in' });
    await fireEvent.click(acceptButtons[1]);

    expect(apiClient.post).toHaveBeenCalledWith('/invites/abc123/guests/guest-1/rsvp', { status: 'accepted' });
  });
});
