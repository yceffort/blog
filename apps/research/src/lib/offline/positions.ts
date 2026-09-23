const PREFIX = 'research-offline-position:'

export function getPosition(slug: string): number | undefined {
  try {
    const page = Number(localStorage.getItem(`${PREFIX}${slug}`))
    return Number.isSafeInteger(page) && page > 0 ? page : undefined
  } catch {
    return undefined
  }
}

export function putPosition(slug: string, page: number) {
  try {
    // Finish before a navigation can unload the page and abort an async write.
    localStorage.setItem(`${PREFIX}${slug}`, String(page))
  } catch {
    // A disabled/full preference store must not interrupt a presentation.
  }
}

export function removePosition(slug: string) {
  try {
    localStorage.removeItem(`${PREFIX}${slug}`)
  } catch {
    // Deck deletion still works if preference storage is unavailable.
  }
}
