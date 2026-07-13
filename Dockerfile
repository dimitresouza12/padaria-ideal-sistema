# Build — instala deps, roda typecheck + build do Vite.
# VITE_* precisam chegar como ARG: o Vite grava esses valores no JS nesta etapa
# (build-time), não em runtime — configure-os como build args no EasyPanel.
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime — nginx só serve os arquivos estáticos gerados.
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
