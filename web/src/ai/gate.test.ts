import { describe, expect, it, vi } from 'vitest';
import { PrivateAITimeout, withDeadline } from './gate';

describe('withDeadline', () => {
  it('returns the answer when it arrives in time', async () => {
    await expect(withDeadline(1000, async () => 'ok')).resolves.toBe('ok');
  });

  it('aborts the prompt and rejects with a timeout when it is late', async () => {
    vi.useFakeTimers();
    let aborted = false;
    const late = withDeadline(30_000, (signal) => {
      signal.addEventListener('abort', () => (aborted = true));
      return new Promise<string>(() => {}); // a prompt that never answers
    });
    vi.advanceTimersByTime(30_000);
    await expect(late).rejects.toBeInstanceOf(PrivateAITimeout);
    expect(aborted).toBe(true);
    vi.useRealTimers();
  });
});
