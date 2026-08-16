import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/vue';

import PartyForm from './PartyForm.vue';
import i18n from '../i18n';

describe('PartyForm', () => {
  it('requires the name, slug and event date - matching the backend validation', () => {
    render(PartyForm, { global: { plugins: [i18n] } });

    expect(screen.getByLabelText(/^Name/)).toBeRequired();
    expect(screen.getByLabelText(/^Slug/)).toBeRequired();
    expect(screen.getByLabelText(/^Event date/)).toBeRequired();
  });

  it('emits submit with the entered data', async () => {
    const { emitted } = render(PartyForm, { global: { plugins: [i18n] } });

    await fireEvent.update(screen.getByLabelText(/^Name/), 'Summer Party');
    await fireEvent.update(screen.getByLabelText(/^Slug/), 'summer-party');
    await fireEvent.update(screen.getByLabelText(/^Event date/), '2026-08-01');
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Companion field visible' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Create party' }));

    expect(emitted().submit).toHaveLength(1);
    expect(emitted().submit[0][0]).toEqual(
      expect.objectContaining({
        name: 'Summer Party',
        slug: 'summer-party',
        event_date: '2026-08-01',
        companion_field_visible: true,
      }),
    );
  });

  it('pre-fills fields from initialData and shows the "Save" label in edit mode', () => {
    render(PartyForm, {
      props: {
        isEditMode: true,
        initialData: { name: 'Existing Party', event_date: '2026-09-01' },
      },
      global: { plugins: [i18n] },
    });

    expect(screen.getByLabelText(/^Name/).value).toBe('Existing Party');
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});
