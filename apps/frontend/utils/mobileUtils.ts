// Mobile detection and utilities
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth <= 768;
}

export function getOptimalCanvasSize(): { width: number; height: number } {
  if (typeof window === 'undefined') {
    return { width: 800, height: 600 };
  }

  const isMobile = isMobileDevice();
  
  if (isMobile) {
    // For mobile, use viewport dimensions but account for UI elements
    const width = Math.min(window.innerWidth, window.screen.width);
    const height = Math.min(window.innerHeight - 120, window.screen.height - 120); // Account for toolbar and browser UI
    
    return { width, height };
  } else {
    // For desktop, use full window size
    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }
}

export function setupMobileViewport() {
  if (typeof document === 'undefined') return;
  
  // Prevent zoom on double tap
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function (event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // Prevent pinch zoom
  document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
  });

  document.addEventListener('gesturechange', function (e) {
    e.preventDefault();
  });

  document.addEventListener('gestureend', function (e) {
    e.preventDefault();
  });
}