# SubscribeManager

[中文](https://github.com/baixiaoshengofficial/SubscribeManager/blob/main/README_ZH.md) | EN

## Repository

[SubscribeManager](https://github.com/baixiaoshengofficial/SubscribeManager) Give it a Star

### Star History

[![Star History Chart](https://api.star-history.com/svg?repos=baixiaoshengofficial/SubscribeManager&type=Date)](https://star-history.com/#baixiaoshengofficial/SubscribeManager&Date)

### Changelog

[View full changelog →](https://github.com/baixiaoshengofficial/SubscribeManager/blob/main/CHANGELOG.md)

### Changelog V1.0.0

- Support importing nodes via subscription link
- Support configuring Subconverter + custom template or default template to generate Clash subscription nodes
- UI updates
- Code refactoring

### Overview

SubscribeManager is a lightweight and simple proxy node subscription management system.

Deploy locally via Docker Compose, simple and easy to migrate.

Provides an intuitive web interface and supports multiple proxy protocols and subscription formats.

## 🌐 Live Demo

[SubscribeManager OnRender](https://subscribemanager-zlj2.onrender.com/admin)
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


1. Ensure **Docker** and **Docker Compose** are installed

2. Clone the project locally

3. Create a `.env` file in the project root or copy `.env.example` file and modify


```
    Example .env:
    SESSION_SECRET=your_session_secret
    ADMIN_PATH=admin
    ADMIN_USERNAME=admin
    ADMIN_PASSWORD=your_password
    DB_PATH=./data/subscriptions.db
```


4. Start the service


- Using pre-built Docker Hub image:


``` bash
docker compose up -d
```


- Build from source and start:


``` bash
docker compose up -d --build
```


- Makefile commands:


``` bash
make up       # Use pre-built image
make buildup  # Build from source and start
make down     # Stop and remove containers
make logs     # View logs
```

5. update:
```
docker compose pull
docker compose down
docker compose up -d
```

6. Access the admin panel: `http://localhost:3000/${ADMIN_PATH}`

## 💾 Database

-   Data is stored in `./data/subscriptions.db`
-   Tables will be automatically initialized on first run

## 📖 Usage Instructions

-   **Create Subscription**: Login → Add Subscription → Enter name and path → Create
-   **Manage Nodes**: Select subscription → Add node → Supports single line, multiple lines, Base64
-   Import Nodes: Select subscription → Select subscription type to import → Enter corresponding subscription link → Auto-import nodes
-   Generate Custom Clash Link Rules: Select subscription → Configure SubconverterUrl + Custom Rule Template → Click Generate Clash Subscription Nodes
-   Generate Default Template or Clash Rules with Nodes Only: Select subscription → Check or uncheck Use Default Template → Save → Click Generate Clash Subscription Nodes
-   **Protocol Guide**: Visit `http://localhost:3000/${ADMIN_PATH}/config-manager` to view protocol support overview and matrix
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

-   Node.js
-   Express
-   SQLite
-   Docker & Docker Compose
-   HTML5 / CSS3 / JavaScript (ES6+)
-   Bootstrap 5
-   Font Awesome
-   SortableJS

## REF

[ProxyCli](https://github.com/baixiaoshengofficial/ProxyCli)

