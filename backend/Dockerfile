# Hugging Face Space: push backend/ as the Space repo root (git subtree push).
# See DEPLOYMENT.md or HF setup notes in README.md.

FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 user

WORKDIR /app

COPY --chown=user requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=user . .

USER user
ENV HOME=/home/user
ENV PATH="/home/user/.local/bin:$PATH"

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
