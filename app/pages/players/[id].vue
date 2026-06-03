<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const athleteId = route.params.id as string

const { athlete, statCategories, pending, error } = usePlayerDetail(athleteId)

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/teams')
  }
}
</script>

<template>
  <main>
    <button class="back-btn" @click="goBack">← Back</button>

    <LoadingState v-if="pending" message="Loading player…" />
    <ErrorState v-else-if="error" :message="error.message" />
    <template v-else-if="athlete">
      <PlayerHeader :athlete="athlete" />

      <section class="bio-section">
        <h2 class="section-heading">Bio</h2>
        <div class="bio-grid">
          <div v-if="athlete.age" class="bio-item">
            <span class="bio-label">Age</span>
            <span class="bio-value">{{ athlete.age }}</span>
          </div>
          <div v-if="athlete.displayHeight" class="bio-item">
            <span class="bio-label">Height</span>
            <span class="bio-value">{{ athlete.displayHeight }}</span>
          </div>
          <div v-if="athlete.displayWeight" class="bio-item">
            <span class="bio-label">Weight</span>
            <span class="bio-value">{{ athlete.displayWeight }}</span>
          </div>
          <div v-if="athlete.displayExperience" class="bio-item">
            <span class="bio-label">Experience</span>
            <span class="bio-value">{{ athlete.displayExperience }}</span>
          </div>
          <div v-if="athlete.college?.name" class="bio-item">
            <span class="bio-label">College</span>
            <span class="bio-value">{{ athlete.college.name }}</span>
          </div>
          <div v-if="athlete.displayBirthPlace" class="bio-item">
            <span class="bio-label">Hometown</span>
            <span class="bio-value">{{ athlete.displayBirthPlace }}</span>
          </div>
          <div v-if="athlete.displayDraft" class="bio-item">
            <span class="bio-label">Draft</span>
            <span class="bio-value">{{ athlete.displayDraft }}</span>
          </div>
          <div v-if="athlete.status?.name" class="bio-item">
            <span class="bio-label">Status</span>
            <span class="bio-value">{{ athlete.status.name }}</span>
          </div>
        </div>
      </section>

      <template v-if="statCategories.length > 0">
        <section v-for="category in statCategories" :key="category.name" class="stats-section">
          <h2 class="section-heading">{{ category.displayName }}</h2>
          <p v-if="category.summary" class="category-summary">{{ category.summary }}</p>
          <div class="stats-grid">
            <div v-for="stat in category.stats" :key="stat.name" class="stat-item">
              <span class="stat-label">{{ stat.shortDisplayName ?? stat.displayName }}</span>
              <span class="stat-value">{{ stat.displayValue }}</span>
            </div>
          </div>
        </section>
      </template>
      <EmptyState v-else message="No stats available for this season" />
    </template>
  </main>
</template>

<style scoped>
main {
  padding: 1rem;
  max-width: 960px;
  margin: 0 auto;
}

.back-btn {
  background: transparent;
  border: none;
  color: #888;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 0;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.back-btn:hover {
  color: #ccc;
}

.section-heading {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #555;
  margin-bottom: 0.75rem;
}

.bio-section,
.stats-section {
  margin-bottom: 2rem;
}

.bio-grid,
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.75rem;
}

.bio-item,
.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  background: #111;
  border: 1px solid #1e1e1e;
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.bio-label,
.stat-label {
  font-size: 0.65rem;
  color: #555;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.bio-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: #eee;
}

.stat-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: #eee;
}

.category-summary {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 0.75rem;
}
</style>
