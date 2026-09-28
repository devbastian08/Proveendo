export const metadata = { title: 'Política de Cookies | Proveendo' };

export default function Cookies() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Política de Cookies</h1>
      <p className="mb-4 text-sm text-slate-500">Última actualización: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-slate-700 dark:text-slate-300">
        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">1. ¿Qué son las cookies?</h2>
          <p>Las cookies son pequeños archivos de texto que se almacenan en su dispositivo al visitar nuestra plataforma. Sirven para recordar sus preferencias, mantener la sesión activa de forma segura y recopilar métricas anónimas.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">2. Tipos de cookies que usamos</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Cookies Estrictamente Necesarias:</strong> Esenciales para que la plataforma funcione (ej. Cookies httpOnly de sesión para autenticación). No se pueden desactivar.</li>
            <li><strong>Cookies Analíticas:</strong> Nos ayudan a entender cómo interactúan los usuarios con la plataforma, de forma completamente anónima.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">3. Gestionar su Consentimiento</h2>
          <p>Al ingresar a Proveendo, se le solicitó consentimiento mediante nuestro banner interactivo. Usted puede limpiar las cookies desde la configuración de su navegador en cualquier momento.</p>
        </section>
      </div>
    </main>
  );
}
