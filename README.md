# SubscribeManager

[中文](https://github.com/baixiaoshengofficial/SubscribeManager/blob/main/README_ZH.md) | EN

## Repository

[SubscribeManager](https://github.com/baixiaoshengofficial/SubscribeManager) Give it a Star

### Star History

[![Star History Chart](https://api.star-history.com/svg?repos=baixiaoshengofficial/SubscribeManager&type=Date)](https://star-history.com/#baixiaoshengofficial/SubscribeManager&Date)

### Changelog

[View full changelog →](https://github.com/baixiaoshengofficial/SubscribeManager/blob/main/CHANGELOG.md)

### Overview

SubscribeManager is a lightweight and simple proxy node subscription management system.

Deploy locally via Docker Compose, simple and easy to migrate.

Provides an intuitive web interface and supports multiple proxy protocols and subscription formats.

## 🌐 Live Demo

[SubscribeManager Sponsor By FOSSVPS](https://subscribe.baixiaosheng.de/admin)
**username:** `admin`
**password:** `admin`
**path:** `admin`

## ✨ Features

-   **Multiple Protocols Supported**: SS, VMess, Trojan, VLESS, SOCKS5, Snell,
    Hysteria2, Tuic
-   **Subscription Management**:
    -   Create multiple subscriptions
    -   Custom paths
    -   Bulk import
    -   Drag-and-drop sorting
-   **Multiple Subscription Formats**:
    -   Raw
    -   Base64 (`/v2ray`)
    -   Surge (`/surge`)
    -   Clash (`/clash`)
-   **Advanced Clash Features**:
    -   Built-in default template with 3900+ rules
    -   Automatic rule expansion from rule-providers
    -   Compatible with ClashMeta and ClashX
    -   Subconvert API integration for custom templates
-   **Security Features**:
    -   Admin login authentication
    -   Session management
    -   Secure cookies
-   **Interface Design**:
    -   Responsive design
    -   Mobile-friendly

## 🚀 Deployment Guide

In production, the **backend serves both the API and the built admin UI** (`frontend/dist`). Choose one of the following deployment methods.

### Prerequisites

**Requirements**

| Method | Requirements |
|--------|----------------|
| Build from source | Node.js **20+**, npm |
| Docker (single container) | Docker **20+** |
| Docker Compose | Docker **20+**, Docker Compose **v2+** |

**Environment variables**

Copy and edit `.env` at the project root:

```bash
cp .env.example .env
```

```ini
# Required — change defaults in production
SESSION_SECRET=use-a-long-random-string
ADMIN_PATH=admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=use-a-strong-password

# Service port (source and Docker)
PORT=3000

# Database path
# Source deploy: relative to project root
DB_PATH=./data/subscriptions.db
# Docker: fixed inside container; mount host ./data to /app/data

# Optional: public URL when remote Subconverter cannot reach localhost
# PUBLIC_BASE_URL=https://sub.example.com
```

Create the data directory for source deployments (Compose / `docker run` create the volume directory on first start):

```bash
mkdir -p data
```

**Access URL**

After deployment, open:

```text
http://<host>:<PORT>/
```

The admin UI and public subscription links are served on this port. `ADMIN_PATH` is used in API config and is **not** a URL path prefix.

---

### Option 1: Build from source

Run Node directly on the host or a VPS without Docker.

```bash
# 1. Clone
git clone https://github.com/baixiaoshengofficial/SubscribeManager.git
cd SubscribeManager

# 2. Configure .env (see above)
cp .env.example .env
# edit .env

# 3. Install dependencies and build frontend
make install
make frontend-build

# 4. Start backend (reads root .env, serves frontend/dist)
cd backend && npm start
```

Or use Makefile shortcuts (after `make install` and `make frontend-build`):

```bash
make backend-dev
```

**Common commands**

| Command | Description |
|---------|-------------|
| `make install` | Install `backend/` and `frontend/` dependencies |
| `make frontend-build` | Build frontend to `frontend/dist` |
| `make backend-dev` | Start production backend (port from `.env` `PORT`) |
| `make test` | Run backend tests |
| `make check` | Tests + frontend build verification |

**Notes**

- After frontend changes, run `make frontend-build` and restart the backend.
- Database defaults to `./data/subscriptions.db` (controlled by `DB_PATH`).
- For **local development** with hot reload and split ports, see [Frontend / backend development](#-frontend--backend-development) below.

---

### Option 2: Docker (single container)

Use when you prefer `docker run` without Compose. The image includes the built frontend and backend.

**Build image**

```bash
git clone https://github.com/baixiaoshengofficial/SubscribeManager.git
cd SubscribeManager
cp .env.example .env
# edit .env

docker build -t subscribe-manager:local .
```

**Run container**

```bash
mkdir -p data

docker run -d \
  --name subscribe-manager \
  --restart unless-stopped \
  -p 3000:3000 \
  -v "$(pwd)/data:/app/data" \
  --env-file .env \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e DB_PATH=/app/data/subscriptions.db \
  subscribe-manager:local
```

**Custom host port** (e.g. map host 8080):

```bash
docker run -d \
  --name subscribe-manager \
  --restart unless-stopped \
  -p 8080:3000 \
  -v "$(pwd)/data:/app/data" \
  --env-file .env \
  -e NODE_ENV=production \
  -e DB_PATH=/app/data/subscriptions.db \
  subscribe-manager:local
```

**Operations**

```bash
docker logs -f subscribe-manager    # logs
docker stop subscribe-manager       # stop
docker rm subscribe-manager         # remove container
```

**Pre-built image from Docker Hub** (no local build):

```bash
docker pull knighttools/subscribe-manager:latest

docker run -d \
  --name subscribe-manager \
  --restart unless-stopped \
  -p 3000:3000 \
  -v "$(pwd)/data:/app/data" \
  --env-file .env \
  -e NODE_ENV=production \
  -e DB_PATH=/app/data/subscriptions.db \
  knighttools/subscribe-manager:latest
```

---

### Option 3: Docker Compose

Recommended for long-running production deployments. Configuration lives in `docker-compose.yaml`.

**Pull image from Docker Hub (recommended)**

`docker-compose.yaml` defaults to `knighttools/subscribe-manager:latest`:

```bash
git clone https://github.com/baixiaoshengofficial/SubscribeManager.git
cd SubscribeManager
cp .env.example .env
# edit .env

mkdir -p data
docker compose up -d
```

Makefile equivalent:

```bash
make up
```

**Build image locally from source**

`docker-compose.override.yaml` sets `build: .`:

```bash
docker compose up -d --build
```

Or:

```bash
make buildup
```

> For production servers, remove or rename `docker-compose.override.yaml` if you only want to pull pre-built images.

**Change published port**

Edit `ports` in `docker-compose.yaml`, e.g. `"8080:3000"` maps host 8080 to container 3000.

**Common commands**

| Command | Description |
|---------|-------------|
| `docker compose up -d` / `make up` | Start in background (pull image) |
| `docker compose up -d --build` / `make buildup` | Build locally and start |
| `docker compose logs -f` / `make logs` | Follow logs |
| `docker compose down` / `make down` | Stop and remove containers |
| `docker compose ps` | Status |

**Upgrade**

```bash
docker compose pull
docker compose down
docker compose up -d
```

Data persists in host `./data`; upgrading the image does not delete subscriptions.

---

## 🧩 Frontend / backend development

The project is split into `frontend/` (Vue 3 + Vite) and `backend/` (Node.js / Express). Root directory holds Docker, Makefile, and deployment files.

**Quick start**

```bash
make dev          # start backend + frontend (recommended)
make install      # install dependencies
make backend-dev  # backend only
make frontend-dev # frontend only
```

Frontend dev server defaults to `http://localhost:5173`; Vite proxies `/api` to the backend on `http://localhost:3000`. Ports are set in root `.env` (`PORT`, `FRONTEND_PORT`).

For production deployment, see [Deployment Guide](#-deployment-guide) above.

## 💾 Database

-   Data is stored in `./data/subscriptions.db`
-   Tables will be automatically initialized on first run

## 📖 Usage Instructions

-   **Create Subscription**: Login → Add Subscription → Enter name and path → Create
-   **Manage Nodes**: Select subscription → Add node → Supports single line, multiple lines, Base64
-   Import Nodes: Select subscription → Select subscription type to import → Enter corresponding subscription link → Auto-import nodes
-   Generate Custom Clash Link Rules: Select subscription → Configure SubconverterUrl + Custom Rule Template → Click Generate Clash Subscription Nodes
-   Generate Default Template or Clash Rules with Nodes Only: Select subscription → Check or uncheck Use Default Template → Save → Click Generate Clash Subscription Nodes
-   **Protocol Guide**: Open the admin UI → **协议说明** tab in the header
-   **Node Sorting**: Node list → Drag → Auto-save
-   **Bulk Operations**: Bulk delete → Check → Confirm

## 🎯 Clash Features

### Default Template
- Built-in default Clash template with complete rule set
- 8 proxy groups: Auto-select, Media Services, Microsoft Services, Apple Services, CDN Services, AI Services, Telegram, Speedtest
- 3900+ rules expanded from rule-providers
- Compatible with ClashMeta, OpenClash, Nikki and other Clash clients

### Rule Providers
Default template includes rules from Sukkaw ruleset:
- Block: Ads, malware, tracking
- Direct: Apple, Microsoft, CDN, domestic services
- Proxy: Media services, AI, Telegram, global traffic
- IP-based rules for precise matching

### Subconvert Integration
When Subconvert URL is configured:
- Subscription will be converted through Subconvert (self-configured)
- Supports using custom templates via Subconvert (self-configured)
- Automatically falls back to local default template conversion on error

## ⚠️ Notes

-   Change the default administrator password after first deployment
-   Regularly back up the database
-   Keep admin panel information safe
-   Use strong passwords

## 🛠️ Tech Stack

-   Vue 3 + Vite + Element Plus (admin UI)
-   Node.js + Express (backend API)
-   SQLite
-   Docker / Docker Compose
-   SortableJS

## REF

[ProxyCli](https://github.com/baixiaoshengofficial/ProxyCli)

