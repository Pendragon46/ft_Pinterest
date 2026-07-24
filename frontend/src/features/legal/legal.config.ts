// Single source for the facts the legal copy interpolates (the {{contactEmail}},
// {{jurisdiction}}, {{minAge}} and {{date}} vars in the privacy/terms i18n).
// Change them here once and all three languages update together.
// TODO: confirm with the team before shipping (real contact, hosting jurisdiction,
// minimum age) — these are the project's defensible defaults, not legal advice.
export const LEGAL = {
  contactEmail: 'privacy@atlaas.app',
  jurisdiction: 'France',
  minAge: 15,
  lastUpdated: '2026-07-14',
} as const
