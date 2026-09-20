document.addEventListener('DOMContentLoaded', function() {
    const player = document.getElementById('player');
    const audio = document.getElementById('audio');
    const title = document.getElementById('track-title');
    const playButton = document.getElementById('play');
    const seek = document.getElementById('seek');
    const currentTime = document.getElementById('current-time');
    const duration = document.getElementById('duration');
    const tracks = Array.from(document.querySelectorAll('.track-list a'));
    const waveform = document.getElementById('waveform');
    const context = waveform.getContext('2d');
    let current = 0;

    // peaks.json holds a base36 character per slice of each track, so the
    // waveform can be drawn without downloading the audio (see
    // scripts/waveform-peaks.py)
    const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
    let peaks = {};
    let trackPeaks = null;

    function peaksFor(track) {
        const file = track.getAttribute('href').split('/').pop();
        let encoded = peaks[file];
        if (!encoded) {
            try {
                encoded = peaks[decodeURIComponent(file)];
            } catch (error) {
                // a name that isn't valid percent-encoding: nothing to look up
            }
        }
        return encoded ? Array.from(encoded, (ch) => DIGITS.indexOf(ch) / 35) : null;
    }

    function drawWaveform() {
        const width = waveform.clientWidth;
        const height = waveform.clientHeight;
        if (!width || !height) return;

        const ratio = window.devicePixelRatio || 1;
        if (waveform.width !== Math.round(width * ratio)) {
            waveform.width = Math.round(width * ratio);
            waveform.height = Math.round(height * ratio);
        }
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);

        const styles = getComputedStyle(waveform);
        const ahead = styles.getPropertyValue('--wave-colour').trim() || '#f4a6cf';
        const behind = styles.getPropertyValue('--wave-played').trim() || '#e0559b';

        const barWidth = 2;
        const pitch = barWidth + 1;
        const bars = Math.max(1, Math.floor((width + 1) / pitch));
        const played = audio.duration ? audio.currentTime / audio.duration : 0;
        const middle = height / 2;

        for (let i = 0; i < bars; i++) {
            let level = 0.06; // a hairline where the track is silent
            if (trackPeaks) {
                const from = Math.floor(i * trackPeaks.length / bars);
                const to = Math.max(from + 1, Math.floor((i + 1) * trackPeaks.length / bars));
                for (let j = from; j < to; j++) level = Math.max(level, trackPeaks[j]);
            }
            const barHeight = Math.max(1, level * (height - 2));
            context.fillStyle = (i + 0.5) / bars <= played ? behind : ahead;
            context.fillRect(i * pitch, middle - barHeight / 2, barWidth, barHeight);
        }
    }

    function formatTime(seconds) {
        if (!isFinite(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return m + ':' + String(s).padStart(2, '0');
    }

    const titles = tracks.map((track) => track.textContent);

    function load(index) {
        current = (index + tracks.length) % tracks.length;
        audio.src = tracks[current].getAttribute('href');
        title.textContent = titles[current];
        tracks.forEach((track, i) => track.classList.toggle('current', i === current));
        seek.value = 0;
        currentTime.textContent = '0:00';
        trackPeaks = peaksFor(tracks[current]);
        drawWaveform();
    }

    function skip(step) {
        const wasPlaying = !audio.paused;
        load(current + step);
        if (wasPlaying) audio.play();
    }

    playButton.addEventListener('click', () => {
        audio.paused ? audio.play() : audio.pause();
    });
    document.getElementById('prev').addEventListener('click', () => skip(-1));
    document.getElementById('next').addEventListener('click', () => skip(1));

    tracks.forEach((track, i) => {
        track.addEventListener('click', (event) => {
            event.preventDefault();
            load(i);
            audio.play();
        });
    });

    audio.addEventListener('play', () => {
        playButton.textContent = 'pause';
        player.classList.add('playing');
    });
    audio.addEventListener('pause', () => {
        playButton.textContent = 'play';
        player.classList.remove('playing');
    });
    audio.addEventListener('loadedmetadata', () => {
        seek.max = audio.duration;
        duration.textContent = formatTime(audio.duration);
    });
    audio.addEventListener('timeupdate', () => {
        seek.value = audio.currentTime;
        currentTime.textContent = formatTime(audio.currentTime);
        drawWaveform();
    });
    audio.addEventListener('ended', () => {
        // play through the list, then stop back at the top
        load(current + 1);
        if (current !== 0) audio.play();
    });

    seek.addEventListener('input', () => {
        audio.currentTime = seek.value;
        drawWaveform();
    });

    window.addEventListener('resize', drawWaveform);

    fetch('peaks.json')
        .then((response) => response.json())
        .then((data) => {
            peaks = data;
            trackPeaks = peaksFor(tracks[current]);
            drawWaveform();
        })
        .catch(() => {
            // no peaks: the seek bar still works, it's just a flat line
        });

    // ask the browser for each track's length and show it next to the title
    tracks.forEach((track) => {
        const probe = new Audio();
        probe.preload = 'metadata';
        probe.addEventListener('loadedmetadata', () => {
            const length = document.createElement('span');
            length.className = 'track-length';
            length.textContent = ' (' + formatTime(probe.duration) + ')';
            track.after(length);
        });
        probe.src = track.getAttribute('href');
    });

    load(0);
});
