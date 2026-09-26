from dsl import catmull
from face import eyes_and_nose, mouth
def draw():
    p=[]
    # Left shoulder and a small collar, up the neck and the left jaw.
    p+=[(4,238),(22,226),(48,216),(70,209),(78,204),(77,199),(83,196),(84,186),(84,178)]
    p+=[(78,170),(71,156),(67,140),(65,130)]
    # Hair drawn smooth over the ears to the centre parting and down again.
    p+=[(58,127),(53,112),(52,94),(58,74),(70,56),(86,46),(100,44),(101,53),(100,44)]
    p+=[(116,46),(132,56),(144,74),(148,96),(147,116),(142,130),(136,134),(136,134)]
    # Its inner edge, framing the forehead.
    p+=[(134,118),(130,96),(120,78),(106,70),(100,69),(94,70),(80,78),(71,96),(69,112)]
    p+=eyes_and_nose(y=110)
    # Right cheek down to the chin, up into the lips.
    p+=[(131,120),(130,140),(123,160),(112,172),(100,177),(92,175),(92,175),(94,168),(92,163)]
    p+=mouth(158, w=11)
    # From the lips down the neck, collar, right shoulder.
    p+=[(114,166),(118,180),(117,194),(122,199),(120,204),(134,208),(158,214),(180,224),(196,238)]
    return catmull(p,8)
