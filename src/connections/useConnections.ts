import { useCallback, useEffect, useState } from 'react';
import { loadConnections, saveConnections } from '../backend';
import type { Connection } from './types';

type LoadState = 'loading' | 'ready' | 'failed';

export const useConnections = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    loadConnections()
      .then((stored) => {
        setConnections(stored);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        setStorageError(String(error));
        setLoadState('failed');
      });
  }, []);

  useEffect(() => {
    if (loadState !== 'ready') {
      return;
    }
    saveConnections(connections)
      .then(() => setStorageError(null))
      .catch((error: unknown) => setStorageError(String(error)));
  }, [connections, loadState]);

  const addConnection = useCallback((connection: Connection) => {
    setConnections((current) => [...current, connection]);
  }, []);

  const removeConnection = useCallback((connectionId: string) => {
    setConnections((current) => current.filter((connection) => connection.id !== connectionId));
  }, []);

  const mergeConnections = (incoming: Connection[]) => {
    const knownNames = new Set(connections.map((connection) => connection.name.toLowerCase()));
    const fresh = incoming.filter((connection) => !knownNames.has(connection.name.toLowerCase()));
    setConnections([...connections, ...fresh]);
    return fresh.length;
  };

  return { connections, loadState, storageError, addConnection, removeConnection, mergeConnections };
};
