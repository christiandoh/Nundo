# NUNDO Frontend — Build React (Vite) then serve with nginx
# Stage 1: build
FROM node:26-alpine AS builder

WORKDIR /app

# Build args: API base URL (empty = same origin, nginx will proxy /api)
ARG VITE_API_URL=
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json package-lock.json* ./
RUN npm ci 2>/dev/null || npm install

COPY . .
RUN npm run build

# Stage 2: nginx
FROM nginx:alpine AS runner

# Supprimer la config par défaut
RUN rm /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
