from dsl import catmull, curls
from parts import framed
def draw():
    outer = curls([(58, 132), (48, 104), (54, 72), (76, 50), (100, 44), (124, 50), (146, 72), (152, 104),
                   (144, 134)], 13, 5) + [(138, 136), (138, 136)]
    inner = [(134, 118), (130, 96)] + curls([(124, 84), (100, 76), (76, 84)], 4, 4) + [(70, 98), (69, 112)]
    return catmull(framed(outer, inner, "robe", "robe", lips=10), 8)
