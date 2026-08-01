import { useState, type ImgHTMLAttributes } from 'react'

interface SafeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Required so a fallback never silently drops the accessible name. */
  alt: string
}

// An image whose source fails (dead Cloudinary URL, deleted publicId, network
// drop) swaps to a neutral placeholder instead of leaving a broken frame — and
// the render never depends on a URL that might 404. Drop-in for <img>: the
// className carries the sizing, so the placeholder keeps the image's footprint.
export function SafeImage({ src, alt, className, ...rest }: SafeImageProps) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <span aria-hidden="true" className={`block bg-neutral-200 ${className ?? ''}`} />
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      // CORS request (Cloudinary and Google avatars both send ACAO: *): the
      // response is no longer "opaque", so Firefox's Opaque Response Blocking
      // stops aborting cross-origin avatars, and canvas draws stay untainted.
      crossOrigin="anonymous"
      onError={() => setFailed(true)}
      className={className}
      {...rest}
    />
  )
}
