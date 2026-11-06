import { ENVIRONMENT_COLORS } from '../connections/environments';
import type { Connection } from '../connections/types';
import { useI18n } from '../i18n/useI18n';
import { Icon } from '../ui/Icon';

type EmptyStateProps = {
  recents: Connection[];
  onOpen: (connectionId: string) => void;
  onNew: () => void;
  onImport: () => void;
};

export const EmptyState = ({ recents, onOpen, onNew, onImport }: EmptyStateProps) => {
  const { messages } = useI18n();

  return (
  <div className="empty">
    <div className="empty__content">
      <span className="empty__logo">
        <Icon name="terminal" size={26} />
      </span>
      {recents.length > 0 ? (
        <>
          <h2 className="empty__title">{messages.empty.noOpenSession}</h2>
          <p className="empty__text">{messages.empty.noOpenSessionHint}</p>
          <div className="empty__actions">
            {recents.map((connection) => (
              <button key={connection.id} type="button" className="chip" onClick={() => onOpen(connection.id)}>
                <span className="tab__dot" style={{ background: ENVIRONMENT_COLORS[connection.environment] }} />
                {connection.name}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 className="empty__title">{messages.empty.welcome}</h2>
          <p className="empty__text">{messages.empty.welcomeHint}</p>
          <div className="empty__actions">
            <button type="button" className="button button--primary" onClick={onNew}>
              <Icon name="plus" size={15} strokeWidth={2.4} />
              {messages.empty.addServer}
            </button>
            <button type="button" className="button button--outline" onClick={onImport}>
              <Icon name="download" size={15} />
              {messages.empty.importConfig}
            </button>
          </div>
        </>
      )}
    </div>
  </div>
  );
};
