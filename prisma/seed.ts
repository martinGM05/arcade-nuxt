import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import bcrypt from 'bcryptjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0])

const ROUNDS = 12

const GAMES_DATA = [
  { key: 'SNAKE',          name: 'Snake',         emoji: '🐍', color: '#39ff14', route: '/snake',             badge: 'SINGLE PLAYER', description: 'Guía tu serpiente, come manzanas y crece sin chocar.',                            showInNav: true  },
  { key: 'TETRIS',         name: 'Tetris',         emoji: '🧱', color: '#00e5ff', route: '/tetris',            badge: 'SINGLE PLAYER', description: 'Encaja los tetrominós y elimina líneas.',                                         showInNav: true  },
  { key: 'BREAKOUT',       name: 'Breakout',       emoji: '🎯', color: '#ff2d78', route: '/breakout',          badge: 'SINGLE PLAYER', description: 'Destruye todos los ladrillos con la pelota.',                                      showInNav: true  },
  { key: 'SNAKE_VS_SNAKE', name: 'Snake vs Snake', emoji: '⚔️', color: '#ffe600', route: '/snake/multiplayer', badge: 'MULTIPLAYER',   description: 'Tiempo real. Dos serpientes, una sola ganadora.',                                  showInNav: true  },
  { key: 'CLUE',           name: 'Clue',           emoji: '🔍', color: '#b000ff', route: '/clue',              badge: 'MULTIPLAYER',   description: 'Deduce al asesino, el arma y la sala. 3-6 jugadores.',                             showInNav: true  },
  { key: 'HANGMAN',        name: 'Ahorcado',       emoji: '🪢', color: '#ff9f1c', route: '/hangman',           badge: 'SINGLE + MULTI', description: 'Solitario o multijugador. Adivina la frase antes de que se acaben los intentos.', showInNav: false },
]

const USERS = [
  { email: 'mario@arcade.dev',   username: 'MarioB',     password: 'password123' },
  { email: 'luigi@arcade.dev',   username: 'LuigiG',     password: 'password123' },
  { email: 'peach@arcade.dev',   username: 'PeachP',     password: 'password123' },
  { email: 'toad@arcade.dev',    username: 'ToadT',      password: 'password123' },
  { email: 'bowser@arcade.dev',  username: 'Bowser',     password: 'password123' },
  { email: 'yoshi@arcade.dev',   username: 'YoshiGreen', password: 'password123' },
]

const SCORE_PROFILES: Record<string, { base: number; spread: number }[]> = {
  SNAKE:          [{ base: 4200, spread: 800 }, { base: 3800, spread: 700 }, { base: 5100, spread: 900 }, { base: 2900, spread: 600 }, { base: 6700, spread: 1200 }, { base: 3300, spread: 700 }],
  TETRIS:         [{ base: 18400, spread: 3000 }, { base: 22100, spread: 4000 }, { base: 15600, spread: 2500 }, { base: 31000, spread: 5000 }, { base: 9800, spread: 2000 }, { base: 27500, spread: 4500 }],
  BREAKOUT:       [{ base: 870, spread: 150 }, { base: 1340, spread: 200 }, { base: 660, spread: 120 }, { base: 1120, spread: 180 }, { base: 490, spread: 100 }, { base: 980, spread: 160 }],
  SNAKE_VS_SNAKE: [{ base: 12, spread: 4 }, { base: 9, spread: 3 }, { base: 15, spread: 5 }, { base: 7, spread: 3 }, { base: 11, spread: 4 }, { base: 8, spread: 3 }],
  CLUE:           [{ base: 3, spread: 2 }, { base: 2, spread: 1 }, { base: 4, spread: 2 }, { base: 5, spread: 2 }, { base: 2, spread: 1 }, { base: 3, spread: 2 }],
  HANGMAN:        [{ base: 8, spread: 3 }, { base: 5, spread: 2 }, { base: 6, spread: 2 }, { base: 10, spread: 3 }, { base: 3, spread: 2 }, { base: 11, spread: 4 }],
}

const RECORDS_PER_USER = 7

function randScore(base: number, spread: number): number {
  return Math.max(1, Math.round(base + (Math.random() * 2 - 1) * spread))
}

function randDate(daysBack: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack))
  d.setHours(Math.floor(Math.random() * 23), Math.floor(Math.random() * 59))
  return d
}

