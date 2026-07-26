import { useTranslation } from 'react-i18next'

export function TypingIndicator({ name }: { name: string }) {
  const { t } = useTranslation('common')
  return (
    <div className="mt-1 flex items-center gap-2" aria-live="polite">
      <span
        aria-hidden="true"
        className="inline-flex items-center gap-1 rounded-2xl bg-neutral-100 px-3 py-2"
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 rounded-full bg-neutral-400 animate-typing motion-reduce:animate-none"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </span>
      <span className="sr-only">{t('chat.typing', { name })}</span>
    </div>
  )
}
