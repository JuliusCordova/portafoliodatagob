FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/apps/api/src \
    PORT=8080

WORKDIR /app

COPY apps/api/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /tmp/requirements.txt

COPY apps/api/src ./apps/api/src
COPY data ./data
COPY docs/api ./docs/api

EXPOSE 8080

# Feature 56 imports and extends atlas_datagob.api.feature54_app:app; all Feature 54 routes remain active.
CMD ["sh", "-c", "uvicorn atlas_datagob.api.feature56_app:app --host 0.0.0.0 --port ${PORT:-8080}"]
