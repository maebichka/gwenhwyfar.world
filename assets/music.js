document.addEventListener('DOMContentLoaded', function() {
    const player = document.getElementById('player');
    const audio = document.getElementById('audio');
    const title = document.getElementById('track-title');
    const playButton = document.getElementById('play');
    const seek = document.getElementById('seek');
    const currentTime = document.getElementById('current-time');
    const duration = document.getElementById('duration');
    const tracks = Array.from(document.querySelectorAll('.track-list a'));
    let current = -1; // no track is loaded until one is picked

    function formatTime(seconds) {
        if (!isFinite(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return m + ':' + String(s).padStart(2, '0');
    }

    function lengthOf(track) {
        const span = track.nextElementSibling;
        if (!span || !span.classList.contains('track-length')) return '0:00';
        return span.textContent.replace(/[()]/g, '').trim();
    }

    const titles = tracks.map((track) => track.textContent);

    let loading = false;

    function setPlayLabel() {
        if (audio.paused) {
            playButton.textContent = 'play';
        } else {
            playButton.textContent = loading ? 'loading\u2026' : 'pause';
        }
    }

    function load(index) {
        current = (index + tracks.length) % tracks.length;
        audio.src = tracks[current].getAttribute('href');
        title.textContent = titles[current];
        tracks.forEach((track, i) => track.classList.toggle('current', i === current));
        seek.value = 0;
        currentTime.textContent = '0:00';
        // show the length straight away rather than waiting for the file
        duration.textContent = lengthOf(tracks[current]);
    }

    function skip(step) {
        const wasPlaying = !audio.paused;
        // with nothing loaded, next starts at the top and prev at the bottom
        load(current === -1 ? (step > 0 ? 0 : -1) : current + step);
        if (wasPlaying) audio.play();
    }

    function toggle() {
        if (!audio.paused) {
            audio.pause();
            return;
        }
        if (current === -1) load(0);
        audio.play();
    }

    playButton.addEventListener('click', toggle);
    document.getElementById('prev').addEventListener('click', () => skip(-1));
    document.getElementById('next').addEventListener('click', () => skip(1));

    // spacebar works anywhere on the page, not just on the play button
    document.addEventListener('keydown', (event) => {
        if (event.key !== ' ') return;
        // a focused button already toggles itself on space
        if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;
        event.preventDefault(); // otherwise the page scrolls
        toggle();
    });

    tracks.forEach((track, i) => {
        track.addEventListener('click', (event) => {
            event.preventDefault();
            load(i);
            audio.play();
        });
    });

    audio.addEventListener('play', setPlayLabel);
    audio.addEventListener('pause', () => {
        player.classList.remove('playing');
        setPlayLabel();
    });
    // the notes only bob while sound is actually coming out
    ['loadstart', 'waiting', 'seeking'].forEach((name) => audio.addEventListener(name, () => {
        loading = true;
        player.classList.remove('playing');
        setPlayLabel();
    }));
    ['playing', 'canplay', 'seeked'].forEach((name) => audio.addEventListener(name, () => {
        loading = false;
        if (!audio.paused) player.classList.add('playing');
        setPlayLabel();
    }));
    audio.addEventListener('loadedmetadata', () => {
        seek.max = audio.duration;
        duration.textContent = formatTime(audio.duration);
    });
    audio.addEventListener('timeupdate', () => {
        seek.value = audio.currentTime;
        currentTime.textContent = formatTime(audio.currentTime);
    });
    audio.addEventListener('ended', () => {
        // play through the list, then stop back at the top
        load(current + 1);
        if (current !== 0) audio.play();
    });

    seek.addEventListener('input', () => {
        audio.currentTime = seek.value;
    });

    // lengths sit in the markup so they show without JS; fill in any that are missing
    tracks.forEach((track) => {
        const existing = track.nextElementSibling;
        if (existing && existing.classList.contains('track-length')) return;

        const length = document.createElement('span');
        length.className = 'track-length';
        track.after(length);

        const probe = new Audio();
        probe.preload = 'metadata';
        probe.addEventListener('loadedmetadata', () => {
            length.textContent = ' (' + formatTime(probe.duration) + ')';
            if (tracks[current] === track) duration.textContent = formatTime(probe.duration);
        });
        probe.src = track.getAttribute('href');
    });
});
