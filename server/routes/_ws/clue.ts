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
  peer: Peer | null       // null = disconnected
  disconnectedAt: number | null
  userId: string
  username: string
  slot: number
  hand: CardId[]
  currentRoom: RoomId
  alive: boolean
}

interface Suggestion {
  byUserId: string
  suspect: SuspectId
  weapon: WeaponId
  room: RoomId
  disprovingSlot: number
  disproveOrder: string[]
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

const START_ROOMS: RoomId[] = ['study', 'kitchen', 'ballroom', 'conservatory', 'hall', 'dining_room']

const gameRooms = new Map<string, RoomState>()

// ─── Timers ───────────────────────────────────────────────────────────────────

const AFK_MS = 90_000        // 90 s to act before auto-skip
const RECONNECT_MS = 60_000  // 60 s to reconnect before elimination

const afkTimers = new Map<string, ReturnType<typeof setTimeout>>()
const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>() // key: `roomId:userId`

function startAfkTimer(state: RoomState): void {
  clearAfkTimer(state.roomId)
  const targetUserId = state.currentUserId
  const roomId = state.roomId
  afkTimers.set(roomId, setTimeout(() => {
    const s = gameRooms.get(roomId)
    if (!s || s.status !== 'playing' || s.currentUserId !== targetUserId) return
    broadcastToAll(roomId, { type: 'AFK_SKIP', userId: targetUserId, username: s.players.get(targetUserId)?.username ?? '' })
    advanceTurn(s)
  }, AFK_MS))
}

function clearAfkTimer(roomId: string): void {
  const t = afkTimers.get(roomId)
  if (t !== undefined) { clearTimeout(t); afkTimers.delete(roomId) }
}

function startReconnectTimer(state: RoomState, userId: string): void {
  const key = `${state.roomId}:${userId}`
  const existing = reconnectTimers.get(key)
  if (existing !== undefined) clearTimeout(existing)

  reconnectTimers.set(key, setTimeout(() => {
    reconnectTimers.delete(key)
    const s = gameRooms.get(state.roomId)
    if (!s || s.status !== 'playing') return
    const player = s.players.get(userId)
    if (!player || player.peer !== null) return  // already reconnected

    player.alive = false
    broadcastToAll(s.roomId, { type: 'PLAYER_ELIMINATED', userId, username: player.username, reason: 'disconnect_timeout' })

    const alive = Array.from(s.players.values()).filter(p => p.alive)
    if (alive.length === 0) {
      broadcastToAll(s.roomId, { type: 'GAME_OVER', winner: null, reason: 'all_eliminated' })
      s.status = 'finished'
      cleanupRoom(s.roomId)
      return
    }

    if (s.currentUserId === userId) {
      clearAfkTimer(s.roomId)
      advanceTurn(s)
    } else if (s.phase === 'DISPROVE') {
      const sg = s.pendingSuggestion
      if (sg && sg.disproveOrder[sg.disprovingSlot] === userId) {
        sg.disprovingSlot++
        askNextDisprover(s)
      }
    } else {
      broadcastGameState(s)
    }
  }, RECONNECT_MS))
}

function clearReconnectTimer(roomId: string, userId: string): void {
  const key = `${roomId}:${userId}`
  const t = reconnectTimers.get(key)
  if (t !== undefined) { clearTimeout(t); reconnectTimers.delete(key) }
}

function cleanupRoom(roomId: string): void {
  clearAfkTimer(roomId)
  for (const key of [...reconnectTimers.keys()]) {
    if (key.startsWith(`${roomId}:`)) {
      clearTimeout(reconnectTimers.get(key)!)
      reconnectTimers.delete(key)
    }
  }
  gameRooms.delete(roomId)
  rooms.delete(roomId)
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function persistState(state: RoomState): void {
  if (state.status !== 'playing') return
  const data = {
    players: Array.from(state.players.values()).map(p => ({
      userId: p.userId, username: p.username, slot: p.slot,
      hand: p.hand, currentRoom: p.currentRoom, alive: p.alive,
    })),
    solution: state.solution,
    publicCards: state.publicCards,
    currentUserId: state.currentUserId,
    phase: state.phase,
    pendingSuggestion: state.pendingSuggestion ?? null,
  }
  prisma.gameRoom.update({ where: { id: state.roomId }, data: { state: data } }).catch(() => {})
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]!; a[i] = a[j]!; a[j] = tmp
  }
  return a
}

