-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'MANAGER';

-- AlterTable
ALTER TABLE "App" ADD COLUMN     "createdById" INTEGER;

-- AlterTable
ALTER TABLE "Mod" ADD COLUMN     "createdById" INTEGER;

-- AlterTable
ALTER TABLE "Policy" ADD COLUMN     "createdById" INTEGER;

-- AddForeignKey
ALTER TABLE "App" ADD CONSTRAINT "App_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mod" ADD CONSTRAINT "Mod_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
