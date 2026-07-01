const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const app = express();
const { initializeDatabase } = require("./database");
const config = require("./config");
const versionInfo = require("../version.json");
const { getPublicBaseUrl } = require("./utils/converters/urlHandler");
const logger = require("./utils/logger");

// 使用原有的简单路由
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");

// 中间件
const languageHandler = require("./middleware/languageHandler");
const errorHandler = require("./middleware/errorHandler");

// 认证中间件
const sessionService = require("./services/sessionService");
const frontendDistPath = path.join(__dirname, "..", "frontend", "dist");
const frontendIndexPath = path.join(frontendDistPath, "index.html");

async function requireAuth(req, res, next) {
  const isApiRequest = req.originalUrl.startsWith("/api/");

  if (!req.session.sessionId) {
    // 如果是API调用，返回401而不是重定向
    if (isApiRequest) {
      return res.status(401).json({ error: { code: 401, message: "Unauthorized" } });
    }
    return res.redirect("/");
  }

  try {
    // 验证 session 是否有效
    const isValid = await sessionService.verifyAndRenewSession(req.session.sessionId);
    if (!isValid) {
      delete req.session.sessionId;
      // 如果是API调用，返回401而不是重定向
      if (isApiRequest) {
        return res.status(401).json({ error: { code: 401, message: "Unauthorized" } });
      }
      return res.redirect("/");
    }
    next();
  } catch (error) {
    logger.error("Session verification error", { message: error.message });
    delete req.session.sessionId;
    // 如果是API调用，返回401而不是重定向
    if (isApiRequest) {
      return res.status(401).json({ error: { code: 401, message: "Unauthorized" } });
    }
    return res.redirect("/");
  }
}

app.set("trust proxy", 1);

// 中间件配置
app.use(languageHandler);
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// 源码部署时托管已构建的前端；Docker 后端镜像无 dist，此处自动空转（前端由 Nginx 容器提供）
app.use(express.static(frontendDistPath));
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: config.cookieSecure,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24小时
    },
  }),
);

// 版本信息 API
app.get("/version", (req, res) => {
  const requestBase = `${req.protocol}://${req.get("host")}`;
  res.json({
    version: versionInfo.version,
    name: versionInfo.name,
    fullTag: `${versionInfo.tagPrefix}${versionInfo.version}`,
    publicBaseUrl: getPublicBaseUrl(requestBase),
  });
});

function sendFrontendApp(_req, res, next) {
  if (!fs.existsSync(frontendIndexPath)) {
    return res.status(404).json({
      error: {
        code: 404,
        message: "Frontend build not found. Run `make frontend-build` for production UI or `make frontend-dev` for local development.",
      },
    });
  }

  res.sendFile(frontendIndexPath, (error) => {
    if (error) next(error);
  });
}

// 启动应用
async function startApp() {
  try {
    // 初始化数据库
    await initializeDatabase();

    // 前端分离后，认证接口仅通过 API 暴露。
    app.use("/api/auth", authRoutes);

    app.get("/", sendFrontendApp);

    // 注册路由
    app.use("/api", requireAuth, apiRoutes);

    // 公开订阅路由：/:path、/:path/:format、/:path/nodes
    const subscriptionRoutes = require("./routes/subscriptionRoutes");
    app.use("/", subscriptionRoutes);

    // 全局错误处理
    app.use(errorHandler);

    // 启动服务器
    app.listen(config.port, () => {
      logger.info(`服务器运行在 http://localhost:${config.port}`);

      // 如果是生产环境，添加安全提示
      if (config.nodeEnv === "production") {
        logger.warn("安全提示: 确保已配置 HTTPS 和适当的防火墙规则");
      }
    });
  } catch (error) {
    logger.error("应用启动失败", { message: error.message });
    process.exit(1);
  }
}

// 启动应用
startApp();

// 优雅关闭
process.on("SIGINT", () => {
  logger.info("收到终止信号，正在关闭应用...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.info("收到终止信号，正在关闭应用...");
  process.exit(0);
});
