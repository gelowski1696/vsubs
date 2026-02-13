# Setup

## Local Development Quickstart

### Prerequisites
- Node.js 20+

### Install dependencies
```bash
npm install
```

### Backend (SQLite local)
1. Copy local env:
```bash
cp backend/.env.example backend/.env
```
2. Generate Prisma client:
```bash
npm run -w backend prisma:generate
```
3. Sync schema:
```bash
npm run -w backend prisma:migrate
```
4. Seed local DB:
```bash
npm run -w backend prisma:seed
```
5. Start backend:
```bash
npm run -w backend start:dev
```

Seeded admin credentials:
- Email: `admin@vmjam.com`
- Password: `Admin123!`

### OpenAPI + Swagger (local)
- Swagger UI: `http://localhost:3003/docs`
- OpenAPI JSON: `http://localhost:3003/docs/openapi.json`

### Mobile (local)
```bash
npm run -w mobile start
```

After native plugin changes:
```bash
npm run -w mobile cap:sync
```

### SDK build
```bash
npm run -w packages/subscriptions-client build
```

## Ubuntu VPS Docker Deployment (SQLite, Port 3003)

### 1) Prepare VPS
1. SSH into VPS as sudo-capable user.
2. Install Docker Engine + Docker Compose plugin:
```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```
3. Enable/start Docker:
```bash
sudo systemctl enable docker
sudo systemctl start docker
```
4. Open firewall:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 3003/tcp
sudo ufw enable
```

### 2) Pull project on VPS (Git workflow)
```bash
sudo mkdir -p /opt/vsubs
sudo chown -R $USER:$USER /opt/vsubs
cd /opt/vsubs
git clone <YOUR_REPO_URL> .
```

For future updates:
```bash
cd /opt/vsubs
git pull
```

### 3) Configure production env
1. Create env file:
```bash
cp backend/.env.production.example backend/.env.production
```
2. Edit `backend/.env.production` and set secure values:
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `MOBILE_UPDATE_TOKEN_SECRET`
3. Keep:
- `PORT=3003`
- `DATABASE_URL=file:/data/subman.db`
- `SEED_ON_BOOT=false` (except first seed run)
- `CORS_ORIGINS=*` for temporary no-domain phase

### 4) First deployment
```bash
cd /opt/vsubs
docker compose up -d --build
docker compose ps
docker compose logs -f backend
```

Health checks:
```bash
curl http://127.0.0.1:3003/health
curl http://<VPS_IP>:3003/health
```

### 5) One-time seed process
1. Temporarily set `SEED_ON_BOOT=true` in `backend/.env.production`.
2. Restart:
```bash
docker compose up -d
docker compose logs -f backend
```
3. Set `SEED_ON_BOOT=false` and restart:
```bash
docker compose up -d
```

Auth smoke test:
```bash
curl -X POST "http://<VPS_IP>:3003/v1/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-Client-Id: subman-mobile" \
  -d "{\"email\":\"admin@vmjam.com\",\"password\":\"Admin123!\"}"
```

### 6) Post-deploy verification
```bash
curl http://<VPS_IP>:3003/docs/openapi.json
```

Open in browser:
- `http://<VPS_IP>:3003/docs`
- `http://<VPS_IP>:3003/docs/openapi.json`

Persistence check:
1. Create test data via API.
2. Restart:
```bash
docker compose restart backend
```
3. Confirm data still exists.

### 7) Ongoing update workflow
```bash
cd /opt/vsubs
git pull
docker compose up -d --build
docker compose logs -f backend
curl http://127.0.0.1:3003/health
```

Rollback:
```bash
cd /opt/vsubs
git checkout <last-good-tag-or-commit>
docker compose up -d --build
```

### 8) Backup and recovery
Backup DB:
```bash
docker compose exec backend sh -c "cp /data/subman.db /data/subman-backup-$(date +%Y%m%d-%H%M%S).db"
```

Restore DB:
1. Stop backend:
```bash
docker compose stop backend
```
2. Replace `/data/subman.db` with backup file.
3. Start backend:
```bash
docker compose up -d backend
```
4. Verify `/health` and login.

### 9) Hardening follow-up (next phase)
1. Replace `CORS_ORIGINS=*` with explicit origins.
2. Add Nginx/Caddy reverse proxy with HTTPS.
3. Restrict firewall to required ports only.
4. Add uptime monitoring on `/health`.
5. Add log rotation + disk monitoring for Docker volumes.
