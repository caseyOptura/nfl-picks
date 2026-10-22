<script setup lang="ts">
const props = defineProps<{ weeks: (number | string)[]; active: number | string }>()
const emit = defineEmits<{ change: [week: number | string] }>()

const strip = ref<HTMLElement | null>(null)

function label(week: number | string): string {
  return typeof week === 'string' ? week : `Week ${week}`
}

// Keep the selected tab centred in the strip. Instant on first render so the
// page does not open with a visible scroll, smooth when the user changes week.
function centerActive(behavior: ScrollBehavior) {
  const el = strip.value
  const tab = el?.querySelector<HTMLElement>('[aria-selected="true"]')
  if (!el || !tab) return
  // Measure from the strip itself; `offsetLeft` is relative to the page here.
  const tabLeft = tab.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft
  el.scrollTo({ left: tabLeft - (el.clientWidth - tab.offsetWidth) / 2, behavior })
}

onMounted(() => centerActive('instant'))
watch(() => props.active, () => nextTick(() => centerActive('smooth')))

// Arrow keys move between tabs, per the WAI-ARIA tabs pattern.
function onKeydown(e: KeyboardEvent) {
  const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
  if (!step) return
  const next = props.weeks[props.weeks.indexOf(props.active) + step]
  if (next === undefined) return
  e.preventDefault()
  emit('change', next)
  nextTick(() => strip.value?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus())
}
</script>

<template>
  <div ref="strip" class="week-tabs" role="tablist" aria-label="Week" @keydown="onKeydown">
    <button
      v-for="week in weeks"
      :key="String(week)"
      type="button"
      role="tab"
      class="week-tab"
      :class="{ active: week === active }"
      :aria-selected="week === active"
      :tabindex="week === active ? 0 : -1"
      :data-label="label(week)"
      @click="emit('change', week)"
    >
      {{ label(week) }}
    </button>
  </div>
</template>

<style scoped>
.week-tabs {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  scrollbar-width: none;
  border-bottom: 1px solid #222;
  /* Fade the edges so it is clear the strip scrolls. */
  mask-image: linear-gradient(to right, transparent, #000 1rem, #000 calc(100% - 1rem), transparent);
  padding: 0 1rem;
  margin: 0 -1rem;
}

.week-tabs::-webkit-scrollbar {
  display: none;
}

.week-tab {
  flex-shrink: 0;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 0.6rem 0.75rem 0.55rem;
  margin-bottom: -1px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 6px 6px 0 0;
  color: #777;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.15s, background 0.15s, border-color 0.15s;
}

/* Reserve the bold width so the strip does not shift when a tab is selected. */
.week-tab::after {
  content: attr(data-label);
  height: 0;
  overflow: hidden;
  visibility: hidden;
  font-weight: 800;
}

.week-tab:hover {
  color: #ccc;
}

.week-tab:focus-visible {
  outline: 2px solid #555;
  outline-offset: -2px;
}

.week-tab.active {
  color: #fff;
  font-weight: 800;
  background: #161616;
  border-bottom-color: #fff;
}
</style>
