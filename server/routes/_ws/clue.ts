import type { Peer } from 'crossws'
import { verifyToken } from '../../utils/jwt'
import { getOrCreateRoom, broadcastToAll, rooms } from '../../ws/rooms'
import prisma from '../../utils/prisma'
import { RoomStatus } from '@prisma/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SuspectId = 'scarlett' | 'mustard' | 'white' | 'green' | 'peacock' | 'plum'
export type WeaponId = 'candlestick' | 'knife' | 'lead_pipe' | 'revolver' | 'rope' | 'wrench'
export type RoomId =
  | 'study' | 'library' | 'billiard_room'
  | 'kitchen' | 'ballroom' | 'conservatory'
  | 'hall' | 'lounge' | 'dining_room'

export type CardId = SuspectId | WeaponId | RoomId

type TurnPhase = 'MOVE' | 'SUGGEST' | 'DISPROVE' | 'ACCUSE_OR_PASS' | 'WAITING'

interface CluePlayer {
  peer: Peer
  userId: string
  username: string
  slot: number
  hand: CardId[]
  currentRoom: RoomId
  alive: boolean // not falsely accused
}

interface Suggestion {
  byUserId: string
  suspect: SuspectId
  weapon: WeaponId
  room: RoomId
  disprovingSlot: number   // next player to disprove
  disproveOrder: string[]  // userId order
}

interface RoomState {
  roomId: string
  players: Map<string, CluePlayer>
  solution: { suspect: SuspectId; weapon: WeaponId; room: RoomId }
  publicCards: CardId[]
  currentUserId: string
  phase: TurnPhase
  pendingSuggestion: Suggestion | null
  status: 'waiting' | 'playing' | 'finished'
}

// ─── Static data ──────────────────────────────────────────────────────────────

const SUSPECTS: SuspectId[] = ['scarlett', 'mustard', 'white', 'green', 'peacock', 'plum']
const WEAPONS: WeaponId[] = ['candlestick', 'knife', 'lead_pipe', 'revolver', 'rope', 'wrench']
const ROOMS: RoomId[] = [
  'study', 'library', 'billiard_room',
  'kitchen', 'ballroom', 'conservatory',
  'hall', 'lounge', 'dining_room',
]

const ALL_CARDS: CardId[] = [...SUSPECTS, ...WEAPONS, ...ROOMS]

// Adjacency graph — 3×3 grid (left col: study/kitchen/hall, mid: library/ballroom/lounge, right: billiard/conservatory/dining)
const ADJACENCY: Record<RoomId, RoomId[]> = {
  study:         ['library', 'kitchen'],
  library:       ['study', 'billiard_room', 'ballroom'],
  billiard_room: ['library', 'conservatory'],
  kitchen:       ['study', 'ballroom', 'hall'],
  ballroom:      ['kitchen', 'library', 'conservatory', 'lounge'],
  conservatory:  ['billiard_room', 'ballroom', 'dining_room'],
  hall:          ['kitchen', 'lounge'],
  lounge:        ['hall', 'ballroom', 'dining_room'],
  dining_room:   ['conservatory', 'lounge'],
}

const START_ROOMS: RoomId[] = [
  'study', 'kitchen', 'ballroom',
  'conservatory', 'hall', 'dining_room',
]

const gameRooms = new Map<string, RoomState>()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]!
    a[i] = a[j]!
    a[j] = tmp
  }
  return a
}

function sendTo(player: CluePlayer, data: unknown): void {
  try { player.peer.send(JSON.stringify(data)) } catch { /* disconnected */ }
}

function buildPublicState(state: RoomState, forUserId: string) {
  const me = state.players.get(forUserId)
  return {
    players: Array.from(state.players.values()).map(p => ({
      userId: p.userId,
      username: p.username,
      slot: p.slot,
      currentRoom: p.currentRoom,
      alive: p.alive,
      cardCount: p.hand.length,
    })),
    currentUserId: state.currentUserId,
    phase: state.phase,
    publicCards: state.publicCards,
    myHand: me?.hand ?? [],
    pendingSuggestion: state.pendingSuggestion ? {
      byUserId: state.pendingSuggestion.byUserId,
      suspect: state.pendingSuggestion.suspect,
      weapon: state.pendingSuggestion.weapon,
      room: state.pendingSuggestion.room,
    } : null,
  }
}

