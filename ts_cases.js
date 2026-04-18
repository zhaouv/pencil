var vm = require('vm')
var fs = require('fs')
var path = require('path')

var sandbox = {
    console: console,
    setTimeout: setTimeout,
    setInterval: setInterval,
    clearTimeout: clearTimeout,
    clearInterval: clearInterval,
}
vm.createContext(sandbox)

var srcFiles = ['game.js', 'gamedata.js', 'player.js', 'treeSearch.js']
for (var ii = 0; ii < srcFiles.length; ii++) {
    vm.runInContext(
        fs.readFileSync(path.join(__dirname, srcFiles[ii]), 'utf8'),
        sandbox
    )
}

var Game = sandbox.Game
var GameData = sandbox.GameData
var TreeSearchAI = sandbox.TreeSearchAI

var CASES = [
    {
        name: 'control_swing_layout',
        xsize: 4,
        ysize: 4,
        history: [
            [1, 2, 0],
            [1, 0, 1],
            [5, 0, 0],
            [0, 5, 1],
        ],
        expect: {
            phase: 'layout',
            minControlSwing: 2,
            minSafeEdges: 6,
        },
    },
    {
        name: 'multi_score_regions',
        xsize: 4,
        ysize: 4,
        history: [
            [3, 2, 0],
            [0, 1, 1],
            [5, 8, 0],
            [7, 0, 1],
            [4, 7, 0],
            [5, 6, 1],
            [7, 8, 0],
            [5, 2, 1],
            [0, 5, 0],
            [1, 0, 1],
            [4, 5, 0],
            [4, 1, 1],
            [6, 3, 0],
            [8, 7, 1],
            [7, 2, 0],
            [3, 0, 1],
        ],
        expect: {
            phase: 'transition',
            minScoreRegions: 2,
            minScoreEdges: 1,
        },
    },
    {
        name: 'single_large_chain_open',
        xsize: 4,
        ysize: 4,
        history: [
            [3, 8, 0],
            [8, 1, 1],
            [5, 2, 0],
            [3, 0, 1],
            [5, 6, 0],
            [8, 7, 1],
            [2, 7, 0],
            [1, 8, 1],
            [3, 6, 0],
            [8, 5, 1],
            [4, 5, 0],
            [7, 2, 1],
            [7, 8, 0],
            [7, 6, 1],
            [6, 7, 0],
            [5, 0, 0],
            [6, 1, 1],
            [4, 3, 0],
            [7, 0, 1],
            [7, 4, 1],
            [3, 4, 0],
            [2, 3, 1],
            [3, 2, 0],
            [6, 5, 0],
            [8, 3, 0],
            [4, 7, 1],
            [6, 3, 1],
            [0, 3, 1],
            [1, 0, 0],
            [5, 8, 1],
            [4, 1, 1],
            [2, 1, 1],
            [1, 6, 1],
            [2, 5, 0],
            [0, 7, 0],
            [5, 4, 0],
        ],
        expect: {
            phase: 'endgame',
            largeClosedNum: 1,
            exactSign: 'loss',
        },
    },
    {
        name: 'pure_small_endgame',
        xsize: 3,
        ysize: 3,
        history: [
            [3, 0, 0],
            [5, 4, 1],
            [6, 3, 0],
            [4, 1, 1],
            [1, 4, 0],
            [2, 5, 1],
            [1, 0, 0],
            [6, 5, 1],
            [3, 6, 0],
            [1, 2, 1],
            [6, 1, 0],
        ],
        expect: {
            phase: 'endgame',
            largeClosedNum: 0,
            minSmallClosedNum: 2,
            exactRequired: true,
        },
    },
    {
        name: 'ring4_sacrifice_choice',
        xsize: 6,
        ysize: 6,
        history: [
            [1, 0, 0],
            [11, 12, 1],
            [0, 1, 0],
            [0, 5, 1],
            [3, 0, 0],
            [11, 0, 1],
            [4, 1, 0],
            [7, 0, 1],
            [5, 0, 0],
            [8, 3, 1],
            [9, 0, 0],
            [0, 11, 1],
            [12, 1, 0],
            [2, 9, 1],
            [8, 1, 0],
            [9, 10, 1],
            [1, 4, 0],
            [3, 4, 1],
            [12, 3, 0],
            [8, 5, 1],
            [4, 5, 0],
            [5, 8, 1],
            [12, 5, 0],
            [3, 8, 1],
            [0, 7, 0],
            [6, 7, 1],
            [10, 7, 0],
            [6, 11, 1],
            [6, 5, 0],
            [1, 10, 1],
            [7, 8, 0],
            [9, 8, 1],
            [6, 3, 0],
            [11, 10, 1],
            [12, 9, 0],
            [8, 11, 1],
            [10, 5, 0],
            [12, 7, 1],
            [10, 3, 0],
            [0, 3, 1],
            [4, 3, 0],
            [4, 11, 1],
            [2, 7, 0],
            [6, 9, 1],
            [3, 12, 0],
            [10, 11, 1],
            [9, 12, 0],
            [12, 11, 0],
        ],
        expect: {
            phase: 'endgame',
            largeClosedNum: 3,
            bestMove: [2, 1],
        },
    },
    {
        name: 'exact_root_sacrifice_choice',
        xsize: 6,
        ysize: 6,
        history: [
            [1, 0, 0],
            [2, 3, 1],
            [0, 1, 0],
            [4, 5, 1],
            [0, 3, 0],
            [2, 7, 1],
            [3, 4, 0],
            [10, 9, 1],
            [3, 0, 0],
            [11, 0, 1],
            [4, 7, 0],
            [12, 5, 1],
            [5, 0, 0],
            [9, 10, 1],
            [7, 0, 0],
            [1, 8, 1],
            [9, 0, 0],
            [4, 1, 1],
            [6, 3, 0],
            [12, 9, 1],
            [10, 3, 0],
            [11, 4, 1],
            [0, 5, 0],
            [12, 7, 1],
            [8, 5, 0],
            [3, 10, 1],
            [8, 7, 0],
            [12, 11, 1],
            [6, 9, 0],
            [9, 4, 1],
            [0, 9, 0],
            [11, 12, 1],
            [0, 11, 0],
            [3, 12, 1],
            [5, 4, 0],
            [6, 7, 1],
            [7, 4, 0],
            [8, 11, 1],
            [7, 10, 0],
            [4, 9, 1],
            [10, 7, 0],
            [10, 1, 1],
            [1, 12, 0],
            [5, 12, 1],
        ],
        expect: {
            phase: 'endgame',
            bestMove: [8, 1],
        },
    },
    {
        name: 'late_safe_window_choice',
        xsize: 6,
        ysize: 6,
        history: [
            [1, 0, 0],
            [2, 3, 1],
            [0, 1, 0],
            [3, 0, 1],
            [5, 0, 0],
            [7, 4, 1],
            [7, 0, 0],
            [7, 12, 1],
            [8, 1, 0],
            [8, 9, 1],
            [11, 0, 0],
            [5, 8, 1],
            [10, 3, 0],
            [9, 10, 1],
            [9, 0, 0],
            [9, 12, 1],
            [12, 1, 0],
            [12, 7, 1],
            [5, 4, 0],
            [5, 2, 1],
            [3, 2, 0],
            [2, 7, 1],
            [0, 5, 0],
            [8, 5, 1],
            [10, 5, 0],
            [1, 8, 1],
            [0, 3, 0],
            [2, 9, 1],
            [2, 5, 0],
            [6, 11, 1],
            [8, 7, 0],
            [5, 6, 1],
            [3, 6, 0],
            [5, 12, 1],
            [8, 3, 0],
            [4, 9, 1],
            [7, 8, 0],
            [12, 11, 1],
            [10, 7, 0],
            [1, 12, 1],
        ],
        expect: {
            phase: 'transition',
            largeClosedNum: 3,
            bestMove: [12, 3],
            searchDepth: 3,
        },
    },
    {
        name: 'small_chain_sacrifice_middle_preference',
        xsize: 6,
        ysize: 6,
        history: [
            [6, 5, 0],
            [1, 0, 1],
            [6, 1, 0],
            [5, 0, 1],
            [8, 3, 0],
            [3, 0, 1],
            [9, 4, 0],
            [9, 0, 1],
            [3, 6, 0],
            [3, 2, 1],
            [12, 3, 0],
            [11, 0, 1],
            [8, 9, 0],
            [11, 4, 1],
            [7, 6, 0],
            [7, 0, 1],
            [2, 9, 0],
            [10, 5, 1],
            [5, 8, 0],
            [0, 3, 1],
            [4, 3, 0],
            [1, 4, 1],
            [4, 5, 0],
            [0, 1, 1],
            [4, 11, 0],
            [0, 5, 1],
            [12, 9, 0],
            [10, 1, 1],
            [8, 11, 0],
            [6, 3, 1],
            [9, 8, 0],
            [10, 7, 1],
            [3, 10, 0],
            [6, 7, 1],
            [1, 8, 0],
            [2, 7, 1],
            [6, 9, 0],
            [6, 11, 1],
            [10, 11, 0],
            [11, 8, 1],
            [12, 11, 0],
            [0, 11, 1],
            [2, 11, 0],
            [3, 12, 1],
        ],
        expect: {
            phase: 'endgame',
            exactRequired: true,
            exactSign: 'loss',
            bestMove: [11, 6],
            searchDepth: 3,
        },
    },
    {
        name: 'score_then_small_chain_middle_route',
        xsize: 6,
        ysize: 6,
        history: [
            [6, 5, 0],
            [1, 0, 1],
            [6, 1, 0],
            [5, 0, 1],
            [8, 3, 0],
            [3, 0, 1],
            [9, 4, 0],
            [9, 0, 1],
            [3, 6, 0],
            [3, 2, 1],
            [12, 3, 0],
            [11, 0, 1],
            [8, 9, 0],
            [11, 4, 1],
            [7, 6, 0],
            [7, 0, 1],
            [2, 9, 0],
            [10, 5, 1],
            [5, 8, 0],
            [0, 3, 1],
            [4, 3, 0],
            [1, 4, 1],
            [4, 5, 0],
            [0, 1, 1],
            [4, 11, 0],
            [0, 5, 1],
            [12, 9, 0],
            [10, 1, 1],
            [8, 11, 0],
            [6, 3, 1],
            [9, 8, 0],
            [10, 7, 1],
            [3, 10, 0],
            [6, 7, 1],
            [1, 8, 0],
            [2, 7, 1],
            [6, 9, 0],
            [6, 11, 1],
            [10, 11, 0],
            [11, 8, 1],
            [12, 11, 0],
            [0, 11, 1],
            [2, 11, 0],
        ],
        expect: {
            phase: 'endgame',
            bestMove: [3, 12],
            bestRouteMoves: [[3, 12], [11, 6]],
            searchDepth: 3,
        },
    },
    {
        name: 'exact_score_prefix_control_only',
        xsize: 6,
        ysize: 6,
        history: [
            [1, 0, 0],
            [4, 5, 1],
            [0, 1, 0],
            [5, 6, 1],
            [3, 0, 0],
            [11, 4, 1],
            [4, 1, 0],
            [12, 11, 1],
            [5, 0, 0],
            [12, 1, 1],
            [11, 0, 0],
            [3, 6, 1],
            [12, 5, 0],
            [8, 3, 1],
            [7, 0, 0],
            [7, 2, 1],
            [9, 0, 0],
            [4, 11, 1],
            [0, 3, 0],
            [2, 3, 1],
            [4, 3, 0],
            [7, 6, 1],
            [0, 5, 0],
            [7, 10, 1],
            [1, 6, 0],
            [1, 12, 1],
            [9, 6, 0],
            [7, 8, 1],
            [12, 3, 0],
            [5, 12, 1],
            [0, 7, 0],
            [9, 2, 1],
            [12, 7, 0],
            [3, 8, 1],
            [10, 7, 0],
            [11, 10, 1],
            [8, 11, 0],
            [2, 11, 1],
            [10, 9, 0],
            [0, 9, 1],
            [8, 5, 0],
            [9, 12, 1],
            [5, 8, 0],
            [2, 9, 1],
            [8, 9, 0],
            [6, 9, 1],
            [6, 5, 1],
            [5, 4, 0],
            [7, 4, 0],
            [6, 3, 0],
            [5, 2, 0],
            [6, 1, 0],
            [8, 1, 0],
            [10, 1, 0],
            [11, 2, 0],
            [10, 3, 0],
            [9, 4, 0],
            [10, 5, 0],
            [11, 6, 0],
        ],
        expect: {
            phase: 'endgame',
            minScoreEdges: 1,
            normalPrefixTags: ['score-all', 'score-stop', 'score-control'],
            exactPrefixTags: ['score-all', 'score-control'],
        },
    },
    {
        name: 'boundary_chain_ring_score_prefix',
        xsize: 6,
        ysize: 6,
        history: [
            [1, 0, 0],
            [2, 3, 1],
            [0, 1, 0],
            [4, 5, 1],
            [0, 3, 0],
            [2, 7, 1],
            [3, 4, 0],
            [10, 9, 1],
            [3, 0, 0],
            [11, 0, 1],
            [4, 7, 0],
            [12, 5, 1],
            [5, 0, 0],
            [9, 10, 1],
            [7, 0, 0],
            [1, 8, 1],
            [9, 0, 0],
            [4, 1, 1],
            [6, 3, 0],
            [12, 9, 1],
            [10, 3, 0],
            [11, 4, 1],
            [0, 5, 0],
            [12, 7, 1],
            [8, 5, 0],
            [3, 10, 1],
            [8, 7, 0],
            [12, 11, 1],
            [6, 9, 0],
            [9, 4, 1],
            [0, 9, 0],
            [11, 12, 1],
            [0, 11, 0],
            [3, 12, 1],
            [5, 4, 0],
            [6, 7, 1],
            [7, 4, 0],
            [8, 11, 1],
            [7, 10, 0],
            [4, 9, 1],
            [10, 7, 0],
            [10, 1, 1],
            [1, 12, 0],
            [5, 12, 1],
            [7, 2, 0],
            [8, 3, 1],
            [9, 2, 1],
            [8, 1, 1],
            [6, 1, 1],
            [5, 2, 1],
            [4, 3, 1],
            [2, 1, 1],
        ],
        expect: {
            phase: 'endgame',
            minScoreEdges: 1,
            normalPrefixTags: ['score-all', 'score-stop'],
            exactPrefixTags: ['score-all', 'score-stop'],
            exactRequired: true,
            exactSign: 'loss',
        },
    },
    {
        name: 'live_ring8_score_prefix',
        xsize: 6,
        ysize: 6,
        buildWith: 'gamedata',
        history: [
            [1, 0, 0],
            [2, 3, 1],
            [0, 1, 0],
            [7, 8, 1],
            [0, 3, 0],
            [8, 7, 1],
            [4, 3, 0],
            [0, 11, 1],
            [3, 0, 0],
            [11, 0, 1],
            [10, 1, 0],
            [0, 9, 1],
            [5, 0, 0],
            [8, 1, 1],
            [8, 3, 0],
            [10, 5, 1],
            [12, 3, 0],
            [9, 8, 1],
            [0, 5, 0],
            [6, 11, 1],
            [4, 5, 0],
            [8, 9, 1],
            [0, 7, 0],
            [4, 7, 1],
            [12, 7, 0],
            [3, 8, 1],
            [12, 9, 0],
            [11, 10, 1],
            [3, 12, 0],
            [7, 12, 1],
            [8, 5, 0],
            [6, 5, 1],
            [9, 12, 0],
            [2, 5, 1],
            [7, 0, 0],
            [1, 8, 1],
            [4, 1, 0],
            [2, 11, 1],
            [11, 4, 0],
            [5, 8, 1],
            [5, 10, 0],
            [10, 11, 1],
            [6, 3, 0],
            [9, 0, 1],
            [9, 2, 0],
            [2, 1, 0],
        ],
        expect: {
            phase: 'endgame',
            minScoreEdges: 1,
            normalPrefixTags: ['score-all', 'score-stop', 'score-control'],
            exactPrefixTags: ['score-all', 'score-control'],
            exactRequired: true,
            exactSign: 'win',
        },
    },
]

