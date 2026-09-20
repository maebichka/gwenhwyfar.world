#!/usr/bin/env python3
"""Precompute waveform peaks for the tracks on /music.

Reads every .wav in music/audio/ and writes music/peaks.json, which the player
draws instead of downloading the audio itself. Run it after adding a track:

    python3 scripts/waveform-peaks.py

Each track becomes a string of BUCKETS base36 characters, one per slice of the
track, '0' for silence and 'z' for the loudest moment in that track.
"""

import array
import glob
import json
import os
import wave

BUCKETS = 200          # slices per track
SAMPLES_PER_BUCKET = 1500   # how many samples of each slice we actually look at
DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"

AUDIO_DIR = os.path.join(os.path.dirname(__file__), "..", "music", "audio")
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "music", "peaks.json")


def samples(raw, width, wanted):
    """A strided sample of the frames in `raw`, as plain ints."""
    if width == 2:
        whole = array.array("h")
        whole.frombytes(raw)
        stride = max(1, len(whole) // wanted)
        return whole[::stride]
    if width == 3:
        # the wave module hands 24-bit audio back as raw bytes
        total = len(raw) // 3
        stride = max(1, total // wanted)
        out = []
        for j in range(0, total, stride):
            o = 3 * j
            v = raw[o] | raw[o + 1] << 8 | raw[o + 2] << 16
            out.append(v - 0x1000000 if v & 0x800000 else v)
        return out
    raise ValueError("unsupported sample width: %d bytes" % width)


def track_peaks(path):
    with wave.open(path, "rb") as w:
        frames = w.getnframes()
        channels = w.getnchannels()
        width = w.getsampwidth()
        full_scale = float(1 << (8 * width - 1))

        edges = [frames * i // BUCKETS for i in range(BUCKETS + 1)]
        levels = []
        for i in range(BUCKETS):
            count = edges[i + 1] - edges[i]
            if count <= 0:
                levels.append(0.0)
                continue
            w.setpos(edges[i])
            chunk = samples(w.readframes(count), width, SAMPLES_PER_BUCKET * channels)
            if not len(chunk):
                levels.append(0.0)
                continue
            loudest = max(abs(max(chunk)), abs(min(chunk))) / full_scale
            rms = (sum(s * s for s in chunk) / len(chunk)) ** 0.5 / full_scale
            # mostly the body of the sound, with enough of the peak that
            # transients still poke out
            levels.append(0.65 * rms + 0.35 * loudest)

    # scale to the track's own loudest moment, so quiet takes stay visible
    ceiling = max(levels)
    if ceiling <= 0:
        return DIGITS[0] * BUCKETS
    out = []
    for level in levels:
        shaped = (level / ceiling) ** 0.7
        out.append(DIGITS[min(35, round(shaped * 35))])
    return "".join(out)


def main():
    peaks = {}
    for path in sorted(glob.glob(os.path.join(AUDIO_DIR, "*.wav"))):
        name = os.path.basename(path)
        peaks[name] = track_peaks(path)
        print("%-42s %s..." % (name, peaks[name][:24]))

    with open(OUT_PATH, "w") as f:
        json.dump(peaks, f, indent=0, sort_keys=True)
        f.write("\n")
    print("\nwrote %s (%d tracks, %d bytes)" % (
        os.path.relpath(OUT_PATH), len(peaks), os.path.getsize(OUT_PATH)))


if __name__ == "__main__":
    main()