function broadcastGameState(state: RoomState): void {
  for (const player of state.players.values()) {
    sendTo(player, { type: 'GAME_STATE', ...buildPublicState(state, player.userId) })
  }
}

function nextAlivePlayer(state: RoomState): string | null {
  const playerList = Array.from(state.players.values()).sort((a, b) => a.slot - b.slot)
  const currentIdx = playerList.findIndex(p => p.userId === state.currentUserId)
  for (let i = 1; i <= playerList.length; i++) {
    const candidate = playerList[(currentIdx + i) % playerList.length]!
    if (candidate.alive) return candidate.userId
  }
  return null
}

function startGame(state: RoomState): void {
  state.status = 'playing'

  const suspects = shuffle(SUSPECTS)
  const weapons = shuffle(WEAPONS)
  const roomCards = shuffle(ROOMS)
  state.solution = {
    suspect: suspects[0]!,
    weapon: weapons[0]!,
    room: roomCards[0]!,
  }

  const remaining = shuffle([
    ...suspects.slice(1),
    ...weapons.slice(1),
    ...roomCards.slice(1),
  ] as CardId[])

  const playerList = Array.from(state.players.values()).sort((a, b) => a.slot - b.slot)
  playerList.forEach((p, i) => {
    p.currentRoom = START_ROOMS[i % START_ROOMS.length]!
  })

  remaining.forEach((card, i) => {
    const player = playerList[i % playerList.length]!
    player.hand.push(card)
  })

  const totalDealable = playerList.length * Math.floor(remaining.length / playerList.length)
  state.publicCards = remaining.slice(totalDealable)

  state.currentUserId = playerList[0]!.userId
  state.phase = 'MOVE'

  broadcastGameState(state)
  broadcastToAll(state.roomId, {
    type: 'TURN_START',
    userId: state.currentUserId,
    phase: 'MOVE',
  })
}

function advanceTurn(state: RoomState): void {
  const next = nextAlivePlayer(state)
  if (!next) {
    broadcastToAll(state.roomId, { type: 'GAME_OVER', winner: null, reason: 'all_eliminated' })
    state.status = 'finished'
    return
  }
  state.currentUserId = next
  state.phase = 'MOVE'
  state.pendingSuggestion = null
  broadcastGameState(state)
  broadcastToAll(state.roomId, { type: 'TURN_START', userId: next, phase: 'MOVE' })
}

// ─── Message handlers ──────────────────────────────────────────────────────────

function handleMove(state: RoomState, player: CluePlayer, to: RoomId): void {
  if (state.currentUserId !== player.userId || state.phase !== 'MOVE') {
    sendTo(player, { type: 'ERROR', code: 'NOT_YOUR_TURN', message: 'No es tu turno para mover' })
    return
  }
  if (!ROOMS.includes(to)) {
    sendTo(player, { type: 'ERROR', code: 'INVALID_ROOM', message: 'Sala inválida' })
    return
  }
  const adj = ADJACENCY[player.currentRoom]
  if (!adj.includes(to)) {
    sendTo(player, { type: 'ERROR', code: 'NOT_ADJACENT', message: 'Sala no adyacente' })
    return
  }
  player.currentRoom = to
  state.phase = 'SUGGEST'
  broadcastToAll(state.roomId, {
    type: 'PLAYER_MOVED',
    userId: player.userId,
    username: player.username,
    to,
  })
  broadcastGameState(state)
}

