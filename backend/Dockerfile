# Hugging Face Space: push backend/ as the Space repo root (git subtree push).
# Large artifacts (bm25_index.pkl, graph.json) are fetched from GitHub at build time.

FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 user

WORKDIR /app

COPY --chown=user requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=user . .

ARG GITHUB_REPO=Aditya-tec/finsightai
ARG GITHUB_REF=main
RUN curl -fsSL -o bm25_index.pkl \
      "https://github.com/${GITHUB_REPO}/raw/${GITHUB_REF}/backend/bm25_index.pkl" \
    && curl -fsSL -o graph.json \
      "https://github.com/${GITHUB_REPO}/raw/${GITHUB_REF}/backend/graph.json" \
    && chown user:user bm25_index.pkl graph.json

USER user
ENV HOME=/home/user
ENV PATH="/home/user/.local/bin:$PATH"

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
