# -*- coding: utf-8 -*-
import json
import urllib.request

def wget(url):
    url='http://localhost:5051/'+url
    with urllib.request.urlopen(url) as urlf:
        ss=urlf.read() # ss是字节形式
    return ss.decode()

def gethistory():
    return json.loads(wget('history'))
    # List as [[x,y,id],...]

def getmap():
    return json.loads(wget('map'))
    # List2d
    
    # Game.prototype.POINT=1
    # Game.prototype.EDGE=0
    # Game.prototype.SCORE=2
    # Game.prototype.EDGE_USED=-1
    # Game.prototype.SCORE_PLAYER=[4,8]
    

def putxy(x,y):
    return wget('put/{x}-{y}'.format(x=x,y=y))
    # ['lock','Invalid click','win0','win1','continueTurn','changeTurn']

def ismyturn():
    return json.loads(wget('ismyturn'))
    # [False,True]

def myid():
    return json.loads(wget('myid'))
    # [0,1]

'''
ipython
from imp import reload
import pythonapi as pa
reload(pa)
'''