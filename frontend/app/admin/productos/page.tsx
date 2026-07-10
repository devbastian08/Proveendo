'use client';

import { useState, useEffect } from 'react';
import { PackagePlus, Loader2, AlertCircle, Image as ImageIcon, UploadCloud, Trash2, Pencil } from 'lucide-react';

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  categoria: string;
  imagenUrl: string | null;
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');

  // Modo Edición
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [productToDelete, setProductToDelete] = useState<Producto | null>(null);

  // Form State
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [categoria, setCategoria] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProductos = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/productos');
      const data = await res.json();
      setProductos(data);
    } catch (err) {
      console.error('Error fetching productos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
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

  const openCreateModal = () => {
    setEditingProduct(null);
    setNombre('');
    setPrecio('');
    setStock('');
    setCategoria('');
    setImageFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Producto) => {
    setEditingProduct(prod);
    setNombre(prod.nombre);
    setPrecio(prod.precio.toString());
    setStock(prod.stock.toString());
    setCategoria(prod.categoria || '');
    setImageFile(null);
    setImagePreview(prod.imagenUrl || null);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const token = localStorage.getItem('token');
    
    try {
      let finalImageUrl = editingProduct?.imagenUrl || null;
      
      // 1. Si hay una nueva imagen seleccionada, la subimos a Cloudinary
      if (imageFile) {
        finalImageUrl = await uploadImageToCloudinary(imageFile);
      }

      // 2. Determinar si es Crear (POST) o Editar (PATCH)
      const isEditing = !!editingProduct;
      const url = isEditing 
        ? `http://localhost:3001/api/productos/${editingProduct.id}` 
        : 'http://localhost:3001/api/productos';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre,
          precio: Number(precio),
          stock: Number(stock),
          categoria,
          imagenUrl: finalImageUrl
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar producto en base de datos');
      }

      // Limpiar form, cerrar modal y refrescar
      setIsModalOpen(false);
      fetchProductos();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3001/api/productos/${productToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar');
      fetchProductos();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProductToDelete(null);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventario de Productos</h1>
          <p className="text-slate-500">Gestiona los productos disponibles para los tenderos.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#4a6c6f] hover:bg-[#3a5658] text-white rounded-lg font-medium transition-colors"
        >
          <PackagePlus className="w-5 h-5" />
          Agregar Producto
        </button>
      </div>
      
      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-[#4a6c6f] mb-4" />
            <p>Cargando catálogo...</p>
          </div>
        ) : productos.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 text-center">
            <div className="w-16 h-16 bg-[#e2e8ce] text-[#4a6c6f] rounded-full flex items-center justify-center mb-4">
              <PackagePlus className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Tu catálogo está vacío</h3>
            <p className="max-w-sm mb-6">Empieza a agregar productos para que los tenderos puedan hacer pedidos.</p>
            <button 
              onClick={openCreateModal}
              className="text-[#4a6c6f] font-medium hover:underline"
            >
              Agregar el primer producto
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-sm text-slate-500">
                  <th className="px-6 py-4 font-medium w-16">Foto</th>
                  <th className="px-6 py-4 font-medium">Nombre</th>
                  <th className="px-6 py-4 font-medium">Categoría</th>
                  <th className="px-6 py-4 font-medium">Precio</th>
                  <th className="px-6 py-4 font-medium">Stock</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productos.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      {prod.imagenUrl ? (
                        <img src={prod.imagenUrl} alt={prod.nombre} className="w-10 h-10 object-cover rounded-lg border border-slate-200" />
                      ) : (
                        <div className="w-10 h-10 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{prod.nombre}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-medium">{prod.categoria || 'General'}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">${prod.precio.toLocaleString()}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className={`font-medium ${prod.stock < 10 ? 'text-[#d62246]' : 'text-emerald-600'}`}>
                        {prod.stock} u.
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-3">
                      <button 
                        onClick={() => openEditModal(prod)}
                        className="p-2 text-[#56cbf9] hover:bg-slate-100 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setProductToDelete(prod)}
                        className="p-2 text-[#d62246] hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Agregar / Editar Producto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {editingProduct ? 'Editar Producto' : 'Agregar Nuevo Producto'}
            </h2>
            
            <form onSubmit={handleSaveProduct} className="space-y-4">
              {/* Sección de Imagen */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Foto del Producto (Opcional)</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="h-24 w-auto object-contain rounded-md mb-2" />
                    ) : (
                      <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                    )}
                    <span className="text-sm text-[#4a6c6f] font-medium">Haz clic para subir/cambiar foto</span>
                    <span className="text-xs text-slate-500 mt-1">PNG, JPG, WEBP</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Producto</label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#56cbf9] outline-none"
                  placeholder="Ej. Arroz Diana 5kg"
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Precio base</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={precio}
                    onChange={e => setPrecio(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#56cbf9] outline-none"
                    placeholder="25000"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stock disponible</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={stock}
                    onChange={e => setStock(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#56cbf9] outline-none"
                    placeholder="100"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                <input
                  type="text"
                  value={categoria}
                  onChange={e => setCategoria(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#56cbf9] outline-none"
                  placeholder="Ej. Abarrotes"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-4 py-2 bg-[#4a6c6f] hover:bg-[#3a5658] disabled:opacity-70 text-white rounded-lg font-medium"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isSubmitting ? 'Guardando...' : editingProduct ? 'Actualizar Producto' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación para Eliminar */}
      {productToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setProductToDelete(null)}></div>
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-[#d62246] rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar producto?</h2>
            <p className="text-slate-500 mb-6">
              Estás a punto de eliminar <strong>{productToDelete.nombre}</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 flex-1 text-slate-600 font-medium bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 flex-1 bg-[#d62246] hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
