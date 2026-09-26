from dsl import catmull
from parts import framed, waves
def draw():
    outer = waves([(58, 128), (52, 104), (56, 80), (70, 60), (100, 50), (130, 60), (144, 80), (148, 104),
                   (142, 128)], 6, 2) + [(136, 132), (136, 132)]
    inner = [(134, 116), (128, 92), (112, 78), (100, 76), (100, 76), (96, 84), (100, 76), (88, 78),
             (74, 90), (68, 112)]
    return catmull(framed(outer, inner, "plain", "lace", lips=11), 8)