function handleSuggest(
  state: RoomState, player: CluePlayer,
  suspect: SuspectId, weapon: WeaponId,
): void {
  if (state.currentUserId !== player.userId || state.phase !== 'SUGGEST') {
    sendTo(player, { type: 'ERROR', code: 'NOT_YOUR_TURN', message: 'No es tu turno' })
    return
  }

  const room = player.currentRoom
  const playerList = Array.from(state.players.values()).sort((a, b) => a.slot - b.slot)

  const myIdx = playerList.findIndex(p => p.userId === player.userId)
  const disproveOrder: string[] = []
  for (let i = 1; i < playerList.length; i++) {
    const candidate = playerList[(myIdx + i) % playerList.length]!
    disproveOrder.push(candidate.userId)
  }

  state.pendingSuggestion = {
    byUserId: player.userId,
    suspect,
    weapon,
    room,
    disprovingSlot: 0,
    disproveOrder,
  }
  state.phase = 'DISPROVE'

  broadcastToAll(state.roomId, {
    type: 'SUGGESTION_MADE',
    byUserId: player.userId,
    byUsername: player.username,
    suspect,
    weapon,
    room,
  })

  askNextDisprover(state)
}

function askNextDisprover(state: RoomState): void {
  const suggestion = state.pendingSuggestion!
  if (suggestion.disprovingSlot >= suggestion.disproveOrder.length) {
    const suggester = state.players.get(suggestion.byUserId)!
    sendTo(suggester, { type: 'CANNOT_DISPROVE_ALL' })
    broadcastToAll(state.roomId, { type: 'CANNOT_DISPROVE', userId: 'all' })
    state.phase = 'ACCUSE_OR_PASS'
    broadcastGameState(state)
    return
  }

  const disproverId = suggestion.disproveOrder[suggestion.disprovingSlot]!
  const disprover = state.players.get(disproverId)!

  const matchingCards = disprover.hand.filter(
    c => c === suggestion.suspect || c === suggestion.weapon || c === suggestion.room,
  )

  if (matchingCards.length > 0) {
    sendTo(disprover, {
      type: 'DISPROVE_REQUEST',
      suspect: suggestion.suspect,
      weapon: suggestion.weapon,
      room: suggestion.room,
      matchingCards,
    })
  } else {
    sendTo(disprover, { type: 'CANNOT_DISPROVE', message: 'No tienes cartas coincidentes' })
    broadcastToAll(state.roomId, {
      type: 'CANNOT_DISPROVE',
      userId: disproverId,
      username: disprover.username,
    })
    suggestion.disprovingSlot++
    askNextDisprover(state)
  }
}

function handleDisprove(state: RoomState, player: CluePlayer, card: CardId): void {
  const suggestion = state.pendingSuggestion
  if (!suggestion || state.phase !== 'DISPROVE') {
    sendTo(player, { type: 'ERROR', code: 'NO_SUGGESTION', message: 'No hay sugerencia activa' })
    return
  }
  const expectedId = suggestion.disproveOrder[suggestion.disprovingSlot]
  if (player.userId !== expectedId) {
    sendTo(player, { type: 'ERROR', code: 'NOT_YOUR_TURN_DISPROVE', message: 'No te toca refutar' })
    return
  }
  if (card !== suggestion.suspect && card !== suggestion.weapon && card !== suggestion.room) {
    sendTo(player, { type: 'ERROR', code: 'INVALID_CARD', message: 'Esa carta no refuta la sugerencia' })
    return
  }

  const suggester = state.players.get(suggestion.byUserId)!
  sendTo(suggester, {
    type: 'DISPROVE_RESULT',
    disproverId: player.userId,
    disproverUsername: player.username,
    card,
  })

  broadcastToAll(state.roomId, {
    type: 'DISPROVE_RESULT_PUBLIC',
    disproverId: player.userId,
    disproverUsername: player.username,
  })

  state.phase = 'ACCUSE_OR_PASS'
  broadcastGameState(state)
}

function handleCannotDisprove(state: RoomState, player: CluePlayer): void {
  const suggestion = state.pendingSuggestion
  if (!suggestion || state.phase !== 'DISPROVE') return
  if (player.userId !== suggestion.disproveOrder[suggestion.disprovingSlot]) return

  broadcastToAll(state.roomId, {
    type: 'CANNOT_DISPROVE',
    userId: player.userId,
    username: player.username,
  })
  suggestion.disprovingSlot++
  askNextDisprover(state)
}

