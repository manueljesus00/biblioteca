import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

// --- ENDPOINTS ---

// 1. DASHBOARD: Trae todo lo necesario para la Home
app.get('/api/dashboard', async (req, res) => {
  try {
    const [leyendo, wishlist, leidos, pendientes] = await Promise.all([
      // Libro actual
      prisma.libro.findMany({
        where: { status: { nombre: 'LEYENDO' } },
        include: { autor: true }
      }),
      // Wishlist
      prisma.libro.findMany({
        where: { status: { nombre: 'WISHLIST' } },
        include: { autor: true, genero: true }
      }),
      // Leídos (Terminados o Valorados)
      prisma.libro.findMany({
        where: { status: { nombre: { in: ['TERMINADO', 'VALORADO'] } } },
        include: { autor: true, valoracion: true, status: true }
      }),
      // 4. Pendientes
      prisma.libro.findMany({
        where: { status: { nombre: 'PENDIENTE LEER' } },
        include: { autor: true, genero: true }
      })
    ]);
    res.json({ leyendo, wishlist, leidos, pendientes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

// 2. NUEVO LIBRO: Directo a Wishlist
app.post('/api/libros', async (req, res) => {
  // Añadimos 'estado' a la desestructuración
  const { titulo, autor, genero, isbn, estado } = req.body; 
  
  try {
    const libro = await prisma.libro.create({
      data: {
        titulo,
        isbn: isbn && isbn.length > 0 ? isbn : null,
        // AQUÍ ESTÁ EL CAMBIO: Usamos la variable 'estado' o 'WISHLIST' por defecto
        status: { 
          connectOrCreate: { 
            where: { nombre: estado || 'WISHLIST' }, 
            create: { nombre: estado || 'WISHLIST' } 
          } 
        },
        autor: { connectOrCreate: { where: { nombre: autor }, create: { nombre: autor } } },
        genero: { connectOrCreate: { where: { nombre: genero }, create: { nombre: genero } } }
      }
    });
    res.json(libro);
  } catch (error) {
    res.status(400).json({ error: 'Error creando libro' });
  }
});

// 3. REGISTRAR COMPRA: Mueve de Wishlist a Pendiente
app.post('/api/compra', async (req, res) => {
  console.log("📦 INTENTO DE COMPRA:", req.body); // Log para ver si llega

  const { idLibro, precio, tienda, referido } = req.body;

  if (!idLibro || !precio || !tienda) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      
      // 1. Asegurar Tienda
      const tiendaRecord = await tx.tienda.upsert({
        where: { nombre: tienda },
        update: {},
        create: { nombre: tienda }
      });

      // 2. Crear Compra
      const nuevaCompra = await tx.compra.create({
        data: {
          precio: Number(precio),
          referido: referido || null,
          idTienda: tiendaRecord.id
        }
      });

      // 3. Actualizar Libro (USANDO connectOrCreate PARA EL STATUS)
      const libroActualizado = await tx.libro.update({
        where: { id: Number(idLibro) },
        data: {
          // Conectamos la compra recién creada
          compra: { connect: { id: nuevaCompra.id } },
          
          // ✨ AQUÍ ESTÁ LA MAGIA: Si no existe el estado, lo crea.
          status: { 
            connectOrCreate: {
              where: { nombre: 'PENDIENTE LEER' },
              create: { nombre: 'PENDIENTE LEER' }
            }
          }
        }
      });

      return libroActualizado;
    });

    console.log("✅ Compra ÉXITO:", result);
    res.json(result);

  } catch (error: any) {
    console.error("🔥 ERROR EN COMPRA:", error); // ¡Mira tu terminal si sale esto!
    res.status(500).json({ error: error.message });
  }
});

// 4. EMPEZAR/TERMINAR LIBRO: Cambiar status simple
app.patch('/api/libros/:id/status', async (req, res) => {
  const { nuevoStatus } = req.body; // Ej: "LEYENDO", "TERMINADO"
  try {
    const libro = await prisma.libro.update({
      where: { id: Number(req.params.id) },
      data: {
        status: { connectOrCreate: { where: { nombre: nuevoStatus }, create: { nombre: nuevoStatus } } }
      }
    });
    res.json(libro);
  } catch (error) {
    res.status(500).json({ error: 'Error actualizando estado' });
  }
});

// 5. OBTENER LEÍDOS (Con Filtros y Ordenación)
app.get('/api/libros/leidos', async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = 5;
  const skip = (page - 1) * limit;
  
  // Recogemos los parámetros nuevos
  const { autor, genero, orden } = req.query;

  // Construimos el filtro dinámico
  const whereClause: any = {
    status: { nombre: { in: ['TERMINADO', 'VALORADO'] } }
  };
  
  // Si nos piden filtrar por nombre de autor o género
  if (autor) whereClause.autor = { nombre: String(autor) };
  if (genero) whereClause.genero = { nombre: String(genero) };

  // Definimos el orden
  let orderBy: any = { id: 'desc' }; // Por defecto: El último que añadiste (Reciente)
  if (orden === 'antiguo') orderBy = { id: 'asc' };
  if (orden === 'alfabetico') orderBy = { titulo: 'asc' };

  try {
    const [total, libros] = await prisma.$transaction([
      prisma.libro.count({ where: whereClause }),
      prisma.libro.findMany({
        where: whereClause,
        include: { autor: true, valoracion: true, status: true, genero: true },
        skip: skip,
        take: limit,
        orderBy: orderBy
      })
    ]);

    res.json({
      data: libros,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo leídos' });
  }
});

// 6. DATOS AUXILIARES (Para sugerencias y filtros)
app.get('/api/datos-generales', async (req, res) => {
  try {
    const [autores, generos, librosLeidos] = await Promise.all([
      // Listas completas para el autocompletado del formulario
      prisma.autor.findMany({ orderBy: { nombre: 'asc' } }),
      prisma.genero.findMany({ orderBy: { nombre: 'asc' } }),
      
      // Sacamos las relaciones solo de los libros leídos
      prisma.libro.findMany({
        where: { status: { nombre: { in: ['TERMINADO', 'VALORADO'] } } },
        select: {
          autor: { select: { nombre: true } },
          genero: { select: { nombre: true } }
        }
      })
    ]);

    // Enviamos las listas puras y un mapa de relaciones
    res.json({ autores, generos, relaciones: librosLeidos });
  } catch (error) {
    res.status(500).json({ error: 'Error cargando datos' });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server en http://localhost:${PORT}`));