function assertCase(condition, message) {
    if (!condition) {
        throw new Error(message)
    }
}

function buildGameData(caseDef) {
    if (caseDef.buildWith === 'gamedata') {
        var liveGame = new Game().init(caseDef.xsize, caseDef.ysize)
        var gd = new GameData().fromGame(liveGame)
        for (var jj = 0; jj < caseDef.history.length; jj++) {
            var liveMove = caseDef.history[jj]
            gd.putxy(liveMove[0], liveMove[1])
        }
        return gd
    }
    var game = new Game().init(caseDef.xsize, caseDef.ysize)
    game.lock = 0
    for (var ii = 0; ii < caseDef.history.length; ii++) {
        var move = caseDef.history[ii]
        var result = game.putxy(move[0], move[1])
        if (result === 'Invalid click' || result === 'lock') {
            throw new Error(caseDef.name + ' has invalid history at step ' + ii)
        }
    }
    return new GameData().fromGame(game)
}

function signLabel(value) {
    if (value > 0) return 'win'
    if (value < 0) return 'loss'
    return 'draw'
}

var failed = false

for (var cc = 0; cc < CASES.length; cc++) {
    var caseDef = CASES[cc]
    try {
        var gd = buildGameData(caseDef)
        var stats = gd.getRegionStats()
        var features = gd.getEvalFeatures()
        var explicitControlSwing = null
        if (caseDef.expect.minControlSwing != null) {
            explicitControlSwing = gd.getControlSwingStructures().length
        }
        var ai = new TreeSearchAI()
        ai.playerId = gd.playerId
        ai.exactEndgameCache = {}
        var exact = null
        var best = null
        var normalPrefixes = null
        var exactPrefixes = null
        if (!gd.edgeCount[gd.EDGE_NOT]) {
            exact = ai.solveExactEndgame(gd)
        }
        if (caseDef.expect.normalPrefixTags || caseDef.expect.exactPrefixTags) {
            normalPrefixes = ai.generateScorePrefixes(gd)
            exactPrefixes = ai.generateExactScorePrefixes(gd)
        }
        if (caseDef.expect.bestMove) {
            ai.transposition = {}
            ai.historyTable = {}
            ai.searchStats = { node: 0, cacheHit: 0, cut: 0, ttCut: 0 }
            ai.searchNodeBudget = 0
            ai.searchDeadline = 0
            ai.abortToken = {}
            ai.exactEndgameCache = {}
            best = ai.searchRoot(gd, caseDef.expect.searchDepth || 3)
        }

        if (caseDef.expect.phase) {
            assertCase(
                features.phase === caseDef.expect.phase,
                caseDef.name + ' phase mismatch: ' + features.phase
            )
        }
        if (caseDef.expect.minControlSwing != null) {
            assertCase(
                explicitControlSwing >= caseDef.expect.minControlSwing,
                caseDef.name + ' controlSwingCount too small: ' + explicitControlSwing
            )
        }
        if (caseDef.expect.minSafeEdges != null) {
            assertCase(
                features.safeEdgeCount >= caseDef.expect.minSafeEdges,
                caseDef.name + ' safeEdgeCount too small: ' + features.safeEdgeCount
            )
        }
        if (caseDef.expect.minScoreRegions != null) {
            assertCase(
                features.activeScoreRegionNum >= caseDef.expect.minScoreRegions,
                caseDef.name + ' activeScoreRegionNum too small: ' + features.activeScoreRegionNum
            )
        }
        if (caseDef.expect.minScoreEdges != null) {
            assertCase(
                features.scoreEdgeCount >= caseDef.expect.minScoreEdges,
                caseDef.name + ' scoreEdgeCount too small: ' + features.scoreEdgeCount
            )
        }
        if (caseDef.expect.largeClosedNum != null) {
            assertCase(
                stats.largeClosedNum === caseDef.expect.largeClosedNum,
                caseDef.name + ' largeClosedNum mismatch: ' + stats.largeClosedNum
            )
        }
        if (caseDef.expect.minSmallClosedNum != null) {
            assertCase(
                stats.smallClosedNum >= caseDef.expect.minSmallClosedNum,
                caseDef.name + ' smallClosedNum too small: ' + stats.smallClosedNum
            )
        }
        if (caseDef.expect.exactRequired) {
            assertCase(exact != null, caseDef.name + ' exact endgame result missing')
        }
        if (caseDef.expect.exactSign) {
            assertCase(
                signLabel(exact) === caseDef.expect.exactSign,
                caseDef.name + ' exact sign mismatch: ' + signLabel(exact)
            )
        }
        if (caseDef.expect.normalPrefixTags) {
            assertCase(
                JSON.stringify(normalPrefixes.map(function(prefix) { return prefix.tag })) ===
                    JSON.stringify(caseDef.expect.normalPrefixTags),
                caseDef.name + ' normal prefix tags mismatch: ' +
                    JSON.stringify(normalPrefixes.map(function(prefix) { return prefix.tag }))
            )
        }
        if (caseDef.expect.exactPrefixTags) {
            assertCase(
                JSON.stringify(exactPrefixes.map(function(prefix) { return prefix.tag })) ===
                    JSON.stringify(caseDef.expect.exactPrefixTags),
                caseDef.name + ' exact prefix tags mismatch: ' +
                    JSON.stringify(exactPrefixes.map(function(prefix) { return prefix.tag }))
            )
        }
        if (caseDef.expect.bestMove) {
            assertCase(
                best && best.route && best.route.moves && best.route.moves.length,
                caseDef.name + ' best route missing'
            )
            assertCase(
                best.route.moves[0].x === caseDef.expect.bestMove[0] &&
                    best.route.moves[0].y === caseDef.expect.bestMove[1],
                caseDef.name + ' best move mismatch: ' +
                    [best.route.moves[0].x, best.route.moves[0].y].join(',')
            )
        }
        if (caseDef.expect.bestRouteMoves) {
            assertCase(
                best && best.route && best.route.moves &&
                    best.route.moves.length >= caseDef.expect.bestRouteMoves.length,
                caseDef.name + ' best route too short'
            )
            for (var mm = 0; mm < caseDef.expect.bestRouteMoves.length; mm++) {
                assertCase(
                    best.route.moves[mm].x === caseDef.expect.bestRouteMoves[mm][0] &&
                        best.route.moves[mm].y === caseDef.expect.bestRouteMoves[mm][1],
                    caseDef.name + ' best route mismatch at step ' + mm + ': ' +
                        [best.route.moves[mm].x, best.route.moves[mm].y].join(',')
                )
            }
        }

        console.log(
            [
                caseDef.name,
                'phase=' + features.phase,
                'score=' + gd.player[0].score + ':' + gd.player[1].score,
                'edges=' + features.scoreEdgeCount + '/' + features.safeEdgeCount + '/' + features.sacrificeEdgeCount,
                'closed=' + stats.smallClosedNum + '/' + stats.largeClosedNum,
                'control=' + (explicitControlSwing != null ? explicitControlSwing : features.controlSwingCount),
                exact == null ? null : 'exact=' + signLabel(exact),
                normalPrefixes == null ? null : 'prefix=' + normalPrefixes.length + '/' + exactPrefixes.length,
                best == null ? null : 'best=' + best.route.moves[0].x + ',' + best.route.moves[0].y,
            ].filter(Boolean).join(' ')
        )
    } catch (e) {
        failed = true
        console.error(caseDef.name + ' failed: ' + e.message)
    }
}

if (failed) {
    process.exit(1)
}

console.log('ts cases ok')
