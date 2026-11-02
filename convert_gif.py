from moviepy import *
clip = VideoFileClip("Logo Animation - NI new.mp4")
# Write GIF, 30 fps is smooth enough for splash and keeps it relatively small-ish
clip.write_gif("frontend/src/assets/Logo_Animation.gif", fps=30)
