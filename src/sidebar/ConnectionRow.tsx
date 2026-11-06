import { useEffect, useState } from 'react';
import { ENVIRONMENT_COLORS, formatAddress } from '../connections/environments';
import type { Connection } from '../connections/types';
import { useI18n } from '../i18n/useI18n';
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

export const ConnectionRow = ({ connection, status, isActive, onOpen, onDelete }: ConnectionRowProps) => {
  const [isConfirmingDelete, setConfirmingDelete] = useState(false);
  const { messages } = useI18n();
  const color = ENVIRONMENT_COLORS[connection.environment];
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
      <button type="button" className="connection__open" onClick={onOpen} title={messages.connectionRow.connectTo(address)}>
        <span className="connection__icon" style={{ color, background: `${color}1F` }}>
          <Icon name="server" size={15} />
        </span>
        <span className="connection__text">
          <span className="connection__name">{connection.name}</span>
          <span className="connection__address">{address}</span>
        </span>
        {status && (
          <>
            <span className={`status-dot status-dot--${status}`} aria-hidden="true" />
            <span className="visually-hidden">{messages.connectionRow.states[status]}</span>
          </>
        )}
      </button>
      <button
        type="button"
        className={`connection__delete${isConfirmingDelete ? ' connection__delete--confirm' : ''}`}
        onClick={handleDelete}
        aria-label={
          isConfirmingDelete
            ? messages.connectionRow.confirmDelete(connection.name)
            : messages.connectionRow.delete(connection.name)
        }
        title={isConfirmingDelete ? messages.connectionRow.clickAgainToDelete : messages.connectionRow.deleteTitle}
      >
        {isConfirmingDelete ? messages.connectionRow.deleteQuestion : <Icon name="trash" size={14} />}
      </button>
    </div>
  );
};
