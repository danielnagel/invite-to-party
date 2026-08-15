import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, waitFor } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';

import BackgroundLayer from './BackgroundLayer.vue';
import { useHostAuthStore } from '../stores/hostAuth';
import { useGuestSessionStore } from '../stores/guestSession';

const { apiClient } = vi.hoisted(() => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../api/client', () => ({ apiClient }));

describe('BackgroundLayer', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiClient.get.mockReset();
  });

  it('shows the generic party pattern (no photo) before verification', () => {
    const { container } = render(BackgroundLayer);

    expect(container.firstChild.style.backgroundImage).toContain('/party-pattern-background.svg');
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('fetches the party-scoped random background once a guest code is verified', async () => {
    apiClient.get.mockResolvedValueOnce({ url: '/api/images/img-1/file' });
    const guestSession = useGuestSessionStore();
    guestSession.$patch({ party: { id: 'party-1', slug: 'summer' } });

    const { container } = render(BackgroundLayer);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/parties/party-1/random-background'));
    await waitFor(() => expect(container.firstChild.style.backgroundImage).toContain('/api/images/img-1/file'));
  });

  it('falls back to the generic party pattern when the party has no images', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('no images'));
    const guestSession = useGuestSessionStore();
    guestSession.$patch({ party: { id: 'party-1', slug: 'summer' } });

    const { container } = render(BackgroundLayer);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    expect(container.firstChild.style.backgroundImage).toContain('/party-pattern-background.svg');
  });

  it('uses the host-wide random background endpoint for a logged-in host', async () => {
    apiClient.get.mockResolvedValueOnce({ url: '/api/images/img-2/file' });
    const hostAuth = useHostAuthStore();
    hostAuth.$patch({ host: { id: '1', username: 'daniel' } });

    render(BackgroundLayer);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/images/random-background'));
  });
});
