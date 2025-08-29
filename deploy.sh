#!/bin/bash

# 豆包图像处理聊天工具 - 简易部署脚本
# 使用方法: ./deploy.sh [start|stop|restart|status]

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
PORT=9848
APP_NAME="doubao-image-process"
PID_FILE="$APP_NAME.pid"
LOG_FILE="$APP_NAME.log"
ERROR_LOG_FILE="$APP_NAME.error.log"

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

# 检查Node.js是否安装
check_nodejs() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js"
        exit 1
    fi
    log_info "Node.js 版本: $(node --version)"
}

# 检查必要文件
check_files() {
    log_info "检查必要文件..."
    required_files=("package.json" "server.js" "index.html")
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "缺少必要文件: $file"
            exit 1
        fi
    done
    log_success "文件检查完成"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    if command -v npm &> /dev/null; then
        npm install
    else
        log_error "npm 未找到，请确保 Node.js 正确安装"
        exit 1
    fi
    log_success "依赖安装完成"
}

# 检查进程是否运行
is_running() {
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# 加载环境配置
load_env_config() {
    local env_file=".env.production"
    
    if [[ -f "$env_file" ]]; then
        log_info "发现生产环境配置文件: $env_file"
        log_info "加载环境变量..."
        
        # 读取并导出环境变量
        while IFS= read -r line || [[ -n "$line" ]]; do
            # 跳过注释和空行
            if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
                continue
            fi
            
            # 导出环境变量
            if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
                export "$line"
                # 显示已加载的配置（隐藏敏感信息）
                local key=$(echo "$line" | cut -d'=' -f1)
                local value=$(echo "$line" | cut -d'=' -f2-)
                if [[ "$key" =~ (KEY|SECRET|PASSWORD) ]] && [[ -n "$value" ]]; then
                    log_info "  ✓ $key=***（已隐藏）"
                elif [[ -n "$value" ]]; then
                    log_info "  ✓ $key=$value"
                else
                    log_warning "  ⚠ $key=（未设置）"
                fi
            fi
        done < "$env_file"
        
        # 如果.env.production中设置了PORT，使用该值
        if [[ -n "$PORT" ]] && [[ "$PORT" != "9848" ]]; then
            log_info "使用配置文件中的端口: $PORT"
        fi
        
        log_success "环境配置加载完成"
    else
        log_info "未找到生产环境配置文件: $env_file"
        log_info "将使用默认配置，用户可在页面上手动输入配置"
    fi
}

# 创建必要的目录
create_directories() {
    # 创建日志目录（如果配置了自定义日志路径）
    if [[ -n "$LOG_FILE" ]] && [[ "$LOG_FILE" != "$APP_NAME.log" ]]; then
        local log_dir=$(dirname "$LOG_FILE")
        if [[ ! -d "$log_dir" ]]; then
            log_info "创建日志目录: $log_dir"
            mkdir -p "$log_dir"
        fi
    fi
    
    # 创建上传目录
    if [[ ! -d "uploads" ]]; then
        log_info "创建上传目录: uploads"
        mkdir -p "uploads"
    fi
}

# 启动服务
start_service() {
    if is_running; then
        log_warning "服务已在运行中 (PID: $(cat $PID_FILE))"
        return 0
    fi
    
    # 加载环境配置
    load_env_config
    
    # 创建必要的目录
    create_directories
    
    log_info "启动服务..."
    
    # 确定实际使用的日志文件路径
    local actual_log_file="${LOG_FILE:-$APP_NAME.log}"
    local actual_error_log_file="${ERROR_LOG_FILE:-$APP_NAME.error.log}"
    
    # 设置环境变量并启动服务
    PORT=$PORT nohup node server.js > "$actual_log_file" 2> "$actual_error_log_file" &
    local pid=$!
    
    # 保存PID
    echo $pid > "$PID_FILE"
    
    # 等待服务启动
    sleep 3
    
    # 检查服务是否成功启动
    if is_running; then
        log_success "服务启动成功！PID: $pid"
        log_info "服务运行在端口: $PORT"
        log_info "访问地址: http://localhost:$PORT"
        log_info "日志文件: $actual_log_file"
        log_info "错误日志: $actual_error_log_file"
    else
        log_error "服务启动失败，请检查错误日志: $actual_error_log_file"
        exit 1
    fi
}

# 停止服务
stop_service() {
    if ! is_running; then
        log_warning "服务未运行"
        return 0
    fi
    
    local pid=$(cat "$PID_FILE")
    log_info "停止服务 (PID: $pid)..."
    
    kill "$pid" 2>/dev/null || true
    
    # 等待进程结束
    local count=0
    while ps -p "$pid" > /dev/null 2>&1 && [[ $count -lt 10 ]]; do
        sleep 1
        ((count++))
    done
    
    # 如果进程仍在运行，强制杀死
    if ps -p "$pid" > /dev/null 2>&1; then
        log_warning "强制停止服务..."
        kill -9 "$pid" 2>/dev/null || true
    fi
    
    rm -f "$PID_FILE"
    log_success "服务已停止"
}

# 重启服务
restart_service() {
    log_info "重启服务..."
    stop_service
    sleep 2
    start_service
}

# 显示服务状态
show_status() {
    echo
    log_info "=== 服务状态 ==="
    if is_running; then
        local pid=$(cat "$PID_FILE")
        log_success "服务正在运行"
        echo "   - PID: $pid"
        echo "   - 端口: $PORT"
        echo "   - 访问地址: http://localhost:$PORT"
        echo "   - 日志文件: $LOG_FILE"
        echo "   - 错误日志: $ERROR_LOG_FILE"
        
        # 显示内存使用情况
        if command -v ps &> /dev/null; then
            local memory=$(ps -o pid,rss,vsz -p "$pid" | tail -n 1 | awk '{print $2}')
            echo "   - 内存使用: ${memory}KB"
        fi
    else
        log_warning "服务未运行"
    fi
    echo
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    if curl -f "http://localhost:$PORT/health" > /dev/null 2>&1; then
        log_success "服务健康检查通过"
    else
        log_error "服务健康检查失败"
        return 1
    fi
}

# 显示日志
show_logs() {
    local lines=${1:-50}
    echo
    log_info "=== 最近 $lines 行日志 ==="
    if [[ -f "$LOG_FILE" ]]; then
        tail -n "$lines" "$LOG_FILE"
    else
        log_warning "日志文件不存在: $LOG_FILE"
    fi
    
    echo
    log_info "=== 最近 $lines 行错误日志 ==="
    if [[ -f "$ERROR_LOG_FILE" ]]; then
        tail -n "$lines" "$ERROR_LOG_FILE"
    else
        log_warning "错误日志文件不存在: $ERROR_LOG_FILE"
    fi
}

# 主函数
main() {
    local action=${1:-start}
    
    case "$action" in
        "start")
            check_nodejs
            check_files
            install_dependencies
            start_service
            show_status
            ;;
        "stop")
            stop_service
            ;;
        "restart")
            check_nodejs
            check_files
            restart_service
            show_status
            ;;
        "status")
            show_status
            ;;
        "health")
            health_check
            ;;
        "logs")
            show_logs "${2:-50}"
            ;;
        "help")
            echo "使用方法: $0 [start|stop|restart|status|health|logs|help]"
            echo
            echo "命令说明:"
            echo "  start   - 启动服务"
            echo "  stop    - 停止服务"
            echo "  restart - 重启服务"
            echo "  status  - 显示服务状态"
            echo "  health  - 健康检查"
            echo "  logs    - 显示日志 (可选参数: 行数，默认50行)"
            echo "  help    - 显示帮助信息"
            echo
            echo "示例:"
            echo "  $0 start          # 启动服务"
            echo "  $0 logs 100       # 显示最近100行日志"
            ;;
        *)
            log_error "无效的命令: $action"
            echo "使用 '$0 help' 查看帮助信息"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"