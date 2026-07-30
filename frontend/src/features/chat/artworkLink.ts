// Detects one of this app's artwork links inside a chat message — the URL the
// "Share" button copies (window.location.origin + /artwork/<uuid>) or a bare
// "/artwork/<uuid>" path. The id must be a real UUID and the host, when the
// link is absolute, must be our own origin, so foreign URLs and unrelated
// prose containing "/artwork/…" are left as plain text. Returns the id plus the
// text on either side of the link so the bubble can render them in order.
const ARTWORK_LINK =
  /(https?:\/\/[^\s/]+)?\/artwork\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi

export function extractArtworkLink(
  content: string | null | undefined,
): { id: string; url: string; before: string; after: string } | null {
  if (!content) return null
  for (const match of content.matchAll(ARTWORK_LINK)) {
    const origin = match[1]
    if (
      origin &&
      typeof window !== 'undefined' &&
      origin !== window.location.origin
    ) {
      continue
    }
    const index = match.index ?? 0
    return {
      id: match[2],
      url: match[0],
      before: content.slice(0, index).replace(/\s+$/, ''),
      after: content.slice(index + match[0].length).replace(/^\s+/, ''),
    }
  }
  return null
}
