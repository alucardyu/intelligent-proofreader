"""
审校相关的API路由
"""

from flask import Blueprint, request, jsonify, send_file
from src.services.proofreading_engine import proofreading_engine
from src.services.document_service import document_service
import io
import datetime

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

@proofreading_bp.route('/export/word', methods=['POST'])
def export_word():
    """导出Word文档接口"""
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
        
        # 生成Word文档
        if content.startswith('<') and content.endswith('>'):
            # HTML内容
            doc_content = document_service.html_to_docx(content, title, author)
        else:
            # 纯文本内容
            doc_content = document_service.create_simple_docx(content, title)
        
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
    return jsonify({
        'success': True,
        'message': 'Service is running',
        'timestamp': datetime.datetime.now().isoformat()
    })

