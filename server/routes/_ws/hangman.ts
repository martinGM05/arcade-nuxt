import { verifyToken } from '../../utils/jwt'
import { broadcastToAll, getOrCreateRoom, rooms } from '../../ws/rooms'
import prisma from '../../utils/prisma'
import { RoomStatus } from '@prisma/client'
import type { Peer } from 'crossws'

interface HangmanPlayer {
  peer: Peer
  userId: string
  username: string
  slot: number
}

interface HangmanRoomState {
  roomId: string
  status: 'waiting' | 'choosing' | 'playing' | 'finished'
  players: Map<string, HangmanPlayer>
  setterUserId: string | null
  phrase: string | null
  masked: string | null
  guessed: Set<string>
  remaining: number
  wordCount: number
  winnerId: string | null
  winnerUsername: string | null
}

const MAX_PLAYERS = 6
const MAX_ERRORS = 6
const gameRooms = new Map<string, HangmanRoomState>()

function normalizePhrase(input: string): string {
  return input.trim().replace(/\s+/g, ' ').toUpperCase()
}

function isLetter(ch: string): boolean {
  return /[A-ZÁÉÍÓÚÜÑ]/.test(ch)
}

function maskPhrase(phrase: string): string {
  return phrase
    .split('')
    .map(ch => (isLetter(ch) ? '_' : ch))
    .join('')
}

function countWords(phrase: string): number {
  if (!phrase.trim()) return 0
  return phrase.trim().split(/\s+/).length
}

function buildState(state: HangmanRoomState) {
  return {
    type: 'ROOM_STATE',
    status: state.status,
    players: Array.from(state.players.values()).map(p => ({
      userId: p.userId,
      username: p.username,
      slot: p.slot,
      isSetter: p.userId === state.setterUserId,
    })),
    setterUserId: state.setterUserId,
    masked: state.status === 'playing' || state.status === 'finished' ? state.masked : null,
    remaining: state.remaining,
    guessedLetters: Array.from(state.guessed.values()),
    wordCount: state.wordCount,
    winnerId: state.winnerId,
    winnerUsername: state.winnerUsername,
    phrase: state.status === 'finished' ? state.phrase : null,
    maxErrors: MAX_ERRORS,
  }
}

function broadcastState(state: HangmanRoomState): void {
  broadcastToAll(state.roomId, buildState(state))
}

function chooseSetter(state: HangmanRoomState): void {
  const players = Array.from(state.players.values())
  if (players.length === 0) { state.setterUserId = null; return }
  const pick = players[Math.floor(Math.random() * players.length)]
  state.setterUserId = pick?.userId ?? null
}

async function endGame(state: HangmanRoomState, winnerId: string | null): Promise<void> {
  state.status = 'finished'
  state.winnerId = winnerId
  state.winnerUsername = winnerId ? state.players.get(winnerId)?.username ?? null : null
  broadcastState(state)

  await prisma.gameRoom.update({
    where: { id: state.roomId },
    data: { status: RoomStatus.FINISHED },
  }).catch(() => {/* ignore */})
}

