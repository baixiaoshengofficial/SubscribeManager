FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app/backend
ENV NODE_ENV=production

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./
COPY version.json ../version.json
COPY --from=frontend-builder /app/frontend/dist ../frontend/dist

VOLUME ["/app/data"]
EXPOSE 3000
CMD ["node", "index.js"]
