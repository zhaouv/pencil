# -*- coding: utf-8 -*-
import json
import urllib.request

class NetworkGame:
    def __init__(self,port=5051):
        self.port=port

    def wget(self,url):
        url='http://localhost:'+str(self.port)+'/'+url
        with urllib.request.urlopen(url) as urlf:
            ss=urlf.read() # ss is byte code
        return ss.decode()

    def gethistory(self):
        return json.loads(self.wget('history'))
        # List as [[x,y,id],...]

    def getmap(self):
        return json.loads(self.wget('map'))
        # List2d[y][x]
        
    POINT=1
    EDGE=0
    SCORE=2
    EDGE_USED=-1
    SCORE_PLAYER=[4,8]
        
    def putxy(self,x,y):
        return self.wget('put/{x}-{y}'.format(x=x,y=y))
        # ['lock','Invalid click','win0','win1','continueTurn','changeTurn']

    def ismyturn(self):
        return json.loads(self.wget('ismyturn'))
        # [False,True]

    def myid(self):
        return json.loads(self.wget('myid'))
        # [0,1]

'''
ipython
from imp import reload
import pythonapi as pa
reload(pa)
'''