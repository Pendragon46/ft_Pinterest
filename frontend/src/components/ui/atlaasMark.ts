/**
 * Atlaas brand mark ("picto") as raw path geometry.
 *
 * These are the same five petals as `@/assets/picto.svg`, but exposed as path
 * data so callers can inline them into an SVG — e.g. to punch a logo-shaped hole
 * through an animated `<mask>`. `Logo` keeps using the `<img>` (it carries a
 * grain filter); this module exists for cases that need the vector inline.
 */

/** viewBox of the source picto. */
export const ATLAAS_MARK_VIEWBOX = '0 0 194 195'

/** Local-space centre of the mark — the pivot for scaling / rotating it. */
export const ATLAAS_MARK_CENTER = { x: 97, y: 97 } as const

/** The five sub-paths, tagged for stable React keys. */
export const ATLAAS_MARK_PATHS = [
  {
    id: 'core',
    d: 'M93.1598 70.3034C108.173 68.2008 122.037 78.6873 124.1 93.704C126.163 108.721 115.643 122.559 100.62 124.584C85.6516 126.602 71.8775 116.126 69.821 101.164C67.7645 86.2024 78.2021 72.3982 93.1598 70.3034Z',
  },
  {
    id: 'top',
    d: 'M96.3661 4C112.511 4.1708 133.838 36.1936 140.494 49.8781C125.264 41.0715 116.427 36.8499 98.6192 35.6843C80.4423 35.6671 68.7177 41.1674 53.5186 49.985C59.926 36.206 80.953 6.05508 96.3661 4Z',
  },
  {
    id: 'bottom',
    d: 'M53.7764 145.525C54.7701 145.835 61.3018 149.535 62.6474 150.259C67.7679 153.049 73.192 155.229 78.8196 156.754C102.479 163.32 120.09 156.785 140.496 145.252C136.573 152.635 132.809 158.339 128.044 165.136C120.677 174.556 105.171 195.225 91.9796 189.449C77.6845 183.191 60.553 159.441 53.7764 145.525Z',
  },
  {
    id: 'right',
    d: 'M146.795 56.1777C157.371 59.7955 177.552 77.1078 184.919 85.354C199.497 101.677 179.395 116.212 166.138 126.71C160.031 131.381 153.531 135.516 146.709 139.069C164.22 105.178 164.458 90.1339 146.795 56.1777Z',
  },
  {
    id: 'left',
    d: 'M46.6345 56.3457L46.7243 56.4358C46.8588 57.3608 45.6373 59.2696 45.137 60.1833C36.4799 75.9932 31.8805 92.704 35.7277 110.664C38.0533 121.532 42.2007 129.278 47.3902 138.923C40.3616 135.23 35.4827 131.934 29.1719 127.357C17.5266 118.554 -5.18072 102.659 7.98271 86.8904C18.7067 74.0444 32.1979 64.4943 46.6345 56.3457Z',
  },
] as const
