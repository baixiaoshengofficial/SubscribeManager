# SubscribeManager

[EN](https://github.com/baixiaoshengofficial/SubscribeManager/blob/main/README.md)|中文

## 开源地址

[SubscribeManager](https://github.com/baixiaoshengofficial/SubscribeManager)动动你的小手给个 Star

### Star 趋势

[![Star History Chart](https://api.star-history.com/svg?repos=baixiaoshengofficial/SubscribeManager&type=Date)](https://star-history.com/#baixiaoshengofficial/SubscribeManager&Date)

### 更新日志

[查看完整更新日志 →](https://github.com/baixiaoshengofficial/SubscribeManager/blob/main/CHANGELOG.md)

### 简介

SubscribeManager 是一个轻量级、简单的代理节点订阅管理系统。

通过 Docker Compose 本地部署，简单易迁移

提供直观的 Web 界面，支持多种代理协议和订阅格式。

## 🌐 线上体验

[SubscribeManager Sponsor By FOSSVPS](https://subscribe.baixiaosheng.de/admin)

**username:** `admin`

**password:** `admin`

**path:** `admin`

  

## ✨ 功能特点

- **多协议支持**: SS, VMess, Trojan, VLESS, SOCKS5, Snell,

Hysteria2, Tuic

- **订阅管理**:

- 创建多个订阅

- 自定义路径

- 批量导入

- 拖拽排序

- **多种订阅格式**:

- 原始

- Base64 (`/v2ray`)

- Surge (`/surge`)

- Clash (`/clash`)

- Shadowsocks (`/shadowsocks`)

- **高级 Clash 功能**:

- 内置默认模板，包含 3900+ 条规则

- 自动展开规则提供商（rule-providers）

- 兼容 ClashMeta 和 ClashX

- 集成 Subconvert API 支持自定义模板

- **安全特性**:

- 管理登录认证

- 会话管理

- 安全 Cookie

- **界面设计**:

- 响应式设计

- 移动设备友好

## 🚀 部署教程

SubscribeManager 生产环境由 **后端统一对外提供服务**：先构建 `frontend/dist`，再由 `backend` 托管静态页面与 API。以下三种方式任选其一。

### 准备工作

**环境要求**

| 方式 | 要求 |
|------|------|
| 源码编译 | Node.js **20+**、npm |
| Docker 单容器 | Docker **20+** |
| Docker Compose | Docker **20+**、Docker Compose **v2+** |

**配置环境变量**

在项目根目录复制并编辑 `.env`：

```bash
cp .env.example .env
```

```ini
# 必填：生产环境请修改默认值
SESSION_SECRET=请改为随机长字符串
ADMIN_PATH=admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=请改为强密码

# 服务端口（源码 / Docker 均使用 PORT）
PORT=3000

# 数据库路径
# 源码部署：相对项目根目录
DB_PATH=./data/subscriptions.db
# Docker 部署：容器内固定为下方路径，通过卷挂载到宿主机 ./data

# 可选：远程 Subconverter 无法访问本机时，填写公网可访问地址
# PUBLIC_BASE_URL=https://sub.example.com
```

创建数据目录（源码部署时需要；Compose / `docker run` 会在首次启动时自动创建卷目录）：

```bash
mkdir -p data
```

**访问地址**

部署完成后打开：

```text
http://<主机>:<PORT>/
```

管理后台与公开订阅链接均通过该端口访问。`ADMIN_PATH` 用于部分 API 配置，**不是** URL 路径前缀。

---

### 方式一：从源码编译部署

适合本机或 VPS 直接运行 Node，无需 Docker。

```bash
# 1. 获取代码
git clone https://github.com/baixiaoshengofficial/SubscribeManager.git
cd SubscribeManager

# 2. 配置环境变量（见上文）
cp .env.example .env
# 编辑 .env

# 3. 安装依赖并构建前端
make install
make frontend-build

# 4. 启动后端（读取根目录 .env，托管 frontend/dist）
cd backend && npm start
```

或使用 Makefile 快捷命令（需已执行 `make install` 与 `make frontend-build`）：

```bash
make backend-dev
```

**常用命令**

| 命令 | 说明 |
|------|------|
| `make install` | 安装 `backend/`、`frontend/` 依赖 |
| `make frontend-build` | 构建前端到 `frontend/dist` |
| `make backend-dev` | 启动生产后端（端口读 `.env` 的 `PORT`） |
| `make test` | 运行后端测试 |
| `make check` | 测试 + 前端构建校验 |

**说明**

- 修改前端代码后需重新执行 `make frontend-build` 再重启后端。
- 数据库默认写入 `./data/subscriptions.db`（由 `DB_PATH` 控制）。
- 本地**开发**（前后端热更新、分离端口）请见下文 [前后端分离开发](#-前后端分离开发)，与生产部署不同。

---

### 方式二：Docker 单容器部署

适合只需一个容器、自行用 `docker run` 管理的场景。镜像内已包含构建好的前端与后端。

**构建镜像**

```bash
git clone https://github.com/baixiaoshengofficial/SubscribeManager.git
cd SubscribeManager
cp .env.example .env
# 编辑 .env

docker build -t subscribe-manager:local .
```

**运行容器**

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

**自定义宿主机端口**（例如映射到 8080）：

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

**常用运维命令**

```bash
docker logs -f subscribe-manager    # 查看日志
docker stop subscribe-manager       # 停止
docker rm subscribe-manager         # 删除容器
```

**使用 Docker Hub 预构建镜像**（无需本地 `docker build`）：

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

### 方式三：Docker Compose 部署

适合生产环境长期运行，配置集中在 `docker-compose.yaml`，便于迁移与升级。

**使用 Docker Hub 镜像（推荐）**

`docker-compose.yaml` 默认拉取 `knighttools/subscribe-manager:latest`：

```bash
git clone https://github.com/baixiaoshengofficial/SubscribeManager.git
cd SubscribeManager
cp .env.example .env
# 编辑 .env

mkdir -p data
docker compose up -d
```

等价 Makefile 命令：

```bash
make up
```

**从源码本地构建镜像**

仓库内 `docker-compose.override.yaml` 会覆盖为 `build: .`，执行：

```bash
docker compose up -d --build
```

或：

```bash
make buildup
```

> 发布到生产时若不想在服务器上构建，可删除或重命名 `docker-compose.override.yaml`，仅保留拉取远程镜像的方式。

**修改映射端口**

编辑 `docker-compose.yaml` 中 `ports`，例如 `"8080:3000"` 表示宿主机 8080 → 容器 3000。

**常用命令**

| 命令 | 说明 |
|------|------|
| `docker compose up -d` / `make up` | 后台启动（拉取镜像） |
| `docker compose up -d --build` / `make buildup` | 本地构建并启动 |
| `docker compose logs -f` / `make logs` | 查看日志 |
| `docker compose down` / `make down` | 停止并删除容器 |
| `docker compose ps` | 查看状态 |

**更新版本**

```bash
docker compose pull
docker compose down
docker compose up -d
```

数据保存在宿主机 `./data`，更新镜像不会丢失订阅数据。

---

## 🧩 前后端分离开发

项目已拆分为两个子项目：

- `frontend/`：Vue 3 + Vite 管理端
- `backend/`：Node.js/Express 后端，负责 API、认证、sqlite 数据访问和公开订阅输出

根目录保留 Docker、Makefile、文档和部署编排文件。

本地开发时建议分别启动：

```bash
make backend-dev
make frontend-dev
```

或者一键启动前后端：

```bash
make dev
```

前端开发地址为 `http://localhost:<FRONTEND_PORT>`（默认 5173），通过 Vite 代理访问后端 `http://localhost:<PORT>`（默认 3000）。

> 端口在根目录 `.env` 中配置：`PORT`（后端）、`FRONTEND_PORT`（前端）。`make dev` 会读取该配置；临时覆盖示例：`make dev BACKEND_PORT=3001 FRONTEND_PORT=5174`。

生产 Docker 镜像会在构建阶段执行 `npm run build`，由后端托管 `frontend/dist`（见 [部署教程](#-部署教程)）。

## 💾 数据库


- 数据存放在 `./data/subscriptions.db`

- 初次运行会自动初始化数据库表


## 📖 使用说明
  

- **创建订阅**: 登录 → 添加订阅 → 输入名称和路径 → 创建

- **管理节点**: 选择订阅 → 添加节点 → 支持单行、多行、Base64

- 导入节点: 选择订阅-> 选择需要导入的订阅类型->输入对应的订阅链接->自动导入节点

- 生成自定义 Clash 链接规则: 选择订阅->配置 SubconverterUrl + 自定义规则模板 -> 点击生成 Clash 订阅节点 

- 生成默认模板或仅生成带有节点的 Clash 规则: 选择订阅->勾选或取消使用默认模版->保存->点击生成 Clash 订阅节点

- **协议说明**: 协议支持和高级配置将逐步迁移到 Vue 管理端

- **节点排序**: 节点列表 → 拖拽 → 自动保存

- **批量操作**: 批量删除 → 勾选 → 确认
  

## 🎯 Clash 功能特性


### 默认模板

- 内置默认 Clash 模板，包含完整的规则集

- 8 个代理组：自动选择、媒体服务、微软服务、苹果服务、CDN 服务、AI 服务、Telegram、Speedtest

- 3900+ 条从规则提供商展开的规则

- 兼容 ClashMeta,OpenClash, Nikki 等 Clash 客户端

  

### 规则提供商

默认模板包含来自 Sukkaw 规则集的规则：

- 拦截：广告、恶意软件、追踪器

- 直连：苹果、微软、CDN、国内服务

- 代理：媒体服务、AI、Telegram、全局流量

- 基于 IP 的规则，实现精确匹配

  
### Subconvert 集成

当配置了 Subconvert URL 时：

- 订阅将通过 Subconvert (自行配置)进行转换

- 支持通过 Subconvert 使用自定义模板(自行配置)

- 出错时自动降级到本地默认模板转换


## ⚠️ 注意事项
  

- 首次部署请修改默认管理员密码

- 定期备份数据库

- 妥善保管管理面板信息

- 使用强密码
  

## 🛠️ 技术栈

- Vue 3 + Vite + Element Plus（管理端）
- Node.js + Express（后端 API）
- SQLite
- Docker / Docker Compose
- SortableJS
  
## REF

[ProxyCli](https://github.com/baixiaoshengofficial/ProxyCli)