-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "distribuidoraTrabajoId" INTEGER;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_distribuidoraTrabajoId_fkey" FOREIGN KEY ("distribuidoraTrabajoId") REFERENCES "Distribuidora"("id") ON DELETE SET NULL ON UPDATE CASCADE;
