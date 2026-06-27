# Stage 1: compile TypeScript to dist/
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Root workspace files (so `npm ci -w backend` can resolve from the root lockfile)
COPY package*.json ./
# This workspace's manifest + tsconfig
COPY backend/package.json backend/tsconfig*.json ./backend/
# The @rqv/shared workspace (backend depends on it)
COPY shared/package.json shared/tsconfig*.json ./shared/
COPY shared/src ./shared/src

# Install deps (incl. devDependencies) for backend and its workspace dep.
RUN npm ci --workspace=backend --workspace=@rqv/shared --include-workspace-root=false

# Build @rqv/shared first if it has a build step
RUN npm run --workspace=@rqv/shared build --if-present

# Source last so editing src/ doesn't bust the install layer.
COPY backend/src ./backend/src

RUN npm run --workspace=backend build

# Stage 2: slim runtime image
FROM node:22-bookworm-slim
WORKDIR /app

# Production deps only — no TypeScript, no jest, no ts-node-dev.
COPY package*.json ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
RUN npm ci --workspace=backend --workspace=@rqv/shared --include-workspace-root=false --omit=dev

# Copy the compiled JS (and shared's compiled JS, if any) + the ONNX model.
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/shared ./shared
COPY backend/models ./backend/models

EXPOSE 3000
CMD ["node","backend/dist/server.js"]
