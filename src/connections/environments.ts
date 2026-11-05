import type { AuthMethod, Connection, Environment } from './types';

type EnvironmentInfo = {
  name: string;
  badge: string;
  color: string;
};

export const ENVIRONMENTS: Record<Environment, EnvironmentInfo> = {
  prod: { name: 'Production', badge: 'PROD', color: '#FF7B72' },
  staging: { name: 'Staging', badge: 'STAGING', color: '#E3B341' },
  perso: { name: 'Perso', badge: 'PERSO', color: '#79C0FF' },
};

export const ENVIRONMENT_ORDER: Environment[] = ['prod', 'staging', 'perso'];

export const AUTH_METHODS: { value: AuthMethod; label: string }[] = [
  { value: 'key', label: 'Clé SSH' },
  { value: 'password', label: 'Mot de passe' },
  { value: 'agent', label: 'Agent SSH' },
];

export const describeAuth = (connection: Connection) => {
  if (connection.auth === 'password') {
    return 'mot de passe';
  }
  if (connection.auth === 'agent') {
    return 'agent SSH';
  }
  return `clé ${connection.keyName}`;
};

export const formatAddress = (connection: Connection) =>
  `${connection.user}@${connection.host}${connection.port === 22 ? '' : `:${connection.port}`}`;
