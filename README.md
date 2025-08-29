# 豆包图像处理聊天工具

一个基于豆包(Doubao) API的图像处理聊天工具，支持图像分析、智能对话和流式响应。

## ✨ 功能特性

- 🖼️ **图像分析**: 上传图片进行智能分析
- 💬 **智能对话**: 与AI进行自然语言交互
- 🔄 **流式响应**: 支持实时流式回复
- 📱 **响应式设计**: 适配各种设备屏幕
- 🎨 **现代化UI**: 美观的用户界面设计
- 🔧 **简单配置**: 只需输入API Key即可使用

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- 豆包 API Key

### 安装步骤

1. **克隆项目**

   ```bash
   git clone <your-repo-url>
   cd doubao-image-process
   ```

2. **安装依赖**

   ```bash
   npm install
   ```

3. **启动服务**

   ```bash
   npm start
   ```

   开发模式（自动重启）：

   ```bash
   npm run dev
   ```

4. **打开浏览器**

   ```text
   http://localhost:3000
   ```

### 配置API Key

1. 打开应用后，点击"⚙️ 设置"展开设置面板
2. 在"API Key"输入框中输入您的豆包 API Key
3. 配置会自动保存到本地存储

## 📖 使用说明

### 基本对话
- 在输入框中输入文字，按回车或点击发送按钮
- 支持多行输入，使用 Shift+Enter 换行

### 图像分析
1. 点击 📷 按钮选择图片
2. 图片会显示预览，可以点击 × 取消
3. 输入关于图片的问题（如"这张图片里有什么？"）
4. 发送后AI会分析图片并回复

### 快捷键
- `Enter`: 发送消息
- `Ctrl/Cmd + Enter`: 发送消息
- `Esc`: 取消图片选择

## 🔧 配置选项

### 设置面板
- **API Key**: 豆包 API 密钥
- **模型**: 使用的AI模型（默认：doubao-seed-1-6-vision-250815）
- **流式响应**: 开启后支持实时流式回复

### 环境变量
- `PORT`: 服务器端口（默认：3000）
- `NODE_ENV`: 运行环境（development/production）

## 📁 项目结构

```
doubao-image-process/
├── index.html          # 主页面
├── style.css           # 样式文件
├── script.js           # 前端逻辑
├── server.js           # 后端服务器
├── package.json        # 项目配置
├── README.md           # 说明文档
└── uploads/            # 图片上传目录（自动创建）
```

## 🔌 API 接口

### 豆包API代理
- **路径**: `POST /api/doubao`
- **用途**: 代理豆包API请求，解决CORS问题
- **参数**: 
  ```json
  {
    "apiKey": "your-api-key",
    "requestData": { /* 豆包API请求数据 */ }
  }
  ```

### 图片上传
- **路径**: `POST /api/upload`
- **用途**: 上传图片文件
- **格式**: multipart/form-data
- **限制**: 最大10MB，仅支持图片格式

### 健康检查
- **路径**: `GET /health`
- **用途**: 检查服务器状态

## 🔧 豆包API配置

根据提供的curl示例，本工具使用以下API配置：

```javascript
{
  "model": "doubao-seed-1-6-vision-250815",
  "stream": true,
  "tools": [
    {"type": "image_process"}
  ],
  "input": [
    {
      "type": "message",
      "role": "system",
      "content": [
        {
          "type": "input_text",
          "text": "用户的问题"
        },
        {
          "type": "input_image", 
          "image_url": "图片URL"
        }
      ]
    }
  ]
}
```

## 🎯 技术栈

### 前端
- **HTML5**: 语义化标记
- **CSS3**: 现代化样式，渐变效果，响应式设计
- **JavaScript ES6+**: 原生JS，类和模块
- **Fetch API**: HTTP请求

### 后端
- **Node.js**: 服务器运行时
- **Express.js**: Web框架
- **Multer**: 文件上传处理
- **CORS**: 跨域支持

## ⚠️ 注意事项

1. **API Key安全**: 请妥善保管您的API Key，不要在公共环境中使用
2. **图片隐私**: 上传的图片会临时保存在服务器，请注意隐私保护
3. **网络要求**: 需要稳定的网络连接访问豆包API
4. **浏览器兼容**: 建议使用现代浏览器（Chrome、Firefox、Safari、Edge）

## 🔍 常见问题

### Q: 如何获取豆包API Key？
A: 请访问豆包开发者平台注册并申请API Key。

### Q: 图片上传失败怎么办？
A: 检查图片格式（支持jpg、png、gif等）和大小（最大10MB）。

### Q: 流式响应不工作？
A: 确保网络连接稳定，可以尝试关闭流式模式使用普通响应。

### Q: 服务器启动失败？
A: 检查端口是否被占用，可以设置环境变量 `PORT=其他端口号`。

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请通过以下方式联系：
- 创建 [GitHub Issue](issues)
- 发送邮件至: your-email@example.com

---

⭐ 如果这个项目对您有帮助，请给它一个星标！
