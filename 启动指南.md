# Label Studio 启动指南

本文档介绍如何使用 Poetry 启动 Label Studio 的前端和后端服务。

## 环境要求

- Python 3.10+
- Poetry 2.0+
- Node.js 和 Yarn
- Git Bash (Windows 环境)

## 项目结构

```
label-studio-1.20/
├── label_studio/          # 后端 Django 应用
├── web/                   # 前端 React 应用
├── pyproject.toml         # Poetry 配置文件
├── poetry.lock           # Poetry 依赖锁定文件
└── .env.development      # 开发环境配置
```

## 启动步骤

### 1. 检查环境

确保已安装必要的工具：

```bash
# 检查 Poetry 版本
poetry --version

# 检查 Node.js 和 Yarn
node --version
yarn --version
```

### 2. 安装后端依赖

```bash
# 进入项目根目录
cd label-studio-1.20

# 安装 Python 依赖
poetry install
```

### 3. 配置环境变量

确保 `.env.development` 文件存在并包含以下配置：

```bash
# 查看环境配置
cat .env.development
```

文件内容应该包含：
```
FRONTEND_HMR=true
FRONTEND_HOSTNAME=http://localhost:8010
DJANGO_HOSTNAME=http://localhost:8080
```

### 4. 初始化数据库

```bash
# 运行数据库迁移
poetry run python label_studio/manage.py migrate

# 收集静态文件
poetry run python label_studio/manage.py collectstatic --noinput
```

### 5. 构建前端文件（推荐方式）

在开发模式下，建议先构建前端文件以确保静态资源可用：

```bash
# 进入前端目录
cd web

# 构建前端文件
yarn ls:build
```

构建完成后，前端文件将生成在 `web/dist/apps/labelstudio/` 目录中。

### 6. 启动后端服务器

```bash
# 启动 Django 开发服务器
set FRONTEND_HMR=true && set FRONTEND_HOSTNAME=http://localhost:8010 && poetry run python label_studio/manage.py runserver 0.0.0.0:8080
```

后端服务器将在 `http://localhost:8080` 启动。

### 7. 启动前端开发服务器（可选）

如果您需要热重载功能，可以在新的终端窗口中启动前端开发服务器：

```bash
# 进入前端目录
cd web

# Windows 环境下设置环境变量并启动
set NODE_ENV=development
set BUILD_NO_SERVER=true
yarn ls:dev
```

或者使用单行命令：

```bash
# Windows 环境
set NODE_ENV=development && set BUILD_NO_SERVER=true && yarn ls:dev

# Linux/Mac 环境
NODE_ENV=development BUILD_NO_SERVER=true yarn ls:dev
```

前端开发服务器将在 `http://localhost:8010` 启动。

## 验证启动状态

### 检查后端服务器

```bash
# 检查端口 8080 是否监听
netstat -an | grep 8080

# 测试后端响应
curl -s -I http://localhost:8080
```

### 检查前端服务器

```bash
# 检查端口 8010 是否监听
netstat -an | grep 8010

# 测试前端响应
curl -s http://localhost:8010 | head -10
```

### 检查静态文件

```bash
# 测试 CSS 文件访问
curl -s -I http://localhost:8080/react-app/main.css
```

## 访问应用

启动成功后，您可以通过以下方式访问：

- **主应用**: http://localhost:8080
- **前端开发服务器**: http://localhost:8010（如果启动）

## 常见问题解决

### 1. 静态文件访问错误

**错误信息**：
```
The joined path (E:\main.css) is located outside of the base path component (E:\A25028\cursor\label-studio-1.20\web\dist\apps\labelstudio)
```

**问题原因**：
- 前端文件没有构建，`web/dist/apps/labelstudio` 目录不存在
- Django 试图从本地文件系统提供 `/react-app/main.css` 文件，但路径解析失败

**解决方案**：
1. 构建前端文件：
   ```bash
   cd web
   yarn ls:build
   ```
2. 重新启动 Django 服务器：
   ```bash
   poetry run python label_studio/manage.py runserver 0.0.0.0:8080
   ```

### 2. 环境变量设置问题 (Windows)

在 Windows 环境下，使用 `set` 命令设置环境变量：

```bash
# 错误的方式 (Linux/Mac 语法)
NODE_ENV=development yarn ls:dev

# 正确的方式 (Windows 语法)
set NODE_ENV=development && yarn ls:dev
```

### 3. 端口被占用

如果端口被占用，可以修改端口：

```bash
# 修改后端端口
poetry run python label_studio/manage.py runserver 0.0.0.0:8000

# 修改前端端口 (在 .env.development 中修改 FRONTEND_HOSTNAME)
```

### 4. 依赖安装问题

如果遇到依赖问题，可以重新安装：

```bash
# 重新安装 Python 依赖
poetry install --sync

# 重新安装 Node.js 依赖
cd web
yarn install --frozen-lockfile
```

### 5. 数据库问题

如果数据库有问题，可以重新初始化：

```bash
# 删除数据库文件 (SQLite)
rm label_studio.sqlite3

# 重新运行迁移
poetry run python label_studio/manage.py migrate
```

## 开发模式配置

### 生产模式（推荐）

使用构建的前端文件，适合大多数开发场景：

```bash
# 构建前端文件
cd web && yarn ls:build

# 启动后端服务器
poetry run python label_studio/manage.py runserver 0.0.0.0:8080
```

### 开发模式（热重载）

启用 HMR 可以实现前端代码的热重载：

1. 确保 `.env.development` 中设置 `FRONTEND_HMR=true`
2. 启动前端开发服务器
3. 修改前端代码时会自动刷新浏览器

### 调试模式

后端服务器默认运行在调试模式下，会显示详细的错误信息。

## 停止服务

要停止服务，在相应的终端窗口中按 `Ctrl+C`。

## 生产环境部署

本文档仅适用于开发环境。生产环境部署请参考官方文档：

- [Docker 部署](https://labelstud.io/guide/deploy.html)
- [云平台部署](https://labelstud.io/guide/deploy.html)

## 相关链接

- [Label Studio 官方文档](https://labelstud.io/guide/)
- [Poetry 文档](https://python-poetry.org/docs/)
- [NX 文档](https://nx.dev/)
- [Django 文档](https://docs.djangoproject.com/)

---

**注意**: 本文档基于 Label Studio 1.20.0 版本编写，其他版本可能略有不同。

**更新记录**：
- 添加了静态文件访问错误的详细解决方案
- 增加了前端文件构建步骤
- 优化了开发模式和生产模式的说明
