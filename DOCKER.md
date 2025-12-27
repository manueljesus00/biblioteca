# 🐳 Guía de Docker para Biblioteca

Esta guía explica cómo usar Docker para ejecutar el proyecto completo con todos sus servicios.

## 📋 Requisitos

- Docker 20.10+
- Docker Compose 2.0+

## 🏗️ Arquitectura de Contenedores

El proyecto consta de 3 servicios principales:

1. **PostgreSQL** - Base de datos (puerto 5433)
2. **Backend** - API Express con Prisma (puerto 3000)
3. **Frontend** - React con Nginx (puerto 80)

## 🚀 Inicio Rápido

### Producción

Para levantar todo el proyecto en modo producción:

```bash
# Construir e iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f

# Verificar que todos los servicios estén corriendo
docker-compose ps
```

Accede a:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000
- **Base de datos**: localhost:5433

### Desarrollo (con hot reload)

Para desarrollo con recarga automática de cambios:

```bash
# Usar el archivo de desarrollo
docker-compose -f docker-compose.dev.yml up -d

# Ver logs
docker-compose -f docker-compose.dev.yml logs -f
```

Accede a:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Base de datos**: localhost:5433

## 🔧 Comandos Útiles

### Gestión de Contenedores

```bash
# Iniciar servicios
docker-compose up -d

# Detener servicios
docker-compose down

# Detener y eliminar volúmenes (¡CUIDADO: borra la base de datos!)
docker-compose down -v

# Reconstruir imágenes
docker-compose build

# Reconstruir y reiniciar
docker-compose up -d --build

# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Entrar a un contenedor
docker-compose exec backend sh
docker-compose exec frontend sh
docker-compose exec db psql -U user -d mis_libros
```

### Base de Datos

```bash
# Ejecutar migraciones de Prisma
docker-compose exec backend npx prisma migrate deploy

# Abrir Prisma Studio (desde el host, no Docker)
cd server
npx prisma studio

# Backup de la base de datos
docker-compose exec db pg_dump -U user mis_libros > backup.sql

# Restaurar backup
docker-compose exec -T db psql -U user mis_libros < backup.sql

# Resetear base de datos (¡CUIDADO!)
docker-compose exec backend npx prisma migrate reset --force
```

### Desarrollo

```bash
# Ver logs en tiempo real
docker-compose -f docker-compose.dev.yml logs -f

# Reinstalar dependencias del backend
docker-compose -f docker-compose.dev.yml exec backend npm install

# Reinstalar dependencias del frontend
docker-compose -f docker-compose.dev.yml exec frontend npm install

# Ejecutar comandos en el backend
docker-compose -f docker-compose.dev.yml exec backend npm run build

# Acceder a la consola del contenedor
docker-compose -f docker-compose.dev.yml exec backend sh
```

## 📁 Estructura de Archivos Docker

```
biblioteca/
├── docker-compose.yml          # Configuración para producción
├── docker-compose.dev.yml      # Configuración para desarrollo
├── .dockerignore              # Archivos a ignorar en todos los builds
├── DOCKER.md                  # Esta guía
├── client/
│   ├── Dockerfile            # Build de producción (Nginx)
│   ├── Dockerfile.dev        # Build de desarrollo (Vite)
│   ├── nginx.conf            # Configuración de Nginx
│   └── .dockerignore         # Archivos a ignorar en client
└── server/
    ├── Dockerfile            # Build de producción (Node)
    ├── Dockerfile.dev        # Build de desarrollo (Node + hot reload)
    └── .dockerignore         # Archivos a ignorar en server
```

## 🔄 Flujo de Trabajo

### Desarrollo Local

1. **Primera vez**:
```bash
# Levantar todo en modo desarrollo
docker-compose -f docker-compose.dev.yml up -d

# Esperar a que la DB esté lista y ejecutar migraciones
docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate deploy
```

2. **Trabajar normalmente**:
   - Los cambios en `client/src/` se reflejan automáticamente (hot reload)
   - Los cambios en `server/src/` se reflejan automáticamente (tsx watch)

