# Etapa de build: compila la SPA con Angular.
FROM node:24-alpine AS build

WORKDIR /workspace

# package-lock.json fija las versiones, asi que se copia antes que el codigo:
# `npm ci` solo se vuelve a ejecutar cuando cambian las dependencias.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Etapa de runtime: nginx sirve los archivos estaticos ya compilados.
FROM nginx:alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist/bancaFront/browser /usr/share/nginx/html

EXPOSE 80

# 127.0.0.1 en vez de localhost: en Alpine `localhost` resuelve a ::1 y nginx
# escucha solo en IPv4. `-O` es la opcion corta que acepta el wget de busybox.
HEALTHCHECK --interval=5s --timeout=5s --start-period=10s --retries=10 \
    CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]