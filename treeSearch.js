
////////////////// TreeSearchAI //////////////////
TreeSearchAI=function(){
    GreedyRandomAI.call(this)
    return this
}
TreeSearchAI.prototype = Object.create(GreedyRandomAI.prototype)
TreeSearchAI.prototype.constructor = TreeSearchAI

TreeSearchAI.prototype.SEARCH_DEPTH=3
TreeSearchAI.prototype.QUIESCENCE_DEPTH=10
TreeSearchAI.prototype.ENDGAME_DEPTH=16
TreeSearchAI.prototype.ENDGAME_SAFE_EDGE_THRESHOLD=6
TreeSearchAI.prototype.EXACT_SAFE_EDGE_LIMIT=5
TreeSearchAI.prototype.MAX_SCORE=100000000
TreeSearchAI.prototype.SAFE_ROUTE_LIMIT=8
TreeSearchAI.prototype.SACRIFICE_ROUTE_LIMIT=6
TreeSearchAI.prototype.SCORE_ROUTE_LIMIT=12
TreeSearchAI.prototype.TURN_END_ROUTE_LIMIT=4
TreeSearchAI.prototype.IRRELEVANT_SKIP_LIMIT=12
TreeSearchAI.prototype.OK_ENDGAME_ROUTE_BONUS=2400
TreeSearchAI.prototype.TIME_BUDGET_MS=0
TreeSearchAI.prototype.NODE_BUDGET=0

TreeSearchAI.prototype.where = function(){
    var boardKey=this.gameData.getBoardKey()
    if(this.routePlan && this.routePlan.length && this.routePlan[0].key===boardKey){
        return this.routePlan.shift().move
    }

    var maxDepth=this.search_depth!=undefined?this.search_depth:this.SEARCH_DEPTH
    var timeBudgetMs=this.timeBudgetMs!=undefined?this.timeBudgetMs:this.TIME_BUDGET_MS
    var nodeBudget=this.nodeBudget!=undefined?this.nodeBudget:this.NODE_BUDGET
    this.routePlan=[]
    this.transposition={}
    this.historyTable={}
    this.exactEndgameCache={}
    this.abortToken={}
    this.searchDeadline=timeBudgetMs>0?Date.now()+timeBudgetMs:0
    this.searchNodeBudget=nodeBudget>0?nodeBudget:0
    this.searchStats={
        node:0,
        cacheHit:0,
        cut:0,
        ttCut:0,
        completedDepth:0,
        aborted:false,
    }

    var best=null
    for(var depth=1;depth<=maxDepth;depth++){
        this.searchStats.iterationDepth=depth
        try{
            var current=this.searchRoot(this.gameData,depth)
            if(current && current.route){
                best=current
                this.searchStats.completedDepth=depth
            }
        } catch(e){
            if(e!==this.abortToken)throw e
            this.searchStats.aborted=true
            break
        }
    }
    this.lastSearchStats=this.searchStats
    if(best && best.route && best.route.moves && best.route.moves.length){
        this.routePlan=this.buildRoutePlan(this.gameData,best.route.moves)
        if(this.routePlan.length && this.routePlan[0].key===boardKey){
            return this.routePlan.shift().move
        }
    }
    return this.getFallbackWhere(this.gameData)
}

TreeSearchAI.prototype.buildRoutePlan = function(gameData, moves){
    if(!this.isValidRouteMoves(moves))return []
    var current=gameData.clone()
    var plan=[]
    for(var ii=0;ii<moves.length;ii++){
        var move=moves[ii]
        plan.push({
            key:current.getBoardKey(),
            move:{'x':move.x,'y':move.y},
        })
        current.putxy(move.x,move.y)
        if(current.winnerId!=null)break
    }
    return plan
}

TreeSearchAI.prototype.isValidMove = function(move){
    return !!move && move.x!=null && move.y!=null
}

TreeSearchAI.prototype.isValidRouteMoves = function(moves){
    if(!moves || !moves.length)return false
    for(var ii=0;ii<moves.length;ii++){
        var move=moves[ii]
        if(!this.isValidMove(move))return false
    }
    return true
}

TreeSearchAI.prototype.checkSearchAbort = function(){
    if(this.searchNodeBudget && this.searchStats.node>=this.searchNodeBudget){
        this.searchStats.abortReason='node'
        throw this.abortToken
    }
    if(this.searchDeadline && Date.now()>this.searchDeadline){
        this.searchStats.abortReason='time'
        throw this.abortToken
    }
}

TreeSearchAI.prototype.getTranspositionEntry = function(prefix, gameData){
    return this.transposition[prefix+'|'+gameData.getBoardKey()]
}

TreeSearchAI.prototype.lookupTransposition = function(prefix, gameData, depth, alpha, beta){
    var entry=this.getTranspositionEntry(prefix,gameData)
    if(!entry || entry.depth<depth){
        return {
            alpha:alpha,
            beta:beta,
            entry:entry||null,
        }
    }
    this.searchStats.cacheHit++
    if(entry.flag==='exact'){
        return {
            hit:true,
            value:entry.value,
            alpha:alpha,
            beta:beta,
            entry:entry,
        }
    }
    if(entry.flag==='lower' && entry.value>alpha)alpha=entry.value
    if(entry.flag==='upper' && entry.value<beta)beta=entry.value
    if(alpha>=beta){
        this.searchStats.ttCut++
        return {
            hit:true,
            value:entry.value,
            alpha:alpha,
            beta:beta,
            entry:entry,
        }
    }
    return {
        alpha:alpha,
        beta:beta,
        entry:entry,
    }
}

TreeSearchAI.prototype.storeTransposition = function(prefix, gameData, depth, value, alphaOrig, betaOrig, bestRoute){
    var flag='exact'
    if(value<=alphaOrig){
        flag='upper'
    } else if(value>=betaOrig){
        flag='lower'
    }
    this.transposition[prefix+'|'+gameData.getBoardKey()]={
        depth:depth,
        value:value,
        flag:flag,
        bestStateKey:bestRoute?bestRoute.stateKey:null,
    }
}

TreeSearchAI.prototype.orderRoutes = function(routes, ttEntry, maximizing){
    var historyTable=this.historyTable||{}
    var bestStateKey=ttEntry && ttEntry.bestStateKey
    maximizing=maximizing!==false
    return routes.slice().sort(function(a,b){
        var att=bestStateKey && a.stateKey===bestStateKey?1:0
        var btt=bestStateKey && b.stateKey===bestStateKey?1:0
        if(att!==btt)return btt-att
        var ah=historyTable[a.stateKey]||0
        var bh=historyTable[b.stateKey]||0
        if(ah!==bh)return bh-ah
        return maximizing?(b.order-a.order):(a.order-b.order)
    })
}

