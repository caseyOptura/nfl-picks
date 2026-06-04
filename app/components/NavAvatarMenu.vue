<script setup lang="ts">
const { logOut } = useAuth()
const { profile } = useProfile()

const menuOpen = ref(false)
const menuEl = ref<HTMLElement | null>(null)

function toggleMenu() { menuOpen.value = !menuOpen.value }
function closeMenu() { menuOpen.value = false }

function onDocClick(e: MouseEvent) {
  if (menuEl.value && !menuEl.value.contains(e.target as Node)) {
    menuOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocClick, true))
onUnmounted(() => document.removeEventListener('click', onDocClick, true))

const initials = computed(() => {
  if (!profile.value) return '?'
  const f = profile.value.first_name?.[0] ?? ''
  const l = profile.value.last_name?.[0] ?? ''
  return (f + l).toUpperCase() || '?'
})
</script>

<template>
  <div ref="menuEl" class="avatar-menu">
    <button class="avatar-btn" :aria-expanded="menuOpen" @click="toggleMenu">
      <img v-if="profile?.avatar_url" :src="profile.avatar_url" alt="Avatar" class="avatar-img" />
      <span v-else class="avatar-initials">{{ initials }}</span>
    </button>
    <Transition name="dropdown">
      <div v-if="menuOpen" class="avatar-dropdown">
        <div class="dropdown-header">
          <span class="dropdown-name">{{ profile?.nickname || profile?.first_name || 'Account' }}</span>
        </div>
        <div class="dropdown-divider" />
        <NuxtLink to="/profile" class="dropdown-item" @click="closeMenu">
          <svg class="dropdown-icon" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4.418 0-8 1.79-8 4v1h16v-1c0-2.21-3.582-4-8-4z"/>
          </svg>
          Profile
        </NuxtLink>
        <button class="dropdown-item dropdown-logout" @click="() => { closeMenu(); logOut() }">
          <svg class="dropdown-icon" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 4a1 1 0 0 1 1-1h7a1 1 0 1 1 0 2H5v10h6a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1V4zm12.293 2.293a1 1 0 0 1 1.414 0l3 3a1 1 0 0 1 0 1.414l-3 3a1 1 0 0 1-1.414-1.414L16.586 11H9a1 1 0 1 1 0-2h7.586l-1.293-1.293a1 1 0 0 1 0-1.414z" clip-rule="evenodd"/>
          </svg>
          Sign out
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.avatar-menu { position: relative; }

.avatar-btn {
  background: none; border: none; cursor: pointer; padding: 0;
  display: flex; align-items: center;
}

.avatar-img {
  width: 32px; height: 32px; border-radius: 50%;
  object-fit: cover; border: 2px solid #333;
  transition: border-color 0.15s;
}

.avatar-initials {
  width: 32px; height: 32px; border-radius: 50%;
  background: #2a2a2a; border: 2px solid #333;
  color: #ccc; font-size: 0.7rem; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  transition: border-color 0.15s;
}

.avatar-btn:hover .avatar-img,
.avatar-btn:hover .avatar-initials,
.avatar-btn[aria-expanded="true"] .avatar-img,
.avatar-btn[aria-expanded="true"] .avatar-initials { border-color: #666; }

.avatar-dropdown {
  position: absolute; top: calc(100% + 12px); right: -4px;
  background: rgba(18, 18, 22, 0.92);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px;
  padding: 6px; min-width: 160px;
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.03);
  z-index: 100;
}

.avatar-dropdown::before {
  content: ''; position: absolute; top: -5px; right: 12px;
  width: 9px; height: 9px;
  background: rgba(18, 18, 22, 0.92);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  transform: rotate(45deg);
}

.dropdown-header { padding: 8px 12px 10px; }

.dropdown-name {
  font-size: 0.8rem; font-weight: 600; color: #888;
  letter-spacing: 0.02em; text-transform: uppercase;
}

.dropdown-divider { height: 1px; background: rgba(255, 255, 255, 0.07); margin: 0 4px 6px; }

.dropdown-item {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 9px 12px; border-radius: 7px; text-decoration: none;
  font-size: 0.875rem; font-weight: 500; color: #bbb;
  background: none; border: none; cursor: pointer; text-align: left;
  transition: background 0.12s, color 0.12s;
}

.dropdown-item:hover { background: rgba(255, 255, 255, 0.07); color: #fff; }

.dropdown-icon { width: 15px; height: 15px; opacity: 0.6; flex-shrink: 0; }
.dropdown-item:hover .dropdown-icon { opacity: 0.9; }

.dropdown-logout { color: #f87171; }
.dropdown-logout .dropdown-icon { opacity: 0.7; }
.dropdown-logout:hover { background: rgba(248, 113, 113, 0.08); color: #fca5a5; }

.dropdown-enter-active, .dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from, .dropdown-leave-to {
  opacity: 0; transform: translateY(-6px) scale(0.97);
}
</style>
