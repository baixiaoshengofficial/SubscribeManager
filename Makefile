IMAGE_NAME = knighttools/subscribe-manager
TAG = latest
PLATFORMS = linux/amd64,linux/arm64

# 从 version.json 读取版本号
VERSION := $(shell cat version.json | grep '"version"' | head -1 | cut -d '"' -f 4)
FULL_TAG := v$(VERSION)

.PHONY: build push release github-release full-release update-changelog

dev:
	npm start
up:
	docker compose up -d

buildup:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f
# 本地构建(只构建当前架构，不推送)
build:
	docker build -t $(IMAGE_NAME):$(TAG) .

# 多架构构建并推送到 Docker Hub (使用当前版本号)
push:
	@echo "📦 正在构建 Docker 镜像 (版本: $(VERSION), 平台: $(PLATFORMS))..."
	docker buildx build \
		--platform $(PLATFORMS) \
		-t $(IMAGE_NAME):$(TAG) \
		-t $(IMAGE_NAME):$(VERSION) \
		--push .
	@echo "✅ 已发布 $(IMAGE_NAME):$(TAG) 和 $(IMAGE_NAME):$(VERSION) 到 Docker Hub (支持 $(PLATFORMS))"

# 创建 GitHub Release (需要先安装 gh 命令行工具并登录)
github-release:
	@echo "🚀 创建 GitHub Release v$(VERSION)..."
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
	@echo "🏷️  处理本地 tag v$(VERSION)..."
	@git tag -d v$(VERSION) 2>/dev/null || echo "本地 tag 不存在"

	# 删除远程已存在的 tag (使用 git push --delete)
	@echo "🏷️  处理远程 tag v$(VERSION)..."
	@git push origin :refs/tags/v$(VERSION) 2>/dev/null || echo "远程 tag 不存在"

	# 创建新 tag
	@echo "创建新 tag v$(VERSION)..."
	git tag -a v$(VERSION) -m "Release v$(VERSION)"
	git push origin v$(VERSION)

	# 从 CHANGELOG.md 提取发布说明
	@echo "📝 从 CHANGELOG.md 提取发布说明..."
	@node scripts/extract-changelog.js $(VERSION) > /tmp/release-notes.txt

	# 删除已存在的 Release
	@echo "🔄 删除旧的 GitHub Release (如果存在)..."
	@gh release delete v$(VERSION) --yes 2>/dev/null || echo "Release 不存在"

	# 创建新的 Release
	@echo "✨ 创建新的 GitHub Release..."
	gh release create v$(VERSION) \
		--title "SubscribeManager v$(VERSION)" \
		--notes-file /tmp/release-notes.txt
	@echo "✅ GitHub Release v$(VERSION) 创建成功"

# 更新 CHANGELOG.md 日期
update-changelog:
	@echo "📝 更新 CHANGELOG.md..."
	@node scripts/update-changelog.js

# 一键发布流程: 构建 Docker 镜像 + 推送到 Docker Hub + 创建 GitHub Release + 创建 Git 分支
release: update-changelog push github-release
	@echo "🎉 完整发布流程完成！"
	@echo "   - Docker Hub: $(IMAGE_NAME):$(TAG) 和 $(IMAGE_NAME):$(VERSION)"
	@echo "   - GitHub Release: v$(VERSION)"
	@echo "   - Git Tag: v$(VERSION)"
	@echo "   - CHANGELOG.md 已更新"

# 更新版本号
bump-patch:
	@node -e "const v = require('./version.json').version.split('.'); v[2] = parseInt(v[2]) + 1; const nv = v.join('.'); require('fs').writeFileSync('version.json', JSON.stringify({version: nv, name: 'SubscribeManager', tagPrefix: 'v'}, null, 2)); console.log('Version bumped to ' + nv);"

bump-minor:
	@node -e "const v = require('./version.json').version.split('.'); v[1] = parseInt(v[1]) + 1; v[2] = 0; const nv = v.join('.'); require('fs').writeFileSync('version.json', JSON.stringify({version: nv, name: 'SubscribeManager', tagPrefix: 'v'}, null, 2)); console.log('Version bumped to ' + nv);"

bump-major:
	@node -e "const v = require('./version.json').version.split('.'); v[0] = parseInt(v[0]) + 1; v[1] = 0; v[2] = 0; const nv = v.join('.'); require('fs').writeFileSync('version.json', JSON.stringify({version: nv, name: 'SubscribeManager', tagPrefix: 'v'}, null, 2)); console.log('Version bumped to ' + nv);"
