import type { Connection } from '../connections/types';
import type { Session } from './useSessions';

export const sessionLabel = (connection: Connection, session: Session) =>
  session.ordinal > 1 ? `${connection.name} (${session.ordinal})` : connection.name;
