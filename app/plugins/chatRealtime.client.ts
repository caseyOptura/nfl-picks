// Keeps the chat realtime hub in step with the session: opens league channels
// on login, closes them on logout, and re-checks membership when the tab
// comes back to the foreground.
export default defineNuxtPlugin(() => {
  const { userId } = useAuth()
  const hub = useChatRealtime()
  const visibility = useDocumentVisibility()

  watch(userId, (id) => hub.sync(id), { immediate: true })

  watch(visibility, (v) => {
    if (v === 'visible' && userId.value) hub.refresh()
  })

  // A removal from a league arrives on user:{me}; drop that league's channel.
  hub.on('member_removed', ({ userId: removed }) => {
    if (removed === userId.value) hub.refresh()
  })
})