TreeSearchAI.prototype.recordHistory = function(route, depth){
    if(!route || !route.stateKey)return
    this.historyTable[route.stateKey]=(this.historyTable[route.stateKey]||0)+depth*depth
}

TreeSearchAI.prototype.shouldExtendEndgame = function(gameData, stats){
    stats=stats||gameData.getRegionStats()
    return (
        gameData.isEndgamePhase() ||
        gameData.edgeCount[gameData.EDGE_NOT]<=this.ENDGAME_SAFE_EDGE_THRESHOLD
    ) && stats.largeClosedNum>0
}

TreeSearchAI.prototype.searchRoot = function(gameData, depth){
    var ttEntry=this.getTranspositionEntry('s',gameData)
    var routes=this.generateRoutes(gameData)
    if(!gameData.edgeCount[gameData.EDGE_NOT]){
        routes=this.generateExactRoutes(gameData)
    }
    routes=this.orderRoutes(routes,ttEntry,true)
    if(!routes.length)return null
    var alpha=-this.MAX_SCORE
    var beta=this.MAX_SCORE
    var bestRoute=routes[0]
    var bestValue=-this.MAX_SCORE
    for(var ii=0,route;route=routes[ii];ii++){
        this.checkSearchAbort()
        var next=route.state||this.applyRouteToClone(gameData,route.moves)
        if(!next)continue
        this.advanceIrrelevantState(next,this.IRRELEVANT_SKIP_LIMIT)
        var value=this.searchState(next,depth-1,alpha,beta)
        if(value>bestValue){
            bestValue=value
            bestRoute=route
        }
        if(value>alpha)alpha=value
    }
    return {
        route:bestRoute,
        value:bestValue,
    }
}

TreeSearchAI.prototype.searchState = function(gameData, depth, alpha, beta){
    this.searchStats.node++
    this.checkSearchAbort()
    this.advanceIrrelevantState(gameData,this.IRRELEVANT_SKIP_LIMIT)
    if(gameData.winnerId!=null){
        return this.getTerminalScore(gameData)
    }
    if(gameData.edgeCount[gameData.EDGE_NOT]<=this.EXACT_SAFE_EDGE_LIMIT){
        return this.solveLateEndgame(gameData)
    }
    if(depth<=0){
        return this.searchQuiescence(
            gameData,
            this.shouldExtendEndgame(gameData)?this.ENDGAME_DEPTH:this.QUIESCENCE_DEPTH,
            alpha,
            beta
        )
    }

    var alphaOrig=alpha
    var betaOrig=beta
    var ttInfo=this.lookupTransposition('s',gameData,depth,alpha,beta)
    if(ttInfo.hit){
        return ttInfo.value
    }
    alpha=ttInfo.alpha
    beta=ttInfo.beta

    var maximizing=gameData.playerId===this.playerId
    var routes=this.orderRoutes(this.generateRoutes(gameData),ttInfo.entry,maximizing)
    if(!routes.length){
        return this.evaluate(gameData)
    }

    var best=maximizing?-this.MAX_SCORE:this.MAX_SCORE
    var bestRoute=null
    for(var ii=0,route;route=routes[ii];ii++){
        this.checkSearchAbort()
        var next=route.state||this.applyRouteToClone(gameData,route.moves)
        if(!next)continue
        var value=this.searchState(next,depth-1,alpha,beta)
        if(maximizing){
            if(value>best){
                best=value
                bestRoute=route
            }
            if(best>alpha)alpha=best
            if(alpha>=beta){
                this.searchStats.cut++
                this.recordHistory(route,depth)
                break
            }
            continue
        }
        if(value<best){
            best=value
            bestRoute=route
        }
        if(best<beta)beta=best
        if(alpha>=beta){
            this.searchStats.cut++
            this.recordHistory(route,depth)
            break
        }
    }
    this.storeTransposition('s',gameData,depth,best,alphaOrig,betaOrig,bestRoute)
    return best
}

TreeSearchAI.prototype.searchQuiescence = function(gameData, depth, alpha, beta){
    this.searchStats.node++
    this.checkSearchAbort()
    this.advanceIrrelevantState(gameData,this.IRRELEVANT_SKIP_LIMIT)
    if(gameData.winnerId!=null){
        return this.getTerminalScore(gameData)
    }
    if(gameData.edgeCount[gameData.EDGE_NOT]<=this.EXACT_SAFE_EDGE_LIMIT){
        return this.solveLateEndgame(gameData)
    }
    var stats=gameData.getRegionStats()
    var stand=this.evaluate(gameData)
    var shouldContinue=gameData.edgeCount[gameData.EDGE_NOW] || this.shouldExtendEndgame(gameData,stats)
    if(depth<=0 || !shouldContinue){
        return stand
    }

    var alphaOrig=alpha
    var betaOrig=beta
    var ttInfo=this.lookupTransposition('q',gameData,depth,alpha,beta)
    if(ttInfo.hit){
        return ttInfo.value
    }
    alpha=ttInfo.alpha
    beta=ttInfo.beta
    var maximizing=gameData.playerId===this.playerId
    if(maximizing){
        if(stand>alpha)alpha=stand
    } else {
        if(stand<beta)beta=stand
    }
    if(alpha>=beta){
        return stand
    }

    var best=stand
    var routes=this.orderRoutes(this.generateRoutes(gameData),ttInfo.entry,maximizing)
    if(!routes.length){
        return stand
    }

    var bestRoute=null
    for(var ii=0,route;route=routes[ii];ii++){
        this.checkSearchAbort()
        var next=route.state||this.applyRouteToClone(gameData,route.moves)
        if(!next)continue
        var value=this.searchQuiescence(next,depth-1,alpha,beta)
        if(maximizing){
            if(value>best){
                best=value
                bestRoute=route
            }
            if(best>alpha)alpha=best
            if(alpha>=beta){
                this.recordHistory(route,depth)
                break
            }
            continue
        }
        if(value<best){
            best=value
            bestRoute=route
        }
        if(best<beta)beta=best
        if(alpha>=beta){
            this.recordHistory(route,depth)
            break
        }
    }
    this.storeTransposition('q',gameData,depth,best,alphaOrig,betaOrig,bestRoute)
    return best
}

