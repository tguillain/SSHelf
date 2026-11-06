import { describeAuth } from '../connections/environments';
import type { Connection } from '../connections/types';
import { useI18n } from '../i18n/useI18n';
import type { SessionStatus } from '../sessions/useSessions';
import { UpdateButton } from '../updates/UpdateButton';
import type { UpdateState } from '../updates/useUpdater';

type StatusBarProps = {
  connection: Connection | null;
  status: SessionStatus | null;
  connectionCount: number;
  storageError: string | null;
  updateState: UpdateState;
  onInstallUpdate: () => void;
};

export const StatusBar = ({
  connection,
  status,
  connectionCount,
  storageError,
  updateState,
  onInstallUpdate,
}: StatusBarProps) => {
  const { locale, messages, setLocale } = useI18n();

  return (
  <footer className="statusbar">
    {connection && status ? (
      <>
        <span className="statusbar__state">
          <span className={`status-dot status-dot--${status}`} aria-hidden="true" />
          {messages.status.states[status]}
        </span>
        <span className="mono statusbar__shrink">
          {connection.user}@{connection.host}:{connection.port}
        </span>
        <span className="statusbar__shrink">{describeAuth(connection, messages)}</span>
      </>
    ) : (
      <span>{messages.status.noActiveSession}</span>
    )}
    <span className="statusbar__spacer" />
    {storageError && <span className="statusbar__error">{messages.status.saveFailed(storageError)}</span>}
    <span>{messages.status.savedServers(connectionCount)}</span>
    <span className="statusbar__extra">UTF-8</span>
    <span className="statusbar__extra">xterm-256color</span>
    <UpdateButton state={updateState} onInstall={onInstallUpdate} />
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
