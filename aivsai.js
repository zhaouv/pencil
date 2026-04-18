// aivsai.js — Node环境下AI对战测试
// 用法: node aivsai.js [options]
//   -1, --ai1 <name>    先手AI (default: ok)
//   -2, --ai2 <name>    后手AI (default: gr)
//   -x, --xsize <n>     棋盘宽 (default: 6)
//   -y, --ysize <n>     棋盘高 (default: 6)
//   -n, --rounds <n>    局数 (default: 100)
//   --seed <n>          固定随机种子
//   -o, --output <file> 录像输出 (.json 或 .html)
//   --late-trace <file> 逐行追加 EDGE_NOT<=5 的实际对局路径
//   --trace-safe-max <n> late-trace 记录的 safeEdgeCount 上限 (default: 5)
//   -s, --swap          交换先后手再跑一轮
//   -h, --help          显示帮助

var vm = require('vm')
var fs = require('fs')
var path = require('path')

// ============ 加载源文件 ============

function createSeededRandom(seed) {
    var state = seed >>> 0
    return function() {
        state = (state * 1664525 + 1013904223) >>> 0
        return state / 4294967296
    }
}

function normalizeSeed(seed) {
    if (seed == null) return null
    if (/^-?\d+$/.test(seed)) {
        return (parseInt(seed, 10) >>> 0)
    }
    var hash = 2166136261
    for (var ii = 0; ii < seed.length; ii++) {
        hash ^= seed.charCodeAt(ii)
        hash = Math.imul(hash, 16777619)
    }
    return hash >>> 0
}

var nativeMath = Object.create(Math)

var sandbox = {
    console: console,
    setTimeout: setTimeout,
    setInterval: setInterval,
    clearTimeout: clearTimeout,
    clearInterval: clearInterval,
    Math: nativeMath,
}
vm.createContext(sandbox)

var srcFiles = ['game.js', 'gamedata.js', 'player.js', 'treeSearch.js']
for (var i = 0; i < srcFiles.length; i++) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, srcFiles[i]), 'utf8'), sandbox)
}

var Game = sandbox.Game
var GameData = sandbox.GameData
var GreedyRandomAI = sandbox.GreedyRandomAI
var OffensiveKeeperAI = sandbox.OffensiveKeeperAI
var TreeSearchAI = sandbox.TreeSearchAI

// ============ AI注册表 ============

var AI_MAP = {
    gr: { cls: GreedyRandomAI, name: 'GreedyRandomAI', short: 'GR' },
    ok: { cls: OffensiveKeeperAI, name: 'OffensiveKeeperAI', short: 'OK' },
    ts: { cls: TreeSearchAI, name: 'TreeSearchAI', short: 'TS' },
}

// ============ CLI解析 ============

function printHelp() {
    console.log([
        '用法: node aivsai.js [options]',
        '',
        'AI名称: gr(GreedyRandomAI) ok(OffensiveKeeperAI) ts(TreeSearchAI)',
        '',
        'Options:',
        '  -1, --ai1 <name>    先手AI (default: ok)',
        '  -2, --ai2 <name>    后手AI (default: gr)',
        '  -x, --xsize <n>     棋盘宽 (default: 6)',
        '  -y, --ysize <n>     棋盘高 (default: 6)',
        '  -n, --rounds <n>    局数 (default: 100)',
        '  --seed <n>          固定随机种子',
        '  -o, --output <file> 录像输出 (.json 或 .html)',
        '  --late-trace <file> 逐行追加 EDGE_NOT<=5 的实际对局路径',
        '  --trace-safe-max <n> late-trace 记录的 safeEdgeCount 上限 (default: 5)',
        '  -s, --swap          交换先后手再跑一轮',
        '  -h, --help          显示帮助',
    ].join('\n'))
}

var config = {
    ai1: 'ok',
    ai2: 'gr',
    xsize: 6,
    ysize: 6,
    rounds: 100,
    output: null,
    lateTrace: null,
    traceSafeMax: 5,
    swap: false,
    seed: null,
}
var args = process.argv.slice(2)

for (var i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '-1': case '--ai1': config.ai1 = args[++i]; break
        case '-2': case '--ai2': config.ai2 = args[++i]; break
        case '-x': case '--xsize': config.xsize = parseInt(args[++i]); break
        case '-y': case '--ysize': config.ysize = parseInt(args[++i]); break
        case '-n': case '--rounds': config.rounds = parseInt(args[++i]); break
        case '--seed': config.seed = args[++i]; break
        case '-o': case '--output': config.output = args[++i]; break
        case '--late-trace': config.lateTrace = args[++i]; break
        case '--trace-safe-max': config.traceSafeMax = parseInt(args[++i]); break
        case '-s': case '--swap': config.swap = true; break
        case '-h': case '--help': printHelp(); process.exit(0)
        default: console.error('未知参数: ' + args[i]); printHelp(); process.exit(1)
    }
}

