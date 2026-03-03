import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast, toast } from '@/hooks/use-toast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    // Dismiss all toasts to reset module-level state
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.dismiss();
    });
    // Advance timers to clear remove queue timeouts
    act(() => {
      vi.advanceTimersByTime(2_000_000);
    });
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('starts with an empty toasts array', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('adds a toast via the hook toast function', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: 'Hello' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Hello');
    expect(result.current.toasts[0].open).toBe(true);
  });

  it('adds a toast via the standalone toast function', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Standalone' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Standalone');
  });

  it('enforces TOAST_LIMIT of 1', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'First' });
    });
    act(() => {
      toast({ title: 'Second' });
    });

    // Only the most recent toast should be visible (limit = 1)
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Second');
  });

  it('updates an existing toast', () => {
    const { result } = renderHook(() => useToast());

    let toastRef: {
      id: string;
      update: (props: any) => void;
      dismiss: () => void;
    };
    act(() => {
      toastRef = toast({ title: 'Original' });
    });

    act(() => {
      toastRef!.update({ id: toastRef!.id, title: 'Updated' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Updated');
  });

  it('dismisses a specific toast by id', () => {
    const { result } = renderHook(() => useToast());

    let toastRef: { id: string; dismiss: () => void };
    act(() => {
      toastRef = toast({ title: 'Dismissable' });
    });

    expect(result.current.toasts[0].open).toBe(true);

    act(() => {
      result.current.dismiss(toastRef!.id);
    });

    // After dismiss, toast should be closed (open: false)
    expect(result.current.toasts[0].open).toBe(false);
  });

  it('dismisses all toasts when no id is provided', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Toast' });
    });

    act(() => {
      result.current.dismiss();
    });

    // All toasts should be marked closed
    result.current.toasts.forEach((t) => {
      expect(t.open).toBe(false);
    });
  });

  it('removes a toast after TOAST_REMOVE_DELAY', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Will be removed' });
    });

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.toasts).toHaveLength(1);

    // Advance past TOAST_REMOVE_DELAY (1_000_000ms)
    act(() => {
      vi.advanceTimersByTime(1_000_001);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('toast returns id, dismiss, and update functions', () => {
    const { result } = renderHook(() => useToast());

    let toastRef: {
      id: string;
      dismiss: () => void;
      update: (props: any) => void;
    };
    act(() => {
      toastRef = toast({ title: 'Test' });
    });

    expect(toastRef!.id).toBeDefined();
    expect(typeof toastRef!.dismiss).toBe('function');
    expect(typeof toastRef!.update).toBe('function');
  });

  it('dismisses via onOpenChange(false)', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Auto dismiss' });
    });

    const toastItem = result.current.toasts[0];
    expect(toastItem.onOpenChange).toBeDefined();

    act(() => {
      toastItem.onOpenChange!(false);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });
});
