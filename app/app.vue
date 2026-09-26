<script setup lang="ts">
const { isLoggedIn } = useAuth()
// Top on phones (clear of the chat composer), below the sticky nav.
const isMobile = useMediaQuery('(max-width: 767px)')
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <AppNav />
    <NuxtPage />
    <Toaster
      theme="dark"
      :visible-toasts="5"
      :duration="6000"
      close-button
      :position="isMobile ? 'top-center' : 'bottom-right'"
      :offset="isMobile ? 64 : 24"
      :mobile-offset="{ top: 64, left: 16, right: 16 }"
    />
    <ChatNotifier v-if="isLoggedIn" />
  </div>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #f0f0f0; }
h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 1.25rem; }
h2 { font-size: 1rem; font-weight: 700; color: #ccc; margin-bottom: 0.5rem; }
</style>
