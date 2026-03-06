-- Step 1: Create Game table
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "emoji" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "showInNav" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Game_key_key" ON "Game"("key");

-- Step 2: Seed canonical game records (IDs fijos para consistencia entre entornos)
INSERT INTO "Game" ("id", "key", "name", "description", "color", "route", "badge", "emoji", "isActive", "showInNav", "createdAt") VALUES
('gm_snake',         'SNAKE',         'Snake',         'Guía tu serpiente, come manzanas y crece sin chocar.',                            '#39ff14', '/snake',             'SINGLE PLAYER',  '🐍', true, true,  NOW()),
('gm_tetris',        'TETRIS',        'Tetris',        'Encaja los tetrominós y elimina líneas.',                                         '#00e5ff', '/tetris',            'SINGLE PLAYER',  '🧱', true, true,  NOW()),
('gm_breakout',      'BREAKOUT',      'Breakout',      'Destruye todos los ladrillos con la pelota.',                                     '#ff2d78', '/breakout',          'SINGLE PLAYER',  '🎯', true, true,  NOW()),
('gm_svs',           'SNAKE_VS_SNAKE','Snake vs Snake','Tiempo real. Dos serpientes, una sola ganadora.',                                 '#ffe600', '/snake/multiplayer', 'MULTIPLAYER',    '⚔️', true, true,  NOW()),
('gm_clue',          'CLUE',          'Clue',          'Deduce al asesino, el arma y la sala. 3-6 jugadores.',                           '#b000ff', '/clue',              'MULTIPLAYER',    '🔍', true, true,  NOW()),
('gm_hangman',       'HANGMAN',       'Ahorcado',      'Solitario o multijugador. Adivina la frase antes de que se acaben los intentos.','#ff9f1c', '/hangman',           'SINGLE + MULTI', '🪢', true, false, NOW());

-- Step 3: Añadir gameId como nullable para poder poblar antes de aplicar NOT NULL
ALTER TABLE "Score" ADD COLUMN "gameId" TEXT;
ALTER TABLE "GameRoom" ADD COLUMN "gameId" TEXT;

-- Step 4: Copiar datos — mapear enum → FK usando el key del juego
UPDATE "Score"    SET "gameId" = g.id FROM "Game" g WHERE g.key = "Score"."game"::TEXT;
UPDATE "GameRoom" SET "gameId" = g.id FROM "Game" g WHERE g.key = "GameRoom"."game"::TEXT;

-- Step 5: Verificar que no quedaron registros sin gameId antes de aplicar NOT NULL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Score" WHERE "gameId" IS NULL) THEN
    RAISE EXCEPTION 'Existen scores sin gameId — revisar que todos los valores del enum GameType estén en la tabla Game';
  END IF;
  IF EXISTS (SELECT 1 FROM "GameRoom" WHERE "gameId" IS NULL) THEN
    RAISE EXCEPTION 'Existen salas sin gameId — revisar que todos los valores del enum GameType estén en la tabla Game';
  END IF;
END $$;

ALTER TABLE "Score"    ALTER COLUMN "gameId" SET NOT NULL;
ALTER TABLE "GameRoom" ALTER COLUMN "gameId" SET NOT NULL;

-- Step 6: Eliminar columnas e índices del enum antiguo
DROP INDEX "Score_game_value_idx";
ALTER TABLE "Score"    DROP COLUMN "game";
ALTER TABLE "GameRoom" DROP COLUMN "game";

-- Step 7: Eliminar el enum
DROP TYPE "GameType";

-- Step 8: Índice y foreign keys nuevos
CREATE INDEX "Score_gameId_value_idx" ON "Score"("gameId", "value" DESC);

ALTER TABLE "Score"    ADD CONSTRAINT "Score_gameId_fkey"   FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GameRoom" ADD CONSTRAINT "GameRoom_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
