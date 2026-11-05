export type Environment = 'prod' | 'staging' | 'perso';

export type AuthMethod = 'key' | 'password' | 'agent';

export type Connection = {
  id: string;
  name: string;
  user: string;
  host: string;
  port: number;
  environment: Environment;
  auth: AuthMethod;
  keyName: string;
};

export type ImportedHost = {
  alias: string;
  hostName: string | null;
  user: string | null;
  port: number | null;
  identityFile: string | null;
};
