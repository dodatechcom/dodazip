import React from 'react'
import {
  IconNew, IconOpen, IconAdd, IconExtract, IconBack, IconShieldOk,
  IconX, IconDzip, IconDuplicate, IconRename, IconTrash, IconShred,
  IconSettings, IconSpeed,
} from './Icons'
import { FileInfo } from '../types'
import { useI18n } from '../utils/i18n'

interface ToolbarProps {
  onNew?: () => void
  onOpen?: () => void
  onAdd?: () => void
  onExtract?: () => void
  onBenchmark?: () => void
  onSettings?: () => void
  onAbout?: () => void
  onBack?: () => void
  addDisabled?: boolean
  showBack?: boolean
  isArchiveMode?: boolean
  archiveName?: string
  onTestIntegrity?: () => void
  onCloseArchive?: () => void
  selectedArchive?: FileInfo | null
  onInspectArchive?: (file: FileInfo) => void
  onVerifyArchive?: (file: FileInfo) => void
  onConvertArchive?: (file: FileInfo) => void
  selectedCount?: number
  onRename?: () => void
  onDelete?: () => void
  onSecureDelete?: () => void
  canSecureDelete?: boolean
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onNew, onOpen, onAdd, onExtract, onBenchmark, onSettings, onAbout, onBack,
  addDisabled = false, showBack = false,
  isArchiveMode = false, archiveName, onTestIntegrity, onCloseArchive,
  selectedArchive, onInspectArchive, onVerifyArchive, onConvertArchive,
  selectedCount = 0, onRename, onDelete, onSecureDelete, canSecureDelete = true,
}) => {
  const { t } = useI18n()

  return (
    <div className="toolbar">
      {showBack && onBack && (
        <button className="toolbar-btn" onClick={onBack}>
          <IconBack size={22} />
          <span>{t('toolbar.back', 'Back')}</span>
        </button>
      )}
      {showBack && (onNew || onOpen || onAdd || onExtract) && <div className="toolbar-separator" />}

      {isArchiveMode ? (
        <>
          {onExtract && (
            <button className="toolbar-btn toolbar-btn-highlight" onClick={onExtract} title="Extract files from this archive">
              <IconExtract size={22} />
              <span>{t('toolbar.extractAll', 'Extract All')}</span>
            </button>
          )}
          {onTestIntegrity && (
            <button className="toolbar-btn" onClick={onTestIntegrity} title="Verify archive CRC32/BLAKE3 integrity">
              <IconShieldOk size={22} />
              <span>{t('toolbar.verify', 'Verify')}</span>
            </button>
          )}
          {onCloseArchive && (
            <button className="toolbar-btn" onClick={onCloseArchive} title="Close archive and return to folder">
              <IconX size={20} />
              <span>{t('toolbar.close', 'Close')}</span>
            </button>
          )}
          {archiveName && (
            <div className="toolbar-archive-indicator">
              <span className="toolbar-archive-badge">{t('browser.archive', 'ARCHIVE')}</span>
              <span className="toolbar-archive-name" title={archiveName}>{archiveName}</span>
            </div>
          )}
        </>
      ) : (
        <>
          {onNew && (
            <button className="toolbar-btn" onClick={onNew} title="Create new archive (Ctrl+N)">
              <IconNew size={22} />
              <span>{t('toolbar.new', 'New')}</span>
            </button>
          )}
          {onOpen && (
            <button className="toolbar-btn" onClick={onOpen} title="Open selected archive/folder, or choose file to open (Ctrl+O)">
              <IconOpen size={22} />
              <span>{t('toolbar.open', 'Open')}</span>
            </button>
          )}
          {(onNew || onOpen) && (onAdd || onExtract) && <div className="toolbar-separator" />}
          {onAdd && (
            <button className="toolbar-btn" onClick={onAdd} disabled={addDisabled} title="Add selected files to archive">
              <IconAdd size={22} />
              <span>{t('toolbar.addTo', 'Add To')}</span>
            </button>
          )}
          {onExtract && !selectedArchive && (
            <button className="toolbar-btn" onClick={onExtract} title="Extract archive">
              <IconExtract size={22} />
              <span>{t('toolbar.extract', 'Extract')}</span>
            </button>
          )}

          {/* Dynamic Context Actions when an Archive file (.dzip, .zip, etc.) is selected */}
          {selectedArchive && (
            <>
              <div className="toolbar-separator" />
              <button
                className="toolbar-btn toolbar-btn-highlight"
                onClick={() => onInspectArchive?.(selectedArchive)}
                title={`Browse contents of ${selectedArchive.name}`}
              >
                <IconDzip size={20} />
                <span>{t('toolbar.browseContents', 'Browse Contents')}</span>
              </button>
              {onExtract && (
                <button
                  className="toolbar-btn"
                  onClick={onExtract}
                  title={`Extract ${selectedArchive.name}`}
                >
                  <IconExtract size={20} />
                  <span>{t('toolbar.extract', 'Extract')}</span>
                </button>
              )}
              {onVerifyArchive && (
                <button
                  className="toolbar-btn"
                  onClick={() => onVerifyArchive(selectedArchive)}
                  title={`Verify integrity of ${selectedArchive.name}`}
                >
                  <IconShieldOk size={20} />
                  <span>{t('toolbar.verify', 'Verify')}</span>
                </button>
              )}
              {onConvertArchive && (
                <button
                  className="toolbar-btn"
                  onClick={() => onConvertArchive(selectedArchive)}
                  title={`Convert ${selectedArchive.name} to another format`}
                >
                  <IconDuplicate size={18} />
                  <span>{t('toolbar.convert', 'Convert...')}</span>
                </button>
              )}
            </>
          )}

          {/* Selected file actions: Rename, Delete, Secure Shred */}
          {selectedCount > 0 && (
            <>
              <div className="toolbar-separator" />
              {onRename && selectedCount === 1 && (
                <button
                  className="toolbar-btn"
                  onClick={onRename}
                  title="Rename selected file or folder (F2)"
                >
                  <IconRename size={19} />
                  <span>{t('toolbar.rename', 'Rename')}</span>
                </button>
              )}
              {onDelete && (
                <button
                  className="toolbar-btn"
                  onClick={onDelete}
                  title="Delete selected item(s)"
                  style={{ color: '#ef4444' }}
                >
                  <IconTrash size={19} />
                  <span>{t('toolbar.delete', 'Delete')}{selectedCount > 1 ? ` (${selectedCount})` : ''}</span>
                </button>
              )}
              {onSecureDelete && canSecureDelete && (
                <button
                  className="toolbar-btn"
                  onClick={onSecureDelete}
                  title="Permanently overwrite and shred file data with zero recovery possibility"
                  style={{ color: '#dc2626' }}
                >
                  <IconShred size={19} />
                  <span>{t('toolbar.secureShred', 'Secure Shred')}{selectedCount > 1 ? ` (${selectedCount})` : ''}</span>
                </button>
              )}
            </>
          )}
        </>
      )}

      {/* Right-aligned Settings and About buttons */}
      <div className="toolbar-separator" style={{ marginLeft: 'auto' }} />
      {onBenchmark && (
        <button className="toolbar-btn" onClick={onBenchmark} title="CPU & Compression Speed Benchmark">
          <IconSpeed size={18} />
          <span>{t('toolbar.benchmark', 'Benchmark')}</span>
        </button>
      )}
      {onSettings && (
        <button className="toolbar-btn" onClick={onSettings} title="Settings: Updates, Language & Themes">
          <IconSettings size={18} />
          <span>{t('toolbar.settings', 'Settings')}</span>
        </button>
      )}
      {onAbout && (
        <button className="toolbar-btn" onClick={onAbout} title="About DodaZip">
          <span style={{ fontSize: 16, lineHeight: 1 }}>🛡️</span>
          <span>{t('toolbar.about', 'About')}</span>
        </button>
      )}
    </div>
  )
}
