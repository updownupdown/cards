import math, json
def catmull(points, samples=10):
    """Smooth line through points; a point repeated twice makes a corner."""
    out=[]
    P=[points[0]]+points+[points[-1]]
    for i in range(1,len(P)-2):
        p0,p1,p2,p3=P[i-1],P[i],P[i+1],P[i+2]
        if p1==p2: continue
        if p0==p1: p0=(2*p1[0]-p2[0],2*p1[1]-p2[1])
        if p2==p3: p3=(2*p2[0]-p1[0],2*p2[1]-p1[1])
        for s in range(samples):
            t=s/samples;t2=t*t;t3=t2*t
            out.append(tuple(0.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3) for k in (0,1)))
    out.append(points[-1])
    return out
def loop(cx,cy,r,start_angle=90,turns=1.0,n=10,clockwise=True):
    """A small circle (pupil) entered and left at start_angle."""
    pts=[]
    for i in range(n+1):
        a=math.radians(start_angle+(-1 if clockwise else 1)*360*turns*i/n)
        pts.append((cx+r*math.cos(a),cy-r*math.sin(a)))
    return pts
def curls(guide, count, radius, drift=1.0):
    """Loops along a guide line (curly hair or beard): a prolate trochoid."""
    g=catmull(guide,20)
    L=[0]
    for a,b in zip(g,g[1:]): L.append(L[-1]+math.dist(a,b))
    total=L[-1];pts=[];N=count*14;j=0
    for i in range(N+1):
        s=total*i/N
        while j<len(L)-2 and L[j+1]<s: j+=1
        t=(s-L[j])/max(1e-9,L[j+1]-L[j]);a,b=g[j],g[min(j+1,len(g)-1)]
        x=a[0]+(b[0]-a[0])*t;y=a[1]+(b[1]-a[1])*t
        dx,dy=b[0]-a[0],b[1]-a[1];n=math.hypot(dx,dy) or 1;tx,ty=dx/n,dy/n;nx,ny=-ty,tx
        ph=2*math.pi*count*i/N
        pts.append((x+radius*(-math.sin(ph))*tx*drift+radius*(1-math.cos(ph))*nx*0.9, y+radius*(-math.sin(ph))*ty*drift+radius*(1-math.cos(ph))*ny*0.9))
    return pts
