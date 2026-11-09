import { invoke as tauriInvoke } from '@tauri-apps/api/core'
import { listen as tauriListen, UnlistenFn, EventCallback } from '@tauri-apps/api/event'
import { FileInfo, DuplicateGroup } from '../types'

export const isTauri = (): boolean => {
  return typeof window !== 'undefined' && Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__)
}

// In-memory mock filesystem for browser testing
const MOCK_FILESYSTEM: Record<string, FileInfo[]> = {
  'C:\\projects\\DodaZip': [
    { name: 'src', path: 'C:\\projects\\DodaZip\\src', size: 0, is_dir: true, is_file: false },
    { name: 'src-tauri', path: 'C:\\projects\\DodaZip\\src-tauri', size: 0, is_dir: true, is_file: false },
    { name: 'ui', path: 'C:\\projects\\DodaZip\\ui', size: 0, is_dir: true, is_file: false },
    { name: 'scripts', path: 'C:\\projects\\DodaZip\\scripts', size: 0, is_dir: true, is_file: false },
    { name: 'Cargo.toml', path: 'C:\\projects\\DodaZip\\Cargo.toml', size: 1213, is_dir: false, is_file: true },
    { name: 'package.json', path: 'C:\\projects\\DodaZip\\package.json', size: 251, is_dir: false, is_file: true },
    { name: 'README.md', path: 'C:\\projects\\DodaZip\\README.md', size: 27574, is_dir: false, is_file: true },
    { name: 'backup_vault.dzip', path: 'C:\\projects\\DodaZip\\backup_vault.dzip', size: 10485760, is_dir: false, is_file: true },
  ],
  'C:\\projects': [
    { name: 'DodaZip', path: 'C:\\projects\\DodaZip', size: 0, is_dir: true, is_file: false },
  ],
  'C:\\': [
    { name: 'projects', path: 'C:\\projects', size: 0, is_dir: true, is_file: false },
    { name: 'Users', path: 'C:\\Users', size: 0, is_dir: true, is_file: false },
    { name: 'Windows', path: 'C:\\Windows', size: 0, is_dir: true, is_file: false },
  ],
  '/home/user/Documents': [
    { name: 'Projects', path: '/home/user/Documents/Projects', size: 0, is_dir: true, is_file: false },
    { name: 'Photos', path: '/home/user/Documents/Photos', size: 0, is_dir: true, is_file: false },
    { name: 'Annual_Report_2026.pdf', path: '/home/user/Documents/Annual_Report_2026.pdf', size: 2450000, is_dir: false, is_file: true },
    { name: 'backup_vault.dzip', path: '/home/user/Documents/backup_vault.dzip', size: 10485760, is_dir: false, is_file: true },
    { name: 'legacy_data.zip', path: '/home/user/Documents/legacy_data.zip', size: 5242880, is_dir: false, is_file: true },
    { name: 'source_code.tar.gz', path: '/home/user/Documents/source_code.tar.gz', size: 1843200, is_dir: false, is_file: true },
    { name: 'notes.txt', path: '/home/user/Documents/notes.txt', size: 14200, is_dir: false, is_file: true },
  ],
  '/home/user/Documents/Projects': [
    { name: 'DodaZIP', path: '/home/user/Documents/Projects/DodaZIP', size: 0, is_dir: true, is_file: false },
    { name: 'Client_Brief.docx', path: '/home/user/Documents/Projects/Client_Brief.docx', size: 84000, is_dir: false, is_file: true },
  ],
  '/home/user/Documents/Photos': [
    { name: 'vacation_highres.jpg', path: '/home/user/Documents/Photos/vacation_highres.jpg', size: 4500000, is_dir: false, is_file: true },
    { name: 'diagram_schematic.png', path: '/home/user/Documents/Photos/diagram_schematic.png', size: 1200000, is_dir: false, is_file: true },
  ],
}

