FROM node:22-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend ./
COPY config /build/config
COPY vendor /build/vendor
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY backend /app/backend
COPY config /app/config
COPY --from=frontend-build /build/frontend/dist /app/static
ENV PYTHONPATH=/app/backend
ENV PROSCENIUM_REPO_ROOT=/app
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
