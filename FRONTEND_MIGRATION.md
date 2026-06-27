# 前端分离说明

本项目已拆分为两个子项目：

```text
SubscribeManager/
├── frontend/   # Vue 3 + Vite 管理端
├── backend/    # Node.js + Express API / sqlite / 订阅输出
├── data/       # sqlite 数据文件
├── Dockerfile
├── docker-compose.yaml
└── Makefile
```

管理端已从 `public/*.html` + 全局 JS 脚本迁移为独立 Vue 项目：`frontend/`；原 Node/Express 后端已迁移到 `backend/`。

## 本地开发

一键启动前后端（推荐）：

```bash
make dev
```

`make dev` 会同时启动后端（默认 3000）和前端（默认 5173），前端通过 Vite proxy 代理 `/api` 到后端。Ctrl+C 一次停止全部服务。

可自定义端口：

```bash
make dev BACKEND_PORT=3001 FRONTEND_PORT=5174
```

首次运行或依赖缺失时，`make dev` 会自动安装 `node_modules`；也可手动执行：

```bash
make install
```

单独启动：

```bash
make backend-dev    # 仅后端
make frontend-dev   # 仅前端
```

前端默认运行在 `http://localhost:5173`，通过 Vite proxy 访问后端。如需暴露到局域网：`cd frontend && npm run dev -- --host`。

## Docker 部署

镜像由多阶段 Dockerfile 构建：先在 `frontend-builder` 阶段执行 `npm run build`，再把 `frontend/dist` 拷进 Node 后端镜像，由 Express 托管静态资源。

```bash
# 拉取 Docker Hub 镜像部署
make up

# 本地构建并部署（前后端一键构建）
make buildup

# 查看日志 / 停止
make logs
make down
```

`docker-compose.yaml` 默认拉取 `knighttools/subscribe-manager:latest`；`docker-compose.override.yaml`（本地开发用）覆盖为 `build: .`，所以 `make buildup` 等价于 `docker compose up -d --build`。

## 发布（Docker Hub + GitHub Release）

```bash
# 1. 升版本号
make bump-patch   # 或 bump-minor / bump-major

# 2. 一键发布：更新 CHANGELOG + 多架构镜像推送到 Docker Hub + 创建 GitHub Release
make release
```

`make release` 依赖：
- `make push`：`docker buildx build --platform linux/amd64,linux/arm64` 同时推送 `:latest` 与 `:版本号` 到 Docker Hub
- `make github-release`：从 CHANGELOG.md 提取发布说明，用 `gh` CLI 创建 GitHub Release（需已安装并登录 `gh`）

## 后端职责变化

- 后端位于 `backend/`，保留 Node/Express，目前作为 API 服务和公开订阅输出服务。
- 认证接口迁移到 `/api/auth/login`、`/api/auth/logout`、`/api/auth/me`。
- 管理页面不再由 `/admin/auth/login` 或 `/admin` 返回静态 HTML。
- 公开订阅路径仍保留：`/:path`、`/:path/:format`、`/:path/nodes`。

## 清理结果

旧 `public/` 管理页面、`.DS_Store` 已清理。当前管理端唯一入口是 `frontend/` Vue 项目。

后续如需补齐旧管理端能力，可在 `frontend/src/views` 中继续增加：批量导入、Subconverter 配置、主题/i18n、拖拽排序等页面/组件。
