FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci --workspace=server --include-workspace-root=false
COPY server server
RUN npm run build -w server

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci --omit=dev --workspace=server --include-workspace-root=false && npm cache clean --force
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/assets server/assets
USER node
EXPOSE 3000
CMD ["node", "server/dist/main.js"]
