# Build context is the repository root (npm workspaces), see the
# `build.context`/`build.dockerfile` settings in the root docker-compose.yml.

# ---- Build stage --------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /app

# Only the workspace manifests are needed to resolve dependencies via the
# single root package-lock.json (backend/package.json must be present too so
# npm recognizes the full workspaces list, even though its deps aren't
# installed here).
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN npm ci --workspace=frontend

COPY frontend ./frontend

WORKDIR /app/frontend

# Read by frontend/src/i18n/index.js via import.meta.env at build time.
ARG VITE_DEFAULT_LOCALE=en
ENV VITE_DEFAULT_LOCALE=${VITE_DEFAULT_LOCALE}

# Read by frontend/src/components/AppHeader.vue via import.meta.env at build time.
ARG VITE_APP_TITLE="Invite to Party"
ENV VITE_APP_TITLE=${VITE_APP_TITLE}

RUN npm run build

# ---- Runtime stage -------------------------------------------------------
FROM nginx:alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