TreeSearchAI.prototype.getTerminalScore = function(gameData){
    if(gameData.winnerId==null)return 0
    return gameData.winnerId===this.playerId?this.MAX_SCORE:-this.MAX_SCORE
}

TreeSearchAI.prototype.advanceIrrelevantState = function(gameData, limit){
    var rest=limit||0
    while(rest>0 && gameData.winnerId==null){
        if(gameData.edgeCount[gameData.EDGE_NOW])break
        if(!gameData.edgeCount[gameData.EDGE_NOT])break
        var analyses=gameData.getSafeEdgeAnalyses()
        if(!analyses.length)break
        var onlyIrrelevant=true
        for(var ii=0,item;item=analyses[ii];ii++){
            if(!item.isIrrelevant){
                onlyIrrelevant=false
                break
            }
        }
        if(!onlyIrrelevant)break
        gameData.putxy(analyses[0].edge.x,analyses[0].edge.y)
        rest--
    }
}

TreeSearchAI.prototype.applyRouteToClone = function(gameData, moves){
    var next=gameData.clone()
    if(!this.applyRouteInPlace(next,moves))return null
    return next
}

TreeSearchAI.prototype.applyRouteInPlace = function(gameData, moves){
    for(var ii=0;ii<moves.length;ii++){
        var move=moves[ii]
        if(!this.isValidMove(move))return false
        if(
            [gameData.EDGE_NOW,gameData.EDGE_NOT,gameData.EDGE_WILL]
            .indexOf(gameData.xy(move.x,move.y))===-1
        )return false
        gameData.putxy(move.x,move.y)
    }
    return true
}

TreeSearchAI.prototype.generateRoutes = function(gameData){
    if(gameData.edgeCount[gameData.EDGE_NOW]){
        return this.generateScoreRoutes(gameData)
    }
    if(gameData.edgeCount[gameData.EDGE_NOT]){
        return this.generateSafeRoutes(gameData)
    }
    return this.generateSacrificeRoutes(gameData)
}

TreeSearchAI.prototype.generateScoreRoutes = function(gameData){
    var prefixes=this.generateScorePrefixes(gameData)
    var routes=[]
    for(var ii=0,prefix;prefix=prefixes[ii];ii++){
        if(prefix.state.winnerId!=null || prefix.state.playerId!==gameData.playerId){
            var directRoute=this.makeRouteCandidate(gameData,prefix.state,prefix.moves,prefix.tag)
            if(directRoute)routes.push(directRoute)
            continue
        }

        var enders=this.generateTurnEnderRoutes(prefix.state)
        if(!enders.length){
            continue
        }

        for(var jj=0,ender;ender=enders[jj];jj++){
            var route=this.makeRouteCandidate(
                gameData,
                ender.state,
                prefix.moves.concat(ender.moves),
                prefix.tag+'+'+ender.tag
            )
            if(route){
                route.order+=(ender.order||0)*8
                routes.push(route)
            }
        }
    }
    return this.collectRepresentativeRoutes(routes,this.SCORE_ROUTE_LIMIT)
}

TreeSearchAI.prototype.generateScorePrefixes = function(gameData){
    var prefixes=[]
    var regions=this.getActiveScoreRegions(gameData)
    var allPrefix=this.buildScorePrefix(gameData,{
        type:'all',
        tag:'score-all',
    })
    if(allPrefix)prefixes.push(allPrefix)
    if(!regions.length)return prefixes
    for(var ii=0,region;region=regions[ii];ii++){
        var stopPrefix=this.buildScorePrefix(gameData,{
            type:'stopBeforeLast',
            tag:'score-stop',
            regionIndex:region.index,
        })
        if(stopPrefix)prefixes.push(stopPrefix)

        var controlPrefix=this.buildScorePrefix(gameData,{
            type:'control',
            tag:'score-control',
            regionIndex:region.index,
        })
        if(controlPrefix)prefixes.push(controlPrefix)
    }
    return prefixes
}

TreeSearchAI.prototype.generateExactScorePrefixes = function(gameData){
    var prefixes=[]
    var regions=this.getActiveScoreRegions(gameData)
    var allPrefix=this.buildScorePrefix(gameData,{
        type:'all',
        tag:'score-all',
    })
    if(allPrefix)prefixes.push(allPrefix)
    if(!regions.length)return prefixes
    for(var ii=0,region;region=regions[ii];ii++){
        var controlPrefix=this.buildScorePrefix(gameData,{
            type:'control',
            tag:'score-control',
            regionIndex:region.index,
        })
        if(controlPrefix){
            prefixes.push(controlPrefix)
            continue
        }

        var stopPrefix=this.buildScorePrefix(gameData,{
            type:'stopBeforeLast',
            tag:'score-stop',
            regionIndex:region.index,
        })
        if(stopPrefix)prefixes.push(stopPrefix)
    }
    return prefixes
}

TreeSearchAI.prototype.buildScorePrefix = function(gameData, policy){
    var current=gameData.clone()
    var moves=[]
    var rootPlayer=gameData.playerId
    var guard=0
    var targetIndex=policy.regionIndex

    while(current.winnerId==null && current.playerId===rootPlayer && current.edgeCount[current.EDGE_NOW]){
        guard++
        if(guard>current.totalScore*2)return null

        var regions=this.getActiveScoreRegions(current)
        if(!regions.length)break

        var targetRegion=null
        if(targetIndex!=null){
            targetRegion=this.findRegionByIndex(regions,targetIndex)
            if(!targetRegion){
                if(policy.type==='all'){
                    targetIndex=null
                } else {
                    break
                }
            }
            if(targetIndex!=null){
                targetRegion=this.findRegionByIndex(regions,targetIndex)
            }
        }

        var nextMoves=null
        var shouldStop=false
        var hasNonTarget=false
        if(targetRegion){
            hasNonTarget=regions.some(function(region){
                return region.index!==targetRegion.index
            })
        }

        if(policy.type==='all' && targetRegion){
            nextMoves=this.getAllEatMoves(current,targetRegion)
            targetIndex=null
        } else if(policy.type==='all'){
            nextMoves=this.getAllEatMoves(current,this.chooseScoreRegionToFinish(current,regions))
        } else if(targetRegion && policy.type==='takeOne'){
            nextMoves=this.getScorePrefixMoves(current,targetRegion,policy.type)
            shouldStop=true
        } else if(targetRegion && !hasNonTarget){
            nextMoves=this.getScorePrefixMoves(current,targetRegion,policy.type)
            shouldStop=true
        } else if(targetRegion){
            nextMoves=this.getAllEatMoves(
                current,
                this.chooseScoreRegionToFinish(current,regions,targetRegion.index)
            )
        }

        if(!this.isValidRouteMoves(nextMoves))return null
        if(!this.applyRouteInPlace(current,nextMoves))return null
        moves=moves.concat(nextMoves)

        if(shouldStop){
            break
        }
    }

    if(!moves.length)return null
    return {
        moves:moves,
        state:current,
        tag:policy.tag,
    }
}

