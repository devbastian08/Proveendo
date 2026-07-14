-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "motivoReactivacion" TEXT,
ALTER COLUMN "estado" SET DEFAULT 'pendiente';
