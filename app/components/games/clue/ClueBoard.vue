<template>
  <div class="board-wrap">
    <svg
      viewBox="0 0 640 580"
      class="board-svg"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Background -->
      <rect width="640" height="580" fill="#0d0d0d" />

      <!-- Edges between adjacent rooms -->
      <g class="edges">
        <line v-for="edge in EDGES" :key="edge.key"
          :x1="ROOM_POSITIONS[edge.a]!.cx" :y1="ROOM_POSITIONS[edge.a]!.cy"
          :x2="ROOM_POSITIONS[edge.b]!.cx" :y2="ROOM_POSITIONS[edge.b]!.cy"
          stroke="#2a2a2a" stroke-width="2"
        />
      </g>

      <!-- Secret passages (dashed) -->
      <g class="passages">
        <line x1="80" y1="80" x2="80" y2="500" stroke="#ffe60033" stroke-width="1.5" stroke-dasharray="6,4" />
        <line x1="560" y1="80" x2="560" y2="500" stroke="#ffe60033" stroke-width="1.5" stroke-dasharray="6,4" />
      </g>

      <!-- Rooms -->
      <g v-for="(pos, id) in ROOM_POSITIONS" :key="id">
        <!-- Room background -->
        <rect
          :x="pos.x" :y="pos.y" :width="pos.w" :height="pos.h"
          :fill="currentRoom === id ? '#1a1500' : isAdjacent(id as RoomId) ? '#0d1f0d' : '#141414'"
          :stroke="currentRoom === id ? '#ffe600' : isAdjacent(id as RoomId) ? '#39ff14' : '#2a2a2a'"
          :stroke-width="currentRoom === id ? 2.5 : isAdjacent(id as RoomId) ? 2 : 1"
          rx="6"
          :class="{ clickable: isAdjacent(id as RoomId) }"
          @click="onRoomClick(id as RoomId)"
        />
        <!-- Adjacent room "click me" hint -->
        <text
          v-if="isAdjacent(id as RoomId)"
          :x="pos.cx" :y="pos.y + 10"
          text-anchor="middle"
          font-family="monospace"
          font-size="7"
          fill="#39ff1488"
        >▲ IR AQUÍ</text>

        <!-- Room label -->
        <text
          :x="pos.cx" :y="pos.cy - 8"
          text-anchor="middle"
          dominant-baseline="middle"
          font-family="'Press Start 2P', monospace"
          :font-size="pos.fontSize ?? 7"
          :fill="currentRoom === id ? '#ffe600' : isAdjacent(id as RoomId) ? '#39ff14' : '#888'"
        >{{ ROOM_LABELS[id as RoomId].split(' ')[0] }}</text>
        <text
          v-if="ROOM_LABELS[id as RoomId].split(' ').length > 1"
          :x="pos.cx" :y="pos.cy + 6"
          text-anchor="middle"
          dominant-baseline="middle"
          font-family="'Press Start 2P', monospace"
          :font-size="pos.fontSize ?? 7"
          :fill="currentRoom === id ? '#ffe600' : isAdjacent(id as RoomId) ? '#39ff14' : '#888'"
        >{{ ROOM_LABELS[id as RoomId].split(' ').slice(1).join(' ') }}</text>

        <!-- "YOU ARE HERE" indicator -->
        <text
          v-if="currentRoom === id"
          :x="pos.cx" :y="pos.cy + 20"
          text-anchor="middle"
          font-family="'Press Start 2P', monospace"
          font-size="5"
          fill="#ffe600"
        >★ TÚ</text>

        <!-- Players in this room -->
        <g v-for="(p, i) in playersInRoom(id as RoomId)" :key="p.userId" :opacity="p.connected === false ? 0.3 : 1">
          <!-- Larger ring for own player -->
          <circle
            v-if="p.userId === myUserId"
            :cx="pos.cx - 20 + i * 16"
            :cy="pos.cy + 38"
            r="9"
            fill="none"
            :stroke="PLAYER_COLORS[p.slot % PLAYER_COLORS.length]!"
            stroke-width="2"
          />
          <circle
            :cx="pos.cx - 20 + i * 16"
            :cy="pos.cy + 38"
            :r="p.userId === myUserId ? 6 : 5"
            :fill="PLAYER_COLORS[p.slot % PLAYER_COLORS.length]!"
            stroke="none"
          />
          <!-- Disconnected indicator -->
          <text
            v-if="p.connected === false"
            :x="pos.cx - 20 + i * 16"
            :y="pos.cy + 50"
            text-anchor="middle"
            font-size="7"
            fill="#ff2d78"
          >✕</text>
        </g>
      </g>

      <!-- Secret passage labels -->
      <text x="24" y="294" font-family="'Press Start 2P', monospace" font-size="5" fill="#ffe60055" transform="rotate(-90,24,294)">PASAJE SECRETO</text>
      <text x="616" y="294" font-family="'Press Start 2P', monospace" font-size="5" fill="#ffe60055" transform="rotate(90,616,294)">PASAJE SECRETO</text>
    </svg>

    <!-- Legend -->
    <div class="legend">
      <div v-for="(p, i) in players" :key="p.userId" class="legend-item">
        <span class="legend-dot" :style="{ background: PLAYER_COLORS[i % PLAYER_COLORS.length] }"></span>
        <span :style="{ color: p.userId === myUserId ? '#fff' : '#888' }">
          {{ p.username }}{{ p.userId === myUserId ? ' (TÚ)' : '' }}
        </span>
        <span class="legend-arrow">→</span>
        <span class="legend-room">{{ ROOM_LABELS[p.currentRoom] }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RoomId, CluePub } from '~/composables/useClueWs'

