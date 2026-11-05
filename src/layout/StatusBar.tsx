import { describeAuth } from '../connections/environments';
import type { Connection } from '../connections/types';
import type { SessionStatus } from '../sessions/useSessions';

const STATUS_LABELS: Record<SessionStatus, string> = {
  connecting: 'Connexion…',
  connected: 'Connecté',
  closed: 'Déconnecté',
};

type StatusBarProps = {
  connection: Connection | null;
  status: SessionStatus | null;
  connectionCount: number;
  storageError: string | null;
};

export const StatusBar = ({ connection, status, connectionCount, storageError }: StatusBarProps) => (
  <footer className="statusbar">
    {connection && status ? (
      <>
        <span className="statusbar__state">
          <span className={`status-dot status-dot--${status}`} aria-hidden="true" />
          {STATUS_LABELS[status]}
        </span>
        <span className="mono">
          {connection.user}@{connection.host}:{connection.port}
        </span>
        <span>{describeAuth(connection)}</span>
      </>
    ) : (
      <span>Aucune session active</span>
    )}
    <span className="statusbar__spacer" />
    {storageError && <span className="statusbar__error">Sauvegarde impossible : {storageError}</span>}
    <span>
      {connectionCount} serveur{connectionCount > 1 ? 's' : ''} enregistré{connectionCount > 1 ? 's' : ''}
    </span>
    <span>UTF-8</span>
    <span>xterm-256color</span>
  </footer>
);
