import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';

// "Are you sure?" pop-up. onClose(true) = confirmed, onClose(false) = cancelled
export default function ConfirmDialog({ title, message, confirmLabel = 'Delete', onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose(false)}>
      <div className="modal modal-sm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <span className="confirm-icon"><TriangleAlert size={22} /></span>
        <h2 id="confirm-title">{title}</h2>
        <p className="muted">{message}</p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => onClose(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={() => onClose(true)} autoFocus>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
