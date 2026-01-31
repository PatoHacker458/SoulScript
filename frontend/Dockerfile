# ETAPA 1: Construcción (Node)
FROM node:18-alpine as build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
# Aquí es donde ocurrirá la magia de la URL pública luego
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ETAPA 2: Servidor Web (Nginx)
FROM nginx:alpine
# Copiamos los archivos estáticos generados al servidor Nginx
COPY --from=build /app/dist /usr/share/nginx/html
# Configuración básica de Nginx para React (SPA)
RUN echo 'server { \
    listen 80; \
    location / { \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    try_files $uri $uri/ /index.html; \
    } \
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]