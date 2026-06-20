"""Scan staged/untracked text files for likely secret patterns. Exit 1 if found."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("Groq API key", re.compile(r"gsk_[A-Za-z0-9]{20,}")),
    ("JWT / bearer token", re.compile(r"eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}")),
]

SKIP_SUFFIXES = {".pkl", ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".woff", ".woff2"}
SKIP_DIRS = {"node_modules", ".next", ".git", "__pycache__", "venv", ".venv", "report_cache", "bullet_cache"}


def git_tracked_and_staged_paths() -> list[Path]:
    result = subprocess.run(
        ["git", "ls-files", "-co", "--exclude-standard"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    paths: list[Path] = []
    for line in result.stdout.splitlines():
        if not line.strip():
            continue
        # format: "H path" or "S path" etc.
        parts = line.split(maxsplit=1)
        if len(parts) == 2:
            paths.append(ROOT / parts[1])
    return paths


def scan_file(path: Path) -> list[str]:
    if path.suffix.lower() in SKIP_SUFFIXES:
        return []
    if any(part in SKIP_DIRS for part in path.parts):
        return []
    if path.name.endswith(".env") or path.name.endswith(".env.local"):
        return [f"{path}: .env files must not be committed"]

    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return []

    hits: list[str] = []
    for label, pattern in PATTERNS:
        if pattern.search(text):
            hits.append(f"{path}: possible {label}")
    return hits


def main() -> int:
    paths = git_tracked_and_staged_paths()
    if not paths:
        print("No git files to scan.")
        return 0

    violations: list[str] = []
    for path in paths:
        violations.extend(scan_file(path))

    if violations:
        print("Secret scan failed:")
        for v in violations:
            print(f"  - {v}")
        return 1

    print(f"Secret scan passed ({len(paths)} files).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
