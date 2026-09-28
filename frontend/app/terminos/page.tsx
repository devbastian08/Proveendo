export const metadata = { title: 'Términos y Condiciones | Proveendo' };

export default function Terminos() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Términos y Condiciones</h1>
      <p className="mb-4 text-sm text-slate-500">Última actualización: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-slate-700 dark:text-slate-300">
        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">1. Aceptación de los Términos</h2>
          <p>Al acceder o utilizar Proveendo, usted acepta estar sujeto a estos Términos y Condiciones. Si no está de acuerdo con alguna parte, no podrá utilizar nuestro servicio.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">2. Uso del Servicio</h2>
          <p>Proveendo es una plataforma de software B2B para la gestión de logística. El usuario se compromete a no usar la plataforma para actividades ilícitas y a proporcionar información veraz sobre su negocio.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">3. Derechos de Propiedad</h2>
          <p>El código, diseño, y marca de Proveendo están protegidos por derechos de autor. Los usuarios conservan los derechos sobre las imágenes de los productos que suben, pero otorgan una licencia para mostrarlos en la plataforma.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">4. Limitación de Responsabilidad</h2>
          <p>No garantizamos la disponibilidad ininterrumpida de la plataforma. Proveendo no se hace responsable por lucro cesante, pérdida de datos o interrupciones en la operación logística del usuario causadas por problemas técnicos.</p>
        </section>
      </div>
    </main>
  );
}
