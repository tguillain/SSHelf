import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';
import type { Terminal } from '@xterm/xterm';

export const copySelection = (terminal: Terminal) => {
  const selection = terminal.getSelection();
  if (!selection) {
    return false;
  }
  writeText(selection).catch((error: unknown) => console.warn('Clipboard write failed', error));
  return true;
};

export const pasteInto = (terminal: Terminal) => {
  readText()
    .then((text) => {
      if (text) {
        terminal.paste(text);
      }
    })
    .catch((error: unknown) => console.warn('Clipboard read failed', error));
};
