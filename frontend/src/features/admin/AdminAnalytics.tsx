import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Heart, Image as ImageIcon, MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AreaChart, type AreaPoint } from '@/components/ui/charts/AreaChart'
import { BarList } from '@/components/ui/charts/BarList'
import { DonutChart } from '@/components/ui/charts/DonutChart'

import { adminKeys, fetchAllArtworks, type AdminUserRow } from './admin.api'

const WINDOW_DAYS = 30

function dayIndex(iso: string, startMs: number): number {
  const d = new Date(iso)
  const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return Math.round((dayStart - startMs) / 86_400_000)
}

// Running total of `isoDates` over the trailing `WINDOW_DAYS`, seeded with the
// count already present before the window so the curve ends at the real total.
function growthSeries(isoDates: string[], locale: string): AreaPoint[] {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  start.setDate(start.getDate() - (WINDOW_DAYS - 1))
  const startMs = start.getTime()

  const perDay = new Array(WINDOW_DAYS).fill(0)
  let cumulative = 0
  for (const iso of isoDates) {
    const idx = dayIndex(iso, startMs)
    if (idx < 0) cumulative += 1
    else if (idx < WINDOW_DAYS) perDay[idx] += 1
  }

  const fmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
  const points: AreaPoint[] = []
  for (let i = 0; i < WINDOW_DAYS; i += 1) {
    cumulative += perDay[i]
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    points.push({ label: fmt.format(d), value: cumulative })
  }
  return points
}

function MetricCard({
  icon: Icon,
  value,
  label,
  tint,
  loading,
}: {
  icon: typeof Heart
  value: number
  label: string
  tint: string
  loading: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
      <span
        aria-hidden="true"
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tint}`}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        {loading ? (
          <span className="block h-7 w-10 animate-pulse rounded bg-neutral-200" />
        ) : (
          <p className="text-2xl font-semibold text-neutral-900">{value}</p>
        )}
        <p className="truncate text-sm text-neutral-500">{label}</p>
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h3>
      {children}
    </section>
  )
}

// Platform analytics derived entirely from the already-fetched user list plus a
// one-off artworks fetch — no dedicated backend endpoint (mirrors AdminStats).
export function AdminAnalytics({
  users,
  usersLoading,
}: {
  users: AdminUserRow[]
  usersLoading: boolean
}) {
  const { t, i18n } = useTranslation('common')
  const artworksQuery = useQuery({
    queryKey: adminKeys.artworks(),
    queryFn: fetchAllArtworks,
  })
  const artworks = useMemo(
    () => artworksQuery.data ?? [],
    [artworksQuery.data],
  )
  const loading = usersLoading || artworksQuery.isPending

  const userGrowth = useMemo(
    () => growthSeries(users.map((u) => u.createdAt), i18n.language),
    [users, i18n.language],
  )
  const artworkGrowth = useMemo(
    () => growthSeries(artworks.map((a) => a.createdAt), i18n.language),
    [artworks, i18n.language],
  )

  const admins = users.filter((u) => u.role === 'ADMIN').length
  const roleSegments = [
    { label: t('admin.stats.admins'), value: admins, color: '#2563eb' },
    { label: t('admin.stats.members'), value: users.length - admins, color: '#059669' },
  ]

  const topCreators = useMemo(
    () =>
      [...users]
        .sort((a, b) => b._count.artworks - a._count.artworks)
        .filter((u) => u._count.artworks > 0)
        .slice(0, 6)
        .map((u) => ({ label: u.username, value: u._count.artworks })),
    [users],
  )

  const topTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const art of artworks) {
      for (const tag of art.tags ?? []) {
        counts.set(tag.name, (counts.get(tag.name) ?? 0) + 1)
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value }))
  }, [artworks])

  const totalLikes = artworks.reduce((sum, a) => sum + (a._count?.likes ?? 0), 0)
  const totalComments = artworks.reduce(
    (sum, a) => sum + (a._count?.comments ?? 0),
    0,
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <MetricCard
          icon={ImageIcon}
          value={artworks.length}
          label={t('admin.analytics.artworks')}
          tint="bg-blue-100 text-blue-600"
          loading={loading}
        />
        <MetricCard
          icon={Heart}
          value={totalLikes}
          label={t('admin.analytics.likes')}
          tint="bg-rose-100 text-rose-600"
          loading={loading}
        />
        <MetricCard
          icon={MessageCircle}
          value={totalComments}
          label={t('admin.analytics.comments')}
          tint="bg-amber-100 text-amber-600"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title={t('admin.analytics.userGrowth')}>
          <AreaChart
            points={userGrowth}
            color="#7c3aed"
            ariaLabel={t('admin.analytics.userGrowth')}
          />
        </Panel>
        <Panel title={t('admin.analytics.contentGrowth')}>
          <AreaChart
            points={artworkGrowth}
            color="#2563eb"
            ariaLabel={t('admin.analytics.contentGrowth')}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title={t('admin.analytics.roles')}>
          <DonutChart
            segments={roleSegments}
            ariaLabel={t('admin.analytics.roles')}
            centerValue={users.length}
            centerLabel={t('admin.stats.total')}
          />
        </Panel>
        <Panel title={t('admin.analytics.topCreators')}>
          <BarList
            bars={topCreators}
            color="#7c3aed"
            emptyLabel={t('admin.analytics.empty')}
          />
        </Panel>
        <Panel title={t('admin.analytics.topTags')}>
          <BarList
            bars={topTags}
            color="#059669"
            emptyLabel={t('admin.analytics.empty')}
          />
        </Panel>
      </div>
    </div>
  )
}
