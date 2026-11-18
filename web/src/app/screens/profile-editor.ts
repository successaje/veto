import { sanitizeProfile } from '../../ai/normalize';
import { ATTRS, type PrivateProfile } from '../../domain/attrs';
import { DIET_LABEL, describeHardLimits, FOOD_LABEL, listPhrase, VENUE_LABEL } from '../../domain/labels';
import { button, field, sourceTag } from '../../ui/components';
import { h } from '../../ui/dom';

/**
 * Edit what the device understood from the private note, as choices instead of JSON.
 * Works on a copy; `onSave` receives a sanitized profile. Nothing here leaves the browser.
 */
export function profileEditor(
  initial: PrivateProfile,
  source: 'on_device' | null,
  onSave: (p: PrivateProfile) => void,
): HTMLElement {
  const p: PrivateProfile = structuredClone(initial);
  const readBack = h('p', { class: 'lede', 'aria-live': 'polite' });
  const refresh = () => {
    const limits = describeHardLimits(p);
    readBack.textContent = limits.length
      ? `Your device will rule out ${listPhrase(limits)}.`
      : 'No hard limits yet. Your device will only rank options, not rule any out.';
  };

  /** Toggle chips bound to one string array in the profile. */
  function chips<T extends string>(
    legend: string,
    all: readonly T[],
    labels: Record<T, string>,
    get: () => T[],
    set: (v: T[]) => void,
  ) {
    return h(
      'fieldset',
      { class: 'fieldset' },
      h('legend', { class: 'field-label' }, legend),
      h(
        'div',
        { class: 'chip-group' },
        ...all.map((value) => {
          const chip = h(
            'button',
            { type: 'button', class: 'chip-toggle', 'aria-pressed': String(get().includes(value)) },
            labels[value],
          );
          chip.addEventListener('click', () => {
            const on = !get().includes(value);
            set(on ? [...get(), value] : get().filter((v) => v !== value));
            chip.setAttribute('aria-pressed', String(on));
            refresh();
          });
          return chip;
        }),
      ),
    );
  }

  function check(label: string, get: () => boolean, set: (v: boolean) => void, onChange?: () => void) {
    const box = h('input', { type: 'checkbox', checked: get() });
    box.addEventListener('change', () => {
      set(box.checked);
      onChange?.();
      refresh();
    });
    return h('label', { class: 'check' }, box, h('span', {}, label));
  }

  function numberField(
    label: string,
    prefix: string,
    suffix: string,
    get: () => number | null,
    set: (v: number | null) => void,
  ) {
    const input = h('input', {
      type: 'number',
      min: 1,
      inputmode: 'numeric',
      placeholder: 'No limit',
      value: get() == null ? '' : String(get()),
    });
    input.addEventListener('input', () => {
      const n = Number(input.value);
      set(input.value.trim() && n > 0 ? Math.round(n) : null);
      refresh();
    });
    return h(
      'div',
      { class: 'field' },
      h('span', { class: 'field-label' }, label),
      h(
        'div',
        { class: 'affix' },
        prefix ? h('span', {}, prefix) : null,
        input,
        suffix ? h('span', {}, suffix) : null,
      ),
    );
  }

  const unclear = h(
    'fieldset',
    { class: 'fieldset', hidden: !p.hard.needsStepFree },
    h('legend', { class: 'field-label' }, 'If a place’s access is unclear'),
    ...(
      [
        ['confirm', 'Keep it, and remind me to check'],
        ['veto', 'Rule it out'],
      ] as const
    ).map(([value, label]) => {
      const radio = h('input', {
        type: 'radio',
        name: 'step-free-unknown',
        checked: p.hard.stepFreeUnknown === value,
      });
      radio.addEventListener('change', () => {
        p.hard.stepFreeUnknown = value;
        refresh();
      });
      return h('label', { class: 'check' }, radio, h('span', {}, label));
    }),
  );

  const names = h('input', { value: p.hard.avoidNames.join(', '), placeholder: 'The Tap Room, Rooftop 9' });
  names.addEventListener('input', () => {
    p.hard.avoidNames = names.value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
    refresh();
  });
  const other = h('input', {
    value: p.other,
    maxlength: 120,
    placeholder: 'Somewhere I can sit near the door',
  });
  other.addEventListener('input', () => (p.other = other.value));

  refresh();
  return h(
    'div',
    { class: 'panel stack enter', style: '--stack: var(--s-6)' },
    h(
      'div',
      { class: 'stack', style: '--stack: var(--s-3)' },
      h(
        'div',
        { class: 'spread' },
        h('h2', { style: 'font-size: var(--text-lg)' }, 'What your device understood'),
        source ? sourceTag(source) : null,
      ),
      readBack,
      h('p', { class: 'small muted' }, 'Change anything that’s wrong. This stays in this browser.'),
    ),
    chips(
      'Food to avoid',
      ATTRS.foods,
      FOOD_LABEL,
      () => p.hard.avoidFoods,
      (v) => (p.hard.avoidFoods = v),
    ),
    chips(
      'Must have',
      ATTRS.dietTags,
      DIET_LABEL,
      () => p.hard.requireDietTags,
      (v) => (p.hard.requireDietTags = v),
    ),
    h(
      'div',
      { class: 'stack', style: '--stack: var(--s-3)' },
      chips(
        'Kinds of place to avoid',
        ATTRS.venueTypes,
        VENUE_LABEL,
        () => p.hard.avoidVenueTypes,
        (v) => (p.hard.avoidVenueTypes = v),
      ),
      check(
        'Not somewhere built around drinking',
        () => p.hard.avoidAlcoholFocus,
        (v) => (p.hard.avoidAlcoholFocus = v),
      ),
      check(
        'Somewhere quiet',
        () => p.hard.needsQuiet,
        (v) => (p.hard.needsQuiet = v),
      ),
    ),
    h(
      'div',
      { class: 'stack', style: '--stack: var(--s-3)' },
      h('p', { class: 'field-label' }, 'Access'),
      check(
        'I need step-free access',
        () => p.hard.needsStepFree,
        (v) => (p.hard.needsStepFree = v),
        () => (unclear.hidden = !p.hard.needsStepFree),
      ),
      unclear,
    ),
    h(
      'div',
      { class: 'field-row' },
      numberField(
        'Budget',
        '$',
        'a person',
        () => p.hard.maxPerPerson,
        (v) => (p.hard.maxPerPerson = v),
      ),
      numberField(
        'Travel',
        '',
        'minutes max',
        () => p.hard.maxTravelMin,
        (v) => (p.hard.maxTravelMin = v),
      ),
    ),
    field('Specific places to avoid', names, 'Separate names with commas. Matched loosely.'),
    field('Anything else', other, 'Used only to rank options on this device.'),
    h(
      'div',
      {},
      button('Save on this device', {
        variant: 'primary',
        icon: 'check',
        onClick: () => onSave(sanitizeProfile(p)),
      }),
    ),
  );
}
