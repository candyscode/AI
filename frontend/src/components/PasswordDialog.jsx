import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Lock } from 'lucide-react';

export default function PasswordDialog({
  isOpen,
  title = 'Password Required',
  message,
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel = 'Unlock',
  cancelLabel = 'Cancel',
  error = '',
  allowCancel = true,
}) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={allowCancel ? onCancel : undefined}>
      <div
        className="modal-content confirm-dialog password-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-dialog-header">
          <div className="confirm-dialog-icon">
            <Lock size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>{title}</h3>
            <p className="confirm-dialog-message">{message}</p>
          </div>
        </div>

        <div className="password-dialog-body">
          <label className="settings-field ga-field" style={{ marginBottom: 0 }}>
            <span className="settings-field-label">Password</span>
            <input
              ref={inputRef}
              className="form-input"
              type="password"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onSubmit();
                if (event.key === 'Escape' && allowCancel) onCancel?.();
              }}
              placeholder="Enter password"
            />
          </label>

          {error ? <p className="password-dialog-error">{error}</p> : null}
        </div>

        <div className="confirm-dialog-actions">
          {allowCancel ? <button className="btn-secondary" onClick={onCancel}>{cancelLabel}</button> : null}
          <button className="btn-primary" onClick={onSubmit}>
            {submitLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
