// Flipbook Viewer using StPageFlip
(function() {
    'use strict';

    // Get slug from URL
    const pathParts = window.location.pathname.split('/');
    const slug = pathParts[pathParts.length - 2]; // /public/slug/ -> slug

    // Get page from URL
    const urlParams = new URLSearchParams(window.location.search);
    let currentPage = parseInt(urlParams.get('page') || '1', 10);

    let flipbook = null;
    let pagesData = null;

    // Load pages.json
    async function loadPages() {
        try {
            const response = await fetch('./pages.json');
            pagesData = await response.json();
            return pagesData;
        } catch (error) {
            console.error('Error loading pages.json:', error);
            document.getElementById('flipbook-container').innerHTML = 
                '<div class="error">Fehler beim Laden des Flipbooks</div>';
            return null;
        }
    }

    // Initialize flipbook
    async function initFlipbook() {
        const pagesData = await loadPages();
        if (!pagesData) return;

        const container = document.getElementById('flipbook-container');
        
        // Create flipbook instance
        flipbook = new StPageFlip(container, {
            width: Math.min(800, window.innerWidth - 40),
            height: Math.min(600, window.innerHeight - 100),
            showCover: true,
            maxShadowOpacity: 0.5,
            flippingTime: 1000,
            usePortrait: true,
            startPage: currentPage - 1,
        });

        // Load pages
        const pages = pagesData.pages.map((page, index) => {
            return {
                src: `./pages/${page.file}`,
                width: page.width,
                height: page.height,
            };
        });

        flipbook.loadPages(pages);

        // Update page info
        function updatePageInfo(page) {
            const pageInfo = document.getElementById('page-info');
            pageInfo.textContent = `Seite ${page} von ${pagesData.total_pages}`;
        }

        updatePageInfo(currentPage);

        // Handle page flip
        flipbook.on('flip', (e) => {
            currentPage = e.data + 1;
            updatePageInfo(currentPage);
            
            // Update URL
            const url = new URL(window.location.href);
            url.searchParams.set('page', currentPage.toString());
            window.history.pushState({}, '', url.toString());
        });

        // Keyboard navigation
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                flipbook.flipPrev();
            } else if (e.key === 'ArrowRight') {
                flipbook.flipNext();
            }
        });

        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const page = parseInt(urlParams.get('page') || '1', 10);
            if (page !== currentPage) {
                currentPage = page;
                flipbook.flip(currentPage - 1);
                updatePageInfo(currentPage);
            }
        });
    }

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFlipbook);
    } else {
        initFlipbook();
    }
})();


