-- CreateTable
CREATE TABLE "AppAd" (
    "id" SERIAL NOT NULL,
    "appId" INTEGER NOT NULL,
    "adId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppAd_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppAd_appId_adId_key" ON "AppAd"("appId", "adId");

-- AddForeignKey
ALTER TABLE "AppAd" ADD CONSTRAINT "AppAd_appId_fkey" FOREIGN KEY ("appId") REFERENCES "App"("id") ON DELETE CASCADE ON UPDATE CASCADE;
