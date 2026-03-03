import type { Peer } from 'crossws'
import { verifyToken } from '../utils/jwt'
import { broadcastToAll, getOrCreateRoom, rooms } from './rooms'
import prisma from '../utils/prisma'
import { RoomStatus } from '@prisma/client'

interface Segment { x: number; y: number }

interface SnakePlayer {
  peer: Peer
  userId: string
  username: string
  slot: 0 | 1
  segments: Segment[]
  dir: Segment
  nextDir: Segment
  alive: boolean
  score: number
}

interface RoomState {
  players: Map<string, SnakePlayer>
  food: Segment
  tick: number
  tickMs: number
  timer: ReturnType<typeof setInterval> | null
  status: 'waiting' | 'playing' | 'finished'
  roomId: string
}

const GRID = 20
const gameRooms = new Map<string, RoomState>()

function spawnFood(players: Map<string, SnakePlayer>): Segment {
  let pos: Segment
  const occupied = new Set<string>()
  for (const p of players.values()) {
    for (const s of p.segments) occupied.add(`${s.x},${s.y}`)
  }
  do {
    pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }
  } while (occupied.has(`${pos.x},${pos.y}`))
  return pos
}

function initPlayer(slot: 0 | 1, peer: Peer, userId: string, username: string): SnakePlayer {
  const startX = slot === 0 ? 3 : 16
  const dir = slot === 0 ? { x: 1, y: 0 } : { x: -1, y: 0 }
  return {
    peer,
    userId,
    username,
    slot,
    segments: [{ x: startX, y: 10 }, { x: startX - dir.x, y: 10 }, { x: startX - dir.x * 2, y: 10 }],
    dir,
    nextDir: { ...dir },
    alive: true,
    score: 0,
  }
}

function sendToPlayer(player: SnakePlayer, data: unknown): void {
  try { player.peer.send(JSON.stringify(data)) } catch { /* disconnected */ }
}

function broadcastState(state: RoomState): void {
  const snakes = Array.from(state.players.values()).map(p => ({
    slot: p.slot, username: p.username, color: p.slot === 0 ? '#39ff14' : '#00e5ff',
    segments: p.segments, alive: p.alive, score: p.score,
  }))
  broadcastToAll(state.roomId, { type: 'TICK', snakes, food: state.food, tick: state.tick })
}

async function endGame(state: RoomState, winner: 0 | 1 | null, reason: string): Promise<void> {
  if (state.timer) { clearInterval(state.timer); state.timer = null }
  state.status = 'finished'

  const scores: Record<number, number> = {}
  for (const p of state.players.values()) scores[p.slot] = p.score

  broadcastToAll(state.roomId, { type: 'GAME_OVER', winner, scores, reason })

  // Persist scores and update room
  await prisma.gameRoom.update({
    where: { id: state.roomId },
    data: { status: RoomStatus.FINISHED },
  }).catch(() => {/* ignore */})

  for (const p of state.players.values()) {
    if (p.score > 0) {
      await prisma.score.create({
        data: { userId: p.userId, game: 'SNAKE_VS_SNAKE', value: p.score },
      }).catch(() => {/* ignore */})
    }
  }
}

function gameTick(state: RoomState): void {
  if (state.status !== 'playing') return
  state.tick++

  const alivePlayers = Array.from(state.players.values()).filter(p => p.alive)
  if (alivePlayers.length === 0) { endGame(state, null, 'draw'); return }

  // Move all alive players
  for (const p of alivePlayers) {
    p.dir = { ...p.nextDir }
    const seg0 = p.segments[0]!
    const head = { x: seg0.x + p.dir.x, y: seg0.y + p.dir.y }
    p.segments.unshift(head)
  }

  // Check collisions
  const allSegments = Array.from(state.players.values())
    .filter(p => p.alive)
    .flatMap(p => p.segments.slice(1).map(s => ({ ...s, userId: p.userId })))

  for (const p of alivePlayers) {
    const head = p.segments[0]!
    // Wall collision
    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) { p.alive = false; continue }
    // Collision with any segment (own or other)
    const hit = allSegments.some(s => s.x === head.x && s.y === head.y)
    if (hit) { p.alive = false; continue }
    // Head-on collision check
    for (const other of alivePlayers) {
      const otherHead = other.segments[0]!
      if (other.userId !== p.userId && otherHead.x === head.x && otherHead.y === head.y) {
        p.alive = false
        other.alive = false
      }
    }
  }

  // Food collision (only for still-alive players)
  for (const p of alivePlayers) {
    if (!p.alive) continue
    const head = p.segments[0]!
    if (head.x === state.food.x && head.y === state.food.y) {
      p.score += 10
      // Increase speed
      state.tickMs = Math.max(60, state.tickMs - 5)
      state.food = spawnFood(state.players)
      // Don't pop tail (snake grows)
    } else {
      p.segments.pop()
    }
  }

  // Check win condition
  const stillAlive = Array.from(state.players.values()).filter(p => p.alive)
  if (stillAlive.length === 0) {
    broadcastState(state)
    endGame(state, null, 'draw')
  } else if (stillAlive.length === 1) {
    broadcastState(state)
    endGame(state, stillAlive[0]!.slot, 'elimination')
  } else {
    broadcastState(state)
  }
}

