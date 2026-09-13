-- CreateTable
CREATE TABLE "_RouterPackages" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RouterPackages_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_RouterPackages_B_index" ON "_RouterPackages"("B");

-- AddForeignKey
ALTER TABLE "_RouterPackages" ADD CONSTRAINT "_RouterPackages_A_fkey" FOREIGN KEY ("A") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RouterPackages" ADD CONSTRAINT "_RouterPackages_B_fkey" FOREIGN KEY ("B") REFERENCES "routers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
