<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const leagueId = route.params.id as string

const { league, members, isOwner, pending, error, refresh, updateLeague, removeMember } = useLeague(leagueId)
const { invitations, invite, resend } = useInvitations(leagueId)

async function handleSave(patch: { name: string; season_year: number }) {
  return updateLeague(patch)
}

function handlePhotoUploaded(url: string) {
  updateLeague({ photo_url: url })
}

async function handleRemoveMember(userId: string) {
  await removeMember(userId)
}
</script>

<template>
  <main class="league-detail-page">
    <LoadingState v-if="pending" message="Loading league…" />
    <ErrorState v-else-if="error" :message="error.message" @retry="refresh" />
    <EmptyState v-else-if="!league" message="League not found." />

    <template v-else>
      <div class="league-header">
        <div class="league-photo">
          <img v-if="league.photo_url" :src="league.photo_url" :alt="league.name" class="photo-img" />
          <div v-else class="photo-placeholder">{{ league.name.slice(0, 2).toUpperCase() }}</div>
        </div>
        <div class="league-meta">
          <h1>{{ league.name }}</h1>
          <span class="season-label">{{ league.season_year }} Season</span>
        </div>
      </div>

      <LeagueSettings
        v-if="isOwner"
        :league-id="leagueId"
        :name="league.name"
        :season-year="league.season_year"
        :photo-url="league.photo_url"
        :on-save="handleSave"
        :on-photo-uploaded="handlePhotoUploaded"
      />

      <section class="section">
        <h2>Members</h2>
        <div class="members-list">
          <LeagueMemberRow
            v-for="member in members"
            :key="member.userId"
            :member="member"
            :can-remove="isOwner && member.role !== 'owner'"
            @remove="handleRemoveMember"
          />
        </div>
      </section>

      <section class="section">
        <InviteForm :on-invite="invite" :on-resend="resend" :invitations="invitations" />
      </section>

      <div class="page-links">
        <NuxtLink :to="'/leagues/' + leagueId + '/stats'" class="page-link">View Standings</NuxtLink>
        <NuxtLink :to="'/picks?league=' + leagueId" class="page-link">Make Picks</NuxtLink>
      </div>
    </template>
  </main>
</template>

<style scoped>
.league-detail-page { max-width: 600px; margin: 0 auto; padding: 1.5rem 1rem; display: flex; flex-direction: column; gap: 2rem; }
.league-header { display: flex; align-items: center; gap: 1rem; }
.league-photo { flex-shrink: 0; width: 64px; height: 64px; border-radius: 10px; overflow: hidden; border: 1px solid #2a2a2a; }
.photo-img { width: 100%; height: 100%; object-fit: cover; }
.photo-placeholder { width: 100%; height: 100%; background: #1e1e1e; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700; color: #555; }
.league-meta { display: flex; flex-direction: column; gap: 0.25rem; }
.league-meta h1 { margin-bottom: 0; }
.season-label { font-size: 0.85rem; color: #666; }
.section { background: #111; border: 1px solid #1e1e1e; border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
.section h2 { margin-bottom: 0; }
.members-list { display: flex; flex-direction: column; }
.page-links { display: flex; gap: 1rem; flex-wrap: wrap; }
.page-link { font-size: 0.9rem; font-weight: 600; color: #aaa; text-decoration: none; padding: 0.5rem 0.9rem; border: 1px solid #2a2a2a; border-radius: 7px; transition: border-color 0.15s, color 0.15s; }
.page-link:hover { border-color: #444; color: #f0f0f0; }
</style>
