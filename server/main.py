import sqlite3
from markupsafe import escape
from flask import Flask, request, make_response, g
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import time, os, json
from collections import defaultdict

app = Flask(__name__, static_url_path='')
cors = CORS(app,resources={r"/*":{"origins":"*"}})
socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=5, ping_interval=5)

DATABASE = os.path.dirname(__file__) + '/tinyboard.db'
def get_db():
    db = getattr(g, '_database', None)
    if db is None: db = g._database = sqlite3.connect(DATABASE)
    try:
        db.execute('CREATE TABLE sessions (session_id TEXT, tstamp BIGINT, args TEXT, name TEXT)')
    except:
        pass
    try:
        db.execute('CREATE TABLE kernel_defs (session_id TEXT, name TEXT, src TEXT)')
    except:
        pass
    try:
        db.execute('CREATE TABLE kernel_stat (session_id TEXT, tstamp BIGINT, name TEXT, mem_usage FLOAT, exectime FLOAT, gflops FLOAT)')
    except:
        pass
    try:
        db.execute('CREATE TABLE func_debug (session_id TEXT, function_name TEXT, mlops_graph TEXT, lazyops_graph TEXT, mlops_info TEXT)')
    except:
        pass
    try:
        db.execute('CREATE TABLE lazyops_to_kernel (session_id TEXT, kernel_name TEXT, lazyops TEXT)')
    except:
        pass
    try:
        db.execute('CREATE TABLE graph (session_id TEXT, tstamp BIGINT, name TEXT, type TEXT, series TEXT, xaxis TEXT, graphinfo TEXT)')
    except:
        pass
    return db

def client_connect():
    pass

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None: db.close()

@app.route('/')
def home():
    return app.send_static_file('index.html')

@app.route('/run/<sess>')
def run(sess):
    return app.send_static_file('index.html')

@app.route("/api/log", methods=['POST'])
def recv_packet():
    req = request.get_json(silent=True)
    session = req.get("session", None)
    socketio.on('connect', namespace=f'/{session}')(client_connect) # Allowing to connect to the session namespace.
    if session is None: return make_response("No paylod", 500)
    pls = req.get("payloads", None)
    db = get_db().cursor()
    sorted_payloads = defaultdict(list)
    for pl in pls:
        name = pl['name']
        payload = pl['payload']
        payload['tstamp'] = round(time.time() * 1000)
        if name == "init":
            db.execute("INSERT INTO sessions (session_id,tstamp,args,name) VALUES (?,?,?,?)",(session, payload['tstamp'], payload.get('args', ''), payload.get('name', '')))
        elif name == "kernel_def":
            db.execute("INSERT INTO kernel_defs (session_id,name,src) VALUES (?,?,?)",(session, payload['name'], payload['src']))
        elif name == "kernel_stat":
            db.execute("INSERT INTO kernel_stat (session_id,tstamp,name,mem_usage,exectime,gflops) VALUES (?,?,?,?,?,?)",(session, payload['tstamp'], payload['name'], payload['mem_usage'], payload['exectime'], payload['gflops']))
        elif name == "func_debug":
            db.execute("INSERT INTO func_debug (session_id,function_name,mlops_graph,lazyops_graph,mlops_info) VALUES (?,?,?,?,?)",(session, payload['function_name'], payload['mlops_graph'], payload['lazyops_graph'], payload['mlops_info']))
        elif name == "lazyops_to_kernel":
            db.execute("INSERT INTO lazyops_to_kernel (session_id,kernel_name,lazyops) VALUES (?,?,?)",(session, payload['kernel_name'], payload['lazyops']))
        elif name == "graph":
            db.execute("INSERT INTO graph (session_id,tstamp,name,type,series,xaxis,graphinfo) VALUES (?,?,?,?,?,?,?)",(session, payload['tstamp'], payload['name'], payload['type'], payload['series'], payload['xaxis'], payload['graphinfo']))
        sorted_payloads[name].append(payload)
    get_db().commit()

    for k,v in sorted_payloads.items():
        namespace = f'/{session}'
        if k == "init": namespace = "/"
        emit(k, json.dumps(v), namespace=namespace, broadcast=True)
    return make_response("", 200)

@app.route("/api/sessions", methods=['GET'])
def api_sessions():
    db = get_db().cursor()
    res = db.execute("SELECT * from sessions").fetchall()
    resp = [{'session': r[0], 'tstamp': r[1], 'args': r[2], 'name': r[3]} for r in res]
    return make_response(resp, 200)

@app.route("/api/get_session/<session>", methods=['GET'])
def api_get_session(session):
    session = escape(session)
    db = get_db().cursor()
    res = db.execute("SELECT * from sessions WHERE session_id=?", (session,)).fetchall()
    resp = [{'session': r[0], 'tstamp': r[1], 'args': r[2], 'name': r[3]} for r in res]
    return make_response(resp, 200)

@app.route("/api/restore_kernels/<session>", methods=['GET'])
def api_restore_kernels(session):
    session = escape(session)
    db = get_db().cursor()
    res = db.execute("SELECT * from kernel_defs WHERE session_id=?", (session,)).fetchall()
    kernel_def = [{'session': r[0], 'name': r[1], 'src': r[2]} for r in res]
    res = db.execute("SELECT * from kernel_stat WHERE session_id=? ORDER BY tstamp", (session,)).fetchall()
    kernel_stat = [{'session': r[0], 'tstamp': r[1], 'name': r[2], 'mem_usage': r[3], 'exectime': r[4], 'gflops': r[5]} for r in res]
    return make_response({'kernel_def': kernel_def, 'kernel_stat': kernel_stat}, 200)

@app.route("/api/restore_func_debug/<session>", methods=['GET'])
def api_restore_func_debug(session):
    session = escape(session)
    db = get_db().cursor()
    res = db.execute("SELECT * from func_debug WHERE session_id=?", (session,)).fetchall()
    debugs = [{'session': r[0], 'function_name': r[1], 'mlops_graph': r[2], 'lazyops_graph': r[3], 'mlops_info': r[4]} for r in res]
    res = db.execute("SELECT * from lazyops_to_kernel WHERE session_id=?", (session,)).fetchall()
    lazyops_to_kernel = [{'session': r[0], 'kernel_name': r[1], 'lazyops': r[2]} for r in res]
    return make_response({'func_debug': debugs, 'lazyops_to_kernel': lazyops_to_kernel}, 200)

@app.route("/api/restore_graphs/<session>", methods=['GET'])
def api_restore_graphs(session):
    session = escape(session)
    db = get_db().cursor()
    res = db.execute("SELECT * from graph WHERE session_id=? ORDER BY tstamp", (session,)).fetchall()
    graphs = [{'session': r[0], 'tstamp': r[1], 'name': r[2], 'type': r[3], 'series': r[4], 'xaxis': r[5], 'graphinfo': r[6]} for r in res]
    return make_response(graphs, 200)

if __name__ == '__main__':
    socketio.run(app, port=6226, use_reloader=True)