const props = defineProps<{
  currentRoom: RoomId | null
  players: CluePub[]
  myUserId: string | null
  phase: string
  isMyTurn: boolean
}>()

const emit = defineEmits<{ (e: 'move', room: RoomId): void }>()

const PLAYER_COLORS = ['#39ff14', '#00e5ff', '#ff2d78', '#ffe600', '#b000ff', '#ff8c00']

const ROOM_LABELS: Record<RoomId, string> = {
  study: 'ESTUDIO',
  library: 'BIBLIOTECA',
  billiard_room: 'BILLAR',
  kitchen: 'COCINA',
  ballroom: 'SALON',
  conservatory: 'JARDIN',
  hall: 'VESTIBULO',
  lounge: 'SALA',
  dining_room: 'COMEDOR',
}

interface RoomPos { x: number; y: number; w: number; h: number; cx: number; cy: number; fontSize?: number }

const ROOM_POSITIONS: Record<RoomId, RoomPos> = {
  study:         { x: 20,  y: 20,  w: 160, h: 110, cx: 100, cy: 75,  fontSize: 7 },
  library:       { x: 240, y: 20,  w: 160, h: 110, cx: 320, cy: 75,  fontSize: 7 },
  billiard_room: { x: 460, y: 20,  w: 160, h: 110, cx: 540, cy: 75,  fontSize: 7 },
  kitchen:       { x: 20,  y: 235, w: 160, h: 110, cx: 100, cy: 290, fontSize: 7 },
  ballroom:      { x: 240, y: 235, w: 160, h: 110, cx: 320, cy: 290, fontSize: 7 },
  conservatory:  { x: 460, y: 235, w: 160, h: 110, cx: 540, cy: 290, fontSize: 6 },
  hall:          { x: 20,  y: 450, w: 160, h: 110, cx: 100, cy: 505, fontSize: 7 },
  lounge:        { x: 240, y: 450, w: 160, h: 110, cx: 320, cy: 505, fontSize: 7 },
  dining_room:   { x: 460, y: 450, w: 160, h: 110, cx: 540, cy: 505, fontSize: 6 },
}

type EdgeDef = { key: string; a: RoomId; b: RoomId }

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

const EDGES = computed<EdgeDef[]>(() => {
  const seen = new Set<string>()
  const edges: EdgeDef[] = []
  for (const [a, neighbors] of Object.entries(ADJACENCY) as [RoomId, RoomId[]][]) {
    for (const b of neighbors) {
      const key = [a, b].sort().join('|')
      if (!seen.has(key)) { seen.add(key); edges.push({ key, a, b }) }
    }
  }
  return edges
})

function isAdjacent(room: RoomId): boolean {
  if (!props.isMyTurn || props.phase !== 'MOVE' || !props.currentRoom) return false
  return ADJACENCY[props.currentRoom]?.includes(room) ?? false
}

function playersInRoom(room: RoomId): CluePub[] {
  return props.players.filter(p => p.currentRoom === room)
}

function onRoomClick(room: RoomId): void {
  if (isAdjacent(room)) emit('move', room)
}
</script>

<style scoped>
.board-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.board-svg {
  width: 100%;
  max-width: 640px;
  height: auto;
  border: 1px solid #2a2a2a;
}

.clickable {
  cursor: pointer;
  transition: fill 0.15s;
}

.clickable:hover {
  fill: #2a3a2a !important;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
  font-family: var(--font-mono);
  font-size: 0.8rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.legend-arrow {
  color: var(--border);
  font-size: 0.7rem;
}

.legend-room {
  color: var(--neon-cyan);
  font-size: 0.7rem;
}
</style>
