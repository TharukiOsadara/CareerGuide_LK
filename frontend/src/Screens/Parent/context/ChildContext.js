import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { parentApi } from '../services/parentApi';

// Holds the parent's linked children, which child is selected, and a `version`
// counter. Screens include `version` in their data keys, so calling
// invalidate() after any change makes every open screen refetch.
const ChildContext = createContext(null);

export function ChildProvider({ children }) {
  const [linkedChildren, setLinkedChildren] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { children: list } = await parentApi.getChildren();
      setLinkedChildren(list);
      setSelectedId((prev) => (list.some((c) => c.studentId === prev) ? prev : list[0]?.studentId ?? null));
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const invalidate = useCallback(() => setVersion((v) => v + 1), []);

  const value = useMemo(
    () => ({
      linkedChildren,
      selectedChild: linkedChildren.find((c) => c.studentId === selectedId) || null,
      selectChild: setSelectedId,
      status,
      error,
      reload: load,
      version,
      invalidate,
    }),
    [linkedChildren, selectedId, status, error, load, version, invalidate]
  );

  return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>;
}

export function useChild() {
  const ctx = useContext(ChildContext);
  if (!ctx) throw new Error('useChild must be used inside ChildProvider');
  return ctx;
}
