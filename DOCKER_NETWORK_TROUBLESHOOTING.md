# Docker 网络连接问题解决方案

当遇到 Docker 构建时网络连接超时的问题时，可以尝试以下解决方案：

## 问题描述
```
ERROR: Service 'doubao-app' failed to build: Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection (Client.Timeout exceeded while awaiting headers)
```

## 解决方案

### 1. 配置 Docker 镜像源（推荐）

#### 方法一：配置 Docker daemon
创建或编辑 `/etc/docker/daemon.json` 文件：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
```

然后重启 Docker 服务：
```bash
sudo systemctl restart docker
```

#### 方法二：修改 Dockerfile 使用国内镜像
修改 `Dockerfile` 第一行：

```dockerfile
# 原来的
FROM node:18-alpine

# 改为使用阿里云镜像
FROM registry.cn-hangzhou.aliyuncs.com/library/node:18-alpine

# 或者使用网易镜像
FROM hub-mirror.c.163.com/library/node:18-alpine
```

### 2. 增加 Docker 构建超时时间

在 `docker-compose.yml` 中添加构建超时配置：

```yaml
version: '3.8'
services:
  doubao-app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        BUILDKIT_INLINE_CACHE: 1
    environment:
      - DOCKER_BUILDKIT=1
      - BUILDKIT_PROGRESS=plain
    # 其他配置...
```

或者在构建时使用命令行参数：
```bash
docker-compose build --build-arg BUILDKIT_INLINE_CACHE=1 --progress=plain
```

### 3. 使用代理（如果有）

如果你有可用的代理，可以配置 Docker 使用代理：

创建 `/etc/systemd/system/docker.service.d/http-proxy.conf`：

```ini
[Service]
Environment="HTTP_PROXY=http://proxy.example.com:8080"
Environment="HTTPS_PROXY=http://proxy.example.com:8080"
Environment="NO_PROXY=localhost,127.0.0.1"
```

然后重启服务：
```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

### 4. 检查网络连接

```bash
# 测试网络连接
ping registry-1.docker.io

# 测试 HTTPS 连接
curl -I https://registry-1.docker.io/v2/

# 检查 DNS 解析
nslookup registry-1.docker.io
```

### 5. 清理 Docker 缓存并重试

```bash
# 清理构建缓存
docker builder prune -a

# 清理所有未使用的资源
docker system prune -a

# 重新构建
docker-compose build --no-cache
```

### 6. 替代构建方法

#### 方法一：分步构建
```bash
# 先单独拉取基础镜像
docker pull node:18-alpine

# 然后构建应用
docker-compose build
```

#### 方法二：使用本地构建
如果网络问题持续存在，可以考虑：
1. 在网络条件好的环境下构建镜像
2. 导出镜像文件
3. 在目标环境导入镜像

```bash
# 导出镜像
docker save -o doubao-app.tar doubao-app:latest

# 导入镜像
docker load -i doubao-app.tar
```

## 推荐解决步骤

1. **首先尝试配置国内镜像源**（最有效）
2. **清理 Docker 缓存**
3. **重新构建镜像**
4. **如果仍有问题，检查网络连接**
5. **考虑使用代理或其他网络解决方案**

## 验证解决方案

构建成功后，你应该看到类似的输出：
```
Building doubao-app
Step 1/13 : FROM node:18-alpine
 ---> [镜像ID]
Step 2/13 : WORKDIR /app
 ---> [继续构建步骤...]
```

如果问题仍然存在，请检查防火墙设置或联系网络管理员。