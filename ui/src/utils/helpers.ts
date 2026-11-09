import { FileInfo, ArchiveEntry } from '../types'

export const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export const getFileExtension = (name: string): string => {
  const lower = name.toLowerCase()
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) return '.tar.gz'
  if (lower.endsWith('.tar.bz2') || lower.endsWith('.tbz2')) return '.tar.bz2'
  if (lower.endsWith('.tar.xz') || lower.endsWith('.txz')) return '.tar.xz'
  const match = lower.match(/\.[a-z0-9]+$/)
  return match ? match[0] : ''
}

export const isArchiveFile = (name: string): boolean =>
  /\.(dzip|zip|7z|rar|tar\.gz|tar\.bz2|tar\.xz|tar|gz|bz2|xz|tgz|tbz2|txz)$/i.test(name)

export const isRiskyFile = (name: string): boolean => {
  const lower = name.toLowerCase()
  // Check for known executable/script extensions
  if (/\.(exe|bat|cmd|scr|vbs|ps1|msi|iso|vbe|wsf|hta|cpl)$/i.test(lower)) {
    return true
  }
  // Check for deceptive double extensions (e.g. document.pdf.exe)
  if (/\.(pdf|doc|docx|xls|xlsx|jpg|jpeg|png|txt)\.(exe|bat|cmd|scr|vbs|ps1|msi|iso)$/i.test(lower)) {
    return true
  }
  return false
}

export const ARCHIVE_TYPES = [
  { ext: 'dzip', label: 'DodaZIP Vault (.dzip)' },
  { ext: 'zip', label: 'Universal ZIP (.zip)' },
  { ext: '7z', label: '7-Zip Archive (.7z)' },
  { ext: 'rar', label: 'RAR Archive' },
  { ext: 'tar.gz', label: 'GZip Tarball' },
  { ext: 'tar.bz2', label: 'BZip2 Tarball' },
  { ext: 'tar.xz', label: 'XZ Tarball' },
  { ext: 'tar', label: 'Tarball' },
  { ext: 'gz', label: 'GZip Compressed' },
  { ext: 'bz2', label: 'BZip2 Compressed' },
  { ext: 'xz', label: 'XZ Compressed' },
]

