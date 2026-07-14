-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
