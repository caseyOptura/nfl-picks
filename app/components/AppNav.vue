<script setup lang="ts">
const { isLoggedIn } = useAuth()

const menuOpen = ref(false)
const navEl = ref<HTMLElement | null>(null)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

function onDocClick(e: MouseEvent) {
  if (navEl.value && !navEl.value.contains(e.target as Node)) {
    menuOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocClick, true))
onUnmounted(() => document.removeEventListener('click', onDocClick, true))
</script>

<template>
  <div ref="navEl" class="nav-wrapper">
    <nav>
      <button class="hamburger" :aria-expanded="menuOpen" aria-label="Toggle navigation" @click="toggleMenu">
        <svg class="hamburger-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <Transition name="hamburger-lines" mode="out-in">
            <g v-if="!menuOpen" key="open">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </g>
            <g v-else key="close">
              <line x1="4" y1="4" x2="20" y2="20" />
              <line x1="20" y1="4" x2="4" y2="20" />
            </g>
          </Transition>
        </svg>
      </button>

      <div class="nav-links">
        <NuxtLink to="/schedule" @click="closeMenu">Schedule</NuxtLink>
        <NuxtLink to="/teams" @click="closeMenu">Teams</NuxtLink>
        <NuxtLink v-if="isLoggedIn" to="/leagues" @click="closeMenu">Leagues</NuxtLink>
        <NuxtLink v-if="isLoggedIn" to="/picks" @click="closeMenu">Picks</NuxtLink>
      </div>

      <div class="nav-spacer" />

      <NavAvatarMenu v-if="isLoggedIn" />
      <NuxtLink v-else to="/login" class="login-link">Log in</NuxtLink>
    </nav>

    <Transition name="mobile-menu">
      <div v-if="menuOpen" class="mobile-menu">
        <NuxtLink to="/schedule" @click="closeMenu">Schedule</NuxtLink>
        <NuxtLink to="/teams" @click="closeMenu">Teams</NuxtLink>
        <NuxtLink v-if="isLoggedIn" to="/leagues" @click="closeMenu">Leagues</NuxtLink>
        <NuxtLink v-if="isLoggedIn" to="/picks" @click="closeMenu">Picks</NuxtLink>
        <NuxtLink v-if="!isLoggedIn" to="/login" @click="closeMenu">Log in</NuxtLink>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.nav-wrapper {
  position: sticky;
  top: 0;
  z-index: 50;
}

nav {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.875rem 1rem;
  background: #111;
  border-bottom: 1px solid #222;
  min-width: 0;
}

nav :deep(a) {
  color: #999;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  padding-bottom: 2px;
  white-space: nowrap;
}

nav :deep(a.router-link-active) {
  color: #fff;
  border-bottom: 2px solid #fff;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.nav-spacer { flex: 1; min-width: 0; }

.hamburger {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #999;
  flex-shrink: 0;
  line-height: 0;
}

.hamburger:hover { color: #fff; }

.hamburger-icon { width: 22px; height: 22px; display: block; }

.mobile-menu {
  display: none;
  flex-direction: column;
  background: #111;
  border-bottom: 1px solid #222;
  padding: 0.5rem 0;
}

.mobile-menu :deep(a) {
  display: block;
  padding: 0.75rem 1.25rem;
  color: #999;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  border-left: 3px solid transparent;
  transition: color 0.12s, border-color 0.12s;
}

.mobile-menu :deep(a:hover) { color: #fff; }

.mobile-menu :deep(a.router-link-active) {
  color: #fff;
  border-left-color: #fff;
}

.mobile-menu-enter-active, .mobile-menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.mobile-menu-enter-from, .mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.hamburger-lines-enter-active, .hamburger-lines-leave-active {
  transition: opacity 0.1s ease;
}

.hamburger-lines-enter-from, .hamburger-lines-leave-to { opacity: 0; }

@media (max-width: 767px) {
  .hamburger { display: flex; align-items: center; justify-content: center; }
  .nav-links { display: none; }
  .mobile-menu { display: flex; }
}
</style>