function sendTo(player: CluePlayer, data: unknown): void {
  if (!player.peer) return
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
      connected: p.peer !== null,
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
  const list = Array.from(state.players.values()).sort((a, b) => a.slot - b.slot)
  const idx = list.findIndex(p => p.userId === state.currentUserId)
  for (let i = 1; i <= list.length; i++) {
    const c = list[(idx + i) % list.length]!
    if (c.alive) return c.userId
  }
  return null
}

// ─── Game logic ───────────────────────────────────────────────────────────────

function startGame(state: RoomState): void {
  state.status = 'playing'
  const suspects = shuffle(SUSPECTS)
  const weapons = shuffle(WEAPONS)
  const roomCards = shuffle(ROOMS)
  state.solution = { suspect: suspects[0]!, weapon: weapons[0]!, room: roomCards[0]! }

  const remaining = shuffle([...suspects.slice(1), ...weapons.slice(1), ...roomCards.slice(1)] as CardId[])
  const playerList = Array.from(state.players.values()).sort((a, b) => a.slot - b.slot)
  playerList.forEach((p, i) => { p.currentRoom = START_ROOMS[i % START_ROOMS.length]! })
  remaining.forEach((card, i) => { playerList[i % playerList.length]!.hand.push(card) })

  const dealable = playerList.length * Math.floor(remaining.length / playerList.length)
  state.publicCards = remaining.slice(dealable)
  state.currentUserId = playerList[0]!.userId
  state.phase = 'MOVE'

  broadcastGameState(state)
  broadcastToAll(state.roomId, { type: 'TURN_START', userId: state.currentUserId, phase: 'MOVE' })
  startAfkTimer(state)
  persistState(state)
}

function advanceTurn(state: RoomState): void {
  const next = nextAlivePlayer(state)
  if (!next) {
    broadcastToAll(state.roomId, { type: 'GAME_OVER', winner: null, reason: 'all_eliminated' })
    state.status = 'finished'
    cleanupRoom(state.roomId)
    return
  }
  state.currentUserId = next
  state.phase = 'MOVE'
  state.pendingSuggestion = null
  broadcastGameState(state)
  broadcastToAll(state.roomId, { type: 'TURN_START', userId: next, phase: 'MOVE' })
  startAfkTimer(state)
  persistState(state)
}

function handleMove(state: RoomState, player: CluePlayer, to: RoomId): void {
  if (state.currentUserId !== player.userId || state.phase !== 'MOVE') {
    sendTo(player, { type: 'ERROR', code: 'NOT_YOUR_TURN', message: 'No es tu turno para mover' })
    return
  }
  if (!ROOMS.includes(to) || !ADJACENCY[player.currentRoom].includes(to)) {
    sendTo(player, { type: 'ERROR', code: 'NOT_ADJACENT', message: 'Sala no adyacente' })
    return
  }
  clearAfkTimer(state.roomId)
  player.currentRoom = to
  state.phase = 'SUGGEST'
  broadcastToAll(state.roomId, { type: 'PLAYER_MOVED', userId: player.userId, username: player.username, to })
  broadcastGameState(state)
  startAfkTimer(state)
  persistState(state)
}

function handleSuggest(state: RoomState, player: CluePlayer, suspect: SuspectId, weapon: WeaponId): void {
  if (state.currentUserId !== player.userId || state.phase !== 'SUGGEST') {
    sendTo(player, { type: 'ERROR', code: 'NOT_YOUR_TURN', message: 'No es tu turno' })
    return
  }
  clearAfkTimer(state.roomId)
  const playerList = Array.from(state.players.values()).sort((a, b) => a.slot - b.slot)
  const myIdx = playerList.findIndex(p => p.userId === player.userId)
  const disproveOrder = Array.from({ length: playerList.length - 1 }, (_, i) =>
    playerList[(myIdx + i + 1) % playerList.length]!.userId,
  )
  state.pendingSuggestion = { byUserId: player.userId, suspect, weapon, room: player.currentRoom, disprovingSlot: 0, disproveOrder }
  state.phase = 'DISPROVE'
  broadcastToAll(state.roomId, { type: 'SUGGESTION_MADE', byUserId: player.userId, byUsername: player.username, suspect, weapon, room: player.currentRoom })
  persistState(state)
  askNextDisprover(state)
}

