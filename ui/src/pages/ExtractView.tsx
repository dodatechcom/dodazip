import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { safeInvoke as invoke, safeListen as listen, safePickDirectory } from '../utils/tauriBridge'
import { ProgressBar } from '../components/ProgressBar'
import { Message } from '../components/Message'
import { IconDzip, IconZip, IconSevenZ, IconTar, IconCompressed, IconWarningRisk, IconShieldOk } from '../components/Icons'
import { isRiskyFile, formatSize, getPathBaseName } from '../utils/helpers'

const FORMAT_COLORS: Record<string, { color: string, icon: React.ReactNode }> = {
  '.dzip':    { color: '#2563eb', icon: <IconDzip size={18} /> },
  '.zip':     { color: '#0891b2', icon: <IconZip size={18} /> },
  '.7z':      { color: '#7c3aed', icon: <IconSevenZ size={18} /> },
  '.tar':     { color: '#78716c', icon: <IconTar size={18} /> },
  '.tar.gz':  { color: '#78716c', icon: <IconTar size={18} /> },
  '.tar.bz2': { color: '#78716c', icon: <IconTar size={18} /> },
  '.tar.xz':  { color: '#78716c', icon: <IconTar size={18} /> },
  '.gz':      { color: '#dc2626', icon: <IconCompressed size={18} /> },
  '.bz2':     { color: '#dc2626', icon: <IconCompressed size={18} /> },
  '.xz':      { color: '#dc2626', icon: <IconCompressed size={18} /> },
}

