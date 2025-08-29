#!/bin/bash

# Docker 网络问题快速修复脚本
# 用于解决 Docker Hub 连接超时问题

echo "🔧 Docker 网络问题修复脚本"
echo "================================"

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  注意：某些操作可能需要 sudo 权限"
fi

# 1. 清理 Docker 缓存
echo "\n📦 步骤 1: 清理 Docker 缓存..."
docker builder prune -f
docker system prune -f

# 2. 检查网络连接
echo "\n🌐 步骤 2: 检查网络连接..."
echo "测试 Docker Hub 连接:"
if curl -s --connect-timeout 5 https://registry-1.docker.io/v2/ > /dev/null; then
    echo "✅ Docker Hub 连接正常"
else
    echo "❌ Docker Hub 连接失败，建议使用镜像源"
fi

# 3. 配置 Docker 镜像源（如果需要）
echo "\n🔄 步骤 3: 配置 Docker 镜像源..."

# 检查 daemon.json 是否存在
if [ ! -f "/etc/docker/daemon.json" ]; then
    echo "创建 Docker daemon 配置文件..."
    
    # 创建配置目录
    sudo mkdir -p /etc/docker
    
    # 创建配置文件
    sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ],
  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 5,
  "storage-driver": "overlay2"
}
EOF
    
    echo "✅ Docker 镜像源配置已创建"
    
    # 重启 Docker 服务
    echo "重启 Docker 服务..."
    if command -v systemctl > /dev/null; then
        sudo systemctl restart docker
        echo "✅ Docker 服务已重启"
    else
        echo "⚠️  请手动重启 Docker 服务"
    fi
else
    echo "✅ Docker daemon 配置文件已存在"
fi

# 4. 测试镜像拉取
echo "\n🧪 步骤 4: 测试镜像拉取..."
echo "尝试拉取 node:18-alpine 镜像..."

if timeout 60 docker pull node:18-alpine; then
    echo "✅ 镜像拉取成功"
else
    echo "❌ 镜像拉取失败，尝试使用阿里云镜像..."
    if timeout 60 docker pull registry.cn-hangzhou.aliyuncs.com/library/node:18-alpine; then
        echo "✅ 阿里云镜像拉取成功"
        # 给镜像打标签
        docker tag registry.cn-hangzhou.aliyuncs.com/library/node:18-alpine node:18-alpine
        echo "✅ 镜像标签已更新"
    else
        echo "❌ 所有镜像源都无法访问，请检查网络连接"
    fi
fi

# 5. 构建应用镜像
echo "\n🏗️  步骤 5: 构建应用镜像..."
echo "开始构建 doubao-app 镜像..."

if docker-compose build doubao-app; then
    echo "✅ 应用镜像构建成功！"
    echo "\n🎉 修复完成！现在可以运行："
    echo "   docker-compose up -d"
else
    echo "❌ 应用镜像构建失败"
    echo "\n🔍 故障排除建议："
    echo "1. 检查 Dockerfile 语法"
    echo "2. 确保所有依赖文件存在"
    echo "3. 查看详细错误信息"
    echo "4. 尝试手动构建：docker build -t doubao-app ."
fi

echo "\n📋 修复脚本执行完成"
echo "如果问题仍然存在，请查看 DOCKER_NETWORK_TROUBLESHOOTING.md 获取更多解决方案"