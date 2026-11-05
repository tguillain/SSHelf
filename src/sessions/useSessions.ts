import { useCallback, useMemo, useState } from 'react';

export type SessionStatus = 'connecting' | 'connected' | 'closed';

export type Session = {
  connectionId: string;
  status: SessionStatus;
};

export const useSessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [isSplitRequested, setSplitRequested] = useState(false);

  const focus = (connectionId: string) => {
    if (connectionId === activeId) {
      return;
    }
    setPartnerId(activeId);
    setActiveId(connectionId);
  };

  const open = (connectionId: string) => {
    if (sessions.some((session) => session.connectionId === connectionId)) {
      focus(connectionId);
      return;
    }
    setSessions((current) => [...current, { connectionId, status: 'connecting' }]);
    setPartnerId(activeId);
    setActiveId(connectionId);
  };

  const close = (connectionId: string) => {
    const index = sessions.findIndex((session) => session.connectionId === connectionId);
    if (index === -1) {
      return;
    }
    const remaining = sessions.filter((session) => session.connectionId !== connectionId);
    setSessions(remaining);
    if (activeId === connectionId) {
      setActiveId(remaining[Math.min(index, remaining.length - 1)]?.connectionId ?? null);
    }
    if (remaining.length < 2) {
      setSplitRequested(false);
    }
  };

  const setStatus = useCallback((connectionId: string, status: SessionStatus) => {
    setSessions((current) =>
      current.map((session) => (session.connectionId === connectionId ? { ...session, status } : session)),
    );
  }, []);

  const visibleIds = useMemo(() => {
    if (!activeId) {
      return [];
    }
    if (!isSplitRequested) {
      return [activeId];
    }
    const partnerIsOpen = sessions.some((session) => session.connectionId === partnerId);
    const partner =
      partnerId && partnerId !== activeId && partnerIsOpen
        ? partnerId
        : sessions.find((session) => session.connectionId !== activeId)?.connectionId;
    return partner ? [activeId, partner] : [activeId];
  }, [activeId, partnerId, isSplitRequested, sessions]);

  const statusOf = (connectionId: string) =>
    sessions.find((session) => session.connectionId === connectionId)?.status ?? null;

  return {
    sessions,
    activeId,
    visibleIds,
    isSplit: visibleIds.length > 1,
    isSplitRequested,
    toggleSplit: () => setSplitRequested((current) => !current),
    open,
    close,
    focus,
    setStatus,
    statusOf,
  };
};
