import { Channel, invoke } from '@tauri-apps/api/core';
import type { Connection, ImportedHost } from './connections/types';
import type { BackendMessage } from './i18n/backendMessage';

export const loadConnections = () => invoke<Connection[]>('load_connections');

export const saveConnections = (connections: Connection[]) =>
  invoke<void>('save_connections', { connections });

export const importSshConfig = () => invoke<ImportedHost[]>('import_ssh_config');

export const listPrivateKeys = () => invoke<string[]>('list_private_keys');

export type SessionEvent =
  | { kind: 'progress'; message: BackendMessage }
  | { kind: 'hostKeyPrompt'; algorithm: string; fingerprint: string }
  | { kind: 'closed'; reason: BackendMessage };

export type ConnectErrorCode =
  | 'passwordRequired'
  | 'passphraseRequired'
  | 'authFailed'
  | 'hostKeyRejected'
  | 'hostKeyChanged'
  | 'timeout'
  | 'network'
  | 'agent'
  | 'key'
  | 'protocol';

export type ConnectError = {
  code: ConnectErrorCode;
  message: BackendMessage;
};

export type ConnectRequest = {
  sessionId: string;
  connection: Connection;
  secret: string | null;
  rememberSecret: boolean;
  cols: number;
  rows: number;
};

const isConnectError = (value: unknown): value is ConnectError =>
  typeof value === 'object' && value !== null && 'code' in value && 'message' in value;

export const toConnectError = (error: unknown): ConnectError =>
  isConnectError(error) ? error : { code: 'protocol', message: { key: 'protocolError', detail: String(error) } };

export const sshConnect = (request: ConnectRequest, events: Channel<SessionEvent>, output: Channel<ArrayBuffer>) =>
  invoke<void>('ssh_connect', { request, events, output });

export const sshWrite = (sessionId: string, data: string) => invoke<void>('ssh_write', { sessionId, data });

export const sshResize = (sessionId: string, cols: number, rows: number) =>
  invoke<void>('ssh_resize', { sessionId, cols, rows });

export const sshClose = (sessionId: string) => invoke<void>('ssh_close', { sessionId });

export const sshAnswerHostKey = (sessionId: string, accept: boolean) =>
  invoke<void>('ssh_answer_host_key', { sessionId, accept });
