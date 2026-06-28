# SubscribeManager

[EN](https://github.com/baixiaoshengofficial/SubscribeManager/blob/main/README.md)|中文

## 开源地址

[SubscribeManager](https://github.com/baixiaoshengofficial/SubscribeManager)动动你的小手给个 Star

### Star 趋势

[Star History Chart](https://star-history.com/#baixiaoshengofficial/SubscribeManager&Date)

### 更新日志

[查看完整更新日志 →](https://github.com/baixiaoshengofficial/SubscribeManager/blob/main/CHANGELOG.md)

### 简介

SubscribeManager 是一个轻量级、简单的代理节点订阅管理系统。

通过 Docker Compose 本地部署，简单易迁移

提供直观的 Web 界面，支持多种代理协议和订阅格式。

## 🌐 线上体验

[SubscribeManager Sponsor By FOSSVPS](https://subscribe.baixiaosheng.de)

**username:** `admin`

**password:** `admin`

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

SubscribeManager 提供两种部署形态：

- **源码部署**：单个 Node 进程，`backend` 同时托管 API 与构建好的 `frontend/dist`，前后端同端口。
- **Docker 部署（前后端分离）**：`backend`（API + 订阅输出）与 `frontend`（Nginx 托管静态页并反代 `/api`）分别为独立容器、独立端口，由 Docker Compose 编排。

### 准备工作

**环境要求**


| 方式             | 要求                                    |
| -------------- | ------------------------------------- |
| 源码部署           | Node.js **20+**、npm                   |
| Docker Compose | Docker **20+**、Docker Compose **v2+** |


**配置环境变量**

在项目根目录复制并编辑 `.env`：

```bash
cp .env.example .env
```

```ini
# 必填：生产环境请修改默认值
SESSION_SECRET=请改为随机长字符串
ADMIN_USERNAME=admin
ADMIN_PASSWORD=请改为强密码

# 后端端口（API、订阅输出）
BACKEND_PORT=5100
# 前端端口（开发为 Vite；Docker 为 Nginx 容器）
FRONTEND_PORT=5101

# 数据库路径（相对运行目录）。源码与 Docker 共用此值，
# Docker 会把宿主机 ./data 挂到容器对应位置，宿主机 ./data 下可见 db 文件
DB_PATH=./data/subscriptions.db

# HTTPS 部署时设为 true；本地 / Docker HTTP 保持 false
# COOKIE_SECURE=false

# 可选：公网可访问的后端地址（远程 Subconverter 拉节点 / 订阅链接展示）
# PUBLIC_BASE_URL=https://sub.example.com
```

> 开发（`make dev`）与 Docker 会用到两个端口（前端 `FRONTEND_PORT`、后端 `BACKEND_PORT`）。源码**生产**部署时由单个 Node 进程在 `BACKEND_PORT` 上托管全部，`FRONTEND_PORT` 仅对 Vite 开发服务器生效。

**访问地址**：部署完成后浏览器打开 `http://<主机>:<FRONTEND_PORT>/`。

---

### 方式一：从源码部署

适合本机或 VPS 直接运行 Node，无需 Docker。后端构建并托管前端，单进程对外服务。

```bash
# 1. 获取代码
git clone https://github.com/baixiaoshengofficial/SubscribeManager.git
cd SubscribeManager

# 2. 配置环境变量（见上文），源码部署建议两端口相同
cp .env.example .env

# 3. 安装依赖并构建前端
make install
make frontend-build

# 4. 启动后端（读取根目录 .env，托管 frontend/dist）
make backend-dev
```

**常用命令**


| 命令                    | 说明                                  |
| --------------------- | ----------------------------------- |
| `make install`        | 安装 `backend/`、`frontend/` 依赖        |
| `make frontend-build` | 构建前端到 `frontend/dist`               |
| `make backend-dev`    | 启动生产后端（端口读 `.env` 的 `BACKEND_PORT`） |
| `make test`           | 运行后端测试                              |
| `make test-frontend`  | 运行前端测试（vitest）                      |
| `make check`          | 前后端测试 + 前端构建校验                      |


**说明**

- 修改前端代码后需重新 `make frontend-build` 再重启后端。
- 数据库默认写入 `./data/subscriptions.db`（由 `DB_PATH` 控制，相对启动目录）。
- 本地**开发**（热更新、前后端分离端口）见下文 [前后端分离开发](#-前后端分离开发)。

---

### 方式二：Docker Compose 部署（推荐）

`docker-compose.yaml` 启动 **backend** 和 **frontend** 两个服务，各映射一个端口：


| 服务         | 端口映射                          | 用途                                     |
| ---------- | ----------------------------- | -------------------------------------- |
| `backend`  | `BACKEND_PORT:BACKEND_PORT`   | API、`/<path>` 订阅输出                     |
| `frontend` | `FRONTEND_PORT:FRONTEND_PORT` | 管理界面（Nginx 静态页 + 反代 `/api`、`/version`） |


**使用 Docker Hub 镜像（推荐）**

默认拉取 `knighttools/subscribe-manager-backend` 与 `knighttools/subscribe-manager-frontend`：

```bash
git clone https://github.com/baixiaoshengofficial/SubscribeManager.git
cd SubscribeManager
cp .env.example .env
# 编辑 .env

docker compose up -d      # 等价 make up
```

**从源码本地构建镜像**

仓库内 `docker-compose.override.yaml` 会让两个服务改为本地 `build`（分别用 `backend/Dockerfile`、`frontend/Dockerfile`）：

```bash
docker compose up -d --build   # 等价 make buildup
```

> 生产服务器若只想拉取远程镜像、不在本机构建，可删除或重命名 `docker-compose.override.yaml`。

**访问与端口**

浏览器访问 **FRONTEND_PORT**（如 `http://localhost:5101/`）。订阅链接由后端 **BACKEND_PORT** 提供；若前端与后端不在同机或需对外暴露，请在 `.env` 设置 `PUBLIC_BASE_URL`，供 Subconverter 和订阅链接展示使用。

**常用命令**


| 命令                                              | 说明         |
| ----------------------------------------------- | ---------- |
| `docker compose up -d` / `make up`              | 后台启动（拉取镜像） |
| `docker compose up -d --build` / `make buildup` | 本地构建并启动    |
| `docker compose logs -f` / `make logs`          | 查看日志       |
| `docker compose down` / `make down`             | 停止并删除容器    |
| `docker compose ps`                             | 查看状态       |


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

前端开发地址为 `http://localhost:<FRONTEND_PORT>`，通过 Vite 代理访问后端 `http://localhost:<BACKEND_PORT>`。

> `.env` 端口：`BACKEND_PORT`（后端）、`FRONTEND_PORT`（前端）。示例：`make dev BACKEND_PORT=3001 FRONTEND_PORT=5174`。

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