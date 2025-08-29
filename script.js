class DoubaoImageChat {
    constructor() {
        this.apiKey = '';
        this.apiUrl = '/api/doubao'; // 使用本地代理
        this.uploadUrl = '/api/upload';
        this.model = 'doubao-seed-1-6-vision-250815';
        this.currentImage = null;
        this.currentImageUrl = null;
        this.isStreaming = true;
        this.debugMode = false; // 调试模式，显示详细的思考过程构建信息
        
        this.initializeElements();
        this.bindEvents();
        this.loadSettings();
        
        // 初始化滚动位置检查
        setTimeout(() => this.checkScrollPosition(), 100);
        
        // 初始化日志显示
        this.updateLogsStats();
    }

    initializeElements() {
        // 主要元素
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.imageBtn = document.getElementById('imageBtn');
        this.urlBtn = document.getElementById('urlBtn');
        this.imageInput = document.getElementById('imageInput');
        this.imageUrlInput = document.getElementById('imageUrlInput');
        this.imagePreview = document.getElementById('imagePreview');
        this.previewImage = document.getElementById('previewImage');
        this.removeImageBtn = document.getElementById('removeImage');
        this.loading = document.getElementById('loading');
        
        // 设置相关
        this.apiKeyInput = document.getElementById('apiKey');
        this.modelNameInput = document.getElementById('modelName');
        this.streamModeInput = document.getElementById('streamMode');
        this.debugModeInput = document.getElementById('debugMode');
        this.toggleSettingsBtn = document.getElementById('toggleSettings');
        this.settingsContent = document.getElementById('settingsContent');
        
        // OSS设置相关
        this.ossAccessKeyIdInput = document.getElementById('ossAccessKeyId');
        this.ossAccessKeySecretInput = document.getElementById('ossAccessKeySecret');
        this.ossBucketInput = document.getElementById('ossBucket');
        this.ossRegionInput = document.getElementById('ossRegion');
        this.ossPathInput = document.getElementById('ossPath');
        this.ossDomainInput = document.getElementById('ossDomain');
        this.saveOssBtn = document.getElementById('saveOssBtn');
        this.testOssBtn = document.getElementById('testOssBtn');
        this.useUserOssBtn = document.getElementById('useUserOssBtn');
        
        // 日志相关
        this.showLogsBtn = document.getElementById('showLogsBtn');
        this.logsModal = document.getElementById('logsModal');
        this.closeLogsBtn = document.getElementById('closeLogsBtn');
        this.clearLogsBtn = document.getElementById('clearLogsBtn');
        this.logsContainer = document.getElementById('logsContainer');
        this.totalRequestsSpan = document.getElementById('totalRequests');
        this.successRequestsSpan = document.getElementById('successRequests');
        this.failedRequestsSpan = document.getElementById('failedRequests');
        
        // 日志存储
        this.apiLogs = this.loadLogs();
    }

    bindEvents() {
        // 发送消息
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // 输入监听
        this.messageInput.addEventListener('input', () => this.updateSendButton());
        
        // 图片上传
        this.imageBtn.addEventListener('click', () => this.imageInput.click());
        this.imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        this.removeImageBtn.addEventListener('click', () => this.removeImage());
        
        // 图片URL输入
        this.urlBtn.addEventListener('click', () => this.toggleUrlInput());
        this.imageUrlInput.addEventListener('input', () => this.handleImageUrl());
        this.imageUrlInput.addEventListener('paste', () => {
            // 延迟处理粘贴事件，确保内容已更新
            setTimeout(() => this.handleImageUrl(), 100);
        });
        
        // 设置
        this.toggleSettingsBtn.addEventListener('click', () => this.toggleSettings());
        this.apiKeyInput.addEventListener('input', () => this.saveSettings());
        this.streamModeInput.addEventListener('change', () => this.saveSettings());
        this.debugModeInput.addEventListener('change', () => this.saveSettings());
        
        // OSS设置
        this.saveOssBtn.addEventListener('click', () => this.saveOssSettings());
        this.testOssBtn.addEventListener('click', () => this.testOssConnection());
        this.useUserOssBtn.addEventListener('click', () => this.useUserOssConfig());
        
        // OSS输入框自动保存
        [this.ossAccessKeyIdInput, this.ossAccessKeySecretInput, this.ossBucketInput, 
         this.ossRegionInput, this.ossPathInput, this.ossDomainInput].forEach(input => {
            input.addEventListener('input', () => this.saveOssSettings());
        });
        
        // 自动调整输入框高度
        this.messageInput.addEventListener('input', () => this.autoResizeTextarea());
        
        // 监听聊天区域滚动事件
        this.chatMessages.addEventListener('scroll', () => this.checkScrollPosition());
        
        // 日志相关事件
        this.showLogsBtn.addEventListener('click', () => this.showLogs());
        this.closeLogsBtn.addEventListener('click', () => this.hideLogs());
        this.clearLogsBtn.addEventListener('click', () => this.clearLogs());
        
        // 点击模态框背景关闭
        this.logsModal.addEventListener('click', (e) => {
            if (e.target === this.logsModal) {
                this.hideLogs();
            }
        });
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    updateSendButton() {
        const hasText = this.messageInput.value.trim().length > 0;
        const hasImage = this.currentImage !== null;
        const hasImageUrl = this.currentImageUrl && this.currentImageUrl.trim().length > 0;
        const hasApiKey = this.apiKey.length > 0;
        
        this.sendBtn.disabled = !(hasText || hasImage || hasImageUrl) || !hasApiKey;
    }

    toggleUrlInput() {
        const isUrlMode = this.imageUrlInput.style.display !== 'none';
        
        if (isUrlMode) {
            // 切换回上传模式
            this.imageUrlInput.style.display = 'none';
            this.messageInput.style.display = 'block';
            this.urlBtn.classList.remove('active');
            this.urlBtn.title = '使用图片链接';
            this.removeImage(); // 清除当前图片
        } else {
            // 切换到URL模式
            this.imageUrlInput.style.display = 'block';
            this.messageInput.style.display = 'none';
            this.urlBtn.classList.add('active');
            this.urlBtn.title = '返回文字输入';
            this.imageUrlInput.focus();
        }
    }

    handleImageUrl() {
        const url = this.imageUrlInput.value.trim();
        
        if (url && this.isValidImageUrl(url)) {
            this.currentImageUrl = url;
            this.currentImage = null; // 清除文件对象
            
            // 显示预览
            this.previewImage.src = url;
            this.imagePreview.style.display = 'block';
            
            console.log('使用图片URL:', url);
        } else {
            this.currentImageUrl = null;
            this.imagePreview.style.display = 'none';
        }
        
        this.updateSendButton();
    }

    isValidImageUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }

    toggleSettings() {
        const isHidden = this.settingsContent.style.display === 'none';
        this.settingsContent.style.display = isHidden ? 'block' : 'none';
        this.toggleSettingsBtn.textContent = isHidden ? '收起' : '展开';
    }

    saveSettings() {
        this.apiKey = this.apiKeyInput.value.trim();
        this.isStreaming = this.streamModeInput.checked;
        this.debugMode = this.debugModeInput.checked;
        
        // 保存到本地存储
        localStorage.setItem('doubao_api_key', this.apiKey);
        localStorage.setItem('doubao_stream_mode', this.isStreaming);
        localStorage.setItem('doubao_debug_mode', this.debugMode);
        
        this.updateSendButton();
    }

    loadSettings() {
        // 从本地存储加载设置
        const savedApiKey = localStorage.getItem('doubao_api_key');
        const savedStreamMode = localStorage.getItem('doubao_stream_mode');
        const savedDebugMode = localStorage.getItem('doubao_debug_mode');
        
        if (savedApiKey) {
            this.apiKey = savedApiKey;
            this.apiKeyInput.value = savedApiKey;
        }
        
        if (savedStreamMode !== null) {
            this.isStreaming = savedStreamMode === 'true';
            this.streamModeInput.checked = this.isStreaming;
        }
        
        if (savedDebugMode !== null) {
            this.debugMode = savedDebugMode === 'true';
            this.debugModeInput.checked = this.debugMode;
        }
        
        // 加载OSS设置
        this.loadOssSettings();
        
        this.updateSendButton();
    }

    loadOssSettings() {
        const ossSettings = JSON.parse(localStorage.getItem('ossSettings') || '{}');
        
        this.ossAccessKeyIdInput.value = ossSettings.accessKeyId || '';
        this.ossAccessKeySecretInput.value = ossSettings.accessKeySecret || '';
        this.ossBucketInput.value = ossSettings.bucket || '';
        this.ossRegionInput.value = ossSettings.region || '';
        this.ossPathInput.value = ossSettings.path || '';
        this.ossDomainInput.value = ossSettings.domain || '';
        
        // 存储到实例变量
        this.ossConfig = ossSettings;
    }

    saveOssSettings() {
        const ossSettings = {
            accessKeyId: this.ossAccessKeyIdInput.value.trim(),
            accessKeySecret: this.ossAccessKeySecretInput.value.trim(),
            bucket: this.ossBucketInput.value.trim(),
            region: this.ossRegionInput.value.trim(),
            path: this.ossPathInput.value.trim(),
            domain: this.ossDomainInput.value.trim()
        };
        
        localStorage.setItem('ossSettings', JSON.stringify(ossSettings));
        this.ossConfig = ossSettings;
        
        console.log('OSS配置已保存:', ossSettings);
    }

    useUserOssConfig() {
        // 使用示例OSS配置 - 请替换为您自己的配置
        this.ossAccessKeyIdInput.value = 'your-access-key-id';
        this.ossAccessKeySecretInput.value = 'your-access-key-secret';
        this.ossBucketInput.value = 'your-bucket-name';
        this.ossRegionInput.value = 'oss-cn-hangzhou';
        this.ossPathInput.value = 'images/';
        this.ossDomainInput.value = 'https://your-domain.com';
        
        this.saveOssSettings();
        this.showSuccess('✅ 已填入示例配置，请修改为您的真实配置');
        
        // 提示用户修改配置
        this.showError('⚠️ 请将示例配置替换为您自己的OSS配置后再测试连接');
    }

    async testOssConnection() {
        const ossConfig = {
            accessKeyId: this.ossAccessKeyIdInput.value.trim(),
            accessKeySecret: this.ossAccessKeySecretInput.value.trim(),
            bucket: this.ossBucketInput.value.trim(),
            region: this.ossRegionInput.value.trim(),
        };

        if (!ossConfig.accessKeyId || !ossConfig.accessKeySecret || !ossConfig.bucket || !ossConfig.region) {
            this.showError('请填写完整的OSS配置信息');
            return;
        }

        try {
            this.testOssBtn.textContent = '🔄 测试中...';
            this.testOssBtn.disabled = true;

            // 测试OSS连接
            const client = new OSS({
                region: ossConfig.region,
                accessKeyId: ossConfig.accessKeyId,
                accessKeySecret: ossConfig.accessKeySecret,
                bucket: ossConfig.bucket,
                secure: true, // 强制使用HTTPS
                endpoint: `https://${ossConfig.region}.aliyuncs.com`
            });

            console.log('OSS客户端配置:', {
                region: ossConfig.region,
                bucket: ossConfig.bucket,
                endpoint: `https://${ossConfig.region}.aliyuncs.com`,
                secure: true
            });

            // 创建一个测试文件来验证连接和权限
            const testFileName = `test-connection-${Date.now()}.txt`;
            const testContent = 'OSS connection test';
            
            console.log('尝试上传测试文件:', testFileName);
            
            // 上传测试文件
            const result = await client.put(testFileName, new Blob([testContent], { type: 'text/plain' }));
            
            console.log('测试文件上传成功:', result);
            
            // 立即删除测试文件
            try {
                await client.delete(testFileName);
                console.log('测试文件已删除');
            } catch (deleteError) {
                console.warn('删除测试文件失败（可忽略）:', deleteError);
            }

            this.showSuccess('✅ OSS连接测试成功！');
        } catch (error) {
            console.error('OSS连接测试失败:', error);
            
            let errorMessage = '❌ OSS连接测试失败: ';
            
            if (error.message.includes('XHR error') || error.message.includes('CORS')) {
                errorMessage += `
跨域访问被阻止。请在阿里云OSS控制台设置CORS规则：

📋 CORS设置步骤：
1. 登录阿里云OSS控制台
2. 进入Bucket: ${ossConfig.bucket}
3. 点击"权限管理" → "跨域设置"
4. 添加规则：
   • 来源: *
   • 允许Methods: GET, POST, PUT, DELETE, HEAD
   • 允许Headers: *
   • 暴露Headers: *

⚡ 或者使用图片URL功能作为备选方案`;
            } else if (error.message.includes('InvalidAccessKeyId')) {
                errorMessage += '访问密钥ID无效，请检查Access Key ID是否正确';
            } else if (error.message.includes('SignatureDoesNotMatch')) {
                errorMessage += '访问密钥错误，请检查Access Key Secret是否正确';
            } else if (error.message.includes('NoSuchBucket')) {
                errorMessage += `存储桶 ${ossConfig.bucket} 不存在，请检查Bucket名称是否正确`;
            } else {
                errorMessage += error.message;
            }
            
            this.showError(errorMessage);
        } finally {
            this.testOssBtn.textContent = '🔗 测试连接';
            this.testOssBtn.disabled = false;
        }
    }

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            this.showError('请选择有效的图片文件');
            return;
        }

        // 验证文件大小 (限制为10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showError('图片文件大小不能超过10MB');
            return;
        }

        try {
            // 创建本地预览
            const reader = new FileReader();
            reader.onload = (e) => {
                this.previewImage.src = e.target.result;
                this.imagePreview.style.display = 'block';
                this.updateSendButton();
            };
            reader.readAsDataURL(file);

            // 上传图片到服务器
            await this.uploadImageToServer(file);
        } catch (error) {
            console.error('图片处理失败:', error);
            this.showError('图片处理失败，请重试');
        }
    }

    removeImage() {
        this.currentImage = null;
        this.currentImageUrl = null;
        this.imagePreview.style.display = 'none';
        this.imageInput.value = '';
        this.imageUrlInput.value = '';
        this.updateSendButton();
    }

    async sendMessage() {
        const isUrlMode = this.imageUrlInput.style.display !== 'none';
        const text = isUrlMode ? '' : this.messageInput.value.trim(); // URL模式下不使用文字
        const hasImage = this.currentImage !== null;
        const hasImageUrl = this.currentImageUrl && this.currentImageUrl.trim().length > 0;
        
        if (!text && !hasImage && !hasImageUrl) return;
        if (!this.apiKey) {
            this.showError('请先在设置中输入API Key');
            return;
        }

        // 在URL模式下，从URL输入框获取问题
        let questionText = text;
        if (isUrlMode && hasImageUrl) {
            // 在URL模式下，应该有默认问题或者让用户输入问题
            questionText = '请分析这张图片';
        }

        // 显示用户消息
        this.addMessage('user', questionText, this.currentImageUrl);
        
        // 清空输入
        if (!isUrlMode) {
            this.messageInput.value = '';
            this.autoResizeTextarea();
        }
        
        // 暂存图片信息，然后清除预览
        const imageToSend = this.currentImageUrl;
        this.removeImage();
        
        // 如果是URL模式，切换回文字模式
        if (isUrlMode) {
            this.toggleUrlInput();
        }
        
        // 只在非流式模式下显示加载状态
        if (!this.isStreaming) {
            this.showLoading(true);
        }
        
        try {
            await this.callDoubaoAPI(questionText, imageToSend);
        } catch (error) {
            console.error('API调用失败:', error);
            this.showError('请求失败: ' + error.message);
        } finally {
            if (!this.isStreaming) {
                this.showLoading(false);
            }
        }
    }

    isOssConfigured() {
        return this.ossConfig && 
               this.ossConfig.accessKeyId && 
               this.ossConfig.accessKeySecret && 
               this.ossConfig.bucket && 
               this.ossConfig.region;
    }

    async uploadToOss(imageFile) {
        if (!this.isOssConfigured()) {
            throw new Error('OSS配置不完整');
        }

        // 检查OSS SDK是否可用
        if (typeof OSS === 'undefined') {
            throw new Error('阿里云OSS SDK未加载，请检查网络连接或刷新页面');
        }

        try {
            console.log('🔧 创建OSS客户端...');
            // 创建OSS客户端
            const client = new OSS({
                region: this.ossConfig.region,
                accessKeyId: this.ossConfig.accessKeyId,
                accessKeySecret: this.ossConfig.accessKeySecret,
                bucket: this.ossConfig.bucket,
                secure: true, // 使用HTTPS
                endpoint: `https://${this.ossConfig.region}.aliyuncs.com`
            });

            console.log('OSS上传客户端配置:', {
                region: this.ossConfig.region,
                bucket: this.ossConfig.bucket,
                endpoint: `https://${this.ossConfig.region}.aliyuncs.com`,
                secure: true
            });

            // 生成文件名
            const ext = imageFile.name.split('.').pop() || 'jpg';
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            const fileName = `${this.ossConfig.path || ''}image-${timestamp}-${random}.${ext}`;
            
            console.log('开始上传到OSS，文件名:', fileName);

            // 上传文件
            const result = await client.put(fileName, imageFile);
            
            console.log('OSS上传成功:', result);

            // 构造返回URL
            let imageUrl;
            if (this.ossConfig.domain) {
                // 使用自定义域名
                imageUrl = `${this.ossConfig.domain.replace(/\/$/, '')}/${fileName}`;
            } else {
                // 使用默认域名
                imageUrl = result.url;
            }

            console.log('✅ 图片已上传到OSS:', imageUrl);
            
            this.currentImageUrl = imageUrl;
            this.currentImage = imageFile;
            
            return imageUrl;
        } catch (error) {
            console.error('❌ 浏览器直接OSS上传失败:', error);
            
            // 如果是CORS或网络错误，尝试服务端上传
            if (error.message.includes('XHR error') || error.message.includes('CORS') || error.message.includes('Network')) {
                console.log('🔄 尝试服务端OSS上传...');
                try {
                    return await this.uploadToOssViaServer(imageFile);
                } catch (serverError) {
                    console.error('❌ 服务端OSS上传也失败:', serverError);
                    throw new Error(`OSS上传失败: ${serverError.message}`);
                }
            }
            
            throw new Error(`OSS上传失败: ${error.message}`);
        }
    }

    async uploadToOssViaServer(imageFile) {
        console.log('🌐 使用服务端代理上传到OSS...');
        
        const formData = new FormData();
        formData.append('image', imageFile);
        formData.append('ossConfig', JSON.stringify(this.ossConfig));
        
        const response = await fetch('/api/upload-oss', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || errorData.error || '服务端上传失败');
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ 服务端OSS上传成功:', result.url);
            
            this.currentImageUrl = result.url;
            this.currentImage = imageFile;
            
            return result.url;
        } else {
            throw new Error('服务端上传返回失败状态');
        }
    }

    async uploadImageToServer(imageFile) {
        console.log('开始上传图片...', {
            name: imageFile.name,
            type: imageFile.type,
            size: imageFile.size
        });
        
        // 优先尝试OSS上传
        if (this.isOssConfigured()) {
            try {
                console.log('🗂️ 使用阿里云OSS上传图片...');
                console.log('OSS配置:', {
                    region: this.ossConfig.region,
                    bucket: this.ossConfig.bucket,
                    hasAccessKey: !!this.ossConfig.accessKeyId,
                    hasSecret: !!this.ossConfig.accessKeySecret,
                    domain: this.ossConfig.domain
                });
                return await this.uploadToOss(imageFile);
            } catch (error) {
                console.warn('⚠️ OSS上传失败，使用备选方案:', error);
                this.showError(`OSS上传失败: ${error.message}，使用公网图床...`);
            }
        } else {
            console.log('🚫 OSS未配置，使用公网图床...');
            this.showMessage('OSS未配置，使用免费图床上传...', 'info');
        }
        
        // 备选方案：使用免费图床
        console.log('📡 使用公网图床上传图片...');
        
        try {
            // 方案1: 使用imgur.com（无需API key的匿名上传）
            const formData = new FormData();
            formData.append('image', imageFile);
            formData.append('type', 'file');
            
            const response = await fetch('https://api.imgur.com/3/image', {
                method: 'POST',
                headers: {
                    'Authorization': 'Client-ID 546c25a59c58ad7'  // 公共客户端ID
                },
                body: formData
            });

            console.log('Imgur响应状态:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('Imgur响应数据:', result);
                
                if (result.success && result.data && result.data.link) {
                    this.currentImageUrl = result.data.link;
                    this.currentImage = imageFile;
                    console.log('✅ 图片已上传到Imgur:', result.data.link);
                    console.log('图片详情:', {
                        url: result.data.link,
                        type: result.data.type,
                        width: result.data.width,
                        height: result.data.height
                    });
                    return result.data.link;
                }
            }
            
            throw new Error('Imgur上传失败');
        } catch (error) {
            console.warn('⚠️  Imgur上传失败，尝试备选方案:', error);
            
            try {
                // 方案2: 使用sm.ms图床（免费，支持直链）
                const formData = new FormData();
                formData.append('smfile', imageFile);
                
                const response = await fetch('https://sm.ms/api/v2/upload', {
                    method: 'POST',
                    body: formData
                });
                
                console.log('SM.MS响应状态:', response.status);
                
                if (response.ok) {
                    const result = await response.json();
                    console.log('SM.MS响应数据:', result);
                    
                    if (result.success && result.data && result.data.url) {
                        this.currentImageUrl = result.data.url;
                        this.currentImage = imageFile;
                        console.log('✅ 图片已上传到SM.MS:', result.data.url);
                        return result.data.url;
                    } else if (result.code === 'image_repeated' && result.images) {
                        // 图片已存在，使用现有链接
                        this.currentImageUrl = result.images;
                        this.currentImage = imageFile;
                        console.log('✅ 使用SM.MS已存在图片:', result.images);
                        return result.images;
                    }
                }
                
                throw new Error('SM.MS上传失败');
            } catch (error2) {
                console.error('❌ 所有图床服务都失败:', error2);
                
                // 显示详细的错误信息和解决方案
                this.showError(`
❌ 图片上传失败！

🔍 问题原因：
• 图床服务暂时不可用
• 图片格式可能不被支持
• 网络连接问题

💡 解决方案：
1. 📷 重新尝试上传图片
2. 🔗 使用在线图片链接：
   • 点击 🔗 按钮
   • 粘贴图片URL（如：https://example.com/image.jpg）

🌐 推荐图床服务：
• https://imgur.com - 上传后复制链接
• https://sm.ms - 免费图床
• https://postimg.cc - 无需注册

⚡ 测试图片：可以使用这个链接测试：
https://ark-project.tos-cn-beijing.volces.com/doc_image/image_process_1.jpg`);
                
                throw new Error('图片上传服务不可用');
            }
        }
    }

    async callDoubaoAPI(text, imageUrl) {
        const content = [];
        
        // 添加文本内容
        if (text) {
            content.push({
                type: "input_text",
                text: text
            });
        }
        
        // 添加图片内容
        if (imageUrl) {
            content.push({
                type: "input_image",
                image_url: imageUrl
            });
        }

        const requestData = {
            model: this.model,
            stream: this.isStreaming,
            max_output_tokens: 65535,
            input: [
                {
                    type: "message",
                    role: imageUrl ? "system" : "user", // 有图片时用system，纯文本时用user
                    content: content
                }
            ]
        };

        // 只有当有图片时才添加图像处理工具
        if (imageUrl) {
            requestData.tools = [{"type": "image_process"}];
            console.log('✅ 添加图像处理工具到请求:', requestData.tools);
        } else {
            console.log('⚠️ 没有图片，未添加图像处理工具');
        }

        const proxyData = {
            apiKey: this.apiKey,
            requestData: requestData
        };

        try {
            if (this.isStreaming) {
                await this.handleStreamResponse(proxyData);
            } else {
                await this.handleNormalResponse(proxyData);
            }
        } catch (error) {
            console.error('API调用失败:', error);
            // 记录失败日志
            this.addLog(proxyData, null, 'error', {
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    async handleNormalResponse(proxyData) {
        console.log('发送请求到代理服务器:', proxyData);
        
        // 立即显示思考消息，避免等待
        let assistantMessage = this.addDoubaoMessage('🤔 正在思考...', '', false);
        
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(proxyData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('代理服务器错误:', response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('收到代理服务器响应:', data);
        
        // 记录成功日志 - 包含完整的原始响应数据
        this.addLog(proxyData, {
            ...data,
            raw_response_data: data, // 完整的原始响应数据
            response_type: 'normal_response'
        }, 'success');
        
        // 详细调试：查看完整的响应数据结构
        console.log('🔍 完整API响应数据结构:', JSON.stringify(data, null, 2));
        
        // 解析豆包API的响应结构
        if (data.reasoning && typeof data.reasoning === 'string') {
            console.log('使用直接reasoning字段格式处理');
            this.processDoubaoResponse(data, assistantMessage);
        } else if (data.output && Array.isArray(data.output)) {
            console.log('使用豆包响应格式处理');
            this.processDoubaoResponse(data.output, assistantMessage);
        } else if (data.choices && data.choices[0] && data.choices[0].message) {
            console.log('使用标准格式处理');
            // 更新之前创建的消息
            this.updateDoubaoMessage(assistantMessage, '', data.choices[0].message.content, false);
        } else {
            console.error('响应格式不识别:', data);
            console.log('完整响应数据:', JSON.stringify(data, null, 2));
            this.updateDoubaoMessage(assistantMessage, '', '❌ API返回了无效的响应格式', false);
        }
    }

    processDoubaoResponse(output, existingMessage = null) {
        let reasoningContent = '';
        let finalAnswer = '';
        
        console.log('处理豆包响应:', output);
        
        // 详细调试：检查响应中的图像处理项
        if (Array.isArray(output)) {
            const imageProcessItems = output.filter(item => item && item.type === 'image_process');
            if (imageProcessItems.length > 0) {
                console.log('🔍 在响应数组中发现图像处理项:', JSON.stringify(imageProcessItems, null, 2));
            } else {
                console.log('⚠️ 响应数组中未发现图像处理项');
                console.log('响应项类型:', output.map(item => item?.type || 'unknown'));
            }
        }
        
        // 检查是否是直接的reasoning字段格式
        if (output && typeof output === 'object' && output.reasoning && typeof output.reasoning === 'string') {
            console.log('发现直接的reasoning字段格式');
            reasoningContent = output.reasoning;
            console.log('找到思考过程:', reasoningContent.length, '字符');
            console.log('思考内容预览:', reasoningContent.substring(0, 300) + '...');
            
            // 显示完整的reasoning内容，确保不被截断
            if (existingMessage) {
                this.updateDoubaoMessage(existingMessage, reasoningContent, finalAnswer, false);
            } else {
                this.addDoubaoMessage(reasoningContent, finalAnswer, false);
            }
            return;
        }

        // 处理数组格式的输出（原有逻辑）
        if (Array.isArray(output)) {
            // 提取思考过程、图像处理结果和最终回答
            for (const item of output) {
                console.log('处理输出项:', item.type, item);
                
                if (item.type === 'reasoning' && item.summary && item.summary[0]) {
                    const reasoningText = item.summary[0].text || '';
                    if (reasoningText) {
                        reasoningContent += reasoningText;
                        console.log('找到思考过程:', reasoningContent.length, '字符');
                        console.log('思考内容预览:', reasoningContent.substring(0, 100) + '...');
                    }
                } else if (item.type === 'reasoning' && item.text) {
                    // 处理直接包含text字段的reasoning
                    reasoningContent += item.text;
                    console.log('找到思考过程(直接text):', reasoningContent.length, '字符');
                } else if (item.type === 'image_process') {
                    // 处理图像处理结果
                    const imageProcessContent = this.formatImageProcessResult(item);
                    if (imageProcessContent) {
                        reasoningContent += (reasoningContent ? '\n\n' : '') + imageProcessContent;
                        console.log('找到图像处理结果:', imageProcessContent.length, '字符');
                    }
                } else if (item.type === 'message' && item.role === 'assistant' && item.content) {
                    finalAnswer = item.content[0]?.text || '';
                    console.log('找到最终回答:', finalAnswer.length, '字符');
                } else if (item.reasoning && typeof item.reasoning === 'string') {
                    // 处理包含reasoning字段的项
                    reasoningContent += item.reasoning;
                    console.log('找到嵌套reasoning:', reasoningContent.length, '字符');
                }
            }
        }
        
        // 检查是否有其他可能的字段
        if (!reasoningContent && !finalAnswer && output) {
            // 尝试从对象的各个字段中提取内容
            if (output.text) {
                finalAnswer = output.text;
            } else if (output.content) {
                finalAnswer = output.content;
            } else if (output.message) {
                finalAnswer = output.message;
            }
            
            console.log('从其他字段提取到内容:', finalAnswer.length, '字符');
        }
        
        // 确保有内容才显示
        if (reasoningContent || finalAnswer) {
            if (existingMessage) {
                // 更新现有消息
                this.updateDoubaoMessage(existingMessage, reasoningContent, finalAnswer, false);
            } else {
                // 创建新消息（用于流式模式等场景）
                this.addDoubaoMessage(reasoningContent, finalAnswer, false);
            }
        } else {
            console.error('没有找到有效的响应内容');
            console.log('完整的output对象:', JSON.stringify(output, null, 2));
            if (existingMessage) {
                this.updateDoubaoMessage(existingMessage, '', '❌ 没有找到有效的响应内容', false);
            } else {
                this.showError('没有找到有效的响应内容');
            }
        }
    }

    async handleStreamResponse(proxyData) {
        console.log('开始处理流式响应...');
        
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(proxyData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let assistantMessage = this.addDoubaoMessage('🤔 开始思考...', '', true); // 创建流式消息容器
        let reasoningContent = '';
        let finalContent = '';
        let buffer = ''; // 用于累积不完整的数据
        let allStreamData = []; // 收集所有流式响应数据用于日志记录

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // 将新数据添加到缓冲区
                buffer += decoder.decode(value, { stream: true });
                
                // 按行分割，处理完整的行
                let lines = buffer.split('\n');
                
                // 保留最后一行（可能不完整）
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') continue;
                        if (data === '') continue;
                        
                        try {
                            const parsed = JSON.parse(data);
                            console.log('解析到流式数据:', parsed);
                            
                            // 收集原始响应数据用于日志记录
                            allStreamData.push(parsed);
                            
                            // 详细调试：检查是否包含图像处理相关内容
                            if (parsed.item && parsed.item.type === 'image_process') {
                                console.log('🔍 发现图像处理项:', JSON.stringify(parsed.item, null, 2));
                            }
                            if (parsed.response && parsed.response.output) {
                                const imageProcessItems = parsed.response.output.filter(item => item.type === 'image_process');
                                if (imageProcessItems.length > 0) {
                                    console.log('🔍 在完整响应中发现图像处理项:', JSON.stringify(imageProcessItems, null, 2));
                                }
                            }
                            
                            // 检查是否是直接的reasoning字段格式（流式）
                            if (parsed.reasoning && typeof parsed.reasoning === 'string') {
                                console.log('发现流式reasoning字段格式');
                                // 改进：保存完整的reasoning内容，避免截断
                                const newReasoning = parsed.reasoning;
                                
                                // 检查是否是增量更新还是完整替换
                                if (newReasoning.length > reasoningContent.length && 
                                    newReasoning.startsWith(reasoningContent)) {
                                    // 增量更新：新内容包含旧内容
                                    reasoningContent = newReasoning;
                                } else if (newReasoning !== reasoningContent) {
                                    // 完整替换：完全不同的内容
                                    reasoningContent = newReasoning;
                                }
                                
                                console.log('更新思考过程:', reasoningContent.length, '字符');
                                console.log('思考内容预览:', reasoningContent.substring(0, 300) + '...');
                                
                                // 更新显示，确保完整内容被显示
                                this.updateDoubaoMessage(assistantMessage, reasoningContent, finalContent, true);
                                continue;
                            }
                            
                            // 处理豆包新版流式响应格式
                            if (parsed.type === 'response.output_item.done' && parsed.item) {
                                const item = parsed.item;
                                console.log('处理输出项:', item);
                                
                                if (item.type === 'reasoning' && item.summary && item.summary[0]) {
                                    const newReasoning = item.summary[0].text || '';
                                    if (newReasoning) {
                                        // 检查是否为增量内容
                                        if (newReasoning.length > reasoningContent.length && newReasoning.startsWith(reasoningContent)) {
                                            // 增量更新
                                            reasoningContent = newReasoning;
                                        } else if (newReasoning !== reasoningContent) {
                                            // 累积添加
                                            reasoningContent += newReasoning;
                                        }
                                        console.log('更新思考过程:', reasoningContent.length, '字符');
                                        console.log('思考内容预览:', reasoningContent.substring(0, 100) + '...');
                                        
                                        // 在调试模式下显示详细信息
                                        if (this.debugMode) {
                                            this.showDebugInfo('思考过程更新', {
                                                当前长度: reasoningContent.length,
                                                新增内容: newReasoning.substring(0, 100) + '...',
                                                累积方式: newReasoning.length > reasoningContent.length && newReasoning.startsWith(reasoningContent) ? '增量更新' : '累积添加'
                                            });
                                        }
                                        
                                        this.updateDoubaoMessage(assistantMessage, reasoningContent, finalContent, true);
                                    }
                                } else if (item.type === 'image_process') {
                                    // 处理图像处理结果
                                    const imageProcessContent = this.formatImageProcessResult(item);
                                    if (imageProcessContent) {
                                        reasoningContent += (reasoningContent ? '\n\n' : '') + imageProcessContent;
                                        console.log('更新图像处理结果:', imageProcessContent.length, '字符');
                                        this.updateDoubaoMessage(assistantMessage, reasoningContent, finalContent, true);
                                    }
                                } else if (item.type === 'message' && item.role === 'assistant' && item.content) {
                                    const newAnswer = item.content[0]?.text || '';
                                    if (newAnswer && newAnswer !== finalContent) {
                                        finalContent = newAnswer;
                                        console.log('更新最终回答:', finalContent.length, '字符');
                                        this.updateDoubaoMessage(assistantMessage, reasoningContent, finalContent, false);
                                    }
                                }
                            }
                            
                            // 处理完整响应
                            else if (parsed.type === 'response.completed' && parsed.response && parsed.response.output) {
                                console.log('处理完整响应:', parsed.response.output);
                                // 从完整响应中提取内容
                                const output = parsed.response.output;
                                let hasNewContent = false;
                                
                                for (const item of output) {
                                    if (item.type === 'reasoning' && item.summary && item.summary[0]) {
                                        const newReasoning = item.summary[0].text || '';
                                        if (newReasoning) {
                                            // 检查是否为增量内容
                                            if (newReasoning.length > reasoningContent.length && newReasoning.startsWith(reasoningContent)) {
                                                // 增量更新
                                                reasoningContent = newReasoning;
                                                hasNewContent = true;
                                            } else if (newReasoning !== reasoningContent) {
                                                // 累积添加
                                                reasoningContent += newReasoning;
                                                hasNewContent = true;
                                            }
                                            console.log('从完整响应更新思考过程:', reasoningContent.length, '字符');
                                        }
                                    } else if (item.type === 'image_process') {
                                        // 处理图像处理结果
                                        const imageProcessContent = this.formatImageProcessResult(item);
                                        if (imageProcessContent) {
                                            reasoningContent += (reasoningContent ? '\n\n' : '') + imageProcessContent;
                                            hasNewContent = true;
                                            console.log('从完整响应更新图像处理结果:', imageProcessContent.length, '字符');
                                        }
                                    } else if (item.type === 'message' && item.role === 'assistant' && item.content) {
                                        const newAnswer = item.content[0]?.text || '';
                                        if (newAnswer && newAnswer !== finalContent) {
                                            finalContent = newAnswer;
                                            hasNewContent = true;
                                            console.log('从完整响应更新最终回答:', finalContent.length, '字符');
                                        }
                                    }
                                }
                                
                                if (hasNewContent) {
                                    this.updateDoubaoMessage(assistantMessage, reasoningContent, finalContent, false);
                                }
                            }
                            
                            // 处理豆包旧版流式响应格式
                            else if (parsed.output && Array.isArray(parsed.output)) {
                                for (const item of parsed.output) {
                                    if (item.type === 'reasoning' && item.summary && item.summary[0]) {
                                        const newReasoning = item.summary[0].text || '';
                                        if (newReasoning) {
                                            // 检查是否为增量内容
                                            if (newReasoning.length > reasoningContent.length && newReasoning.startsWith(reasoningContent)) {
                                                // 增量更新
                                                reasoningContent = newReasoning;
                                            } else if (newReasoning !== reasoningContent) {
                                                // 累积添加
                                                reasoningContent += newReasoning;
                                            }
                                            console.log('更新思考过程:', reasoningContent.length, '字符');
                                            console.log('思考内容预览:', reasoningContent.substring(0, 100) + '...');
                                            this.updateDoubaoMessage(assistantMessage, reasoningContent, finalContent, true);
                                        }
                                    } else if (item.type === 'image_process') {
                                        // 处理图像处理结果 (旧版格式)
                                        const imageProcessContent = this.formatImageProcessResult(item);
                                        if (imageProcessContent) {
                                            reasoningContent += (reasoningContent ? '\n\n' : '') + imageProcessContent;
                                            console.log('更新图像处理结果 (旧版):', imageProcessContent.length, '字符');
                                            this.updateDoubaoMessage(assistantMessage, reasoningContent, finalContent, true);
                                        }
                                    } else if (item.type === 'message' && item.role === 'assistant' && item.content) {
                                        const newAnswer = item.content[0]?.text || '';
                                        if (newAnswer && newAnswer !== finalContent) {
                                            finalContent = newAnswer;
                                            console.log('更新最终回答:', finalContent.length, '字符');
                                            this.updateDoubaoMessage(assistantMessage, reasoningContent, finalContent, false);
                                        }
                                    }
                                }
                            }
                            
                            // 兼容其他流式格式
                            else if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                                const delta = parsed.choices[0].delta;
                                if (delta.content) {
                                    finalContent += delta.content;
                                    this.updateDoubaoMessage(assistantMessage, reasoningContent, finalContent, false);
                                }
                            }
                        } catch (e) {
                            console.warn('解析流数据失败:', e, '数据:', data.substring(0, 100));
                        }
                    }
                }
            }
            
            // 处理缓冲区中剩余的数据
            if (buffer.trim() && buffer.startsWith('data: ')) {
                const data = buffer.slice(6).trim();
                if (data && data !== '[DONE]') {
                    try {
                        const parsed = JSON.parse(data);
                        console.log('处理缓冲区数据:', parsed);
                        // 处理逻辑同上...
                    } catch (e) {
                        console.warn('解析缓冲区数据失败:', e);
                    }
                }
            }
            
        } finally {
            reader.releaseLock();
        }

        console.log('流式响应处理完成，思考过程:', reasoningContent.length, '字符，最终回答:', finalContent.length, '字符');

        // 记录成功日志 - 包含完整的原始响应数据
            this.addLog(proxyData, {
                reasoning: reasoningContent,
                message: finalContent,
                type: 'stream_response',
                raw_stream_data: allStreamData, // 完整的原始流式响应数据
                stream_data_count: allStreamData.length
            }, 'success');

        if (!reasoningContent && !finalContent) {
            this.updateDoubaoMessage(assistantMessage, '', '抱歉，没有收到有效的响应。', false);
        }
    }

    addMessage(role, content, imageUrl = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (imageUrl && role === 'user') {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.className = 'message-image';
            messageContent.appendChild(img);
        }
        
        if (content) {
            const textDiv = document.createElement('div');
            textDiv.textContent = content;
            messageContent.appendChild(textDiv);
        }
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = new Date().toLocaleTimeString();
        messageContent.appendChild(timeDiv);
        
        messageDiv.appendChild(messageContent);
        
        // 移除欢迎消息
        const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom(true); // 新消息强制滚动到底部
        
        return messageDiv;
    }

    addDoubaoMessage(reasoningContent = '', finalAnswer = '', isStreaming = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant doubao-message';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        // 只有在有思考过程或流式模式时才创建思考过程容器
        if (reasoningContent || isStreaming) {
            const reasoningContainer = document.createElement('div');
            reasoningContainer.className = 'reasoning-container';
            
            const reasoningHeader = document.createElement('div');
            reasoningHeader.className = 'reasoning-header';
            reasoningHeader.innerHTML = `
                <span class="reasoning-title">🤔 AI思考过程</span>
                <button class="reasoning-toggle" onclick="this.parentElement.parentElement.classList.toggle('collapsed')">
                    <span class="toggle-icon">▼</span>
                </button>
            `;
            
            const reasoningContent_div = document.createElement('div');
            reasoningContent_div.className = 'reasoning-content';
            
            const reasoningText = document.createElement('div');
            reasoningText.className = 'reasoning-text';
            
            // 使用新的图片处理函数
            this.setReasoningContentWithImages(reasoningText, reasoningContent || '');
            reasoningContent_div.appendChild(reasoningText);
            
            reasoningContainer.appendChild(reasoningHeader);
            reasoningContainer.appendChild(reasoningContent_div);
            messageContent.appendChild(reasoningContainer);
        }
        
        // 最终回答容器
        const answerContainer = document.createElement('div');
        answerContainer.className = 'answer-container';
        
        if (finalAnswer) {
            const answerText = document.createElement('div');
            answerText.className = 'answer-text';
            answerText.textContent = finalAnswer;
            answerContainer.appendChild(answerText);
        }
        
        messageContent.appendChild(answerContainer);
        
        // 时间戳
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = new Date().toLocaleTimeString();
        messageContent.appendChild(timeDiv);
        
        messageDiv.appendChild(messageContent);
        
        // 移除欢迎消息
        const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom(true); // 新消息强制滚动到底部
        
        return messageDiv;
    }

    updateDoubaoMessage(messageElement, reasoningContent, finalAnswer, isReasoningUpdate) {
        let reasoningText = messageElement.querySelector('.reasoning-text');
        let answerText = messageElement.querySelector('.answer-text');
        
        // 更新思考过程 - 改进：总是更新思考过程内容，不仅限于isReasoningUpdate=true的情况
        if (reasoningContent) {
            if (!reasoningText) {
                // 如果思考过程容器不存在，创建它
                const reasoningContainer = messageElement.querySelector('.reasoning-container');
                if (!reasoningContainer) {
                    const messageContent = messageElement.querySelector('.message-content');
                    const answerContainer = messageElement.querySelector('.answer-container');
                    
                    const newReasoningContainer = document.createElement('div');
                    newReasoningContainer.className = 'reasoning-container';
                    
                    const reasoningHeader = document.createElement('div');
                    reasoningHeader.className = 'reasoning-header';
                    reasoningHeader.innerHTML = `
                        <span class="reasoning-title">🤔 AI思考过程</span>
                        <button class="reasoning-toggle" onclick="this.parentElement.parentElement.classList.toggle('collapsed')">
                            <span class="toggle-icon">▼</span>
                        </button>
                    `;
                    
                    const reasoningContentDiv = document.createElement('div');
                    reasoningContentDiv.className = 'reasoning-content';
                    
                    reasoningText = document.createElement('div');
                    reasoningText.className = 'reasoning-text';
                    
                    reasoningContentDiv.appendChild(reasoningText);
                    newReasoningContainer.appendChild(reasoningHeader);
                    newReasoningContainer.appendChild(reasoningContentDiv);
                    
                    // 插入到答案容器之前
                    messageContent.insertBefore(newReasoningContainer, answerContainer);
                } else {
                    reasoningText = reasoningContainer.querySelector('.reasoning-text');
                }
            }
            
            if (reasoningText) {
                // 使用新的图片处理函数，确保完整显示所有内容
                this.setReasoningContentWithImages(reasoningText, reasoningContent);
                
                // 为新内容添加视觉提示
                if (isReasoningUpdate) {
                    reasoningText.classList.add('typing');
                    setTimeout(() => reasoningText.classList.remove('typing'), 300);
                }
                
                // 确保思考过程容器可见
                const reasoningContainer = messageElement.querySelector('.reasoning-container');
                if (reasoningContainer) {
                    reasoningContainer.classList.remove('collapsed');
                }
                
                // 调试日志
                if (this.debugMode) {
                    console.log('思考过程更新:', {
                        内容长度: reasoningContent.length,
                        内容预览: reasoningContent.substring(0, 200) + '...',
                        是否流式更新: isReasoningUpdate
                    });
                }
            }
        }
        
        // 更新最终回答
        if (finalAnswer) {
            const answerContainer = messageElement.querySelector('.answer-container');
            
            if (!answerText) {
                // 如果答案文本不存在，创建它
                answerText = document.createElement('div');
                answerText.className = 'answer-text';
                answerContainer.appendChild(answerText);
            }
            
            answerText.textContent = finalAnswer;
            
            // 如果有最终回答，高亮显示答案容器
            if (answerContainer && finalAnswer.trim()) {
                answerContainer.classList.add('has-answer');
                
                // 调试日志
                if (this.debugMode) {
                    console.log('最终回答更新:', {
                        内容长度: finalAnswer.length,
                        内容预览: finalAnswer.substring(0, 100) + '...'
                    });
                }
            }
        }
        
        // 改进滚动逻辑
        if (isReasoningUpdate || reasoningContent) {
            // 思考过程更新时，智能滚动
            this.checkScrollPosition();
        } else if (finalAnswer) {
            // 最终答案更新时，滚动到底部
            this.scrollToBottom(true);
        }
    }

    updateMessage(messageElement, content) {
        const contentDiv = messageElement.querySelector('.message-content div:not(.message-time)');
        if (contentDiv) {
            contentDiv.textContent = content;
        }
        this.scrollToBottom(); // 保持智能滚动
    }

    scrollToBottom(force = false) {
        // 检查用户是否接近底部（在底部50px范围内）
        const isNearBottom = this.chatMessages.scrollTop + this.chatMessages.clientHeight >= this.chatMessages.scrollHeight - 50;
        
        // 只有在用户接近底部或强制滚动时才自动滚动
        if (force || isNearBottom) {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    // 检查是否需要显示"滚动到底部"按钮
    checkScrollPosition() {
        const isNearBottom = this.chatMessages.scrollTop + this.chatMessages.clientHeight >= this.chatMessages.scrollHeight - 100;
        
        // 显示或隐藏滚动到底部按钮
        let scrollButton = document.getElementById('scrollToBottomBtn');
        if (!scrollButton) {
            // 创建滚动到底部按钮
            scrollButton = document.createElement('button');
            scrollButton.id = 'scrollToBottomBtn';
            scrollButton.className = 'scroll-to-bottom-btn';
            scrollButton.innerHTML = '↓ 滚动到底部';
            scrollButton.onclick = () => this.scrollToBottom(true);
            this.chatMessages.parentElement.appendChild(scrollButton);
        }
        
        scrollButton.style.display = isNearBottom ? 'none' : 'block';
    }

    // 日志管理方法
    loadLogs() {
        try {
            const saved = localStorage.getItem('doubao_api_logs');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('加载日志失败:', error);
            return [];
        }
    }

    saveLogs() {
        try {
            // 只保留最近100条日志
            const logsToSave = this.apiLogs.slice(-100);
            localStorage.setItem('doubao_api_logs', JSON.stringify(logsToSave));
            this.apiLogs = logsToSave;
        } catch (error) {
            console.error('保存日志失败:', error);
        }
    }

    addLog(request, response, status, error = null) {
        const logEntry = {
            id: Date.now(),
            timestamp: new Date().toLocaleString('zh-CN'),
            status: status, // 'success' or 'error'
            request: {
                url: this.apiUrl,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ***' // 隐藏API Key
                },
                body: this.sanitizeRequestData(request)
            },
            response: response ? this.sanitizeResponseData(response) : null,
            error: error,
            duration: null // 可以后续添加请求耗时
        };

        this.apiLogs.push(logEntry);
        this.saveLogs();
        this.updateLogsStats();
    }

    sanitizeRequestData(requestData) {
        // 创建副本并隐藏敏感信息
        const sanitized = JSON.parse(JSON.stringify(requestData));
        if (sanitized.apiKey) {
            sanitized.apiKey = '***';
        }
        return sanitized;
    }

    sanitizeResponseData(responseData) {
        // 保存完整响应数据和截断版本
        const responseStr = JSON.stringify(responseData, null, 2);
        if (responseStr.length > 5000) {
            // 截断数据，但保持JSON格式的完整性
            const truncatedStr = responseStr.substring(0, 5000);
            // 尝试找到最后一个完整的JSON结构
            let lastValidJson = truncatedStr;
            const lastBrace = truncatedStr.lastIndexOf('}');
            const lastBracket = truncatedStr.lastIndexOf(']');
            const lastQuote = truncatedStr.lastIndexOf('"');
            
            // 找到最后一个可能的JSON结束位置
            const lastValidPos = Math.max(lastBrace, lastBracket, lastQuote);
            if (lastValidPos > 0) {
                lastValidJson = truncatedStr.substring(0, lastValidPos + 1);
            }
            
            return {
                truncated: true,
                data: lastValidJson + '\n\n...[数据过长已截断，显示前' + lastValidJson.length + '个字符]',
                fullData: responseData, // 保存完整原始数据
                originalLength: responseStr.length
            };
        }
        return responseData;
    }

    updateLogsStats() {
        const total = this.apiLogs.length;
        const success = this.apiLogs.filter(log => log.status === 'success').length;
        const failed = total - success;

        this.totalRequestsSpan.textContent = total;
        this.successRequestsSpan.textContent = success;
        this.failedRequestsSpan.textContent = failed;
    }

    showLogs() {
        this.renderLogs();
        this.logsModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // 禁止背景滚动
    }

    hideLogs() {
        this.logsModal.style.display = 'none';
        document.body.style.overflow = ''; // 恢复背景滚动
    }

    clearLogs() {
        if (confirm('确定要清空所有日志记录吗？')) {
            this.apiLogs = [];
            this.saveLogs();
            this.updateLogsStats();
            this.renderLogs();
            this.showMessage('日志已清空', 'success');
        }
    }

    renderLogs() {
        const container = this.logsContainer;
        
        if (this.apiLogs.length === 0) {
            container.innerHTML = '<div class="logs-empty"><p>暂无日志记录</p></div>';
            return;
        }

        // 按时间倒序排列（最新的在前）
        const sortedLogs = [...this.apiLogs].reverse();
        
        container.innerHTML = sortedLogs.map(log => this.createLogEntryHTML(log)).join('');
    }

    createLogEntryHTML(log) {
        const statusClass = log.status === 'success' ? 'success' : 'error';
        const statusText = log.status === 'success' ? '成功' : '失败';
        
        // 检查响应数据是否被截断
        const response = log.response || log.error;
        const isTruncated = response && response.truncated;
        
        // 优先显示原始响应数据，确保以JSON格式显示
        let displayData;
        let rawDataInfo = '';
        
        if (response && response.raw_response_data) {
            // 显示完整的原始响应数据，确保JSON格式
            displayData = JSON.stringify(response.raw_response_data, null, 2);
            rawDataInfo = '<div class="raw-data-info">📋 完整原始响应数据 (JSON格式)</div>';
        } else if (response && response.raw_stream_data) {
            // 显示流式响应的原始数据，确保JSON格式
            displayData = JSON.stringify({
                stream_data_count: response.stream_data_count,
                raw_stream_data: response.raw_stream_data
            }, null, 2);
            rawDataInfo = `<div class="raw-data-info">📊 流式响应原始数据 (JSON格式, ${response.stream_data_count} 条)</div>`;
        } else {
            // 使用原有逻辑，确保JSON格式
            if (isTruncated) {
                // 对于截断的数据，如果是字符串则直接显示，否则JSON格式化
                displayData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
            } else {
                // 确保所有响应数据都以JSON格式显示
                displayData = JSON.stringify(response, null, 2);
            }
        }
        
        // 生成完整响应按钮
        const fullResponseButton = isTruncated ? 
            `<button class="view-full-response-btn" onclick="chatApp.showFullResponse('${log.id}')">
                📄 查看完整响应 (${response.originalLength} 字符)
            </button>` : '';
        
        return `
            <div class="log-entry" data-log-id="${log.id}">
                <div class="log-header">
                    <span class="log-timestamp">${log.timestamp}</span>
                    <span class="log-status ${statusClass}">${statusText}</span>
                </div>
                <div class="log-details">
                    <div class="log-section">
                        <div class="log-section-title">📤 请求数据</div>
                        <div class="log-json">${JSON.stringify(log.request, null, 2)}</div>
                    </div>
                    <div class="log-section">
                        <div class="log-section-title">${log.status === 'success' ? '📥 响应数据' : '❌ 错误信息'}</div>
                        ${rawDataInfo}
                        <div class="log-json">${displayData}</div>
                        ${fullResponseButton}
                    </div>
                </div>
            </div>
        `;
    }

    showDebugInfo(title, data) {
        if (!this.debugMode) return;
        
        // 创建调试信息元素
        const debugDiv = document.createElement('div');
        debugDiv.className = 'debug-info';
        debugDiv.innerHTML = `
            <div class="debug-title">🔍 ${title}</div>
            <div class="debug-content">${JSON.stringify(data, null, 2)}</div>
            <div class="debug-time">${new Date().toLocaleTimeString()}</div>
        `;
        
        // 添加到聊天区域
        this.chatMessages.appendChild(debugDiv);
        this.scrollToBottom(true);
        
        // 3秒后自动隐藏
        setTimeout(() => {
            if (debugDiv.parentNode) {
                debugDiv.style.opacity = '0.3';
            }
        }, 3000);
    }

    showFullResponse(logId) {
        // 查找对应的日志条目
        const log = this.apiLogs.find(log => log.id == logId);
        if (!log || !log.response || !log.response.fullData) {
            this.showError('未找到完整响应数据');
            return;
        }

        // 创建全屏模态框显示完整响应
        const modal = document.createElement('div');
        modal.className = 'full-response-modal';
        modal.innerHTML = `
            <div class="full-response-content">
                <div class="full-response-header">
                    <h3>📄 完整API响应数据</h3>
                    <div class="full-response-actions">
                        <button onclick="chatApp.copyFullResponse('${logId}')" class="copy-btn">📋 复制</button>
                        <button onclick="chatApp.closeFullResponse()" class="close-btn">✕</button>
                    </div>
                </div>
                <div class="full-response-body">
                    <pre class="full-response-json">${JSON.stringify(log.response.fullData, null, 2)}</pre>
                </div>
            </div>
        `;

        // 添加到页面
        document.body.appendChild(modal);
        this.currentFullResponseModal = modal;

        // 绑定ESC键关闭
        const closeOnEsc = (e) => {
            if (e.key === 'Escape') {
                this.closeFullResponse();
                document.removeEventListener('keydown', closeOnEsc);
            }
        };
        document.addEventListener('keydown', closeOnEsc);
    }

    copyFullResponse(logId) {
        const log = this.apiLogs.find(log => log.id == logId);
        if (!log || !log.response || !log.response.fullData) {
            this.showError('未找到完整响应数据');
            return;
        }

        const responseText = JSON.stringify(log.response.fullData, null, 2);
        navigator.clipboard.writeText(responseText).then(() => {
            this.showSuccess('完整响应数据已复制到剪贴板');
        }).catch(() => {
            this.showError('复制失败');
        });
    }

    closeFullResponse() {
        if (this.currentFullResponseModal) {
            document.body.removeChild(this.currentFullResponseModal);
            this.currentFullResponseModal = null;
        }
    }

    formatImageProcessResult(imageProcessItem) {
        if (!imageProcessItem) {
            return '';
        }

        console.log('处理图像处理结果:', imageProcessItem);
        console.log('🔍 图像处理项的详细结构:', JSON.stringify(imageProcessItem, null, 2));
        
        let result = '';
        
        // 处理图像处理工具的调用和结果
        if (imageProcessItem.function_call) {
            const functionCall = imageProcessItem.function_call;
            result += `\n**🔧 调用图像处理工具: ${functionCall.name}**\n`;
            
            if (functionCall.arguments) {
                try {
                    const args = typeof functionCall.arguments === 'string' 
                        ? JSON.parse(functionCall.arguments) 
                        : functionCall.arguments;
                    result += `📝 参数: ${JSON.stringify(args, null, 2)}\n`;
                } catch (e) {
                    result += `📝 参数: ${functionCall.arguments}\n`;
                }
            }
        }

        // 处理工具调用的结果
        if (imageProcessItem.content) {
            result += `\n**📊 处理结果:**\n`;
            
            if (Array.isArray(imageProcessItem.content)) {
                imageProcessItem.content.forEach((item, index) => {
                    if (item.type === 'text' && item.text) {
                        result += `${item.text}\n`;
                    } else if (item.type === 'image_url' && item.image_url) {
                        result += `🖼️ 结果图片: ${item.image_url.url}\n`;
                    }
                });
            } else if (typeof imageProcessItem.content === 'string') {
                result += `${imageProcessItem.content}\n`;
            }
        }
        
        // 处理豆包新版图像处理结果格式 - 从action字段中提取result_image_url
        if (imageProcessItem.action && imageProcessItem.action.result_image_url) {
            result += `\n**🔍 图像处理: ${imageProcessItem.action.type || 'unknown'}**\n`;
            
            // 显示处理参数
            if (imageProcessItem.arguments) {
                result += `📋 处理参数:\n`;
                if (imageProcessItem.arguments.image_index !== undefined) {
                    result += `- 图片索引: ${imageProcessItem.arguments.image_index}\n`;
                }
                if (imageProcessItem.arguments.bbox_str) {
                    result += `- 检测区域: ${imageProcessItem.arguments.bbox_str}\n`;
                }
                if (imageProcessItem.arguments.scale !== undefined) {
                    result += `- 缩放比例: ${imageProcessItem.arguments.scale}\n`;
                }
            }
            
            // 显示处理状态
            if (imageProcessItem.status) {
                result += `✅ 状态: ${imageProcessItem.status}\n`;
            }
            
            // 显示结果图片
            result += `\n📸 处理结果图片:\n${imageProcessItem.action.result_image_url}\n`;
        }
        
        // 处理豆包新版图像处理结果格式 - 从action字段中提取result_image_url
        if (imageProcessItem.action && imageProcessItem.action.result_image_url) {
            result += `\n**🔍 图像处理: ${imageProcessItem.action.type || 'unknown'}**\n`;
            
            // 显示处理参数
            if (imageProcessItem.arguments) {
                result += `📋 处理参数:\n`;
                if (imageProcessItem.arguments.image_index !== undefined) {
                    result += `- 图片索引: ${imageProcessItem.arguments.image_index}\n`;
                }
                if (imageProcessItem.arguments.bbox_str) {
                    result += `- 检测区域: ${imageProcessItem.arguments.bbox_str}\n`;
                }
                if (imageProcessItem.arguments.scale !== undefined) {
                    result += `- 缩放比例: ${imageProcessItem.arguments.scale}\n`;
                }
            }
            
            // 显示处理状态
            if (imageProcessItem.status) {
                result += `✅ 状态: ${imageProcessItem.status}\n`;
            }
            
            // 显示结果图片
            result += `\n📸 处理结果图片:\n${imageProcessItem.action.result_image_url}\n`;
        }

        // 处理思考过程中的 reasoning 内容
        if (imageProcessItem.reasoning && imageProcessItem.reasoning.length > 0) {
            result += `\n**🤔 模型思考过程:**\n`;
            imageProcessItem.reasoning.forEach((reasoningItem, index) => {
                if (reasoningItem.text) {
                    result += `${reasoningItem.text}\n`;
                }
            });
        }

        // 处理 summary 内容（思考总结）
        if (imageProcessItem.summary && imageProcessItem.summary.length > 0) {
            result += `\n**💭 思考总结:**\n`;
            imageProcessItem.summary.forEach((summaryItem, index) => {
                if (summaryItem.text) {
                    result += `${summaryItem.text}\n`;
                }
            });
        }

        // 处理工具响应中的图片处理结果
        if (imageProcessItem.tool_responses) {
            imageProcessItem.tool_responses.forEach((toolResponse, index) => {
                if (toolResponse.content) {
                    result += `\n**🛠️ 工具响应 ${index + 1}:**\n`;
                    if (typeof toolResponse.content === 'string') {
                        result += `${toolResponse.content}\n`;
                    } else if (Array.isArray(toolResponse.content)) {
                        toolResponse.content.forEach(contentItem => {
                            if (contentItem.type === 'text' && contentItem.text) {
                                result += `${contentItem.text}\n`;
                            } else if (contentItem.type === 'image_url' && contentItem.image_url) {
                                result += `🖼️ 处理结果图片: ${contentItem.image_url.url}\n`;
                            }
                        });
                    }
                }
            });
        }

        // 特殊处理 result_image_url 参数
        const resultImageUrls = this.extractResultImageUrls(result);
        if (resultImageUrls.length > 0) {
            result += `\n**🎨 生成的结果图片:**\n`;
            resultImageUrls.forEach((url, index) => {
                result += `![结果图片 ${index + 1}](${url})\n`;
            });
        }

        console.log('格式化后的图像处理结果:', result);
        
        // 额外检查：如果没有找到任何内容，深入查看原始数据
        if (!result.trim()) {
            console.log('⚠️ 图像处理结果为空，进行深度分析...');
            this.analyzeImageProcessItem(imageProcessItem);
        }
        
        return result.trim();
    }
    
    // 深度分析图像处理项的方法
    analyzeImageProcessItem(item) {
        console.log('🔎 深度分析图像处理项:');
        console.log('- 对象类型:', typeof item);
        console.log('- 对象键值:', Object.keys(item || {}));
        
        // 检查所有可能的字段
        const possibleFields = [
            'function_call', 'content', 'reasoning', 'summary', 'tool_responses',
            'response', 'result', 'output', 'data', 'image_url', 'result_image_url',
            'tool_call', 'function_response', 'call_result', 'process_result'
        ];
        
        possibleFields.forEach(field => {
            if (item && item[field] !== undefined) {
                console.log(`✅ 发现字段 ${field}:`, item[field]);
                
                // 特别检查可能包含图片URL的字段
                if (typeof item[field] === 'string' && item[field].includes('http')) {
                    console.log(`🖼️ 字段 ${field} 可能包含图片URL:`, item[field]);
                }
            }
        });
        
        // 递归检查嵌套对象
        if (item && typeof item === 'object') {
            Object.entries(item).forEach(([key, value]) => {
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    console.log(`🔍 检查嵌套对象 ${key}:`, value);
                }
            });
        }
    }

    // 提取 result_image_url 参数的辅助方法
    extractResultImageUrls(text) {
        const urls = [];
        const patterns = [
            // 格式1: result_image_url: "https://..." (标准图片扩展名)
            /result_image_url:\s*"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|gif|webp|bmp|svg)(?:\?[^"]*)?)"/gi,
            // 格式2: "result_image_url": "https://..." (标准图片扩展名)
            /"result_image_url":\s*"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|gif|webp|bmp|svg)(?:\?[^"]*)?)"/gi,
            // 格式3: result_image_url = "https://..." (标准图片扩展名)
            /result_image_url\s*=\s*"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|gif|webp|bmp|svg)(?:\?[^"]*)?)"/gi,
            // 格式4: result_image_url:https://... (无引号，标准扩展名)
            /result_image_url:\s*(https?:\/\/[^\s\),\u4e00-\u9fff]+\.(?:jpg|jpeg|png|gif|webp|bmp|svg)(?:\?[^\s\),\u4e00-\u9fff]*)?)/gi,
            // 格式5: result_image_url: "https://..." (云存储URL，无扩展名)
            /result_image_url:\s*"(https?:\/\/[^"]*(?:ark-ams-storage|tos-cn-beijing|volces\.com|storage|cos|oss|obs)[^"]*)"/gi,
            // 格式6: "result_image_url": "https://..." (云存储URL，无扩展名)
            /"result_image_url":\s*"(https?:\/\/[^"]*(?:ark-ams-storage|tos-cn-beijing|volces\.com|storage|cos|oss|obs)[^"]*)"/gi,
            // 格式7: result_image_url = "https://..." (云存储URL，无扩展名)
            /result_image_url\s*=\s*"(https?:\/\/[^"]*(?:ark-ams-storage|tos-cn-beijing|volces\.com|storage|cos|oss|obs)[^"]*)"/gi,
            // 格式8: result_image_url:https://... (无引号，云存储URL)
            /result_image_url:\s*(https?:\/\/[^\s\),\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]*(?:ark-ams-storage|tos-cn-beijing|volces\.com|storage|cos|oss|obs)[^\s\),\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]*)/gi
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                if (match[1] && !urls.includes(match[1])) {
                    urls.push(match[1]);
                }
            }
        });

        return urls;
    }

    // 处理思考过程中的内容显示 - 匹配特定格式的图片URL并展示
    setReasoningContentWithImages(element, content) {
        if (!content) {
            element.textContent = '';
            return;
        }

        element.innerHTML = '';
        
        // 匹配"处理结果图片:"后面的特定格式URL，精确匹配到ignedHeaders=host结尾
        const resultImagePattern = /处理结果图片:\s*(https:\/\/ark-ams-storage-cn-beijing\.tos-cn-[^\s]*ignedHeaders=host)/gi;
        
        let lastIndex = 0;
        let match;
        
        while ((match = resultImagePattern.exec(content)) !== null) {
            // 添加匹配前的文本
            if (match.index > lastIndex) {
                const beforeText = content.substring(lastIndex, match.index);
                this.addTextContent(element, beforeText);
            }
            
            // 添加"处理结果图片:"标题
            const titleDiv = document.createElement('div');
            titleDiv.style.margin = '10px 0 5px 0';
            titleDiv.style.fontWeight = 'bold';
            titleDiv.textContent = '处理结果图片:';
            element.appendChild(titleDiv);
            
            // 添加图片
            const imageUrl = match[1];
            const imageContainer = document.createElement('div');
            imageContainer.className = 'reasoning-image-container';
            imageContainer.style.margin = '5px 0';
            
            const img = document.createElement('img');
            img.src = imageUrl;
            img.className = 'reasoning-image';
            img.alt = '处理结果图片';
            img.loading = 'lazy';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            
            img.onerror = () => {
                console.error('图片加载失败:', imageUrl);
                // 尝试使用代理URL
                const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
                console.log('尝试使用代理URL:', proxyUrl);
                
                const proxyImg = new Image();
                proxyImg.onload = () => {
                    console.log('代理图片加载成功:', proxyUrl);
                    img.src = proxyUrl;
                    img.style.display = 'block';
                };
                proxyImg.onerror = () => {
                    console.error('代理图片也加载失败:', proxyUrl);
                    img.style.display = 'none';
                    const errorText = document.createElement('span');
                    errorText.textContent = `[图片加载失败: ${imageUrl}]`;
                    errorText.className = 'reasoning-image-error';
                    imageContainer.appendChild(errorText);
                };
                proxyImg.src = proxyUrl;
            };

            img.onload = () => {
                console.log('处理结果图片加载成功:', imageUrl);
                this.scrollToBottom();
            };
            
            imageContainer.appendChild(img);
            element.appendChild(imageContainer);
            
            lastIndex = match.index + match[0].length;
        }
        
        // 添加剩余的文本
        if (lastIndex < content.length) {
            const remainingText = content.substring(lastIndex);
            this.addTextContent(element, remainingText);
        }
        
        // 调试日志
        console.log('处理结果图片匹配:', {
            内容长度: content.length,
            匹配到的图片数量: (content.match(resultImagePattern) || []).length
        });
    }
    
    // 辅助方法：添加文本内容
    addTextContent(element, text) {
        if (!text.trim()) return;
        
        const paragraphs = text.split('\n');
        paragraphs.forEach((paragraph, index) => {
            if (paragraph.trim()) {
                const p = document.createElement('p');
                p.style.margin = '0.5em 0';
                p.style.whiteSpace = 'pre-wrap';
                p.style.wordBreak = 'break-word';
                p.textContent = paragraph;
                element.appendChild(p);
            } else if (index < paragraphs.length - 1) {
                const br = document.createElement('br');
                element.appendChild(br);
            }
        });
    }

    // 创建截取的图片
    createCroppedImage(parentElement, sourceImageUrl, bbox, index) {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'reasoning-bbox-container';
        
        const title = document.createElement('div');
        title.className = 'bbox-title';
        title.textContent = `检测区域 ${index + 1} (${bbox.x1},${bbox.y1},${bbox.x2},${bbox.y2})`;
        imageContainer.appendChild(title);

        const canvas = document.createElement('canvas');
        canvas.className = 'reasoning-cropped-image';
        
        const img = new Image();
        img.crossOrigin = 'anonymous'; // 处理跨域
        
        img.onload = () => {
            console.log('原图加载成功，开始截取:', sourceImageUrl);
            
            // 计算截取区域
            const width = bbox.x2 - bbox.x1;
            const height = bbox.y2 - bbox.y1;
            
            // 设置canvas尺寸
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            
            try {
                // 从原图截取指定区域
                ctx.drawImage(
                    img,
                    bbox.x1, bbox.y1, width, height, // 源图区域
                    0, 0, width, height // 目标区域
                );
                
                console.log(`截取成功: ${width}x${height} 从 (${bbox.x1},${bbox.y1})`);
                
                // 滚动到底部
                this.scrollToBottom();
            } catch (error) {
                console.error('截取图片失败:', error);
                const errorText = document.createElement('span');
                errorText.textContent = `[图片截取失败: ${error.message}]`;
                errorText.className = 'reasoning-image-error';
                imageContainer.appendChild(errorText);
            }
        };

        img.onerror = () => {
            console.error('原图加载失败:', sourceImageUrl);
            // 尝试使用代理URL
            const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(sourceImageUrl)}`;
            console.log('尝试使用代理URL:', proxyUrl);
            
            // 创建新的图片元素尝试代理加载
            const proxyImg = new Image();
            proxyImg.onload = () => {
                console.log('代理图片加载成功:', proxyUrl);
                img.src = proxyUrl;
            };
            proxyImg.onerror = () => {
                console.error('代理图片也加载失败:', proxyUrl);
                const errorText = document.createElement('span');
                errorText.textContent = `[原图加载失败: ${sourceImageUrl}]`;
                errorText.className = 'reasoning-image-error';
                imageContainer.appendChild(errorText);
            };
            proxyImg.src = proxyUrl;
        };

        imageContainer.appendChild(canvas);
        parentElement.appendChild(imageContainer);
        
        // 开始加载原图
        img.src = sourceImageUrl;
    }

    // 显示普通图片（无bbox信息）
    displayRegularImages(element, content, foundImages) {
        let parts = [content];
        
        foundImages.forEach(imageUrl => {
            const newParts = [];
            parts.forEach(part => {
                if (typeof part === 'string') {
                    const splitParts = part.split(imageUrl);
                    for (let i = 0; i < splitParts.length; i++) {
                        if (i > 0) {
                            newParts.push({ type: 'image', url: imageUrl });
                        }
                        if (splitParts[i]) {
                            newParts.push(splitParts[i]);
                        }
                    }
                } else {
                    newParts.push(part);
                }
            });
            parts = newParts;
        });

        parts.forEach(part => {
            if (typeof part === 'string') {
                const textSpan = document.createElement('span');
                textSpan.textContent = part;
                element.appendChild(textSpan);
            } else if (part.type === 'image') {
                const imageContainer = document.createElement('div');
                imageContainer.className = 'reasoning-image-container';
                
                const img = document.createElement('img');
                img.src = part.url;
                img.className = 'reasoning-image';
                img.alt = '工具生成的图片';
                img.loading = 'lazy';
                
                img.onerror = () => {
                    console.error('图片加载失败:', part.url);
                    // 尝试使用代理URL
                    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(part.url)}`;
                    console.log('尝试使用代理URL:', proxyUrl);
                    
                    // 创建新的图片元素尝试代理加载
                    const proxyImg = new Image();
                    proxyImg.onload = () => {
                        console.log('代理图片加载成功:', proxyUrl);
                        img.src = proxyUrl;
                        img.style.display = 'block';
                    };
                    proxyImg.onerror = () => {
                        console.error('代理图片也加载失败:', proxyUrl);
                        img.style.display = 'none';
                        const errorText = document.createElement('span');
                        errorText.textContent = `[图片加载失败: ${part.url}]`;
                        errorText.className = 'reasoning-image-error';
                        imageContainer.appendChild(errorText);
                    };
                    proxyImg.src = proxyUrl;
                };

                img.onload = () => {
                    console.log('思考过程中的图片加载成功:', part.url);
                    this.scrollToBottom();
                };
                
                imageContainer.appendChild(img);
                element.appendChild(imageContainer);
            }
        });
    }

    // 专门处理思考过程中的result_image_url参数
    displayResultImages(element, content, resultImageUrls) {
        let parts = [content];
        
        // 将每个result_image_url参数替换为图片标记
        resultImageUrls.forEach(resultImage => {
            const newParts = [];
            parts.forEach(part => {
                if (typeof part === 'string') {
                    const splitParts = part.split(resultImage.originalText);
                    for (let i = 0; i < splitParts.length; i++) {
                        if (i > 0) {
                            // 在原来参数的位置插入图片
                            newParts.push({ 
                                type: 'result_image', 
                                url: resultImage.url,
                                originalText: resultImage.originalText
                            });
                        }
                        if (splitParts[i]) {
                            newParts.push(splitParts[i]);
                        }
                    }
                } else {
                    newParts.push(part);
                }
            });
            parts = newParts;
        });

        // 渲染所有部分
        parts.forEach(part => {
            if (typeof part === 'string') {
                const textSpan = document.createElement('span');
                textSpan.textContent = part;
                element.appendChild(textSpan);
            } else if (part.type === 'result_image') {
                const imageContainer = document.createElement('div');
                imageContainer.className = 'reasoning-image-container result-image-container';
                
                // 添加说明标题
                const title = document.createElement('div');
                title.className = 'result-image-title';
                title.textContent = '📸 AI处理结果图片';
                imageContainer.appendChild(title);
                
                const img = document.createElement('img');
                img.src = part.url;
                img.className = 'reasoning-image result-image';
                img.alt = 'AI处理结果图片';
                img.loading = 'lazy';
                
                img.onerror = () => {
                    console.error('结果图片加载失败:', part.url);
                    // 尝试使用代理URL
                    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(part.url)}`;
                    console.log('尝试使用代理URL:', proxyUrl);
                    
                    // 创建新的图片元素尝试代理加载
                    const proxyImg = new Image();
                    proxyImg.onload = () => {
                        console.log('代理结果图片加载成功:', proxyUrl);
                        img.src = proxyUrl;
                        img.style.display = 'block';
                    };
                    proxyImg.onerror = () => {
                        console.error('代理结果图片也加载失败:', proxyUrl);
                        img.style.display = 'none';
                        const errorText = document.createElement('span');
                        errorText.textContent = `[图片加载失败: ${part.originalText}]`;
                        errorText.className = 'reasoning-image-error';
                        imageContainer.appendChild(errorText);
                    };
                    proxyImg.src = proxyUrl;
                };

                img.onload = () => {
                    console.log('result_image_url图片加载成功:', part.url);
                    this.scrollToBottom();
                };
                
                imageContainer.appendChild(img);
                element.appendChild(imageContainer);
            }
        });
    }

    showLoading(show) {
        this.loading.style.display = show ? 'flex' : 'none';
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type = 'info') {
        // 创建消息提示
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-toast ${type}`;
        messageDiv.textContent = message;
        
        // 添加样式
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
            border-radius: 8px;
            padding: 15px 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            z-index: 10000;
            max-width: 300px;
            word-wrap: break-word;
            animation: slideIn 0.3s ease-out;
        `;
        
        // 添加到页面
        document.body.appendChild(messageDiv);
        
        // 3秒后自动消失
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => {
                    if (messageDiv.parentNode) {
                        messageDiv.parentNode.removeChild(messageDiv);
                    }
                }, 300);
            }
        }, 3000);
        
        // 点击消失
        messageDiv.addEventListener('click', () => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.doubaoChat = new DoubaoImageChat();
    
    // 添加一些快捷键
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter 发送消息
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            window.doubaoChat.sendMessage();
        }
        
        // Esc 键取消图片选择
        if (e.key === 'Escape') {
            window.doubaoChat.removeImage();
        }
    });
    
    // 防止页面意外刷新时丢失输入内容
    window.addEventListener('beforeunload', (e) => {
        const messageInput = document.getElementById('messageInput');
        if (messageInput && messageInput.value.trim()) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
});
