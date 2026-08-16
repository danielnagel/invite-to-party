import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';

import GuestPreviewView from './GuestPreviewView.vue';
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

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useRoute: () => ({ params: { id: 'party-1' } }),
  };
});

const globalStubs = {
  RouterLink: {
    props: ['to'],
    template: '<a :href="to"><slot /></a>',
  },
};

function previewResponse(overrides = {}) {
  return {
    guest_name: 'Guest Name',
    greeting_text: null,
    allow_companion: true,
    status: 'pending',
    companion_response: null,
    expired: false,
    party: {
      id: 'party-1',
      name: 'Summer Party',
      slug: 'summer',
      accept_label: 'Accept',
      decline_label: 'Decline',
      companion_field_label: 'Bringing a companion?',
      companion_field_visible: true,
    },
    ...overrides,
  };
}

describe('GuestPreviewView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    apiClient.get.mockReset();
    apiClient.post.mockReset();
  });

  it('loads the party preview and renders the guest RSVP page', async () => {
    apiClient.get.mockResolvedValueOnce(previewResponse());
    render(GuestPreviewView, { global: { stubs: globalStubs, plugins: [i18n] } });

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/parties/party-1/preview'));
    expect(await screen.findByText('Hello Guest Name')).toBeInTheDocument();
    expect(screen.getByText(/responses here are not saved/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to admin/ })).toHaveAttribute(
      'href',
      '/invite/parties/party-1',
    );
  });

  it('does not call the RSVP endpoint when responding in preview mode', async () => {
    apiClient.get.mockResolvedValueOnce(previewResponse());
    render(GuestPreviewView, { global: { stubs: globalStubs, plugins: [i18n] } });

    const acceptButton = await screen.findByRole('button', { name: 'Accept' });
    acceptButton.click();

    await waitFor(() => expect(screen.getByText('Accept')).toBeInTheDocument());
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('shows an error message when the preview fails to load', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('nope'));
    render(GuestPreviewView, { global: { stubs: globalStubs, plugins: [i18n] } });

    expect(await screen.findByText('Could not load a preview for this party.')).toBeInTheDocument();
  });
});
