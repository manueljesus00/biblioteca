import { useEffect, useState } from 'react';
import { BookOpen, CheckCircle, ShoppingCart, Plus, Star } from 'lucide-react';

// --- TIPOS ---
interface Libro {
  id: number;
  titulo: string;
  autor: { nombre: string };
  genero?: { nombre: string };
  status?: { nombre: string };
  valoracion?: { puntuacion: number };
}

interface DashboardData {
  leyendo: Libro[];
  wishlist: Libro[];
  leidos: Libro[];
  pendientes: Libro[];
}

// --- COMPONENTE PRINCIPAL ---
function App() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados para formularios
  const [newBook, setNewBook] = useState({ titulo: '', autor: '', genero: '', isbn: '', estado: 'WISHLIST' });
  const [buyingBookId, setBuyingBookId] = useState<number | null>(null);
  const [buyForm, setBuyForm] = useState({ precio: '', tienda: '', referido: '' });

  // Estado para la paginación de leídos
  const [leidosPage, setLeidosPage] = useState(1);
  const [leidosData, setLeidosData] = useState({ data: [], total: 0, totalPages: 0, page: 1 });

  // Estados para los filtros
  const [listas, setListas] = useState<{ autores: any[], generos: any[], relaciones: any[] }>({
    autores: [],
    generos: [],
    relaciones: []
  });
  const [filtros, setFiltros] = useState({ autor: '', genero: '', orden: 'reciente' });

  // 1. CARGAR DATOS
  const fetchDashboard = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/dashboard');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Error conectando al server:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchListas = async () => {
    const res = await fetch('http://localhost:3000/api/datos-generales');
    setListas(await res.json());
  };

  // Carga inicial
  useEffect(() => {
    fetchDashboard();
    fetchListas();
  }, []);

  // Recargar leídos cuando cambien los filtros o la página
  useEffect(() => {
    fetchLeidos(leidosPage);
  }, [leidosPage, filtros]); // <--- Se ejecuta automáticamente al filtrar

  // 2. AÑADIR A WISHLIST
  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/api/libros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBook)
      });

      const json = await res.json();

      if (!res.ok) {
        alert("❌ Error al guardar: " + (json.error || "Desconocido"));
        return;
      }

      // Limpiamos el formulario
      setNewBook({ titulo: '', autor: '', genero: '', isbn: '', estado: 'WISHLIST' });

      // Recargamos los datos
      fetchDashboard();

    } catch (err) {
      console.error("🔥 Error de conexión:", err);
      alert("Error conectando con el servidor");
    }
  };

  // 3. REGISTRAR COMPRA (Wishlist -> Pendiente)
  const handleBuy = async (e: React.FormEvent) => {
    e.preventDefault(); // Evita que la página se recargue
    console.log("1. 🖱️ Botón pulsado");

    // Verificamos el estado actual
    console.log("2. 📊 Datos actuales:", {
      idLibro: buyingBookId,
      precio: buyForm.precio,
      tienda: buyForm.tienda
    });

    if (!buyingBookId) {
      console.error("❌ ERROR: No hay ID de libro seleccionado");
      alert("Error: No se sabe qué libro estás comprando.");
      return;
    }

    if (!buyForm.precio || !buyForm.tienda) {
      console.error("❌ ERROR: Faltan precio o tienda");
      alert("Por favor, rellena el Precio y la Tienda.");
      return;
    }

    console.log("3. 🚀 Enviando petición al servidor...");

    try {
      const response = await fetch('http://localhost:3000/api/compra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idLibro: buyingBookId,
          precio: parseFloat(buyForm.precio), // Aseguramos que sea número
          tienda: buyForm.tienda,
          referido: buyForm.referido
        })
      });

      console.log("4. 📩 Respuesta recibida (Status):", response.status);
      const data = await response.json();
      console.log("5. 📦 Datos recibidos del servidor:", data);

      if (!response.ok) {
        throw new Error(data.error || 'Error desconocido en el servidor');
      }

      alert("✅ ¡COMPRA GUARDADA CON ÉXITO!");
      setBuyingBookId(null);
      setBuyForm({ precio: '', tienda: '', referido: '' });
      fetchDashboard();

    } catch (err: any) {
      console.error("🔥 ERROR CRÍTICO:", err);
      alert("Fallo al guardar: " + err.message);
    }
  };

  // 4. CAMBIAR ESTADO (Pendiente -> Leyendo -> Terminado)
  const updateStatus = async (id: number, status: string) => {
    await fetch(`http://localhost:3000/api/libros/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nuevoStatus: status })
    });
    fetchDashboard();
  };

  // 5. OBTENER LEÍDOS CON PAGINACIÓN
  const fetchLeidos = async (page: number) => {
    // Convertimos los filtros en parámetros de URL
    const query = new URLSearchParams({
      page: page.toString(),
      autor: filtros.autor,
      genero: filtros.genero,
      orden: filtros.orden
    }).toString();

    const res = await fetch(`http://localhost:3000/api/libros/leidos?${query}`);
    setLeidosData(await res.json());
    setLeidosPage(page);
  };

  if (loading) return <div style={{ padding: 20 }}>Cargando biblioteca...</div>;

  // --- LÓGICA DE FILTROS EN CASCADA ---
  
  // 1. Obtener Autores Disponibles (según el género seleccionado)
  const autoresDisponibles = filtros.genero
    ? Array.from(new Set( // Usamos Set para eliminar duplicados
        listas.relaciones
          .filter(r => r.genero.nombre === filtros.genero)
          .map(r => r.autor.nombre)
      )).sort()
    : listas.relaciones.map(r => r.autor.nombre).filter((v, i, a) => a.indexOf(v) === i).sort(); 
    // (Si no hay filtro, mostramos todos los autores que tengan libros leídos)

  // 2. Obtener Géneros Disponibles (según el autor seleccionado)
  const generosDisponibles = filtros.autor
    ? Array.from(new Set(
        listas.relaciones
          .filter(r => r.autor.nombre === filtros.autor)
          .map(r => r.genero.nombre)
      )).sort()
    : listas.relaciones.map(r => r.genero.nombre).filter((v, i, a) => a.indexOf(v) === i).sort();

  // 3. Función para borrar filtros
  const clearFilters = () => {
    setFiltros({ autor: '', genero: '', orden: 'reciente' });
    setLeidosPage(1); // Importante volver a la página 1
  };

  return (
    <div className="container">
      <header style={{ marginBottom: 30, textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: 5 }}>📚 Book Tracker</h1>
        <p style={{ color: '#666' }}>Gestiona tus lecturas y compras</p>
      </header>

      {/* SECCIÓN 1: LEYENDO AHORA (Multi-Libro) */}
      <div className="card" style={{ borderLeft: '5px solid #2563eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
          <BookOpen size={24} color="#2563eb" />
          <h2 style={{ border: 'none', margin: 0 }}>Leyendo Ahora ({data?.leyendo.length || 0})</h2>
        </div>

        {/* Lógica: Si no hay libros, mensaje. Si hay, rejilla de libros */}
        {!data?.leyendo || data.leyendo.length === 0 ? (
          <p style={{ fontStyle: 'italic', color: '#888' }}>
            No estás leyendo nada. ¡Elige uno de tus pendientes!
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 20 }}>
            {data.leyendo.map(libro => (
              <div key={libro.id} style={{
                background: '#f8f9fa',
                padding: 15,
                borderRadius: 8,
                border: '1px solid #e9ecef'
              }}>
                <h3 style={{ fontSize: '1.2rem', margin: '0 0 5px 0' }}>{libro.titulo}</h3>
                <p style={{ margin: '0 0 15px 0', color: '#555', fontSize: '0.9rem' }}>
                  de <strong>{libro.autor.nombre}</strong>
                </p>
                <button
                  className="btn-success"
                  style={{ width: '100%', fontSize: '0.9em' }}
                  onClick={() => updateStatus(libro.id, 'TERMINADO')}
                >
                  ✅ Terminar este
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid">
        {/* COLUMNA IZQUIERDA: WISHLIST & COMPRAS */}
        <div>
          {/* Formulario Añadir */}
          <div className="card">
            <h3><Plus size={16} /> Registrar Libro</h3>
            <form onSubmit={handleAddBook}>
              <input
                placeholder="Título"
                required
                value={newBook.titulo}
                onChange={e => setNewBook({ ...newBook, titulo: e.target.value })}
              />
              <input
                placeholder="Autor"
                required
                list="lista-autores"
                value={newBook.autor}
                onChange={e => setNewBook({ ...newBook, autor: e.target.value })}
              />
              <datalist id="lista-autores">
                {listas.autores.map((a: any) => <option key={a.id} value={a.nombre} />)}
              </datalist>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 15 }}>
                <div>
                  <input
                    placeholder="Género"
                    required
                    list="lista-generos"
                    style={{ margin: 0, width: '100%' }}
                    value={newBook.genero}
                    onChange={e => setNewBook({ ...newBook, genero: e.target.value })}
                  />
                  <datalist id="lista-generos">
                    {listas.generos.map((g: any) => <option key={g.id} value={g.nombre} />)}
                  </datalist>
                </div>
                {/* NUEVO SELECTOR DE ESTADO */}
                <select
                  style={{ margin: 0 }}
                  value={newBook.estado}
                  onChange={e => setNewBook({ ...newBook, estado: e.target.value })}
                >
                  <option value="WISHLIST">✨ Wishlist (Deseado)</option>
                  <option value="LEYENDO">📖 Leyendo Ahora</option>
                  <option value="TERMINADO">✅ Terminado / Leído</option>
                  <option value="PENDIENTE LEER">📚 Pendiente (Comprado)</option>
                </select>
              </div>

              <input
                placeholder="ISBN (Opcional)"
                value={newBook.isbn}
                onChange={e => setNewBook({ ...newBook, isbn: e.target.value })}
              />

              <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                Guardar Libro
              </button>
            </form>
          </div>

          {/* Lista Wishlist */}
          <div className="card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={20} /> Wishlist
            </h2>
            <ul>
              {data?.wishlist.map(libro => (
                <li key={libro.id}>
                  {buyingBookId === libro.id ? (
                    // FORMULARIO DE COMPRA (Se muestra al dar a Comprar)
                    <form onSubmit={handleBuy} style={{ background: '#f8f9fa', padding: 10, borderRadius: 5 }}>
                      <strong>Comprando: {libro.titulo}</strong>
                      <input type="number" step="0.01" placeholder="Precio (€)" required autoFocus
                        value={buyForm.precio} onChange={e => setBuyForm({ ...buyForm, precio: e.target.value })} />
                      <input placeholder="Tienda (ej. Amazon)" required
                        value={buyForm.tienda} onChange={e => setBuyForm({ ...buyForm, tienda: e.target.value })} />
                      <input placeholder="Enlace Referido (Opcional)"
                        value={buyForm.referido} onChange={e => setBuyForm({ ...buyForm, referido: e.target.value })} />
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button type="submit" className="btn-success">Confirmar Compra</button>
                        <button type="button" onClick={() => setBuyingBookId(null)} style={{ background: '#ccc' }}>Cancelar</button>
                      </div>
                    </form>
                  ) : (
                    // VISTA NORMAL
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{libro.titulo}</strong>
                        <div style={{ fontSize: '0.85em', color: '#666' }}>{libro.autor.nombre} • {libro.genero?.nombre}</div>
                      </div>
                      <button className="btn-primary" onClick={() => setBuyingBookId(libro.id)}>
                        Comprar
                      </button>
                    </div>
                  )}
                </li>
              ))}
              {data?.wishlist.length === 0 && <p>Tu wishlist está vacía.</p>}
            </ul>
          </div>
        </div>

        {/* COLUMNA DERECHA: LEÍDOS & PENDIENTES */}
        <div>
          <div className="card" style={{ borderLeft: '5px solid #f59e0b' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#d97706' }}>
              📚 Pendientes ({data?.pendientes.length || 0})
            </h2>

            {data?.pendientes.length === 0 ? (
              <p style={{ color: '#888', fontStyle: 'italic' }}>No tienes libros pendientes.</p>
            ) : (
              <ul style={{ marginTop: 10 }}>
                {data?.pendientes.map(libro => (
                  <li key={libro.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{libro.titulo}</strong>
                      <div style={{ fontSize: '0.85em', color: '#666' }}>{libro.autor.nombre}</div>
                    </div>

                    {/* Botón para EMPEZAR A LEER */}
                    <button
                      className="btn-primary"
                      style={{ background: '#f59e0b', fontSize: '0.9em' }}
                      onClick={() => updateStatus(libro.id, 'LEYENDO')}
                    >
                      📖 Leer
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* SECCIÓN LEÍDOS CON PAGINACIÓN */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0, border: 'none' }}>
                <CheckCircle size={20} /> Leídos
              </h2>
              {/* CHIP DE TOTAL */}
              <span style={{
                background: '#dcfce7', color: '#166534',
                padding: '4px 12px', borderRadius: '20px',
                fontSize: '0.9em', fontWeight: 'bold'
              }}>
                Total: {leidosData.total}
              </span>
            </div>

            {/* BARRA DE FILTROS INTELIGENTE */}
            <div style={{ background: '#f8f9fa', padding: 15, borderRadius: 8, marginBottom: 15 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                
                {/* Filtro Autor */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.8em', color: '#666', display: 'block', marginBottom: 2 }}>
                    Filtrar por Autor
                  </label>
                  <select 
                    value={filtros.autor} 
                    onChange={e => { setFiltros({...filtros, autor: e.target.value}); setLeidosPage(1); }}
                    style={{ margin: 0, width: '100%' }}
                  >
                    <option value="">Todos los Autores</option>
                    {autoresDisponibles.map((nombre: string) => (
                      <option key={nombre} value={nombre}>{nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Filtro Género */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ fontSize: '0.8em', color: '#666', display: 'block', marginBottom: 2 }}>
                    Filtrar por Género
                  </label>
                  <select 
                    value={filtros.genero} 
                    onChange={e => { setFiltros({...filtros, genero: e.target.value}); setLeidosPage(1); }}
                    style={{ margin: 0, width: '100%' }}
                  >
                    <option value="">Todos los Géneros</option>
                    {generosDisponibles.map((nombre: string) => (
                      <option key={nombre} value={nombre}>{nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Orden */}
                <div style={{ width: '160px' }}>
                  <label style={{ fontSize: '0.8em', color: '#666', display: 'block', marginBottom: 2 }}>
                    Orden
                  </label>
                  <select 
                    value={filtros.orden} 
                    onChange={e => setFiltros({...filtros, orden: e.target.value})}
                    style={{ margin: 0, width: '100%' }}
                  >
                    <option value="reciente">📅 Reciente</option>
                    <option value="antiguo">📅 Antiguo</option>
                    <option value="alfabetico">🔤 A-Z</option>
                  </select>
                </div>

                {/* BOTÓN LIMPIAR FILTROS */}
                {(filtros.autor || filtros.genero || filtros.orden !== 'reciente') && (
                  <button 
                    onClick={clearFilters}
                    style={{ 
                      background: '#ef4444', color: 'white', border: 'none', 
                      height: '38px', padding: '0 15px', borderRadius: 4, cursor: 'pointer' 
                    }}
                    title="Limpiar todos los filtros"
                  >
                    ✖ Borrar
                  </button>
                )}
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 15 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#888', fontSize: '0.9em' }}>
                  <th>Título</th>
                  <th>Autor</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {leidosData.data.map((libro: any) => (
                  <tr key={libro.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px 0' }}>{libro.titulo}</td>
                    <td>{libro.autor.nombre}</td>
                    <td>
                      {libro.valoracion ? (
                        <span style={{ color: '#eab308' }}>
                          {'★'.repeat(libro.valoracion.puntuacion)}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8em', background: '#eee', padding: '2px 6px', borderRadius: 4 }}>
                          {libro.status?.nombre}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* CONTROLES DE PAGINACIÓN */}
            {leidosData.totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'center' }}>
                <button
                  onClick={() => fetchLeidos(leidosPage - 1)}
                  disabled={leidosPage === 1}
                  style={{ background: leidosPage === 1 ? '#eee' : '#fff', border: '1px solid #ddd' }}
                >
                  ◀ Anterior
                </button>

                <span style={{ fontSize: '0.9em', color: '#666' }}>
                  Página {leidosData.page} de {leidosData.totalPages}
                </span>

                <button
                  onClick={() => fetchLeidos(leidosPage + 1)}
                  disabled={leidosPage === leidosData.totalPages}
                  style={{ background: leidosPage === leidosData.totalPages ? '#eee' : '#fff', border: '1px solid #ddd' }}
                >
                  Siguiente ▶
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;