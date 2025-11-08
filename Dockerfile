# ---- Base Node ----
# Etapa 1: Construcción de la aplicación
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para el build)
RUN npm install

# Copiar el resto de los archivos del proyecto
COPY . .

# Compilar la aplicación
RUN npm run build

# ---- Production ----
# Etapa 2: Creación de la imagen de producción final
FROM node:20-alpine
WORKDIR /usr/src/app

# Copiar package.json para instalar solo dependencias de producción
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm install --only=production && npm cache clean --force

# Copiar la aplicación compilada (la carpeta dist) desde la etapa 'builder'
COPY --from=builder /usr/src/app/dist ./dist

# Exponer el puerto en el que correrá la aplicación
EXPOSE 3022

# Comando para iniciar la aplicación en producción
CMD [ "node", "dist/main" ]