"""
审校相关的API路由
"""

from flask import Blueprint, request, jsonify, send_file, Response
from src.services.proofreading_engine import proofreading_engine
from src.services.document_service import document_service
import io
import datetime
import os

proofreading_bp = Blueprint('proofreading', __name__)

@proofreading_bp.route('/proofread', methods=['POST'])
def proofread_text():
    """文档审校接口"""
    try:
        data = request.get_json()
        
        if not data or 'content' not in data:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': '请求参数无效，缺少content字段'
                }
            }), 400
        
        content = data['content']
        options = data.get('options', {})
        
        # 检查内容长度
        if len(content) > 100000:  # 限制10万字符
            return jsonify({
                'success': False,
                'error': {
                    'code': 'CONTENT_TOO_LARGE',
                    'message': '文档内容过大，请分段处理'
                }
            }), 400
        
        # 执行审校
        result = proofreading_engine.proofread(content, options)
        
        return jsonify({
            'success': True,
            'data': result
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'PROCESSING_ERROR',
                'message': f'处理过程中发生错误: {str(e)}'
            }
        }), 500

@proofreading_bp.route('/report/html', methods=['POST'])
def report_html():
    """生成审校报告 HTML 供前端预览。支持三种输入：
    1) content + issues 数组；
    2) content + result 对象（包含 issues 与 statistics）；
    3) 仅 content（服务端自动审校）。
    """
    try:
        data = request.get_json() or {}
        content = data.get('content', '')
        if not content:
            return jsonify({'success': False, 'error': {'code': 'INVALID_REQUEST', 'message': '缺少content'}}), 400

        options = data.get('options', {})
        result = data.get('result')
        issues = data.get('issues')

        if result and isinstance(result, dict) and isinstance(result.get('issues'), list):
            final_result = result
        elif isinstance(issues, list):
            # 简单统计
            final_result = {
                'issues': issues,
                'statistics': {
                    'total_issues': len(issues),
                    'typos': sum(1 for i in issues if str(i.get('type','')).lower() in ('typo','错别字')),
                    'grammar': sum(1 for i in issues if str(i.get('type','')).lower() in ('grammar','语法')),
                    'punctuation': sum(1 for i in issues if str(i.get('type','')).lower() in ('punctuation','标点')),
                    'sensitive': sum(1 for i in issues if str(i.get('type','')).lower() in ('sensitive','敏感')),
                }
            }
        else:
            # 自动执行一次审校
            final_result = proofreading_engine.proofread(content, options)

        meta = {
            'title': data.get('title') or '审校报告',
            'author': data.get('author') or '',
            'rules_mode': (options.get('rules_mode') or 'LITE'),
            'qwen': bool(options.get('llm', True)),
            'export_time': datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
        }

        html = document_service.render_report_html(content, final_result, meta)
        return Response(html, mimetype='text/html; charset=utf-8')
    except Exception as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'REPORT_RENDER_ERROR',
                'message': f'生成报告失败: {str(e)}'
            }
        }), 500

@proofreading_bp.route('/export/word', methods=['POST'])
def export_word():
    """导出Word文档接口（生成结构化审校报告，方案B）。
    兼容旧入参：
    - 支持 content + issues
    - 支持 content + result
    - 或仅 content（服务端自动审校）
    """
    try:
        data = request.get_json()
        
        if not data or 'content' not in data:
            return jsonify({
                'success': False,
                'error': {
                    'code': 'INVALID_REQUEST',
                    'message': '请求参数无效，缺少content字段'
                }
            }), 400
        
        content = data['content']
        title = data.get('title', '审校文档')
        author = data.get('author', '')
        options = data.get('options', {})

        # 组装 result
        result = data.get('result')
        issues = data.get('issues')
        if result and isinstance(result, dict) and isinstance(result.get('issues'), list):
            final_result = result
        elif isinstance(issues, list):
            final_result = {
                'issues': issues,
                'statistics': {
                    'total_issues': len(issues),
                    'typos': sum(1 for i in issues if str(i.get('type','')).lower() in ('typo','错别字')),
                    'grammar': sum(1 for i in issues if str(i.get('type','')).lower() in ('grammar','语法')),
                    'punctuation': sum(1 for i in issues if str(i.get('type','')).lower() in ('punctuation','标点')),
                    'sensitive': sum(1 for i in issues if str(i.get('type','')).lower() in ('sensitive','敏感')),
                }
            }
        else:
            final_result = proofreading_engine.proofread(content, options)
        
        meta = {
            'rules_mode': (options.get('rules_mode') or 'LITE'),
            'qwen': bool(options.get('llm', True)),
        }

        # 生成Word报告
        doc_content = document_service.docx_from_report(content, final_result, title=title, author=author, meta=meta)
        
        # 创建文件流
        file_stream = io.BytesIO(doc_content)
        file_stream.seek(0)
        
        # 生成文件名
        timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f'{title}_{timestamp}.docx'
        
        return send_file(
            file_stream,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'EXPORT_ERROR',
                'message': f'导出文档时发生错误: {str(e)}'
            }
        }), 500

@proofreading_bp.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    # 检查 Qwen 配置状态（不泄露密钥值）
    qwen_enabled = bool(os.getenv("QWEN_API_KEY", "").strip())
    
    return jsonify({
        'success': True,
        'message': 'Service is running',
        'timestamp': datetime.datetime.now().isoformat(),
        'qwen_enabled': qwen_enabled,
        'features': {
            'typo_check': True,
            'grammar_check': True,
            'punctuation_check': True,
            'sensitive_check': True,
            'llm_proofreading': qwen_enabled
        }
    })

