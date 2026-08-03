import { useState, type ImgHTMLAttributes } from 'react'

interface SafeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Required so a fallback never silently drops the accessible name. */
  alt: string
  /**
   * Opt in to a CORS request. Only needed when the pixels are read back
   * (canvas, WebGL) and the host actually sends Access-Control-Allow-Origin.
   * Off by default: forcing it on a host that sends no ACAO turns a working
   * image into a failed load — that is what broke Google avatars.
   */
  cors?: boolean
  /** Rendered instead of the grey block when the image fails (e.g. initials). */
  fallback?: string
}

// An image whose source fails (dead Cloudinary URL, deleted publicId, network
// drop) swaps to a neutral placeholder instead of leaving a broken frame — and
// the render never depends on a URL that might 404. Drop-in for <img>: the
// className carries the sizing, so the placeholder keeps the image's footprint.
export function SafeImage({
  src,
  alt,
  className,
  cors = false,
  fallback,
  ...rest
}: SafeImageProps) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    // Initials read as "this person", where a grey square reads as "broken".
    if (fallback) {
      return (
        <span
          aria-hidden="true"
          className={`flex items-center justify-center bg-neutral-200 font-medium text-neutral-600 ${className ?? ''}`}
        >
          {fallback}
        </span>
      )
    }
    return (
      <span aria-hidden="true" className={`block bg-neutral-200 ${className ?? ''}`} />
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      {...(cors ? { crossOrigin: 'anonymous' as const } : {})}
      // Third-party avatar CDNs throttle by referrer; sending none keeps a
      // remote image from being rate-limited into a blank frame.
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      {...rest}
    />
  )
}
