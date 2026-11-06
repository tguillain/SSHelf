import { useState, type RefObject } from 'react';
import { ENVIRONMENT_ORDER } from '../connections/environments';
import type { Connection, Environment } from '../connections/types';
import { useI18n } from '../i18n/useI18n';
import type { SessionStatus } from '../sessions/useSessions';
import { Icon } from '../ui/Icon';
import { ConnectionRow } from './ConnectionRow';

type SidebarProps = {
  connections: Connection[];
  activeId: string | null;
  searchRef: RefObject<HTMLInputElement | null>;
  statusOf: (connectionId: string) => SessionStatus | null;
  importMessage: string | null;
  onOpen: (connectionId: string) => void;
  onDelete: (connectionId: string) => void;
  onNew: () => void;
  onImport: () => void;
};

const matches = (connection: Connection, query: string) =>
  `${connection.name} ${connection.user}@${connection.host}`.toLowerCase().includes(query);

export const Sidebar = ({
  connections,
  activeId,
  searchRef,
  statusOf,
  importMessage,
  onOpen,
  onDelete,
  onNew,
  onImport,
}: SidebarProps) => {
  const { messages } = useI18n();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<Environment, boolean>>({ prod: false, staging: false, perso: false });
  const normalizedQuery = query.trim().toLowerCase();

  const groups = ENVIRONMENT_ORDER.map((environment) => ({
    environment,
    items: connections.filter(
      (connection) => connection.environment === environment && (!normalizedQuery || matches(connection, normalizedQuery)),
    ),
  })).filter((group) => group.items.length > 0);

  const toggleGroup = (environment: Environment) =>
    setCollapsed((current) => ({ ...current, [environment]: !current[environment] }));

  return (
    <aside className="sidebar">
      <div className="sidebar__top">
        <div className="search">
          <Icon name="search" size={15} />
          <input
            ref={searchRef}
            type="search"
            className="search__input"
            aria-label={messages.sidebar.searchLabel}
            placeholder={messages.sidebar.searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <kbd className="search__shortcut">Ctrl K</kbd>
        </div>
        <button type="button" className="button button--primary button--block" onClick={onNew}>
          <Icon name="plus" size={15} strokeWidth={2.4} />
          {messages.sidebar.newConnection}
        </button>
      </div>

      <nav className="sidebar__list" aria-label={messages.sidebar.listLabel}>
        {groups.map((group) => {
          const isOpen = Boolean(normalizedQuery) || !collapsed[group.environment];
          return (
            <div className="group" key={group.environment}>
              <button
                type="button"
                className="group__header"
                aria-expanded={isOpen}
                onClick={() => toggleGroup(group.environment)}
              >
                <span className={`group__chevron${isOpen ? ' group__chevron--open' : ''}`}>
                  <Icon name="chevron" size={12} strokeWidth={2.6} />
                </span>
                <span className="group__name">{messages.environments[group.environment].name}</span>
                <span className="group__count">{group.items.length}</span>
              </button>
              {isOpen &&
                group.items.map((connection) => (
                  <ConnectionRow
                    key={connection.id}
                    connection={connection}
                    status={statusOf(connection.id)}
                    isActive={connection.id === activeId}
                    onOpen={() => onOpen(connection.id)}
                    onDelete={() => onDelete(connection.id)}
                  />
                ))}
            </div>
          );
        })}
        {connections.length === 0 && (
          <p className="sidebar__hint">{messages.sidebar.noServers}</p>
        )}
        {connections.length > 0 && groups.length === 0 && (
          <p className="sidebar__hint">{messages.sidebar.noMatch(query)}</p>
        )}
      </nav>

      <div className="sidebar__footer">
        <button type="button" className="button button--ghost sidebar__import" onClick={onImport}>
          <Icon name="download" size={15} />
          <span className="sidebar__import-label">{importMessage ?? messages.sidebar.importConfig}</span>
        </button>
        <button type="button" className="button button--ghost button--icon" aria-label={messages.sidebar.settings} title={messages.sidebar.settingsSoon} disabled>
          <Icon name="settings" size={16} />
        </button>
      </div>
    </aside>
  );
};
