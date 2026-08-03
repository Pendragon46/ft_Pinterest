import type { AreaPoint } from '@/components/ui/charts/AreaChart'
import type { BarDatum } from '@/components/ui/charts/BarList'
import { downloadFile, toCsv } from '@/lib/csv'

export interface AnalyticsSnapshot {
  totals: {
    users: number
    admins: number
    artworks: number
    likes: number
    comments: number
  }
  userGrowth: AreaPoint[]
  artworkGrowth: AreaPoint[]
  topCreators: BarDatum[]
  topTags: BarDatum[]
}

// One CSV file, each analytics category a titled block separated by a blank
// line — same shape as the GDPR export so a spreadsheet opens it cleanly. Leads
// with a UTF-8 BOM so Excel decodes accented labels on double-click.
export function downloadAnalyticsCsv(s: AnalyticsSnapshot): void {
  const sections: [string, Record<string, unknown>[]][] = [
    [
      'summary',
      [
        { metric: 'users', value: s.totals.users },
        { metric: 'admins', value: s.totals.admins },
        { metric: 'artworks', value: s.totals.artworks },
        { metric: 'likes', value: s.totals.likes },
        { metric: 'comments', value: s.totals.comments },
      ],
    ],
    [
      'user_growth',
      s.userGrowth.map((p) => ({ date: p.label, cumulative_users: p.value })),
    ],
    [
      'artwork_growth',
      s.artworkGrowth.map((p) => ({
        date: p.label,
        cumulative_artworks: p.value,
      })),
    ],
    [
      'top_creators',
      s.topCreators.map((b) => ({ username: b.label, artworks: b.value })),
    ],
    ['top_tags', s.topTags.map((b) => ({ tag: b.label, artworks: b.value }))],
  ]

  const csv = sections
    .map(([title, rows]) => `${title}\r\n${toCsv(rows)}`)
    .join('\r\n\r\n')
  const date = new Date().toISOString().slice(0, 10)
  downloadFile(`\uFEFF${csv}`, `atlaas-analytics-${date}.csv`, 'text/csv')
}
