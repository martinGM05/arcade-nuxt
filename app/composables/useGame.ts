export function useGame(key: string) {
  const { data } = useFetch('/api/games')
  return computed(() => data.value?.games.find(g => g.key === key) ?? null)
}
