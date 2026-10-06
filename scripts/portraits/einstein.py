from dsl import catmull
from parts import crown_messy, eyes_rl, left_side, lower_moustache, right_side

# Wild white hair, heavy brows and a bushy moustache.


def draw():
    return catmull(left_side("suit") + crown_messy(volume=12) + eyes_rl(heavy=True) + lower_moustache(droop=6) + right_side("plain"), 8)