async function main() {
  console.log('Limpiando datos anteriores...')
  await prisma.gamePlayer.deleteMany()
  await prisma.gameRoom.deleteMany()
  await prisma.score.deleteMany()
  await prisma.user.deleteMany()
  await prisma.game.deleteMany()

  console.log('Creando juegos...')
  const games = await Promise.all(GAMES_DATA.map(g => prisma.game.create({ data: g })))
  const gameMap = Object.fromEntries(games.map(g => [g.key, g]))
  console.log(`  ✓ ${games.length} juegos creados`)

  console.log('Creando usuarios...')
  const users = await Promise.all(
    USERS.map(u => prisma.user.create({
      data: { email: u.email, username: u.username, passwordHash: bcrypt.hashSync(u.password, ROUNDS) },
    }))
  )
  const [mario, luigi, peach, toad, bowser, yoshi] = users
  console.log(`  ✓ ${users.length} usuarios creados`)

  console.log('Creando puntuaciones...')
  const scoreRows: { userId: string; gameId: string; value: number; createdAt: Date }[] = []
  for (const [key, profiles] of Object.entries(SCORE_PROFILES)) {
    const game = gameMap[key]
    users.forEach((user, i) => {
      const { base, spread } = profiles[i]
      for (let r = 0; r < RECORDS_PER_USER; r++) {
        scoreRows.push({ userId: user.id, gameId: game.id, value: randScore(base, spread), createdAt: randDate(60) })
      }
    })
  }
  await prisma.score.createMany({ data: scoreRows })
  console.log(`  ✓ ${scoreRows.length} puntuaciones creadas`)

  console.log('Creando salas de juego...')
  for (const [host, guest] of [[mario, luigi], [peach, toad], [bowser, yoshi]]) {
    const winner = Math.random() > 0.5 ? host : guest
    const room = await prisma.gameRoom.create({
      data: { gameId: gameMap['SNAKE_VS_SNAKE'].id, status: 'FINISHED', hostId: host.id, state: { winner: winner.id } },
    })
    await prisma.gamePlayer.createMany({
      data: [{ roomId: room.id, userId: host.id, playerSlot: 1 }, { roomId: room.id, userId: guest.id, playerSlot: 2 }],
    })
  }
  const waitingSnake = await prisma.gameRoom.create({
    data: { gameId: gameMap['SNAKE_VS_SNAKE'].id, status: 'WAITING', hostId: toad.id, state: {} },
  })
  await prisma.gamePlayer.create({ data: { roomId: waitingSnake.id, userId: toad.id, playerSlot: 1 } })

  for (const g of [
    { host: peach, players: [peach, toad, yoshi, bowser], state: { murderer: 'Scarlett', weapon: 'candlestick' } },
    { host: mario, players: [mario, luigi, peach, toad, bowser], state: { murderer: 'Mustard', weapon: 'revolver' } },
  ]) {
    const room = await prisma.gameRoom.create({
      data: { gameId: gameMap['CLUE'].id, status: 'FINISHED', hostId: g.host.id, state: g.state },
    })
    await prisma.gamePlayer.createMany({
      data: g.players.map((p, idx) => ({ roomId: room.id, userId: p.id, playerSlot: idx + 1 })),
    })
  }
  const playingClue = await prisma.gameRoom.create({
    data: { gameId: gameMap['CLUE'].id, status: 'PLAYING', hostId: yoshi.id, state: { turn: luigi.id } },
  })
  await prisma.gamePlayer.createMany({
    data: [yoshi, luigi, bowser].map((p, idx) => ({ roomId: playingClue.id, userId: p.id, playerSlot: idx + 1 })),
  })

  for (const g of [
    { host: yoshi, players: [yoshi, mario, luigi], state: { word: 'JAVASCRIPT', won: true } },
    { host: bowser, players: [bowser, peach, toad], state: { word: 'ARCADE', won: false } },
  ]) {
    const room = await prisma.gameRoom.create({
      data: { gameId: gameMap['HANGMAN'].id, status: 'FINISHED', hostId: g.host.id, state: g.state },
    })
    await prisma.gamePlayer.createMany({
      data: g.players.map((p, idx) => ({ roomId: room.id, userId: p.id, playerSlot: idx + 1 })),
    })
  }
  const waitingHangman = await prisma.gameRoom.create({
    data: { gameId: gameMap['HANGMAN'].id, status: 'WAITING', hostId: mario.id, state: {} },
  })
  await prisma.gamePlayer.create({ data: { roomId: waitingHangman.id, userId: mario.id, playerSlot: 1 } })

  console.log(`  ✓ Salas y jugadores creados`)
  console.log(`\nSeed completado.`)
  console.log(`  Juegos: ${games.length} | Usuarios: ${users.length} | Scores: ${scoreRows.length} | Salas: ${await prisma.gameRoom.count()}`)
  console.log('\nCredenciales (password: password123):')
  users.forEach(u => console.log(`  ${u.username.padEnd(12)} → ${u.email}`))
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect().then(() => pool.end()))
