import type { AthleteDetail, PlayerStatsResponse, StatsCategory } from '~/types/espn'

export function usePlayerDetail(athleteId: string) {
  const { data: athleteData, pending: athletePending, error: athleteError } = useAsyncData(
    `athlete-${athleteId}`,
    () => $fetch<AthleteDetail>(`/api/athlete/${athleteId}`)
  )

  const { data: statsData, pending: statsPending } = useAsyncData(
    `athlete-stats-${athleteId}`,
    () => $fetch<PlayerStatsResponse>(`/api/athlete/${athleteId}/stats`).catch(() => null)
  )

  // ESPN wraps the athlete under an `athlete` key on this endpoint
  const athlete = computed<AthleteDetail | null>(() => {
    const raw = athleteData.value as AthleteDetail & { athlete?: AthleteDetail }
    if (!raw) return null
    return (raw as { athlete?: AthleteDetail }).athlete ?? raw
  })

  const statCategories = computed<StatsCategory[]>(() =>
    statsData.value?.splits?.categories ?? []
  )

  const pending = computed(() => athletePending.value || statsPending.value)
  const error = computed(() => athleteError.value ?? null)

  return { athlete, statCategories, pending, error }
}
