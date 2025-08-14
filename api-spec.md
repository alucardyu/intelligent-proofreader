# 智能审校工具 API 接口规范

## 基础信息
- 基础URL: `/api`
- 数据格式: JSON
- 字符编码: UTF-8

## 接口列表

### 1. 文档审校接口

**POST** `/api/proofread`

**描述**: 对上传的文档内容进行智能审校

**请求参数**:
```json
{
  "content": "string",  // 文档内容（纯文本或HTML）
  "options": {
    "check_typos": true,      // 是否检查错别字
    "check_grammar": true,    // 是否检查语法
    "check_punctuation": true, // 是否检查标点符号
    "check_sensitive": true   // 是否检查敏感词
  }
}
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "issues": [
      {
        "id": "string",           // 问题唯一标识
        "type": "typo|grammar|punctuation|sensitive", // 问题类型
        "category": "string",     // 问题分类（用词不当、语法问题等）
        "position": {
          "start": 10,           // 问题开始位置
          "end": 15              // 问题结束位置
        },
        "original": "string",     // 原始文本
        "suggestion": "string",   // 建议修改
        "description": "string",  // 问题描述
        "severity": "high|medium|low" // 严重程度
      }
    ],
    "statistics": {
      "total_issues": 5,
      "typos": 2,
      "grammar": 1,
      "punctuation": 1,
      "sensitive": 1
    }
  }
}
```

### 2. 导出Word文档接口

**POST** `/api/export/word`

**描述**: 将修改后的文档内容导出为Word文档

**请求参数**:
```json
{
  "content": "string",      // 最终的文档内容（HTML格式）
  "title": "string",       // 文档标题
  "author": "string"       // 作者（可选）
}
```

**响应格式**:
- Content-Type: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- 返回二进制文件流

### 3. 健康检查接口

**GET** `/api/health`

**描述**: 检查服务状态

**响应格式**:
```json
{
  "success": true,
  "message": "Service is running",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## 错误响应格式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": "详细错误信息（可选）"
  }
}
```

## 错误代码

- `INVALID_REQUEST`: 请求参数无效
- `CONTENT_TOO_LARGE`: 文档内容过大
- `PROCESSING_ERROR`: 处理过程中发生错误
- `EXPORT_ERROR`: 导出文档时发生错误
- `INTERNAL_ERROR`: 服务器内部错误

