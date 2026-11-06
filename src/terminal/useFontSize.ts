import { useCallback, useState } from 'react';

const STORAGE_KEY = 'sshelf.fontSize';
const DEFAULT_SIZE = 13;
const MIN_SIZE = 9;
const MAX_SIZE = 28;

const clamp = (size: number) => Math.min(MAX_SIZE, Math.max(MIN_SIZE, size));

const readStoredSize = () => {
  try {
    const stored = Number.parseInt(localStorage.getItem(STORAGE_KEY) ?? '', 10);
    return Number.isNaN(stored) ? DEFAULT_SIZE : clamp(stored);
  } catch {
    return DEFAULT_SIZE;
  }
};

const storeSize = (size: number) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(size));
  } catch {
    return;
  }
};

export const useFontSize = () => {
  const [fontSize, setFontSize] = useState(readStoredSize);

  const applySize = useCallback((next: (current: number) => number) => {
    setFontSize((current) => {
      const size = clamp(next(current));
      storeSize(size);
      return size;
    });
  }, []);

  const zoomIn = useCallback(() => applySize((current) => current + 1), [applySize]);
  const zoomOut = useCallback(() => applySize((current) => current - 1), [applySize]);
  const resetZoom = useCallback(() => applySize(() => DEFAULT_SIZE), [applySize]);

  return { fontSize, zoomIn, zoomOut, resetZoom };
};
