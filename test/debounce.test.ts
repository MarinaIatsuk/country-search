import { afterEach, describe, expect, it, vi } from 'vitest';
import { debounce } from '../src/utils/debounce.js';

describe('debounce', () => {
  afterEach(() => vi.useRealTimers());

  it('waits for the delay before invoking the latest call', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const debounced = debounce(callback, 100);

    debounced('first');
    vi.advanceTimersByTime(70);
    debounced('latest');
    vi.advanceTimersByTime(99);

    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledExactlyOnceWith('latest');
  });

  it('does not call the callback before it has been called', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    const debounced = debounce(callback, 50);

    vi.advanceTimersByTime(200);
    expect(callback).not.toHaveBeenCalled();
    debounced('value');
    vi.advanceTimersByTime(50);
    expect(callback).toHaveBeenCalledExactlyOnceWith('value');
  });
});
