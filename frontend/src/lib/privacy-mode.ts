import { useMemo, useSyncExternalStore } from 'react';
import { createCurrencyFormatter } from './utils';

const STORAGE_KEY = 'my-fin:privacy-mode';
const MASKED_AMOUNT = '••••••';
const listeners = new Set<() => void>();

function readStoredMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

let isPrivate = readStoredMode();

function notifySubscribers() {
  listeners.forEach((listener) => listener());
}

function handleStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  isPrivate = event.newValue === 'true';
  notifySubscribers();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
  };
}

function getSnapshot(): boolean {
  return isPrivate;
}

function setPrivateMode(value: boolean) {
  if (isPrivate === value) return;
  isPrivate = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // Keep the current session functional when browser storage is unavailable.
  }
  notifySubscribers();
}

export function usePrivacyMode() {
  const privateMode = useSyncExternalStore(subscribe, getSnapshot, () => false);
  return {
    privateMode,
    togglePrivateMode: () => setPrivateMode(!getSnapshot()),
  };
}

export type CurrencyFormatter = Pick<Intl.NumberFormat, 'format'>;

export function useCurrencyFormatter(locale: string, currency = 'BRL'): CurrencyFormatter {
  const { privateMode } = usePrivacyMode();
  return useMemo(() => {
    const formatter = createCurrencyFormatter(locale, currency);
    return {
      format: (amount: number | bigint) => privateMode ? MASKED_AMOUNT : formatter.format(amount),
    };
  }, [locale, currency, privateMode]);
}