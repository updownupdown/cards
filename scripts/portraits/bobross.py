from dsl import catmull
from parts import crown_curls, eyes_rl, left_side, lower_beard, right_side

# A great round perm and a curly beard, an open shirt.


def draw():
    return catmull(left_side("plain", beard="curly", ear=False) + crown_curls(count=12, radius=9) + eyes_rl() + lower_beard("curly", bottom=192, width=28) + right_side("plain"), 8)
