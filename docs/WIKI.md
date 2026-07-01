# SubscribeManager 文档

项目文档是静态页面，可以这样本地预览：

```bash
cd docs
python3 -m http.server 8900
# 访问 http://localhost:8900/wiki.html
```

也可以直接打开 `docs/index.html`，带 hash 的入口会跳转到 `wiki.html`。

## 内容索引

- [项目介绍](wiki.html#intro)：项目做什么，适合谁用
- [功能一览](wiki.html#features)：协议、订阅、Clash 特性
- [部署方式](wiki.html#deploy)：Docker Compose 与源码部署
- [环境配置](wiki.html#env)：`.env` 字段与开发命令
- [界面导览](wiki.html#ui)：登录后台后会看到什么
- [协议与订阅](wiki.html#protocols)：节点、订阅和客户端接入
- [架构概览](wiki.html#arch)：三层架构与 Docker 拓扑
- [安全要点](wiki.html#security)：登录、Cookie、反代注意事项
- [常见问题](wiki.html#faq)：端口、升级、订阅路径、2FA 等