export async function safeInvoke<T>(cmd: string, args?: Record<string, any>): Promise<T> {
  if (isTauri()) {
    return tauriInvoke<T>(cmd, args)
  }

  // Browser Mock Handlers
  console.info(`[DodaZIP Web Mock] invoke('${cmd}', ${JSON.stringify(args || {})})`)

  switch (cmd) {
    case 'list_directory': {
      const p = args?.path || 'C:\\projects\\DodaZip'
      const items = MOCK_FILESYSTEM[p] || [
        { name: 'example_file.txt', path: `${p}\\example_file.txt`, size: 1024, is_dir: false, is_file: true },
      ]
      return items as unknown as T
    }

    case 'list_archive': {
      const mockArchiveEntries = [
        { path: 'documents/readme.txt', size: 2450 },
        { path: 'documents/data.csv', size: 45200 },
        { path: 'images/cover.png', size: 350000 },
        { path: 'scripts/installer.exe', size: 1200000 }, // Demonstrates Security Risk Shield
        { path: 'invoice_details.pdf.bat', size: 8400 },   // Demonstrates Deceptive Double Extension
      ]
      return mockArchiveEntries as unknown as T
    }

    case 'compress_files':
    case 'extract_archive':
    case 'convert_archive':
    case 'rename_file':
    case 'verify_archive': {
      return {
        valid: true,
        entries: 12,
        total_size: 4520000,
        error: null,
      } as unknown as T
    }

    case 'get_launch_file': {
      return null as unknown as T
    }

    case 'delete_file':
    case 'delete_file_secure':
      return null as unknown as T

    case 'find_duplicate_files': {
      const mockDups: DuplicateGroup[] = [
        {
          hash: 'blake3_mock_hash_1',
          size: 4500000,
          files: [
            '/home/user/Documents/Photos/vacation_highres.jpg',
            '/home/user/Documents/Photos/vacation_copy.jpg',
          ],
        },
      ]
      return mockDups as unknown as T
    }

    default:
      console.warn(`[DodaZIP Web Mock] Unhandled command: ${cmd}`)
      return null as unknown as T
  }
}

export function safeListen<T>(event: string, handler: EventCallback<T>): Promise<UnlistenFn> {
  if (isTauri()) {
    return tauriListen<T>(event, handler)
  }
  return Promise.resolve(() => {})
}

export async function safePickDirectory(defaultPath?: string): Promise<string | null> {
  if (isTauri()) {
    try {
      const res = await safeInvoke<string | null>('pick_folder_dialog', { defaultPath })
      if (res) return res
    } catch (e) {
      console.warn('Backend pick_folder_dialog failed, falling back to plugin-dialog:', e)
      try {
        const { open } = await import('@tauri-apps/plugin-dialog')
        const selected = await open({
          directory: true,
          multiple: false,
          defaultPath,
        })
        if (typeof selected === 'string') return selected
        return null
      } catch (err) {
        console.error('Failed to open native directory dialog', err)
      }
    }
    return null
  }

  // Browser fallback prompt
  const choice = window.prompt('Enter destination directory path:', defaultPath || '/home/user/Documents/Extracted')
  return choice ? choice.trim() : null
}

export async function safePickArchiveOrFile(defaultPath?: string): Promise<string | null> {
  if (isTauri()) {
    try {
      const res = await safeInvoke<string | null>('pick_archive_file', { defaultPath })
      if (res) return res
    } catch (e) {
      console.warn('Backend pick_archive_file failed, falling back to plugin-dialog:', e)
      try {
        const { open } = await import('@tauri-apps/plugin-dialog')
        const selected = await open({
          directory: false,
          multiple: false,
          defaultPath,
          filters: [
            {
              name: 'Supported Archives',
              extensions: ['zip', 'dzip', '7z', 'rar', 'tar', 'gz', 'bz2', 'xz', 'tgz', 'tbz2', 'txz', 'cab', 'deb', 'ar', 'iso', 'dmg'],
            },
            {
              name: 'All Files',
              extensions: ['*'],
            },
          ],
        })
        if (typeof selected === 'string') return selected
        return null
      } catch (err) {
        console.error('Failed to open native archive dialog', err)
      }
    }
    return null
  }

  // Browser fallback prompt
  const choice = window.prompt('Enter archive file path to open:', defaultPath || 'C:\\projects\\DodaZip\\backup_vault.dzip')
  return choice ? choice.trim() : null
}

export function safeOpenUrl(url: string): void {
  if (isTauri()) {
    safeInvoke('open_in_browser', { url }).catch(() => {
      if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    })
    return
  }

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

export async function safeStartDrag(paths: string[], iconPath?: string): Promise<void> {
  if (isTauri()) {
    try {
      // Attempt to invoke native drag-out handler if available
      await tauriInvoke('start_drag', { paths, icon: iconPath || '' })
    } catch (e) {
      // Graceful fallback to HTML5 dataTransfer
      console.info('[DodaZIP] Native OS drag-and-drop out waiting for backend handler:', e)
    }
  }
}