function handleAccuse(
  state: RoomState, player: CluePlayer,
  suspect: SuspectId, weapon: WeaponId, room: RoomId,
): void {
  if (state.currentUserId !== player.userId) {
    sendTo(player, { type: 'ERROR', code: 'NOT_YOUR_TURN', message: 'No es tu turno' })
    return
  }

  const correct =
    suspect === state.solution.suspect &&
    weapon === state.solution.weapon &&
    room === state.solution.room

  if (correct) {
    broadcastToAll(state.roomId, {
      type: 'ACCUSATION_RESULT',
      userId: player.userId,
      username: player.username,
      correct: true,
      solution: state.solution,
    })
    broadcastToAll(state.roomId, {
      type: 'GAME_OVER',
      winner: player.userId,
      winnerUsername: player.username,
      solution: state.solution,
    })
    state.status = 'finished'
    void finishRoom(state, player.userId)
  } else {
    player.alive = false
    broadcastToAll(state.roomId, {
      type: 'ACCUSATION_RESULT',
      userId: player.userId,
      username: player.username,
      correct: false,
    })

    const alivePlayers = Array.from(state.players.values()).filter(p => p.alive)
    if (alivePlayers.length === 0) {
      broadcastToAll(state.roomId, { type: 'GAME_OVER', winner: null, solution: state.solution })
      state.status = 'finished'
      void finishRoom(state, null)
    } else {
      advanceTurn(state)
    }
  }
}

async function finishRoom(state: RoomState, winnerId: string | null): Promise<void> {
  await prisma.gameRoom.update({
    where: { id: state.roomId },
    data: { status: RoomStatus.FINISHED },
  }).catch(() => {/* ignore */})

  if (winnerId) {
    await prisma.score.create({
      data: { userId: winnerId, game: 'CLUE', value: 1 },
    }).catch(() => {/* ignore */})
  }
}

// ─── WebSocket handler ────────────────────────────────────────────────────────

