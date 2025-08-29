const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const OSS = require('ali-oss');

const app = express();
const PORT = process.env.PORT || 9848;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use(express.static(path.join(__dirname)));

// 配置multer用于文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB限制
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('只允许上传图片文件'));
        }
    }
});

// 豆包API代理路由
app.post('/api/doubao', async (req, res) => {
    const { apiKey, requestData } = req.body;
    
    // 优先使用环境变量中的API Key，如果没有则使用前端传递的
    const finalApiKey = process.env.DOUBAO_API_KEY || apiKey;
    
    if (!finalApiKey) {
        return res.status(400).json({ error: 'API Key is required' });
    }

    try {
        const fetch = (await import('node-fetch')).default;
        
        console.log('发起豆包API请求...');
        console.log('请求数据:', JSON.stringify(requestData, null, 2));
        
        // 根据是否有图像处理工具决定headers
        const headers = {
            'Authorization': `Bearer ${finalApiKey}`,
            'Content-Type': 'application/json'
        };
        
        // 只有使用图像处理工具时才添加特殊header
        if (requestData.tools && requestData.tools.some(tool => tool.type === 'image_process')) {
            headers['ark-beta-image-process'] = 'true';
            console.log('添加图像处理头部');
        }

        const response = await fetch('http://ark.cn-beijing.volces.com/api/v3/responses', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestData),
            timeout: 60000 // 设置60秒超时
        });

        console.log('豆包API响应状态:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('豆包API错误响应:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        // 如果是流式响应
        if (requestData.stream) {
            console.log('处理流式响应...');
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.setHeader('Transfer-Encoding', 'chunked');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');

            // 在Node.js中，直接使用pipe方法
            response.body.pipe(res);
        } else {
            // 非流式响应
            console.log('处理非流式响应...');
            const data = await response.json();
            console.log('响应数据长度:', JSON.stringify(data).length);
            res.json(data);
        }
    } catch (error) {
        console.error('Doubao API Error:', error);
        res.status(500).json({ 
            error: 'Failed to call Doubao API',
            details: error.message 
        });
    }
});

// 图片上传路由
app.post('/api/upload', upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '没有收到图片文件' });
        }

        const imageUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
        
        res.json({
            success: true,
            imageUrl: imageUrl,
            filename: req.file.filename
        });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ 
            error: '图片上传失败',
            details: error.message 
        });
    }
});

// 上传文件夹的静态服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// OSS服务端上传路由
app.post('/api/upload-oss', multer().single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '没有收到图片文件' });
        }

        const { ossConfig } = req.body;
        
        // 优先使用环境变量中的OSS配置，如果没有则使用前端传递的
        const finalOssConfig = {
            accessKeyId: process.env.OSS_ACCESS_KEY_ID || (ossConfig && ossConfig.accessKeyId),
            accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || (ossConfig && ossConfig.accessKeySecret),
            bucket: process.env.OSS_BUCKET || (ossConfig && ossConfig.bucket),
            region: process.env.OSS_REGION || (ossConfig && ossConfig.region),
            path: process.env.OSS_PATH || (ossConfig && ossConfig.path) || '',
            domain: process.env.OSS_DOMAIN || (ossConfig && ossConfig.domain)
        };
        
        if (!finalOssConfig.accessKeyId || !finalOssConfig.accessKeySecret || !finalOssConfig.bucket || !finalOssConfig.region) {
            return res.status(400).json({ error: 'OSS配置信息不完整' });
        }

        console.log('服务端OSS上传开始...', {
            fileName: req.file.originalname,
            size: req.file.size,
            bucket: ossConfig.bucket,
            region: ossConfig.region
        });

        // 创建OSS客户端
        const client = new OSS({
            region: finalOssConfig.region,
            accessKeyId: finalOssConfig.accessKeyId,
            accessKeySecret: finalOssConfig.accessKeySecret,
            bucket: finalOssConfig.bucket
        });

        // 生成文件名
        const ext = path.extname(req.file.originalname) || '.jpg';
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const fileName = `${finalOssConfig.path}image-${timestamp}-${random}${ext}`;

        console.log('上传文件到OSS:', fileName);

        // 上传文件
        const result = await client.put(fileName, req.file.buffer);

        // 构造返回URL
        let imageUrl;
        if (finalOssConfig.domain) {
            imageUrl = `${finalOssConfig.domain.replace(/\/$/, '')}/${fileName}`;
        } else {
            imageUrl = result.url;
        }

        console.log('✅ 服务端OSS上传成功:', imageUrl);

        res.json({
            success: true,
            url: imageUrl,
            fileName: fileName
        });

    } catch (error) {
        console.error('❌ 服务端OSS上传失败:', error);
        res.status(500).json({
            error: 'OSS上传失败',
            details: error.message
        });
    }
});

// 图片代理路由 - 解决CORS问题
app.get('/api/proxy-image', async (req, res) => {
    try {
        const { url } = req.query;
        
        if (!url) {
            return res.status(400).json({ error: '缺少图片URL参数' });
        }

        console.log('代理图片请求:', url);
        
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // 设置响应头
        res.setHeader('Content-Type', response.headers.get('content-type') || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // 将图片数据流式传输给客户端
        response.body.pipe(res);
        
    } catch (error) {
        console.error('图片代理错误:', error);
        res.status(500).json({ 
            error: '图片代理失败',
            details: error.message 
        });
    }
});

// 首页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 健康检查路由
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('Server Error:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: '文件大小超过限制(10MB)' });
        }
    }
    
    res.status(500).json({ 
        error: '服务器内部错误',
        details: process.env.NODE_ENV === 'development' ? error.message : '请联系管理员'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 豆包图像处理聊天工具已启动!`);
    console.log(`📱 本地访问地址: http://localhost:${PORT}`);
    console.log(`🌐 网络访问地址: http://你的IP地址:${PORT}`);
    console.log(`⚙️  API代理地址: http://localhost:${PORT}/api/doubao`);
    console.log(`📸 图片上传地址: http://localhost:${PORT}/api/upload`);
    console.log(`\n💡 使用说明:`);
    console.log(`   1. 在设置中输入您的豆包API Key`);
    console.log(`   2. 可以直接发送文字消息`);
    console.log(`   3. 点击📷按钮上传图片进行分析`);
    console.log(`   4. 支持流式和非流式响应模式`);
    console.log(`\n🛑 停止服务: Ctrl+C`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('\n👋 正在关闭服务器...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n👋 正在关闭服务器...');
    process.exit(0);
});
