export const CURRENT_VERSION = '0.1.0'
export const DEFAULT_UPDATE_SERVER = 'https://updates.dodatech.com/dodazip/latest.json'
export const GITHUB_FALLBACK_API = 'https://api.github.com/repos/dodatechcom/dodazip/releases/latest'

export type PlatformOS = 'windows' | 'linux' | 'macos'

export interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  downloadUrl: string
  platform: PlatformOS
  releaseNotes?: string
  error?: string
}

/**
 * Detect client OS platform from environment
 */
export function detectOS(): PlatformOS {
  if (typeof navigator !== 'undefined') {
    const ua = (navigator.userAgent || '').toLowerCase()
    const plat = ((navigator as any).userAgentData?.platform || navigator.platform || '').toLowerCase()
    if (ua.includes('mac') || plat.includes('mac') || ua.includes('darwin')) return 'macos'
    if (ua.includes('linux') || plat.includes('linux')) return 'linux'
  }
  return 'windows'
}

/**
 * Compare two semver strings (e.g. "0.1.0" and "0.2.0" or "v0.2.1")
 * Returns:
 *   1 if a > b
 *  -1 if a < b
 *   0 if a == b
 */
export function compareVersions(a: string, b: string): number {
  const cleanA = a.replace(/^v/i, '').trim()
  const cleanB = b.replace(/^v/i, '').trim()

  const partsA = cleanA.split('.').map((p) => parseInt(p, 10) || 0)
  const partsB = cleanB.split('.').map((p) => parseInt(p, 10) || 0)

  const maxLen = Math.max(partsA.length, partsB.length)
  for (let i = 0; i < maxLen; i++) {
    const numA = partsA[i] || 0
    const numB = partsB[i] || 0
    if (numA > numB) return 1
    if (numA < numB) return -1
  }
  return 0
}

async function fetchFromR2(url: string, currentVersion: string, os: PlatformOS): Promise<UpdateInfo | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-cache',
    })
    if (!res.ok) return null
    const data = await res.json()
    const latestVersion = (data.tag_name || data.version || '').replace(/^v/i, '')
    if (!latestVersion) return null

    // Pick platform-specific download URL if platforms object is provided
    let downloadUrl = ''
    if (data.platforms && data.platforms[os]) {
      const p = data.platforms[os]
      downloadUrl =
        typeof p === 'string'
          ? p
          : (p.installer || p.appImage || p.deb || p.dmg || p.downloadUrl || '')
    }

    if (!downloadUrl) {
      downloadUrl =
        data.downloadUrl ||
        data.download_url ||
        data.html_url ||
        (Array.isArray(data.assets) && data.assets[0]?.browser_download_url) ||
        `https://updates.dodatech.com/dodazip/releases/${os}/DodaZip-Setup-v${latestVersion}.exe`
    }

    const releaseNotes = data.notes || data.body || data.description || ''
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      downloadUrl,
      platform: os,
      releaseNotes,
    }
  } catch {
    return null
  }
}

async function fetchFromGitHub(currentVersion: string, os: PlatformOS): Promise<UpdateInfo> {
  const res = await fetch(GITHUB_FALLBACK_API, {
    headers: { Accept: 'application/vnd.github.v3+json' },
    cache: 'no-cache',
  })
  if (!res.ok) {
    if (res.status === 404) {
      return {
        hasUpdate: false,
        currentVersion,
        latestVersion: currentVersion,
        downloadUrl: 'https://github.com/dodatechcom/dodazip/releases',
        platform: os,
        releaseNotes: 'No releases published yet.',
      }
    }
    throw new Error(`GitHub API error ${res.status}`)
  }

  const data = await res.json()
  const rawTag = (data.tag_name || '').trim()
  const latestVersion = rawTag.replace(/^v/i, '')

  let downloadUrl = data.html_url || 'https://github.com/dodatechcom/dodazip/releases/latest'
  if (Array.isArray(data.assets) && data.assets.length > 0) {
    let matchedAsset = null
    if (os === 'windows') {
      matchedAsset = data.assets.find((a: any) => a.name?.endsWith('.exe'))
    } else if (os === 'linux') {
      matchedAsset = data.assets.find(
        (a: any) => a.name?.endsWith('.AppImage') || a.name?.endsWith('.deb') || a.name?.endsWith('.tar.gz')
      )
    } else if (os === 'macos') {
      matchedAsset = data.assets.find((a: any) => a.name?.endsWith('.dmg') || a.name?.endsWith('.pkg'))
    }

    if (matchedAsset?.browser_download_url) {
      downloadUrl = matchedAsset.browser_download_url
    } else if (data.assets[0]?.browser_download_url) {
      downloadUrl = data.assets[0].browser_download_url
    }
  }

  const hasUpdate = compareVersions(latestVersion, currentVersion) > 0
  return {
    hasUpdate,
    currentVersion,
    latestVersion: latestVersion || currentVersion,
    downloadUrl,
    platform: os,
    releaseNotes: data.body || '',
  }
}

/**
 * Checks for software updates with automatic OS detection:
 * 1. Primary: Official Cloudflare R2 bucket at https://updates.dodatech.com/dodazip/latest.json
 * 2. Fallback: Official GitHub Releases API (rate-limit safe fallback)
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
  const currentVersion = CURRENT_VERSION
  const os = detectOS()

  // 1. Primary: Cloudflare R2 bucket endpoint
  const r2Result = await fetchFromR2(DEFAULT_UPDATE_SERVER, currentVersion, os)
  if (r2Result) return r2Result

  // 2. Fallback: GitHub Releases API
  try {
    return await fetchFromGitHub(currentVersion, os)
  } catch (err: any) {
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      downloadUrl: `https://updates.dodatech.com/dodazip/releases/${os}`,
      platform: os,
      error: err?.message || 'Could not connect to update servers (R2 / GitHub)',
    }
  }
}
