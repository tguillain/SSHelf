import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { openUrl } from '@tauri-apps/plugin-opener';
import { ENVIRONMENT_COLORS, formatAddress } from '../connections/environments';
import type { Connection } from '../connections/types';
import { formatBackendMessage } from '../i18n/backendMessage';
import { useI18n } from '../i18n/useI18n';
import type { SessionStatus } from '../sessions/useSessions';
import { Icon } from '../ui/Icon';
import { copySelection, pasteInto } from './clipboard';
import { HostKeyPrompt } from './HostKeyPrompt';
import { SecretPrompt } from './SecretPrompt';
import { matchShortcut } from './shortcuts';
import { createSshSession, type SessionPrompt, type SshSession } from './sshSession';
import { TERMINAL_FONT, TERMINAL_THEME } from './terminalTheme';
import { TerminalSearch, type SearchDirection } from './TerminalSearch';

type TerminalPaneProps = {
  connection: Connection;
  label: string;
  fontSize: number;
  isVisible: boolean;
  isFocused: boolean;
  showHeader: boolean;
  onFocus: () => void;
  onStatusChange: (status: SessionStatus) => void;
};

const openLink = (event: MouseEvent, uri: string) => {
  if (event.ctrlKey || event.metaKey) {
    openUrl(uri).catch((error: unknown) => console.warn('Could not open link', error));
  }
};

export const TerminalPane = ({
  connection,
  label,
  fontSize,
  isVisible,
  isFocused,
  showHeader,
  onFocus,
  onStatusChange,
}: TerminalPaneProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const searchRef = useRef<SearchAddon | null>(null);
  const sessionRef = useRef<SshSession | null>(null);
  const onStatusChangeRef = useRef(onStatusChange);
  const connectionRef = useRef(connection);
  const fontSizeRef = useRef(fontSize);
  const { messages } = useI18n();
  const messagesRef = useRef(messages);
  const [prompt, setPrompt] = useState<SessionPrompt | null>(null);
  const [isSearchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    connectionRef.current = connection;
  }, [connection]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const terminal = new Terminal({
      fontFamily: TERMINAL_FONT,
      fontSize: fontSizeRef.current,
      lineHeight: 1.3,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      theme: TERMINAL_THEME,
    });
    const fit = new FitAddon();
    const search = new SearchAddon();
    terminal.loadAddon(fit);
    terminal.loadAddon(search);
    terminal.loadAddon(new WebLinksAddon(openLink));
    terminal.open(container);
    try {
      const webgl = new WebglAddon();
      webgl.onContextLoss(() => webgl.dispose());
      terminal.loadAddon(webgl);
    } catch (error) {
      console.warn('WebGL renderer unavailable, falling back to the default renderer', error);
    }
    if (container.offsetParent !== null) {
      fit.fit();
    }

    terminal.attachCustomKeyEventHandler((event) => {
      const shortcut = matchShortcut(event);
      if (!shortcut) {
        return true;
      }
      if (event.type === 'keydown') {
        if (shortcut === 'search') {
          event.preventDefault();
          setSearchOpen(true);
        } else if (shortcut === 'copy') {
          event.preventDefault();
          copySelection(terminal);
        } else if (shortcut === 'paste') {
          event.preventDefault();
          pasteInto(terminal);
        }
      }
      return false;
    });

    const handleMouseUp = () => {
      if (terminal.hasSelection()) {
        copySelection(terminal);
      }
    };
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      if (terminal.hasSelection()) {
        copySelection(terminal);
        terminal.clearSelection();
      } else {
        pasteInto(terminal);
      }
      terminal.focus();
    };
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('contextmenu', handleContextMenu);

    const session = createSshSession(terminal, () => connectionRef.current, {
      onStatus: (status) => onStatusChangeRef.current(status),
      onPrompt: setPrompt,
      messages: () => messagesRef.current,
    });
    const observer = new ResizeObserver(() => {
      if (container.offsetParent !== null) {
        fit.fit();
      }
    });
    observer.observe(container);
    terminalRef.current = terminal;
    fitRef.current = fit;
    searchRef.current = search;
    sessionRef.current = session;
    return () => {
      observer.disconnect();
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('contextmenu', handleContextMenu);
      session.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitRef.current = null;
      searchRef.current = null;
      sessionRef.current = null;
      setPrompt(null);
      setSearchOpen(false);
    };
  }, [connection.id]);

  useEffect(() => {
    fontSizeRef.current = fontSize;
    const terminal = terminalRef.current;
    if (!terminal || terminal.options.fontSize === fontSize) {
      return;
    }
    terminal.options.fontSize = fontSize;
    if (containerRef.current?.offsetParent) {
      fitRef.current?.fit();
    }
  }, [fontSize]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      fitRef.current?.fit();
      if (isFocused && !prompt && !isSearchOpen) {
        terminalRef.current?.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [isVisible, isFocused, prompt, isSearchOpen]);

  const handleFind = (query: string, direction: SearchDirection, incremental: boolean) => {
    const search = searchRef.current;
    if (!search || !query) {
      terminalRef.current?.clearSelection();
      return;
    }
    if (direction === 'next') {
      search.findNext(query, { incremental });
    } else {
      search.findPrevious(query);
    }
  };

  const color = ENVIRONMENT_COLORS[connection.environment];
  const secretMessage = prompt?.kind === 'secret' ? formatBackendMessage(messages.backend, prompt.message) : '';

  return (
    <section
      className={`pane${isVisible ? ' pane--visible' : ''}${isFocused ? ' pane--focused' : ''}`}
      aria-label={label}
      aria-hidden={!isVisible}
    >
      {showHeader && (
        <button type="button" className="pane__header" onClick={onFocus}>
          <span className="badge" style={{ color, background: `${color}24` }}>
            {messages.environments[connection.environment].badge}
          </span>
          <span className="pane__name">{label}</span>
          <span className="pane__address">{formatAddress(connection)}</span>
        </button>
      )}
      {connection.environment === 'prod' && (
        <div className="pane__warning">
          <Icon name="warning" size={14} />
          {messages.terminal.productionWarning}
        </div>
      )}
      <div className="pane__body">
        <div className="pane__terminal" ref={containerRef} onMouseDown={onFocus} />
        {isSearchOpen && <TerminalSearch onFind={handleFind} onClose={() => setSearchOpen(false)} />}
        {prompt && (
          <div className="pane__overlay">
            {prompt.kind === 'hostKey' ? (
              <HostKeyPrompt
                connection={connection}
                algorithm={prompt.algorithm}
                fingerprint={prompt.fingerprint}
                onAnswer={(accept) => sessionRef.current?.answerHostKey(accept)}
              />
            ) : (
              <SecretPrompt
                key={secretMessage}
                secretKind={prompt.secretKind}
                message={secretMessage}
                onSubmit={(secret, remember) => sessionRef.current?.submitSecret(secret, remember)}
                onCancel={() => sessionRef.current?.cancelPrompt()}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
};