if (!AI_MAP[config.ai1]) { console.error('未知AI: ' + config.ai1); process.exit(1) }
if (!AI_MAP[config.ai2]) { console.error('未知AI: ' + config.ai2); process.exit(1) }

// ============ 对战 ============

function setSandboxRandom(seed) {
    if (seed == null) {
        sandbox.Math.random = Math.random
        return null
    }
    var normalized = normalizeSeed(String(seed))
    sandbox.Math.random = createSeededRandom(normalized)
    return normalized
}

function appendLateTrace(record) {
    if (!config.lateTrace) return
    fs.appendFileSync(config.lateTrace, JSON.stringify(record) + '\n')
}

function aivsai(AI1Cls, AI2Cls, xsize, ysize, rounds, seedBase, traceMeta) {
    var wins = [0, 0]
    var games = []
    var unfinished = 0
    var totalMoves = 0
    for (var r = 0; r < rounds; r++) {
        var gameSeed = seedBase == null ? null : ((seedBase + r) >>> 0)
        setSandboxRandom(gameSeed)
        var game = new Game().init(xsize, ysize)
        var gd = new GameData().fromGame(game)
        var history = []
        var ai1 = new AI1Cls()
        var ai2 = new AI2Cls()
        ai1.playerId = 0
        ai2.playerId = 1

        while (gd.winnerId == null) {
            var ai = gd.playerId === 0 ? ai1 : ai2
            ai.gameData = gd
            var traceRecord = null
            if (config.lateTrace && gd.edgeCount[gd.EDGE_NOT] <= config.traceSafeMax) {
                traceRecord = {
                    set: traceMeta.set,
                    round: r,
                    seed: gameSeed,
                    ai1: traceMeta.ai1,
                    ai2: traceMeta.ai2,
                    ply: history.length,
                    player: gd.playerId,
                    score: [gd.player[0].score, gd.player[1].score],
                    edges: [
                        gd.edgeCount[gd.EDGE_NOW],
                        gd.edgeCount[gd.EDGE_NOT],
                        gd.edgeCount[gd.EDGE_WILL],
                    ],
                }
            }
            var whereStart = Date.now()
            var fallbackReason = null
            try {
                var where = ai.where()
            } catch(e) {
                fallbackReason = e.message
                console.error('第' + (r + 1) + '局 AI异常: ' + e.message + ' playerId:' + gd.playerId)
                // fallback: 随机走一步
                var edges = gd.getAllEdges(gd.EDGE_NOW)
                if (edges.length === 0) edges = gd.getAllEdges(gd.EDGE_NOT)
                if (edges.length === 0) edges = gd.getAllEdges(gd.EDGE_WILL)
                if (edges.length === 0) break
                var where = edges[0]
            }
            var whereMs = Date.now() - whereStart
            if (typeof where !== 'object' || where.x == null || where.y == null) {
                console.error('第' + (r + 1) + '局 AI返回非法着法:', where, 'playerId:', gd.playerId)
                break
            }
            if (traceRecord) {
                traceRecord.ms = whereMs
                traceRecord.move = [where.x, where.y]
                if (fallbackReason) traceRecord.fallbackReason = fallbackReason
                appendLateTrace(traceRecord)
            }
            history.push([where.x, where.y, gd.playerId])
            gd.putxy(where.x, where.y)
        }
        if (gd.winnerId != null) {
            wins[gd.winnerId]++
            totalMoves += history.length
            games.push({ winner: gd.winnerId, history: history, seed: gameSeed })
        } else {
            unfinished++
        }
    }
    return {
        wins: wins,
        games: games,
        unfinished: unfinished,
        averageMoves: games.length ? Math.round(totalMoves / games.length) : 0,
    }
}

// ============ 运行 ============

var ai1Info = AI_MAP[config.ai1]
var ai2Info = AI_MAP[config.ai2]
var seedBase = normalizeSeed(config.seed == null ? null : String(config.seed))

var results = []
if (config.lateTrace) {
    fs.writeFileSync(config.lateTrace, '')
}

