import { ENVIRONMENTS } from '../connections/environments';
import type { Connection } from '../connections/types';
import { Icon } from '../ui/Icon';

type EmptyStateProps = {
  recents: Connection[];
  onOpen: (connectionId: string) => void;
  onNew: () => void;
  onImport: () => void;
};

export const EmptyState = ({ recents, onOpen, onNew, onImport }: EmptyStateProps) => (
  <div className="empty">
    <div className="empty__content">
      <span className="empty__logo">
        <Icon name="terminal" size={26} />
      </span>
      {recents.length > 0 ? (
        <>
          <h2 className="empty__title">Aucune session ouverte</h2>
          <p className="empty__text">Cliquez sur un serveur dans la liste pour ouvrir une session dans un nouvel onglet.</p>
          <div className="empty__actions">
            {recents.map((connection) => (
              <button key={connection.id} type="button" className="chip" onClick={() => onOpen(connection.id)}>
                <span className="tab__dot" style={{ background: ENVIRONMENTS[connection.environment].color }} />
                {connection.name}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <h2 className="empty__title">Bienvenue dans SSHelf</h2>
          <p className="empty__text">Enregistrez vos serveurs une fois, puis connectez-vous en un clic.</p>
          <div className="empty__actions">
            <button type="button" className="button button--primary" onClick={onNew}>
              <Icon name="plus" size={15} strokeWidth={2.4} />
              Ajouter un serveur
            </button>
            <button type="button" className="button button--outline" onClick={onImport}>
              <Icon name="download" size={15} />
              Importer ~/.ssh/config
            </button>
          </div>
        </>
      )}
    </div>
  </div>
);
