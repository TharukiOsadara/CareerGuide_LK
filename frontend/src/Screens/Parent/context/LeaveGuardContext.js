import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

// Lets a screen with unsaved edits (Privacy) block tab or child switches.
// The screen registers a function that returns true while it has unsaved changes;
// requestLeave(action) runs the action directly, or after the parent confirms.
const LeaveGuardContext = createContext(null);

export function LeaveGuardProvider({ children }) {
  const guardRef = useRef(null);
  const [pending, setPending] = useState(null);

  const setLeaveGuard = useCallback((fn) => {
    guardRef.current = fn;
  }, []);

  const requestLeave = useCallback((action) => {
    if (guardRef.current?.()) {
      setPending(() => action);
    } else {
      action();
    }
  }, []);

  const value = useMemo(() => ({ setLeaveGuard, requestLeave }), [setLeaveGuard, requestLeave]);

  return (
    <LeaveGuardContext.Provider value={value}>
      {children}
      <ConfirmDialog
        visible={Boolean(pending)}
        title="Discard your changes?"
        message="You changed your privacy choices but haven't saved them."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        tone="danger"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const action = pending;
          guardRef.current = null;
          setPending(null);
          action?.();
        }}
      />
    </LeaveGuardContext.Provider>
  );
}

export function useLeaveGuard() {
  const ctx = useContext(LeaveGuardContext);
  if (!ctx) throw new Error('useLeaveGuard must be used inside LeaveGuardProvider');
  return ctx;
}
