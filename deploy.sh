#!/bin/bash

# 豆包图像处理聊天工具 - 部署脚本
# 使用方法: ./deploy.sh [production|development]

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查参数
ENV=${1:-production}
if [[ "$ENV" != "production" && "$ENV" != "development" ]]; then
    log_error "无效的环境参数: $ENV"
    log_info "使用方法: ./deploy.sh [production|development]"
    exit 1
fi

log_info "开始部署到 $ENV 环境..."

# 检查必要的文件
log_info "检查必要文件..."
required_files=("package.json" "server.js" "index.html" "Dockerfile")
for file in "${required_files[@]}"; do
    if [[ ! -f "$file" ]]; then
        log_error "缺少必要文件: $file"
        exit 1
    fi
done
log_success "文件检查完成"

# 检查环境配置
log_info "检查环境配置..."
if [[ "$ENV" == "production" ]]; then
    if [[ ! -f ".env.production" ]]; then
        log_error "缺少生产环境配置文件: .env.production"
        log_info "请复制 .env.example 并配置相应的环境变量"
        exit 1
    fi
    
    # 检查关键环境变量
    if ! grep -q "DOUBAO_API_KEY=." .env.production; then
        log_warning "请确保在 .env.production 中配置了 DOUBAO_API_KEY"
    fi
fi

# 停止现有容器
log_info "停止现有容器..."
docker-compose down --remove-orphans || true

# 清理旧镜像（可选）
read -p "是否清理旧的Docker镜像? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "清理旧镜像..."
    docker system prune -f
    docker image prune -f
fi

# 构建新镜像
log_info "构建Docker镜像..."
docker-compose build --no-cache

# 启动服务
log_info "启动服务..."
if [[ "$ENV" == "production" ]]; then
    # 生产环境：启动应用和Nginx
    docker-compose --profile with-nginx up -d
else
    # 开发环境：只启动应用
    docker-compose up -d doubao-app
fi

# 等待服务启动
log_info "等待服务启动..."
sleep 10

# 健康检查
log_info "执行健康检查..."
max_attempts=30
attempt=1

while [[ $attempt -le $max_attempts ]]; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log_success "服务启动成功！"
        break
    fi
    
    if [[ $attempt -eq $max_attempts ]]; then
        log_error "服务启动失败，请检查日志"
        docker-compose logs doubao-app
        exit 1
    fi
    
    log_info "等待服务启动... ($attempt/$max_attempts)"
    sleep 2
    ((attempt++))
done

# 显示服务状态
log_info "服务状态:"
docker-compose ps

# 显示访问信息
echo
log_success "🎉 部署完成！"
echo
log_info "📱 访问地址:"
if [[ "$ENV" == "production" ]]; then
    echo "   - HTTP:  http://localhost"
    echo "   - HTTPS: https://localhost (需要配置SSL证书)"
else
    echo "   - 开发环境: http://localhost:3000"
fi
echo
log_info "🔧 管理命令:"
echo "   - 查看日志: docker-compose logs -f"
echo "   - 停止服务: docker-compose down"
echo "   - 重启服务: docker-compose restart"
echo "   - 查看状态: docker-compose ps"
echo
log_info "📊 监控:"
echo "   - 健康检查: curl http://localhost:3000/health"
echo "   - 容器状态: docker stats"
echo

if [[ "$ENV" == "production" ]]; then
    log_warning "⚠️  生产环境提醒:"
    echo "   1. 请确保防火墙已正确配置"
    echo "   2. 建议配置SSL证书启用HTTPS"
    echo "   3. 定期备份上传的文件和日志"
    echo "   4. 监控服务器资源使用情况"
    echo "   5. 设置日志轮转避免磁盘空间不足"
fi

log_success "部署脚本执行完成！"