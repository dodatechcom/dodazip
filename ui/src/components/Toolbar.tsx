import React from 'react'
import {
  IconNew, IconOpen, IconAdd, IconExtract, IconBack, IconShieldOk,
  IconX, IconDzip, IconDuplicate, IconRename, IconTrash, IconShred,
} from './Icons'
import { FileInfo } from '../types'

interface ToolbarProps {
  onNew?: () => void
  onOpen?: () => void
  onAdd?: () => void
  onExtract?: () => void
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
  onNew, onOpen, onAdd, onExtract, onAbout, onBack,
  addDisabled = false, showBack = false,
  isArchiveMode = false, archiveName, onTestIntegrity, onCloseArchive,
  selectedArchive, onInspectArchive, onVerifyArchive, onConvertArchive,
  selectedCount = 0, onRename, onDelete, onSecureDelete, canSecureDelete = true,
}) => (
  <div className="toolbar">
    {showBack && onBack && (
      <button className="toolbar-btn" onClick={onBack}>
        <IconBack size={22} />
        <span>Back</span>
      </button>
    )}
    {showBack && (onNew || onOpen || onAdd || onExtract) && <div className="toolbar-separator" />}

    {isArchiveMode ? (
      <>
        {onExtract && (
          <button className="toolbar-btn toolbar-btn-highlight" onClick={onExtract} title="Extract files from this archive">
            <IconExtract size={22} />
            <span>Extract All</span>
          </button>
        )}
        {onTestIntegrity && (
          <button className="toolbar-btn" onClick={onTestIntegrity} title="Verify archive CRC32/BLAKE3 integrity">
            <IconShieldOk size={22} />
            <span>Verify</span>
          </button>
        )}
        {onCloseArchive && (
          <button className="toolbar-btn" onClick={onCloseArchive} title="Close archive and return to folder">
            <IconX size={20} />
            <span>Close</span>
          </button>
        )}
        {archiveName && (
          <div className="toolbar-archive-indicator">
            <span className="toolbar-archive-badge">ARCHIVE</span>
            <span className="toolbar-archive-name" title={archiveName}>{archiveName}</span>
          </div>
        )}
      </>
    ) : (
      <>
        {onNew && (
          <button className="toolbar-btn" onClick={onNew} title="Create new archive (Ctrl+N)">
            <IconNew size={22} />
            <span>New</span>
          </button>
        )}
        {onOpen && (
          <button className="toolbar-btn" onClick={onOpen} title="Refresh / Browse folder">
            <IconOpen size={22} />
            <span>Open</span>
          </button>
        )}
        {(onNew || onOpen) && (onAdd || onExtract) && <div className="toolbar-separator" />}
        {onAdd && (
          <button className="toolbar-btn" onClick={onAdd} disabled={addDisabled} title="Add selected files to archive">
            <IconAdd size={22} />
            <span>Add To</span>
          </button>
        )}
        {onExtract && !selectedArchive && (
          <button className="toolbar-btn" onClick={onExtract} title="Extract archive">
            <IconExtract size={22} />
            <span>Extract</span>
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
              <span>Browse Contents</span>
            </button>
            {onExtract && (
              <button
                className="toolbar-btn"
                onClick={onExtract}
                title={`Extract ${selectedArchive.name}`}
              >
                <IconExtract size={20} />
                <span>Extract</span>
              </button>
            )}
            {onVerifyArchive && (
              <button
                className="toolbar-btn"
                onClick={() => onVerifyArchive(selectedArchive)}
                title={`Verify integrity of ${selectedArchive.name}`}
              >
                <IconShieldOk size={20} />
                <span>Verify</span>
              </button>
            )}
            {onConvertArchive && (
              <button
                className="toolbar-btn"
                onClick={() => onConvertArchive(selectedArchive)}
                title={`Convert ${selectedArchive.name} to another format`}
              >
                <IconDuplicate size={18} />
                <span>Convert...</span>
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
                title="Rename selected file or folder"
              >
                <IconRename size={19} />
                <span>Rename</span>
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
                <span>Delete{selectedCount > 1 ? ` (${selectedCount})` : ''}</span>
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
                <span>Secure Shred{selectedCount > 1 ? ` (${selectedCount})` : ''}</span>
              </button>
            )}
          </>
        )}
      </>
    )}

    {onAbout && (
      <>
        <div className="toolbar-separator" style={{ marginLeft: 'auto' }} />
        <button className="toolbar-btn" onClick={onAbout} title="About DodaZip">
          <span style={{ fontSize: 16, lineHeight: 1 }}>🛡️</span>
          <span>About</span>
        </button>
      </>
    )}
  </div>
)
