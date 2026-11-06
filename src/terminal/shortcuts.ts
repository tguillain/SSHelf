export type TerminalShortcut = 'zoomIn' | 'zoomOut' | 'zoomReset' | 'search' | 'copy' | 'paste';

export const matchShortcut = (event: KeyboardEvent): TerminalShortcut | null => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) {
    return null;
  }
  const key = event.key.toLowerCase();
  if (key === '+' || key === '=') {
    return 'zoomIn';
  }
  if (key === '-' && !event.shiftKey) {
    return 'zoomOut';
  }
  if (event.code === 'Digit0' || event.code === 'Numpad0') {
    return 'zoomReset';
  }
  if (!event.shiftKey) {
    return null;
  }
  if (key === 'f') {
    return 'search';
  }
  if (key === 'c') {
    return 'copy';
  }
  if (key === 'v') {
    return 'paste';
  }
  return null;
};
