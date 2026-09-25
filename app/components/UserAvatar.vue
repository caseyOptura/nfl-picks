<script setup lang="ts">
const props = withDefaults(defineProps<{
  name: string
  url?: string | null
  size?: number
}>(), { url: null, size: 32 })

const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
})

const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.max(9, Math.round(props.size * 0.38))}px`,
}))
</script>

<template>
  <img v-if="url" :src="url" :alt="name" class="user-avatar" :style="style" />
  <span v-else class="user-avatar initials" :style="style" :aria-label="name" role="img">{{ initials }}</span>
</template>

<style scoped>
.user-avatar {
  display: block;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #2a2a2a;
}
.initials {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #222;
  color: #aaa;
  font-weight: 700;
  user-select: none;
}
</style>
