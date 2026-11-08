import React, { useState, useEffect } from 'react'
import { safeInvoke as invoke, safeListen as listen, safePickDirectory } from '../utils/tauriBridge'
import { ProgressBar } from './ProgressBar'
import { Message } from './Message'
import { IconDzip, IconZip, IconSevenZ, IconVolume, IconShieldOk } from './Icons'
import { getPathBaseName, getParentPath, joinPath, isWindowsRoot } from '../utils/helpers'

export interface CompressModalProps {
  isOpen: boolean
  onClose: () => void
  selectedFiles: string[]
  currentDir: string
  onSuccess?: (outputPath: string) => void
}

const FORMAT_OPTIONS = [
  { ext: '.dzip', label: '.dzip', badge: 'Vault', color: '#2563eb' },
  { ext: '.zip',  label: '.zip',  badge: 'Universal', color: '#0891b2' },
  { ext: '.7z',   label: '.7z',   badge: 'High Ratio', color: '#7c3aed' },
]

/** Computes an intuitive default archive file path based on selected target(s) and current directory */
function computeDefaultArchivePath(selectedFiles: string[], currentDir: string, ext: string = '.dzip'): string {
  if (selectedFiles && selectedFiles.length === 1) {
    const rawPath = selectedFiles[0]
    const base = getPathBaseName(rawPath)
    const stem = base
      .replace(/\.tar\.(gz|bz2|xz)$/i, '')
      .replace(/\.(dzip|zip|7z|rar|tar|gz|bz2|xz)$/i, '')
      .replace(/\.[a-zA-Z0-9_-]+$/i, '') || base
    const parent = getParentPath(rawPath) || currentDir
    return parent ? joinPath(parent, `${stem}${ext}`) : `${stem}${ext}`
  }

  if (selectedFiles && selectedFiles.length > 1) {
    if (currentDir) {
      const dirBase = getPathBaseName(currentDir)
      if (dirBase && !isWindowsRoot(dirBase) && dirBase !== '/' && dirBase !== '\\') {
        return joinPath(currentDir, `${dirBase}${ext}`)
      }
    }
    const firstPath = selectedFiles[0]
    const firstBase = getPathBaseName(firstPath)
    const firstStem = firstBase
      .replace(/\.tar\.(gz|bz2|xz)$/i, '')
      .replace(/\.(dzip|zip|7z|rar|tar|gz|bz2|xz)$/i, '')
      .replace(/\.[a-zA-Z0-9_-]+$/i, '') || firstBase
    const parent = currentDir || getParentPath(firstPath) || ''
    return parent ? joinPath(parent, `${firstStem}${ext}`) : `${firstStem}${ext}`
  }

  if (currentDir) {
    const dirBase = getPathBaseName(currentDir)
    if (dirBase && !isWindowsRoot(dirBase) && dirBase !== '/' && dirBase !== '\\') {
      return joinPath(currentDir, `${dirBase}${ext}`)
    }
    return joinPath(currentDir, `archive${ext}`)
  }

  return `archive${ext}`
}

