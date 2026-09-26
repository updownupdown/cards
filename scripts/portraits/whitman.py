from dsl import catmull, curls
from face import eyes_and_nose
def draw():
    p=[(4,238),(26,226),(52,214),(66,208)]
    # Left edge of the beard, curling up to the cheek.
    p+=curls([(68,210),(62,188),(60,164),(62,144),(66,130)],6,3.5)
    # Hair under the hat, the brim, the soft crown, the other brim.
    p+=[(62,120),(60,108),(56,101),(40,99),(24,97),(22,94),(40,91),(64,89),(64,89)]
    p+=[(64,74),(70,58),(84,50),(100,53),(116,49),(130,55),(136,71),(138,89),(138,89)]
    p+=[(160,91),(180,95),(182,98),(164,101),(140,101),(140,101)]
    # Under the brim back across the forehead.
    p+=[(120,100),(100,99),(80,100),(70,104)]
    p+=eyes_and_nose(y=114)
    # Down the right cheek, the moustache right to left.
    p+=[(133,124),(130,138),(122,150),(116,147),(108,148),(100,152),(92,148),(84,147),(77,151)]
    # A curling strand down the beard, then its right edge up and out.
    p+=curls([(82,158),(86,182),(92,208),(98,230)],5,3)
    p+=curls([(100,232),(118,222),(132,204),(138,182)],5,4)
    p+=[(146,200),(166,212),(184,222),(196,238)]
    return catmull(p,8)
