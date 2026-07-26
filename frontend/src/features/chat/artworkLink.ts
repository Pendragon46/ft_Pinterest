// Detects an artwork link inside a chat message (the URL the artwork "Share"
// button copies, e.g. https://host/artwork/<id>). Also accepts a bare
// "/artwork/<id>" path. Returns the artwork id and whatever text remains once
// the link is lifted out, so the bubble can show that text above the card.
const ARTWORK_LINK = /(?:https?:\/\/\S+?)?\/artwork\/([A-Za-z0-9@._-]+)/

export function extractArtworkLink(
  content: string | null | undefined,
): { id: string; rest: string } | null {
  if (!content) return null
  const match = content.match(ARTWORK_LINK)
  if (!match || match.index == null) return null
  const id = match[1]
  // Join the text around the lifted link with a single space (don't collapse
  // whitespace elsewhere — pre-wrap keeps the sender's own line breaks).
  const before = content.slice(0, match.index).replace(/\s+$/, '')
  const after = content.slice(match.index + match[0].length).replace(/^\s+/, '')
  const rest = before && after ? `${before} ${after}` : before || after
  return { id, rest }
}
