export const CURRENT_VERSION = '0.1.0'
export const DEFAULT_UPDATE_SERVER = 'https://updates.dodatech.com/dodazip/latest.json'
export const GITHUB_FALLBACK_API = 'https://api.github.com/repos/dodatechcom/dodazip/releases/latest'

export interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  downloadUrl: string
  releaseNotes?: string
  error?: string
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

async function fetchFromR2(url: string, currentVersion: string): Promise<UpdateInfo | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-cache',
    })
    if (!res.ok) return null
    const data = await res.json()
    const latestVersion = (data.tag_name || data.version || '').replace(/^v/i, '')
    if (!latestVersion) return null

    const downloadUrl =
      data.downloadUrl ||
      data.download_url ||
      data.html_url ||
      (Array.isArray(data.assets) && data.assets[0]?.browser_download_url) ||
      `https://updates.dodatech.com/dodazip/releases/DodaZip-Setup-v${latestVersion}.exe`

    const releaseNotes = data.notes || data.body || data.description || ''
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      downloadUrl,
      releaseNotes,
    }
  } catch {
    return null
  }
}

async function fetchFromGitHub(currentVersion: string): Promise<UpdateInfo> {
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
    const exeAsset = data.assets.find((a: any) => a.name?.endsWith('.exe'))
    if (exeAsset?.browser_download_url) {
      downloadUrl = exeAsset.browser_download_url
    }
  }

  const hasUpdate = compareVersions(latestVersion, currentVersion) > 0
  return {
    hasUpdate,
    currentVersion,
    latestVersion: latestVersion || currentVersion,
    downloadUrl,
    releaseNotes: data.body || '',
  }
}

/**
 * Checks for software updates:
 * 1. Primary: Official Cloudflare R2 bucket at https://updates.dodatech.com/dodazip/latest.json
 * 2. Fallback: Official GitHub Releases API (rate-limit safe fallback)
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
  const currentVersion = CURRENT_VERSION

  // 1. Primary: Cloudflare R2 bucket endpoint
  const r2Result = await fetchFromR2(DEFAULT_UPDATE_SERVER, currentVersion)
  if (r2Result) return r2Result

  // 2. Fallback: GitHub Releases API
  try {
    return await fetchFromGitHub(currentVersion)
  } catch (err: any) {
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      downloadUrl: 'https://updates.dodatech.com/dodazip',
      error: err?.message || 'Could not connect to update servers (R2 / GitHub)',
    }
  }
}