function askNextDisprover(state: RoomState): void {
  const sg = state.pendingSuggestion!
  if (sg.disprovingSlot >= sg.disproveOrder.length) {
    const suggester = state.players.get(sg.byUserId)!
    sendTo(suggester, { type: 'CANNOT_DISPROVE_ALL' })
    broadcastToAll(state.roomId, { type: 'CANNOT_DISPROVE', userId: 'all' })
    state.phase = 'ACCUSE_OR_PASS'
    broadcastGameState(state)
    startAfkTimer(state)
    return
  }
  const disproverId = sg.disproveOrder[sg.disprovingSlot]!
  const disprover = state.players.get(disproverId)!

  // Auto-skip disconnected players
  if (!disprover.peer) {
    broadcastToAll(state.roomId, { type: 'CANNOT_DISPROVE', userId: disproverId, username: disprover.username })
    sg.disprovingSlot++
    askNextDisprover(state)
    return
  }

  const matchingCards = disprover.hand.filter(c => c === sg.suspect || c === sg.weapon || c === sg.room)
  if (matchingCards.length > 0) {
    sendTo(disprover, { type: 'DISPROVE_REQUEST', suspect: sg.suspect, weapon: sg.weapon, room: sg.room, matchingCards })
    // AFK timer for the disprover
    const roomId = state.roomId
    clearAfkTimer(roomId)
    afkTimers.set(roomId, setTimeout(() => {
      const s = gameRooms.get(roomId)
      if (!s || s.phase !== 'DISPROVE') return
      const pending = s.pendingSuggestion
      if (!pending || pending.disproveOrder[pending.disprovingSlot] !== disproverId) return
      broadcastToAll(roomId, { type: 'AFK_SKIP', userId: disproverId, username: disprover.username })
      pending.disprovingSlot++
      askNextDisprover(s)
    }, AFK_MS))
  } else {
    sendTo(disprover, { type: 'CANNOT_DISPROVE', message: 'No tienes cartas coincidentes' })
    broadcastToAll(state.roomId, { type: 'CANNOT_DISPROVE', userId: disproverId, username: disprover.username })
    sg.disprovingSlot++
    askNextDisprover(state)
  }
}

function handleDisprove(state: RoomState, player: CluePlayer, card: CardId): void {
  const sg = state.pendingSuggestion
  if (!sg || state.phase !== 'DISPROVE') {
    sendTo(player, { type: 'ERROR', code: 'NO_SUGGESTION', message: 'No hay sugerencia activa' })
    return
  }
  if (player.userId !== sg.disproveOrder[sg.disprovingSlot]) {
    sendTo(player, { type: 'ERROR', code: 'NOT_YOUR_TURN_DISPROVE', message: 'No te toca refutar' })
    return
  }
  if (card !== sg.suspect && card !== sg.weapon && card !== sg.room) {
    sendTo(player, { type: 'ERROR', code: 'INVALID_CARD', message: 'Esa carta no refuta la sugerencia' })
    return
  }
  clearAfkTimer(state.roomId)
  sendTo(state.players.get(sg.byUserId)!, { type: 'DISPROVE_RESULT', disproverId: player.userId, disproverUsername: player.username, card })
  broadcastToAll(state.roomId, { type: 'DISPROVE_RESULT_PUBLIC', disproverId: player.userId, disproverUsername: player.username })
  state.phase = 'ACCUSE_OR_PASS'
  broadcastGameState(state)
  startAfkTimer(state)
  persistState(state)
}

function handleCannotDisprove(state: RoomState, player: CluePlayer): void {
  const sg = state.pendingSuggestion
  if (!sg || state.phase !== 'DISPROVE') return
  if (player.userId !== sg.disproveOrder[sg.disprovingSlot]) return
  clearAfkTimer(state.roomId)
  broadcastToAll(state.roomId, { type: 'CANNOT_DISPROVE', userId: player.userId, username: player.username })
  sg.disprovingSlot++
  askNextDisprover(state)
}