TreeSearchAI.prototype.getAllEatMoves = function(gameData, region){
    if(!region)return null
    return gameData.getAllEdgesFromRegion(region)
}

TreeSearchAI.prototype.getScorePrefixMoves = function(gameData, region, type){
    if(!region)return null
    if(type==='takeOne'){
        var one=gameData.getOneEdgeFromRegion(region)
        return one?[one]:null
    }

    var fullRoute=gameData.getAllEdgesFromRegion(region)
    if(type==='stopBeforeLast'){
        if(!fullRoute || fullRoute.length<=1)return null
        return fullRoute.slice(0,-1)
    }

    if(type==='control'){
        return this.getControlPrefixMoves(gameData,region)
    }

    return fullRoute
}

TreeSearchAI.prototype.getControlPrefixMoves = function(gameData, region){
    if(!region || !region.block || !region.block.length)return null
    var targetRemain=region.isRing?4:2
    if(region.block.length<targetRemain)return null

    var current=gameData.clone()
    var moves=[]
    var remain={}
    for(var ii=0,pt;pt=region.block[ii];ii++){
        remain[[pt.x,pt.y].join(',')]=true
    }

    var guard=region.block.length*2
    while(guard>0 && current.playerId===gameData.playerId && current.edgeCount[current.EDGE_NOW]){
        guard--
        var scoreRegions=current.getScoreRegions()
        var currentRegion=null
        var bestOverlap=0
        for(var jj=0,candidate;candidate=scoreRegions[jj];jj++){
            var overlap=0
            for(var kk=0,cell;cell=candidate.block[kk];kk++){
                if(remain[[cell.x,cell.y].join(',')])overlap++
            }
            if(!overlap)continue
            if(overlap>bestOverlap){
                bestOverlap=overlap
                currentRegion=candidate
            }
        }
        if(!currentRegion)return null

        if(currentRegion.block.length<=targetRemain){
            var controlMove=this.getControlMoveFromRegion(current,currentRegion)
            if(!controlMove)return null
            moves.push(controlMove)
            return moves
        }

        var take=current.getOneEdgeFromRegion(currentRegion)
        if(!take || current.xy(take.x,take.y)!==current.EDGE_NOW)return null
        moves.push(take)
        current.putxy(take.x,take.y)
    }
    return null
}

TreeSearchAI.prototype.getControlMoveFromRegion = function(gameData, region){
    if(!region)return null
    var stack=region.block
    if(region.isRing){
        if(region.block.length!==4)return null
        return {'x':(stack[1].x+stack[2].x)/2,'y':(stack[1].y+stack[2].y)/2}
    }
    if(region.block.length!==2)return null

    var p1=1
    if(gameData.xy(stack[0].x,stack[0].y)!==gameData.SCORE_3){
        p1=0
    }
    var directions=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}]
    for(var ii=0,d;d=directions[ii];ii++){
        var xx=stack[p1].x+d.x, yy=stack[p1].y+d.y
        var xxx=stack[p1].x+2*d.x, yyy=stack[p1].y+2*d.y
        if(gameData.xy(xx,yy)!==gameData.EDGE_USED && gameData.xy(xxx,yyy)==='out range'){
            return {'x':xx,'y':yy}
        }
    }
    return null
}

TreeSearchAI.prototype.getActiveScoreRegions = function(gameData){
    return gameData.getScoreRegions().slice()
}

TreeSearchAI.prototype.findRegionByIndex = function(regions, regionIndex){
    for(var ii=0,region;region=regions[ii];ii++){
        if(region.index===regionIndex)return region
    }
    return null
}

TreeSearchAI.prototype.chooseScoreRegionToFinish = function(gameData, regions, skipIndex){
    var list=regions.filter(function(region){
        return region.index!==skipIndex
    })
    if(!list.length)return null
    list.sort(function(a,b){
        var ringA=a.isRing?1:0
        var ringB=b.isRing?1:0
        if(a.block.length!==b.block.length)return a.block.length-b.block.length
        if(ringA!==ringB)return ringA-ringB
        return a.index-b.index
    })
    return list[0]
}

TreeSearchAI.prototype.generateTurnEnderRoutes = function(gameData){
    if(gameData.edgeCount[gameData.EDGE_NOT]){
        return this.generateSafeRoutes(gameData,this.TURN_END_ROUTE_LIMIT)
    }
    if(gameData.edgeCount[gameData.EDGE_WILL]){
        return this.generateSacrificeRoutes(gameData,this.TURN_END_ROUTE_LIMIT)
    }
    return []
}

TreeSearchAI.prototype.generateSafeRoutes = function(gameData, limit){
    var analyses=gameData.getSafeEdgeAnalyses()
    var routes=[]
    var used={}
    var structures=gameData.getControlSwingStructures(analyses)
    for(var ii=0,structure;structure=structures[ii];ii++){
        var controlRoute=this.makeRouteFromAnalysis(gameData,structure.analyses[0],'safe-control')
        if(!controlRoute)continue
        used[structure.analyses[0].edgeKey]=true
        routes.push(controlRoute)
    }

    for(var jj=0,analysis;analysis=analyses[jj];jj++){
        if(used[analysis.edgeKey] || analysis.isIrrelevant)continue
        var shapeRoute=this.makeRouteFromAnalysis(gameData,analysis,'safe-shape')
        if(!shapeRoute)continue
        used[analysis.edgeKey]=true
        routes.push(shapeRoute)
    }

    var irrelevantGroups={}
    for(var kk=0,item;item=analyses[kk];kk++){
        if(used[item.edgeKey] || !item.isIrrelevant)continue
        if(
            !irrelevantGroups[item.parityKey] ||
            item.swingScore>irrelevantGroups[item.parityKey].swingScore
        ){
            irrelevantGroups[item.parityKey]=item
        }
    }
    for(var name in irrelevantGroups){
        var irrelevantRoute=this.makeRouteFromAnalysis(
            gameData,
            irrelevantGroups[name],
            'safe-irrelevant'
        )
        if(!irrelevantRoute)continue
        routes.push(irrelevantRoute)
    }

    return this.collectRepresentativeRoutes(routes,limit||this.SAFE_ROUTE_LIMIT)
}

