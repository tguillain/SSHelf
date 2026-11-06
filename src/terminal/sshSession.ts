import { Channel } from '@tauri-apps/api/core';
import type { Terminal } from '@xterm/xterm';
import {
  sshAnswerHostKey,
  sshClose,
  sshConnect,
  sshResize,
  sshWrite,
  toConnectError,
  type SessionEvent,
} from '../backend';
import type { Connection } from '../connections/types';
import { formatBackendMessage, type BackendMessage } from '../i18n/backendMessage';
import type { Messages } from '../i18n/types';
import type { SessionStatus } from '../sessions/useSessions';

const paint = (code: string) => (text: string) => `\x1b[${code}m${text}\x1b[0m`;
const dim = paint('90');
const blue = paint('34');
const yellow = paint('33');
const red = paint('31');

const NEWLINE = '\r\n';

export type SecretKind = 'password' | 'passphrase';

export type SessionPrompt =
  | { kind: 'hostKey'; algorithm: string; fingerprint: string }
  | { kind: 'secret'; secretKind: SecretKind; message: BackendMessage };

export type SessionCallbacks = {
  onStatus: (status: SessionStatus) => void;
  onPrompt: (prompt: SessionPrompt | null) => void;
  messages: () => Messages;
};

export type SshSession = {
  answerHostKey: (accept: boolean) => void;
  submitSecret: (secret: string, remember: boolean) => void;
  cancelPrompt: () => void;
  dispose: () => void;
};

type Phase = 'connecting' | 'connected' | 'closed' | 'disposed';

export const createSshSession = (
  terminal: Terminal,
  currentConnection: () => Connection,
  callbacks: SessionCallbacks,
): SshSession => {
  let phase: Phase = 'connecting';
  let sessionId: string | null = null;
  let isAwaitingHostKey = false;

  const describe = (message: BackendMessage) => formatBackendMessage(callbacks.messages().backend, message);

  const setPhase = (next: Exclude<Phase, 'disposed'>) => {
    if (phase === 'disposed') {
      return;
    }
    phase = next;
    callbacks.onStatus(next);
  };

  const showClosed = (message: string, colorize: (text: string) => string) => {
    sessionId = null;
    terminal.write(NEWLINE + colorize(message) + NEWLINE + dim(callbacks.messages().terminal.retryHint) + NEWLINE);
    setPhase('closed');
  };

  const connect = async (secret: string | null = null, rememberSecret = false) => {
    const id = crypto.randomUUID();
    sessionId = id;
    setPhase('connecting');

    const events = new Channel<SessionEvent>();
    events.onmessage = (event) => {
      if (sessionId !== id || phase === 'disposed') {
        return;
      }
      if (event.kind === 'progress') {
        terminal.write(`${blue('→')} ${describe(event.message)}${NEWLINE}`);
      } else if (event.kind === 'hostKeyPrompt') {
        isAwaitingHostKey = true;
        callbacks.onPrompt({ kind: 'hostKey', algorithm: event.algorithm, fingerprint: event.fingerprint });
      } else {
        showClosed(describe(event.reason), yellow);
      }
    };

    const output = new Channel<ArrayBuffer>();
    output.onmessage = (data) => {
      if (sessionId === id) {
        terminal.write(new Uint8Array(data));
      }
    };

    try {
      await sshConnect(
        {
          sessionId: id,
          connection: currentConnection(),
          secret,
          rememberSecret,
          cols: terminal.cols,
          rows: terminal.rows,
        },
        events,
        output,
      );
      if (phase === 'disposed') {
        void sshClose(id);
        return;
      }
      if (sessionId === id) {
        setPhase('connected');
        void sshResize(id, terminal.cols, terminal.rows);
      }
    } catch (raw) {
      if (sessionId !== id || phase === 'disposed') {
        return;
      }
      isAwaitingHostKey = false;
      callbacks.onPrompt(null);
      const error = toConnectError(raw);
      if (error.code === 'passwordRequired' || error.code === 'passphraseRequired') {
        sessionId = null;
        callbacks.onPrompt({
          kind: 'secret',
          secretKind: error.code === 'passwordRequired' ? 'password' : 'passphrase',
          message: error.message,
        });
        return;
      }
      showClosed(`✗ ${describe(error.message)}`, red);
    }
  };

  const dataSubscription = terminal.onData((data) => {
    if (phase === 'connected' && sessionId) {
      void sshWrite(sessionId, data);
    } else if (phase === 'closed' && data === '\r') {
      terminal.write(NEWLINE);
      void connect();
    }
  });

  const resizeSubscription = terminal.onResize(({ cols, rows }) => {
    if (phase === 'connected' && sessionId) {
      void sshResize(sessionId, cols, rows);
    }
  });

  void connect();

  return {
    answerHostKey: (accept) => {
      callbacks.onPrompt(null);
      if (sessionId && isAwaitingHostKey) {
        isAwaitingHostKey = false;
        void sshAnswerHostKey(sessionId, accept);
      }
    },
    submitSecret: (secret, remember) => {
      callbacks.onPrompt(null);
      void connect(secret, remember);
    },
    cancelPrompt: () => {
      callbacks.onPrompt(null);
      showClosed(callbacks.messages().terminal.cancelled, yellow);
    },
    dispose: () => {
      const id = sessionId;
      const wasAwaitingHostKey = isAwaitingHostKey;
      phase = 'disposed';
      sessionId = null;
      dataSubscription.dispose();
      resizeSubscription.dispose();
      if (id && wasAwaitingHostKey) {
        void sshAnswerHostKey(id, false);
      } else if (id) {
        void sshClose(id);
      }
    },
  };
};