export const ExtractView: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const selectedFile: string = location.state?.archivePath || location.state?.selectedFile || ''
  const currentDir: string = location.state?.currentDir || ''

  const [archivePath] = useState(selectedFile)
  const [outputDir, setOutputDir] = useState(
    currentDir || (selectedFile ? selectedFile.replace(/\.[^/\\.]+$/, '_extracted') : '')
  )
  const [password, setPassword] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [smartUnpack, setSmartUnpack] = useState(true)
  const [entries, setEntries] = useState<Array<{ path: string; size: number }>>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [msgType, setMsgType] = useState<'info' | 'success' | 'error'>('info')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const unlisten = listen<number>('extract_progress', (e) => {
      setProgress(e.payload)
    })
    return () => { unlisten.then(fn => fn()) }
  }, [])

  // Auto-inspect archive on load
  useEffect(() => {
    if (archivePath) {
      handleList()
    }
  }, [archivePath])

  const handleDismiss = () => {
    if (location.state?.autoStart) {
      invoke('close_app').catch(() => window.close())
    } else {
      navigate(-1)
    }
  }

  // Auto-start extraction if triggered from Windows context menu (Extract Here / Extract to folder)
  const autoStartedRef = React.useRef(false)
  useEffect(() => {
    if (location.state?.autoStart && archivePath && outputDir && !autoStartedRef.current) {
      autoStartedRef.current = true
      handleExtract()
    }
  }, [archivePath, outputDir])

  // Keyboard navigation: Enter to extract, Escape to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        e.preventDefault()
        handleDismiss()
      } else if (e.key === 'Enter' && !busy && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        handleExtract()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [archivePath, outputDir, smartUnpack, usePassword, password, busy])

  const showMsg = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setMessage(text); setMsgType(type)
  }

  const handleList = async () => {
    if (!archivePath.trim()) return
    setBusy(true)
    try {
      const items = await invoke<Array<{ path: string; size: number }>>('list_archive', {
        archivePath,
        password: usePassword && password ? password : null
      })
      setEntries(items || [])
    } catch (error) {
      showMsg(`Error reading archive: ${error}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleExtract = async () => {
    if (!archivePath.trim() || !outputDir.trim()) {
      showMsg('Specify both archive path and output destination', 'error')
      return
    }
    setBusy(true); setProgress(0); showMsg('Extracting files...')
    try {
      await invoke('extract_archive', {
        archivePath,
        outputDir,
        options: {
          password: usePassword && password ? password : null,
          smart_unpack: location.state?.autoStart ? false : smartUnpack,
        },
      })
      setProgress(100)
      showMsg('Extraction complete!', 'success')
      if (location.state?.autoStart) {
        setTimeout(async () => {
          try {
            await invoke('close_app')
          } catch {
            window.close()
          }
        }, 500)
      } else {
        setTimeout(() => navigate(-1), 800)
      }
    } catch (error) {
      showMsg(`Extraction failed: ${error}`, 'error')
      setBusy(false)
    }
  }

  const handleBrowse = async () => {
    const dir = await safePickDirectory(outputDir || currentDir)
    if (dir) {
      setOutputDir(dir)
    }
  }

  const archiveFmt = archivePath.match(/\.(dzip|zip|7z|rar|tar\.gz|tar\.bz2|tar\.xz|tar|gz|bz2|xz)$/i)?.[0]?.toLowerCase() || ''
  const fmtInfo = FORMAT_COLORS[archiveFmt] || { color: '#2563eb', icon: <IconDzip size={18} /> }
  const totalBytes = entries.reduce((acc, e) => acc + e.size, 0)
  const riskyEntries = entries.filter(e => isRiskyFile(e.path))
  const fileName = getPathBaseName(archivePath) || 'Archive'

  return (
    <div className="compact-dialog-shell">
      <div className="compact-dialog-card" style={{ maxWidth: 680 }}>
        {/* Dialog Header */}
        <div className="dialog-header">
          <div className="dialog-header-title">
            {fmtInfo.icon}
            <span>Extract Archive</span>
            <span className="dialog-header-count" style={{ background: 'var(--bg-card)', color: fmtInfo.color, border: `1px solid ${fmtInfo.color}` }}>
              {fileName}
            </span>
          </div>
          <button
            type="button"
            className="dialog-close-btn"
            onClick={handleDismiss}
            title="Cancel (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Dialog Body */}
        <div className="dialog-body">
          {/* Destination Folder */}
          <div className="dialog-field">
            <label className="dialog-field-label">
              <span>Extract To (Destination Folder)</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Files will be unpacked here</span>
            </label>
            <div className="output-row">
              <input
                type="text"
                value={outputDir}
                onChange={(e) => setOutputDir(e.target.value)}
                placeholder="/path/to/extracted/folder"
                className="output-input"
                autoFocus
              />
              <button
                type="button"
                className="dialog-btn dialog-btn-secondary"
                onClick={handleBrowse}
                title="Browse for folder"
                style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span>📁</span>
                <span>Browse...</span>
              </button>
            </div>

            {/* Quick destination location presets */}
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => {
                  const base = archivePath ? archivePath.replace(/\/[^/]+$/, '') : ''
                  if (base) setOutputDir(base)
                }}
                style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 4,
                  border: '1px solid var(--border-light)', background: 'transparent',
                  color: 'var(--text-secondary)', cursor: 'pointer'
                }}
              >
                Same Directory
              </button>
              <button
                type="button"
                onClick={() => {
                  const base = archivePath ? archivePath.replace(/\.[^/.]+$/, '_extracted') : ''
                  if (base) setOutputDir(base)
                }}
                style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 4,
                  border: '1px solid var(--border-light)', background: 'transparent',
                  color: 'var(--text-secondary)', cursor: 'pointer'
                }}
              >
                New Subfolder
              </button>
            </div>
          </div>

          {/* Options Row: Smart Unpack & Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: 6, padding: '10px 12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={smartUnpack}
                onChange={(e) => setSmartUnpack(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <IconShieldOk size={15} />
                Smart Unpack (Anti-Zip Bomb Protection)
              </span>
            </label>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 24, lineHeight: 1.3 }}>
              If the archive contains loose files at root, automatically isolates them into a dedicated folder to prevent desktop clutter.
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 8, marginTop: 4 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                <input
                  type="checkbox"
                  checked={usePassword}
                  onChange={(e) => {
                    setUsePassword(e.target.checked)
                    if (!e.target.checked) setPassword('')
                  }}
                  style={{ accentColor: 'var(--accent)' }}
                />
                <span>Archive requires password</span>
              </label>
              {usePassword && (
                <div style={{ marginTop: 6, paddingLeft: 24 }}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter decryption password"
                    className="output-input"
                    style={{ fontSize: 12, maxWidth: 300 }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Security Risk Shield Alert */}
          {riskyEntries.length > 0 && (
            <div className="security-alert-box" style={{ margin: 0, padding: '10px 14px' }}>
              <div className="security-alert-title">
                <IconWarningRisk size={18} />
                <span>Security Alert: {riskyEntries.length} executable or script payload(s) detected</span>
              </div>
              <div className="security-alert-desc">
                Contains potentially executable files: <strong>{riskyEntries.map(e => e.path.split('/').pop()).slice(0, 3).join(', ')}</strong>. Exercise caution when running.
              </div>
            </div>
          )}

          {/* High-Density Archive Entries Preview */}
          <div className="dialog-field">
            <div className="dialog-field-label">
              <span>Archive Contents ({entries.length} items)</span>
              <span>Total: {formatSize(totalBytes)}</span>
            </div>
            <div style={{
              maxHeight: 180,
              overflowY: 'auto',
              border: '1px solid var(--border-light)',
              borderRadius: 6,
              background: 'var(--bg-main)'
            }}>
              <table className="entries-table" style={{ margin: 0, fontSize: 12 }}>
                <tbody>
                  {entries.map((entry, i) => {
                    const isRisky = isRiskyFile(entry.path)
                    return (
                      <tr key={i} className={isRisky ? 'risky-row' : ''}>
                        <td style={{ padding: '4px 10px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isRisky ? <IconWarningRisk size={14} /> : <span>📄</span>}
                            <span style={{ color: isRisky ? 'var(--error)' : 'inherit', fontWeight: isRisky ? 600 : 400 }}>
                              {entry.path}
                            </span>
                            {isRisky && <span className="risk-badge">Executable</span>}
                          </span>
                        </td>
                        <td style={{ padding: '4px 10px', textAlign: 'right', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {formatSize(entry.size)}
                        </td>
                      </tr>
                    )
                  })}
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                        {busy ? 'Scanning archive...' : 'No files listed'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Progress / Messages */}
          {busy && <ProgressBar progress={progress} label="Extracting files..." />}
          {message && <Message text={message} type={msgType} />}
        </div>

        {/* Dialog Footer */}
        <div className="dialog-footer">
          <div className="dialog-footer-left">
            {entries.length > 0 ? `${entries.length} files (${formatSize(totalBytes)})` : ''}
          </div>
          <div className="dialog-footer-actions">
            <button
              type="button"
              className="dialog-btn dialog-btn-secondary"
              onClick={handleDismiss}
              disabled={busy}
            >
              Cancel <span className="key-hint">Esc</span>
            </button>
            <button
              type="button"
              className="dialog-btn dialog-btn-primary"
              onClick={handleExtract}
              disabled={busy || !archivePath.trim() || !outputDir.trim()}
              style={{ background: fmtInfo.color, borderColor: fmtInfo.color }}
            >
              <span>{busy ? 'Extracting...' : 'Extract'}</span>
              <span className="key-hint">↵ Enter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