export const CompressModal: React.FC<CompressModalProps> = ({
  isOpen,
  onClose,
  selectedFiles,
  currentDir,
  onSuccess,
}) => {
  const [outputPath, setOutputPath] = useState('')
  const [compression, setCompression] = useState('balanced')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [usePassword, setUsePassword] = useState(false)

  // Self-Healing is ON by default for .dzip as requested!
  const [useEcc, setUseEcc] = useState(true)
  const [eccLevel, setEccLevel] = useState<'low' | 'high'>('low')

  const [splitPreset, setSplitPreset] = useState<string>('none')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [msgType, setMsgType] = useState<'info' | 'success' | 'error'>('info')
  const [progress, setProgress] = useState(0)

  // Reset or initialize state whenever modal opens or targets change
  useEffect(() => {
    if (isOpen) {
      setOutputPath(computeDefaultArchivePath(selectedFiles, currentDir, '.dzip'))
      setBusy(false)
      setMessage('')
      setProgress(0)
      setUsePassword(false)
      setPassword('')
      setUseEcc(true) // Default ON for .dzip!
      setEccLevel('low')
    }
  }, [isOpen, selectedFiles, currentDir])

  useEffect(() => {
    if (!isOpen) return
    const unlisten = listen<number>('compress_progress', (e) => {
      setProgress(e.payload)
    })
    return () => { unlisten.then(fn => fn()) }
  }, [isOpen])

  // Keyboard navigation: Enter to compress, Escape to close
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter' && !busy && !(e.target instanceof HTMLInputElement && e.target.type === 'text' && e.target.name === 'password')) {
        // Prevent accidental submit when typing in special fields if needed, but allow Enter
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement || e.target === document.body) {
          e.preventDefault()
          handleCompress()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, outputPath, compression, usePassword, password, useEcc, eccLevel, splitPreset, busy])

  if (!isOpen) return null

  const showMsg = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setMessage(text); setMsgType(type)
  }

  const getSplitBytes = (): number | null => {
    switch (splitPreset) {
      case 'discord': return 24 * 1024 * 1024
      case 'email': return 20 * 1024 * 1024
      case 'fat32': return 4000 * 1024 * 1024
      default: return null
    }
  }

  const currentFmt = outputPath.match(/\.(dzip|zip|7z|rar|tar\.gz|tar\.bz2|tar\.xz|tar|gz|bz2|xz)$/i)?.[0]?.toLowerCase() || '.dzip'
  const isDzip = currentFmt === '.dzip'

  const handleFormatChange = (fmt: string) => {
    let base = outputPath
      .replace(/\.tar\.(gz|bz2|xz)$/i, '')
      .replace(/\.(dzip|zip|7z|rar|tar|gz|bz2|xz)$/i, '')
    if (!base.trim()) {
      base = computeDefaultArchivePath(selectedFiles, currentDir, '').replace(/\.(dzip|zip|7z|rar|tar|gz|bz2|xz)$/i, '')
    }
    setOutputPath(base + fmt)
  }

  const handleBrowseFolder = async () => {
    const parent = outputPath.includes('/') || outputPath.includes('\\')
      ? getParentPath(outputPath) || currentDir
      : currentDir
    const dir = await safePickDirectory(parent)
    if (dir) {
      const fileName = getPathBaseName(outputPath) || (`archive${currentFmt}`)
      setOutputPath(joinPath(dir, fileName))
    }
  }

  const handleCompress = async () => {
    if (!outputPath.trim()) { showMsg('Specify an output file path', 'error'); return }
    setBusy(true); setProgress(0); showMsg('Compressing files...')
    const progressInterval = setInterval(() => setProgress(prev => Math.min(prev + 14, 94)), 180)
    try {
      await invoke('compress_files', {
        inputs: selectedFiles,
        output: outputPath,
        options: {
          codec: compression === 'max' ? 'lzma2' : compression === 'fast' ? 'lz4' : 'zstd',
          level: compression === 'max' ? 'maximum' : compression === 'fast' ? 'fast' : 'balanced',
          dedup: true,
          password: usePassword && password.trim() ? password : null,
          ecc_level: useEcc && isDzip ? eccLevel : null,
          split_size: getSplitBytes(),
        },
      })
      setProgress(100)
      showMsg('Archive created successfully!', 'success')
      setTimeout(() => {
        if (onSuccess) onSuccess(outputPath)
        onClose()
      }, 600)
    } catch (error) {
      showMsg(`Compression failed: ${error}`, 'error')
      setBusy(false)
    } finally {
      clearInterval(progressInterval)
    }
  }

  return (
    <div className="modal-backdrop-acrylic" onClick={busy ? undefined : onClose}>
      <div className="modal-window-modern" onClick={e => e.stopPropagation()}>
        {/* Modal Window Header */}
        <div className="modal-win-header">
          <div className="modal-win-title">
            <div className="modal-win-icon-badge">
              <IconDzip size={17} />
            </div>
            <div>
              <span className="modal-win-title-text">Create Archive</span>
              <span className="modal-win-subtitle">Pack files with modern compression & security</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {selectedFiles.length > 0 && (
              <span className="modal-win-count-chip">
                {selectedFiles.length} item{selectedFiles.length !== 1 ? 's' : ''} selected
              </span>
            )}
            <button
              type="button"
              className="modal-win-close-btn"
              onClick={busy ? undefined : onClose}
              disabled={busy}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Window Body */}
        <div className="modal-win-body">
          {/* 1. Destination & Filename Row */}
          <div className="modern-form-group">
            <div className="modern-group-label">
              <span>Archive Name & Location</span>
              <span className="modern-group-hint">Where the compressed archive will be saved</span>
            </div>
            <div className="modern-input-row">
              <input
                type="text"
                value={outputPath}
                onChange={e => setOutputPath(e.target.value)}
                placeholder="archive.dzip"
                className="modern-text-input"
                autoFocus
              />
              <button
                type="button"
                className="modern-btn-browse"
                onClick={handleBrowseFolder}
                title="Browse destination folder"
              >
                <span>📁</span>
                <span>Browse...</span>
              </button>
            </div>
          </div>

          {/* 2. Format Segmented Control */}
          <div className="modern-form-group">
            <div className="modern-group-label">
              <span>Archive Format</span>
              <span className="modern-group-hint">Choose vault protection or universal compatibility</span>
            </div>
            <div className="format-segmented-bar">
              {FORMAT_OPTIONS.map(f => {
                const active = currentFmt === f.ext
                return (
                  <button
                    key={f.ext}
                    type="button"
                    onClick={() => handleFormatChange(f.ext)}
                    className={`format-segment-btn ${active ? 'active' : ''}`}
                    style={active ? { '--active-accent': f.color } as React.CSSProperties : {}}
                  >
                    <span className="format-segment-icon">
                      {f.ext === '.dzip' ? <IconDzip size={14} /> : f.ext === '.zip' ? <IconZip size={14} /> : <IconSevenZ size={14} />}
                    </span>
                    <span className="format-segment-label">{f.label}</span>
                    <span className="format-segment-badge">{f.badge}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. High-Converting 1-2 Line Pitch (Compact & Impactful) */}
          {isDzip && (
            <div className="format-pitch-banner format-pitch-dzip">
              <div className="format-pitch-tag">NEXT-GEN VAULT</div>
              <div className="format-pitch-text">
                <strong>30% tighter compression</strong> with <strong>autonomous self-healing</strong> that automatically repairs damaged files if your drive degrades, locked by <strong>AES-256 encryption</strong>.
              </div>
            </div>
          )}

          {currentFmt === '.zip' && (
            <div className="format-pitch-banner format-pitch-zip">
              <div className="format-pitch-tag">UNIVERSAL</div>
              <div className="format-pitch-text">
                <strong>Universal Compatibility:</strong> Opens natively on all Windows, macOS, iPhone, and Android devices without installing any software.
              </div>
            </div>
          )}

          {currentFmt === '.7z' && (
            <div className="format-pitch-banner format-pitch-7z">
              <div className="format-pitch-tag">MAX ARCHIVE</div>
              <div className="format-pitch-text">
                <strong>Extreme LZMA2 Ratio:</strong> Compresses large files and source code into the smallest possible file footprint.
              </div>
            </div>
          )}

          {/* 4. Two-Column Options Panel */}
          <div className="modal-win-grid-2col">
            {/* Left Box: Compression & Volumes */}
            <div className="modern-card-panel">
              <div className="card-panel-title">
                <span>⚡ Compression Level</span>
              </div>

              {/* Compression Pills */}
              <div className="compression-tiles">
                {[
                  { id: 'fast', label: 'Fast', desc: 'LZ4 Speed' },
                  { id: 'balanced', label: 'Optimal', desc: 'Zstd (Recommended)' },
                  { id: 'max', label: 'Ultra', desc: 'LZMA2 Max' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCompression(opt.id)}
                    className={`compression-tile ${compression === opt.id ? 'active' : ''}`}
                  >
                    <span className="compression-tile-label">{opt.label}</span>
                    <span className="compression-tile-desc">{opt.desc}</span>
                  </button>
                ))}
              </div>

              {/* Split Presets */}
              <div style={{ marginTop: 10 }}>
                <div className="modern-sublabel">
                  <IconVolume size={13} />
                  <span>Split into Volumes</span>
                </div>
                <select
                  value={splitPreset}
                  onChange={e => setSplitPreset(e.target.value)}
                  className="modern-select-input"
                >
                  <option value="none">Single Archive (No split)</option>
                  <option value="discord">Discord Free (25 MB parts)</option>
                  <option value="email">Email Attachment (20 MB parts)</option>
                  <option value="fat32">FAT32 Drive (4 GB parts)</option>
                </select>
              </div>
            </div>

            {/* Right Box: Auto-Repair & Security */}
            <div className="modern-card-panel">
              <div className="card-panel-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconShieldOk size={13} />
                <span>Security & Protection</span>
              </div>

              {/* Auto-Repair Self-Healing Protection */}
              <div className="protection-row">
                <div className="protection-row-header">
                  <label className="modern-toggle">
                    <input
                      type="checkbox"
                      checked={useEcc && isDzip}
                      disabled={!isDzip}
                      onChange={e => setUseEcc(e.target.checked)}
                    />
                    <span className="toggle-slider" />
                  </label>
                  <div className="protection-label-block">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="protection-title">Auto-Repair Protection</span>
                      {isDzip && useEcc && (
                        <span className="protection-badge-active">ACTIVE</span>
                      )}
                    </div>
                    <span className="protection-desc">
                      {isDzip
                        ? 'Recovers damaged files if your USB drive or disk suffers bad sectors or bit-rot.'
                        : 'Self-healing is exclusive to .dzip format (standard ZIP does not support recovery).'}
                    </span>
                  </div>
                </div>

                {isDzip && useEcc && (
                  <div className="ecc-selector-row">
                    <button
                      type="button"
                      className={`ecc-pill-btn ${eccLevel === 'low' ? 'active' : ''}`}
                      onClick={() => setEccLevel('low')}
                    >
                      ✓ Standard Shield (Recommended)
                    </button>
                    <button
                      type="button"
                      className={`ecc-pill-btn ${eccLevel === 'high' ? 'active' : ''}`}
                      onClick={() => setEccLevel('high')}
                    >
                      Maximum Armor (Long-Term Storage)
                    </button>
                  </div>
                )}
              </div>

              {/* Password Protection */}
              <div className="protection-row" style={{ marginTop: 10 }}>
                <div className="protection-row-header">
                  <label className="modern-toggle">
                    <input
                      type="checkbox"
                      checked={usePassword}
                      onChange={e => {
                        setUsePassword(e.target.checked)
                        if (!e.target.checked) setPassword('')
                      }}
                    />
                    <span className="toggle-slider" />
                  </label>
                  <div className="protection-label-block">
                    <span className="protection-title">Password Encryption</span>
                    <span className="protection-desc">Lock archive with AES-256-GCM encryption</span>
                  </div>
                </div>

                {usePassword && (
                  <div className="password-input-group">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      name="password"
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter strong password..."
                      className="modern-text-input"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="modern-btn-pill"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress / Status Messages */}
          {busy && <ProgressBar progress={progress} label="Building archive package..." />}
          {message && <Message text={message} type={msgType} />}
        </div>

        {/* Modal Window Footer */}
        <div className="modal-win-footer">
          <div className="modal-win-footer-note">
            {selectedFiles.length > 0 ? (
              <span>Ready to compress <strong>{selectedFiles.length}</strong> file{selectedFiles.length !== 1 ? 's' : ''} into <strong>{currentFmt}</strong></span>
            ) : (
              <span>New empty archive container</span>
            )}
          </div>
          <div className="modal-win-footer-actions">
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
              onClick={handleCompress}
              disabled={busy}
            >
              <span>{busy ? 'Compressing...' : 'Create Archive'}</span>
              <span className="modal-key-hint">↵ Enter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
