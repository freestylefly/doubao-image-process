# 豆包图像处理聊天工具 - 部署指南

## 📋 目录

- [项目概述](#项目概述)
- [系统要求](#系统要求)
- [快速部署](#快速部署)
- [详细部署步骤](#详细部署步骤)
- [环境配置](#环境配置)
- [Docker部署](#docker部署)
- [传统部署](#传统部署)
- [Nginx配置](#nginx配置)
- [SSL证书配置](#ssl证书配置)
- [监控和维护](#监控和维护)
- [故障排除](#故障排除)
- [性能优化](#性能优化)

## 🚀 项目概述

豆包图像处理聊天工具是一个基于Node.js的Web应用，提供以下功能：

- 🤖 豆包AI对话功能
- 🖼️ 图像上传和处理
- 📱 响应式Web界面
- ☁️ 阿里云OSS存储支持
- 🔄 流式响应支持

**技术栈：**
- 后端：Node.js + Express
- 前端：原生HTML/CSS/JavaScript
- 存储：本地文件系统 + 阿里云OSS（可选）
- 容器化：Docker + Docker Compose
- 反向代理：Nginx

## 💻 系统要求

### 最低要求
- **CPU**: 1核心
- **内存**: 512MB
- **存储**: 1GB可用空间
- **操作系统**: Linux/macOS/Windows

### 推荐配置
- **CPU**: 2核心或以上
- **内存**: 2GB或以上
- **存储**: 10GB可用空间
- **网络**: 稳定的互联网连接

### 软件依赖
- **Node.js**: 16.0.0+
- **npm**: 8.0.0+
- **Docker**: 20.0.0+ (Docker部署)
- **Docker Compose**: 2.0.0+ (Docker部署)

## ⚡ 快速部署

### 使用Docker（推荐）

```bash
# 1. 克隆项目
git clone <repository-url>
cd doubao-image-process

# 2. 配置环境变量
cp .env.example .env.production
# 编辑 .env.production 文件，填入必要的配置

# 3. 一键部署
./deploy.sh production
```

### 传统部署

```bash
# 1. 安装依赖
npm install --production

# 2. 配置环境变量
export NODE_ENV=production
export PORT=3000
export DOUBAO_API_KEY=your_api_key

# 3. 启动服务
npm start
```

## 📝 详细部署步骤

### 1. 准备工作

#### 1.1 获取源代码
```bash
git clone <repository-url>
cd doubao-image-process
```

#### 1.2 检查文件结构
```
doubao-image-process/
├── server.js              # 主服务器文件
├── index.html            # 前端页面
├── script.js             # 前端逻辑
├── style.css             # 样式文件
├── package.json          # 依赖配置
├── Dockerfile            # Docker配置
├── docker-compose.yml    # Docker Compose配置
├── nginx.conf            # Nginx配置
├── deploy.sh             # 部署脚本
├── .env.example          # 环境变量模板
├── .env.production       # 生产环境配置
└── uploads/              # 上传文件目录
```

### 2. 环境配置

#### 2.1 复制环境配置文件
```bash
cp .env.example .env.production
```

#### 2.2 编辑生产环境配置
```bash
vim .env.production
```

**必需配置：**
```env
# 豆包API密钥（必需）
DOUBAO_API_KEY=your_doubao_api_key_here

# 服务器端口
PORT=3000

# 运行环境
NODE_ENV=production
```

**可选配置：**
```env
# 阿里云OSS配置
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret
OSS_BUCKET=your_bucket_name
OSS_REGION=oss-cn-beijing

# 安全配置
CORS_ORIGIN=https://yourdomain.com
MAX_FILE_SIZE=10485760
```

## 🐳 Docker部署

### 方式一：使用部署脚本（推荐）

```bash
# 生产环境部署（包含Nginx）
./deploy.sh production

# 开发环境部署
./deploy.sh development
```

### 方式二：手动Docker部署

#### 2.1 构建镜像
```bash
docker build -t doubao-image-process .
```

#### 2.2 使用 Docker Compose（推荐）

**基础部署（仅应用服务）：**
```bash
# 构建并启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

**包含 Nginx 的完整部署：**
```bash
# 使用包含nginx的配置文件
docker-compose -f docker-compose-nginx.yml up -d

# 查看日志
docker-compose -f docker-compose-nginx.yml logs -f

# 停止服务
docker-compose -f docker-compose-nginx.yml down
```

#### 2.3 手动运行容器
```bash
# 简单运行
docker run -d \
  --name doubao-app \
  -p 3000:3000 \
  --env-file .env.production \
  -v $(pwd)/uploads:/app/uploads \
  doubao-image-process

# 包含Nginx反向代理
docker-compose --profile with-nginx up -d
```

#### 2.3 验证部署
```bash
# 检查容器状态
docker-compose ps

# 查看日志
docker-compose logs -f doubao-app

# 健康检查
curl http://localhost:3000/health
```

## 🖥️ 传统部署

### 1. 安装Node.js
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# macOS
brew install node
```

### 2. 安装依赖
```bash
npm install --production
```

### 3. 配置系统服务

#### 3.1 创建systemd服务文件
```bash
sudo vim /etc/systemd/system/doubao-app.service
```

```ini
[Unit]
Description=Doubao Image Process Chat Tool
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/doubao-image-process
EnvironmentFile=/path/to/doubao-image-process/.env.production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### 3.2 启动服务
```bash
sudo systemctl daemon-reload
sudo systemctl enable doubao-app
sudo systemctl start doubao-app
sudo systemctl status doubao-app
```

## 🌐 Nginx配置

### 1. 安装Nginx
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 2. 配置Nginx
```bash
sudo cp nginx.conf /etc/nginx/sites-available/doubao-app
sudo ln -s /etc/nginx/sites-available/doubao-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. 防火墙配置
```bash
# Ubuntu/Debian
sudo ufw allow 'Nginx Full'

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## 🔒 SSL证书配置

### 使用Let's Encrypt（免费）

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d yourdomain.com

# 自动续期
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

### 使用自签名证书（测试）

```bash
# 创建SSL目录
sudo mkdir -p /etc/nginx/ssl

# 生成自签名证书
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/key.pem \
  -out /etc/nginx/ssl/cert.pem

# 更新Nginx配置启用HTTPS
```

## 📊 监控和维护

### 1. 日志管理

```bash
# 查看应用日志
docker-compose logs -f doubao-app

# 查看Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 日志轮转配置
sudo vim /etc/logrotate.d/doubao-app
```

### 2. 性能监控

```bash
# 系统资源监控
top
htop
iostat

# Docker容器监控
docker stats

# 应用健康检查
curl http://localhost:3000/health
```

### 3. 备份策略

```bash
# 备份上传文件
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/

# 备份配置文件
cp .env.production .env.production.backup

# 自动备份脚本
#!/bin/bash
BACKUP_DIR="/backup/doubao-app"
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/uploads-$(date +%Y%m%d-%H%M%S).tar.gz uploads/
find $BACKUP_DIR -name "uploads-*.tar.gz" -mtime +7 -delete
```

## 🔧 故障排除

### 常见问题

#### 1. Docker 网络连接超时

**症状：** Docker Hub 连接超时错误

**解决方案：**
```bash
# 如果遇到 Docker Hub 连接超时错误，运行修复脚本
./fix-docker-network.sh

# 或者手动使用国内镜像源
# 已自动配置使用阿里云镜像源
```

详细解决方案请查看：`DOCKER_NETWORK_TROUBLESHOOTING.md`

#### 2. 服务无法启动

**症状：** 容器或服务启动失败

**解决方案：**
```bash
# 检查日志
docker-compose logs doubao-app

# 检查端口占用
sudo netstat -tlnp | grep :3000

# 检查环境变量
docker-compose exec doubao-app env | grep DOUBAO
```

#### 3. 端口被占用

**解决方案：**
```bash
# 查看端口占用
lsof -i :3000
# 或者修改端口
PORT=3001 npm start
```

#### 4. 权限问题

**解决方案：**
```bash
# 确保有正确的文件权限
chmod +x deploy.sh start-production.sh fix-docker-network.sh
```

#### 5. 环境变量未设置

**解决方案：**
```bash
# 检查环境变量
echo $DOUBAO_API_KEY
echo $OSS_ACCESS_KEY_ID
```

#### 6. API调用失败

**症状：** 豆包API返回错误

**解决方案：**
```bash
# 检查API密钥
echo $DOUBAO_API_KEY

# 测试网络连接
curl -I http://ark.cn-beijing.volces.com

# 检查请求日志
docker-compose logs doubao-app | grep "豆包API"
```

#### 7. 文件上传失败

**症状：** 图片上传返回错误

**解决方案：**
```bash
# 检查uploads目录权限
ls -la uploads/

# 检查磁盘空间
df -h

# 检查文件大小限制
grep MAX_FILE_SIZE .env.production
```

#### 8. 内存不足

**症状：** 应用响应缓慢或崩溃

**解决方案：**
```bash
# 检查内存使用
free -h
docker stats

# 重启服务
docker-compose restart doubao-app

# 增加swap空间
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 调试命令

```bash
# 进入容器调试
docker-compose exec doubao-app /bin/sh

# 查看容器资源使用
docker stats doubao-app

# 检查网络连接
docker-compose exec doubao-app wget -qO- http://localhost:3000/health

# 查看环境变量
docker-compose exec doubao-app printenv
```

## ⚡ 性能优化

### 1. 应用层优化

- **启用Gzip压缩**（已在Nginx配置中启用）
- **静态文件缓存**（已配置）
- **图片压缩和优化**
- **API响应缓存**

### 2. 系统层优化

```bash
# 调整文件描述符限制
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# 优化TCP参数
echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" >> /etc/sysctl.conf
sudo sysctl -p
```

### 3. Docker优化

```bash
# 限制容器资源使用
docker-compose up -d --scale doubao-app=2

# 使用多阶段构建减小镜像大小
# 已在Dockerfile中实现
```

## 📞 技术支持

如果遇到问题，请按以下步骤操作：

1. **查看日志**：`docker-compose logs -f`
2. **检查配置**：确认环境变量正确设置
3. **网络测试**：确认可以访问豆包API
4. **资源检查**：确认系统资源充足
5. **重启服务**：`docker-compose restart`

---

**部署完成后，请访问 http://localhost 开始使用豆包图像处理聊天工具！** 🎉