import { useEffect, useState } from 'react';
import { ENVIRONMENTS, formatAddress } from '../connections/environments';
import type { Connection } from '../connections/types';
import type { SessionStatus } from '../sessions/useSessions';
import { Icon } from '../ui/Icon';

type ConnectionRowProps = {
  connection: Connection;
  status: SessionStatus | null;
  isActive: boolean;
  onOpen: () => void;
  onDelete: () => void;
};

const CONFIRM_TIMEOUT_MS = 3000;

const STATUS_LABELS: Record<SessionStatus, string> = {
  connecting: 'Connexion en cours',
  connected: 'Session ouverte',
  closed: 'Session déconnectée',
};

export const ConnectionRow = ({ connection, status, isActive, onOpen, onDelete }: ConnectionRowProps) => {
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);
  const environment = ENVIRONMENTS[connection.environment];
  const address = formatAddress(connection);

  useEffect(() => {
    if (!isConfirmingDelete) {
      return;
    }
    const timer = window.setTimeout(() => setConfirmingDelete(false), CONFIRM_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [isConfirmingDelete]);

  const handleDelete = () => {
    if (isConfirmingDelete) {
      onDelete();
      return;
    }
    setConfirmingDelete(true);
  };

  return (
    <div className={`connection${isActive ? ' connection--active' : ''}`}>
      <button type="button" className="connection__open" onClick={onOpen} title={`Se connecter à ${address}`}>
        <span className="connection__icon" style={{ color: environment.color, background: `${environment.color}1F` }}>
          <Icon name="server" size={15} />
        </span>
        <span className="connection__text">
          <span className="connection__name">{connection.name}</span>
          <span className="connection__address">{address}</span>
        </span>
        {status && (
          <>
            <span className={`status-dot status-dot--${status}`} aria-hidden="true" />
            <span className="visually-hidden">{STATUS_LABELS[status]}</span>
          </>
        )}
      </button>
      <button
        type="button"
        className={`connection__delete${isConfirmingDelete ? ' connection__delete--confirm' : ''}`}
        onClick={handleDelete}
        aria-label={isConfirmingDelete ? `Confirmer la suppression de ${connection.name}` : `Supprimer ${connection.name}`}
        title={isConfirmingDelete ? 'Cliquer à nouveau pour supprimer' : 'Supprimer'}
      >
        {isConfirmingDelete ? 'Supprimer ?' : <Icon name="trash" size={14} />}
      </button>
    </div>
  );
};
