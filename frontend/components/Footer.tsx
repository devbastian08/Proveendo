export default function Footer() {
  return (
    <footer className="bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          <p><strong>Proveendo Inc.</strong></p>
          <p>Bogotá, Colombia</p>
          <p>contacto@proveendo.com</p>
        </div>
        
        <nav aria-label="Enlaces legales" className="flex flex-wrap justify-center gap-4 text-sm text-slate-600 dark:text-slate-300">
          <a href="/privacidad" className="hover:underline focus:ring-2 focus:ring-[#4a6c6f] rounded-sm">Privacidad</a>
          <a href="/terminos" className="hover:underline focus:ring-2 focus:ring-[#4a6c6f] rounded-sm">Términos y Condiciones</a>
          <a href="/cookies" className="hover:underline focus:ring-2 focus:ring-[#4a6c6f] rounded-sm">Cookies</a>
          <a href="/reembolsos" className="hover:underline focus:ring-2 focus:ring-[#4a6c6f] rounded-sm">Reembolsos</a>
        </nav>
        
        <div className="text-sm text-slate-500 dark:text-slate-400">
          © {new Date().getFullYear()} Proveendo. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
