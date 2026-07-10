import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center space-y-8">
        <div className="flex justify-center">
          <Image 
            src="/logo.svg" 
            alt="ProvEEndo Logo" 
            width={100} 
            height={100}
            className="text-[#4a6c6f]"
            // Si el logo termina siendo PNG, el className del color no aplicará a la imagen, pero no romperá nada.
            // Si es SVG con fill="currentColor", heredará el proveendo-primary.
          />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">ProvEEndo</h1>
          <p className="text-slate-500">Gestión logística para distribuidoras y tiendas de barrio.</p>
        </div>

        <div className="pt-4 space-y-4">
          <Link 
            href="/login" 
            className="block w-full py-3 px-4 bg-[#4a6c6f] hover:bg-[#3a5658] text-white rounded-lg font-medium transition-colors"
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
