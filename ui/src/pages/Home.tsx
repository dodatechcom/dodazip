import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { safeInvoke as invoke, safeStartDrag, safePickArchiveOrFile, safeOpenUrl } from '../utils/tauriBridge'
import { FileInfo, Bookmark, DuplicateGroup, TabState, ArchiveEntry, ArchiveContext } from '../types'
import {
  formatSize,
  getPathBaseName,
  getParentPath,
  getPathSegments,
  joinPath,
  getArchiveDirectoryItems,
} from '../utils/helpers'
import { preferences, resolveTheme } from '../utils/preferences'
import { checkForUpdates, UpdateInfo } from '../utils/updateChecker'
import { Toolbar } from '../components/Toolbar'
import { ContextMenu, ContextMenuItem } from '../components/ContextMenu'
import { Message } from '../components/Message'
import { AboutModal } from '../components/AboutModal'
import { SettingsModal } from '../components/SettingsModal'
import { CompressModal } from '../components/CompressModal'
import { DeleteConfirmModal } from '../components/DeleteConfirmModal'
import {
  FileRowIcon, IconAdd, IconUp, IconEmptyFolder, IconLoader,
  IconSearch, IconClear, IconSortAsc, IconSortDesc, IconSun, IconMoon,
  IconBookmark, IconDuplicate, IconX, IconFolder, IconDzip, IconShieldOk,
  IconExtract,
} from '../components/Icons'

type SortKey = 'name' | 'size'
type SortDir = 'asc' | 'desc'

let tabCounter = 0
function nextTabId(): string { return `tab-${++tabCounter}` }

