type NoParams = object;

export type BackendMessageParams = {
  connecting: { host: string; port: number };
  authenticating: { user: string };
  hostKeyLearned: NoParams;
  hostKeyNotSaved: { detail: string };
  networkError: { detail: string };
  closedByServer: NoParams;
  serverUnresponsive: NoParams;
  protocolError: { detail: string };
  hostKeyRejected: NoParams;
  hostKeyChanged: { fingerprint: string; line: number };
  hostCertificateUnsupported: NoParams;
  homeNotFound: NoParams;
  passwordNeeded: { user: string; host: string };
  passwordRejected: NoParams;
  keyNotFound: { path: string };
  passphraseNeeded: { keyName: string };
  passphraseRejected: NoParams;
  keyUnreadable: { keyName: string; detail: string };
  keyRejected: { keyName: string; user: string };
  agentError: { detail: string };
  agentKeysRejected: { user: string };
  agentUnreachable: NoParams;
  tcpTimeout: { host: string; port: number };
  tcpUnreachable: { host: string; port: number; detail: string };
  handshakeTimeout: NoParams;
  sessionExited: { status: number };
  connectionLost: NoParams;
  sessionEnded: NoParams;
  sessionClosed: NoParams;
};

export type BackendMessageKey = keyof BackendMessageParams;

export type BackendMessage<Key extends BackendMessageKey = BackendMessageKey> = {
  [Name in Key]: { key: Name } & BackendMessageParams[Name];
}[Key];

export type BackendMessageFormatters = {
  [Name in BackendMessageKey]: (params: BackendMessageParams[Name]) => string;
};

export const formatBackendMessage = <Key extends BackendMessageKey>(
  formatters: BackendMessageFormatters,
  message: BackendMessage<Key>,
) => formatters[message.key](message);
