"""Write the API's OpenAPI schema to a file (default: stdout).

Used by `npm run gen:types` in the frontend. Needs no database connection: building the
schema never touches the DB, but settings still load, so DATABASE_URL must be set to any
value (a dummy is fine).

    uv run python scripts/export_openapi.py openapi.json
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# Running a file by path puts scripts/ on sys.path, not the backend root.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Settings need a DATABASE_URL to load; the schema export never connects to it.
os.environ.setdefault("DATABASE_URL", "postgresql://user:pass@localhost:5432/unused")

from app.main import create_app  # noqa: E402


def main() -> None:
    schema = create_app().openapi()
    text = json.dumps(schema, indent=2, sort_keys=True) + "\n"
    if len(sys.argv) > 1:
        with open(sys.argv[1], "w", encoding="utf-8", newline="\n") as fh:
            fh.write(text)
    else:
        sys.stdout.write(text)


if __name__ == "__main__":
    main()
