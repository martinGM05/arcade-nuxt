-- DropIndex
DROP INDEX "Score_game_value_idx";

-- AlterTable
ALTER TABLE "Score" DROP COLUMN "game",
ADD COLUMN     "gameId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "GameRoom" DROP COLUMN "game",
ADD COLUMN     "gameId" TEXT NOT NULL;

-- DropEnum
DROP TYPE "GameType";

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "Game_key_key" ON "Game"("key");

-- CreateIndex
CREATE INDEX "Score_gameId_value_idx" ON "Score"("gameId", "value" DESC);

-- AddForeignKey
ALTER TABLE "Score" ADD CONSTRAINT "Score_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRoom" ADD CONSTRAINT "GameRoom_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
