import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { http } from '@/lib/http'

interface Health {
  status: string
  backend: string
  database: string
  uptime: number
  version: string
  timestamp: string
}

const REFRESH_INTERVAL_MS = 30_000

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const parts: string[] = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (minutes) parts.push(`${minutes}min`)
  if (!days && !hours) parts.push(`${secs}s`)
  return parts.join(' ')
}

// Map the server's free-form status word to a semantic colour. Unknown values
// stay neutral rather than guessing.
function toneClass(value: string): string {
  const v = value.toLowerCase()
  if (['ok', 'up', 'healthy', 'connected', 'online'].includes(v)) {
    return 'bg-green-50 text-green-700'
  }
  if (['degraded', 'warning', 'slow'].includes(v)) {
    return 'bg-amber-50 text-amber-700'
  }
  if (['down', 'error', 'offline', 'disconnected'].includes(v)) {
    return 'bg-red-50 text-red-700'
  }
  return 'bg-neutral-100 text-neutral-600'
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${toneClass(value)}`}
    >
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      {value}
    </span>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-100 px-4 py-3.5 last:border-0 sm:px-5">
      <span className="text-sm text-neutral-500">{label}</span>
      {children}
    </div>
  )
}

export function AdminStatusPanel() {
  const { t, i18n } = useTranslation('common')
  const { data, isPending, isError, refetch, isFetching, dataUpdatedAt } =
    useQuery({
      queryKey: ['health'],
      queryFn: async () => {
        const { data } = await http.get<Health>('/health')
        return data
      },
      refetchInterval: REFRESH_INTERVAL_MS,
    })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 motion-reduce:transition-none"
        >
          <RefreshCw
            aria-hidden="true"
            className={`size-4 ${isFetching ? 'animate-spin' : ''}`}
          />
          {t('admin.status.refresh')}
        </button>
      </div>

      {isPending ? (
        <p className="text-sm text-neutral-500">{t('admin.status.loading')}</p>
      ) : isError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm text-red-700">
          {t('admin.status.error')}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            <Row label={t('admin.status.overall')}>
              <StatusBadge value={data.status} />
            </Row>
            <Row label={t('admin.status.backend')}>
              <StatusBadge value={data.backend} />
            </Row>
            <Row label={t('admin.status.database')}>
              <StatusBadge value={data.database} />
            </Row>
            <Row label={t('admin.status.version')}>
              <code className="text-sm text-neutral-700">{data.version}</code>
            </Row>
            <Row label={t('admin.status.uptime')}>
              <span className="text-sm text-neutral-700">
                {formatUptime(data.uptime)}
              </span>
            </Row>
          </div>
          <p className="text-xs text-neutral-400">
            {t('admin.status.checkedAt', {
              time: new Date(dataUpdatedAt).toLocaleTimeString(i18n.language),
              seconds: REFRESH_INTERVAL_MS / 1000,
            })}
          </p>
        </>
      )}
    </div>
  )
}
