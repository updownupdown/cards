from dsl import catmull, curls
from face import eyes_and_nose, mirrored
def draw():
    p=[(4,238),(24,226),(50,214),(68,206)]
    # Curly beard's left edge, the curls all round the head, down the right.
    p+=curls([(70,204),(64,182),(62,160),(62,140)],5,3.5)
    p+=curls([(62,138),(58,110),(64,82),(80,62),(100,56),(120,62),(136,82),(142,110),(138,136)],11,7)
    p+=[(134,122),(130,108)]
    p+=mirrored(eyes_and_nose(y=110))
    # Left cheek, moustache, then the beard's curly front, left to right.
    p+=[(70,120),(72,136),(82,150),(90,147),(100,151),(110,147),(118,150),(118,150)]
    p+=curls([(84,156),(82,172),(92,186),(108,186),(118,172),(120,154)],7,4.5)
    p+=curls([(122,152),(132,140),(136,128)],2,4)
    p+=[(136,128),(136,128)]
    # Neck under the beard, a toga fold, right shoulder.
    p+=[(126,172),(124,190),(128,202),(150,212),(176,224),(196,238)]
    return catmull(p,8)
