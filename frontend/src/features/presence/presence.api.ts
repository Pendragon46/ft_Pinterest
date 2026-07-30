import { http } from '@/lib/http'

// GET /friends/online returns the online mutuals as safe-user objects; presence
// only needs their ids.
export async function fetchOnlineFriends(): Promise<string[]> {
  const { data } = await http.get<Array<{ id: string }>>('/friends/online')
  return data.map((user) => user.id)
}
