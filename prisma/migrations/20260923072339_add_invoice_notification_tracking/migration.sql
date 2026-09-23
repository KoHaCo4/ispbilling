/*
  Warnings:

  - A unique constraint covering the columns `[customerId,periodMonth,periodYear]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "notificationSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "invoices_customerId_periodMonth_periodYear_key" ON "invoices"("customerId", "periodMonth", "periodYear");
