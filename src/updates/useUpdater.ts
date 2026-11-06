import { useEffect, useState } from 'react';
import { relaunch } from '@tauri-apps/plugin-process';
import { check, type Update } from '@tauri-apps/plugin-updater';

const CHECK_DELAY_MS = 5000;

export type UpdateState =
  | { phase: 'idle' }
  | { phase: 'available'; version: string }
  | { phase: 'installing'; version: string; progress: number | null }
  | { phase: 'failed'; version: string; detail: string };

export const useUpdater = () => {
  const [update, setUpdate] = useState<Update | null>(null);
  const [state, setState] = useState<UpdateState>({ phase: 'idle' });

  useEffect(() => {
    let isCancelled = false;
    const timer = window.setTimeout(() => {
      check()
        .then((found) => {
          if (found && !isCancelled) {
            setUpdate(found);
            setState({ phase: 'available', version: found.version });
          }
        })
        .catch((error: unknown) => console.info('Update check skipped', error));
    }, CHECK_DELAY_MS);
    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const install = async () => {
    if (!update) {
      return;
    }
    const version = update.version;
    let total = 0;
    let received = 0;
    setState({ phase: 'installing', version, progress: null });
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          total = event.data.contentLength ?? 0;
        } else if (event.event === 'Progress') {
          received += event.data.chunkLength;
          setState({ phase: 'installing', version, progress: total > 0 ? received / total : null });
        }
      });
      await relaunch();
    } catch (error) {
      setState({ phase: 'failed', version, detail: String(error) });
    }
  };

  return { state, install };
};