// 正序
console.log(ai1Info.name + '(先手) vs ' + ai2Info.name + '(后手) ' + config.xsize + 'x' + config.ysize + ' ' + config.rounds + '局')
if (seedBase != null) console.log('随机种子: ' + seedBase)
var r1 = aivsai(
    ai1Info.cls,
    ai2Info.cls,
    config.xsize,
    config.ysize,
    config.rounds,
    seedBase,
    { set: 0, ai1: config.ai1, ai2: config.ai2 }
)
console.log('结果: ' + ai1Info.short + ' ' + r1.wins[0] + '胜 ' + ai2Info.short + ' ' + r1.wins[1] + '负')
if (r1.unfinished) console.log('未完成: ' + r1.unfinished + '局')
console.log('平均步数: ' + r1.averageMoves)
results.push({ ai1: config.ai1, ai2: config.ai2, wins: r1.wins, games: r1.games })

if (config.swap) {
    console.log('')
    console.log(ai2Info.name + '(先手) vs ' + ai1Info.name + '(后手) ' + config.xsize + 'x' + config.ysize + ' ' + config.rounds + '局')
    var swapSeedBase = seedBase == null ? null : ((seedBase + config.rounds) >>> 0)
    var r2 = aivsai(
        ai2Info.cls,
        ai1Info.cls,
        config.xsize,
        config.ysize,
        config.rounds,
        swapSeedBase,
        { set: 1, ai1: config.ai2, ai2: config.ai1 }
    )
    console.log('结果: ' + ai1Info.short + ' ' + r2.wins[1] + '胜 ' + ai2Info.short + ' ' + r2.wins[0] + '负')
    if (r2.unfinished) console.log('未完成: ' + r2.unfinished + '局')
    console.log('平均步数: ' + r2.averageMoves)
    results.push({ ai1: config.ai2, ai2: config.ai1, wins: r2.wins, games: r2.games })

    var total1 = r1.wins[0] + r2.wins[1]
    var total2 = r1.wins[1] + r2.wins[0]
    console.log('')
    console.log('综合 ' + (config.rounds * 2) + '局: ' + ai1Info.short + ' ' + total1 + '胜 ' + ai2Info.short + ' ' + total2 + '负 (' + Math.round(total1 / (config.rounds * 2) * 100) + '%)')
}
if (config.lateTrace) {
    console.log('晚盘trace已保存: ' + config.lateTrace)
}

// ============ 录像输出 ============

if (config.output) {
    var ext = path.extname(config.output).toLowerCase()
    if (ext === '.json') {
        writeJSON(config.output)
    } else if (ext === '.html') {
        writeHTML(config.output)
    } else {
        console.error('不支持的输出格式: ' + ext + ' (支持 .json .html)')
        process.exit(1)
    }
}

function writeJSON(filepath) {
    var data = {
        config: { ai1: config.ai1, ai2: config.ai2, xsize: config.xsize, ysize: config.ysize, rounds: config.rounds, swap: config.swap, seed: seedBase },
        results: results.map(function(r) {
            return {
                ai1: r.ai1, ai2: r.ai2,
                wins: r.wins,
                games: r.games,
            }
        }),
    }
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2))
    console.log('\n录像已保存: ' + filepath)
    console.log('浏览器控制台加载:')
    console.log('  var d=JSON.parse(fetch("' + path.basename(filepath) + '").then(r=>r.text()))')
    console.log('  var game=new Game().init(d.config.xsize,d.config.ysize); game.history=d.results[0].games[0].history')
    console.log('  new ReplayController().init(game,gameview).replay(null,200)')
}

