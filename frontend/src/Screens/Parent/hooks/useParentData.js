import { useCallback, useEffect, useRef, useState } from 'react';
import { useChild } from '../context/ChildContext';

// Loads data for the selected child.
// - Waits until `active` (tabs load on first visit) and refetches each time the
//   tab becomes active again, the child changes, or invalidate() is called.
// - Clears old data when the child changes so one child's data never shows under another's name.
// - Ignores responses from superseded requests.
export function useParentData(fetcher, { active = true } = {}) {
  const { selectedChild, version } = useChild();
  const studentId = selectedChild?.studentId ?? null;

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestId = useRef(0);
  const loadedFor = useRef(null);

  const load = useCallback(
    async ({ pull = false } = {}) => {
      if (studentId === null) return;
      const id = ++requestId.current;
      if (pull) setRefreshing(true);
      else setLoading(true);
      try {
        const result = await fetcherRef.current(studentId);
        if (id !== requestId.current) return;
        setData(result);
        setError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [studentId]
  );

  useEffect(() => {
    if (!active || studentId === null) return;
    if (loadedFor.current !== studentId) {
      loadedFor.current = studentId;
      setData(null);
      setError(null);
    }
    load();
  }, [active, studentId, version, load]);

  return {
    data,
    error,
    loading: loading && !data,
    refreshing,
    reload: () => load(),
    refresh: () => load({ pull: true }),
    setData,
  };
}
