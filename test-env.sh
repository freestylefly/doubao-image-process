#!/bin/bash

# 测试环境变量加载脚本
echo "=== 测试环境变量加载 ==="

# 加载.env.production文件
if [[ -f ".env.production" ]]; then
    echo "正在加载 .env.production 文件..."
    
    while IFS= read -r line || [[ -n "$line" ]]; do
        # 跳过注释和空行
        if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
            continue
        fi
        
        # 导出环境变量
        if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
            export "$line"
            key=$(echo "$line" | cut -d'=' -f1)
            value=$(echo "$line" | cut -d'=' -f2-)
            if [[ "$key" =~ (KEY|SECRET|PASSWORD) ]] && [[ -n "$value" ]]; then
                echo "  ✓ $key=***（已隐藏）"
            elif [[ -n "$value" ]]; then
                echo "  ✓ $key=$value"
            else
                echo "  ⚠ $key=（未设置）"
            fi
        fi
    done < ".env.production"
    
    echo ""
    echo "=== 验证OSS环境变量 ==="
    echo "OSS_ACCESS_KEY_ID: ${OSS_ACCESS_KEY_ID:-(未设置)}"
    echo "OSS_ACCESS_KEY_SECRET: ${OSS_ACCESS_KEY_SECRET:+(已设置)}"
    echo "OSS_BUCKET: ${OSS_BUCKET:-(未设置)}"
    echo "OSS_REGION: ${OSS_REGION:-(未设置)}"
    echo "OSS_PATH: ${OSS_PATH:-(未设置)}"
    echo "OSS_DOMAIN: ${OSS_DOMAIN:-(未设置)}"
    echo "PORT: ${PORT:-(未设置)}"
    
    echo ""
    echo "=== 启动Node.js进程测试 ==="
    echo "使用env命令启动Node.js进程，传递所有环境变量..."
    env node -e "console.log('OSS配置检查:'); console.log('OSS_BUCKET:', process.env.OSS_BUCKET || '未设置'); console.log('OSS_REGION:', process.env.OSS_REGION || '未设置'); console.log('PORT:', process.env.PORT || '未设置');"
else
    echo "❌ .env.production 文件不存在"
fi