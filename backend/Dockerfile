FROM node:20-alpine
WORKDIR /app/backend
ENV NODE_ENV=production

RUN apk add --no-cache wget

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./
COPY config ../config
COPY version.json ../version.json

VOLUME ["/app/data"]
CMD ["node", "index.js"]
