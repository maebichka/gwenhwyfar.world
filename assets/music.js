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

    const titles = tracks.map((track) => track.textContent);

    function load(index) {
        current = (index + tracks.length) % tracks.length;
        audio.src = tracks[current].getAttribute('href');
        title.textContent = titles[current];
        tracks.forEach((track, i) => track.classList.toggle('current', i === current));
        seek.value = 0;
        currentTime.textContent = '0:00';
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
    });
    audio.addEventListener('ended', () => {
        // play through the list, then stop back at the top
        load(current + 1);
        if (current !== 0) audio.play();
    });

    seek.addEventListener('input', () => {
        audio.currentTime = seek.value;
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
});
