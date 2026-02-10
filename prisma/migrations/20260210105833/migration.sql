-- CreateEnum
CREATE TYPE "AdsNativeType" AS ENUM ('NATIVE', 'BANNER');

-- AlterTable
ALTER TABLE "AppSdk" ADD COLUMN     "adsNativeType" "AdsNativeType" NOT NULL DEFAULT 'NATIVE';
