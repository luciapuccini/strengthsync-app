export const COMPLETE_WEEK_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1_000

function storageKey(clientId: string): string {
  return `strengthsync:complete-week-cooldown:${clientId}`
}

function getStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function completeWeekCooldownRemaining(clientId: string, now = Date.now()): number {
  const storage = getStorage()
  if (storage === null) return 0

  try {
    const completedAt = Number(storage.getItem(storageKey(clientId)))
    if (!Number.isFinite(completedAt)) {
      storage.removeItem(storageKey(clientId))
      return 0
    }
    const remaining = completedAt + COMPLETE_WEEK_COOLDOWN_MS - now
    if (remaining <= 0) {
      storage.removeItem(storageKey(clientId))
      return 0
    }
    return remaining
  } catch {
    return 0
  }
}

export function startCompleteWeekCooldown(clientId: string, completedAt = Date.now()): number {
  const storage = getStorage()
  if (storage !== null) {
    try {
      storage.setItem(storageKey(clientId), String(completedAt))
    } catch {
      // The cooldown remains effective for this mounted component.
    }
  }
  return COMPLETE_WEEK_COOLDOWN_MS
}
