import { FC } from 'hono/jsx';

export interface PhotoItem {
  id: string;
  url: string;
  title: string;
  location: string;
  exif: string;
  quote: string;
}

export const GALLERY_PHOTOS: PhotoItem[] = [
  {
    id: 'photo_1',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1920&auto=format&fit=crop',
    title: '晨曦 · 阿尔卑斯初雪金峰',
    location: 'Zermatt, Switzerland',
    exif: '24mm · f/8 · 1/250s · ISO 100',
    quote: '山川以万载静默，照见每一个过客的初心。',
  },
  {
    id: 'photo_2',
    url: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?q=80&w=1920&auto=format&fit=crop',
    title: '极夜 · 瓦特纳冰原星芒',
    location: 'Vatnajökull, Iceland',
    exif: '14mm · f/2.8 · 15s · ISO 3200',
    quote: '在宇宙的幽暗中，微光自有其永恒的方向。',
  },
  {
    id: 'photo_3',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1920&auto=format&fit=crop',
    title: '静谧 · 晨雾漫过翡翠湖',
    location: 'Hallstatt, Austria',
    exif: '35mm · f/5.6 · 1/160s · ISO 200',
    quote: '清晨的薄雾，是天地未曾写就的一行留白。',
  },
  {
    id: 'photo_4',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1920&auto=format&fit=crop',
    title: '秩序 · 光与水泥的极简交响',
    location: 'Tokyo, Japan',
    exif: '50mm · f/4 · 1/400s · ISO 400',
    quote: '在严谨的几何之间，安放精神的辽阔。',
  },
  {
    id: 'photo_5',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1920&auto=format&fit=crop',
    title: '暮色 · 潮汐漫卷金色回响',
    location: 'Maui, Hawaii',
    exif: '70mm · f/4 · 1/500s · ISO 100',
    quote: '黄昏是白昼与黑夜的温柔妥协。',
  },
];

export const GalleryCarousel: FC = () => {
  return (
    <div
      id="gallery-carousel-viewport"
      class="gallery-hero-viewport"
      ondblclick="window.toggleMasterUnlockModal && window.toggleMasterUnlockModal(true);"
      title="双击呼出管理暗门"
    >
      {/* 1. 轮播滑块容器 */}
      <div class="gallery-slides-wrapper">
        {GALLERY_PHOTOS.map((photo, index) => (
          <div
            key={photo.id}
            id={`gallery-slide-${index}`}
            class={`gallery-slide-item ${index === 0 ? 'active' : ''}`}
            style={`background-image: url('${photo.url}');`}
          >
            {/* 渐变遮罩保护文字 */}
            <div class="gallery-slide-overlay"></div>

            {/* 摄影图文信息面板 */}
            <div class="gallery-photo-meta">
              <span class="gallery-location-tag">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{photo.location}</span>
              </span>

              <h2 class="gallery-photo-title">{photo.title}</h2>
              <p class="gallery-photo-quote">“{photo.quote}”</p>

              <div class="gallery-exif-pill">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>{photo.exif}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 2. 左右切换箭头控制 */}
      <button
        type="button"
        class="gallery-nav-btn gallery-nav-prev"
        onclick="event.stopPropagation(); window.prevGallerySlide();"
        title="上一张 (← 键盘左键)"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <button
        type="button"
        class="gallery-nav-btn gallery-nav-next"
        onclick="event.stopPropagation(); window.nextGallerySlide();"
        title="下一张 (→ 键盘右键)"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* 3. 底部指示胶囊与状态条 */}
      <div class="gallery-controls-bar">
        <div class="gallery-dots-group">
          {GALLERY_PHOTOS.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              id={`gallery-dot-${index}`}
              class={`gallery-dot-btn ${index === 0 ? 'active' : ''}`}
              onclick={`event.stopPropagation(); window.goGallerySlide(${index});`}
              title={photo.title}
            >
              <span class="dot-inner"></span>
            </button>
          ))}
        </div>

        <div class="gallery-counter-tag">
          <span id="gallery-current-idx">01</span>
          <span class="counter-slash">/</span>
          <span>05</span>
        </div>
      </div>

      {/* 4. 轮播控制脚本 */}
      <script dangerouslySetInnerHTML={{
        __html: `
          (function() {
            let current = 0;
            const total = 5;
            let autoTimer = null;

            function showSlide(index) {
              for (let i = 0; i < total; i++) {
                const s = document.getElementById('gallery-slide-' + i);
                const d = document.getElementById('gallery-dot-' + i);
                if (s) s.classList.toggle('active', i === index);
                if (d) d.classList.toggle('active', i === index);
              }
              current = index;
              const counter = document.getElementById('gallery-current-idx');
              if (counter) {
                counter.innerText = (current + 1).toString().padStart(2, '0');
              }
            }

            window.nextGallerySlide = function() {
              showSlide((current + 1) % total);
              restartAutoTimer();
            };

            window.prevGallerySlide = function() {
              showSlide((current - 1 + total) % total);
              restartAutoTimer();
            };

            window.goGallerySlide = function(idx) {
              showSlide(idx);
              restartAutoTimer();
            };

            function restartAutoTimer() {
              if (autoTimer) clearInterval(autoTimer);
              autoTimer = setInterval(() => {
                showSlide((current + 1) % total);
              }, 5500);
            }

            restartAutoTimer();

            // 键盘左右方向键支持
            document.addEventListener('keydown', function(e) {
              if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
              if (e.key === 'ArrowRight') {
                window.nextGallerySlide();
              } else if (e.key === 'ArrowLeft') {
                window.prevGallerySlide();
              }
            });
          })();
        `
      }} />
    </div>
  );
};
