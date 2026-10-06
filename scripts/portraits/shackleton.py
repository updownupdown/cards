from dsl import catmull
from parts import crown_short, eyes_rl, left_side, lower_lips, right_side

# Centre-parted hair, a strong jaw, a heavy sweater.


def draw():
    return catmull(left_side("plain") + crown_short(part=False) + eyes_rl(heavy=True) + lower_lips(w=12) + right_side("turtleneck"), 8)
