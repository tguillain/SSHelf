import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { ENVIRONMENT_COLORS, formatAddress } from '../connections/environments';
import type { Connection } from '../connections/types';
import { formatBackendMessage } from '../i18n/backendMessage';
import { useI18n } from '../i18n/useI18n';
import type { SessionStatus } from '../sessions/useSessions';
import { Icon } from '../ui/Icon';
import { HostKeyPrompt } from './HostKeyPrompt';
import { SecretPrompt } from './SecretPrompt';
import { createSshSession, type SessionPrompt, type SshSession } from './sshSession';
import { TERMINAL_FONT, TERMINAL_THEME } from './terminalTheme';

type TerminalPaneProps = {
  connection: Connection;
  isVisible: boolean;
  isFocused: boolean;
  showHeader: boolean;
  onFocus: () => void;
  onStatusChange: (status: SessionStatus) => void;
};

export const TerminalPane = ({
  connection,
  isVisible,
  isFocused,
  showHeader,
  onFocus,
  onStatusChange,
}: TerminalPaneProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const sessionRef = useRef<SshSession | null>(null);
  const onStatusChangeRef = useRef(onStatusChange);
  const { messages } = useI18n();
  const messagesRef = useRef(messages);
  const [prompt, setPrompt] = useState<SessionPrompt | null>(null);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const terminal = new Terminal({
      fontFamily: TERMINAL_FONT,
      fontSize: 13,
      lineHeight: 1.3,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      theme: TERMINAL_THEME,
    });
    const fit = new FitAddon();
    terminal.loadAddon(fit);
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
    const session = createSshSession(terminal, connection, {
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
    sessionRef.current = session;
    return () => {
      observer.disconnect();
      session.dispose();
      terminal.dispose();
      terminalRef.current = null;
      fitRef.current = null;
      sessionRef.current = null;
      setPrompt(null);
    };
  }, [connection]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      fitRef.current?.fit();
      if (isFocused && !prompt) {
        terminalRef.current?.focus();
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [isVisible, isFocused, prompt]);

  const color = ENVIRONMENT_COLORS[connection.environment];
  const secretMessage = prompt?.kind === 'secret' ? formatBackendMessage(messages.backend, prompt.message) : '';

  return (
    <section
      className={`pane${isVisible ? ' pane--visible' : ''}${isFocused ? ' pane--focused' : ''}`}
      aria-label={connection.name}
      aria-hidden={!isVisible}
    >
      {showHeader && (
        <button type="button" className="pane__header" onClick={onFocus}>
          <span className="badge" style={{ color, background: `${color}24` }}>
            {messages.environments[connection.environment].badge}
          </span>
          <span className="pane__name">{connection.name}</span>
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
