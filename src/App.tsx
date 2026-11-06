import { useEffect, useMemo, useRef, useState } from 'react';
import { importSshConfig, listPrivateKeys } from './backend';
import { fromImportedHost } from './connections/fromImportedHost';
import type { Connection } from './connections/types';
import { useConnections } from './connections/useConnections';
import { useI18n } from './i18n/useI18n';
import { NewConnectionDialog } from './dialogs/NewConnectionDialog';
import { EmptyState } from './layout/EmptyState';
import { StatusBar } from './layout/StatusBar';
import { TabBar } from './layout/TabBar';
import { TitleBar } from './layout/TitleBar';
import { useSessions } from './sessions/useSessions';
import { Sidebar } from './sidebar/Sidebar';
import { TerminalPane } from './terminal/TerminalPane';

const RECENT_COUNT = 3;

const isInsideTerminal = (target: EventTarget | null) => target instanceof Element && target.closest('.xterm') !== null;

export const App = () => {
  const { connections, storageError, addConnection, removeConnection, mergeConnections } = useConnections();
  const sessions = useSessions();
  const { messages } = useI18n();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [privateKeys, setPrivateKeys] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const connectionsById = useMemo(
    () => new Map(connections.map((connection) => [connection.id, connection])),
    [connections],
  );

  useEffect(() => {
    listPrivateKeys()
      .then(setPrivateKeys)
      .catch(() => setPrivateKeys([]));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !isInsideTerminal(event.target)) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleImport = async () => {
    try {
      const hosts = await importSshConfig();
      if (hosts.length === 0) {
        setImportMessage(messages.app.importNoHosts);
        return;
      }
      const added = mergeConnections(hosts.map(fromImportedHost));
      setImportMessage(added === 0 ? messages.app.importAllPresent : messages.app.imported(added));
    } catch (error) {
      setImportMessage(messages.app.importFailed(String(error)));
    }
  };

  const handleSave = (connection: Connection) => {
    addConnection(connection);
    setDialogOpen(false);
    sessions.open(connection.id);
  };

  const handleDelete = (connectionId: string) => {
    sessions.close(connectionId);
    removeConnection(connectionId);
  };

  const activeConnection = sessions.activeId ? connectionsById.get(sessions.activeId) ?? null : null;
  const activeStatus = sessions.activeId ? sessions.statusOf(sessions.activeId) : null;

  return (
    <div className="app">
      <TitleBar subtitle={activeConnection ? `${activeConnection.user}@${activeConnection.name}` : messages.app.noSession} />
      <div className="app__body">
        <Sidebar
          connections={connections}
          activeId={sessions.activeId}
          searchRef={searchRef}
          statusOf={sessions.statusOf}
          importMessage={importMessage}
          onOpen={sessions.open}
          onDelete={handleDelete}
          onNew={() => setDialogOpen(true)}
          onImport={handleImport}
        />
        <main className="workspace">
          <TabBar
            sessions={sessions.sessions}
            connectionsById={connectionsById}
            activeId={sessions.activeId}
            isSplitRequested={sessions.isSplitRequested}
            onSelect={sessions.focus}
            onClose={sessions.close}
            onNew={() => setDialogOpen(true)}
            onToggleSplit={sessions.toggleSplit}
          />
          {sessions.sessions.length > 0 ? (
            <div className="workspace__panes">
              {sessions.sessions.map((session) => {
                const connection = connectionsById.get(session.connectionId);
                if (!connection) {
                  return null;
                }
                return (
                  <TerminalPane
                    key={session.connectionId}
                    connection={connection}
                    onStatusChange={(status) => sessions.setStatus(session.connectionId, status)}
                    isVisible={sessions.visibleIds.includes(session.connectionId)}
                    isFocused={session.connectionId === sessions.activeId}
                    showHeader={sessions.isSplit}
                    onFocus={() => sessions.focus(session.connectionId)}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState
              recents={connections.slice(0, RECENT_COUNT)}
              onOpen={sessions.open}
              onNew={() => setDialogOpen(true)}
              onImport={handleImport}
            />
          )}
          <StatusBar
            connection={activeConnection}
            status={activeStatus}
            connectionCount={connections.length}
            storageError={storageError}
          />
        </main>
      </div>
      {isDialogOpen && (
        <NewConnectionDialog privateKeys={privateKeys} onCancel={() => setDialogOpen(false)} onSave={handleSave} />
      )}
    </div>
  );
};