function startGame(state: RoomState): void {
  state.status = 'playing'
  state.tick = 0
  state.tickMs = 150
  state.food = spawnFood(state.players)

  const players = Array.from(state.players.values()).map(p => ({
    username: p.username, slot: p.slot, color: p.slot === 0 ? '#39ff14' : '#00e5ff',
  }))
  broadcastToAll(state.roomId, { type: 'ROOM_READY', players })

  state.timer = setInterval(() => gameTick(state), state.tickMs)
}

export default defineWebSocketHandler({
  async open(peer) {
    // Wait for JOIN message
    peer.send(JSON.stringify({ type: 'CONNECTED' }))
  },

  async message(peer, message) {
    let data: { type: string; roomId?: string; token?: string; x?: number; y?: number }
    try {
      data = JSON.parse(message.text())
    } catch {
      peer.send(JSON.stringify({ type: 'ERROR', code: 'INVALID_JSON', message: 'JSON inválido' }))
      return
    }

    if (data.type === 'JOIN') {
      if (!data.token || !data.roomId) {
        peer.send(JSON.stringify({ type: 'ERROR', code: 'MISSING_FIELDS', message: 'token y roomId requeridos' }))
        return
      }

      let payload: { userId: string; username: string; email: string }
      try {
        payload = await verifyToken(data.token)
      } catch {
        peer.send(JSON.stringify({ type: 'ERROR', code: 'INVALID_TOKEN', message: 'Token inválido' }))
        return
      }

      const { roomId } = data
      const dbRoom = await prisma.gameRoom.findUnique({
        where: { id: roomId },
        include: { players: { include: { user: { select: { username: true } } } } },
      })

      if (!dbRoom) {
        peer.send(JSON.stringify({ type: 'ERROR', code: 'ROOM_NOT_FOUND', message: 'Sala no encontrada' }))
        return
      }

      // Check if player is in the DB room
      const dbPlayer = dbRoom.players.find(p => p.userId === payload.userId)
      let slot: 0 | 1

      if (dbPlayer) {
        slot = dbPlayer.playerSlot as 0 | 1
      } else if (dbRoom.players.length < 2) {
        // Join as player 1
        await prisma.gamePlayer.create({
          data: { roomId, userId: payload.userId, playerSlot: 1 },
        })
        slot = 1
      } else {
        peer.send(JSON.stringify({ type: 'ERROR', code: 'ROOM_FULL', message: 'Sala llena' }))
        return
      }

      // Register in memory
      const room = getOrCreateRoom(roomId)
      room.set(peer.id, { peer, userId: payload.userId, username: payload.username, slot })

      if (!gameRooms.has(roomId)) {
        gameRooms.set(roomId, {
          players: new Map(), food: { x: 10, y: 10 }, tick: 0, tickMs: 150,
          timer: null, status: 'waiting', roomId,
        })
      }

      const state = gameRooms.get(roomId)!
      state.players.set(payload.userId, initPlayer(slot, peer, payload.userId, payload.username))

      peer.send(JSON.stringify({ type: 'JOINED', slot, roomId }))

      // Auto-start when 2 players joined
      if (state.players.size >= 2 && state.status === 'waiting') {
        startGame(state)
      }
      return
    }

    // All other messages need the player to be in a room
    const roomId = [...rooms.entries()].find(([, r]) => r.has(peer.id))?.[0]
    if (!roomId) return

    const state = gameRooms.get(roomId)
    if (!state || state.status !== 'playing') return

    const roomPeer = rooms.get(roomId)?.get(peer.id)
    if (!roomPeer) return

    const player = state.players.get(roomPeer.userId)
    if (!player || !player.alive) return

    if (data.type === 'DIR') {
      const nx = data.x ?? 0
      const ny = data.y ?? 0
      // Prevent reversing
      if (nx !== -player.dir.x || ny !== -player.dir.y) {
        player.nextDir = { x: nx, y: ny }
      }
    }
  },

  async close(peer) {
    // Find which room this peer was in
    for (const [roomId, room] of rooms) {
      if (room.has(peer.id)) {
        const rp = room.get(peer.id)!
        room.delete(peer.id)

        const state = gameRooms.get(roomId)
        if (state && state.status === 'playing') {
          const player = state.players.get(rp.userId)
          if (player) player.alive = false

          const stillAlive = Array.from(state.players.values()).filter(p => p.alive)
          if (stillAlive.length <= 1) {
            const winner = stillAlive[0]?.slot ?? null
            endGame(state, winner, 'disconnect')
          }
        }

        if (room.size === 0) {
          rooms.delete(roomId)
          gameRooms.delete(roomId)
        }
        break
      }
    }
  },
})
