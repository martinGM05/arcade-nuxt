import type { Peer } from 'crossws'

export interface RoomPeer {
  peer: Peer
  userId: string
  username: string
  slot: number
}

/** In-memory rooms: roomId → Map<peerId, RoomPeer> */
export const rooms = new Map<string, Map<string, RoomPeer>>()

export function getOrCreateRoom(roomId: string): Map<string, RoomPeer> {
  if (!rooms.has(roomId)) rooms.set(roomId, new Map())
  return rooms.get(roomId)!
}

export function broadcastToRoom(roomId: string, data: unknown, exclude?: string): void {
  const room = rooms.get(roomId)
  if (!room) return
  const msg = JSON.stringify(data)
  for (const [peerId, rp] of room) {
    if (exclude && peerId === exclude) continue
    try {
      rp.peer.send(msg)
    } catch {
      // peer disconnected
    }
  }
}

export function broadcastToAll(roomId: string, data: unknown): void {
  broadcastToRoom(roomId, data)
}