TreeSearchAI.prototype.generateSacrificeRoutes = function(gameData, limit){
    var analyses=gameData.getSacrificeEdgeAnalyses()
    var routes=[]
    for(var ii=0,analysis;analysis=analyses[ii];ii++){
        var route=this.makeRouteFromAnalysis(gameData,analysis,'sacrifice')
        if(!route)continue
        routes.push(route)
    }
    return this.collectRepresentativeRoutes(routes,limit||this.SACRIFICE_ROUTE_LIMIT)
}

TreeSearchAI.prototype.generateExactRoutes = function(gameData){
    if(gameData.edgeCount[gameData.EDGE_NOW]){
        return this.generateExactScoreRoutes(gameData)
    }
    if(gameData.edgeCount[gameData.EDGE_NOT]){
        return this.generateExactSafeRoutes(gameData)
    }
    return this.generateExactSacrificeRoutes(gameData)
}

TreeSearchAI.prototype.generateExactScoreRoutes = function(gameData){
    var prefixes=this.generateExactScorePrefixes(gameData)
    var routes=[]
    for(var ii=0,prefix;prefix=prefixes[ii];ii++){
        if(prefix.state.winnerId!=null || prefix.state.playerId!==gameData.playerId){
            var directRoute=this.makeRouteCandidate(gameData,prefix.state,prefix.moves,prefix.tag)
            if(directRoute)routes.push(directRoute)
            continue
        }

        var enders=this.generateExactTurnEnderRoutes(prefix.state)
        for(var jj=0,ender;ender=enders[jj];jj++){
            var route=this.makeRouteCandidate(
                gameData,
                ender.state,
                prefix.moves.concat(ender.moves),
                prefix.tag+'+'+ender.tag
            )
            if(route){
                route.order+=(ender.order||0)*8
                routes.push(route)
            }
        }
    }
    return this.collectRepresentativeRoutes(routes)
}

TreeSearchAI.prototype.generateExactTurnEnderRoutes = function(gameData){
    if(gameData.edgeCount[gameData.EDGE_NOT]){
        return this.generateExactSafeRoutes(gameData)
    }
    if(gameData.edgeCount[gameData.EDGE_WILL]){
        return this.generateExactSacrificeRoutes(gameData)
    }
    return []
}

TreeSearchAI.prototype.generateExactSafeRoutes = function(gameData){
    var analyses=gameData.getSafeEdgeAnalyses()
    var routes=[]
    for(var ii=0,analysis;analysis=analyses[ii];ii++){
        var tag='safe-shape'
        if(analysis.isControlSwing){
            tag='safe-control'
        } else if(analysis.isIrrelevant){
            tag='safe-irrelevant'
        }
        var route=this.makeRouteFromAnalysis(gameData,analysis,tag)
        if(route)routes.push(route)
    }
    return this.collectRepresentativeRoutes(routes)
}

TreeSearchAI.prototype.getExactSacrificeBucketKey = function(analysis){
    if(!analysis || !analysis.state)return null
    var next=analysis.state
    var stats=analysis.afterStats||next.getRegionStats()
    var geometryParts=(analysis.geometryKey||'').split('|')
    return [
        analysis.categoryKey,
        geometryParts[1]||'',
        geometryParts[2]||'',
        geometryParts[3]||'',
        next.edgeCount[next.EDGE_NOW],
        next.edgeCount[next.EDGE_NOT],
        next.edgeCount[next.EDGE_WILL],
        stats.scoreRegionNum,
        stats.scoreCellNum,
        stats.largeClosedNum,
        stats.smallClosedNum,
    ].join('|')
}

TreeSearchAI.prototype.generateExactSacrificeRoutes = function(gameData){
    var okHint=this.getOkEndgameRolloutHint(gameData)
    var analyses=this.getExactSacrificeRepresentativeAnalyses(gameData,okHint)
    var routes=[]
    for(var ii=0,analysis;analysis=analyses[ii];ii++){
        var route=this.makeRouteFromAnalysis(gameData,analysis,'sacrifice')
        if(!route)continue
        route.order=this.getExactSacrificeRouteOrder(route,analysis)
        route.order+=this.getExactSacrificeOkRouteBonus(gameData,route,okHint)
        routes.push(route)
    }
    return this.collectRepresentativeRoutes(routes)
}

TreeSearchAI.prototype.getExactSacrificeRepresentativeKey = function(gameData, analysis){
    if(
        analysis &&
        analysis.regionIndex!=null &&
        this.shouldGroupExactSacrificeRegion(gameData,analysis)
    ){
        return 'region|'+analysis.regionIndex
    }
    return 'edge|'+analysis.edgeKey
}

TreeSearchAI.prototype.getExactSacrificeRepresentativeAnalyses = function(gameData, okHint){
    var analyses=gameData.getSacrificeEdgeAnalyses()
    var bucket={}
    for(var ii=0,analysis;analysis=analyses[ii];ii++){
        var key=this.getExactSacrificeRepresentativeKey(gameData,analysis)
        if(!key)continue
        if(
            !bucket[key] ||
            this.compareExactSacrificeRepresentativeAnalyses(
                gameData,
                analysis,
                bucket[key].analysis,
                okHint
            )>0
        ){
            bucket[key]={
                analysis:analysis,
                index:ii,
            }
        }
    }
    var grouped=[]
    for(var name in bucket){
        grouped.push(bucket[name])
    }
    grouped.sort(function(a,b){
        return a.index-b.index
    })
    var selected=[]
    for(var jj=0,item;item=grouped[jj];jj++){
        selected.push(item.analysis)
    }
    return selected
}

