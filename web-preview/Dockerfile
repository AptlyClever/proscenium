# syntax=docker/dockerfile:1
# Build context: hail-overlay-poc/ (parent of web-preview)
FROM node:20-alpine

WORKDIR /srv/web-preview

COPY shared /srv/shared
COPY web-preview/package.json ./
COPY web-preview/server.js ./
COPY web-preview/index.html ./
COPY web-preview/styles.css ./
COPY web-preview/smoke.js ./
COPY web-preview/smoke-lan.js ./
COPY web-preview/js ./js

ENV HAIL_PREVIEW_HOST=0.0.0.0
ENV HAIL_PREVIEW_PORT=8196

EXPOSE 8196

CMD ["node", "server.js"]
