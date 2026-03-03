export function useHighScore(game: string) {
  const auth = useAuth()
  const storageKey = `arcade_hs_${game}`
  const highScore = ref(0)

  function loadLocal(): void {
    if (import.meta.client) {
      highScore.value = Number(localStorage.getItem(storageKey) ?? 0)
    }
  }

  async function saveScore(score: number): Promise<void> {
    if (score <= highScore.value) return
    highScore.value = score

    if (import.meta.client) {
      localStorage.setItem(storageKey, String(score))
    }

    if (auth.user.value) {
      await $fetch('/api/scores', {
        method: 'POST',
        body: { game: game.toUpperCase(), value: score },
      }).catch(() => {/* fire-and-forget */})
    }
  }

  function resetScore(): void {
    highScore.value = 0
    if (import.meta.client) {
      localStorage.removeItem(storageKey)
    }
  }

  onMounted(loadLocal)

  return { highScore, saveScore, resetScore }
}
