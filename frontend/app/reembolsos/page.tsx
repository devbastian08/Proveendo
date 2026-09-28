export const metadata = { title: 'Política de Reembolsos | Proveendo' };

export default function Reembolsos() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Política de Reembolsos</h1>
      <p className="mb-4 text-sm text-slate-500">Última actualización: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-slate-700 dark:text-slate-300">
        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">1. Condiciones Generales</h2>
          <p>Debido a la naturaleza del software B2B de logística, las suscripciones y pagos realizados a Proveendo no son reembolsables una vez prestado el servicio o pasado el periodo de prueba gratuito.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">2. Cancelación de Suscripción</h2>
          <p>Usted puede cancelar su suscripción en cualquier momento. La cancelación entrará en vigor al finalizar el ciclo de facturación actual. Seguirá teniendo acceso a la plataforma hasta esa fecha.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">3. Errores de Facturación</h2>
          <p>Si identifica un cobro duplicado o un error en la facturación atribuible a Proveendo, contáctenos en los primeros 14 días en finanzas@proveendo.com y emitiremos el reembolso correspondiente al método de pago original.</p>
        </section>
      </div>
    </main>
  );
}
