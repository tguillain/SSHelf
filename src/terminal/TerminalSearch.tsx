import { useState, type KeyboardEvent } from 'react';
import { useI18n } from '../i18n/useI18n';
import { Icon } from '../ui/Icon';

export type SearchDirection = 'next' | 'previous';

type TerminalSearchProps = {
  onFind: (query: string, direction: SearchDirection, incremental: boolean) => void;
  onClose: () => void;
};

export const TerminalSearch = ({ onFind, onClose }: TerminalSearchProps) => {
  const { messages } = useI18n();
  const [query, setQuery] = useState('');

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      onFind(query, event.shiftKey ? 'previous' : 'next', false);
    }
  };

  return (
    <div className="terminal-search" role="search">
      <Icon name="search" size={14} />
      <input
        className="terminal-search__input"
        aria-label={messages.terminal.searchPlaceholder}
        placeholder={messages.terminal.searchPlaceholder}
        autoFocus
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          onFind(event.target.value, 'next', true);
        }}
        onKeyDown={handleKeyDown}
      />
      <button
        type="button"
        className="terminal-search__button"
        aria-label={messages.terminal.searchPrevious}
        title={messages.terminal.searchPrevious}
        onClick={() => onFind(query, 'previous', false)}
      >
        <Icon name="chevron" size={13} strokeWidth={2.4} className="icon--up" />
      </button>
      <button
        type="button"
        className="terminal-search__button"
        aria-label={messages.terminal.searchNext}
        title={messages.terminal.searchNext}
        onClick={() => onFind(query, 'next', false)}
      >
        <Icon name="chevron" size={13} strokeWidth={2.4} className="icon--down" />
      </button>
      <button
        type="button"
        className="terminal-search__button"
        aria-label={messages.terminal.searchClose}
        title={messages.terminal.searchClose}
        onClick={onClose}
      >
        <Icon name="close" size={13} strokeWidth={2.4} />
      </button>
    </div>
  );
};
