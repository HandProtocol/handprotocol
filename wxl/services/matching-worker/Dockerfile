FROM python:3.12-slim
WORKDIR /app
COPY services/matching-worker/pyproject.toml ./
COPY services/matching-worker/src ./src
RUN pip install --no-cache-dir .
RUN useradd --create-home worker
USER worker
CMD ["python", "-m", "wxl_food_worker.main"]
