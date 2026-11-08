import { preferences } from './preferences'

export const CURRENT_VERSION = '0.1.0'

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

/**
 * Checks for updates from GitHub or custom user-defined update server
 */
export async function checkForUpdates(customUrl?: string): Promise<UpdateInfo> {
  const currentVersion = CURRENT_VERSION
  const targetUrl = (customUrl || preferences.updateServer || '').trim()

  try {
    if (targetUrl) {
      // Query custom server (e.g. Cloudflare Worker, shared hosting server)
      const res = await fetch(targetUrl, {
        headers: { Accept: 'application/json' },
        cache: 'no-cache',
      })
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`)
      }
      const data = await res.json()

      // Support either GitHub release format or custom { version, downloadUrl, notes } format
      const latestVersion = (data.tag_name || data.version || '').replace(/^v/i, '')
      const downloadUrl =
        data.downloadUrl ||
        data.download_url ||
        data.html_url ||
        (Array.isArray(data.assets) && data.assets[0]?.browser_download_url) ||
        'https://github.com/dodatechcom/dodazip/releases/latest'

      const releaseNotes = data.notes || data.body || data.description || ''

      const hasUpdate = compareVersions(latestVersion, currentVersion) > 0

      return {
        hasUpdate,
        currentVersion,
        latestVersion: latestVersion || currentVersion,
        downloadUrl,
        releaseNotes,
      }
    }

    // Default: Check Official GitHub Releases API
    const res = await fetch('https://api.github.com/repos/dodatechcom/dodazip/releases/latest', {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
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

    // Find installer asset if available
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
  } catch (err: any) {
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      downloadUrl: 'https://github.com/dodatechcom/dodazip/releases/latest',
      error: err?.message || 'Could not connect to update server',
    }
  }
}
