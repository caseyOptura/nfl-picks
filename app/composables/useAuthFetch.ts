export async function authFetch<T>(url: string, opts: Parameters<typeof $fetch>[1] = {}): Promise<T> {
  const client = useSupabaseClient()
  const { data: { session } } = await client.auth.getSession()
  return $fetch<T>(url, {
    ...opts,
    headers: {
      ...(opts.headers as Record<string, string> | undefined),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  })
}