TreeSearchAI.prototype.getExactSacrificeRegionTopology = function(gameData, analysis){
    if(!gameData || !analysis || analysis.regionIndex==null)return null
    gameData.__exactSacrificeRegionTopologyCache=
        gameData.__exactSacrificeRegionTopologyCache||{}
    if(gameData.__exactSacrificeRegionTopologyCache[analysis.regionIndex]){
        return gameData.__exactSacrificeRegionTopologyCache[analysis.regionIndex]
    }
    var region=gameData.connectedRegion[analysis.regionIndex]
    if(!region || !region.block || !region.block.length){
        return null
    }
    var blockSet={}
    var directions=[
        {'x':0,'y':-2},
        {'x':2,'y':0},
        {'x':0,'y':2},
        {'x':-2,'y':0},
    ]
    for(var ii=0,pt;pt=region.block[ii];ii++){
        blockSet[[pt.x,pt.y].join(',')]=true
    }
    var maxDegree=0
    var endpointCount=0
    for(var jj=0,cell;cell=region.block[jj];jj++){
        var degree=0
        for(var kk=0,d;d=directions[kk];kk++){
            var nearKey=[cell.x+d.x,cell.y+d.y].join(',')
            if(blockSet[nearKey])degree++
        }
        if(degree>maxDegree)maxDegree=degree
        if(degree===1)endpointCount++
    }
    var size=region.block.length
    var isSimple=
        size===1 ||
        (
            maxDegree<=2 &&
            (region.isRing?endpointCount===0:endpointCount===2)
        )
    var topology={
        size:size,
        isRing:!!region.isRing,
        maxDegree:maxDegree,
        endpointCount:endpointCount,
        isSimple:isSimple,
    }
    gameData.__exactSacrificeRegionTopologyCache[analysis.regionIndex]=topology
    return topology
}

TreeSearchAI.prototype.shouldGroupExactSacrificeRegion = function(gameData, analysis){
    var topology=this.getExactSacrificeRegionTopology(gameData,analysis)
    if(!topology || !topology.isSimple)return false
    return true
}

TreeSearchAI.prototype.getExactSacrificeRegionSharedCellCount = function(gameData, analysis){
    if(!gameData || !analysis || analysis.regionIndex==null)return 0
    var region=gameData.connectedRegion[analysis.regionIndex]
    if(!region || !region.block || !region.block.length)return 0
    var blockSet={}
    for(var ii=0,pt;pt=region.block[ii];ii++){
        blockSet[[pt.x,pt.y].join(',')]=true
    }
    var adjacent=gameData.getAdjacentCellsFromEdge(analysis.edge)
    var count=0
    for(var jj=0,cell;cell=adjacent[jj];jj++){
        if(blockSet[[cell.x,cell.y].join(',')])count++
    }
    return count
}

TreeSearchAI.prototype.compareExactSacrificeRepresentativeAnalyses = function(
    gameData,
    analysisA,
    analysisB,
    okHint
){
    if(okHint && okHint.currentPlayerWin){
        var matchA=analysisA.edgeKey===okHint.moveKey?1:0
        var matchB=analysisB.edgeKey===okHint.moveKey?1:0
        if(matchA!==matchB)return matchA-matchB
    }
    var topology=this.getExactSacrificeRegionTopology(gameData,analysisA)
    if(topology && topology.isSimple){
        if(topology.isRing || topology.size!==2)return 0
        var sharedA=this.getExactSacrificeRegionSharedCellCount(gameData,analysisA)
        var sharedB=this.getExactSacrificeRegionSharedCellCount(gameData,analysisB)
        if(sharedA!==sharedB)return sharedA-sharedB
        return 0
    }
    return 0
}

TreeSearchAI.prototype.getOkEndgameRolloutHint = function(gameData){
    this.okEndgameHintCache=this.okEndgameHintCache||{}
    var key=gameData.getBoardKey()
    if(Object.prototype.hasOwnProperty.call(this.okEndgameHintCache,key)){
        return this.okEndgameHintCache[key]
    }
    if(gameData.edgeCount[gameData.EDGE_NOT]!==0){
        this.okEndgameHintCache[key]=null
        return null
    }
    var current=gameData.clone()
    var rolloutAI=new OffensiveKeeperAI()
    rolloutAI.gameData=current
    rolloutAI.rand=function(){return 0}
    var firstMove=null
    var guard=Math.max(16,current.totalScore*4)
    while(current.winnerId==null && guard>0){
        var move=rolloutAI.where()
        if(!this.isValidMove(move)){
            firstMove=null
            break
        }
        if(!firstMove){
            firstMove={'x':move.x,'y':move.y}
        }
        current.putxy(move.x,move.y)
        guard--
    }
    var hint=null
    if(firstMove && current.winnerId!=null){
        var diff=
            current.player[gameData.playerId].score-
            current.player[1-gameData.playerId].score
        hint={
            move:firstMove,
            moveKey:[firstMove.x,firstMove.y].join(','),
            currentPlayerWin:diff>0,
            scoreDiff:diff,
        }
    }
    this.okEndgameHintCache[key]=hint
    return hint
}

TreeSearchAI.prototype.getExactSacrificeRouteOrder = function(route, analysis){
    if(!route)return -this.MAX_SCORE
    // Exact pure-sacrifice ordering should prefer the post-open structure itself;
    // the local opening bonus is tuned for approximate route generation and
    // over-prioritizes opening large chains in proven endgames.
    if(analysis && analysis.regionSize>2){
        return route.order-(analysis.orderBonus||0)
    }
    return route.order
}

TreeSearchAI.prototype.getExactSacrificeOkRouteBonus = function(gameData, route, okHint){
    if(
        !okHint ||
        !okHint.currentPlayerWin ||
        !route ||
        !route.moves ||
        !route.moves.length
    )return 0
    var move=route.moves[0]
    if([move.x,move.y].join(',')!==okHint.moveKey)return 0
    return (gameData.playerId===this.playerId?1:-1)*this.OK_ENDGAME_ROUTE_BONUS
}

TreeSearchAI.prototype.collectEdgeRoutes = function(gameData, edges, limit, tag){
    var routes=[]
    var beforeTopology=this.getTopologyFingerprint(gameData)
    for(var ii=0,edge;edge=edges[ii];ii++){
        var next=gameData.clone()
        next.putxy(edge.x,edge.y)
        var route=this.makeRouteCandidate(gameData,next,[edge],tag)
        if(!route)continue
        route.isIrrelevant=(tag==='safe' && beforeTopology===this.getTopologyFingerprint(next))
        route.order=this.getRouteOrderScore(gameData,next,[edge],tag,route.isIrrelevant)
        routes.push(route)
    }
    return this.collectRepresentativeRoutes(routes,limit)
}

