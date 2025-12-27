# Dockerfile para el Backend (Node.js + Express + Prisma)

# Etapa 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm ci

# Copiar el resto del código
COPY . .

# Generar Prisma Client
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Etapa 2: Producción
FROM node:20-alpine

WORKDIR /app

# Instalar OpenSSL (requerido por Prisma)
RUN apk add --no-cache openssl

# Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar solo dependencias de producción
RUN npm ci --only=production

# Instalar Prisma CLI como devDependency (necesario para migraciones)
RUN npm install prisma --save-dev

# Copiar Prisma Client generado desde builder (con binaryTargets correctos)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copiar código compilado
COPY --from=builder /app/dist ./dist

# Exponer el puerto del backend
EXPOSE 3000

# Script de inicio: ejecutar migraciones y luego iniciar servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]