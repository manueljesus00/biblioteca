# 🚀 Guía de Despliegue en AWS - Biblioteca

Esta guía te ayudará a desplegar la aplicación completa en AWS EC2 con RDS opcional.

## 📋 Prerrequisitos AWS

1. **Cuenta de AWS** activa
2. **EC2 Instance** - Ubuntu 22.04 LTS (t2.micro es suficiente para empezar)
3. **Security Group** configurado con los siguientes puertos:
   - Puerto 22 (SSH) - Para conexión
   - Puerto 80 (HTTP) - Frontend
   - Puerto 3000 (TCP) - Backend API
   - Puerto 5432 (TCP) - PostgreSQL (solo si usas contenedor)

## 🔧 Configuración del Security Group

En tu Security Group de EC2, añade estas reglas de entrada:

| Tipo | Protocolo | Puerto | Origen | Descripción |
|------|-----------|--------|--------|-------------|
| SSH | TCP | 22 | Tu IP | Acceso SSH |
| HTTP | TCP | 80 | 0.0.0.0/0 | Frontend público |
| Custom TCP | TCP | 3000 | 0.0.0.0/0 | Backend API |
| PostgreSQL | TCP | 5432 | Security Group ID | Base de datos (opcional) |

## 📦 Opción 1: Despliegue Rápido con Docker

### Paso 1: Conectar a EC2

```bash
ssh -i tu-clave.pem ubuntu@TU_IP_PUBLICA
```

### Paso 2: Instalar Docker

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
sudo apt install -y docker.io docker-compose

# Añadir usuario al grupo docker
sudo usermod -aG docker $USER

# Aplicar cambios (o reconectar SSH)
newgrp docker
```

### Paso 3: Clonar repositorio

```bash
git clone https://github.com/tu-usuario/biblioteca.git
cd biblioteca
```

### Paso 4: Configurar variables de entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar con tu IP pública de EC2
nano .env
```

**Contenido de `.env`**:
```env
# ⚠️ IMPORTANTE: Reemplaza con tu IP pública de EC2
VITE_API_URL=http://3.123.45.67:3000

# Base de datos (usar los valores por defecto o tu RDS)
POSTGRES_USER=user
POSTGRES_PASSWORD=TU_PASSWORD_SEGURO
POSTGRES_DB=mis_libros

PORT=3000
NODE_ENV=production
```

### Paso 5: Desplegar

```bash
# Construir imágenes con la configuración
docker-compose build

# Iniciar servicios
docker-compose up -d

# Verificar que todo esté corriendo
docker-compose ps

# Ver logs si hay problemas
docker-compose logs -f
```

### Paso 6: Acceder

- **Frontend**: `http://TU_IP_PUBLICA`
- **Backend API**: `http://TU_IP_PUBLICA:3000/api/dashboard`

## 🗄️ Opción 2: Con AWS RDS (Producción Recomendada)

### Por qué usar RDS:
- ✅ Backups automáticos
- ✅ Alta disponibilidad
- ✅ Escalabilidad
- ✅ Mejor rendimiento

### Paso 1: Crear RDS PostgreSQL

1. Ve a **RDS** en AWS Console
2. Clic en **Create database**
3. Selecciona **PostgreSQL**
4. **Template**: Free tier (para empezar)
5. **DB Instance identifier**: `biblioteca-db`
6. **Master username**: `admin`
7. **Master password**: (guarda esto)
8. **DB instance class**: db.t3.micro
9. **Storage**: 20 GB
10. **VPC**: La misma que tu EC2
11. **Public access**: No (mejor seguridad)
12. **VPC security group**: Crear nuevo o usar existente
13. **Database name**: `biblioteca`

### Paso 2: Configurar Security Group de RDS

El Security Group de RDS debe permitir conexiones desde el Security Group de EC2:

```
Tipo: PostgreSQL
Puerto: 5432
Origen: [Security Group de tu EC2]
```

### Paso 3: Obtener endpoint de RDS

En la consola de RDS, copia el **Endpoint** (algo como: `biblioteca-db.abc123.us-east-1.rds.amazonaws.com`)

### Paso 4: Modificar `.env` en EC2

```bash
cd biblioteca
nano .env
```