function writeHTML(filepath) {
    var replayData = JSON.stringify({
        config: { ai1: config.ai1, ai2: config.ai2, xsize: config.xsize, ysize: config.ysize, seed: seedBase },
        results: results.map(function(r) {
            return { ai1: r.ai1, ai2: r.ai2, wins: r.wins, games: r.games }
        }),
    })

    // 读取源文件内联
    var inlineJS = srcFiles.map(function(f) {
        return fs.readFileSync(path.join(__dirname, f), 'utf8')
    }).join('\n')

    var html = [
        '<!DOCTYPE html>',
        '<html><head><meta charset="UTF-8"><title>点格棋录像</title>',
        '<style>',
        'body{font-family:monospace;margin:20px;background:#f9f9f9}',
        'select,input,button{font-family:monospace;font-size:1em;margin:4px}',
        '.gametable table{border-spacing:0;border-collapse:collapse}',
        '.gametable table td{border:none;padding:0;margin:0;width:20px;height:20px}',
        '.gametable table tr:nth-child(2n+1) td:nth-child(2n),',
        '.gametable table tr:nth-child(2n) td:nth-child(2n+1){background:#f6f8fa}',
        '.gametable table tr:nth-child(2n) td:nth-child(2n){background:#fff;width:48px;height:48px}',
        '.gametable table tr:nth-child(2n+1) td:nth-child(2n+1){background:#ccc}',
        '.gametable table tr:nth-child(2n+1) td:nth-child(2n):hover,',
        '.gametable table tr:nth-child(2n) td:nth-child(2n+1):hover{background:#efa}',
        '.gametable table tr:nth-child(2n) td:nth-child(2n):hover{background:#ffe}',
        '.gametable table tr:nth-child(2n+1) td:nth-child(2n+1):hover{background:#eeb}',
        '.gametable table td div{padding:0;margin:0}',
        '.gametable table tr:nth-child(2n+1) td:nth-child(2n) div{width:48px;height:20px}',
        '.gametable table tr:nth-child(2n) td:nth-child(2n+1) div{width:20px;height:48px}',
        '.gametable table tr:nth-child(2n) td:nth-child(2n) div{width:48px;height:48px}',
        '#gameinfo>div{display:inline-block;padding:4px 12px;margin:4px}',
        '.info-panel{margin:10px 0;padding:8px;background:#fff;border:1px solid #ddd;border-radius:4px}',
        '</style></head><body>',
        '',
        '<h2>点格棋录像</h2>',
        '<div class="info-panel" id="summary"></div>',
        '<div>',
        '  <select id="selectSet"></select>',
        '  <select id="selectGame"></select>',
        '  <button onclick="loadGame()">加载</button>',
        '</div>',
        '<div style="margin:8px 0">',
        '  <button onclick="rpBack()" id="btnBack">\<- 后退(←)</button>',
        '  <button onclick="rpToggle()" id="btnToggle">播放(Space)</button>',
        '  <button onclick="rpForward()" id="btnForward">前进(→) -\></button>',
        '  <input type="range" id="speed" min="20" max="500" value="200" style="width:100px">',
        '  <span id="stepInfo">0/0</span>',
        '  <span style="color:#999">[ ]调速 ↑↓换局</span>',
        '</div>',
        '',
        '<div class="gametable"><table><tbody id="gamemap">',
        '<tr><td>aaa</td><td>bbb</td><td>ccc</td></tr>',
        '</tbody></table></div>',
        '<div id="gameinfo"><div><p>先手 <span>0</span> <span>-</span></p></div><div><p>后手 <span>0</span> <span></span></p></div></div>',
        '<div id="gametip"></div>',
        '<input type="hidden" id="gx" value="6">',
        '<input type="hidden" id="gy" value="6">',
        '',
        '<script>',
        inlineJS,
        '</script>',
        '<script>',
        'var REPLAY=' + replayData + ';',
        'var AI_MAP_REPLAY=' + JSON.stringify(Object.keys(AI_MAP).reduce(function(o, k) { o[k] = AI_MAP[k].name; return o }, {})) + ';',
        '',
        '// 填充摘要',
        'var summaryEl=document.getElementById("summary")',
        'var html=""',
        'REPLAY.results.forEach(function(r,i){',
        '  html+="第"+(i+1)+"轮: "+AI_MAP_REPLAY[r.ai1]+"(先手) vs "+AI_MAP_REPLAY[r.ai2]+"(后手) "+r.wins[0]+":"+r.wins[1]+" &nbsp;"',
        '})',
        'summaryEl.innerHTML=html',
        '',
        '// 填充选择器',
        'var selectSet=document.getElementById("selectSet")',
        'var selectGame=document.getElementById("selectGame")',
        'REPLAY.results.forEach(function(r,i){',
        '  var opt=document.createElement("option")',
        '  opt.value=i;opt.text="第"+(i+1)+"轮 ("+AI_MAP_REPLAY[r.ai1]+" vs "+AI_MAP_REPLAY[r.ai2]+")"',
        '  selectSet.appendChild(opt)',
        '})',
        'function updateGameSelect(){',
        '  selectGame.innerHTML=""',
        '  var games=REPLAY.results[selectSet.value].games',
        '  for(var i=0;i<games.length;i++){',
        '    var opt=document.createElement("option")',
        '    opt.value=i;opt.text="第"+(i+1)+"局 (winner:"+(games[i].winner===0?"先手":"后手")+")"',
        '    selectGame.appendChild(opt)',
        '  }',
        '}',
        'selectSet.onchange=updateGameSelect',
        'updateGameSelect()',
        '',
        '// ========== 逐步重放引擎 ==========',
        'var rpHistory=null, rpStep=0, rpTimer=null, rpWinner=-1',
        'var rpGame=null',
        '',
        'function loadGame(){',
        '  rpStop()',
        '  var setIdx=~~selectSet.value',
        '  var gameIdx=~~selectGame.value',
        '  var g=REPLAY.results[setIdx].games[gameIdx]',
        '  rpHistory=g.history',
        '  rpWinner=g.winner',
        '  rpStep=0',
        '  rebuildBoard(0)',
        '}',
        '',
        '// 从空盘重放到第step步',
        'function rebuildBoard(step){',
        '  var xsize=REPLAY.config.xsize,ysize=REPLAY.config.ysize',
        '  rpGame=new Game().init(xsize,ysize)',
        '  gameview.init(rpGame,"hasInited")',
        '  rpGame.win.pop()',
        '  rpGame.lock=1',
        '  for(var i=0;i<step;i++){',
        '    rpGame.lock=0',
        '    rpGame.putxy(rpHistory[i][0],rpHistory[i][1])',
        '  }',
        '  rpGame.lock=1',
        '  rpStep=step',
        '  updateStepInfo()',
        '}',
        '',
        'function updateStepInfo(){',
        '  document.getElementById("stepInfo").textContent=rpStep+"/"+(rpHistory?rpHistory.length:0)',
        '  var btnToggle=document.getElementById("btnToggle")',
        '  btnToggle.textContent=rpTimer?"暂停":"播放"',
        '}',
        '',
        '// 播放/暂停',
        'function rpToggle(){',
        '  if(rpTimer){rpStop();return}',
        '  if(!rpHistory)return',
        '  if(rpStep>=rpHistory.length)return',
        '  rpTimer=setInterval(function(){',
        '    if(rpStep>=rpHistory.length){rpStop();showWinner();return}',
        '    rpGame.lock=0',
        '    rpGame.putxy(rpHistory[rpStep][0],rpHistory[rpStep][1])',
        '    rpGame.lock=1',
        '    rpStep++',
        '    updateStepInfo()',
        '  },~~document.getElementById("speed").value)',
        '  updateStepInfo()',
        '}',
        '',
        'function rpStop(){',
        '  if(rpTimer){clearInterval(rpTimer);rpTimer=null}',
        '  updateStepInfo()',
        '}',
        '',
        '// 前进一步',
        'function rpForward(){',
        '  rpStop()',
        '  if(!rpHistory||rpStep>=rpHistory.length)return',
        '  rpGame.lock=0',
        '  rpGame.putxy(rpHistory[rpStep][0],rpHistory[rpStep][1])',
        '  rpGame.lock=1',
        '  rpStep++',
        '  updateStepInfo()',
        '  if(rpStep>=rpHistory.length)showWinner()',
        '}',
        '',
        '// 后退一步',
        'function rpBack(){',
        '  rpStop()',
        '  if(!rpHistory||rpStep<=0)return',
        '  rebuildBoard(rpStep-1)',
        '}',
        '',
        'function showWinner(){',
        '  gameview.gameinfo.children[rpWinner].style.background=gameview.playerColor[rpWinner]',
        '  gameview.gametip.innerText=(rpWinner===0?"先手":"后手")+" 获胜"',
        '}',
        '',
        '// 上一局/下一局',
        'function prevGame(){',
        '  if(selectGame.selectedIndex>0){selectGame.selectedIndex--;loadGame()}',
        '}',
        'function nextGame(){',
        '  if(selectGame.selectedIndex<selectGame.options.length-1){selectGame.selectedIndex++;loadGame()}',
        '}',
        '',
        '// 减速/加速',
        'function slower(){',
        '  var el=document.getElementById("speed");el.value=Math.min(500,~~el.value+40)',
        '}',
        'function faster(){',
        '  var el=document.getElementById("speed");el.value=Math.max(20,~~el.value-40)',
        '}',
        '',
        '// 快捷键',
        'document.onkeydown=function(e){',
        '  if(e.target.tagName==="INPUT"||e.target.tagName==="SELECT")return',
        '  switch(e.key){',
        '    case"ArrowLeft":rpBack();e.preventDefault();break',
        '    case"ArrowRight":rpForward();e.preventDefault();break',
        '    case"ArrowUp":prevGame();e.preventDefault();break',
        '    case"ArrowDown":nextGame();e.preventDefault();break',
        '    case" ":rpToggle();e.preventDefault();break',
        '    case"[":faster();break',
        '    case"]":slower();break',
        '  }',
        '}',
        '</script>',
        '</body></html>',
    ].join('\n')

    fs.writeFileSync(filepath, html)
    console.log('\n录像已保存: ' + filepath)
    console.log('直接在浏览器中打开即可观看')
}
