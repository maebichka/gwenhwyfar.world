document.addEventListener('DOMContentLoaded', function() {
    const images = [...document.querySelectorAll('.gallery-img')];
    const lightbox = document.querySelector('#lightbox');
    const lightboxImg = document.querySelector('#lightbox-img');
    const lightboxCaption = document.querySelector('#lightbox-caption');

    const prevButton = document.querySelector('#prev');
    const nextButton = document.querySelector('#next');

    const mobilePrev = document.querySelector('#mobile-prev');
    const mobileNext = document.querySelector('#mobile-next');

    let current = 0;

    function showImage(index) {
        current = (index + images.length) % images.length;

        // Use data-full if the image has one, otherwise fall back to src
        lightboxImg.src = images[current].dataset.full || images[current].src;
        lightboxImg.alt = images[current].alt;
        lightboxCaption.textContent = images[current].alt;

        lightbox.classList.add('open');
    }

    function closeLightbox() {
        lightbox.classList.remove('open');
    }

    function previousImage() {
        showImage(current - 1);
    }

    function nextImage() {
        showImage(current + 1);
    }

    // Open lightbox from gallery
    images.forEach((img, i) => {
        img.addEventListener('click', () => {
            showImage(i);
        });
    });

    // Desktop arrows
    prevButton.addEventListener('click', previousImage);
    nextButton.addEventListener('click', nextImage);

    // Mobile tap zones
    mobilePrev.addEventListener('click', previousImage);
    mobileNext.addEventListener('click', nextImage);

    // Keyboard navigation
    document.addEventListener('keydown', e => {
        if (!lightbox.classList.contains('open')) return;

        if (e.key === 'ArrowLeft') {
            previousImage();
        }

        if (e.key === 'ArrowRight') {
            nextImage();
        }

        if (e.key === 'Escape') {
            closeLightbox();
        }
    });

    // Click dark background to close
    lightbox.addEventListener('click', e => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });
});
