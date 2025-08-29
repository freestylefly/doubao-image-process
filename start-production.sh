#!/bin/bash

# 豆包图像处理聊天工具 - 生产环境启动脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 检查Node.js版本
check_node_version() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js 16.0.0 或更高版本"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="16.0.0"
    
    if ! node -e "process.exit(require('semver').gte('$NODE_VERSION', '$REQUIRED_VERSION') ? 0 : 1)" 2>/dev/null; then
        log_error "Node.js 版本过低，当前版本: $NODE_VERSION，要求版本: $REQUIRED_VERSION+"
        exit 1
    fi
    
    log_success "Node.js 版本检查通过: $NODE_VERSION"
}

# 检查依赖
check_dependencies() {
    if [[ ! -f "package.json" ]]; then
        log_error "package.json 文件不存在"
        exit 1
    fi
    
    if [[ ! -d "node_modules" ]]; then
        log_info "安装依赖包..."
        npm install --production
    else
        log_info "检查依赖更新..."
        npm ci --production
    fi
    
    log_success "依赖检查完成"
}

# 检查环境配置
check_environment() {
    if [[ ! -f ".env.production" ]]; then
        log_warning "未找到 .env.production 文件"
        if [[ -f ".env.example" ]]; then
            log_info "复制 .env.example 到 .env.production"
            cp .env.example .env.production
            log_warning "请编辑 .env.production 文件并配置必要的环境变量"
        else
            log_error "缺少环境配置文件"
            exit 1
        fi
    fi
    
    # 加载环境变量
    if [[ -f ".env.production" ]]; then
        export $(grep -v '^#' .env.production | xargs)
    fi
    
    # 检查关键环境变量
    if [[ -z "$DOUBAO_API_KEY" ]]; then
        log_error "DOUBAO_API_KEY 未设置，请在 .env.production 中配置"
        exit 1
    fi
    
    # 设置默认值
    export NODE_ENV=${NODE_ENV:-production}
    export PORT=${PORT:-3000}
    
    log_success "环境配置检查完成"
}

# 创建必要目录
setup_directories() {
    mkdir -p uploads logs
    chmod 755 uploads logs
    log_success "目录创建完成"
}

# 检查端口占用
check_port() {
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        log_error "端口 $PORT 已被占用"
        log_info "请检查是否有其他服务在使用该端口，或修改 PORT 环境变量"
        exit 1
    fi
    log_success "端口 $PORT 可用"
}

# 启动应用
start_application() {
    log_info "启动豆包图像处理聊天工具..."
    log_info "环境: $NODE_ENV"
    log_info "端口: $PORT"
    log_info "API Key: ${DOUBAO_API_KEY:0:10}..."
    
    # 使用 PM2 启动（如果可用）
    if command -v pm2 &> /dev/null; then
        log_info "使用 PM2 启动应用"
        pm2 start server.js --name "doubao-app" --env production
        pm2 save
        pm2 startup
    else
        log_info "直接启动应用"
        log_warning "建议安装 PM2 进程管理器: npm install -g pm2"
        node server.js
    fi
}

# 主函数
main() {
    log_info "🚀 豆包图像处理聊天工具 - 生产环境启动"
    echo
    
    check_node_version
    check_dependencies
    check_environment
    setup_directories
    check_port
    
    echo
    log_info "所有检查通过，准备启动应用..."
    echo
    
    start_application
}

# 信号处理
trap 'log_info "收到停止信号，正在关闭应用..."; exit 0' SIGTERM SIGINT

# 执行主函数
main "$@"