# 项目结构

```text
SubscribeManager/
├── frontend/   # Vue 3 + Vite 管理端
├── backend/    # Node.js + Express API / sqlite / 订阅输出
├── data/       # sqlite 数据文件
├── docker-compose.yaml
└── Makefile
```

## 本地开发

```bash
make dev                    # 一键启动前后端
make install                # 安装依赖
make backend-dev            # 仅后端
make frontend-dev           # 仅前端
```

`.env` 端口变量：

- `BACKEND_PORT` — 后端（API、订阅链接）
- `FRONTEND_PORT` — 管理界面（Vite 开发服务器）

## Docker 部署（前后端分离）

```bash
make buildup  # 或 docker compose up -d --build
make logs
make down
```

两个服务、两个端口（与 `make dev` 一致）：

| 服务 | 端口 | 用途 |
|------|------|------|
| `backend` | `BACKEND_PORT` | API、`/path` 订阅输出 |
| `frontend` | `FRONTEND_PORT` | 管理界面（Nginx 静态资源 + 代理 `/api`） |

浏览器访问：`http://<主机>:<FRONTEND_PORT>/`

## 发布

```bash
make bump-patch   # 或 bump-minor / bump-major
make release      # CHANGELOG + Docker Hub + GitHub Release
```
