/*
  Warnings:

  - Added the required column `distribuidoraId` to the `Pedido` table without a default value. This is not possible if the table is not empty.
  - Added the required column `distribuidoraId` to the `Producto` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Pedido" DROP CONSTRAINT "Pedido_tenderoId_fkey";

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "direccionEnvio" TEXT,
ADD COLUMN     "distribuidoraId" INTEGER NOT NULL,
ADD COLUMN     "nombreCliente" TEXT,
ADD COLUMN     "telefonoCliente" TEXT,
ALTER COLUMN "tenderoId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Producto" ADD COLUMN     "distribuidoraId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "Distribuidora" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,

    CONSTRAINT "Distribuidora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Distribuidora_slug_key" ON "Distribuidora"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Distribuidora_usuarioId_key" ON "Distribuidora"("usuarioId");

-- AddForeignKey
ALTER TABLE "Distribuidora" ADD CONSTRAINT "Distribuidora_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Producto" ADD CONSTRAINT "Producto_distribuidoraId_fkey" FOREIGN KEY ("distribuidoraId") REFERENCES "Distribuidora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_distribuidoraId_fkey" FOREIGN KEY ("distribuidoraId") REFERENCES "Distribuidora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_tenderoId_fkey" FOREIGN KEY ("tenderoId") REFERENCES "Tendero"("id") ON DELETE SET NULL ON UPDATE CASCADE;
