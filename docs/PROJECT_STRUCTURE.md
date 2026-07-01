# SubscribeManager Project Structure

```
SubscribeManager/
├── backend/                    # Express 5 + SQLite 后端
│   ├── index.js                # 进程入口
│   ├── database.js             # SQLite 初始化 + schema
│   ├── config/                 # 端口等运行时配置读取
│   ├── middleware/             # 认证 / 反代中间件
│   ├── routes/                 # HTTP 路由（auth、订阅、节点）
│   ├── services/               # 业务逻辑层
│   ├── utils/                  # Clash 展开、协议解析、URL 构建
│   ├── i18n/                   # 后端错误消息的翻译
│   └── tests/                  # Jest 测试
├── frontend/                   # Vue 3 + Element Plus 前端
│   ├── src/
│   │   ├── App.vue             # 根布局 + 深浅色切换
│   │   ├── main.js             # 入口 / i18n 挂载
│   │   ├── views/              # DashboardView / LoginView / ProtocolGuideView
│   │   ├── api/                # axios 封装
│   │   ├── composables/        # 业务 composables
│   │   └── utils/              # 纯函数工具
│   ├── tests/                  # Vitest + jsdom
│   └── dist/                   # Vite 构建产物
├── config/
│   └── ports.cjs               # 共享端口默认值
├── docs/                       # 项目文档（本项目）
├── scripts/                    # 发布流程脚本
├── data/                       # SQLite 数据库目录
├── Makefile                    # 常用命令入口
├── version.json                # 单一版本源
├── .env.example                # 环境变量模板
├── docker-compose.yaml         # Docker 服务定义
├── docker-compose.override.yaml
├── README.md / README_ZH.md
└── CHANGELOG.md
```
