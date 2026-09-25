'use client';

import { useState, useEffect } from 'react';
import { Loader2, Store, Save, Link as LinkIcon, Phone, UploadCloud, Image as ImageIcon } from 'lucide-react';

interface Distribuidora {
  id: number;
  nombre: string;
  slug: string;
  telefono: string;
  descripcion: string | null;
  logoUrl: string | null;
  portadaUrl: string | null;
  pedidoMinimo: number | null;
  tiempoEntrega: string | null;
  envioGratis: boolean;
}

export default function AjustesPage() {
  const [distribuidora, setDistribuidora] = useState<Distribuidora | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [nombre, setNombre] = useState('');
  const [slug, setSlug] = useState('');
  const [telefono, setTelefono] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [pedidoMinimo, setPedidoMinimo] = useState('');
  const [tiempoEntrega, setTiempoEntrega] = useState('');
  const [envioGratis, setEnvioGratis] = useState(false);
  const [contadorPedidos, setContadorPedidos] = useState(0);
  
  // Estados para imágenes
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [portadaFile, setPortadaFile] = useState<File | null>(null);
  const [portadaPreview, setPortadaPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [removePortada, setRemovePortada] = useState(false);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDistribuidora = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/distribuidora`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        setDistribuidora(data);
        setNombre(data.nombre);
        setSlug(data.slug);
        setTelefono(data.telefono);
        setDescripcion(data.descripcion || '');
        setLogoPreview(data.logoUrl || null);
        setPortadaPreview(data.portadaUrl || null);
        setPedidoMinimo(data.pedidoMinimo ? data.pedidoMinimo.toString() : '');
        setTiempoEntrega(data.tiempoEntrega || '');
        setEnvioGratis(data.envioGratis || false);
        setContadorPedidos(data.contadorPedidos || 0);
      } else {
        setError(data.error || 'Error al cargar los ajustes');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistribuidora();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'portada') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (type === 'logo') {
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
        setRemoveLogo(false);
      } else {
        setPortadaFile(file);
        setPortadaPreview(URL.createObjectURL(file));
        setRemovePortada(false);
      }
    }
  };

  const handleRemoveImage = (type: 'logo' | 'portada') => {
    if (type === 'logo') {
      setLogoFile(null);
      setLogoPreview(null);
      setRemoveLogo(true);
    } else {
      setPortadaFile(null);
      setPortadaPreview(null);
      setRemovePortada(true);
    }
  };

  const uploadImageToCloudinary = async (file: File) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '';
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_PRESET || '';

    if (!cloudName || !uploadPreset) {
      throw new Error('Falta configurar Cloudinary en las variables de entorno.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      throw new Error('Error al subir la imagen a Cloudinary');
    }

    const data = await res.json();
    return data.secure_url;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      let finalLogoUrl = distribuidora?.logoUrl || null;
      let finalPortadaUrl = distribuidora?.portadaUrl || null;

      if (removeLogo) finalLogoUrl = null;
      if (removePortada) finalPortadaUrl = null;

      if (logoFile) {
        finalLogoUrl = await uploadImageToCloudinary(logoFile);
      }
      if (portadaFile) {
        finalPortadaUrl = await uploadImageToCloudinary(portadaFile);
      }

      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/distribuidora`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          nombre, 
          slug, 
          telefono, 
          descripcion,
          logoUrl: finalLogoUrl,
          portadaUrl: finalPortadaUrl,
          pedidoMinimo: pedidoMinimo ? Number(pedidoMinimo) : null,
          tiempoEntrega: tiempoEntrega || null,
          envioGratis
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar los ajustes');
      }
      
      setDistribuidora(data);
      setSuccess('Ajustes y diseño guardados correctamente.');
      
      // Limpiar mensaje de éxito después de 4 segundos
      setTimeout(() => setSuccess(''), 4000);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tiendaUrl = `http://localhost:3000/tienda/${slug}`;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#4a6c6f] mb-4" />
        <p>Cargando ajustes...</p>
      </div>
    );
  }

  if (!distribuidora) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-xl">
        No se pudo cargar la información de la tienda. {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configuración de Tienda</h1>
        <p className="text-slate-500 dark:text-slate-400">Personaliza la información, diseño y enlace público de tu catálogo.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden p-6 sm:p-8">
        
        <form onSubmit={handleSave} className="space-y-8">
          
          {/* SECCIÓN DE DISEÑO */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#4a6c6f] border-b pb-2">1. Diseño de la Tienda</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Foto de Portada */}
              <div className="space-y-2">
                <label className="block font-medium text-slate-700 dark:text-slate-200">Foto de Portada</label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 text-center hover:bg-slate-50 dark:bg-slate-950 transition-colors relative group">
                  {portadaPreview && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('portada')}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600 shadow-md"
                      title="Quitar portada"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'portada')}
                    className="hidden"
                    id="portada-upload"
                  />
                  <label htmlFor="portada-upload" className="cursor-pointer flex flex-col items-center">
                    {portadaPreview ? (
                      <img src={portadaPreview} alt="Portada" className="h-24 w-full object-cover rounded-md mb-2" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-400 mb-2" />
                    )}
                    <span className="text-sm text-[#4a6c6f] font-medium">Haz clic para subir Portada</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">Recomendado: 1200 x 400px (Horizontal)</span>
                  </label>
                </div>
              </div>

              {/* Logo de Perfil */}
              <div className="space-y-2">
                <label className="block font-medium text-slate-700 dark:text-slate-200">Logo de la Distribuidora</label>
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 text-center hover:bg-slate-50 dark:bg-slate-950 transition-colors relative group">
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('logo')}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600 shadow-md"
                      title="Quitar logo"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'logo')}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label htmlFor="logo-upload" className="cursor-pointer flex flex-col items-center">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="h-24 w-24 object-cover rounded-full mb-2 border border-slate-200 dark:border-slate-700" />
                    ) : (
                      <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                    )}
                    <span className="text-sm text-[#4a6c6f] font-medium">Haz clic para subir Logo</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">Recomendado: 400 x 400px (Cuadrado/Círculo)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN DE INFORMACIÓN BÁSICA */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#4a6c6f] border-b pb-2">2. Información Básica</h2>
            
            <div className="space-y-2">
              <label className="block font-medium text-slate-700 dark:text-slate-200">Nombre de la Distribuidora</label>
              <div className="relative">
                <Store className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#56cbf9] outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-medium text-slate-700 dark:text-slate-200">Descripción Corta</label>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Se mostrará en el directorio para que los tenderos sepan qué vendes.</p>
              <div className="relative">
                <textarea
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  maxLength={150}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#56cbf9] outline-none resize-none"
                  placeholder="Ej. Distribuidores mayoristas de abarrotes, granos y productos de aseo al mejor precio."
                />
                <div className={`text-xs text-right mt-1 font-medium ${descripcion.length >= 150 ? 'text-red-500' : 'text-slate-400'}`}>
                  {descripcion.length} / 150 caracteres
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN DE LOGÍSTICA B2B */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#4a6c6f] border-b pb-2">3. Logística y Condiciones (B2B)</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block font-medium text-slate-700 dark:text-slate-200">Pedido Mínimo (COP)</label>
                <div className="relative">
                  <span className="absolute left-4 top-2.5 text-slate-500 dark:text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    value={pedidoMinimo}
                    onChange={e => setPedidoMinimo(e.target.value)}
                    placeholder="Ej. 50000"
                    className="w-full pl-8 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#56cbf9] outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-medium text-slate-700 dark:text-slate-200">Tiempo de Entrega (Estimado)</label>
                <input
                  type="text"
                  value={tiempoEntrega}
                  onChange={e => setTiempoEntrega(e.target.value)}
                  placeholder="Ej. 24 a 48 horas"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#56cbf9] outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                type="checkbox"
                id="envioGratis"
                checked={envioGratis}
                onChange={e => setEnvioGratis(e.target.checked)}
                className="w-5 h-5 text-[#4a6c6f] rounded focus:ring-[#4a6c6f]"
              />
              <label htmlFor="envioGratis" className="font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
                Ofrecer Envío Gratis por defecto
              </label>
            </div>
          </div>

          {/* SECCIÓN DE CONTACTO Y ENLACE */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#4a6c6f] border-b pb-2">4. Enlace y Contacto</h2>

            <div className="space-y-2">
              <label className="block font-medium text-slate-700 dark:text-slate-200">Enlace Personalizado (Slug)</label>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Este será el enlace que compartirás con tus clientes.</p>
              <div className="relative">
                <LinkIcon className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  readOnly
                  value={slug}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700 rounded-xl outline-none cursor-not-allowed"
                />
              </div>
              <div className="mt-1 p-3 bg-blue-50/50 rounded-lg text-xs text-blue-700 font-medium flex gap-2">
                <span className="text-blue-500">ℹ️</span>
                Tu enlace único es permanente para evitar que tus clientes pierdan el acceso si ya lo compartiste. Si necesitas cambiarlo, contacta a soporte técnico.
              </div>
              <div className="mt-2 p-3 bg-[#e2e8ce]/30 rounded-lg text-sm text-[#4a6c6f] font-medium break-all">
                👉 {tiendaUrl}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-medium text-slate-700 dark:text-slate-200">Número de WhatsApp (Pedidos)</label>
              <div className="relative">
                <Phone className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="tel"
                  required
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#56cbf9] outline-none"
                  placeholder="Ej. 573001234567"
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Asegúrate de incluir el código de país si es necesario (ej. 57 para Colombia).</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm font-medium">
              {success}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#4a6c6f] hover:bg-[#3a5658] disabled:opacity-70 text-white rounded-xl font-bold transition-colors shadow-md shadow-[#4a6c6f]/20"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {isSubmitting ? 'Guardando...' : 'Guardar Ajustes y Diseño'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
