import type { Messages } from '../i18n/types';
import type { AuthMethod, Connection, Environment } from './types';

export const ENVIRONMENT_COLORS: Record<Environment, string> = {
  prod: '#FF7B72',
  staging: '#E3B341',
  perso: '#79C0FF',
};

export const ENVIRONMENT_ORDER: Environment[] = ['prod', 'staging', 'perso'];

export const AUTH_METHOD_ORDER: AuthMethod[] = ['key', 'password', 'agent'];

export const describeAuth = (connection: Connection, messages: Messages) => {
  if (connection.auth === 'password') {
    return messages.auth.password;
  }
  if (connection.auth === 'agent') {
    return messages.auth.agent;
  }
  return messages.auth.key(connection.keyName);
};

export const formatAddress = (connection: Connection) =>
  `${connection.user}@${connection.host}${connection.port === 22 ? '' : `:${connection.port}`}`;
