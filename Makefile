BACKEND_IMAGE = knighttools/subscribe-manager-backend
FRONTEND_IMAGE = knighttools/subscribe-manager-frontend
TAG = latest
PLATFORMS = linux/amd64,linux/arm64

# 从 version.json 读取版本号
VERSION := $(shell cat version.json | grep '"version"' | head -1 | cut -d '"' -f 4)
TAG_PREFIX := tag/v
RELEASE_TAG := $(TAG_PREFIX)$(VERSION)

# 端口仅从 .env 读取，命令行可覆盖
BACKEND_PORT ?= $(shell grep -E '^BACKEND_PORT=' .env 2>/dev/null | head -1 | cut -d '=' -f 2 | tr -d '\r')
FRONTEND_PORT ?= $(shell grep -E '^FRONTEND_PORT=' .env 2>/dev/null | head -1 | cut -d '=' -f 2 | tr -d '\r')

.PHONY: help dev install backend-dev frontend-dev frontend-build test test-frontend check clean up buildup down logs build push github-release release update-changelog bump-patch bump-minor bump-major

help: ## 显示帮助
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## 安装前后端依赖
	@echo "📦 安装 backend 依赖..."
	cd backend && npm install
	@echo "📦 安装 frontend 依赖..."
	cd frontend && npm install

dev: ## 一键启动前后端开发服务（Ctrl+C 退出）
	@test -f .env || (echo "❌ 缺少 .env，请执行: cp .env.example .env"; exit 1)
	@test -n "$(BACKEND_PORT)" || (echo "❌ .env 缺少 BACKEND_PORT"; exit 1)
	@test -n "$(FRONTEND_PORT)" || (echo "❌ .env 缺少 FRONTEND_PORT"; exit 1)
	@echo "🚀 启动开发服务（端口来自 .env）"
	@command -v node >/dev/null 2>&1 || { echo "❌ 未安装 node"; exit 1; }
	@command -v npm  >/dev/null 2>&1 || { echo "❌ 未安装 npm"; exit 1; }
	@command -v lsof >/dev/null 2>&1 || { echo "❌ 未安装 lsof"; exit 1; }
	@test -d backend/node_modules  || { echo "⚠️  backend 依赖未安装，自动执行 (make install)"; cd backend && npm install; }
	@test -d frontend/node_modules || { echo "⚠️  frontend 依赖未安装，自动执行 (make install)"; cd frontend && npm install; }
	@bash -c '\
		BP=$(BACKEND_PORT); FP=$(FRONTEND_PORT); \
		echo "   后端端口 : $$BP  (来自 .env: BACKEND_PORT)"; \
		echo "   前端端口 : $$FP  (来自 .env: FRONTEND_PORT)"; \
		echo "   预检端口占用..."; \
		for P in $$BP $$FP; do \
			lsof -ti TCP:$$P -sTCP:LISTEN >/dev/null 2>&1 || continue; \
			echo "⚠️  端口 $$P 被占用："; \
			lsof -i TCP:$$P -sTCP:LISTEN 2>/dev/null | sed "s/^/      /"; \
			CIDS=""; \
			if command -v docker >/dev/null 2>&1; then \
				CIDS=$$(docker ps --filter "publish=$$P" -q 2>/dev/null); \
			fi; \
			if [ -n "$$CIDS" ]; then \
				OURS=0; \
				COMPOSE_IDS=$$(docker compose ps -q 2>/dev/null); \
				for c in $$CIDS; do for d in $$COMPOSE_IDS; do case "$$d" in $$c*) OURS=1;; esac; done; done; \
				if [ "$$OURS" = "1" ]; then \
					echo "   端口由本项目 Docker 容器占用，执行 docker compose down ..."; \
					docker compose down 2>/dev/null || true; \
				else \
					echo "   端口由其他 Docker 容器占用，执行 docker stop ..."; \
					docker ps --filter "publish=$$P" --format "      停止 {{.Names}} ({{.Image}})" 2>/dev/null; \
					docker stop $$CIDS >/dev/null 2>&1 || true; \
				fi; \
				for i in 1 2 3 4 5 6 7 8 9 10; do sleep 0.3; lsof -ti TCP:$$P -sTCP:LISTEN >/dev/null 2>&1 || break; done; \
				if lsof -ti TCP:$$P -sTCP:LISTEN >/dev/null 2>&1; then \
					echo "❌ 端口 $$P 仍被 Docker 占用，请手动检查 (docker ps)"; \
					exit 2; \
				fi; \
				echo "   ✅ 端口 $$P 已释放"; \
				continue; \
			fi; \
			PIDS=$$(lsof -ti TCP:$$P -sTCP:LISTEN 2>/dev/null); \
			echo "   结束本地进程 (kill $$PIDS)..."; \
			kill $$PIDS 2>/dev/null || true; \
			for i in 1 2 3 4 5 6 7 8 9 10; do sleep 0.3; lsof -ti TCP:$$P -sTCP:LISTEN >/dev/null 2>&1 || break; done; \
			PIDS=$$(lsof -ti TCP:$$P -sTCP:LISTEN 2>/dev/null); \
			if [ -n "$$PIDS" ]; then \
				echo "   仍未释放，强制结束 (kill -9 $$PIDS)..."; \
				kill -9 $$PIDS 2>/dev/null || true; \
				sleep 0.5; \
			fi; \
			if lsof -ti TCP:$$P -sTCP:LISTEN >/dev/null 2>&1; then \
				echo "❌ 端口 $$P 无法释放，请手动处理"; \
				exit 2; \
			fi; \
			echo "   ✅ 端口 $$P 已释放"; \
		done; \
		echo "   端口 $$BP / $$FP 空闲，开始启动..."; \
		trap "kill 0" INT TERM EXIT; \
		(cd backend  && BACKEND_PORT=$$BP npm start) > /tmp/sm-backend.log 2>&1 & BE=$$!; \
		(cd frontend && VITE_BACKEND_TARGET=http://localhost:$$BP npm run dev -- --port $$FP --strictPort) > /tmp/sm-frontend.log 2>&1 & FE=$$!; \
		b_ready=0; f_ready=0; \
		for i in $$(seq 1 40); do \
			sleep 0.5; \
			if [ $$b_ready -eq 0 ] && lsof -i TCP:$$BP -sTCP:LISTEN >/dev/null 2>&1; then b_ready=1; fi; \
			if [ $$f_ready -eq 0 ] && lsof -i TCP:$$FP -sTCP:LISTEN >/dev/null 2>&1; then f_ready=1; fi; \
			if [ $$b_ready -eq 1 ] && [ $$f_ready -eq 1 ]; then break; fi; \
		done; \
		echo ""; \
		echo "════════════════════════════════════════════════════════"; \
		if [ $$b_ready -eq 1 ]; then \
			echo "  ✅ 后端 (backend) : http://localhost:$$BP"; \
		else \
			echo "  ❌ 后端未就绪，日志：tail -f /tmp/sm-backend.log"; \
		fi; \
		if [ $$f_ready -eq 1 ]; then \
			echo "  ✅ 前端 (frontend): http://localhost:$$FP   ← 在浏览器打开这个"; \
		else \
			echo "  ❌ 前端未就绪，日志：tail -f /tmp/sm-frontend.log"; \
		fi; \
		echo "  ℹ️  /api 由前端代理到后端"; \
		echo "  ℹ️  实时日志: tail -f /tmp/sm-backend.log /tmp/sm-frontend.log"; \
		echo "  按 Ctrl+C 停止全部服务"; \
		echo "════════════════════════════════════════════════════════"; \
		wait'

