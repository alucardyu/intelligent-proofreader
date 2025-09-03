import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from src.routes.proofreading import proofreading_bp
import datetime

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'

# 启用CORS支持
CORS(app)

# 注册审校路由
app.register_blueprint(proofreading_bp, url_prefix='/api')

# 简单的健康检查路由（与蓝图 /api/health 保持一致结构）
@app.route('/api/health')
def health_check():
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

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    # 获取端口号，支持Render等平台的动态端口
    port = int(os.environ.get('PORT', 5000))
    # 生产环境关闭debug模式
    debug_mode = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug_mode)