TreeSearchAI.prototype.makeRouteFromAnalysis = function(beforeGameData, analysis, tag){
    if(!analysis)return null
    var route=this.makeRouteCandidate(
        beforeGameData,
        analysis.state,
        [analysis.edge],
        tag,
        analysis.isIrrelevant
    )
    if(!route)return null
    route.analysis=analysis
    route.order+=analysis.swingScore||0
    route.order+=analysis.orderBonus||0
    return route
}

TreeSearchAI.prototype.collectRepresentativeRoutes = function(routes, limit){
    var bucket={}
    for(var ii=0,route;route=routes[ii];ii++){
        var key=route.tag+'|'+route.fingerprint
        if(!bucket[key] || route.order>bucket[key].order){
            bucket[key]=route
        }
    }
    var list=[]
    for(var name in bucket){
        list.push(bucket[name])
    }
    list.sort(function(a,b){
        return b.order-a.order
    })
    if(limit && list.length>limit){
        list=list.slice(0,limit)
    }
    return list
}

TreeSearchAI.prototype.collectUniqueRoutesByState = function(routes){
    var bucket={}
    for(var ii=0,route;route=routes[ii];ii++){
        if(!route || !route.stateKey)continue
        if(!bucket[route.stateKey] || route.order>bucket[route.stateKey].order){
            bucket[route.stateKey]=route
        }
    }
    var list=[]
    for(var name in bucket){
        list.push(bucket[name])
    }
    list.sort(function(a,b){
        return b.order-a.order
    })
    return list
}

TreeSearchAI.prototype.makeRouteCandidate = function(beforeGameData, afterGameData, moves, tag, isIrrelevant){
    if(!this.isValidRouteMoves(moves))return null
    return {
        moves:moves,
        tag:tag,
        state:afterGameData,
        stateKey:afterGameData.getBoardKey(),
        fingerprint:this.getRouteFingerprint(afterGameData),
        order:this.getRouteOrderScore(beforeGameData,afterGameData,moves,tag,isIrrelevant),
    }
}

TreeSearchAI.prototype.getRouteFingerprint = function(gameData){
    var stats=gameData.getRegionStats()
    return [
        gameData.playerId,
        gameData.player[0].score,
        gameData.player[1].score,
        gameData.edgeCount[gameData.EDGE_NOW],
        gameData.edgeCount[gameData.EDGE_NOT],
        gameData.edgeCount[gameData.EDGE_WILL],
        this.getTopologyFingerprint(gameData,stats),
        gameData.getControlFingerprint(stats),
    ].join('|')
}

TreeSearchAI.prototype.getTopologyFingerprint = function(gameData, stats){
    return gameData.getStructureFingerprint(stats)
}

TreeSearchAI.prototype.getRouteOrderScore = function(beforeGameData, afterGameData, moves, tag, isIrrelevant){
    var beforeStats=beforeGameData.getRegionStats()
    var afterStats=afterGameData.getRegionStats()
    var myGain=afterGameData.player[this.playerId].score-beforeGameData.player[this.playerId].score
    var oppGain=afterGameData.player[1-this.playerId].score-beforeGameData.player[1-this.playerId].score
    var score=this.evaluateStructure(afterGameData)

    score+=(myGain-oppGain)*900
    score-=moves.length*6

    if(tag.indexOf('score-all')===0){
        score+=720
        score+=myGain*220
        score+=(beforeStats.scoreCellNum-afterStats.scoreCellNum)*60
    } else if(tag.indexOf('score-control')===0){
        score+=640
        score+=myGain*180
        score+=afterStats.smallClosedNum*40
        score+=afterStats.largeRingNum*30
        if(afterGameData.edgeCount[afterGameData.EDGE_NOW])score+=180
    } else if(tag.indexOf('score-stop')===0){
        score+=540
        score+=myGain*160
        if(afterGameData.edgeCount[afterGameData.EDGE_NOW])score+=140
    } else if(tag.indexOf('score-one')===0){
        score+=420
        score+=myGain*120
        if(afterGameData.edgeCount[afterGameData.EDGE_NOW])score+=100
    } else if(tag.indexOf('safe')===0){
        score+=(beforeStats.largeNonRingNum-afterStats.largeNonRingNum)*220
        score+=(beforeStats.innerLargeClosedNum-afterStats.innerLargeClosedNum)*140
        score+=(beforeStats.boundaryLargeClosedNum-afterStats.boundaryLargeClosedNum)*90
        if(tag==='safe-control'){
            score+=260
        } else if(tag==='safe-shape'){
            score+=160
        }
        if(isIrrelevant || tag==='safe-irrelevant'){
            var parity=(afterGameData.countSafeEdges()+afterStats.smallClosedNum)%2===0?1:-1
            score+=parity*40
        } else {
            score+=160
        }
        if(
            beforeGameData.edgeCount[beforeGameData.EDGE_NOT]===4 &&
            afterGameData.edgeCount[afterGameData.EDGE_NOT]===2
        ){
            var opportunity=afterGameData.getStructureOpportunitySummary(null,true)
            if(opportunity.lastOpportunityBeneficiarySign){
                score+=
                    (afterGameData.playerId===this.playerId?1:-1)*
                    opportunity.lastOpportunityBeneficiarySign*260
            }
        }
    } else if(tag==='sacrifice'){
        score-=420
        score-=afterStats.smallClosedNum*70
        score-=afterStats.largeNonRingNum*210
        score-=afterStats.largeRingNum*120
        score-=oppGain*240
    }

    return score
}

TreeSearchAI.prototype.getExactSolvedScore = function(gameData){
    var diff=
        gameData.player[this.playerId].score-
        gameData.player[1-this.playerId].score
    if(!diff)return 0
    return (diff>0?1:-1)*(this.MAX_SCORE/4)+diff*1000
}

TreeSearchAI.prototype.solveLateEndgame = function(gameData){
    return this.solveLateEndgameWithLimit(
        gameData,
        this.EXACT_SAFE_EDGE_LIMIT
    )
}

