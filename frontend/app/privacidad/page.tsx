export const metadata = { title: 'Política de Privacidad | Proveendo' };

export default function Privacidad() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Política de Privacidad</h1>
      <p className="mb-4 text-sm text-slate-500">Última actualización: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-slate-700 dark:text-slate-300">
        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">1. Información que recopilamos</h2>
          <p>Solo recopilamos los datos estrictamente necesarios para operar la plataforma: nombres, correos electrónicos, datos de ubicación (para conductores y entregas) y números de teléfono para la gestión logística.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">2. Uso de la información</h2>
          <p>Utilizamos su información personal únicamente para procesar pedidos, coordinar entregas, y para enviarle notificaciones de soporte. No vendemos sus datos a terceros bajo ninguna circunstancia.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">3. Proveedores externos (Third Parties)</h2>
          <p>Compartimos información mínima necesaria con proveedores de analíticas anónimas, servicios de enrutamiento GPS (OpenRouteService), alojamiento de imágenes (Cloudinary) y envío de notificaciones (Green API / WhatsApp).</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">4. Sus Derechos</h2>
          <p>Usted puede solicitar la eliminación de su cuenta y todos sus datos asociados contactándonos directamente a privacidad@proveendo.com. Cumplimos con las leyes locales de protección de datos aplicables.</p>
        </section>
      </div>
    </main>
  );
}
