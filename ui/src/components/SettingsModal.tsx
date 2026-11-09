import React, { useState, useEffect, useMemo } from 'react'
import {
  IconSettings,
  IconGlobe,
  IconCheck,
  IconLoader,
  IconX,
  IconDzip,
  IconRefresh,
  IconHelp,
  IconSun,
  IconMoon,
} from './Icons'
import { useI18n, LANGUAGES, Language } from '../utils/i18n'
import { preferences, resolveTheme } from '../utils/preferences'
import { checkForUpdates, UpdateInfo, CURRENT_VERSION, detectOS } from '../utils/updateChecker'
import { safeOpenUrl, safeInvoke } from '../utils/tauriBridge'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onThemeChange?: (theme: 'light' | 'dark') => void
}

type SettingsTab = 'associations' | 'language' | 'updates' | 'appearance'

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

  const [activeTab, setActiveTab] = useState<SettingsTab>('associations')
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

  const associatedCount = useMemo(() => {
    return Object.values(associations).filter(Boolean).length
  }, [associations])

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
          maxWidth: 820,
          height: 560,
          maxHeight: '90vh',
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
            <IconSettings size={20} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                {t('settings.title', 'Settings')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
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

        {/* Master-Detail Body: Left Sidebar + Right Content */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {/* Left Sidebar Navigation */}
          <div
            style={{
              width: 220,
              background: 'var(--bg-stripe)',
              borderRight: '1px solid var(--border-light)',
              display: 'flex',
              flexDirection: 'column',
              padding: '14px 10px',
              gap: 4,
              userSelect: 'none',
            }}
          >
            {/* Tab 1: File Associations */}
            <button
              onClick={() => setActiveTab('associations')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'associations' ? 'var(--accent, #3b82f6)' : 'transparent',
                color: activeTab === 'associations' ? '#ffffff' : 'var(--text-primary)',
                fontWeight: activeTab === 'associations' ? 600 : 500,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.12s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconDzip size={17} />
                <span>{t('settings.associationsTab', 'File Associations')}</span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 10,
                  background: activeTab === 'associations' ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-card)',
                  color: activeTab === 'associations' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 600,
                }}
              >
                {associatedCount}/12
              </span>
            </button>

            {/* Tab 2: Language & Region */}
            <button
              onClick={() => setActiveTab('language')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'language' ? 'var(--accent, #3b82f6)' : 'transparent',
                color: activeTab === 'language' ? '#ffffff' : 'var(--text-primary)',
                fontWeight: activeTab === 'language' ? 600 : 500,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.12s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconGlobe size={17} />
                <span>{t('settings.languageTab', 'Language')}</span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 10,
                  background: activeTab === 'language' ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-card)',
                  color: activeTab === 'language' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 600,
                }}
              >
                88
              </span>
            </button>

            {/* Tab 3: Software Updates */}
            <button
              onClick={() => setActiveTab('updates')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'updates' ? 'var(--accent, #3b82f6)' : 'transparent',
                color: activeTab === 'updates' ? '#ffffff' : 'var(--text-primary)',
                fontWeight: activeTab === 'updates' ? 600 : 500,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.12s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconRefresh size={17} />
                <span>{t('settings.updatesTab', 'Software Updates')}</span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 10,
                  background: activeTab === 'updates' ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-card)',
                  color: activeTab === 'updates' ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: 600,
                }}
              >
                v{CURRENT_VERSION}
              </span>
            </button>

            {/* Tab 4: Appearance & Help */}
            <button
              onClick={() => setActiveTab('appearance')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: 8,
                border: 'none',
                background: activeTab === 'appearance' ? 'var(--accent, #3b82f6)' : 'transparent',
                color: activeTab === 'appearance' ? '#ffffff' : 'var(--text-primary)',
                fontWeight: activeTab === 'appearance' ? 600 : 500,
                fontSize: 13,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.12s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <IconSun size={17} />
                <span>{t('settings.appearanceTab', 'Appearance & Help')}</span>
              </div>
            </button>
          </div>

          {/* Right Content Area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '22px 26px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            {/* ========================================================================= */}
            {/* VIEW 1: FILE ASSOCIATIONS                                                 */}
            {/* ========================================================================= */}
            {activeTab === 'associations' && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {t('settings.associations', 'File Associations (Default Handler)')}
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {t('settings.associationsDesc', 'Choose which archive and image formats automatically open in DodaZip')}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleSelectAllAssociations(true)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-light)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {t('settings.selectAll', 'Select All')}
                    </button>
                    <button
                      onClick={() => handleSelectAllAssociations(false)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-light)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      {t('settings.clearAll', 'Clear All')}
                    </button>
                  </div>
                </div>

                {loadingAssoc ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 30, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <IconLoader size={16} /> Loading Windows Registry associations...
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                      gap: 8,
                      marginTop: 14,
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
                            gap: 10,
                            padding: '8px 12px',
                            borderRadius: 8,
                            border: isChecked
                              ? '1.5px solid var(--accent, #3b82f6)'
                              : '1px solid var(--border-light)',
                            background: isChecked
                              ? 'rgba(59, 130, 246, 0.08)'
                              : 'var(--bg-card)',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'all 0.12s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleAssociation(item.ext)}
                            style={{ cursor: 'pointer', width: 15, height: 15 }}
                          />
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: isChecked ? 'var(--accent, #3b82f6)' : 'var(--text-primary)' }}>
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

                {/* Apply button and status */}
                <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <button
                    onClick={handleApplyAssociations}
                    disabled={savingAssoc}
                    className="action-btn"
                    style={{
                      padding: '8px 20px',
                      borderRadius: 6,
                      background: 'var(--accent, #3b82f6)',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: savingAssoc ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {savingAssoc && <IconLoader size={14} />}
                    {t('settings.applyAssociations', 'Apply File Associations')}
                  </button>

                  {assocSuccessMsg && (
                    <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <IconCheck size={16} /> {assocSuccessMsg}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 18,
                    padding: '10px 14px',
                    background: 'var(--bg-card)',
                    borderRadius: 8,
                    border: '1px solid var(--border-light)',
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>ℹ️ How it works: </span>
                  Checked formats are registered in the Windows Registry to automatically open in DodaZip when double-clicked. Unchecking a format relinquishes it so other software (or Windows default) handles it.
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW 2: LANGUAGE & REGION (88 LANGUAGES)                                 */}
            {/* ========================================================================= */}
            {activeTab === 'language' && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {t('settings.language', 'Interface Language')}
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {t('settings.languageDesc', 'Select your preferred language (88 languages supported)')}
                    </p>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 12,
                      background: 'rgba(59, 130, 246, 0.12)',
                      color: 'var(--accent, #3b82f6)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>{LANGUAGES.find((l) => l.code === lang)?.flag}</span>
                    <span>{LANGUAGES.find((l) => l.code === lang)?.nativeName}</span>
                    <span style={{ opacity: 0.7, fontSize: 10 }}>({lang})</span>
                  </div>
                </div>

                {/* Search Bar */}
                <div style={{ marginBottom: 10, position: 'relative' }}>
                  <input
                    type="text"
                    value={langSearch}
                    onChange={(e) => setLangSearch(e.target.value)}
                    placeholder={t('settings.languageSearch', 'Search 88 languages by name or native script...')}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      paddingRight: langSearch ? 32 : 12,
                      borderRadius: 8,
                      border: '1px solid var(--border-light)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  {langSearch && (
                    <button
                      onClick={() => setLangSearch('')}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: 2,
                      }}
                    >
                      <IconX size={14} />
                    </button>
                  )}
                </div>

                {/* Clean Scrollable List Box for 88 Languages */}
                <div
                  style={{
                    flex: 1,
                    minHeight: 280,
                    overflowY: 'auto',
                    border: '1px solid var(--border-light)',
                    borderRadius: 8,
                    background: 'var(--bg-card)',
                    padding: 4,
                  }}
                >
                  {filteredLanguages.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                      No languages found matching "{langSearch}"
                    </div>
                  ) : (
                    filteredLanguages.map((l) => {
                      const isSelected = lang === l.code
                      return (
                        <div
                          key={l.code}
                          onClick={() => handleLanguageSelect(l.code)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: 6,
                            background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'background 0.1s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)'
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = 'transparent'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 20 }}>{l.flag}</span>
                            <div>
                              <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--accent, #3b82f6)' : 'var(--text-primary)' }}>
                                {l.nativeName}
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 8 }}>
                                {l.name}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                              {l.code}
                            </span>
                            {isSelected && <IconCheck size={16} />}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW 3: SOFTWARE UPDATES                                                  */}
            {/* ========================================================================= */}
            {activeTab === 'updates' && (
              <div>
                <div style={{ marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {t('settings.updates', 'Software Updates')}
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                    {t('settings.autoCheckDesc', 'DodaZip release channels, CDN distribution, and version verification')}
                  </p>
                </div>

                {/* Current Version Card */}
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 10,
                    padding: 16,
                    marginBottom: 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                        DodaZip v{CURRENT_VERSION}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        Architecture: Windows x64 (Tauri 2 + High-Performance Rust Engine)
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 12,
                        background: 'rgba(34, 197, 94, 0.12)',
                        color: '#16a34a',
                        fontSize: 11,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <IconCheck size={14} /> Production Release
                    </span>
                  </div>

                  {/* Startup auto check toggle */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      marginTop: 14,
                      paddingTop: 12,
                      borderTop: '1px solid var(--border-light)',
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
                        Notifies you when an update or security enhancement is published
                      </div>
                    </div>
                  </label>
                </div>

                {/* Check button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                  <button
                    onClick={handleCheckUpdatesNow}
                    disabled={checking}
                    className="action-btn"
                    style={{
                      padding: '8px 18px',
                      borderRadius: 6,
                      background: 'var(--accent, #3b82f6)',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: checking ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {checking ? <IconLoader size={14} /> : <IconRefresh size={14} />}
                    {checking ? t('settings.checking', 'Checking for updates...') : t('settings.checkNow', 'Check for Updates Now')}
                  </button>
                </div>

                {/* Update Results */}
                {updateResult && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 14,
                      borderRadius: 8,
                      fontSize: 12,
                      background: updateResult.hasUpdate
                        ? 'rgba(34, 197, 94, 0.1)'
                        : updateResult.error
                        ? 'rgba(239, 68, 68, 0.1)'
                        : 'var(--bg-card)',
                      border: updateResult.hasUpdate
                        ? '1px solid rgba(34, 197, 94, 0.3)'
                        : updateResult.error
                        ? '1px solid rgba(239, 68, 68, 0.3)'
                        : '1px solid var(--border-light)',
                    }}
                  >
                    {updateResult.hasUpdate ? (
                      <div>
                        <div style={{ fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                          <IconCheck size={16} />
                          {t('settings.updateAvailable', 'New version available!')} v{updateResult.latestVersion}
                        </div>
                        {updateResult.releaseNotes && (
                          <div
                            style={{
                              marginTop: 8,
                              color: 'var(--text-secondary)',
                              whiteSpace: 'pre-wrap',
                              maxHeight: 100,
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
                            marginTop: 12,
                            padding: '7px 16px',
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
                      <div style={{ color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconCheck size={16} />
                        <span>{t('settings.upToDate', 'You are using the latest version of DodaZip.')} (v{CURRENT_VERSION})</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW 4: APPEARANCE & HELP                                                 */}
            {/* ========================================================================= */}
            {activeTab === 'appearance' && (
              <div>
                <div style={{ marginBottom: 14 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {t('settings.appearanceTab', 'Appearance & Documentation')}
                  </h3>
                  <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                    Customize visual themes, shortcuts, and view official product resources
                  </p>
                </div>

                {/* Theme Selector Card */}
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 10,
                    padding: 16,
                    marginBottom: 14,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                    {t('settings.theme', 'Color Theme')}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['auto', 'light', 'dark'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => handleThemeChange(mode)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: activeTheme === mode ? 600 : 400,
                          border: activeTheme === mode
                            ? '1.5px solid var(--accent, #3b82f6)'
                            : '1px solid var(--border-light)',
                          background: activeTheme === mode
                            ? 'rgba(59, 130, 246, 0.12)'
                            : 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        {mode === 'light' && <IconSun size={15} />}
                        {mode === 'dark' && <IconMoon size={15} />}
                        {mode === 'auto' ? t('settings.themeAuto', 'System (Auto)') : mode === 'light' ? t('settings.themeLight', 'Light') : t('settings.themeDark', 'Dark')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Keyboard Shortcuts Card */}
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 10,
                    padding: 16,
                    marginBottom: 14,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconHelp size={16} /> Keyboard Shortcuts
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--bg-surface)', borderRadius: 4 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Online Help</span>
                      <kbd style={{ fontFamily: 'monospace', fontWeight: 600 }}>F1</kbd>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--bg-surface)', borderRadius: 4 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Refresh View</span>
                      <kbd style={{ fontFamily: 'monospace', fontWeight: 600 }}>F5</kbd>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--bg-surface)', borderRadius: 4 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>New Vault</span>
                      <kbd style={{ fontFamily: 'monospace', fontWeight: 600 }}>Ctrl + N</kbd>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'var(--bg-surface)', borderRadius: 4 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Open Archive</span>
                      <kbd style={{ fontFamily: 'monospace', fontWeight: 600 }}>Ctrl + O</kbd>
                    </div>
                  </div>
                </div>

                {/* Official Links Card */}
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 10,
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Official DodaTech Resources</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Visit our homepage or read the user manual online
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => safeOpenUrl('https://dodatech.com')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-light)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      DodaTech.com ↗
                    </button>
                    <button
                      onClick={() => safeOpenUrl('https://dodatech.com/docs/dodazip/')}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        background: 'var(--accent, #3b82f6)',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      Documentation ↗
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            background: 'var(--bg-stripe)',
            borderTop: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={() => safeOpenUrl('https://dodatech.com')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontWeight: 500,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent, #3b82f6)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <span>🌐 DodaTech.com</span>
          </button>

          <button
            onClick={onClose}
            style={{
              padding: '6px 22px',
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
