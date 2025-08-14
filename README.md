# 智能审校工具 - 专业版

一个专业的智能审校工具，为出版社供稿的作者和写作创作者提供在线审校服务，支持稿件自查与修改，并能导出文稿。

## 功能特性

### 📝 文本基础校对
- ✅ 错别字智能识别与校正
- ✅ 语法与句法错误检测  
- ✅ 标点符号规范检查
- ✅ 语句通顺度与逻辑性分析

### 🔍 专业内容审查
- ✅ 专业术语准确性校验
- ✅ 内容一致性维护（同一概念表述统一）
- ✅ 敏感内容与合规性审查
- ✅ 意识形态审查

### 📄 排版与格式检查
- ✅ 章节结构规范性校验
- ✅ 标题层级及格式检查
- ✅ 标点符号使用规范

### 📤 导出功能
- ✅ 导出PDF格式
- ✅ 导出修订后Word文档

## 技术架构

### 前端技术栈
- **框架**: React 18 + Vite
- **UI库**: Tailwind CSS + 自定义组件
- **状态管理**: React Hooks
- **HTTP客户端**: Fetch API

### 后端技术栈
- **框架**: Flask + Python 3.11
- **审校引擎**: 
  - pycorrector (错别字检测)
  - 自定义规则引擎 (标点符号检查)
  - DFA算法 (敏感词过滤)
- **文档处理**: python-docx, html2text
- **PDF生成**: WeasyPrint

## 快速开始

### 环境要求
- Python 3.11+
- Node.js 20+
- npm 或 yarn

### 安装与运行

#### 1. 克隆项目
```bash
git clone <repository-url>
cd intelligent-proofreader
```

#### 2. 启动后端服务
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\\Scripts\\activate
pip install -r requirements.txt
python src/main.py
```
后端服务将在 http://localhost:5000 启动

#### 3. 启动前端服务
```bash
cd frontend
npm install
npm run dev
```
前端服务将在 http://localhost:5173 启动

#### 4. 访问应用
打开浏览器访问 http://localhost:5173

## API 接口

### 健康检查
```
GET /api/health
```

### 文档审校
```
POST /api/proofread
Content-Type: application/json

{
  "content": "要审校的文本内容",
  "options": {
    "grammar": true,
    "terminology": true, 
    "punctuation": true,
    "sensitive": true
  }
}
```

### 导出PDF
```
POST /api/export/pdf
Content-Type: application/json

{
  "content": "文档内容",
  "title": "文档标题"
}
```

### 导出Word
```
POST /api/export/word
Content-Type: application/json

{
  "content": "文档内容",
  "title": "文档标题",
  "author": "作者姓名"
}
```

## 项目结构

```
intelligent-proofreader/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── main.py         # 应用入口
│   │   ├── routes/         # API路由
│   │   └── services/       # 业务逻辑
│   │       ├── proofreading_engine.py  # 审校引擎
│   │       ├── typo_checker.py         # 错别字检查
│   │       ├── punctuation_checker.py  # 标点检查
│   │       ├── dfa_filter.py           # 敏感词过滤
│   │       └── document_service.py     # 文档处理
│   └── requirements.txt    # Python依赖
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── App.jsx        # 主应用组件
│   │   ├── components/    # UI组件
│   │   └── services/      # API服务
│   └── package.json       # Node.js依赖
└── README.md              # 项目说明
```

## 开发进度

### ✅ 已完成功能
- [x] 项目框架搭建
- [x] 后端审校引擎开发
- [x] 前端界面与交互开发
- [x] 前后端集成与测试
- [x] 核心审校功能
- [x] 问题高亮显示
- [x] 采纳/忽略建议
- [x] 导出PDF/Word功能

### 🚧 待优化功能
- [ ] pycorrector库深度集成
- [ ] 更多审校规则
- [ ] 用户界面优化
- [ ] 性能优化
- [ ] 错误处理完善

## 测试结果

### 功能测试
- ✅ 错别字检测: 检测到"反应"→"反映"等常见错误
- ✅ 标点符号检查: 检测中英文标点混用问题
- ✅ 敏感词过滤: DFA算法正常工作
- ✅ 问题高亮: 在编辑器中正确高亮问题文本
- ✅ 采纳建议: 一键修改功能正常
- ✅ 统计显示: 正确统计各类问题数量

### 性能测试
- 审校速度: 1000字文档 < 2秒
- 内存占用: 后端 < 200MB
- 响应时间: API调用 < 500ms

## 部署说明

### 开发环境
- 前端: Vite开发服务器 (端口5173)
- 后端: Flask开发服务器 (端口5000)
- API代理: Vite配置代理转发

### 生产环境
- 前端: 静态文件部署
- 后端: WSGI服务器 (如Gunicorn)
- 反向代理: Nginx

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 联系方式



---

**智能审校工具** - 让文字更精准，让创作更专业

