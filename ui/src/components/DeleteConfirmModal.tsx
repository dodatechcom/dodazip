import React, { useEffect } from 'react'
import { IconTrash, IconShred } from './Icons'
import { formatSize } from '../utils/helpers'

export interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isSecure: boolean
  targets: Array<{ name: string; path: string; size?: number; is_dir?: boolean }>
  busy?: boolean
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isSecure,
  targets,
  busy = false,
}) => {
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter' && !busy) {
        e.preventDefault()
        onConfirm()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, busy, onConfirm, onClose])

  if (!isOpen || targets.length === 0) return null

  const isSingle = targets.length === 1
  const single = targets[0]
  const totalBytes = targets.reduce((acc, t) => acc + (t.size || 0), 0)

  return (
    <div className="modal-backdrop-acrylic" onClick={busy ? undefined : onClose}>
      <div
        className="modal-window-modern"
        style={{ maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-win-header">
          <div className="modal-win-title">
            <div
              className="modal-win-icon-badge"
              style={{
                background: isSecure ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.10)',
                color: isSecure ? '#ef4444' : '#dc2626',
              }}
            >
              {isSecure ? <IconShred size={18} /> : <IconTrash size={18} />}
            </div>
            <div>
              <span className="modal-win-title-text">
                {isSecure
                  ? `Permanently Shred ${isSingle ? 'File' : `${targets.length} Files`}?`
                  : `Delete ${isSingle ? 'Item' : `${targets.length} Items`}?`}
              </span>
              <span className="modal-win-subtitle">
                {isSecure
                  ? 'Military-grade cryptographic overwrite before deletion'
                  : 'Standard file removal'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="modal-win-close-btn"
            onClick={busy ? undefined : onClose}
            disabled={busy}
            title="Cancel (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-win-body" style={{ gap: 12 }}>
          {/* Target Items Card */}
          <div
            style={{
              background: 'var(--bg-main)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {isSingle ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {single.is_dir ? '📁' : '📄'} {single.name}
                </span>
                {single.size !== undefined && single.size > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>
                    {formatSize(single.size)}
                  </span>
                )}
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {targets.length} selected items ({formatSize(totalBytes)})
                </div>
                <div
                  style={{
                    maxHeight: 90,
                    overflowY: 'auto',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    marginTop: 6,
                    lineHeight: 1.5,
                  }}
                >
                  {targets.slice(0, 5).map((t) => (
                    <div key={t.path}>• {t.name}</div>
                  ))}
                  {targets.length > 5 && <div>...and {targets.length - 5} more items</div>}
                </div>
              </div>
            )}
          </div>

          {/* Educational Explanation Box (Explaining the Difference) */}
          {isSecure ? (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 8,
                padding: '12px 14px',
                fontSize: 11.5,
                lineHeight: 1.45,
                color: 'var(--text-primary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>
                <span>🔒</span>
                <span>What is Secure Shred?</span>
                <span
                  style={{
                    fontSize: 9,
                    background: '#dc2626',
                    color: '#fff',
                    padding: '1px 5px',
                    borderRadius: 3,
                    marginLeft: 'auto',
                    fontWeight: 800,
                  }}
                >
                  UNRECOVERABLE
                </span>
              </div>
              <div>
                Normal delete only removes file links, leaving your data recoverable on disk.
                <strong> Secure Shred overwrites disk sectors with random noise and zeroes</strong> before deletion.
              </div>
              <div style={{ marginTop: 6, color: '#dc2626', fontWeight: 600, fontSize: 11 }}>
                ⚠️ Warning: Once shredded, this file CANNOT be restored from the Recycle Bin or recovered by forensic tools.
              </div>
            </div>
          ) : (
            <div
              style={{
                background: 'var(--bg-main)',
                border: '1px dashed var(--border)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 11.5,
                lineHeight: 1.45,
                color: 'var(--text-secondary)',
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                💡 Standard Deletion
              </div>
              <div>
                This item will be removed from your current folder.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-win-footer">
          <button
            type="button"
            className="modal-btn-cancel"
            onClick={busy ? undefined : onClose}
            disabled={busy}
          >
            Cancel <span className="modal-key-hint">Esc</span>
          </button>
          <button
            type="button"
            className="modal-btn-primary"
            style={{
              background: isSecure
                ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
                : 'linear-gradient(135deg, #ef4444, #dc2626)',
              borderColor: '#dc2626',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
            }}
            onClick={onConfirm}
            disabled={busy}
            autoFocus
          >
            {isSecure ? <IconShred size={14} /> : <IconTrash size={14} />}
            <span>{busy ? 'Processing...' : isSecure ? 'Shred Permanently' : 'Delete'}</span>
            <span className="modal-key-hint">↵ Enter</span>
          </button>
        </div>
      </div>
    </div>
  )
}
