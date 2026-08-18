-- CreateEnum
CREATE TYPE "ModReactionType" AS ENUM ('LIKE', 'FIRE', 'LOVE', 'FUNNY', 'WOW');

-- CreateTable
CREATE TABLE "ModReaction" (
    "id" SERIAL NOT NULL,
    "modId" INTEGER NOT NULL,
    "clientUserId" TEXT NOT NULL,
    "type" "ModReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModReaction_modId_idx" ON "ModReaction"("modId");

-- CreateIndex
CREATE UNIQUE INDEX "ModReaction_modId_clientUserId_key" ON "ModReaction"("modId", "clientUserId");

-- AddForeignKey
ALTER TABLE "ModReaction" ADD CONSTRAINT "ModReaction_modId_fkey" FOREIGN KEY ("modId") REFERENCES "Mod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