export const formatDate = (epochSeconds?: number | null): string => {
  if (!epochSeconds) return '—'
  const d = new Date(epochSeconds * 1000)
  const pad = (n: number) => n.toString().padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const min = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`
}

export const getFileType = (name: string, isDir: boolean): string => {
  if (isDir) return 'File folder'
  const ext = getFileExtension(name).replace(/^\./, '').toLowerCase()
  switch (ext) {
    case 'dzip': return 'DodaZip Vault'
    case 'zip': return 'ZIP Archive'
    case '7z': return '7-Zip Archive'
    case 'rar': return 'RAR Archive'
    case 'tar': return 'TAR Archive'
    case 'tar.gz': case 'tgz': case 'gz': return 'GZIP Compressed'
    case 'tar.bz2': case 'tbz2': case 'bz2': return 'BZIP2 Compressed'
    case 'tar.xz': case 'txz': case 'xz': return 'XZ Compressed'
    case 'iso': return 'Disc Image (ISO)'
    case 'dmg': return 'Apple Disk Image'
    case 'cab': return 'Windows Cabinet'
    case 'deb': return 'Debian Package'
    case 'rpm': return 'RPM Package'
    case 'exe': return 'Application'
    case 'msi': return 'Windows Installer'
    case 'bat': case 'cmd': return 'Command Script'
    case 'ps1': return 'PowerShell Script'
    case 'sh': return 'Shell Script'
    case 'jpg': case 'jpeg': return 'JPEG Image'
    case 'png': return 'PNG Image'
    case 'gif': return 'GIF Image'
    case 'svg': return 'SVG Image'
    case 'webp': return 'WebP Image'
    case 'ico': return 'Icon File'
    case 'mp4': case 'mkv': case 'avi': case 'mov': case 'wmv': return 'Video File'
    case 'mp3': case 'wav': case 'flac': case 'aac': return 'Audio File'
    case 'pdf': return 'PDF Document'
    case 'doc': case 'docx': return 'Word Document'
    case 'xls': case 'xlsx': return 'Excel Worksheet'
    case 'ppt': case 'pptx': return 'PowerPoint Presentation'
    case 'txt': return 'Text Document'
    case 'md': return 'Markdown File'
    case 'json': return 'JSON Document'
    case 'xml': return 'XML Document'
    case 'csv': return 'CSV Spreadsheet'
    case 'html': case 'htm': return 'HTML Document'
    case 'css': return 'CSS Stylesheet'
    case 'js': return 'JavaScript File'
    case 'ts': case 'tsx': return 'TypeScript File'
    case 'rs': return 'Rust Source'
    case 'py': return 'Python Source'
    case 'c': case 'cpp': case 'h': return 'C/C++ Source'
    case 'dll': return 'Application Extension'
    case 'sys': return 'System File'
    case 'log': return 'Log File'
    case 'ini': case 'cfg': case 'toml': case 'yaml': case 'yml': return 'Configuration'
    case '': return 'File'
    default: return `${ext.toUpperCase()} File`
  }
}

export const sortByTypeAndName = (files: FileInfo[]): FileInfo[] =>
  [...files].sort((a, b) => {
    if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1
    return a.name.localeCompare(b.name)
  })

/* ── Archive Virtual Directory Navigation ── */

export function getArchiveDirectoryItems(entries: ArchiveEntry[], innerPath: string): FileInfo[] {
  const normInner = innerPath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
  const prefix = normInner ? normInner + '/' : ''
  const dirMap = new Map<string, { size: number; count: number }>()
  const fileList: FileInfo[] = []

  for (const entry of entries) {
    const rawPath = entry.path.replace(/\\/g, '/').replace(/^\/+/, '')
    if (!rawPath || rawPath === normInner || rawPath === prefix) continue

    if (prefix && !rawPath.startsWith(prefix)) {
      continue
    }

    const rel = prefix ? rawPath.slice(prefix.length) : rawPath
    const parts = rel.split('/').filter(Boolean)
    if (parts.length === 0) continue

    if (parts.length === 1 && !rawPath.endsWith('/')) {
      fileList.push({
        name: parts[0],
        path: rawPath,
        size: entry.size,
        is_dir: false,
        is_file: true,
        modified: null,
        file_type: getFileType(parts[0], false),
        attributes: 'A',
      })
    } else {
      const folderName = parts[0]
      const folderPath = prefix ? `${prefix}${folderName}` : folderName
      const existing = dirMap.get(folderPath) || { size: 0, count: 0 }
      existing.size += entry.size
      existing.count += 1
      dirMap.set(folderPath, existing)
    }
  }

  const dirList: FileInfo[] = Array.from(dirMap.entries()).map(([dirPath, data]) => {
    const name = dirPath.split('/').pop() || dirPath
    return {
      name,
      path: dirPath,
      size: data.size,
      is_dir: true,
      is_file: false,
      modified: null,
      file_type: 'File folder',
      attributes: 'D',
    }
  })

  dirList.sort((a, b) => a.name.localeCompare(b.name))
  fileList.sort((a, b) => a.name.localeCompare(b.name))

  return [...dirList, ...fileList]
}

/* ── Cross-platform Path Helpers ── */

export const isWindowsRoot = (p: string): boolean => {
  return /^[a-zA-Z]:[/\\]?$/.test(p.trim())
}

export const getPathSeparator = (p: string): '/' | '\\' => {
  return p.includes('\\') ? '\\' : '/'
}

export const getPathBaseName = (p: string): string => {
  if (!p) return 'Home'
  const trimmed = p.replace(/[/\\]+$/, '')
  if (isWindowsRoot(p)) {
    return p.toUpperCase()
  }
  if (trimmed === '' && (p.startsWith('/') || p.startsWith('\\'))) {
    return '/'
  }
  const parts = trimmed.split(/[/\\]/).filter(Boolean)
  return parts.length > 0 ? parts[parts.length - 1] : p
}

export const getParentPath = (p: string): string | null => {
  if (!p) return null
  const trimmed = p.replace(/[/\\]+$/, '')

  if (isWindowsRoot(trimmed) || trimmed === '' || trimmed === '/') {
    return null
  }

  const winMatch = trimmed.match(/^([a-zA-Z]:)[/\\](.*)$/)
  if (winMatch) {
    const drive = winMatch[1].toUpperCase()
    const rest = winMatch[2]
    const sep = p.includes('\\') ? '\\' : '/'
    const subParts = rest.split(/[/\\]/).filter(Boolean)
    if (subParts.length <= 1) {
      return `${drive}${sep}`
    }
    subParts.pop()
    return `${drive}${sep}${subParts.join(sep)}`
  }

  const sep = p.includes('\\') ? '\\' : '/'
  const idx = trimmed.lastIndexOf(sep)
  if (idx === -1) {
    const altIdx = trimmed.lastIndexOf(sep === '/' ? '\\' : '/')
    if (altIdx === -1) return null
    if (altIdx === 0) return '/'
    return trimmed.substring(0, altIdx)
  }
  if (idx === 0) return '/'
  return trimmed.substring(0, idx)
}

export const getPathSegments = (p: string): { label: string; path: string }[] => {
  if (!p) return []
  const segments: { label: string; path: string }[] = []
  const sep = p.includes('\\') ? '\\' : '/'

  const winMatch = p.match(/^([a-zA-Z]:)(?:[/\\](.*))?$/)
  if (winMatch) {
    const drive = winMatch[1].toUpperCase()
    const rest = winMatch[2] || ''
    const rootPath = `${drive}${sep}`
    segments.push({ label: drive, path: rootPath })

    if (rest) {
      const parts = rest.split(/[/\\]/).filter(Boolean)
      let cur = rootPath
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i]
        cur = i === 0 ? `${rootPath}${part}` : `${cur}${sep}${part}`
        segments.push({ label: part, path: cur })
      }
    }
    return segments
  }

  if (p.startsWith('/')) {
    segments.push({ label: '/', path: '/' })
    const parts = p.split('/').filter(Boolean)
    let cur = ''
    for (const part of parts) {
      cur += '/' + part
      segments.push({ label: part, path: cur })
    }
    return segments
  }

  const parts = p.split(/[/\\]/).filter(Boolean)
  let cur = ''
  for (const part of parts) {
    cur = cur ? `${cur}${sep}${part}` : part
    segments.push({ label: part, path: cur })
  }
  return segments
}

export const joinPath = (dir: string, file: string): string => {
  if (!dir) return file
  const sep = dir.includes('\\') ? '\\' : '/'
  const cleanDir = dir.replace(/[/\\]+$/, '')
  const cleanFile = file.replace(/^[/\\]+/, '')
  if (/^[a-zA-Z]:$/.test(cleanDir)) {
    return `${cleanDir}${sep}${cleanFile}`
  }
  return `${cleanDir}${sep}${cleanFile}`
}
