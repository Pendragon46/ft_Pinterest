// Default avatar — a brand-blue gradient as an inline data-URI, so it renders
// offline and needs no network. Prisma gives every user a default avatarUrl;
// this is the mock stand-in for it. TODO(backend): the server returns a real URL.
export const DEFAULT_AVATAR =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2064%2064'%3E%3Cdefs%3E%3ClinearGradient%20id='a'%20x1='0'%20y1='0'%20x2='1'%20y2='1'%3E%3Cstop%20offset='0'%20stop-color='%234f7cff'/%3E%3Cstop%20offset='1'%20stop-color='%236b3fd4'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width='64'%20height='64'%20fill='url(%23a)'/%3E%3C/svg%3E"