export const Home: React.FC = () => {
  const navigate = useNavigate()

  /* ── Tab state initialized with restored session ── */
  const [tabs, setTabs] = useState<TabState[]>(() => {
    const saved = preferences.savedTabs
    if (saved && saved.length > 0) {
      return saved.map(s => ({
        id: s.id || nextTabId(),
        path: s.path,
        label: s.label || getPathBaseName(s.path),
        archiveContext: null,
        filterQuery: '',
        sortKey: 'name',
        sortDir: 'asc',
        selectedFiles: [],
        scrollPosition: 0,
      }))
    }
    const initPath = preferences.lastDir || ''
    return [
      {
        id: nextTabId(),
        path: initPath,
        label: getPathBaseName(initPath),
        archiveContext: null,
        filterQuery: '',
        sortKey: 'name',
        sortDir: 'asc',
        selectedFiles: [],
        scrollPosition: 0,
      },
    ]
  })

  const [activeTabId, setActiveTabId] = useState(tabs[0].id)
  const activeTabIdRef = useRef(activeTabId)
  activeTabIdRef.current = activeTabId
  const tabsRef = useRef(tabs)
  tabsRef.current = tabs

  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => preferences.bookmarks)
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [currentPath, setCurrentPath] = useState(tabs[0].path)
  const [files, setFiles] = useState<FileInfo[]>([])
  const [archiveContext, setArchiveContext] = useState<ArchiveContext | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [filterQuery, setFilterQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; file?: FileInfo } | null>(null)
  const [tabCtxMenu, setTabCtxMenu] = useState<{ x: number; y: number; tab: TabState } | null>(null)
  const [bookmarkCtxMenu, setBookmarkCtxMenu] = useState<{ x: number; y: number; index: number; bookmark: Bookmark } | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => resolveTheme(preferences.theme))
  const [message, setMessage] = useState('')
  const [msgType, setMsgType] = useState<'info' | 'success' | 'error'>('info')
  const [renaming, setRenaming] = useState<{ path: string; name: string } | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [busy, setBusy] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicateGroup[] | null>(null)
  const [findingDups, setFindingDups] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [updateNotice, setUpdateNotice] = useState<UpdateInfo | null>(null)

  // Auto-check for updates on application startup
  useEffect(() => {
    if (preferences.autoCheckUpdates) {
      checkForUpdates()
        .then((res) => {
          if (res.hasUpdate) {
            setUpdateNotice(res)
          }
        })
        .catch(() => {})
    }
  }, [])
  const [compressModal, setCompressModal] = useState<{
    isOpen: boolean
    selectedFiles: string[]
    currentDir: string
  }>({
    isOpen: false,
    selectedFiles: [],
    currentDir: '',
  })

  const [verificationResult, setVerificationResult] = useState<{
    isOpen: boolean
    valid: boolean
    archiveName: string
    entries: number
    totalSize: number
    error: string | null
  } | null>(null)

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    isSecure: boolean
    targets: Array<{ name: string; path: string; size?: number; is_dir?: boolean }>
  }>({
    isOpen: false,
    isSecure: false,
    targets: [],
  })
  const [deleteBusy, setDeleteBusy] = useState(false)

  const openCompressModal = useCallback((files: string[]) => {
    setCompressModal({
      isOpen: true,
      selectedFiles: files,
      currentDir: currentPath || '',
    })
  }, [currentPath])

  const renameInputRef = useRef<HTMLInputElement>(null)
  const lastClickedRef = useRef(-1)
  const fileListRef = useRef<HTMLDivElement>(null)
  const bookmarksRef = useRef<HTMLDivElement>(null)

  // Detect user home path dynamically for sidebar
  const userHome = useMemo(() => {
    const p = currentPath || preferences.lastDir || ''
    const match = p.match(/^([a-zA-Z]:[/\\]Users[/\\][^/\\]+)/i)
    if (match) return match[1].replace(/\\/g, '/')
    return 'C:/Users/admin'
  }, [currentPath])

  // Persist tabs
  useEffect(() => {
    preferences.savedTabs = tabs.map(t => ({ id: t.id, path: t.path, label: t.label }))
  }, [tabs])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (preferences.theme === 'auto') setTheme(resolveTheme('auto'))
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const showMsg = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setMessage(text); setMsgType(type)
    setTimeout(() => setMessage(''), 5000)
  }

  const cycleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    preferences.theme = next
  }

  const isArchive = (name: string) => /\.(dzip|zip|7z|rar|tar\.gz|tar\.bz2|tar\.xz|tar|gz|bz2|xz)$/i.test(name)

  /* ── Load real directory from OS ── */
  const loadDirectory = useCallback(async (path?: string, resetFilter = false) => {
    setLoading(true)
    setArchiveContext(null)
    try {
      const result: FileInfo[] = await invoke('list_directory', { path })
      setFiles(result)
      if (path !== undefined) {
        setCurrentPath(path)
        preferences.lastDir = path
        const label = getPathBaseName(path)
        setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? {
          ...t, path, label, archiveContext: null
        } : t))
      }
      if (resetFilter) {
        setFilterQuery('')
      }
    } catch (error) {
      showMsg(`Failed to load directory: ${error}`, 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  /* ── Open Archive directly inside File Browser (Virtual Navigation) ── */
  const openArchiveInBrowser = useCallback(async (archivePath: string, archiveName: string) => {
    setLoading(true)
    try {
      const rawEntries = await invoke<ArchiveEntry[]>('list_archive', {
        archivePath,
        password: null,
      })
      const entries = rawEntries || []
      const totalSize = entries.reduce((acc, e) => acc + e.size, 0)
      const ctx: ArchiveContext = {
        archivePath,
        archiveName,
        innerPath: '',
        entries,
        totalSize,
      }
      setArchiveContext(ctx)
      setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? {
        ...t,
        label: `📦 ${archiveName}`,
        archiveContext: ctx,
      } : t))
      setFilterQuery('')
      setSelectedFiles(new Set())
    } catch (err) {
      showMsg(`Failed to inspect archive: ${err}`, 'error')
      // If error (e.g. encrypted), navigate to extraction dialog
      navigate('/extract', { state: { archivePath } })
    } finally {
      setLoading(false)
    }
  }, [navigate])

  // Handle opening archive passed via Windows Explorer / Command Line
  useEffect(() => {
    invoke<string | null>('get_launch_file')
      .then((file) => {
        if (file && isArchive(file)) {
          openArchiveInBrowser(file, getPathBaseName(file))
        }
      })
      .catch(() => {})
  }, [openArchiveInBrowser])

  const exitArchiveMode = useCallback(() => {
    if (!archiveContext) return
    const hostDir = getParentPath(archiveContext.archivePath) || currentPath
    setArchiveContext(null)
    setTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? {
      ...t,
      label: getPathBaseName(hostDir),
      archiveContext: null,
    } : t))
    loadDirectory(hostDir, true)
  }, [archiveContext, currentPath, loadDirectory])

  /* ── Tab switching with full state preservation ── */
  const switchTab = useCallback((tabId: string) => {
    if (tabId === activeTabIdRef.current) return
    const currentTabId = activeTabIdRef.current
    const currentScroll = fileListRef.current?.scrollTop || 0

    // Snapshot outgoing tab's view state
    setTabs(prev => prev.map(t => {
      if (t.id === currentTabId) {
        return {
          ...t,
          path: currentPath,
          archiveContext,
          filterQuery,
          sortKey,
          sortDir,
          selectedFiles: Array.from(selectedFiles),
          scrollPosition: currentScroll,
        }
      }
      return t
    }))

    const target = tabsRef.current.find(t => t.id === tabId)
    if (!target) return

    setActiveTabId(tabId)
    setCurrentPath(target.path)
    setFilterQuery(target.filterQuery || '')
    setSortKey(target.sortKey || 'name')
    setSortDir(target.sortDir || 'asc')
    setSelectedFiles(new Set(target.selectedFiles || []))

    if (target.archiveContext) {
      setArchiveContext(target.archiveContext)
      setLoading(false)
    } else {
      setArchiveContext(null)
      loadDirectory(target.path || undefined, false)
    }

    setTimeout(() => {
      if (fileListRef.current && target.scrollPosition !== undefined) {
        fileListRef.current.scrollTop = target.scrollPosition
      }
    }, 40)
  }, [currentPath, archiveContext, filterQuery, sortKey, sortDir, selectedFiles, loadDirectory])

  const addTab = useCallback((targetPath?: string) => {
    const p = targetPath || currentPath || preferences.lastDir || ''
    const label = getPathBaseName(p)
    const newTab: TabState = {
      id: nextTabId(),
      path: p,
      label,
      archiveContext: null,
      filterQuery: '',
      sortKey: 'name',
      sortDir: 'asc',
      selectedFiles: [],
      scrollPosition: 0,
    }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
    setCurrentPath(p)
    setArchiveContext(null)
    setFilterQuery('')
    setSelectedFiles(new Set())
    loadDirectory(p || undefined, true)
  }, [currentPath, loadDirectory])

  const duplicateTab = useCallback((tabId: string) => {
    const tab = tabs.find(t => t.id === tabId)
    if (!tab) return
    const newTab: TabState = {
      ...tab,
      id: nextTabId(),
      label: tab.label,
    }
    const idx = tabs.findIndex(t => t.id === tabId)
    const nextTabs = [...tabs]
    nextTabs.splice(idx + 1, 0, newTab)
    setTabs(nextTabs)
    setActiveTabId(newTab.id)
    setCurrentPath(newTab.path)
    setArchiveContext(newTab.archiveContext || null)
    setFilterQuery(newTab.filterQuery || '')
    setSortKey(newTab.sortKey || 'name')
    setSortDir(newTab.sortDir || 'asc')
    setSelectedFiles(new Set(newTab.selectedFiles || []))
    if (!newTab.archiveContext) {
      loadDirectory(newTab.path || undefined, false)
    }
  }, [tabs, loadDirectory])

  const closeTab = useCallback((tabId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (tabs.length <= 1) return
    const idx = tabs.findIndex(t => t.id === tabId)
    if (idx === -1) return

    const remaining = tabs.filter(t => t.id !== tabId)
    setTabs(remaining)

    if (activeTabId === tabId) {
      const nextIdx = Math.min(idx, remaining.length - 1)
      const nextTab = remaining[nextIdx]
      setActiveTabId(nextTab.id)
      setCurrentPath(nextTab.path)
      setArchiveContext(nextTab.archiveContext || null)
      setFilterQuery(nextTab.filterQuery || '')
      setSortKey(nextTab.sortKey || 'name')
      setSortDir(nextTab.sortDir || 'asc')
      setSelectedFiles(new Set(nextTab.selectedFiles || []))
      if (!nextTab.archiveContext) {
        loadDirectory(nextTab.path || undefined, false)
      }
    }
  }, [tabs, activeTabId, loadDirectory])

  const closeOtherTabs = useCallback((keepTabId: string) => {
    const keep = tabs.find(t => t.id === keepTabId)
    if (!keep) return
    setTabs([keep])
    if (activeTabId !== keepTabId) {
      setActiveTabId(keep.id)
      setCurrentPath(keep.path)
      setArchiveContext(keep.archiveContext || null)
      setFilterQuery(keep.filterQuery || '')
      setSortKey(keep.sortKey || 'name')
      setSortDir(keep.sortDir || 'asc')
      setSelectedFiles(new Set(keep.selectedFiles || []))
      if (!keep.archiveContext) {
        loadDirectory(keep.path || undefined, false)
      }
    }
  }, [tabs, activeTabId, loadDirectory])

  const closeTabsToRight = useCallback((tabId: string) => {
    const idx = tabs.findIndex(t => t.id === tabId)
    if (idx === -1 || idx === tabs.length - 1) return
    const remaining = tabs.slice(0, idx + 1)
    setTabs(remaining)
    if (!remaining.some(t => t.id === activeTabId)) {
      const active = remaining[remaining.length - 1]
      setActiveTabId(active.id)
      setCurrentPath(active.path)
      setArchiveContext(active.archiveContext || null)
      setFilterQuery(active.filterQuery || '')
      setSortKey(active.sortKey || 'name')
      setSortDir(active.sortDir || 'asc')
      setSelectedFiles(new Set(active.selectedFiles || []))
      if (!active.archiveContext) {
        loadDirectory(active.path || undefined, false)
      }
    }
  }, [tabs, activeTabId, loadDirectory])

  const cycleTab = useCallback((delta: number) => {
    if (tabs.length <= 1) return
    const idx = tabs.findIndex(t => t.id === activeTabId)
    if (idx === -1) return
    let nextIdx = (idx + delta) % tabs.length
    if (nextIdx < 0) nextIdx += tabs.length
    switchTab(tabs[nextIdx].id)
  }, [tabs, activeTabId, switchTab])

  /* ── Bookmarks ── */
  const toggleBookmark = (path?: string) => {
    const p = path || currentPath
    if (!p) return
    const existing = bookmarks.findIndex(b => b.path === p)
    if (existing >= 0) {
      const next = bookmarks.filter(b => b.path !== p)
      setBookmarks(next)
      preferences.bookmarks = next
    } else {
      const label = getPathBaseName(p)
      const next = [...bookmarks, { path: p, label }]
      setBookmarks(next)
      preferences.bookmarks = next
    }
  }

  const isBookmarked = (path?: string): boolean =>
    bookmarks.some(b => b.path === (path || currentPath))

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bookmarksRef.current && !bookmarksRef.current.contains(e.target as Node)) {
        setShowBookmarks(false)
      }
    }
    if (showBookmarks) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showBookmarks])

  // Initial load
  useEffect(() => {
    loadDirectory(tabs[0]?.path || undefined, false)
  }, []) // eslint-disable-line

  /* ── Active Items (real files or archive virtual entries) ── */
  const displayedFiles: FileInfo[] = useMemo(() => {
    if (archiveContext) {
      return getArchiveDirectoryItems(archiveContext.entries, archiveContext.innerPath)
    }
    return files
  }, [archiveContext, files])

  /* ── Navigation ── */
  const canGoUp = useMemo(() => {
    if (archiveContext) return true
    return getParentPath(currentPath) !== null
  }, [archiveContext, currentPath])

  const goUp = () => {
    if (archiveContext) {
      if (archiveContext.innerPath) {
        const parts = archiveContext.innerPath.split('/').filter(Boolean)
        parts.pop()
        const nextInner = parts.join('/')
        setArchiveContext({
          ...archiveContext,
          innerPath: nextInner,
        })
        setFilterQuery('')
        setSelectedFiles(new Set())
      } else {
        exitArchiveMode()
      }
      return
    }

    const parent = getParentPath(currentPath)
    if (parent) {
      loadDirectory(parent, true)
    }
  }

  const goToPath = (p: string) => {
    if (archiveContext) {
      setArchiveContext(null)
    }
    loadDirectory(p, true)
  }

  /* ── Breadcrumbs supporting Archive hierarchy ── */
  const breadcrumbs = useMemo(() => {
    if (archiveContext) {
      const hostSegments = getPathSegments(getParentPath(archiveContext.archivePath) || '')
      const archiveRoot = {
        label: `📦 ${archiveContext.archiveName}`,
        path: '__ARCHIVE_ROOT__',
      }
      const innerSegments = archiveContext.innerPath
        ? archiveContext.innerPath.split('/').filter(Boolean).map((part, idx, arr) => ({
            label: part,
            path: `__ARCHIVE_INNER__:${arr.slice(0, idx + 1).join('/')}`,
          }))
        : []
      return [...hostSegments, archiveRoot, ...innerSegments]
    }
    return getPathSegments(currentPath)
  }, [currentPath, archiveContext])

  const handleBreadcrumbClick = (seg: { label: string; path: string }) => {
    if (seg.path === '__ARCHIVE_ROOT__') {
      if (archiveContext) {
        setArchiveContext({ ...archiveContext, innerPath: '' })
        setFilterQuery('')
        setSelectedFiles(new Set())
      }
      return
    }
    if (seg.path.startsWith('__ARCHIVE_INNER__:')) {
      const inner = seg.path.replace('__ARCHIVE_INNER__:', '')
      if (archiveContext) {
        setArchiveContext({ ...archiveContext, innerPath: inner })
        setFilterQuery('')
        setSelectedFiles(new Set())
      }
      return
    }
    goToPath(seg.path)
  }

  const filteredFiles = useMemo(() => {
    let list = displayedFiles
    if (filterQuery) {
      const q = filterQuery.toLowerCase()
      list = list.filter(f => f.name.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1
      const mul = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'size') return (a.size - b.size) * mul
      return a.name.localeCompare(b.name) * mul
    })
  }, [displayedFiles, filterQuery, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return null
    return sortDir === 'asc' ? <IconSortAsc size={10} /> : <IconSortDesc size={10} />
  }

  const toggleSelected = (path: string) => {
    const next = new Set(selectedFiles)
    if (next.has(path)) next.delete(path)
    else next.add(path)
    setSelectedFiles(next)
  }

  const selectAll = () => {
    const all = new Set(filteredFiles.map(f => f.path))
    setSelectedFiles(all)
  }

  const clearSelection = () => setSelectedFiles(new Set())

  const estimatedSize = useMemo(() => {
    if (selectedFiles.size === 0) return ''
    let total = 0
    for (const f of displayedFiles) {
      if (selectedFiles.has(f.path)) total += f.size
    }
    return formatSize(total)
  }, [selectedFiles, displayedFiles])

  /* ── Double Click: Virtual folder navigation or archive inspection ── */
  const handleRowDoubleClick = useCallback((file: FileInfo) => {
    if (archiveContext) {
      if (file.is_dir) {
        setArchiveContext({
          ...archiveContext,
          innerPath: file.path,
        })
        setFilterQuery('')
        setSelectedFiles(new Set())
      } else {
        navigate('/extract', {
          state: {
            archivePath: archiveContext.archivePath,
            selectedItems: [file.path],
          }
        })
      }
      return
    }

    if (file.is_dir) {
      loadDirectory(file.path, true)
    } else if (isArchive(file.name)) {
      openArchiveInBrowser(file.path, file.name)
    }
  }, [archiveContext, navigate, loadDirectory, isArchive, openArchiveInBrowser])

  /* ── Universal Open Action: Opens selected archive/folder, or prompts native file dialog ── */
  const handleOpenAction = useCallback(async () => {
    // 1. If inside an archive
    if (archiveContext) {
      if (selectedFiles.size > 0) {
        const first = displayedFiles.find(f => selectedFiles.has(f.path))
        if (first) {
          handleRowDoubleClick(first)
          return
        }
      }
      // If nothing selected inside archive, allow picking an archive from disk
      const picked = await safePickArchiveOrFile(getParentPath(archiveContext.archivePath) || currentPath)
      if (picked) {
        if (isArchive(picked)) {
          openArchiveInBrowser(picked, getPathBaseName(picked))
        } else {
          loadDirectory(picked, true)
        }
      }
      return
    }

    // 2. If in regular file browser with selection
    if (selectedFiles.size > 0) {
      const first = displayedFiles.find(f => selectedFiles.has(f.path))
      if (first) {
        handleRowDoubleClick(first)
        return
      }
    }

    // 3. If nothing selected, launch native OS file dialog to choose an archive
    const picked = await safePickArchiveOrFile(currentPath)
    if (picked) {
      if (isArchive(picked)) {
        openArchiveInBrowser(picked, getPathBaseName(picked))
      } else {
        loadDirectory(picked, true)
      }
    }
  }, [archiveContext, selectedFiles, displayedFiles, handleRowDoubleClick, currentPath, isArchive, openArchiveInBrowser, loadDirectory])

  /* ── Keyboard Shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (ctxMenu || tabCtxMenu) return

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault()
        addTab(currentPath)
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault()
        closeTab(activeTabId)
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Tab') {
        e.preventDefault()
        cycleTab(e.shiftKey ? -1 : 1)
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
        const num = parseInt(e.key, 10)
        if (num >= 1 && num <= tabs.length) {
          e.preventDefault()
          switchTab(tabs[num - 1].id)
          return
        }
      }

      if (e.altKey && e.key === 'ArrowUp') {
        e.preventDefault()
        goUp()
        return
      }

      if (e.key === 'Escape') {
        if (filterQuery) { setFilterQuery(''); return }
        clearSelection()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault()
        selectAll()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        openCompressModal(Array.from(selectedFiles))
        return
      }

      if (e.key === 'F1') {
        e.preventDefault()
        safeOpenUrl('https://dodatech.com/docs/dodazip/')
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault()
        handleOpenAction()
        return
      }

      if (e.key === 'F5') {
        e.preventDefault()
        if (archiveContext) {
          openArchiveInBrowser(archiveContext.archivePath, archiveContext.archiveName)
        } else {
          loadDirectory(currentPath || undefined, false)
        }
        return
      }

      if (e.key === 'Enter' && selectedFiles.size > 0) {
        const first = displayedFiles.find(f => selectedFiles.has(f.path))
        if (first) {
          handleRowDoubleClick(first)
        }
        return
      }

      if (e.key === 'F2' && selectedFiles.size === 1) {
        const first = displayedFiles.find(f => selectedFiles.has(f.path))
        if (first) {
          e.preventDefault()
          startRename(first)
          return
        }
      }

      if (e.key === 'Delete' && selectedFiles.size > 0 && !archiveContext) {
        e.preventDefault()
        const targets = displayedFiles.filter(f => selectedFiles.has(f.path))
        if (e.shiftKey) {
          const filesOnly = targets.filter(f => !f.is_dir)
          if (filesOnly.length > 0) {
            confirmDeleteTargets(filesOnly, true)
          }
        } else {
          confirmDeleteTargets(targets, false)
        }
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    ctxMenu, tabCtxMenu, filterQuery, selectedFiles, filteredFiles, displayedFiles,
    currentPath, navigate, loadDirectory, tabs, activeTabId, addTab, closeTab,
    cycleTab, switchTab, canGoUp, archiveContext, openArchiveInBrowser
  ])

  /* ── Actions: Rename, Verify, Convert, Delete ── */
  const startRename = (file: FileInfo) => {
    setRenaming({ path: file.path, name: file.name })
    setTimeout(() => renameInputRef.current?.select(), 50)
  }

  const commitRename = async () => {
    if (!renaming) return
    const parent = getParentPath(renaming.path)
    const newPath = parent ? joinPath(parent, renaming.name) : renaming.name
    if (newPath === renaming.path) { setRenaming(null); return }
    try {
      await invoke('rename_file', { oldPath: renaming.path, newPath })
      showMsg('Renamed successfully', 'success')
      loadDirectory(currentPath || undefined, false)
    } catch (error) {
      showMsg(`Rename failed: ${error}`, 'error')
    }
    setRenaming(null)
  }

  const handleVerify = async (file: FileInfo) => {
    setVerifying(true)
    showMsg(`Verifying integrity of ${file.name}...`, 'info')
    try {
      const result = await invoke<{ valid: boolean; entries: number; total_size: number; error: string | null }>('verify_archive', { archivePath: file.path, password: null })
      if (result) {
        setVerificationResult({
          isOpen: true,
          valid: result.valid,
          archiveName: file.name,
          entries: result.entries,
          totalSize: result.total_size,
          error: result.error,
        })
        if (result.valid) {
          showMsg(`✓ ${file.name}: Verified 100% healthy`, 'success')
        } else {
          showMsg(`✕ ${file.name}: Integrity error detected`, 'error')
        }
      }
    } catch (error) {
      showMsg(`Verification failed: ${error}`, 'error')
      setVerificationResult({
        isOpen: true,
        valid: false,
        archiveName: file.name,
        entries: 0,
        totalSize: 0,
        error: String(error),
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleConvert = async (file: FileInfo) => {
    const dest = file.path.replace(/\.(dzip|zip|7z|rar|tar\.gz|tar\.bz2|tar\.xz|tar|gz|bz2|xz)$/i, '.zip')
    if (dest === file.path) {
      const base = file.path.replace(/\.[^.]+$/, '')
      const re = prompt('Save as:', base + '.zip')
      if (!re) return
      setBusy(true)
      try {
        await invoke('convert_archive', { source: file.path, dest: re, password: null })
        showMsg('Converted successfully', 'success')
        loadDirectory(currentPath || undefined, false)
      } catch (error) {
        showMsg(`Conversion failed: ${error}`, 'error')
      }
      setBusy(false)
      return
    }
    setBusy(true)
    try {
      await invoke('convert_archive', { source: file.path, dest, password: null })
      showMsg('Converted successfully', 'success')
      loadDirectory(currentPath || undefined, false)
    } catch (error) {
      showMsg(`Conversion failed: ${error}`, 'error')
    }
    setBusy(false)
  }

  const confirmDeleteTargets = (targets: FileInfo[], isSecure = false) => {
    if (targets.length === 0) return
    setDeleteModal({
      isOpen: true,
      isSecure,
      targets: targets.map(t => ({ name: t.name, path: t.path, size: t.size, is_dir: t.is_dir })),
    })
  }

  const executeDeletion = async () => {
    if (deleteModal.targets.length === 0) return
    setDeleteBusy(true)
    try {
      for (const target of deleteModal.targets) {
        if (deleteModal.isSecure) {
          await invoke('delete_file_secure', { path: target.path, options: { secure: true } })
        } else {
          await invoke('delete_file', { path: target.path })
        }
      }
      showMsg(
        deleteModal.isSecure
          ? `Permanently shredded ${deleteModal.targets.length} item(s)`
          : `Deleted ${deleteModal.targets.length} item(s)`,
        'success'
      )
      setDeleteModal(prev => ({ ...prev, isOpen: false }))
      clearSelection()
      loadDirectory(currentPath || undefined, false)
    } catch (error) {
      showMsg(`Deletion failed: ${error}`, 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  const handleFindDuplicates = async () => {
    if (!currentPath) return
    setFindingDups(true)
    try {
      const result: DuplicateGroup[] = await invoke('find_duplicate_files', { paths: [currentPath] })
      setDuplicates(result)
      if (result.length === 0) showMsg('No duplicate files found', 'success')
    } catch (error) {
      showMsg(`Duplicate search failed: ${error}`, 'error')
    }
    setFindingDups(false)
  }

  const handleContextMenu = (e: React.MouseEvent, file: FileInfo) => {
    e.preventDefault()
    if (!selectedFiles.has(file.path)) {
      setSelectedFiles(new Set([file.path]))
    }
    setCtxMenu({ x: e.clientX, y: e.clientY, file })
  }

  const selectedFileObjects = useMemo(() => {
    return displayedFiles.filter(f => selectedFiles.has(f.path))
  }, [displayedFiles, selectedFiles])

  const canSecureDelete = useMemo(() => {
    return !archiveContext && selectedFileObjects.some(f => !f.is_dir)
  }, [archiveContext, selectedFileObjects])

  /* ── Context Menu items ── */
  const ctxItems: ContextMenuItem[] = useMemo(() => {
    if (!ctxMenu?.file) return []

    if (archiveContext) {
      return [
        {
          label: 'Extract Selected',
          action: () => navigate('/extract', {
            state: {
              archivePath: archiveContext.archivePath,
              selectedItems: Array.from(selectedFiles.size ? selectedFiles : [ctxMenu.file!.path]),
            }
          }),
        },
        {
          label: 'Extract Entire Archive',
          action: () => navigate('/extract', { state: { archivePath: archiveContext.archivePath } }),
        },
        { label: '', action: () => {}, separator: true },
        {
          label: 'Copy Item Path',
          action: () => {
            navigator.clipboard?.writeText(ctxMenu.file!.path)
            showMsg('Path copied to clipboard', 'success')
          },
        },
      ]
    }

    return [
      ...(ctxMenu.file.is_dir ? [
        { label: 'Open in New Tab', action: () => addTab(ctxMenu.file!.path) } as ContextMenuItem,
        { label: '', action: () => {}, separator: true } as ContextMenuItem,
      ] : []),
      ...(isArchive(ctxMenu.file.name) ? [
        {
          label: 'Browse Contents (Inspect)',
          action: () => openArchiveInBrowser(ctxMenu.file!.path, ctxMenu.file!.name),
        } as ContextMenuItem,
        {
          label: 'Extract Here (Smart Unpack)',
          action: () => navigate('/extract', { state: { archivePath: ctxMenu.file!.path } }),
        } as ContextMenuItem,
        {
          label: 'Verify Integrity',
          action: () => handleVerify(ctxMenu.file!),
        } as ContextMenuItem,
        {
          label: 'Convert Format...',
          action: () => handleConvert(ctxMenu.file!),
        } as ContextMenuItem,
        { label: '', action: () => {}, separator: true } as ContextMenuItem,
      ] : []),
      {
        label: 'Add to Archive...',
        shortcut: 'Ctrl+N',
        action: () => {
          const targets = selectedFiles.size > 0 && selectedFiles.has(ctxMenu.file!.path)
            ? Array.from(selectedFiles)
            : [ctxMenu.file!.path]
          openCompressModal(targets)
        },
      },
      { label: 'Rename', action: () => startRename(ctxMenu.file!) },
      { label: '', action: () => {}, separator: true },
      {
        label: 'Delete',
        action: () => {
          const targets = selectedFiles.has(ctxMenu.file!.path)
            ? selectedFileObjects
            : [ctxMenu.file!]
          confirmDeleteTargets(targets, false)
        },
      },
      ...(!ctxMenu.file.is_dir
        ? [{
            label: 'Secure Shred (Permanent)',
            action: () => {
              const targets = selectedFiles.has(ctxMenu.file!.path)
                ? selectedFileObjects.filter(f => !f.is_dir)
                : [ctxMenu.file!]
              confirmDeleteTargets(targets, true)
            },
          } as ContextMenuItem]
        : []),
    ]
  }, [ctxMenu, archiveContext, selectedFiles, currentPath, navigate, openArchiveInBrowser, addTab, selectedFileObjects])

  /* ── Tab Context Menu Items ── */
  const tabCtxItems: ContextMenuItem[] = tabCtxMenu ? [
    { label: 'New Tab', shortcut: 'Ctrl+T', action: () => addTab(tabCtxMenu.tab.path) },
    { label: 'Duplicate Tab', action: () => duplicateTab(tabCtxMenu.tab.id) },
    { label: '', action: () => {}, separator: true },
    { label: 'Close Tab', shortcut: 'Ctrl+W', action: () => closeTab(tabCtxMenu.tab.id) },
    {
      label: 'Close Other Tabs',
      disabled: tabs.length <= 1,
      action: () => closeOtherTabs(tabCtxMenu.tab.id),
    },
    {
      label: 'Close Tabs to the Right',
      disabled: tabs.findIndex(t => t.id === tabCtxMenu.tab.id) >= tabs.length - 1,
      action: () => closeTabsToRight(tabCtxMenu.tab.id),
    },
    { label: '', action: () => {}, separator: true },
    {
      label: 'Copy Path',
      action: () => {
        navigator.clipboard?.writeText(tabCtxMenu.tab.path)
        showMsg('Path copied to clipboard', 'success')
      },
    },
  ] : []

  /* ── Bookmark Context Menu Items ── */
  const bookmarkCtxItems: ContextMenuItem[] = bookmarkCtxMenu ? [
    {
      label: `Open "${bookmarkCtxMenu.bookmark.label}"`,
      action: () => {
        goToPath(bookmarkCtxMenu.bookmark.path)
        setBookmarkCtxMenu(null)
      },
    },
    {
      label: 'Open in New Tab',
      action: () => {
        addTab(bookmarkCtxMenu.bookmark.path)
        setBookmarkCtxMenu(null)
      },
    },
    { label: '', action: () => {}, separator: true },
    {
      label: 'Remove Bookmark',
      danger: true,
      action: () => {
        const next = bookmarks.filter((_, j) => j !== bookmarkCtxMenu.index)
        setBookmarks(next)
        preferences.bookmarks = next
        setBookmarkCtxMenu(null)
      },
    },
  ] : []

  const selectedArchive = useMemo(() => {
    if (selectedFiles.size === 1 && !archiveContext) {
      const selectedPath = Array.from(selectedFiles)[0]
      const file = filteredFiles.find(f => f.path === selectedPath)
      if (file && isArchive(file.name)) return file
    }
    return null
  }, [selectedFiles, filteredFiles, archiveContext])

  const handleRowClick = (file: FileInfo, i: number, e: React.MouseEvent) => {
    if (e.shiftKey && lastClickedRef.current >= 0 && lastClickedRef.current < filteredFiles.length) {
      const start = Math.min(lastClickedRef.current, i)
      const end = Math.max(lastClickedRef.current, i)
      const next = new Set(selectedFiles)
      for (let j = start; j <= end; j++) {
        next.add(filteredFiles[j].path)
      }
      setSelectedFiles(next)
    } else if (e.ctrlKey || e.metaKey) {
      const next = new Set(selectedFiles)
      if (next.has(file.path)) {
        next.delete(file.path)
      } else {
        next.add(file.path)
      }
      setSelectedFiles(next)
    } else {
      setSelectedFiles(new Set([file.path]))
    }
    lastClickedRef.current = i
  }

  return (
    <div
      className="app-shell"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const dropped = Array.from(e.dataTransfer.files).map(f => (f as any).path).filter(Boolean)
        if (dropped.length) {
          openCompressModal(dropped)
        }
      }}
    >
      {/* ═══ Update Available Notification Banner ═══ */}
      {updateNotice && (
        <div
          style={{
            background: 'linear-gradient(90deg, #1d4ed8 0%, #2563eb 100%)',
            color: '#ffffff',
            padding: '7px 18px',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 100,
            borderBottom: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🚀</span>
            <span>
              <strong>DodaZip v{updateNotice.latestVersion}</strong> is available!
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => safeOpenUrl(updateNotice.downloadUrl)}
              style={{
                background: '#ffffff',
                color: '#1d4ed8',
                border: 'none',
                padding: '3px 12px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Download Update
            </button>
            <button
              onClick={() => setUpdateNotice(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.8)',
                cursor: 'pointer',
                fontSize: 14,
                padding: '0 4px',
              }}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ═══ Top High-Trust Toolbar ═══ */}
      <Toolbar
        onNew={() => openCompressModal(Array.from(selectedFiles))}
        onOpen={handleOpenAction}
        onAdd={() => {
          if (selectedFiles.size > 0)
            openCompressModal(Array.from(selectedFiles))
        }}
        onExtract={() => {
          if (archiveContext) {
            navigate('/extract', { state: { archivePath: archiveContext.archivePath } })
          } else if (selectedArchive) {
            navigate('/extract', { state: { archivePath: selectedArchive.path } })
          } else {
            navigate('/extract')
          }
        }}
        onSettings={() => setShowSettings(true)}
        onAbout={() => setShowAbout(true)}
        addDisabled={selectedFiles.size === 0}
        isArchiveMode={Boolean(archiveContext)}
        archiveName={archiveContext?.archiveName}
        onTestIntegrity={archiveContext ? () => handleVerify({
          path: archiveContext.archivePath,
          name: archiveContext.archiveName,
          size: archiveContext.totalSize,
          is_dir: false,
          is_file: true
        }) : undefined}
        onCloseArchive={archiveContext ? exitArchiveMode : undefined}
        selectedArchive={selectedArchive}
        onInspectArchive={(file) => openArchiveInBrowser(file.path, file.name)}
        onVerifyArchive={(file) => handleVerify(file)}
        onConvertArchive={(file) => handleConvert(file)}
        selectedCount={selectedFiles.size}
        onRename={() => {
          if (selectedFileObjects.length === 1) startRename(selectedFileObjects[0])
        }}
        onDelete={() => confirmDeleteTargets(selectedFileObjects, false)}
        onSecureDelete={() => confirmDeleteTargets(selectedFileObjects.filter(f => !f.is_dir), true)}
        canSecureDelete={canSecureDelete}
      />

      {message && (
        <div className="header-bar" style={{ padding: '4px 10px', minHeight: 0 }}>
          <Message text={message} type={msgType} />
        </div>
      )}

      {/* ═══ Main Split Layout (Sidebar + Work Area) ═══ */}
      <div className="app-body">
        {/* Left Quick Access Sidebar */}
        <aside className="app-sidebar">
          <div className="sidebar-section">
            <div className="sidebar-heading">Quick Access</div>
            <div
              className={`sidebar-item ${!archiveContext && currentPath.toLowerCase().includes('desktop') ? 'active' : ''}`}
              onClick={() => goToPath(`${userHome}/Desktop`)}
            >
              <span className="sidebar-icon">🖥️</span>
              <span className="sidebar-label">Desktop</span>
            </div>
            <div
              className={`sidebar-item ${!archiveContext && currentPath.toLowerCase().includes('downloads') ? 'active' : ''}`}
              onClick={() => goToPath(`${userHome}/Downloads`)}
            >
              <span className="sidebar-icon">⬇️</span>
              <span className="sidebar-label">Downloads</span>
            </div>
            <div
              className={`sidebar-item ${!archiveContext && currentPath.toLowerCase().includes('documents') ? 'active' : ''}`}
              onClick={() => goToPath(`${userHome}/Documents`)}
            >
              <span className="sidebar-icon">📁</span>
              <span className="sidebar-label">Documents</span>
            </div>
            <div
              className={`sidebar-item ${!archiveContext && (currentPath === userHome || currentPath === userHome.replace(/\//g, '\\')) ? 'active' : ''}`}
              onClick={() => goToPath(userHome)}
            >
              <span className="sidebar-icon">🏠</span>
              <span className="sidebar-label">User Home</span>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-heading">Drives</div>
            <div
              className={`sidebar-item ${!archiveContext && currentPath.startsWith('C:') ? 'active' : ''}`}
              onClick={() => goToPath('C:\\')}
            >
              <span className="sidebar-icon">💽</span>
              <span className="sidebar-label">Local Disk (C:)</span>
            </div>
          </div>

          {bookmarks.length > 0 && (
            <div className="sidebar-section">
              <div className="sidebar-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Bookmarks</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{bookmarks.length}</span>
              </div>
              {bookmarks.map((b, i) => (
                <div
                  key={i}
                  className="sidebar-item"
                  onClick={() => goToPath(b.path)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setBookmarkCtxMenu({ x: e.clientX, y: e.clientY, index: i, bookmark: b })
                  }}
                  title={`${b.label}\n${b.path}\nRight-click for options`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 6 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span className="sidebar-icon">⭐</span>
                    <span className="sidebar-label">{b.label}</span>
                  </div>
                  <button
                    className="sidebar-item-del"
                    title={`Remove bookmark "${b.label}"`}
                    aria-label={`Remove bookmark ${b.label}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      const next = bookmarks.filter((_, j) => j !== i)
                      setBookmarks(next)
                      preferences.bookmarks = next
                    }}
                    style={{
                      all: 'unset',
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: 4,
                      color: 'var(--text-muted)',
                      fontSize: 12,
                      fontWeight: 700,
                      lineHeight: 1,
                      opacity: 0.75,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1'
                      e.currentTarget.style.color = '#ef4444'
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.75'
                      e.currentTarget.style.color = 'var(--text-muted)'
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* High-trust Vault Engine Status Card */}
          <div className="sidebar-footer">
            <div className="engine-card">
              <div className="engine-card-header">
                <IconShieldOk size={14} />
                <span>Vault Engine Active</span>
              </div>
              <div className="engine-card-sub">
                XChaCha20-Poly1305 + FastCDC
                <br />
                Reed-Solomon ECC Ready
              </div>
            </div>
          </div>
        </aside>

        {/* Right Main Work Area */}
        <div className="app-main">
          {/* Multi-Tab Bar */}
          {tabs.length > 0 && (
            <div
              className="tab-bar"
              onDoubleClick={(e) => {
                if ((e.target as HTMLElement).classList.contains('tab-bar')) {
                  addTab(currentPath)
                }
              }}
              title="Double-click empty space for new tab"
            >
              {tabs.map((tab, idx) => (
                <div
                  key={tab.id}
                  className={`tab-item ${tab.id === activeTabId ? 'tab-active' : ''}`}
                  onClick={() => switchTab(tab.id)}
                  onAuxClick={(e) => {
                    if (e.button === 1) {
                      e.preventDefault()
                      closeTab(tab.id, e)
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    setTabCtxMenu({ x: e.clientX, y: e.clientY, tab })
                  }}
                  title={`${tab.label}\n${tab.path} (Ctrl+${idx + 1})\nMiddle-click to close`}
                >
                  <span className="tab-icon">
                    {tab.label.startsWith('📦') ? <IconDzip size={14} /> : <IconFolder size={14} />}
                  </span>
                  <span className="tab-label">{tab.label}</span>
                  {tabs.length > 1 && (
                    <button
                      className="tab-close"
                      onClick={(e) => closeTab(tab.id, e)}
                      title="Close tab (Ctrl+W, or Middle-Click)"
                    >
                      <IconX size={10} />
                    </button>
                  )}
                </div>
              ))}
              <button className="tab-new" onClick={() => addTab(currentPath)} title="New tab (Ctrl+T)">
                <IconAdd size={12} />
              </button>
            </div>
          )}

          {/* Navigation & Breadcrumbs Bar */}
          <div className="header-bar">
            <button
              className="up-btn"
              onClick={goUp}
              title={canGoUp ? 'Go up one level (Alt+Up)' : 'Already at root folder'}
              disabled={!canGoUp}
              style={{ opacity: canGoUp ? 1 : 0.35, cursor: canGoUp ? 'pointer' : 'default' }}
            >
              <IconUp size={16} />
            </button>

            <div className="breadcrumb">
              {breadcrumbs.map((seg, i) => (
                <React.Fragment key={i}>
                  <button
                    className="breadcrumb-btn"
                    onClick={() => handleBreadcrumbClick(seg)}
                    style={{
                      fontWeight: seg.path.startsWith('__ARCHIVE_') ? 600 : undefined,
                      color: seg.path.startsWith('__ARCHIVE_') ? 'var(--accent)' : undefined,
                    }}
                  >
                    {seg.label}
                  </button>
                  {i < breadcrumbs.length - 1 && <span className="breadcrumb-sep">›</span>}
                </React.Fragment>
              ))}
            </div>

            <div className="search-box">
              <IconSearch size={13} />
              <input
                className="search-input"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder={archiveContext ? "Filter archive contents..." : "Filter files..."}
                onKeyDown={(e) => { if (e.key === 'Escape') setFilterQuery('') }}
              />
              {filterQuery && (
                <button className="search-clear" onClick={() => setFilterQuery('')} tabIndex={-1}>
                  <IconClear size={12} />
                </button>
              )}
            </div>

            {/* Bookmarks Toggle */}
            <div ref={bookmarksRef} style={{ position: 'relative' }}>
              <button
                className="up-btn"
                onClick={() => setShowBookmarks(!showBookmarks)}
                title={isBookmarked() ? 'Remove bookmark' : 'Add bookmark'}
                style={{ color: isBookmarked() ? 'var(--accent)' : undefined }}
              >
                <IconBookmark size={15} />
              </button>
              {showBookmarks && (
                <div className="bookmark-popup">
                  <div className="bookmark-header">
                    <span>Bookmarks</span>
                    <button className="bookmark-add-btn" onClick={() => { toggleBookmark(); setShowBookmarks(false) }}>
                      {isBookmarked() ? 'Remove' : 'Add Current'}
                    </button>
                  </div>
                  {bookmarks.length === 0 && <div className="bookmark-empty">No bookmarks yet</div>}
                  {bookmarks.map((b, i) => (
                    <div key={i} className="bookmark-item" onClick={() => { goToPath(b.path); setShowBookmarks(false) }}>
                      <span className="bookmark-label">{b.label}</span>
                      <span className="bookmark-path">{b.path}</span>
                      <button className="bookmark-del" onClick={(e) => { e.stopPropagation(); const next = bookmarks.filter((_, j) => j !== i); setBookmarks(next); preferences.bookmarks = next }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Find duplicates */}
            <button
              className="up-btn"
              onClick={handleFindDuplicates}
              title="Find duplicate files"
              disabled={findingDups}
              style={{ flexShrink: 0 }}
            >
              <IconDuplicate size={15} />
            </button>

            <button className="up-btn" onClick={cycleTheme} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} style={{ flexShrink: 0 }}>
              {theme === 'light' ? <IconMoon size={15} /> : <IconSun size={15} />}
            </button>

            <button
              className="up-btn"
              onClick={() => setShowAbout(true)}
              title="About DodaZip"
              style={{ flexShrink: 0, fontWeight: 700, fontSize: 13 }}
            >
              ℹ
            </button>
          </div>

          {/* ═══ Archive Mode Inspection Banner ═══ */}
          {archiveContext && (
            <div className="archive-banner">
              <div className="archive-banner-left">
                <div className="archive-badge">
                  <IconDzip size={18} />
                </div>
                <div>
                  <div className="archive-banner-title">
                    {archiveContext.archiveName}
                    <span className="archive-tag">Archive Virtual View</span>
                  </div>
                  <div className="archive-banner-subtitle">
                    {archiveContext.entries.length} items · {formatSize(archiveContext.totalSize)} · Read-only Virtual View
                  </div>
                </div>
              </div>
              <div className="archive-banner-actions">
                <button
                  className="btn-primary-action"
                  onClick={() => navigate('/extract', { state: { archivePath: archiveContext.archivePath } })}
                  title="Extract all files from this archive"
                >
                  <IconExtract size={14} />
                  <span>Extract All</span>
                </button>
                {selectedFiles.size > 0 && (
                  <button
                    className="btn-secondary-action"
                    onClick={() => navigate('/extract', {
                      state: {
                        archivePath: archiveContext.archivePath,
                        selectedItems: Array.from(selectedFiles),
                      }
                    })}
                  >
                    <span>Extract Selected ({selectedFiles.size})</span>
                  </button>
                )}
                <button
                  className="btn-ghost-action"
                  onClick={() => handleVerify({
                    path: archiveContext.archivePath,
                    name: archiveContext.archiveName,
                    size: archiveContext.totalSize,
                    is_dir: false,
                    is_file: true,
                  })}
                  title="Verify CRC32 / BLAKE3 integrity of this archive"
                >
                  <IconShieldOk size={14} />
                  <span>Verify</span>
                </button>
                <button
                  className="btn-ghost-action"
                  onClick={exitArchiveMode}
                  title="Close archive and return to folder"
                >
                  <span>✕ Close</span>
                </button>
              </div>
            </div>
          )}

          {verifying && (
            <div className="header-bar" style={{ padding: '4px 10px', minHeight: 0 }}>
              <Message text="Verifying archive integrity..." type="info" />
            </div>
          )}

          {renaming && (
            <div className="header-bar" style={{ padding: '4px 10px', minHeight: 0 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 8 }}>Rename:</span>
              <input
                ref={renameInputRef}
                value={renaming.name}
                onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(null) }}
                onBlur={commitRename}
                className="rename-input"
                autoFocus
                style={{
                  flex: 1, padding: '3px 8px', fontSize: 13,
                  background: 'var(--bg-surface)', border: '1px solid var(--accent)',
                  borderRadius: 3, color: 'var(--text-primary)', outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          )}

          {/* ═══ File List Table ═══ */}
          <div
            className="file-list-wrap"
            ref={fileListRef}
            onClick={(e) => { if ((e.target as HTMLElement).closest('tr') === null) clearSelection() }}
          >
            <table>
              <thead>
                <tr>
                  <th style={{ width: 38, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      title="Select All / Clear (Ctrl+A)"
                      checked={filteredFiles.length > 0 && selectedFiles.size === filteredFiles.length}
                      ref={el => {
                        if (el) {
                          el.indeterminate = selectedFiles.size > 0 && selectedFiles.size < filteredFiles.length
                        }
                      }}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFiles(new Set(filteredFiles.map(f => f.path)))
                        } else {
                          setSelectedFiles(new Set())
                        }
                      }}
                      style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                    />
                  </th>
                  <th className="sortable-th" onClick={() => toggleSort('name')}>
                    Name <SortIcon k="name" />
                  </th>
                  <th className="size-cell sortable-th" style={{ width: 110 }} onClick={() => toggleSort('size')}>
                    Size <SortIcon k="size" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={3}>
                    <div className="loading-state">
                      <IconLoader size={28} />
                      <div>Loading files...</div>
                    </div>
                  </td></tr>
                )}
                {!loading && filteredFiles.length === 0 && (
                  <tr><td colSpan={3}>
                    <div className="empty-state">
                      <IconEmptyFolder size={40} />
                      <div>{filterQuery ? 'No files match your filter' : (archiveContext ? 'This archive folder is empty' : 'This folder is empty')}</div>
                    </div>
                  </td></tr>
                )}
                {filteredFiles.map((file, i) => (
                  <tr
                    key={file.path}
                    className={selectedFiles.has(file.path) ? 'selected' : ''}
                    onClick={(e) => handleRowClick(file, i, e)}
                    onDoubleClick={() => handleRowDoubleClick(file)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                    onAuxClick={(e) => {
                      if (e.button === 1 && file.is_dir && !archiveContext) {
                        e.preventDefault()
                        addTab(file.path)
                      }
                    }}
                    draggable={true}
                    onDragStart={(e) => {
                      const dragPaths = selectedFiles.has(file.path)
                        ? Array.from(selectedFiles)
                        : [file.path]
                      e.dataTransfer.setData('text/plain', dragPaths.join('\n'))
                      e.dataTransfer.setData('text/uri-list', dragPaths.map(p => `file://${p}`).join('\r\n'))
                      e.dataTransfer.effectAllowed = 'copy'
                      if (!archiveContext) {
                        safeStartDrag(dragPaths)
                      }
                    }}
                  >
                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.path)}
                        onChange={() => toggleSelected(file.path)}
                        style={{ cursor: 'pointer', accentColor: 'var(--accent)' }}
                      />
                    </td>
                    <td>
                      <span className="name-cell">
                        <FileRowIcon name={file.name} isDir={file.is_dir} />
                        <span>{file.name}</span>
                        {archiveContext && file.name.endsWith('.exe') && (
                          <span style={{ fontSize: 9, background: '#fee2e2', color: '#dc2626', padding: '1px 5px', borderRadius: 3, fontWeight: 700, marginLeft: 6 }}>
                            EXECUTABLE
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="size-cell">{file.size ? formatSize(file.size) : (file.is_dir ? 'Folder' : '0 B')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ═══ Status Bar ═══ */}
          <div className="status-bar">
            <span>
              {archiveContext ? (
                <>Archive Virtual View · {filteredFiles.length} item{filteredFiles.length !== 1 ? 's' : ''}</>
              ) : (
                <>{filteredFiles.length} item{filteredFiles.length !== 1 ? 's' : ''}{filterQuery && <> (filtered)</>}</>
              )}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {busy && <>Processing... </>}
              {findingDups && <>Searching duplicates... </>}
              {selectedFiles.size > 0 && (
                <>{selectedFiles.size} selected{estimatedSize && <> · {estimatedSize}</>}</>
              )}
              <button
                type="button"
                onClick={() => setShowAbout(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontSize: 11,
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                About DodaZip
              </button>
            </span>
          </div>
        </div>
      </div>

      {/* Duplicate results modal */}
      {duplicates !== null && duplicates.length > 0 && (
        <div className="modal-overlay" onClick={() => setDuplicates(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>Duplicate Files Found ({duplicates.length} groups)</span>
              <button className="modal-close" onClick={() => setDuplicates(null)}><IconX size={14} /></button>
            </div>
            <div className="modal-body">
              {duplicates.map((group, gi) => (
                <div key={gi} className="dup-group">
                  <div className="dup-header">{formatSize(group.size)} · {group.files.length} copies · {group.hash.slice(0, 12)}</div>
                  {group.files.map((f, fi) => (
                    <div key={fi} className="dup-file" title={f}>
                      <button
                        className="dup-open"
                        onClick={() => {
                          const p = getParentPath(f)
                          if (p) loadDirectory(p, true)
                        }}
                      >📁</button>
                      <span className="dup-path">{f}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Row Context Menu */}
      {ctxMenu && (
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxItems} onClose={() => setCtxMenu(null)} />
      )}

      {/* Tab Context Menu */}
      {tabCtxMenu && (
        <ContextMenu x={tabCtxMenu.x} y={tabCtxMenu.y} items={tabCtxItems} onClose={() => setTabCtxMenu(null)} />
      )}

      {/* Bookmark Context Menu */}
      {bookmarkCtxMenu && (
        <ContextMenu
          x={bookmarkCtxMenu.x}
          y={bookmarkCtxMenu.y}
          items={bookmarkCtxItems}
          onClose={() => setBookmarkCtxMenu(null)}
        />
      )}

      {dragOver && (
        <div className="drag-overlay">
          <div className="drag-overlay-inner">
            <IconAdd size={40} /><br />
            Drop files here to compress
          </div>
        </div>
      )}

      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onThemeChange={(newTheme) => setTheme(newTheme)}
      />

      <CompressModal
        isOpen={compressModal.isOpen}
        onClose={() => setCompressModal(prev => ({ ...prev, isOpen: false }))}
        selectedFiles={compressModal.selectedFiles}
        currentDir={compressModal.currentDir}
        onSuccess={(createdArchive) => {
          loadDirectory(currentPath || undefined, false)
          showMsg(`Archive created: ${getPathBaseName(createdArchive)}`, 'success')
        }}
      />

      {/* ═══ Archive Verification Modal ═══ */}
      {verificationResult && verificationResult.isOpen && (
        <div className="modal-backdrop-acrylic" onClick={() => setVerificationResult(null)}>
          <div className="modal-window-modern" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-win-header">
              <div className="modal-win-title">
                <div
                  className="modal-win-icon-badge"
                  style={{
                    background: verificationResult.valid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: verificationResult.valid ? '#10b981' : '#ef4444',
                  }}
                >
                  {verificationResult.valid ? <IconShieldOk size={20} /> : <span style={{ fontSize: 16, fontWeight: 800 }}>✕</span>}
                </div>
                <div>
                  <span className="modal-win-title-text">
                    {verificationResult.valid ? 'Archive Integrity Verified' : 'Integrity Verification Failed'}
                  </span>
                  <span className="modal-win-subtitle">{verificationResult.archiveName}</span>
                </div>
              </div>
              <button
                type="button"
                className="modal-win-close-btn"
                onClick={() => setVerificationResult(null)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal-win-body" style={{ gap: 12 }}>
              {verificationResult.valid ? (
                <div className="verification-success-card">
                  <div className="verification-badge-pass">
                    <span>✓</span> <span>100% Cryptographically Sound</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 8 }}>
                    All <strong>{verificationResult.entries}</strong> files were checked against BLAKE3 cryptographic signatures. Deduplication chunks and self-healing parity records are intact.
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--text-muted)' }}>
                    Total uncompressed payload: <strong>{formatSize(verificationResult.totalSize)}</strong>
                  </div>
                </div>
              ) : (
                <div className="verification-error-card">
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>⚠️</span> <span>Data Corruption Detected</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: 6 }}>
                    {verificationResult.error || 'The archive structure could not be verified or payload checksum failed.'}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-win-footer" style={{ justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="modal-btn-primary"
                onClick={() => setVerificationResult(null)}
                autoFocus
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete / Secure Shred Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        isSecure={deleteModal.isSecure}
        targets={deleteModal.targets}
        busy={deleteBusy}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeDeletion}
      />
    </div>
  )
}