3. **Agregar dependencias**:
```bash
# Frontend
docker-compose -f docker-compose.dev.yml exec frontend npm install nueva-libreria

# Backend
docker-compose -f docker-compose.dev.yml exec backend npm install nueva-libreria
```

### Despliegue a Producción

1. **Construir imágenes**:
```bash
docker-compose build
```

2. **Probar localmente**:
```bash
docker-compose up -d
```

3. **Subir a un registro (opcional)**:
```bash
# Etiquetar imágenes
docker tag biblioteca-backend:latest tu-usuario/biblioteca-backend:v1.0.0
docker tag biblioteca-frontend:latest tu-usuario/biblioteca-frontend:v1.0.0

# Subir
docker push tu-usuario/biblioteca-backend:v1.0.0
docker push tu-usuario/biblioteca-frontend:v1.0.0
```

## 🌐 Variables de Entorno

### Backend

Configuradas en `docker-compose.yml`:

```yaml
DATABASE_URL: "postgresql://user:password@db:5432/mis_libros"
PORT: 3000
NODE_ENV: production
```

Para cambiarlas, edita el `docker-compose.yml` o crea un archivo `.env`:

```env
DATABASE_URL=postgresql://user:password@db:5432/mis_libros
PORT=3000
NODE_ENV=production
```

### Frontend

```yaml
VITE_API_URL: "http://localhost:3000"
```

**Nota**: Las variables `VITE_*` deben configurarse en tiempo de **build**, no runtime.

## 🔍 Troubleshooting

### El backend no conecta con la base de datos

```bash
# Verificar que la DB esté corriendo
docker-compose ps

# Ver logs de la DB
docker-compose logs db

# Verificar conectividad desde el backend
docker-compose exec backend ping db
```

### El frontend no conecta con el backend

1. Verifica que la URL del API sea correcta en el código del frontend
2. Asegúrate de que el backend esté corriendo: `docker-compose ps`
3. Prueba el endpoint directamente: `curl http://localhost:3000/api/dashboard`

### Los cambios no se reflejan en desarrollo

```bash
# Verificar que estés usando docker-compose.dev.yml
docker-compose -f docker-compose.dev.yml ps

# Reconstruir y reiniciar
docker-compose -f docker-compose.dev.yml up -d --build
```

### Error de permisos en volúmenes

```bash
# En Linux/Mac, dar permisos
sudo chown -R $USER:$USER ./server/node_modules
sudo chown -R $USER:$USER ./client/node_modules
```

### Limpiar todo y empezar de cero

```bash
# Detener y eliminar TODO (contenedores, volúmenes, imágenes)
docker-compose down -v --rmi all

# Reconstruir desde cero
docker-compose up -d --build
```

## 📊 Healthchecks

El servicio de base de datos incluye un healthcheck que verifica que PostgreSQL esté listo antes de iniciar el backend:

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U user -d mis_libros"]
  interval: 10s
  timeout: 5s
  retries: 5
```

## 🎯 Mejores Prácticas

1. **Desarrollo**: Usa siempre `docker-compose.dev.yml` para hot reload
2. **Producción**: Usa `docker-compose.yml` con builds optimizados
3. **Backups**: Realiza backups regulares de la base de datos
4. **Logs**: Usa `docker-compose logs -f` para monitorear
5. **Limpieza**: Ejecuta `docker system prune` periódicamente para liberar espacio
6. **Secrets**: Nunca commits archivos `.env` con credenciales reales

## 🚢 Desplegar en Servidores

### Con Docker en un VPS

```bash
# En el servidor
git clone tu-repo
cd biblioteca

# Configurar variables de entorno
nano docker-compose.yml  # Editar credenciales

# Iniciar
docker-compose up -d

# Configurar SSL con Nginx reverse proxy (recomendado)
```

### Con Docker Swarm

```bash
docker swarm init
docker stack deploy -c docker-compose.yml biblioteca
```

### Con Kubernetes

Convertir el `docker-compose.yml` usando Kompose:

```bash
kompose convert
kubectl apply -f .
```

---

**Nota**: Esta configuración está lista para desarrollo. Para producción, considera usar secrets de Docker, variables de entorno seguras y un reverse proxy con SSL.
