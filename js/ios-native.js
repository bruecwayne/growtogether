/**
 * ios-native.js — GrowTogether
 * Fixes and enhancements for the Capacitor iOS app.
 * Safe to load on all platforms; iOS-specific code is gated.
 */
(function () {
  'use strict';

  /* -------------------------------------------------------
     1. Real viewport height (fixes iOS 100vh / keyboard bug)
     Sets --real-vh CSS variable so CSS can use it.
  ------------------------------------------------------- */
  function setRealVh() {
    var vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--real-vh', vh + 'px');
  }
  setRealVh();
  window.addEventListener('resize', setRealVh, { passive: true });
  window.addEventListener('orientationchange', function () {
    // Brief delay lets the browser settle after rotation
    setTimeout(setRealVh, 200);
  }, { passive: true });

  /* -------------------------------------------------------
     2. Scroll focused input into view when keyboard opens
     Prevents the keyboard from covering the active field.
  ------------------------------------------------------- */
  var scrollTimer;
  function scrollInputIntoView(e) {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () {
      if (e.target && typeof e.target.scrollIntoView === 'function') {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 350); // wait for keyboard animation
  }
  document.addEventListener('focus', scrollInputIntoView, true);

  /* -------------------------------------------------------
     3. Prevent double-tap zoom on interactive elements
     iOS treats a quick double-tap as zoom; this blocks it
     without disabling pinch-to-zoom.
  ------------------------------------------------------- */
  var lastTap = 0;
  document.addEventListener('touchend', function (e) {
    var now = Date.now();
    var el = e.target;
    var isInteractive = el.matches && el.matches(
      'button, a, .btn, [role="button"], input[type="submit"], input[type="button"], .nav-link, .tab-btn, .filter-btn, .sidebar-link'
    );
    if (isInteractive && now - lastTap < 300) {
      e.preventDefault();
    }
    lastTap = now;
  }, { passive: false });

  /* -------------------------------------------------------
     4. Fix position:fixed during iOS keyboard open
     When a keyboard appears, fixed elements can jump.
     This adds a CSS class to body so you can compensate.
  ------------------------------------------------------- */
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) {
    document.documentElement.classList.add('ios');

    var initialWindowHeight = window.innerHeight;
    window.addEventListener('resize', function () {
      if (window.innerHeight < initialWindowHeight - 100) {
        document.body.classList.add('keyboard-open');
      } else {
        document.body.classList.remove('keyboard-open');
        initialWindowHeight = window.innerHeight;
      }
    }, { passive: true });
  }

  /* -------------------------------------------------------
     5. Capacitor-specific enhancements
     Only runs when inside the native Capacitor shell.
  ------------------------------------------------------- */
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    var Capacitor = window.Capacitor;

    // a) Status bar — make it transparent / overlay
    if (Capacitor.Plugins && Capacitor.Plugins.StatusBar) {
      var StatusBar = Capacitor.Plugins.StatusBar;
      StatusBar.setOverlaysWebView({ overlay: true }).catch(function () {});
      StatusBar.setStyle({ style: 'DARK' }).catch(function () {});
    }

    // b) Splash screen — hide after page is ready
    if (Capacitor.Plugins && Capacitor.Plugins.SplashScreen) {
      var SplashScreen = Capacitor.Plugins.SplashScreen;
      window.addEventListener('load', function () {
        setTimeout(function () {
          SplashScreen.hide({ fadeOutDuration: 400 }).catch(function () {});
        }, 600);
      });
    }

    // c) Keyboard — scroll body up when keyboard opens so
    //    the focused field is never hidden
    if (Capacitor.Plugins && Capacitor.Plugins.Keyboard) {
      var Keyboard = Capacitor.Plugins.Keyboard;
      Keyboard.addListener('keyboardWillShow', function (info) {
        var focused = document.activeElement;
        if (focused && focused.scrollIntoView) {
          setTimeout(function () {
            focused.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }
      });
      Keyboard.addListener('keyboardDidHide', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // d) Back gesture / hardware back button — close modals first
    if (Capacitor.Plugins && Capacitor.Plugins.App) {
      Capacitor.Plugins.App.addListener('backButton', function () {
        // Close any open modal
        var modal = document.querySelector('.modal.active, .modal[style*="flex"], .modal[style*="block"]');
        if (modal) {
          var closeBtn = modal.querySelector('.modal-close, .close-btn, [data-close]');
          if (closeBtn) { closeBtn.click(); return; }
        }
        // Close mobile menu
        var mobileMenu = document.querySelector('.mobile-menu-overlay.active');
        if (mobileMenu) {
          var hamburger = document.querySelector('.hamburger');
          if (hamburger) { hamburger.click(); return; }
        }
        // Otherwise go back in history
        if (window.history.length > 1) {
          window.history.back();
        }
      });
    }
  }

  /* -------------------------------------------------------
     6. Haptic-style touch feedback (CSS class pulse)
     Adds a brief 'tapped' class so CSS can animate it.
  ------------------------------------------------------- */
  document.addEventListener('touchstart', function (e) {
    var el = e.target && e.target.closest('button, .btn, a, [role="button"]');
    if (!el) return;
    el.classList.add('tapped');
    setTimeout(function () { el.classList.remove('tapped'); }, 150);
  }, { passive: true });

})();
