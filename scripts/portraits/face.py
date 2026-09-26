"""Shared features for the one-line portraits (frontal, 200 x 240 box)."""
from dsl import loop
def eyes_and_nose(y=110, spread=16, cx=100, brow=True, lid=1.0, heavy=False):
    """From the left temple: left brow, left eye, down the nose, nostrils,
    up the nose, right eye, right brow. Ends at the right brow's outer end."""
    L=cx-spread; R=cx+spread
    p=[]
    if brow:
        by=y-6 if not heavy else y-5
        p+=[(L-12,by+1),(L-4,by-4),(L+7,by-2),(L+7,by-2)]
    p+=[(L+6,y),(L+1,y-4*lid),(L-6,y-3*lid),(L-11,y+1),(L-5,y+4),(L+2,y+4),(L+6,y+1)]
    p+=loop(L-1.5,y+0.5,2.6,0,1.0,10)
    p+=[(cx-5,y+3),(cx-4,y+16),(cx-5,y+27),(cx-8,y+31),(cx-6,y+35),(cx-1,y+35),(cx+1,y+36),(cx+4,y+35),(cx+8,y+33),(cx+5,y+29)]
    p+=[(cx+4,y+24),(cx+4,y+10),(R-10,y+2)]
    p+=[(R-4,y-4*lid),(R+4,y-4*lid),(R+10,y),(R+4,y+4),(R-4,y+4),(R-10,y+1)]
    p+=loop(R+0.5,y+0.5,2.6,180,1.0,10)
    if brow:
        by=y-7
        p+=[(R-6,by),(R+3,by-3),(R+12,by+1),(R+12,by+1)]
    return p
def mouth(y=158, cx=100, w=12):
    """From the chin: up to the left corner, lips, ends at the right corner."""
    return [(cx-w,y),(cx-w,y),(cx-5,y-2),(cx-1,y-3),(cx,y-2),(cx+1,y-3),(cx+5,y-2),(cx+w,y),(cx+w,y),
            (cx+6,y+4),(cx,y+6),(cx-6,y+4),(cx-w+1,y+0.5),(cx-4,y+1),(cx+4,y+1),(cx+w,y),(cx+w,y)]
def mirrored(points, cx=100):
    return [(2*cx-x,y) for x,y in points]
