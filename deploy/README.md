# AI Tutor MVP Deployment Pack

This folder contains the minimal deployment assets for the internal beta server.

## What To Upload

Upload the repository contents, excluding patterns in `.deployignore`.

Keep these:

- `backend/`
- `data/samples/`
- `prototypes/student-mobile-v1.2/`
- `requirements.txt`
- `deploy/`

Do not upload these:

- `.venv/`
- `.git/`
- `backend/app.db`
- `*.log`
- `__pycache__/`

## First Server Setup

Recommended server path:

```bash
/opt/ai-tutor
```

Install system packages:

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-pip nginx
```

Create app directory:

```bash
sudo mkdir -p /opt/ai-tutor
sudo chown -R $USER:$USER /opt/ai-tutor
```

Upload or unzip the deployment package into `/opt/ai-tutor`.

Create Python environment:

```bash
cd /opt/ai-tutor
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

Initialize SQLite only once:

```bash
cd /opt/ai-tutor
. .venv/bin/activate
python -m backend.seed_db
```

Important: after real beta usage starts, do not run `python -m backend.seed_db` again unless you intentionally want to reset beta data.

## Smoke Test

Start manually first:

```bash
cd /opt/ai-tutor
. .venv/bin/activate
uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

In another terminal:

```bash
curl http://127.0.0.1:8000/health
```

Expected:

```json
{"status":"ok"}
```

## systemd Service

Copy service file:

```bash
sudo cp /opt/ai-tutor/deploy/ai-tutor.service /etc/systemd/system/ai-tutor.service
sudo systemctl daemon-reload
sudo systemctl enable ai-tutor
sudo systemctl start ai-tutor
sudo systemctl status ai-tutor
```

View logs:

```bash
journalctl -u ai-tutor -f
```

## Nginx

Copy Nginx config:

```bash
sudo cp /opt/ai-tutor/deploy/nginx-ai-tutor.conf /etc/nginx/sites-available/ai-tutor
sudo ln -s /etc/nginx/sites-available/ai-tutor /etc/nginx/sites-enabled/ai-tutor
sudo nginx -t
sudo systemctl reload nginx
```

If you have a domain, replace `_` in `server_name _;` with your domain.

## Daily Backup

Manual backup:

```bash
bash /opt/ai-tutor/deploy/backup-db.sh
```

Cron example, runs at 03:15 every day:

```bash
15 3 * * * /bin/bash /opt/ai-tutor/deploy/backup-db.sh >/var/log/ai-tutor-backup.log 2>&1
```

## Beta Test Codes

Seeded codes:

- `demo-a01`: existing user `10001`
- `demo-b01`: existing user `10002`
- `new-a01`: unused, creates a new user on first use
- `new-b01`: unused, creates a new user on first use

To add more codes during beta, insert rows into `test_access_codes`.

## Update Code Without Resetting Data

When uploading a new package:

1. Stop service: `sudo systemctl stop ai-tutor`
2. Back up `/opt/ai-tutor/backend/app.db`
3. Replace code files
4. Do not replace `backend/app.db`
5. Install any new requirements
6. Start service: `sudo systemctl start ai-tutor`
7. Smoke test: `curl http://127.0.0.1:8000/health`

Current frontend served by `backend/main.py`:

- `prototypes/student-mobile-v1.2/`

The bundled systemd service runs as `ubuntu`, matching the current Tencent Cloud server setup so SQLite can write to `/opt/ai-tutor/backend/app.db`.
