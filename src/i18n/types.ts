import type { AuthMethod, Environment } from '../connections/types';
import type { SessionStatus } from '../sessions/useSessions';
import type { BackendMessageFormatters } from './backendMessage';

export type Locale = 'fr' | 'en';

export type Messages = {
  app: {
    noSession: string;
    importNoHosts: string;
    importAllPresent: string;
    imported: (count: number) => string;
    importFailed: (detail: string) => string;
  };
  titleBar: {
    minimize: string;
    maximize: string;
    close: string;
  };
  tabs: {
    label: string;
    close: (name: string) => string;
    newConnection: string;
    split: string;
  };
  empty: {
    noOpenSession: string;
    noOpenSessionHint: string;
    welcome: string;
    welcomeHint: string;
    addServer: string;
    importConfig: string;
  };
  status: {
    states: Record<SessionStatus, string>;
    noActiveSession: string;
    saveFailed: (detail: string) => string;
    savedServers: (count: number) => string;
    switchLanguage: string;
  };
  sidebar: {
    searchLabel: string;
    searchPlaceholder: string;
    newConnection: string;
    listLabel: string;
    noServers: string;
    noMatch: (query: string) => string;
    importConfig: string;
    settings: string;
    settingsSoon: string;
  };
  connectionRow: {
    states: Record<SessionStatus, string>;
    connectTo: (address: string) => string;
    delete: (name: string) => string;
    confirmDelete: (name: string) => string;
    deleteTitle: string;
    clickAgainToDelete: string;
    deleteQuestion: string;
  };
  environments: Record<Environment, { name: string; badge: string }>;
  auth: {
    methods: Record<AuthMethod, string>;
    password: string;
    agent: string;
    key: (keyName: string) => string;
  };
  dialog: {
    title: string;
    close: string;
    name: string;
    namePlaceholder: string;
    host: string;
    hostPlaceholder: string;
    port: string;
    user: string;
    group: string;
    authentication: string;
    privateKey: string;
    passwordHelp: string;
    agentHelp: string;
    cancel: string;
    save: string;
  };
  terminal: {
    productionWarning: string;
    retryHint: string;
    cancelled: string;
  };
  hostKey: {
    title: (host: string) => string;
    text: string;
    algorithm: string;
    fingerprint: string;
    refuse: string;
    trust: string;
  };
  secret: {
    password: string;
    passphrase: string;
    remember: string;
    cancel: string;
    connect: string;
  };
  backend: BackendMessageFormatters;
};
