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

// 5. OBTENER LEÍDOS CON PAGINACIÓN
app.get('/api/libros/leidos', async (req, res) => {
  // Leemos la página que pide el usuario (por defecto la 1)
  const page = Number(req.query.page) || 1;
  const limit = 5; // Número de libros por página
  const skip = (page - 1) * limit;

  try {
    // Ejecutamos dos consultas a la vez: Contar total y Buscar los de esta página
    const [total, libros] = await prisma.$transaction([
      // 1. Contar cuántos hay en total
      prisma.libro.count({
        where: { status: { nombre: { in: ['TERMINADO', 'VALORADO'] } } }
      }),
      // 2. Traer solo los 5 de esta página
      prisma.libro.findMany({
        where: { status: { nombre: { in: ['TERMINADO', 'VALORADO'] } } },
        include: { autor: true, valoracion: true, status: true },
        skip: skip,
        take: limit,
        orderBy: { id: 'desc' } // Mostramos los últimos terminados primero
      })
    ]);

    res.json({
      data: libros,
      total: total,
      page: page,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo leídos' });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server en http://localhost:${PORT}`));