backend-dev: ## 仅启动后端
	@test -f .env || (echo "❌ 缺少 .env，请执行: cp .env.example .env"; exit 1)
	@test -n "$(BACKEND_PORT)" || (echo "❌ .env 缺少 BACKEND_PORT"; exit 1)
	cd backend && BACKEND_PORT=$(BACKEND_PORT) npm start

frontend-dev: ## 仅启动前端
	@test -f .env || (echo "❌ 缺少 .env，请执行: cp .env.example .env"; exit 1)
	@test -n "$(BACKEND_PORT)" || (echo "❌ .env 缺少 BACKEND_PORT"; exit 1)
	@test -n "$(FRONTEND_PORT)" || (echo "❌ .env 缺少 FRONTEND_PORT"; exit 1)
	cd frontend && VITE_BACKEND_TARGET=http://localhost:$(BACKEND_PORT) npm run dev -- --port $(FRONTEND_PORT) --strictPort

frontend-build: ## 构建前端产物到 frontend/dist
	cd frontend && npm run build

test: ## 运行后端测试
	cd backend && npm test

test-frontend: ## 运行前端测试（vitest）
	cd frontend && npm test

check: test test-frontend ## 前后端测试 + 前端构建校验
	cd frontend && npm run build

clean: ## 清理构建产物
	rm -rf frontend/dist backend/coverage coverage

# ===================== Docker 部署 =====================
up: ## 用 docker compose 拉镜像启动
	docker compose up -d

buildup: ## 用 docker compose 本地构建并启动（前后端一键构建部署）
	docker compose up -d --build

down: ## 停止 docker compose
	docker compose down

logs: ## 跟随 docker compose 日志
	docker compose logs -f

build: ## 本地构建 Compose 镜像（backend + frontend）
	docker compose build

