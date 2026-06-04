<script setup lang="ts">
const { isLoggedIn } = useAuth()
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <nav>
      <NuxtLink to="/schedule">Schedule</NuxtLink>
      <NuxtLink to="/teams">Teams</NuxtLink>
      <div class="nav-spacer" />
      <NavAvatarMenu v-if="isLoggedIn" />
      <NuxtLink v-else to="/login">Log in</NuxtLink>
    </nav>
    <NuxtPage />
  </div>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; color: #f0f0f0; }
h1 { font-size: 1.4rem; font-weight: 700; margin-bottom: 1.25rem; }
h2 { font-size: 1rem; font-weight: 700; color: #ccc; margin-bottom: 0.5rem; }
</style>

<style scoped>
nav {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.875rem 1rem;
  background: #111;
  border-bottom: 1px solid #222;
  position: sticky;
  top: 0;
  z-index: 50;
}
nav :deep(a) {
  color: #999;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  padding-bottom: 2px;
}
nav :deep(a.router-link-active) {
  color: #fff;
  border-bottom: 2px solid #fff;
}
.nav-spacer { flex: 1; }
</style>
