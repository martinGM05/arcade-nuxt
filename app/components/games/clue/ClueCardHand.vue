<template>
  <div class="hand">
    <h3 class="hand-title">TU MANO ({{ cards.length }} cartas)</h3>
    <div class="cards-row">
      <div
        v-for="card in cards"
        :key="card"
        class="card"
        :class="[cardType(card), { selectable: selectable && !(selected ?? []).includes(card), chosen: (selected ?? []).includes(card) }]"
        @click="onCardClick(card)"
      >
        <span class="card-icon">{{ cardIcon(card) }}</span>
        <span class="card-label">{{ cardLabel(card) }}</span>
      </div>
    </div>
    <div v-if="publicCards.length > 0" class="public-section">
      <h4 class="public-title">CARTAS PÚBLICAS</h4>
      <div class="cards-row">
        <div v-for="card in publicCards" :key="card" class="card public" :class="cardType(card)">
          <span class="card-icon">{{ cardIcon(card) }}</span>
          <span class="card-label">{{ cardLabel(card) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CardId } from '~/composables/useClueWs'

const props = defineProps<{
  cards: CardId[]
  publicCards: CardId[]
  selectable?: boolean
  selected?: CardId[]
}>()

const emit = defineEmits<{ (e: 'select', card: CardId): void }>()

const SUSPECT_LABELS: Record<string, string> = {
  scarlett: 'Sra. Escarlata',
  mustard: 'Col. Mostaza',
  white: 'Srta. Blanco',
  green: 'Rev. Verde',
  peacock: 'Sra. Pavo Real',
  plum: 'Prof. Ciruela',
}

const WEAPON_LABELS: Record<string, string> = {
  candlestick: 'Candelabro',
  knife: 'Cuchillo',
  lead_pipe: 'Tubería',
  revolver: 'Revólver',
  rope: 'Cuerda',
  wrench: 'Llave inglesa',
}

const ROOM_LABELS: Record<string, string> = {
  study: 'Estudio', library: 'Biblioteca', billiard_room: 'Billar',
  kitchen: 'Cocina', ballroom: 'Salón', conservatory: 'Jardín de Invierno',
  hall: 'Vestíbulo', lounge: 'Sala de estar', dining_room: 'Comedor',
}

const SUSPECTS = new Set(['scarlett','mustard','white','green','peacock','plum'])
const WEAPONS = new Set(['candlestick','knife','lead_pipe','revolver','rope','wrench'])

function cardType(card: CardId): string {
  if (SUSPECTS.has(card)) return 'suspect'
  if (WEAPONS.has(card)) return 'weapon'
  return 'room'
}

function cardLabel(card: CardId): string {
  return SUSPECT_LABELS[card] ?? WEAPON_LABELS[card] ?? ROOM_LABELS[card] ?? card
}

function cardIcon(card: CardId): string {
  if (SUSPECTS.has(card)) return '🔴'
  if (WEAPONS.has(card)) return '🔪'
  return '🚪'
}

function onCardClick(card: CardId): void {
  if (props.selectable) emit('select', card)
}
</script>

<style scoped>
.hand {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.hand-title {
  font-family: var(--font-pixel);
  font-size: 0.5rem;
  color: var(--text-dim);
  letter-spacing: 0.1em;
}

.cards-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.5rem 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 80px;
  font-family: var(--font-mono);
  transition: border-color 0.2s, transform 0.15s;
}

.card.suspect { border-color: #ff2d7866; }
.card.weapon  { border-color: #ffe60066; }
.card.room    { border-color: #00e5ff66; }

.card.selectable {
  cursor: pointer;
}

.card.selectable:hover {
  transform: translateY(-3px);
}

.card.selectable.suspect:hover { border-color: #ff2d78; box-shadow: 0 0 10px #ff2d7844; }
.card.selectable.weapon:hover  { border-color: #ffe600; box-shadow: 0 0 10px #ffe60044; }
.card.selectable.room:hover    { border-color: #00e5ff; box-shadow: 0 0 10px #00e5ff44; }

.card.chosen {
  border-width: 2px;
  transform: translateY(-3px);
}
.card.chosen.suspect { border-color: #ff2d78; box-shadow: 0 0 12px #ff2d7866; }
.card.chosen.weapon  { border-color: #ffe600; box-shadow: 0 0 12px #ffe60066; }
.card.chosen.room    { border-color: #00e5ff; box-shadow: 0 0 12px #00e5ff66; }

.card.public { opacity: 0.6; }

.card-icon { font-size: 1.25rem; line-height: 1; }

.card-label {
  font-size: 0.7rem;
  color: var(--text);
  text-align: center;
}

.public-section { display: flex; flex-direction: column; gap: 0.5rem; }

.public-title {
  font-family: var(--font-pixel);
  font-size: 0.4rem;
  color: var(--text-dim);
  letter-spacing: 0.1em;
}
</style>
