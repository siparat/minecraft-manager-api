-- AlterTable
ALTER TABLE "AppMod" ADD COLUMN     "createdById" INTEGER;

-- AddForeignKey
ALTER TABLE "AppMod" ADD CONSTRAINT "AppMod_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
