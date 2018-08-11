import time
import pythonapi

class pyAI:
    # just runable
    def __init__(self,p):
        self.historyLength=0
        self.p=p
    def setPut(self,_put):
        def put(obj,x,y):
            r=_put(x,y)
            if r[:3]=='win':
                obj.win=0
        self.put=lambda w:put(self,w[0],w[1])
    def setPlayer(self,_id):
        self.id=_id
    def setMap(self,_map):
        self.map=_map
        self.win=1
    def update(self,history):
        hl=self.historyLength
        self.historyLength=len(history)
        if self.historyLength<hl:
            wincheck=self.win
            self.win=0
            return wincheck
        return -1
    def where(self):
        self.map=p.getmap()
        for y,a in enumerate(self.map):
            for x,number in enumerate(a):
                if number == p.EDGE:
                    return [x,y]
        raise RuntimeError('full')

p=pythonapi.NetworkGame(port=5051)
player=pyAI(p)
player.setPut(p.putxy)
winlose=[[0,0],[0,0]]
try:
    while True:
        wincheck=-1
        player.setPlayer(p.myid())
        player.setMap(p.getmap())
        while True:
            if not p.ismyturn():
                time.sleep(0.01)
                continue
            wincheck=player.update(p.gethistory())
            if wincheck!=-1:break
            where=player.where()
            print(where)
            player.put(where)
        print(['win','lose'][wincheck])
        winlose[player.id][wincheck]+=1
finally:
    print(winlose)
