import { ENVIRONMENT_COLORS } from '../connections/environments';
import type { Connection } from '../connections/types';
import { useI18n } from '../i18n/useI18n';
import type { Session } from '../sessions/useSessions';
import { Icon } from '../ui/Icon';

type TabBarProps = {
  sessions: Session[];
  connectionsById: Map<string, Connection>;
  activeId: string | null;
  isSplitRequested: boolean;
  onSelect: (connectionId: string) => void;
  onClose: (connectionId: string) => void;
  onNew: () => void;
  onToggleSplit: () => void;
};

export const TabBar = ({
  sessions,
  connectionsById,
  activeId,
  isSplitRequested,
  onSelect,
  onClose,
  onNew,
  onToggleSplit,
}: TabBarProps) => {
  const { messages } = useI18n();

  return (
  <div className="tabbar">
    <div className="tabbar__tabs" role="tablist" aria-label={messages.tabs.label}>
      {sessions.map((session) => {
        const connection = connectionsById.get(session.connectionId);
        if (!connection) {
          return null;
        }
        const isActive = session.connectionId === activeId;
        return (
          <div key={session.connectionId} className={`tab${isActive ? ' tab--active' : ''}`}>
            <button
              type="button"
              role="tab"
              aria-selected={isActive}
              className="tab__select"
              onClick={() => onSelect(session.connectionId)}
              onAuxClick={(event) => event.button === 1 && onClose(session.connectionId)}
            >
              <span className="tab__dot" style={{ background: ENVIRONMENT_COLORS[connection.environment] }} />
              <span className="tab__name">{connection.name}</span>
              {session.status === 'connecting' && <Icon name="spinner" size={12} strokeWidth={3} className="spin tab__spinner" />}
            </button>
            <button
              type="button"
              className="tab__close"
              aria-label={messages.tabs.close(connection.name)}
              onClick={() => onClose(session.connectionId)}
            >
              <Icon name="close" size={12} strokeWidth={2.6} />
            </button>
          </div>
        );
      })}
    </div>
    <button type="button" className="button button--ghost button--icon tabbar__new" aria-label={messages.tabs.newConnection} onClick={onNew}>
      <Icon name="plus" size={15} strokeWidth={2.4} />
    </button>
    <div className="tabbar__spacer" />
    <button
      type="button"
      className={`button button--outline tabbar__split${isSplitRequested ? ' button--selected' : ''}`}
      aria-pressed={isSplitRequested}
      disabled={sessions.length < 2}
      onClick={onToggleSplit}
    >
      <Icon name="split" size={15} />
      {messages.tabs.split}
    </button>
  </div>
  );
};
