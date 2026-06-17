# Deployment Package Manifest

Include:

- `backend/*.py`
- `data/samples/*.xlsx`
- `prototypes/student-mobile-v1.2/**`
- `requirements.txt`
- `deploy/**`
- `.deployignore`
- `.gitignore`
- `README.md`

Exclude:

- `.git/`
- `.venv/`
- `dist/`
- `docs/superpowers/`
- `backend/app.db`
- `*.log`
- `__pycache__/`
- `*.pyc`

Server-owned runtime files:

- `/opt/ai-tutor/backend/app.db`
- `/opt/ai-tutor/backups/*.db.gz`

Do not overwrite server-owned runtime files during code updates.
