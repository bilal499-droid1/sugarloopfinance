import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import { buttonClass } from './Field';

// Button for destructive actions: opens a confirmation dialog and runs
// `onConfirm` only after the user confirms there. The dialog stays open
// (with a busy state) until `onConfirm` finishes.
export default function ConfirmButton({
  onConfirm,
  children,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  className = '',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <>
      <button type="button" disabled={disabled} onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open &&
        createPortal(
          <Modal
            title={title}
            onClose={() => !busy && setOpen(false)}
            width="max-w-md"
            footer={
              <>
                <button type="button" disabled={busy} onClick={() => setOpen(false)} className={buttonClass.secondary}>
                  Cancel
                </button>
                <button
                  type="button"
                  autoFocus
                  disabled={busy}
                  onClick={confirm}
                  className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {busy ? 'Working…' : confirmLabel}
                </button>
              </>
            }
          >
            <p className="flex gap-3 text-sm text-slate-700">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
              <span>{message ?? 'This cannot be undone.'}</span>
            </p>
          </Modal>,
          document.body
        )}
    </>
  );
}