export default defineWebSocketHandler({
  async open(peer) {
    peer.send(JSON.stringify({ type: 'CONNECTED' }))
  },

  async message(peer, message) {
    let data: { type: string; roomId?: string; token?: string; phrase?: string; letter?: string }
    try {
      data = JSON.parse(message.text())
    } catch {
      peer.send(JSON.stringify({ type: 'ERROR', message: 'JSON inválido' }))
      return
    }

    if (data.type === 'JOIN') {
      if (!data.token || !data.roomId) {
        peer.send(JSON.stringify({ type: 'ERROR', message: 'token y roomId requeridos' }))
        return
      }

      let payload: { userId: string; username: string; email: string }
      try {
        payload = await verifyToken(data.token)
      } catch {
        peer.send(JSON.stringify({ type: 'ERROR', message: 'Token inválido' }))
        return
      }

      const { roomId } = data
      const dbRoom = await prisma.gameRoom.findUnique({
        where: { id: roomId },
        include: { players: { include: { user: { select: { username: true } } } } },
      })

      if (!dbRoom) {
        peer.send(JSON.stringify({ type: 'ERROR', message: 'Sala no encontrada' }))
        return
      }

      const dbPlayer = dbRoom.players.find(p => p.userId === payload.userId)
      let slot = 0

      if (dbPlayer) {
        slot = dbPlayer.playerSlot
      } else {
        if (dbRoom.players.length >= MAX_PLAYERS) {
          peer.send(JSON.stringify({ type: 'ERROR', message: 'Sala llena' }))
          return
        }
        const used = new Set(dbRoom.players.map(p => p.playerSlot))
        while (used.has(slot)) slot++
        await prisma.gamePlayer.create({
          data: { roomId, userId: payload.userId, playerSlot: slot },
        })
      }

      const room = getOrCreateRoom(roomId)
      room.set(peer.id, { peer, userId: payload.userId, username: payload.username, slot })

      if (!gameRooms.has(roomId)) {
        gameRooms.set(roomId, {
          roomId,
          status: 'waiting',
          players: new Map(),
          setterUserId: null,
          phrase: null,
          masked: null,
          guessed: new Set(),
          remaining: MAX_ERRORS,
          wordCount: 0,
          winnerId: null,
          winnerUsername: null,
        })
      }

      const state = gameRooms.get(roomId)!
      state.players.set(payload.userId, { peer, userId: payload.userId, username: payload.username, slot })

      peer.send(JSON.stringify({ type: 'JOINED', roomId }))
      broadcastState(state)

      if (state.status === 'waiting' && state.players.size >= 2) {
        chooseSetter(state)
        state.status = 'choosing'
        broadcastState(state)
      }
      return
    }

    const roomId = [...rooms.entries()].find(([, r]) => r.has(peer.id))?.[0]
    if (!roomId) return

    const state = gameRooms.get(roomId)
    if (!state) return

    const roomPeer = rooms.get(roomId)?.get(peer.id)
    if (!roomPeer) return

    if (data.type === 'SET_PHRASE') {
      if (state.status !== 'choosing') return
      if (roomPeer.userId !== state.setterUserId) return

      const phraseInput = String(data.phrase ?? '')
      const phrase = normalizePhrase(phraseInput)
      if (phrase.length < 3 || phrase.length > 60) {
        peer.send(JSON.stringify({ type: 'ERROR', message: 'La frase debe tener entre 3 y 60 caracteres' }))
        return
      }

      state.phrase = phrase
      state.masked = maskPhrase(phrase)
      state.guessed = new Set()
      state.remaining = MAX_ERRORS
      state.wordCount = countWords(phrase)
      state.status = 'playing'
      state.winnerId = null
      state.winnerUsername = null
      broadcastState(state)
      return
    }

    if (data.type === 'GUESS_LETTER') {
      if (state.status !== 'playing' || !state.phrase || !state.masked) return
      if (roomPeer.userId === state.setterUserId) return

      const letterInput = String(data.letter ?? '').trim().toUpperCase()
      if (letterInput.length !== 1 || !isLetter(letterInput)) return

      if (state.guessed.has(letterInput)) return
      state.guessed.add(letterInput)

      if (state.phrase.includes(letterInput)) {
        const chars = state.masked.split('')
        for (let i = 0; i < state.phrase.length; i++) {
          if (state.phrase[i] === letterInput) chars[i] = letterInput
        }
        state.masked = chars.join('')
      } else {
        state.remaining = Math.max(0, state.remaining - 1)
      }

      if (!state.masked.includes('_')) {
        await endGame(state, roomPeer.userId)
        return
      }

      if (state.remaining <= 0) {
        await endGame(state, null)
        return
      }

      broadcastState(state)
      return
    }

    if (data.type === 'GUESS_PHRASE') {
      if (state.status !== 'playing' || !state.phrase || !state.masked) return
      if (roomPeer.userId === state.setterUserId) return

      const guess = normalizePhrase(String(data.phrase ?? ''))
      if (!guess) return

      if (guess === state.phrase) {
        state.masked = state.phrase
        await endGame(state, roomPeer.userId)
        return
      }

      state.remaining = Math.max(0, state.remaining - 1)
      if (state.remaining <= 0) {
        await endGame(state, null)
        return
      }

      broadcastState(state)
      return
    }
  },

  async close(peer) {
    for (const [roomId, room] of rooms) {
      if (!room.has(peer.id)) continue
      const rp = room.get(peer.id)!
      room.delete(peer.id)

      const state = gameRooms.get(roomId)
      if (state) {
        state.players.delete(rp.userId)
        if (state.setterUserId === rp.userId) {
          state.setterUserId = null
          if (state.status === 'choosing') {
            if (state.players.size >= 2) {
              chooseSetter(state)
            } else {
              state.status = 'waiting'
            }
          }
        }

        if (state.players.size === 0) {
          gameRooms.delete(roomId)
        } else {
          broadcastState(state)
        }
      }

      if (room.size === 0) rooms.delete(roomId)
      break
    }
  },
})
