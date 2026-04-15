/**
 * 브라우저 기본 터치 동작 비활성화
 */
function disableBrowserDefaults() {
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });

  let lastTouchEnd = 0;
  document.addEventListener('touchend', function (e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, { passive: false });

  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
  });
}

/**
 * 간단한 탭 감지 — 드래그와 구분
 * @param {HTMLElement} element
 * @param {function} callback - (event, {x, y})
 * @param {object} options - { threshold: 10, maxDuration: 300 }
 */
function onTap(element, callback, options) {
  const threshold = (options && options.threshold) || 10;
  const maxDuration = (options && options.maxDuration) || 300;
  let startX, startY, startTime;

  element.addEventListener('touchstart', function (e) {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    startTime = Date.now();
  }, { passive: true });

  element.addEventListener('touchend', function (e) {
    if (startX === undefined) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX;
    const dy = touch.clientY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Date.now() - startTime;

    if (dist < threshold && duration < maxDuration) {
      callback(e, { x: touch.clientX, y: touch.clientY });
    }
    startX = undefined;
  }, { passive: true });

  // 마우스 지원 (개발/테스트용)
  element.addEventListener('click', function (e) {
    callback(e, { x: e.clientX, y: e.clientY });
  });
}

/**
 * 드래그(패닝) 지원
 * @param {HTMLElement} container
 * @param {HTMLElement} content
 * @returns {{ getOffset: () => {x,y}, setOffset: (x,y) => void }}
 */
function enableDrag(container, content) {
  let isDragging = false;
  let startX, startY, offsetX = 0, offsetY = 0, lastX, lastY;

  function clampOffset() {
    const cRect = container.getBoundingClientRect();
    const contentW = content.scrollWidth;
    const contentH = content.scrollHeight;
    const minX = cRect.width - contentW;
    const minY = cRect.height - contentH;
    offsetX = Math.min(0, Math.max(minX, offsetX));
    offsetY = Math.min(0, Math.max(minY, offsetY));
  }

  function applyTransform() {
    content.style.transform = 'translate(' + offsetX + 'px, ' + offsetY + 'px)';
  }

  container.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    isDragging = true;
    startX = e.touches[0].clientX - offsetX;
    startY = e.touches[0].clientY - offsetY;
  }, { passive: true });

  container.addEventListener('touchmove', function (e) {
    if (!isDragging) return;
    e.preventDefault();
    offsetX = e.touches[0].clientX - startX;
    offsetY = e.touches[0].clientY - startY;
    clampOffset();
    applyTransform();
  }, { passive: false });

  container.addEventListener('touchend', function () {
    isDragging = false;
  }, { passive: true });

  // 마우스 드래그 지원 (개발용)
  container.addEventListener('mousedown', function (e) {
    isDragging = true;
    startX = e.clientX - offsetX;
    startY = e.clientY - offsetY;
    lastX = e.clientX;
    lastY = e.clientY;
  });

  window.addEventListener('mousemove', function (e) {
    if (!isDragging) return;
    offsetX = e.clientX - startX;
    offsetY = e.clientY - startY;
    clampOffset();
    applyTransform();
  });

  window.addEventListener('mouseup', function () {
    isDragging = false;
  });

  return {
    getOffset: function () { return { x: offsetX, y: offsetY }; },
    setOffset: function (x, y) { offsetX = x; offsetY = y; clampOffset(); applyTransform(); }
  };
}

// 페이지 로드 시 브라우저 기본 동작 차단
document.addEventListener('DOMContentLoaded', disableBrowserDefaults);
