from dsl import catmull
from parts import crown_shaved, eyes_rl, left_side, lower_smile, right_side

# Close-cropped hair, big ears, heavy brows and a grin.


def draw():
    return catmull(left_side("plain") + crown_shaved() + eyes_rl(heavy=True) + lower_smile() + right_side("plain"), 8)
