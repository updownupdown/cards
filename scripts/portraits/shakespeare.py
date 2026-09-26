from dsl import catmull
from face import eyes_and_nose, mirrored
def draw():
    # Shoulder and the wide falling-band collar, up the neck.
    p=[(4,238),(16,228),(24,222),(22,216),(36,206),(58,200),(80,196),(84,188),(84,180)]
    # Bushy hair over the left ear, up to the bald dome and over.
    p+=[(78,172),(68,166),(60,154),(62,146),(56,134),(60,122),(58,112),(64,102)]
    p+=[(64,86),(72,64),(88,50),(106,46),(124,52),(136,68),(140,88)]
    # Down the right side's hair, back up the face's edge to the brow.
    p+=[(142,102),(146,118),(140,128),(144,140),(138,154),(132,160),(132,160),(131,140),(130,120),(128,104)]
    p+=mirrored(eyes_and_nose(y=110))
    # Left cheek, moustache, lower lip, pointed beard.
    p+=[(70,120),(72,138),(80,150),(88,147),(95,148),(100,151),(105,148),(112,147),(120,150),(120,150)]
    p+=[(112,156),(100,158),(90,156),(90,156),(95,164),(99,176),(101,186),(104,176),(108,164),(108,164)]
    # Right jaw, neck, the collar's right wing, right shoulder.
    p+=[(118,166),(126,156),(124,170),(118,186),(120,196),(142,200),(164,206),(178,216),(176,222),(176,222)]
    p+=[(184,228),(196,238)]
    return catmull(p,8)
