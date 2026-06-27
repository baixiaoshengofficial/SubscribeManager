const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const app = express();
const { initializeDatabase } = require("./database");
const config = require("./config");
const versionInfo = require("../version.json");

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
const serveFrontend = process.env.SERVE_FRONTEND !== "false";

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
    console.error("Session verification error:", error);
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
if (serveFrontend) {
  app.use(express.static(frontendDistPath));
}
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
app.get("/config", (req, res) => {
  res.json({
    ADMIN_PATH: config.adminPath,
  });
});

// 版本信息 API
app.get("/version", (req, res) => {
  res.json({
    version: versionInfo.version,
    name: versionInfo.name,
    fullTag: `${versionInfo.tagPrefix}${versionInfo.version}`
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

    if (serveFrontend) {
      app.get("/", sendFrontendApp);
      app.get(`/${config.adminPath}`, (_req, res) => {
        res.redirect("/");
      });
    }

    // 注册路由
    app.use("/api", requireAuth, apiRoutes);
    
    // 订阅路由，排除管理路径
    const subscriptionRoutes = require("./routes/subscriptionRoutes");
    // 同时支持 /subscribe/path 和 /path 两种格式
    app.use("/", (req, res, next) => {
      // 如果路径以adminPath开头，跳过订阅路由
      if (req.path.startsWith(`/${config.adminPath}`)) {
        return next();
      }
      subscriptionRoutes(req, res, next);
    });

    // 全局错误处理
    app.use(errorHandler);

    // 启动服务器
    app.listen(config.port, () => {
      console.log(`服务器运行在 http://localhost:${config.port}`);
      console.log(`管理面板路径: /${config.adminPath}`);

      // 如果是生产环境，添加安全提示
      if (config.nodeEnv === "production") {
        console.log(
          "\x1b[33m%s\x1b[0m",
          "安全提示: 确保已配置 HTTPS 和适当的防火墙规则",
        );
      }
    });
  } catch (error) {
    console.error("应用启动失败:", error);
    process.exit(1);
  }
}

// 启动应用
startApp();

// 优雅关闭
process.on("SIGINT", () => {
  console.log("\n收到终止信号，正在关闭应用...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n收到终止信号，正在关闭应用...");
  process.exit(0);
});
