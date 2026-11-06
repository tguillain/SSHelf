import { useCallback, useMemo, useState } from 'react';

export type SessionStatus = 'connecting' | 'connected' | 'closed';

export type Session = {
  id: string;
  connectionId: string;
  ordinal: number;
  status: SessionStatus;
};

const STATUS_PRIORITY: SessionStatus[] = ['connected', 'connecting', 'closed'];

export const useSessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [isSplitRequested, setSplitRequested] = useState(false);

  const focus = (sessionId: string) => {
    if (sessionId === activeId) {
      return;
    }
    setPartnerId(activeId);
    setActiveId(sessionId);
  };

  const openNew = (connectionId: string) => {
    const ordinals = sessions.filter((session) => session.connectionId === connectionId).map((session) => session.ordinal);
    const session: Session = {
      id: crypto.randomUUID(),
      connectionId,
      ordinal: ordinals.length > 0 ? Math.max(...ordinals) + 1 : 1,
      status: 'connecting',
    };
    setSessions((current) => [...current, session]);
    setPartnerId(activeId);
    setActiveId(session.id);
  };

  const open = (connectionId: string) => {
    const active = sessions.find((session) => session.id === activeId);
    if (active?.connectionId === connectionId) {
      return;
    }
    const existing = sessions.find((session) => session.connectionId === connectionId);
    if (existing) {
      focus(existing.id);
      return;
    }
    openNew(connectionId);
  };

  const removeWhere = (shouldRemove: (session: Session) => boolean) => {
    const remaining = sessions.filter((session) => !shouldRemove(session));
    if (remaining.length === sessions.length) {
      return;
    }
    setSessions(remaining);
    if (!remaining.some((session) => session.id === activeId)) {
      const activeIndex = sessions.findIndex((session) => session.id === activeId);
      const fallback = remaining[Math.min(Math.max(activeIndex, 0), remaining.length - 1)];
      setActiveId(fallback?.id ?? null);
    }
    if (remaining.length < 2) {
      setSplitRequested(false);
    }
  };

  const close = (sessionId: string) => removeWhere((session) => session.id === sessionId);

  const closeConnection = (connectionId: string) => removeWhere((session) => session.connectionId === connectionId);

  const setStatus = useCallback((sessionId: string, status: SessionStatus) => {
    setSessions((current) => current.map((session) => (session.id === sessionId ? { ...session, status } : session)));
  }, []);

  const visibleIds = useMemo(() => {
    if (!activeId) {
      return [];
    }
    if (!isSplitRequested) {
      return [activeId];
    }
    const partnerIsOpen = sessions.some((session) => session.id === partnerId);
    const partner =
      partnerId && partnerId !== activeId && partnerIsOpen
        ? partnerId
        : sessions.find((session) => session.id !== activeId)?.id;
    return partner ? [activeId, partner] : [activeId];
  }, [activeId, partnerId, isSplitRequested, sessions]);

  const activeSession = sessions.find((session) => session.id === activeId) ?? null;

  const statusOfConnection = (connectionId: string) => {
    const statuses = sessions.filter((session) => session.connectionId === connectionId).map((session) => session.status);
    return STATUS_PRIORITY.find((status) => statuses.includes(status)) ?? null;
  };

  return {
    sessions,
    activeId,
    activeSession,
    visibleIds,
    isSplit: visibleIds.length > 1,
    isSplitRequested,
    toggleSplit: () => setSplitRequested((current) => !current),
    open,
    openNew,
    close,
    closeConnection,
    focus,
    setStatus,
    statusOfConnection,
  };
};
