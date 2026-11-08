import React, { useEffect } from 'react'
import { IconDzip } from './Icons'
import { safeOpenUrl } from '../utils/tauriBridge'

interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKey)
    }
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleLink = (url: string, e: React.MouseEvent) => {
    e.preventDefault()
    safeOpenUrl(url)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          color: 'var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 20px',
            background: 'var(--bg-stripe)',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconDzip size={22} />
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
              About DodaZip
            </span>
          </div>
          <button
            type="button"
            className="dialog-close-btn"
            onClick={onClose}
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16 }}>
          {/* Logo Badge */}
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(8,145,178,0.18))',
              border: '1.5px solid rgba(37,99,235,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 16px -4px rgba(37,99,235,0.2)',
            }}
          >
            <IconDzip size={34} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                DodaZip
              </h2>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 10,
                  background: 'var(--accent-light)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent)',
                }}
              >
                v0.5.0
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>
              Simple, Fast & Smart Archiver for Everyday Use
            </p>
          </div>

          {/* Simple, Non-Technical Benefits Card */}
          <div
            style={{
              width: '100%',
              background: 'var(--bg-main)',
              border: '1px solid var(--border-light)',
              borderRadius: 10,
              padding: '12px 16px',
              fontSize: 12,
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              lineHeight: 1.4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 14 }}>📦</span>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Smaller File Sizes:</strong>{' '}
                <span style={{ color: 'var(--text-secondary)' }}>Compresses files tighter than standard ZIP to save disk space.</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 14 }}>⚡</span>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Instant Media Zip:</strong>{' '}
                <span style={{ color: 'var(--text-secondary)' }}>Never slows down on photos or videos—archives them instantly without freezing.</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 14 }}>🩹</span>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Self-Healing Protection:</strong>{' '}
                <span style={{ color: 'var(--text-secondary)' }}>Can automatically detect and repair broken files if an archive gets damaged.</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 14 }}>🔒</span>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Password Lock:</strong>{' '}
                <span style={{ color: 'var(--text-secondary)' }}>Keep your personal documents safe with strong password protection.</span>
              </div>
            </div>
          </div>

          {/* Useful Web Links */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a
              href="https://dodatech.com/docs/dodazip/"
              onClick={(e) => handleLink('https://dodatech.com/docs/dodazip/', e)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid var(--border-light)',
                background: 'var(--bg-stripe)',
                color: 'var(--text-primary)',
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: 600,
                transition: 'border-color 0.12s ease, transform 0.1s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-light)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15 }}>📖</span>
                <span>User Guide & Help Docs</span>
              </span>
              <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 500 }}>dodatech.com/docs/dodazip/ ↗</span>
            </a>

            <a
              href="https://dodatech.com"
              onClick={(e) => handleLink('https://dodatech.com', e)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid var(--border-light)',
                background: 'var(--bg-stripe)',
                color: 'var(--text-primary)',
                textDecoration: 'none',
                fontSize: 12,
                fontWeight: 600,
                transition: 'border-color 0.12s ease, transform 0.1s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent)'
                e.currentTarget.style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-light)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15 }}>🌐</span>
                <span>Official Website</span>
              </span>
              <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 500 }}>DodaTech.com ↗</span>
            </a>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Developed by <strong>DodaTech</strong> · All rights reserved.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            background: 'var(--bg-stripe)',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            className="dialog-btn dialog-btn-primary"
            onClick={onClose}
          >
            Close <span className="key-hint">Esc</span>
          </button>
        </div>
      </div>
    </div>
  )
}