export default defineWebSocketHandler({
  async open(peer) {
    peer.send(JSON.stringify({ type: 'CONNECTED' }))
  },

  async message(peer, message) {
    let data: Record<string, unknown>
    try {
      data = JSON.parse(message.text()) as Record<string, unknown>
    } catch {
      peer.send(JSON.stringify({ type: 'ERROR', code: 'INVALID_JSON' }))
      return
    }

    const type = data['type'] as string

    if (type === 'JOIN') {
      const token = data['token'] as string | undefined
      const roomId = data['roomId'] as string | undefined

      if (!token || !roomId) {
        peer.send(JSON.stringify({ type: 'ERROR', code: 'MISSING_FIELDS' }))
        return
      }

      let payload: { userId: string; username: string; email: string }
      try { payload = await verifyToken(token) }
      catch {
        peer.send(JSON.stringify({ type: 'ERROR', code: 'INVALID_TOKEN' }))
        return
      }

      const dbRoom = await prisma.gameRoom.findUnique({
        where: { id: roomId },
        include: { players: true },
      })
      if (!dbRoom) {
        peer.send(JSON.stringify({ type: 'ERROR', code: 'ROOM_NOT_FOUND' }))
        return
      }

      let dbPlayer = dbRoom.players.find(p => p.userId === payload.userId)
      let slot: number

      if (dbPlayer) {
        slot = dbPlayer.playerSlot
      } else if (dbRoom.players.length < 6) {
        slot = dbRoom.players.length
        dbPlayer = await prisma.gamePlayer.create({
          data: { roomId, userId: payload.userId, playerSlot: slot },
        })
      } else {
        peer.send(JSON.stringify({ type: 'ERROR', code: 'ROOM_FULL' }))
        return
      }

      const wsRoom = getOrCreateRoom(roomId)
      wsRoom.set(peer.id, { peer, userId: payload.userId, username: payload.username, slot })

      if (!gameRooms.has(roomId)) {
        gameRooms.set(roomId, {
          roomId,
          players: new Map(),
          solution: { suspect: 'scarlett', weapon: 'knife', room: 'study' },
          publicCards: [],
          currentUserId: '',
          phase: 'WAITING',
          pendingSuggestion: null,
          status: 'waiting',
        })
      }

      const state = gameRooms.get(roomId)!
      state.players.set(payload.userId, {
        peer,
        userId: payload.userId,
        username: payload.username,
        slot,
        hand: [],
        currentRoom: START_ROOMS[slot % START_ROOMS.length]!,
        alive: true,
      })

      peer.send(JSON.stringify({ type: 'JOINED', slot, roomId }))
      broadcastToAll(roomId, {
        type: 'PLAYER_JOINED',
        userId: payload.userId,
        username: payload.username,
        slot,
        playerCount: state.players.size,
      })
      // Send current waiting state so every client shows the updated player list
      broadcastGameState(state)
      return
    }

    // All other messages: find state
    const roomId = [...rooms.entries()].find(([, r]) => r.has(peer.id))?.[0]
    if (!roomId) return
    const state = gameRooms.get(roomId)
    if (!state) return

    const wsRoom = rooms.get(roomId)
    const rp = wsRoom?.get(peer.id)
    if (!rp) return
    const player = state.players.get(rp.userId)
    if (!player) return

    if (type === 'READY') {
      if (state.status !== 'waiting') return
      if (state.players.size >= 3) {
        startGame(state)
        await prisma.gameRoom.update({
          where: { id: roomId },
          data: { status: RoomStatus.PLAYING },
        }).catch(() => {/* ignore */})
      } else {
        peer.send(JSON.stringify({ type: 'ERROR', code: 'NOT_ENOUGH_PLAYERS', message: 'Se necesitan al menos 3 jugadores' }))
      }
    }

    else if (type === 'MOVE') {
      handleMove(state, player, data['to'] as RoomId)
    }

    else if (type === 'SUGGEST') {
      handleSuggest(state, player, data['suspect'] as SuspectId, data['weapon'] as WeaponId)
    }

    else if (type === 'PASS_SUGGEST') {
      if (state.currentUserId !== player.userId || state.phase !== 'SUGGEST') return
      state.phase = 'ACCUSE_OR_PASS'
      broadcastGameState(state)
    }

    else if (type === 'DISPROVE') {
      handleDisprove(state, player, data['card'] as CardId)
    }

    else if (type === 'CANNOT_DISPROVE') {
      handleCannotDisprove(state, player)
    }

    else if (type === 'ACCUSE') {
      handleAccuse(
        state, player,
        data['suspect'] as SuspectId,
        data['weapon'] as WeaponId,
        data['room'] as RoomId,
      )
    }

    else if (type === 'END_TURN') {
      if (state.currentUserId !== player.userId) return
      if (state.phase === 'ACCUSE_OR_PASS') advanceTurn(state)
    }
  },

  async close(peer) {
    for (const [roomId, wsRoom] of rooms) {
      if (!wsRoom.has(peer.id)) continue
      const rp = wsRoom.get(peer.id)!
      wsRoom.delete(peer.id)

      const state = gameRooms.get(roomId)
      if (state?.status === 'playing') {
        const player = state.players.get(rp.userId)
        if (player) player.alive = false

        broadcastToAll(roomId, {
          type: 'PLAYER_DISCONNECTED',
          userId: rp.userId,
          username: rp.username,
        })

        const alivePlayers = Array.from(state.players.values()).filter(p => p.alive)
        if (alivePlayers.length < 2 && state.status === 'playing') {
          const winner = alivePlayers[0] ?? null
          broadcastToAll(roomId, {
            type: 'GAME_OVER',
            winner: winner?.userId ?? null,
            winnerUsername: winner?.username ?? null,
            reason: 'disconnect',
            solution: state.solution,
          })
          state.status = 'finished'
          void finishRoom(state, winner?.userId ?? null)
        }
      }

      if (wsRoom.size === 0) {
        rooms.delete(roomId)
        gameRooms.delete(roomId)
      }
      break
    }
  },
})
