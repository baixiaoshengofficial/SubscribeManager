FROM node:20-alpine
WORKDIR /app/backend
ENV NODE_ENV=production

RUN apk add --no-cache wget

COPY backend/package*.json ./
# Optional Node flags apply only while installing dependencies (e.g. under QEMU).
ARG NODE_BUILD_OPTIONS=""
RUN NODE_OPTIONS="$NODE_BUILD_OPTIONS" npm ci --omit=dev

COPY backend/ ./
COPY config ../config
COPY version.json ../version.json

VOLUME ["/app/backend/data"]
CMD ["node", "index.js"]