```env
# URL del frontend
VITE_API_URL=http://TU_IP_EC2:3000

# ⚠️ Conexión a RDS
DATABASE_URL=postgresql://admin:TU_PASSWORD@biblioteca-db.abc123.us-east-1.rds.amazonaws.com:5432/biblioteca

PORT=3000
NODE_ENV=production
```

### Paso 5: Modificar docker-compose.yml

Comenta el servicio `db` ya que usarás RDS:

```bash
nano docker-compose.yml
```

Comenta estas líneas:

```yaml
# No necesitamos el contenedor de PostgreSQL
#  db:
#    image: postgres:15-alpine
#    ...todo el bloque db...

  backend:
    # ... resto igual
    depends_on:
      # db:  # <-- Comentar esta dependencia
      #   condition: service_healthy
```

### Paso 6: Desplegar

```bash
# Reconstruir solo backend y frontend
docker-compose build backend frontend

# Iniciar
docker-compose up -d backend frontend

# Ejecutar migraciones en RDS
docker-compose exec backend npx prisma migrate deploy

# Verificar
docker-compose logs -f backend
```

## 🌐 Opción 3: Con Dominio (Avanzado)

### Paso 1: Asociar Elastic IP

1. Ve a **Elastic IPs** en AWS
2. Asigna una nueva IP
3. Asóciala a tu instancia EC2

### Paso 2: Configurar DNS

En tu proveedor de dominios (GoDaddy, Namecheap, Route53):

```
A Record: @ → TU_ELASTIC_IP
A Record: api → TU_ELASTIC_IP
```

Espera 5-30 minutos para propagación DNS.

### Paso 3: Configurar Nginx Reverse Proxy

```bash
# En EC2, instalar Nginx
sudo apt install nginx

# Crear configuración
sudo nano /etc/nginx/sites-available/biblioteca
```

**Contenido**:
```nginx
server {
    listen 80;
    server_name tudominio.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Activar sitio
sudo ln -s /etc/nginx/sites-available/biblioteca /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Paso 4: Actualizar .env

```env
VITE_API_URL=https://tudominio.com/api
```

### Paso 5: SSL con Certbot (Recomendado)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com
```

## 🔍 Verificación y Troubleshooting

### Verificar que todo funciona

```bash
# Estado de contenedores
docker-compose ps

# Logs del backend
docker-compose logs backend

# Logs del frontend
docker-compose logs frontend

# Probar API directamente
curl http://localhost:3000/api/dashboard

# Verificar conectividad a RDS (si aplica)
docker-compose exec backend npx prisma db pull
```

### Problemas comunes

**Error: Cannot connect to database**
```bash
# Verificar que el Security Group de RDS permite conexiones desde EC2
# Verificar que el DATABASE_URL es correcto
docker-compose logs backend
```

**Error: ERR_CONNECTION_REFUSED en el frontend**
```bash
# Verificar que construiste con la URL correcta
echo $VITE_API_URL
docker-compose build frontend --no-cache
docker-compose up -d frontend
```

**Puertos cerrados**
```bash
# Verificar Security Group en AWS Console
# Verificar que Docker está escuchando
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :3000
```

## 📊 Monitoreo

```bash
# Ver uso de recursos
docker stats

# Ver logs en tiempo real
docker-compose logs -f

# Reiniciar servicios
docker-compose restart

# Actualizar aplicación
git pull
docker-compose build
docker-compose up -d
```

## 💾 Backups

### Backup de base de datos

```bash
# Si usas contenedor de PostgreSQL
docker-compose exec db pg_dump -U user mis_libros > backup.sql

# Si usas RDS
pg_dump -h biblioteca-db.abc123.us-east-1.rds.amazonaws.com \
  -U admin -d biblioteca > backup.sql
```

### Restaurar backup

```bash
# Contenedor
docker-compose exec -T db psql -U user mis_libros < backup.sql

# RDS
psql -h biblioteca-db.abc123.us-east-1.rds.amazonaws.com \
  -U admin -d biblioteca < backup.sql
```

## 🎯 Optimizaciones de Producción

1. **Usar HTTPS** con Let's Encrypt
2. **Configurar CloudFront** para CDN
3. **Usar RDS Multi-AZ** para alta disponibilidad
4. **Configurar Auto Scaling** para el EC2
5. **Implementar CloudWatch** para logs y métricas
6. **Usar Secrets Manager** para credenciales

---

**¿Necesitas ayuda?** Revisa los logs con `docker-compose logs -f` y verifica tu Security Group en AWS.
