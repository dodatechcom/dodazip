import React, { useState, useEffect, useMemo } from 'react'
import { IconSettings, IconGlobe, IconCheck, IconLoader, IconX, IconDzip } from './Icons'
import { useI18n, LANGUAGES, Language } from '../utils/i18n'
import { preferences, resolveTheme } from '../utils/preferences'
import { checkForUpdates, UpdateInfo, CURRENT_VERSION, detectOS } from '../utils/updateChecker'
import { safeOpenUrl, safeInvoke } from '../utils/tauriBridge'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onThemeChange?: (theme: 'light' | 'dark') => void
}

const FORMAT_SPECS: { ext: string; label: string; desc: string }[] = [
  { ext: 'dzip', label: '.dzip', desc: 'DodaZip Secure Vault' },
  { ext: 'zip', label: '.zip', desc: 'Standard ZIP Archive' },
  { ext: '7z', label: '.7z', desc: '7-Zip Archive' },
  { ext: 'rar', label: '.rar', desc: 'RAR Archive' },
  { ext: 'tar', label: '.tar', desc: 'TAR Archive / Tarball' },
  { ext: 'iso', label: '.iso', desc: 'ISO 9660 Disc Image' },
  { ext: 'cab', label: '.cab', desc: 'Windows Cabinet' },
  { ext: 'deb', label: '.deb', desc: 'Debian Linux Package' },
  { ext: 'dmg', label: '.dmg', desc: 'Apple Disk Image' },
  { ext: 'gz', label: '.gz', desc: 'GZIP Compressed File' },
  { ext: 'bz2', label: '.bz2', desc: 'BZIP2 Compressed File' },
  { ext: 'xz', label: '.xz', desc: 'XZ Compressed File' },
]

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onThemeChange }) => {
  const { lang, setLanguage, t } = useI18n()

  const [autoCheck, setAutoCheck] = useState<boolean>(preferences.autoCheckUpdates)
  const [activeTheme, setActiveTheme] = useState(preferences.theme)

  // Language search
  const [langSearch, setLangSearch] = useState<string>('')

  // File associations state
  const [associations, setAssociations] = useState<Record<string, boolean>>({
    dzip: true,
    zip: true,
    '7z': false,
    rar: false,
    tar: false,
    iso: false,
    cab: false,
    deb: false,
    dmg: false,
    gz: false,
    bz2: false,
    xz: false,
  })
  const [loadingAssoc, setLoadingAssoc] = useState<boolean>(false)
  const [savingAssoc, setSavingAssoc] = useState<boolean>(false)
  const [assocSuccessMsg, setAssocSuccessMsg] = useState<string | null>(null)

  // Update check states
  const [checking, setChecking] = useState<boolean>(false)
  const [updateResult, setUpdateResult] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    if (isOpen) {
      setAutoCheck(preferences.autoCheckUpdates)
      setActiveTheme(preferences.theme)
      setUpdateResult(null)
      setLangSearch('')
      setAssocSuccessMsg(null)

      setLoadingAssoc(true)
      safeInvoke<Record<string, boolean>>('get_file_associations')
        .then((res) => {
          if (res && typeof res === 'object') {
            setAssociations((prev) => ({ ...prev, ...res }))
          }
        })
        .catch((e) => console.warn('Could not load associations:', e))
        .finally(() => setLoadingAssoc(false))
    }
  }, [isOpen])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKey)
    }
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const filteredLanguages = useMemo(() => {
    const q = langSearch.trim().toLowerCase()
    if (!q) return LANGUAGES
    return LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    )
  }, [langSearch])

  if (!isOpen) return null

  const handleLanguageSelect = (code: Language) => {
    setLanguage(code)
  }

  const handleToggleAutoCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.checked
    setAutoCheck(val)
    preferences.autoCheckUpdates = val
  }

  const handleToggleAssociation = (ext: string) => {
    setAssociations((prev) => ({
      ...prev,
      [ext]: !prev[ext],
    }))
  }

  const handleSelectAllAssociations = (val: boolean) => {
    const updated: Record<string, boolean> = {}
    for (const spec of FORMAT_SPECS) {
      updated[spec.ext] = val
    }
    setAssociations(updated)
  }

  const handleApplyAssociations = async () => {
    setSavingAssoc(true)
    setAssocSuccessMsg(null)
    try {
      await safeInvoke('set_file_associations', { associations })
      setAssocSuccessMsg(t('settings.associationsApplied', 'File associations applied successfully!'))
      setTimeout(() => setAssocSuccessMsg(null), 4000)
    } catch (err: any) {
      console.error('Failed to apply associations:', err)
    } finally {
      setSavingAssoc(false)
    }
  }

  const handleCheckUpdatesNow = async () => {
    setChecking(true)
    setUpdateResult(null)
    try {
      const res = await checkForUpdates()
      setUpdateResult(res)
    } catch (err: any) {
      setUpdateResult({
        hasUpdate: false,
        currentVersion: CURRENT_VERSION,
        latestVersion: CURRENT_VERSION,
        downloadUrl: '',
        platform: detectOS(),
        error: err?.message || 'Failed to check for updates',
      })
    } finally {
      setChecking(false)
    }
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setActiveTheme(newTheme)
    preferences.theme = newTheme
    if (onThemeChange) {
      onThemeChange(resolveTheme(newTheme))
    }
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
          maxWidth: 640,
          maxHeight: '92vh',
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
            padding: '16px 22px',
            background: 'var(--bg-stripe)',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconSettings size={20} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                {t('settings.title', 'Settings')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {t('settings.subtitle', 'Preferences, Updates & Associations')}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="action-btn"
            style={{
              padding: 6,
              borderRadius: 6,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
            title="Close (Esc)"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div
          style={{
            padding: '20px 22px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
          }}
        >
          {/* Section 1: Interface Language (88 Languages) */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconGlobe size={18} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  {t('settings.language', 'Interface Language (88 Languages)')}
                </span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 10,
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: 'var(--accent, #3b82f6)',
                }}
              >
                {LANGUAGES.find((l) => l.code === lang)?.flag} {LANGUAGES.find((l) => l.code === lang)?.nativeName}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
              {t('settings.languageDesc', 'Select your preferred language for the DodaZip interface')}
            </p>

            {/* Search Input for Languages */}
            <div style={{ marginBottom: 10 }}>
              <input
                type="text"
                value={langSearch}
                onChange={(e) => setLangSearch(e.target.value)}
                placeholder={t('settings.languageSearch', 'Search language by name or native name...')}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border-light)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
            </div>

            {/* Scrollable Language Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: 6,
                maxHeight: 180,
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              {filteredLanguages.map((l) => {
                const isSelected = lang === l.code
                return (
                  <button
                    key={l.code}
                    onClick={() => handleLanguageSelect(l.code)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: isSelected
                        ? '1.5px solid var(--accent, #3b82f6)'
                        : '1px solid var(--border-light)',
                      background: isSelected
                        ? 'rgba(59, 130, 246, 0.15)'
                        : 'var(--bg-surface)',
                      cursor: 'pointer',
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      transition: 'all 0.1s ease',
                      outline: 'none',
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{l.flag}</span>
                    <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      <div style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {l.nativeName}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {l.name}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Section 2: File Associations (Default Handler) */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconDzip size={18} />
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  {t('settings.associations', 'File Associations (Default Handler)')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => handleSelectAllAssociations(true)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {t('settings.selectAll', 'Select All')}
                </button>
                <button
                  onClick={() => handleSelectAllAssociations(false)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-light)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {t('settings.clearAll', 'Clear All')}
                </button>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
              {t('settings.associationsDesc', 'Choose which archive and image formats automatically open in DodaZip')}
            </p>

            {loadingAssoc ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
                <IconLoader size={14} /> Loading system associations...
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
                  gap: 8,
                }}
              >
                {FORMAT_SPECS.map((item) => {
                  const isChecked = !!associations[item.ext]
                  return (
                    <label
                      key={item.ext}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: isChecked
                          ? '1px solid rgba(59, 130, 246, 0.4)'
                          : '1px solid var(--border-light)',
                        background: isChecked
                          ? 'rgba(59, 130, 246, 0.08)'
                          : 'var(--bg-surface)',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'all 0.1s ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleAssociation(item.ext)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontWeight: 600, fontSize: 12, color: isChecked ? 'var(--accent, #3b82f6)' : 'var(--text-primary)' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.desc}
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}

            {/* Apply Associations Action Button & Status */}
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={handleApplyAssociations}
                disabled={savingAssoc}
                className="action-btn"
                style={{
                  padding: '7px 16px',
                  borderRadius: 6,
                  background: 'var(--accent, #3b82f6)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: savingAssoc ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {savingAssoc && <IconLoader size={14} />}
                {t('settings.applyAssociations', 'Apply File Associations')}
              </button>

              {assocSuccessMsg && (
                <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <IconCheck size={14} /> {assocSuccessMsg}
                </span>
              )}
            </div>
          </div>

          {/* Section 3: Software Updates */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                {t('settings.updates', 'Software Updates')}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-secondary)',
                }}
              >
                v{CURRENT_VERSION}
              </span>
            </div>

            {/* Checkbox auto check on start */}
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                marginTop: 10,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={autoCheck}
                onChange={handleToggleAutoCheck}
                style={{ marginTop: 2, cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {t('settings.autoCheckUpdates', 'Automatically check for updates on startup')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {t('settings.autoCheckDesc', 'DodaZip will notify you when a new release or security fix is available')}
                </div>
              </div>
            </label>

            {/* Official Update Channel Notice */}
            <div
              style={{
                marginTop: 12,
                padding: '8px 12px',
                background: 'var(--bg-surface)',
                borderRadius: 6,
                border: '1px solid var(--border-light)',
                fontSize: 11,
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Official CDN Channel: </span>
              Cloudflare R2 (<code>https://updates.dodatech.com/dodazip/latest.json</code>) with secure fallback.
            </div>

            {/* Action button & status */}
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={handleCheckUpdatesNow}
                disabled={checking}
                className="action-btn"
                style={{
                  padding: '7px 16px',
                  borderRadius: 6,
                  background: 'var(--accent, #3b82f6)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: checking ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {checking && <IconLoader size={14} />}
                {checking ? t('settings.checking', 'Checking for updates...') : t('settings.checkNow', 'Check for Updates Now')}
              </button>
            </div>

            {/* Update check results */}
            {updateResult && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 12,
                  background: updateResult.hasUpdate
                    ? 'rgba(34, 197, 94, 0.1)'
                    : updateResult.error
                    ? 'rgba(239, 68, 68, 0.1)'
                    : 'var(--bg-surface)',
                  border: updateResult.hasUpdate
                    ? '1px solid rgba(34, 197, 94, 0.3)'
                    : updateResult.error
                    ? '1px solid rgba(239, 68, 68, 0.3)'
                    : '1px solid var(--border-light)',
                }}
              >
                {updateResult.hasUpdate ? (
                  <div>
                    <div style={{ fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <IconCheck size={16} />
                      {t('settings.updateAvailable', 'New version available!')} v{updateResult.latestVersion}
                    </div>
                    {updateResult.releaseNotes && (
                      <div
                        style={{
                          marginTop: 6,
                          color: 'var(--text-secondary)',
                          whiteSpace: 'pre-wrap',
                          maxHeight: 90,
                          overflowY: 'auto',
                          background: 'var(--bg-surface)',
                          padding: 8,
                          borderRadius: 6,
                          fontSize: 11,
                        }}
                      >
                        {updateResult.releaseNotes}
                      </div>
                    )}
                    <button
                      onClick={() => safeOpenUrl(updateResult.downloadUrl)}
                      style={{
                        marginTop: 10,
                        padding: '6px 14px',
                        borderRadius: 6,
                        background: '#16a34a',
                        color: '#fff',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {t('settings.downloadUpdate', 'Download Update')}
                    </button>
                  </div>
                ) : updateResult.error ? (
                  <div style={{ color: '#dc2626' }}>
                    ⚠️ {updateResult.error}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconCheck size={14} />
                    {t('settings.upToDate', `You are using the latest version of DodaZip (v${CURRENT_VERSION}).`)}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 4: General Appearance & Help */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              borderRadius: 10,
              padding: 16,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 10 }}>
              {t('settings.general', 'General & Appearance')}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {t('settings.theme', 'Color Theme')}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['auto', 'light', 'dark'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleThemeChange(mode)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: activeTheme === mode ? 600 : 400,
                      border: activeTheme === mode
                        ? '1px solid var(--accent, #3b82f6)'
                        : '1px solid var(--border-light)',
                      background: activeTheme === mode
                        ? 'rgba(59, 130, 246, 0.12)'
                        : 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {mode === 'auto' ? t('settings.themeAuto', 'Auto') : mode === 'light' ? t('settings.themeLight', 'Light') : t('settings.themeDark', 'Dark')}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>
                  {t('help.docs', 'Documentation')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  Press <kbd style={{ padding: '1px 5px', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 4 }}>F1</kbd> anywhere to open online help
                </div>
              </div>
              <button
                onClick={() => safeOpenUrl('https://dodatech.com/docs/dodazip/')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Open Docs ↗
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 22px',
            background: 'var(--bg-stripe)',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '7px 20px',
              borderRadius: 6,
              background: 'var(--accent, #3b82f6)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {t('settings.save', 'Done')}
          </button>
        </div>
      </div>
    </div>
  )
}