TreeSearchAI.prototype.lookupExactEndgame = function(gameData, maxSafeEdgeCount, alpha, beta){
    this.exactEndgameCache=this.exactEndgameCache||{}
    var key='late|'+maxSafeEdgeCount+'|'+gameData.getBoardKey()
    var entry=this.exactEndgameCache[key]
    if(!entry){
        return {
            key:key,
            alpha:alpha,
            beta:beta,
            entry:null,
        }
    }
    if(typeof entry==='number'){
        entry={value:entry,flag:'exact'}
        this.exactEndgameCache[key]=entry
    }
    if(entry.flag==='exact'){
        return {
            hit:true,
            value:entry.value,
            key:key,
            alpha:alpha,
            beta:beta,
            entry:entry,
        }
    }
    if(entry.flag==='lower' && entry.value>alpha)alpha=entry.value
    if(entry.flag==='upper' && entry.value<beta)beta=entry.value
    if(alpha>=beta){
        return {
            hit:true,
            value:entry.value,
            key:key,
            alpha:alpha,
            beta:beta,
            entry:entry,
        }
    }
    return {
        key:key,
        alpha:alpha,
        beta:beta,
        entry:entry,
    }
}

TreeSearchAI.prototype.storeExactEndgame = function(key, value, alphaOrig, betaOrig){
    var flag='exact'
    if(value<=alphaOrig){
        flag='upper'
    } else if(value>=betaOrig){
        flag='lower'
    }
    this.exactEndgameCache[key]={
        value:value,
        flag:flag,
    }
}

TreeSearchAI.prototype.solveLateEndgameWithLimit = function(gameData, maxSafeEdgeCount, alpha, beta){
    alpha=alpha!=null?alpha:-this.MAX_SCORE
    beta=beta!=null?beta:this.MAX_SCORE
    if(gameData.edgeCount[gameData.EDGE_NOT]>maxSafeEdgeCount){
        return null
    }
    var alphaOrig=alpha
    var betaOrig=beta
    var ttInfo=this.lookupExactEndgame(gameData,maxSafeEdgeCount,alpha,beta)
    if(ttInfo.hit){
        return ttInfo.value
    }
    alpha=ttInfo.alpha
    beta=ttInfo.beta
    var key=ttInfo.key
    if(gameData.winnerId!=null){
        var terminalValue=this.getExactSolvedScore(gameData)
        this.exactEndgameCache[key]={
            value:terminalValue,
            flag:'exact',
        }
        return terminalValue
    }

    var routes=this.generateExactRoutes(gameData)
    if(!routes.length){
        var resolvedValue=this.getExactSolvedScore(gameData)
        this.exactEndgameCache[key]={
            value:resolvedValue,
            flag:'exact',
        }
        return resolvedValue
    }

    var maximizing=gameData.playerId===this.playerId
    if(!maximizing){
        routes=routes.slice().reverse()
    }
    var best=maximizing?-this.MAX_SCORE:this.MAX_SCORE
    for(var ii=0,route;route=routes[ii];ii++){
        var next=route.state||this.applyRouteToClone(gameData,route.moves)
        if(!next)continue
        var value=this.solveLateEndgameWithLimit(next,maxSafeEdgeCount,alpha,beta)
        if(maximizing){
            if(value>best)best=value
            if(best>alpha)alpha=best
        } else {
            if(value<best)best=value
            if(best<beta)beta=best
        }
        if(alpha>=beta){
            break
        }
    }
    this.storeExactEndgame(key,best,alphaOrig,betaOrig)
    return best
}

TreeSearchAI.prototype.solveExactEndgame = function(gameData){
    return this.solveLateEndgameWithLimit(gameData,0)
}

TreeSearchAI.prototype.evaluateStructure = function(gameData){
    if(gameData.winnerId!=null){
        return this.getTerminalScore(gameData)
    }

    var me=gameData.player[this.playerId].score
    var opp=gameData.player[1-this.playerId].score
    var currentSign=gameData.playerId===this.playerId?1:-1
    var stats=gameData.getRegionStats()
    var features=gameData.getEvalFeatures()
    var score=(me-opp)*10000

    score+=currentSign*120
    score+=gameData.edgeCount[gameData.EDGE_NOW]*currentSign*50
    score+=gameData.edgeCount[gameData.EDGE_NOT]*2
    score-=gameData.edgeCount[gameData.EDGE_WILL]*6

    score+=stats.scoreCellNum*currentSign*32
    score-=stats.smallClosedNum*80
    score+=stats.largeNonRingNum*currentSign*220
    score+=stats.largeRingNum*currentSign*150
    score+=stats.boundaryLargeClosedNum*currentSign*70
    score+=stats.innerLargeClosedNum*currentSign*110
    score+=stats.maxClosedSize*currentSign*18

    if(features.safeEdgeCount<=12){
        if(features.controlSwingCount){
            score+=currentSign*features.controlSwingCount*18
        }
        if(features.criticalSplitZoneNum){
            score+=currentSign*features.criticalSplitZoneNum*42
        }
        var opportunityOwnerSwing=
            features.currentOwnedOpportunityZoneNum-
            features.opponentOwnedOpportunityZoneNum
        if(opportunityOwnerSwing){
            score+=currentSign*opportunityOwnerSwing*
                (features.safeEdgeCount<=6?64:36)
        }
        if(features.phase!=='layout' && features.lastOpportunityOwnerSign){
            score+=currentSign*features.lastOpportunityOwnerSign*
                (features.safeEdgeCount<=6?120:72)
        }
        if(features.phase!=='layout' && features.lastCriticalSplitZone){
            score+=currentSign*90
        }
    }
    if(features.phase==='layout' && features.controlSwingCount===0){
        score+=currentSign*features.safeSmallParitySignal*16
    } else if(features.phase==='transition'){
        if(features.activeLargeScoreRegionNum){
            score+=currentSign*(70+features.activeLargeScoreCellNum*22)
        } else if(stats.largeClosedNum>0 && features.safeEdgeCount<=4){
            score-=currentSign*(80+features.largeChainNum*35+features.largeRingNum*25)
        }
    }

    return score
}

TreeSearchAI.prototype.evaluate = function(gameData){
    if(gameData.winnerId!=null){
        return this.getTerminalScore(gameData)
    }
    if(!gameData.edgeCount[gameData.EDGE_NOT]){
        return this.solveExactEndgame(gameData)
    }
    return this.evaluateStructure(gameData)
}

TreeSearchAI.prototype.getFallbackWhere = function(gameData){
    var groups=[gameData.EDGE_NOW,gameData.EDGE_NOT,gameData.EDGE_WILL]
    for(var ii=0,number;number=groups[ii];ii++){
        var edges=gameData.getAllEdges(number)
        if(edges.length)return edges[0]
    }
    return {'x':1,'y':0}
}
