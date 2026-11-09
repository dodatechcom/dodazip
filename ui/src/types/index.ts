export interface FileInfo {
  path: string
  name: string
  size: number
  is_dir: boolean
  is_file: boolean
  modified?: number | null
  file_type?: string | null
  attributes?: string | null
}

export interface ArchiveEntry {
  path: string
  size: number
  chunks: number
}

export type CompressionLevel = 'fast' | 'balanced' | 'max' | 'store'
export type EccLevel = 'low' | 'medium' | 'high'
export type SplitPreset = 'none' | 'discord' | 'email' | 'fat32'

export interface CompressionOptionsPayload {
  codec: string
  level: string
  dedup: boolean
  password: string | null
  ecc_level: string | null
  split_size?: number | null
}

export interface ExtractionOptionsPayload {
  password: string | null
  smart_unpack?: boolean | null
}

export interface DuplicateGroup {
  hash: string
  files: string[]
  size: number
}

export interface ArchiveContext {
  archivePath: string
  archiveName: string
  innerPath: string
  entries: ArchiveEntry[]
  totalSize: number
}

export interface TabState {
  id: string
  path: string
  label: string
  archiveContext?: ArchiveContext | null
  filterQuery?: string
  sortKey?: 'name' | 'size' | 'type' | 'modified'
  sortDir?: 'asc' | 'desc'
  selectedFiles?: string[]
  scrollPosition?: number
  history?: string[]
  historyIndex?: number
}

export interface Bookmark {
  path: string
  label: string
}
