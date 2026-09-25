<script setup lang="ts">
// Total unread chat messages across the user's leagues, for the nav.
const unread = useChatUnread()
const label = computed(() => (unread.total.value > 99 ? '99+' : String(unread.total.value)))
</script>

<template>
  <span v-if="unread.total.value" class="badge" :aria-label="`${unread.total.value} unread chat messages`">{{ label }}</span>
</template>

<style scoped>
.badge {
  display: inline-block;
  min-width: 18px;
  height: 18px;
  margin-left: 0.35rem;
  padding: 0 5px;
  border-radius: 9px;
  background: #ef4444;
  color: #fff;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  vertical-align: 1px;
}
</style>