# 多架构构建并推送到 Docker Hub（backend + frontend，各含 latest + 版本号）
push: ## 多架构构建并推送 backend/frontend 镜像到 Docker Hub
	@echo "📦 构建并推送 backend 镜像 (版本: $(VERSION), 平台: $(PLATFORMS))..."
	docker buildx build \
		--platform $(PLATFORMS) \
		-f backend/Dockerfile \
		-t $(BACKEND_IMAGE):$(TAG) \
		-t $(BACKEND_IMAGE):$(VERSION) \
		--push .
	@echo "📦 构建并推送 frontend 镜像 (版本: $(VERSION), 平台: $(PLATFORMS))..."
	docker buildx build \
		--platform $(PLATFORMS) \
		-f frontend/Dockerfile \
		-t $(FRONTEND_IMAGE):$(TAG) \
		-t $(FRONTEND_IMAGE):$(VERSION) \
		--push .
	@echo "✅ 已发布 backend/frontend 镜像 (:$(TAG) 和 :$(VERSION)) 到 Docker Hub (支持 $(PLATFORMS))"

# ===================== GitHub Release =====================
github-release: ## 创建 GitHub Release（需 gh CLI 已登录）
	@echo "🚀 创建 GitHub Release $(RELEASE_TAG)..."
	@if ! command -v gh >/dev/null 2>&1; then \
		echo "❌ 错误: 未安装 gh 命令行工具"; \
		echo "   请访问 https://cli.github.com/ 安装"; \
		exit 1; \
	fi
	@if ! gh auth status >/dev/null 2>&1; then \
		echo "❌ 错误: 未登录 GitHub"; \
		echo "   请运行: gh auth login"; \
		exit 1; \
	fi

	# 删除本地已存在的 tag
	@echo "🏷️  处理本地 tag $(RELEASE_TAG)..."
	@git tag -d $(RELEASE_TAG) 2>/dev/null || echo "本地 tag 不存在"

	# 删除远程已存在的 tag
	@echo "🏷️  处理远程 tag $(RELEASE_TAG)..."
	@-git push origin --delete $(RELEASE_TAG) 2>/dev/null || echo "远程 tag 不存在"

	# 创建新 tag
	@echo "创建新 tag $(RELEASE_TAG)..."
	git tag -a $(RELEASE_TAG) -m "Release $(RELEASE_TAG)"

	# 强制推送 tag
	@echo "推送 tag $(RELEASE_TAG)..."
	git push origin refs/tags/$(RELEASE_TAG) --force

	# 从 CHANGELOG.md 提取发布说明
	@echo "📝 从 CHANGELOG.md 提取发布说明..."
	@node scripts/extract-changelog.js $(VERSION) > /tmp/release-notes.txt

	# 删除已存在的 Release
	@echo "🔄 删除旧的 GitHub Release (如果存在)..."
	@gh release delete $(RELEASE_TAG) --yes 2>/dev/null || echo "Release 不存在"

	# 创建新的 Release
	@echo "✨ 创建新的 GitHub Release..."
	gh release create $(RELEASE_TAG) \
		--title "SubscribeManager $(RELEASE_TAG)" \
		--notes-file /tmp/release-notes.txt
	@echo "✅ GitHub Release $(RELEASE_TAG) 创建成功"

update-changelog: ## 更新 CHANGELOG.md 日期
	@echo "📝 更新 CHANGELOG.md..."
	@node scripts/update-changelog.js

# 一键发布: 更新 changelog + 推送 Docker Hub + 创建 GitHub Release
release: update-changelog push github-release ## 一键发布（Docker Hub + GitHub Release）
	@echo "🎉 完整发布流程完成！"
	@echo "   - Docker Hub : $(BACKEND_IMAGE) 和 $(FRONTEND_IMAGE)（:$(TAG) / :$(VERSION)）"
	@echo "   - GitHub Release: $(RELEASE_TAG)"
	@echo "   - Git Tag    : $(RELEASE_TAG)"
	@echo "   - CHANGELOG.md 已更新"

# ===================== 版本号管理 =====================
bump-patch: ## patch 版本号 +1
	@node -e "const v = require('./version.json').version.split('.'); v[2] = parseInt(v[2]) + 1; const nv = v.join('.'); require('fs').writeFileSync('version.json', JSON.stringify({version: nv, name: 'SubscribeManager', tagPrefix: 'v'}, null, 2)); console.log('Version bumped to ' + nv);"

bump-minor: ## minor 版本号 +1
	@node -e "const v = require('./version.json').version.split('.'); v[1] = parseInt(v[1]) + 1; v[2] = 0; const nv = v.join('.'); require('fs').writeFileSync('version.json', JSON.stringify({version: nv, name: 'SubscribeManager', tagPrefix: 'v'}, null, 2)); console.log('Version bumped to ' + nv);"

bump-major: ## major 版本号 +1
	@node -e "const v = require('./version.json').version.split('.'); v[0] = parseInt(v[0]) + 1; v[1] = 0; v[2] = 0; const nv = v.join('.'); require('fs').writeFileSync('version.json', JSON.stringify({version: nv, name: 'SubscribeManager', tagPrefix: 'v'}, null, 2)); console.log('Version bumped to ' + nv);"
