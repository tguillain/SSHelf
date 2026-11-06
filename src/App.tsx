import { useEffect, useMemo, useRef, useState } from 'react';
import { importSshConfig, listPrivateKeys } from './backend';
import { fromImportedHost } from './connections/fromImportedHost';
import type { Connection } from './connections/types';
import { useConnections } from './connections/useConnections';
import { useI18n } from './i18n/useI18n';
import { ConnectionDialog, type DialogMode } from './dialogs/ConnectionDialog';
import { EmptyState } from './layout/EmptyState';
import { StatusBar } from './layout/StatusBar';
import { TabBar } from './layout/TabBar';
import { TitleBar } from './layout/TitleBar';
import { sessionLabel } from './sessions/sessionLabel';
import { useSessions } from './sessions/useSessions';
import { Sidebar } from './sidebar/Sidebar';
import { matchShortcut } from './terminal/shortcuts';
import { TerminalPane } from './terminal/TerminalPane';
import { useFontSize } from './terminal/useFontSize';
import { useUpdater } from './updates/useUpdater';

const RECENT_COUNT = 3;

type DialogState = {
  mode: DialogMode;
  initial: Connection | null;
};

const isInsideTerminal = (target: EventTarget | null) => target instanceof Element && target.closest('.xterm') !== null;

export const App = () => {
  const { connections, storageError, addConnection, updateConnection, removeConnection, mergeConnections } =
    useConnections();
  const sessions = useSessions();
  const { messages } = useI18n();
  const { fontSize, zoomIn, zoomOut, resetZoom } = useFontSize();
  const updater = useUpdater();
  const [dialog, setDialog] = useState<DialogState | null>(null);
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
        return;
      }
      const shortcut = matchShortcut(event);
      if (shortcut === 'zoomIn' || shortcut === 'zoomOut' || shortcut === 'zoomReset') {
        event.preventDefault();
        if (shortcut === 'zoomIn') {
          zoomIn();
        } else if (shortcut === 'zoomOut') {
          zoomOut();
        } else {
          resetZoom();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, resetZoom]);

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

  const openCreateDialog = () => setDialog({ mode: 'create', initial: null });

  const handleSave = (connection: Connection) => {
    const mode = dialog?.mode;
    setDialog(null);
    if (mode === 'edit') {
      updateConnection(connection);
      return;
    }
    addConnection(connection);
    sessions.open(connection.id);
  };

  const handleEdit = (connection: Connection) => setDialog({ mode: 'edit', initial: connection });

  const handleDuplicate = (connection: Connection) =>
    setDialog({ mode: 'create', initial: { ...connection, name: messages.connectionRow.copyName(connection.name) } });

  const handleDelete = (connectionId: string) => {
    sessions.closeConnection(connectionId);
    removeConnection(connectionId);
  };

  const activeSession = sessions.activeSession;
  const activeConnection = activeSession ? connectionsById.get(activeSession.connectionId) ?? null : null;
  const activeStatus = activeSession?.status ?? null;

  return (
    <div className="app">
      <TitleBar subtitle={activeConnection ? `${activeConnection.user}@${activeConnection.name}` : messages.app.noSession} />
      <div className="app__body">
        <Sidebar
          connections={connections}
          activeConnectionId={activeSession?.connectionId ?? null}
          searchRef={searchRef}
          statusOf={sessions.statusOfConnection}
          importMessage={importMessage}
          onOpen={sessions.open}
          onOpenNew={sessions.openNew}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onDuplicate={handleDuplicate}
          onNew={openCreateDialog}
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
            onNew={openCreateDialog}
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
                    key={session.id}
                    connection={connection}
                    label={sessionLabel(connection, session)}
                    fontSize={fontSize}
                    onStatusChange={(status) => sessions.setStatus(session.id, status)}
                    isVisible={sessions.visibleIds.includes(session.id)}
                    isFocused={session.id === sessions.activeId}
                    showHeader={sessions.isSplit}
                    onFocus={() => sessions.focus(session.id)}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState
              recents={connections.slice(0, RECENT_COUNT)}
              onOpen={sessions.open}
              onNew={openCreateDialog}
              onImport={handleImport}
            />
          )}
          <StatusBar
            connection={activeConnection}
            status={activeStatus}
            connectionCount={connections.length}
            storageError={storageError}
            updateState={updater.state}
            onInstallUpdate={updater.install}
          />
        </main>
      </div>
      {dialog && (
        <ConnectionDialog
          mode={dialog.mode}
          initial={dialog.initial}
          privateKeys={privateKeys}
          onCancel={() => setDialog(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};
