import { describeAuth } from '../connections/environments';
import type { Connection } from '../connections/types';
import { useI18n } from '../i18n/useI18n';
import type { SessionStatus } from '../sessions/useSessions';

type StatusBarProps = {
  connection: Connection | null;
  status: SessionStatus | null;
  connectionCount: number;
  storageError: string | null;
};

export const StatusBar = ({ connection, status, connectionCount, storageError }: StatusBarProps) => {
  const { locale, messages, setLocale } = useI18n();

  return (
  <footer className="statusbar">
    {connection && status ? (
      <>
        <span className="statusbar__state">
          <span className={`status-dot status-dot--${status}`} aria-hidden="true" />
          {messages.status.states[status]}
        </span>
        <span className="mono">
          {connection.user}@{connection.host}:{connection.port}
        </span>
        <span>{describeAuth(connection, messages)}</span>
      </>
    ) : (
      <span>{messages.status.noActiveSession}</span>
    )}
    <span className="statusbar__spacer" />
    {storageError && <span className="statusbar__error">{messages.status.saveFailed(storageError)}</span>}
    <span>{messages.status.savedServers(connectionCount)}</span>
    <span>UTF-8</span>
    <span>xterm-256color</span>
    <button
      type="button"
      className="statusbar__language"
      title={messages.status.switchLanguage}
      aria-label={messages.status.switchLanguage}
      onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')}
    >
      {locale.toUpperCase()}
    </button>
  </footer>
  );
};
