import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';

import HostLoginView from './HostLoginView.vue';

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
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/invite', name: 'host-login', component: HostLoginView },
      { path: '/invite/parties', name: 'host-parties', component: { template: '<div>Parties</div>' } },
    ],
  });
  router.push('/invite');
  return router;
}

describe('HostLoginView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiClient.post.mockReset();
  });

  it('logs in and redirects to the parties overview on success', async () => {
    apiClient.post.mockResolvedValueOnce({ username: 'daniel' });
    const router = createTestRouter();
    await router.isReady();

    render(HostLoginView, { global: { plugins: [router] } });

    await fireEvent.update(screen.getByLabelText(/^Username/), 'daniel');
    await fireEvent.update(screen.getByLabelText(/^Password/), 'secret');
    await fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(router.currentRoute.value.path).toBe('/invite/parties'));
    expect(apiClient.post).toHaveBeenCalledWith('/auth/login', { username: 'daniel', password: 'secret' });
  });

  it('shows an error message and stays on the page when login fails', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('invalid credentials'));
    const router = createTestRouter();
    await router.isReady();

    render(HostLoginView, { global: { plugins: [router] } });

    await fireEvent.update(screen.getByLabelText(/^Username/), 'daniel');
    await fireEvent.update(screen.getByLabelText(/^Password/), 'wrong');
    await fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Login failed. Please check your credentials.')).toBeInTheDocument();
    expect(router.currentRoute.value.path).toBe('/invite');
  });
});
