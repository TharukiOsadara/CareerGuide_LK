import React, { useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import { useChild } from '../context/ChildContext';
import { parentApi } from '../services/parentApi';

// Edit / withdraw logic shared by the Counsellor tab and the full history screen.
// Returns handlers for InquiryCard plus the confirm dialog to render.
export function useInquiryActions() {
  const toast = useToast();
  const { invalidate } = useChild();
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleError = (err) => {
    toast({ type: 'error', title: "Couldn't save", message: err.message });
    // 409: the counsellor read it meanwhile - refresh so the card shows the new status.
    if (err.status === 409 || err.status === 404) invalidate();
  };

  const saveInquiry = async (inquiry, changes) => {
    try {
      await parentApi.updateInquiry(inquiry.id, changes);
      toast({ title: 'Question updated' });
      invalidate();
      return true;
    } catch (err) {
      handleError(err);
      return false;
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await parentApi.deleteInquiry(toDelete.id);
      toast({ title: 'Question withdrawn' });
      invalidate();
    } catch (err) {
      handleError(err);
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const dialog = (
    <ConfirmDialog
      visible={Boolean(toDelete)}
      title="Withdraw this question?"
      message="The counsellor won't see it. You can always send a new question."
      confirmLabel="Withdraw question"
      cancelLabel="Keep it"
      tone="danger"
      busy={deleting}
      onConfirm={confirmDelete}
      onCancel={() => setToDelete(null)}
    />
  );

  return { saveInquiry, requestDelete: setToDelete, dialog };
}
