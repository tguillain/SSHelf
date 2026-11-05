import type { Connection, ImportedHost } from './types';

const keyNameFromPath = (path: string) => path.split(/[\\/]/).pop() ?? path;

export const fromImportedHost = (host: ImportedHost): Connection => ({
  id: crypto.randomUUID(),
  name: host.alias,
  user: host.user ?? 'root',
  host: host.hostName ?? host.alias,
  port: host.port ?? 22,
  environment: 'perso',
  auth: host.identityFile ? 'key' : 'agent',
  keyName: host.identityFile ? keyNameFromPath(host.identityFile) : 'id_ed25519',
});