function handleAccuse(state: RoomState, player: CluePlayer, suspect: SuspectId, weapon: WeaponId, room: RoomId): void {
  if (state.currentUserId !== player.userId) {
    sendTo(player, { type: 'ERROR', code: 'NOT_YOUR_TURN', message: 'No es tu turno' })
    return
  }
  clearAfkTimer(state.roomId)
  const correct = suspect === state.solution.suspect && weapon === state.solution.weapon && room === state.solution.room
  broadcastToAll(state.roomId, { type: 'ACCUSATION_RESULT', userId: player.userId, username: player.username, correct, ...(correct ? { solution: state.solution } : {}) })
  if (correct) {
    broadcastToAll(state.roomId, { type: 'GAME_OVER', winner: player.userId, winnerUsername: player.username, solution: state.solution })
    state.status = 'finished'
    finishRoom(state, player.userId)
    cleanupRoom(state.roomId)
  } else {
    player.alive = false
    const alive = Array.from(state.players.values()).filter(p => p.alive)
    if (alive.length === 0) {
      broadcastToAll(state.roomId, { type: 'GAME_OVER', winner: null, solution: state.solution })
      state.status = 'finished'
      finishRoom(state, null)
      cleanupRoom(state.roomId)
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
      data: { userId: winnerId, gameId: (await prisma.game.findUniqueOrThrow({ where: { key: 'CLUE' } })).id, value: 1 },
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
    try { data = JSON.parse(message.text()) as Record<string, unknown> }
    catch { peer.send(JSON.stringify({ type: 'ERROR', code: 'INVALID_JSON' })); return }

    const type = data['type'] as string

    // ── JOIN / REJOIN ──────────────────────────────────────────────────────────
    if (type === 'JOIN') {
      const token = data['token'] as string | undefined
      const roomId = data['roomId'] as string | undefined
      if (!token || !roomId) { peer.send(JSON.stringify({ type: 'ERROR', code: 'MISSING_FIELDS' })); return }

      let payload: { userId: string; username: string; email: string }
      try { payload = await verifyToken(token) }
      catch { peer.send(JSON.stringify({ type: 'ERROR', code: 'INVALID_TOKEN' })); return }

      const dbRoom = await prisma.gameRoom.findUnique({ where: { id: roomId }, include: { players: true } })
      if (!dbRoom) { peer.send(JSON.stringify({ type: 'ERROR', code: 'ROOM_NOT_FOUND' })); return }

      let dbPlayer = dbRoom.players.find(p => p.userId === payload.userId)
      let slot: number
      if (dbPlayer) {
        slot = dbPlayer.playerSlot
      } else if (dbRoom.players.length < 6) {
        slot = dbRoom.players.length
        dbPlayer = await prisma.gamePlayer.create({ data: { roomId, userId: payload.userId, playerSlot: slot } })
      } else {
        peer.send(JSON.stringify({ type: 'ERROR', code: 'ROOM_FULL' })); return
      }

      const wsRoom = getOrCreateRoom(roomId)
      wsRoom.set(peer.id, { peer, userId: payload.userId, username: payload.username, slot })

      // ── Case 1: reconnecting to an active in-memory game ──────────────────
      const existing = gameRooms.get(roomId)
      if (existing && existing.status === 'playing') {
        const ep = existing.players.get(payload.userId)
        if (ep) {
          ep.peer = peer
          ep.disconnectedAt = null
          clearReconnectTimer(roomId, payload.userId)
          peer.send(JSON.stringify({ type: 'REJOINED', slot, roomId }))
          broadcastToAll(roomId, { type: 'PLAYER_RECONNECTED', userId: payload.userId, username: payload.username })
          broadcastGameState(existing)
          return
        }
      }

      // ── Case 2: game active in DB but not in memory (server restart) ──────
      if (dbRoom.status === 'PLAYING' && !existing) {
        const saved = dbRoom.state as Record<string, unknown> | null
        type SavedPlayer = { userId: string; username: string; slot: number; hand: CardId[]; currentRoom: RoomId; alive: boolean }
        if (saved && Array.isArray(saved['players'])) {
          const restoredState: RoomState = {
            roomId,
            status: 'playing',
            solution: saved['solution'] as RoomState['solution'],
            publicCards: saved['publicCards'] as CardId[],
            currentUserId: saved['currentUserId'] as string,
            phase: saved['phase'] as TurnPhase,
            pendingSuggestion: saved['pendingSuggestion'] as Suggestion | null,
            players: new Map((saved['players'] as SavedPlayer[]).map(p => [p.userId, {
              peer: null, disconnectedAt: Date.now(),
              userId: p.userId, username: p.username, slot: p.slot,
              hand: p.hand, currentRoom: p.currentRoom, alive: p.alive,
            }])),
          }
          gameRooms.set(roomId, restoredState)
          // Reconnect this player, start timers for the rest
          const rp = restoredState.players.get(payload.userId)
          if (rp) { rp.peer = peer; rp.disconnectedAt = null }
          for (const p of restoredState.players.values()) {
            if (p.userId !== payload.userId) startReconnectTimer(restoredState, p.userId)
          }
          peer.send(JSON.stringify({ type: 'REJOINED', slot, roomId }))
          broadcastGameState(restoredState)
          startAfkTimer(restoredState)
          return
        }
      }

      // ── Case 3: normal join to waiting room ───────────────────────────────
      if (!gameRooms.has(roomId)) {
        gameRooms.set(roomId, {
          roomId, players: new Map(),
          solution: { suspect: 'scarlett', weapon: 'knife', room: 'study' },
          publicCards: [], currentUserId: '', phase: 'WAITING', pendingSuggestion: null, status: 'waiting',
        })
      }
      const state = gameRooms.get(roomId)!
      state.players.set(payload.userId, {
        peer, disconnectedAt: null,
        userId: payload.userId, username: payload.username, slot,
        hand: [], currentRoom: START_ROOMS[slot % START_ROOMS.length]!, alive: true,
      })
      peer.send(JSON.stringify({ type: 'JOINED', slot, roomId }))
      broadcastToAll(roomId, { type: 'PLAYER_JOINED', userId: payload.userId, username: payload.username, slot, playerCount: state.players.size })
      broadcastGameState(state)
      return
    }

    // ── All other messages: resolve room + player ──────────────────────────────
    const roomId = [...rooms.entries()].find(([, r]) => r.has(peer.id))?.[0]
    if (!roomId) return
    const state = gameRooms.get(roomId)
    if (!state) return
    const rp = rooms.get(roomId)?.get(peer.id)
    if (!rp) return
    const player = state.players.get(rp.userId)
    if (!player) return

    if (type === 'READY') {
      if (state.status !== 'waiting') return
      if (state.players.size >= 3) {
        startGame(state)
        prisma.gameRoom.update({ where: { id: roomId }, data: { status: RoomStatus.PLAYING } }).catch(() => {})
      } else {
        peer.send(JSON.stringify({ type: 'ERROR', code: 'NOT_ENOUGH_PLAYERS', message: 'Se necesitan al menos 3 jugadores' }))
      }
    }
    else if (type === 'MOVE')    { handleMove(state, player, data['to'] as RoomId) }
    else if (type === 'SUGGEST') { handleSuggest(state, player, data['suspect'] as SuspectId, data['weapon'] as WeaponId) }
    else if (type === 'PASS_SUGGEST') {
      if (state.currentUserId !== player.userId || state.phase !== 'SUGGEST') return
      clearAfkTimer(roomId)
      state.phase = 'ACCUSE_OR_PASS'
      broadcastGameState(state)
      startAfkTimer(state)
    }
    else if (type === 'DISPROVE')        { handleDisprove(state, player, data['card'] as CardId) }
    else if (type === 'CANNOT_DISPROVE') { handleCannotDisprove(state, player) }
    else if (type === 'ACCUSE')          { handleAccuse(state, player, data['suspect'] as SuspectId, data['weapon'] as WeaponId, data['room'] as RoomId) }
    else if (type === 'END_TURN') {
      if (state.currentUserId !== player.userId || state.phase !== 'ACCUSE_OR_PASS') return
      clearAfkTimer(roomId)
      advanceTurn(state)
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
        if (player) { player.peer = null; player.disconnectedAt = Date.now() }
        broadcastToAll(roomId, { type: 'PLAYER_DISCONNECTED', userId: rp.userId, username: rp.username })
        broadcastGameState(state)
        startReconnectTimer(state, rp.userId)
      } else if (state?.status === 'waiting') {
        state.players.delete(rp.userId)
        broadcastToAll(roomId, { type: 'PLAYER_DISCONNECTED', userId: rp.userId, username: rp.username })
        broadcastGameState(state)
        if (wsRoom.size === 0) { gameRooms.delete(roomId); rooms.delete(roomId) }
      }
      break
    }
  },
})
