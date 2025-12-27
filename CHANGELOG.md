# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [No Publicado]

### Planeado
- Autenticación de usuarios
- Modo oscuro
- Exportación de datos a CSV/PDF
- Integración con APIs de libros (Google Books, Open Library)
- Gráficos de estadísticas avanzados
- Etiquetas personalizadas para libros

---

## [0.1.0] - 2025-12-27

### Añadido

#### Commit: `980ef12` - docs: Update readme.md with project information
- README.md completo con documentación del proyecto
- Descripción de características y funcionalidades
- Stack tecnológico detallado (React 19, Express, Prisma, PostgreSQL)
- Estructura del proyecto explicada
- Modelo de datos documentado
- Guía de instalación paso a paso
- Instrucciones de despliegue en desarrollo y producción
- Documentación completa de API endpoints
- Scripts disponibles para desarrollo
- Sección de solución de problemas

#### Commit: `f0fcf1b` - feat: enhance filtering capabilities by adding relationships for authors and genres
**Frontend:**
- Sistema de filtrado mejorado con relaciones entre autores y géneros
- Interfaz más robusta para la selección de filtros
- Optimización del componente App.tsx (346 líneas modificadas)
- Mejor experiencia de usuario en la gestión de filtros

**Backend:**
- Endpoint `GET /api/datos-generales` mejorado con relaciones
- Queries optimizadas para obtener autores y géneros relacionados
- Mejor estructura de respuesta para filtros avanzados

#### Commit: `5e600e3` - feat: add filtering and sorting options for read books in the dashboard
**Frontend:**
- Filtros por autor y género para libros leídos
- Opciones de ordenación (reciente, antiguo, mejor valorados, peor valorados)
- Interfaz de filtros integrada en el dashboard
- Estados para gestión de filtros con React hooks

**Backend:**
- Endpoint `GET /api/libros/leidos` con paginación
- Parámetros de query para filtrado por autor y género
- Ordenación dinámica según criterios del usuario
- Respuesta paginada con metadata (total, totalPages, page)

#### Commit: `832b40b` - feat: initialize server with Prisma and PostgreSQL setup
**Configuración Inicial del Proyecto:**

**Frontend (Client):**
- Proyecto React 19 con Vite configurado
- TypeScript con configuración estricta
- ESLint con reglas para React y React Hooks
- Componente `App.tsx` inicial con 411 líneas
- Sistema completo de dashboard con:
  - Visualización de libros por estado (Leyendo, Wishlist, Leídos, Pendientes)
  - Formulario para añadir nuevos libros
  - Sistema de compra con registro de precio, tienda y referido
  - Funcionalidad para empezar y terminar libros
  - Sistema de valoraciones (1-5 estrellas) con comentarios
- Estilos CSS personalizados (App.css e index.css)
- Configuración de TypeScript (tsconfig.app.json, tsconfig.json, tsconfig.node.json)
- 3222 líneas en package-lock.json con todas las dependencias

**Backend (Server):**
- Express server con TypeScript
- Middleware CORS configurado
- Middleware para parsing JSON
- API REST con 10 endpoints:
  - `GET /api/dashboard` - Dashboard completo
  - `POST /api/libros` - Crear nuevo libro
  - `POST /api/compra` - Registrar compra con transacciones
  - `PUT /api/libros/:id/empezar` - Empezar a leer
  - `PUT /api/libros/:id/terminar` - Terminar libro
  - `POST /api/valoraciones` - Valorar libro
  - `DELETE /api/libros/:id` - Eliminar libro
  - `GET /api/datos-generales` - Listas maestras
  - `GET /api/estadisticas` - Estadísticas de uso
- TypeScript configurado con strict type checking
- 2155 líneas en package-lock.json

**Base de Datos:**
- Schema Prisma con 8 modelos:
  - `Status` - Estados de libros
  - `Genero` - Categorías
  - `Autor` - Autores
  - `Tienda` - Lugares de compra
  - `Compra` - Transacciones
  - `Libro` - Información principal
  - `Valoracion` - Puntuaciones y comentarios
- Migración inicial `20251227112127_init_db` con 102 líneas SQL
- Relaciones configuradas:
  - Autor → Libro (one-to-many)
  - Genero → Libro (one-to-many)
  - Status → Libro (one-to-many)
  - Tienda → Compra (one-to-many)
  - Compra → Libro (one-to-many)
  - Libro → Valoracion (one-to-one)
- Restricciones de unicidad y campos opcionales bien definidos

**DevOps:**
- Docker Compose configurado
- PostgreSQL 15 Alpine
- Puerto personalizado 5433
- Volúmenes persistentes para datos
- Variables de entorno para credenciales (user/password/database)

**Dependencias Principales:**
- Frontend: React 19.2.0, Vite 7.2.4, TypeScript 5.9.3
- Backend: Express 5.2.1, Prisma 5.22.0, TypeScript 5.9.3
- Base de datos: PostgreSQL 15

#### Commit: `b96e08a` - first commit
- Inicialización del repositorio Git
- README.md base creado

### Características Técnicas
- TypeScript en frontend y backend
- Hot reload en desarrollo con Vite (frontend) y tsx (backend)
- Build optimizado con Vite para producción
- ORM Prisma con tipado automático
- Prisma Client generado desde schema
- ESLint configurado para React y TypeScript
- Docker Compose para entorno de desarrollo
- Gestión de transacciones en la base de datos
- API RESTful siguiendo mejores prácticas
- Componentes React funcionales con Hooks

---

## Tipos de Cambios

- `Añadido` - Para nuevas funcionalidades
- `Cambiado` - Para cambios en funcionalidades existentes
- `Obsoleto` - Para funcionalidades que serán eliminadas
- `Eliminado` - Para funcionalidades eliminadas
- `Corregido` - Para corrección de bugs
- `Seguridad` - Para vulnerabilidades de seguridad

---

[No Publicado]: https://github.com/usuario/biblioteca/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/usuario/biblioteca/releases/tag/v0.1.0
