/**
 * STACKLY SUPPLY CHAIN MANAGEMENT - JAVASCRIPT LOGIC
 * Strict constraints adhered to:
 * - No emojis
 * - No arrow marks
 * - No popups or toast notifications
 * - Smooth split preloader for Stackly branding
 * - Interactive shipment tracker
 * - Native WebP image loading directly from assets/
 */

(function () {
  'use strict';

  // =========================================================================
  // STACKLY NAVIGATION HISTORY MANAGER
  // Robust cross-page history tracking across desktop and mobile devices.
  // Prevents 404 loops, handles empty referrers, and ensures accurate return.
  // =========================================================================
  var StacklyNavigation = (function () {
    var STORAGE_STACK_KEY = 'stackly_nav_stack';
    var STORAGE_LAST_VALID_KEY = 'stackly_last_valid_page';
    var STORAGE_RETURN_PAGE = 'stackly_return_page';
    var STORAGE_RETURN_SCROLL = 'stackly_return_scroll';
    var STORAGE_RETURN_SECTION = 'stackly_return_section';
    var STORAGE_RESTORE_ACTIVE = 'stackly_restore_active';
    var STORAGE_BYPASS_PRELOADER = 'stackly_bypass_preloader';
    var MAX_STACK_SIZE = 30;

    var isNavigatingTo404 = false;
    var isNavigatingBack = false;

    // Helper: Extract clean relative file/path name from URL or pathname
    function getCleanPageName(urlOrPath) {
      if (!urlOrPath) return '';
      try {
        var str = String(urlOrPath).trim();
        str = str.split('?')[0].split('#')[0];
        str = str.replace(/\\/g, '/');
        var parts = str.split('/');
        var filename = parts[parts.length - 1] || '';
        if (!filename || filename === '') {
          return 'index.html';
        }
        return filename;
      } catch (e) {
        return 'index.html';
      }
    }

    // Helper: Check if a URL or filename represents a 404 error page
    function is404Page(urlOrFilename) {
      if (!urlOrFilename) return false;
      var clean = getCleanPageName(urlOrFilename).toLowerCase();
      return clean === '404.html' || clean === '404' || clean.indexOf('404') !== -1;
    }

    function getSessionItem(key) {
      try {
        return window.sessionStorage ? window.sessionStorage.getItem(key) : null;
      } catch (e) {
        return null;
      }
    }

    function setSessionItem(key, value) {
      try {
        if (window.sessionStorage) {
          window.sessionStorage.setItem(key, value);
        }
      } catch (e) {}
    }

    function removeSessionItem(key) {
      try {
        if (window.sessionStorage) {
          window.sessionStorage.removeItem(key);
        }
      } catch (e) {}
    }

    function getNavStack() {
      var raw = getSessionItem(STORAGE_STACK_KEY);
      if (!raw) return [];
      try {
        var parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }

    function saveNavStack(stack) {
      if (!Array.isArray(stack)) return;
      if (stack.length > MAX_STACK_SIZE) {
        stack = stack.slice(stack.length - MAX_STACK_SIZE);
      }
      setSessionItem(STORAGE_STACK_KEY, JSON.stringify(stack));
    }

    function getQueryParam(paramName) {
      try {
        if (typeof window.URLSearchParams !== 'undefined') {
          var params = new URLSearchParams(window.location.search);
          var val = params.get(paramName);
          if (val) return val;
        }
      } catch (e) {}
      try {
        var regex = new RegExp('[?&]' + paramName + '=([^&#]*)', 'i');
        var match = window.location.search.match(regex);
        return match ? decodeURIComponent(match[1].replace(/\+/g, ' ')) : null;
      } catch (e) {
        return null;
      }
    }

    function recordCurrentPage() {
      var currentPage = getCleanPageName(window.location.pathname);
      if (!currentPage) currentPage = 'index.html';

      if (is404Page(currentPage)) {
        // When on 404, capture return parameters from URL query string if present
        var fromParam = getQueryParam('from') || getQueryParam('ref');
        if (fromParam) {
          var cleanFrom = getCleanPageName(fromParam);
          if (cleanFrom && !is404Page(cleanFrom)) {
            setSessionItem(STORAGE_LAST_VALID_KEY, cleanFrom);
            setSessionItem(STORAGE_RETURN_PAGE, cleanFrom);
          }
        }
        var scrollParam = getQueryParam('scroll');
        if (scrollParam) {
          setSessionItem(STORAGE_RETURN_SCROLL, scrollParam);
        }
        var secParam = getQueryParam('section');
        if (secParam) {
          setSessionItem(STORAGE_RETURN_SECTION, secParam);
        }
        return;
      }

      // Valid non-404 page:
      var stack = getNavStack();
      var lastEntry = stack.length > 0 ? stack[stack.length - 1] : null;

      if (lastEntry !== currentPage) {
        stack.push(currentPage);
        saveNavStack(stack);
      }

      setSessionItem(STORAGE_LAST_VALID_KEY, currentPage);
      setSessionItem(STORAGE_RETURN_PAGE, currentPage);

      // Track live scroll position without overwriting during active restoration
      var recordScroll = function () {
        if (getSessionItem(STORAGE_RESTORE_ACTIVE) === 'true') return;
        var sy = Math.round(window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0);
        setSessionItem(STORAGE_RETURN_SCROLL, String(sy));
      };
      window.addEventListener('scroll', recordScroll, { passive: true });
    }

    function getPreviousPage() {
      // 1. Check explicit URL parameter
      var fromParam = getQueryParam('from') || getQueryParam('ref');
      if (fromParam) {
        var cleanFrom = getCleanPageName(fromParam);
        if (cleanFrom && !is404Page(cleanFrom)) {
          return cleanFrom;
        }
      }

      // 2. Check return page in sessionStorage
      var returnPage = getSessionItem(STORAGE_RETURN_PAGE);
      if (returnPage) {
        var cleanReturn = getCleanPageName(returnPage);
        if (cleanReturn && !is404Page(cleanReturn)) {
          return cleanReturn;
        }
      }

      // 3. Check document.referrer
      if (document.referrer) {
        var cleanRef = getCleanPageName(document.referrer);
        var currentClean = getCleanPageName(window.location.pathname);
        if (cleanRef && cleanRef !== currentClean && !is404Page(cleanRef)) {
          return cleanRef;
        }
      }

      // 4. Check sessionStorage navigation stack
      var stack = getNavStack();
      var currentCleanPath = getCleanPageName(window.location.pathname);

      for (var i = stack.length - 1; i >= 0; i--) {
        var page = stack[i];
        if (page && !is404Page(page) && page !== currentCleanPath) {
          return page;
        }
      }

      // 5. Check last valid page
      var lastValid = getSessionItem(STORAGE_LAST_VALID_KEY);
      if (lastValid) {
        var cleanLast = getCleanPageName(lastValid);
        if (cleanLast && !is404Page(cleanLast) && cleanLast !== currentCleanPath) {
          return cleanLast;
        }
      }

      return 'index.html';
    }

    function navigateTo404(trigger) {
      if (isNavigatingTo404) return;

      var currentClean = getCleanPageName(window.location.pathname);
      if (is404Page(currentClean)) {
        return;
      }

      isNavigatingTo404 = true;

      var fromTarget = currentClean || 'index.html';
      var scrollY = Math.round(window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0);

      var sectionId = '';
      if (trigger && trigger.nodeType === 1) {
        if (trigger.id && trigger.id !== 'app' && trigger.id !== 'root') {
          sectionId = trigger.id;
        } else {
          var container = trigger.closest('section[id], [id]');
          if (container && container.id && container.id !== 'app' && container.id !== 'root') {
            sectionId = container.id;
          }
        }
      }

      setSessionItem(STORAGE_RETURN_PAGE, fromTarget);
      setSessionItem(STORAGE_RETURN_SCROLL, String(scrollY));
      if (sectionId) {
        setSessionItem(STORAGE_RETURN_SECTION, sectionId);
      } else {
        removeSessionItem(STORAGE_RETURN_SECTION);
      }

      var dest = '404.html?from=' + encodeURIComponent(fromTarget) + '&scroll=' + scrollY;
      if (sectionId) {
        dest += '&section=' + encodeURIComponent(sectionId);
      }

      window.location.href = dest;
    }

    function goBack() {
      if (isNavigatingBack) return;

      var isCurrent404 = is404Page(window.location.pathname);

      if (!isCurrent404) {
        if (window.history && window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = 'index.html';
        }
        return;
      }

      isNavigatingBack = true;

      // 404 page: resolve exact originating page
      var targetPage = getPreviousPage();
      if (!targetPage || is404Page(targetPage)) {
        targetPage = 'index.html';
      }

      var scrollParam = getQueryParam('scroll');
      var targetScroll = scrollParam ? parseInt(scrollParam, 10) : NaN;
      if (isNaN(targetScroll)) {
        var storedScroll = getSessionItem(STORAGE_RETURN_SCROLL);
        if (storedScroll) {
          targetScroll = parseInt(storedScroll, 10);
        }
      }
      if (isNaN(targetScroll) || targetScroll < 0) {
        targetScroll = 0;
      }

      var targetSection = getQueryParam('section') || getSessionItem(STORAGE_RETURN_SECTION) || '';

      // Arm restoration state in sessionStorage
      setSessionItem(STORAGE_RESTORE_ACTIVE, 'true');
      setSessionItem('stackly_restore_page', targetPage);
      setSessionItem('stackly_restore_scroll', String(targetScroll));
      if (targetSection) {
        setSessionItem('stackly_restore_section', targetSection);
      } else {
        removeSessionItem('stackly_restore_section');
      }
      setSessionItem(STORAGE_BYPASS_PRELOADER, 'true');

      // Navigate directly to targetPage ensuring 100% accurate page return
      window.location.href = targetPage;
    }

    function applyScrollRestoration() {
      var isCurrent404 = is404Page(window.location.pathname);
      if (isCurrent404) return;

      var isRestoreActive = getSessionItem(STORAGE_RESTORE_ACTIVE) === 'true';
      if (!isRestoreActive) return;

      var restorePage = getSessionItem('stackly_restore_page');
      var currentClean = getCleanPageName(window.location.pathname);

      var isMatch = !restorePage || restorePage === currentClean ||
                    (restorePage === 'index.html' && (currentClean === '' || currentClean === 'index.html'));

      if (!isMatch) return;

      var targetScroll = parseInt(getSessionItem('stackly_restore_scroll') || '0', 10);
      var targetSection = getSessionItem('stackly_restore_section');

      // Fast-track and suppress preloader immediately
      var preloader = document.getElementById('preloader');
      if (preloader) {
        document.body.classList.add('loaded');
        preloader.style.display = 'none';
      }

      // Tell browser history not to overwrite custom scroll position
      if ('scrollRestoration' in window.history) {
        try {
          window.history.scrollRestoration = 'manual';
        } catch (e) {}
      }

      // Disable CSS smooth scroll temporarily so instant scrollTo is not delayed or cancelled by reflow
      var docEl = document.documentElement;
      var origBehavior = docEl.style.scrollBehavior;
      docEl.style.scrollBehavior = 'auto';

      function performScroll() {
        if (!isNaN(targetScroll) && targetScroll > 0) {
          window.scrollTo(0, targetScroll);
        } else if (targetSection) {
          var el = document.getElementById(targetSection);
          if (el) {
            var rect = el.getBoundingClientRect();
            var top = rect.top + (window.pageYOffset || docEl.scrollTop || 0);
            window.scrollTo(0, Math.max(0, top - 80));
          }
        }
      }

      // Execute across progressive layout render checkpoints
      performScroll();
      requestAnimationFrame(performScroll);
      setTimeout(performScroll, 20);
      setTimeout(performScroll, 80);
      setTimeout(performScroll, 200);
      setTimeout(performScroll, 400);
      setTimeout(performScroll, 700);
      setTimeout(performScroll, 1100);

      window.addEventListener('load', function () {
        performScroll();
        setTimeout(performScroll, 100);
        setTimeout(performScroll, 300);
      }, { once: true });

      // Clean up restoration flags after the page has fully stabilized (1400ms)
      setTimeout(function () {
        docEl.style.scrollBehavior = origBehavior;
        removeSessionItem(STORAGE_RESTORE_ACTIVE);
        removeSessionItem('stackly_restore_page');
        removeSessionItem('stackly_restore_scroll');
        removeSessionItem('stackly_restore_section');
        removeSessionItem(STORAGE_BYPASS_PRELOADER);
      }, 1400);
    }

    function enhance404Links() {
      var currentClean = getCleanPageName(window.location.pathname);
      if (is404Page(currentClean)) return;

      var links = document.querySelectorAll('a[href="404.html"], a[href*="404.html"]');
      links.forEach(function (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          navigateTo404(link);
        });
      });
    }

    function bindGoBackButtons() {
      var backButtons = document.querySelectorAll(
        '#btnGoBack, .btn-go-back, [data-action="go-back"], [data-action="back"]'
      );
      backButtons.forEach(function (btn) {
        if (btn.dataset.stacklyBackBound === 'true') return;
        btn.dataset.stacklyBackBound = 'true';

        var handleBack = function (e) {
          if (e) {
            e.preventDefault();
            e.stopPropagation();
          }
          goBack();
        };

        btn.addEventListener('click', handleBack);
        btn.addEventListener('touchend', function (e) {
          handleBack(e);
        }, { passive: false });
      });
    }

    function initDelegatedListeners() {
      document.addEventListener('click', function (e) {
        var backBtn = e.target.closest('#btnGoBack, .btn-go-back, [data-action="go-back"], [data-action="back"]');
        if (backBtn) {
          e.preventDefault();
          e.stopPropagation();
          goBack();
          return;
        }

        var link = e.target.closest('a');
        if (link) {
          var href = link.getAttribute('href');
          if (href && (href === '404.html' || href.indexOf('404.html') !== -1)) {
            e.preventDefault();
            navigateTo404(link);
          }
        }
      });
    }

    recordCurrentPage();

    return {
      init: function () {
        recordCurrentPage();
        enhance404Links();
        bindGoBackButtons();
        initDelegatedListeners();
        applyScrollRestoration();
      },
      recordCurrentPage: recordCurrentPage,
      getPreviousPage: getPreviousPage,
      goBack: goBack,
      navigateTo404: navigateTo404,
      enhance404Links: enhance404Links,
      bindGoBackButtons: bindGoBackButtons,
      applyScrollRestoration: applyScrollRestoration
    };
  })();

  // Expose globally for inline event handlers and cross-page access
  window.StacklyNavigation = StacklyNavigation;

  window.addEventListener('pageshow', function () {
    StacklyNavigation.recordCurrentPage();
    StacklyNavigation.applyScrollRestoration();
  });

  // --- 0. LENIS SMOOTH SCROLL INTEGRATION ---
  function initLenisScroll() {
    if (typeof Lenis === 'undefined') return;
    if (window.lenis && typeof window.lenis.destroy === 'function') {
      try { window.lenis.destroy(); } catch (e) {}
    }

    var dashboardContainer = document.querySelector('.dashboard-main');
    var isDashboard = !!dashboardContainer;

    var lenisOptions = {
      duration: 1.15,
      easing: function (t) {
        return Math.min(1, 1.001 - Math.pow(2, -10 * t));
      },
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
      infinite: false,
      autoResize: true
    };

    if (isDashboard) {
      document.documentElement.classList.add('lenis-dashboard-page');
      lenisOptions.wrapper = dashboardContainer;
      lenisOptions.content = dashboardContainer;
    }

    var lenis = new Lenis(lenisOptions);
    window.lenis = lenis;

    // Harmonious GSAP and ScrollTrigger integration
    if (window.gsap) {
      if (window.ScrollTrigger) {
        lenis.on('scroll', window.ScrollTrigger.update);
      }
      window.gsap.ticker.add(function (time) {
        lenis.raf(time * 1000);
      });
      if (typeof window.gsap.ticker.lagSmoothing === 'function') {
        window.gsap.ticker.lagSmoothing(0);
      }
    } else {
      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }

    // Smooth scroll for internal hash anchor links on current page
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href*="#"]');
      if (!link) return;

      var href = link.getAttribute('href');
      if (!href || href === '#' || href === '#!' || href.indexOf('#') === -1) return;

      // Verify the link belongs to the current page
      var linkUrl;
      try {
        linkUrl = new URL(link.href, window.location.href);
      } catch (err) {
        return;
      }
      if (linkUrl.pathname !== window.location.pathname) {
        return;
      }

      var targetId = href.split('#')[1];
      if (!targetId) return;

      var targetEl = document.getElementById(targetId);
      if (targetEl) {
        e.preventDefault();
        var navOffset = isDashboard ? -20 : -85;
        lenis.scrollTo(targetEl, {
          offset: navOffset,
          duration: 1.15
        });
      }
    });

    // Handle full-screen mobile drawers: pause Lenis while drawer is open
    var drawerSelectors = [
      '#mobileNavDrawer',
      '.services-mobile-drawer',
      '.about-mobile-drawer',
      '.login-mobile-drawer',
      '.signup-mobile-drawer',
      '.contact-mobile-drawer',
      '.blog-mobile-drawer',
      '.dashboard-sidebar'
    ];

    drawerSelectors.forEach(function (sel) {
      var d = document.querySelector(sel);
      if (d) {
        var obs = new MutationObserver(function () {
          var isOpen = d.classList.contains('open') || d.classList.contains('is-open');
          if (isOpen) {
            lenis.stop();
          } else {
            lenis.start();
          }
        });
        obs.observe(d, { attributes: true, attributeFilter: ['class'] });
      }
    });

    // Resize Lenis when window loads or images finish rendering
    window.addEventListener('load', function () {
      setTimeout(function () {
        lenis.resize();
      }, 600);
    });

    var preloader = document.getElementById('preloader');
    if (preloader) {
      var pObs = new MutationObserver(function () {
        if (document.body.classList.contains('loaded')) {
          pObs.disconnect();
          setTimeout(function () {
            lenis.resize();
          }, 350);
        }
      });
      pObs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
  }

  // --- 1. PRELOADER LOGIC: Stackly separates left and right smoothly ---
  function initPreloader() {
    var isDashboard = window.location.pathname.indexOf('dashboard') !== -1;
    if (isDashboard) {
      sessionStorage.setItem('stackly_dashboard_session', 'active');
    }

    var preloader = document.getElementById('preloader');
    if (!preloader) return;

    if (sessionStorage.getItem('stackly_bypass_preloader') === 'true') {
      sessionStorage.removeItem('stackly_bypass_preloader');
      document.body.classList.add('loaded');
      preloader.style.display = 'none';
      return;
    }

    if (document.documentElement.classList.contains('no-preloader')) {
      document.body.classList.add('loaded');
      preloader.style.display = 'none';
      return;
    }

    window.addEventListener('pageshow', function (event) {
      if (event.persisted) {
        document.body.classList.add('loaded');
        if (preloader) preloader.style.display = 'none';
      }
    });

    window.addEventListener('load', function () {
      setTimeout(function () {
        document.body.classList.add('loaded');
        setTimeout(function () {
          if (preloader) {
            preloader.style.display = 'none';
          }
        }, 1150);
      }, 500);
    });

    setTimeout(function () {
      document.body.classList.add('loaded');
      setTimeout(function () {
        if (preloader) preloader.style.display = 'none';
      }, 1150);
    }, 2500);
  }

  // --- 2. FULL-SCREEN MOBILE NAVIGATION OVERLAY ---
  function initMobileMenu() {
    var toggleBtn = document.getElementById('mobileMenuToggle');
    var drawer = document.getElementById('mobileNavDrawer');
    if (!drawer) return;

    function openMenu() {
      // Only open when at mobile viewport (768px and below)
      if (window.innerWidth > 768) return;
      drawer.classList.add('open');
      if (toggleBtn) {
        toggleBtn.classList.add('open');
        toggleBtn.setAttribute('aria-expanded', 'true');
      }
      document.body.classList.add('mobile-menu-active');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      drawer.classList.remove('open');
      if (toggleBtn) {
        toggleBtn.classList.remove('open');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
      document.body.classList.remove('mobile-menu-active');
      document.body.style.overflow = '';
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (drawer.classList.contains('open')) {
          closeMenu();
        } else {
          openMenu();
        }
      });
    }

    // Close button inside the drawer header (the cross mark symbol on the right)
    var closeBtns = drawer.querySelectorAll('.mobile-drawer-close, #mobileDrawerClose');
    closeBtns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeMenu();
      });
    });

    // Close when clicking any link inside drawer (navigates cleanly and restores page state)
    var drawerLinks = drawer.querySelectorAll('a');
    drawerLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        closeMenu();
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('open')) {
        closeMenu();
      }
    });

    // Automatically close menu when resizing from mobile to desktop (> 768px)
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) {
        if (drawer.classList.contains('open') || (toggleBtn && toggleBtn.classList.contains('open'))) {
          closeMenu();
        }
        document.body.classList.remove('mobile-menu-active');
        document.body.style.overflow = '';
      }
    });

    // Guarantee closed state on page show (including back/forward restoration)
    window.addEventListener('pageshow', function () {
      closeMenu();
    });
  }

  // --- 3. SHIPMENT TRACKER (Navigates to 404 Page on Click or Enter) ---
  function initTracker() {
    var trackBtn = document.getElementById('btnTrack');
    var trackInput = document.getElementById('trackInput');

    if (trackBtn) {
      trackBtn.addEventListener('click', function (e) {
        e.preventDefault();
        StacklyNavigation.navigateTo404();
      });
    }

    if (trackInput) {
      trackInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          StacklyNavigation.navigateTo404();
        }
      });
    }
  }

  // --- 4. FIXED NAVBAR SCROLL LISTENER ---
  function initFixedNavbar() {
    var header = document.querySelector('.site-header, .contact-header-wrap, .about-header-wrap, .services-header-wrap, .blog-header-wrap, #siteHeader');
    if (!header) return;

    function handleScroll() {
      if (window.scrollY > 8) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  // --- 5. HERO 5-IMAGE BACKGROUND CAROUSEL (2 SECONDS CYCLE) ---
  function initHeroBgCarousel() {
    var carousel = document.getElementById('heroBgCarousel');
    if (!carousel) return;
    var slides = carousel.querySelectorAll('.hero-bg-slide');
    if (!slides || slides.length <= 1) return;

    var currentIndex = 0;
    var totalSlides = slides.length;

    setInterval(function () {
      slides[currentIndex].classList.remove('active');
      currentIndex = (currentIndex + 1) % totalSlides;
      slides[currentIndex].classList.add('active');
    }, 2000);
  }

  // --- 6. DASHBOARD DYNAMIC USER PROFILE & WELCOME NOTE ---
  function initDashboardUser() {
    var profileContainer = document.getElementById('topbarProfileContainer');
    var profileBtn = document.getElementById('profileBtn');
    var profileDropdown = document.getElementById('profileDropdown');

    // Retrieve saved user info from sessionStorage, localStorage, or defaults
    var savedName = (window.sessionStorage && sessionStorage.getItem('stackly_user_name')) ||
                    (window.localStorage && localStorage.getItem('stackly_user_name')) ||
                    'Mahendra Sabari';
    var savedEmail = (window.sessionStorage && sessionStorage.getItem('stackly_user_email')) ||
                     (window.localStorage && localStorage.getItem('stackly_user_email')) ||
                     'mahendra.sabari@gmail.com';
    var savedRole = (window.sessionStorage && sessionStorage.getItem('stackly_user_role')) ||
                    (window.localStorage && localStorage.getItem('stackly_user_role'));

    // Compute Initials: e.g. "Kumar Saravanan" yields "KS", "Mahendra Sabari" yields "MS"
    function getInitials(name) {
      if (!name || typeof name !== 'string') return 'MS';
      var words = name.trim().split(/\s+/).filter(Boolean);
      if (words.length === 0) return 'MS';
      if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }

    var initials = getInitials(savedName);

    // Update Welcome Banner on first dashboard section
    var welcomeUserNameElements = document.querySelectorAll('.user-display-name, #welcomeUserName');
    welcomeUserNameElements.forEach(function (el) {
      el.textContent = savedName;
    });

    var welcomeHeadings = document.querySelectorAll('.welcome-heading');
    welcomeHeadings.forEach(function (heading) {
      if (heading.textContent.indexOf('Welcome') !== -1) {
        var userSpan = heading.querySelector('.user-display-name');
        if (userSpan) {
          userSpan.textContent = savedName;
        } else if (heading.getAttribute('data-letters-animated') === 'true') {
          heading.innerHTML = 'Welcome, <span class="user-display-name">' + savedName + '</span>';
          heading.removeAttribute('data-letters-animated');
          if (typeof renderLettersAnimation === 'function') {
            renderLettersAnimation(heading, 'Welcome, ' + savedName);
          }
        }
      }
    });

    // Update Topbar Profile Name and Initials
    var topbarName = document.getElementById('topbarName');
    if (topbarName) topbarName.textContent = savedName;

    var avatarEls = document.querySelectorAll('#profileAvatar, #dropdownAvatar, #sidebarAvatar, .profile-avatar-circle, .dropdown-avatar-circle, .sidebar-user-avatar');
    avatarEls.forEach(function (el) {
      el.textContent = initials;
    });

    var dropdownName = document.getElementById('dropdownName');
    if (dropdownName) dropdownName.textContent = savedName;

    var dropdownEmail = document.getElementById('dropdownEmail');
    if (dropdownEmail) dropdownEmail.textContent = savedEmail;

    var sidebarName = document.getElementById('sidebarName');
    if (sidebarName) sidebarName.textContent = savedName;

    var sidebarEmail = document.getElementById('sidebarEmail');
    if (sidebarEmail) sidebarEmail.textContent = savedEmail;

    // Update Role badges in profile dropdown and views
    if (savedRole) {
      var dropdownRoles = document.querySelectorAll('.dropdown-badge-role');
      dropdownRoles.forEach(function (el) {
        el.textContent = savedRole;
      });
      var roleDisplays = document.querySelectorAll('.sidebar-user-role, .user-display-role');
      roleDisplays.forEach(function (el) {
        el.textContent = savedRole;
      });
    }

    // Sidebar Sign Out Button
    var btnSidebarSignout = document.getElementById('btnSidebarSignout');
    if (btnSidebarSignout && !btnSidebarSignout.hasAttribute('data-bound')) {
      btnSidebarSignout.setAttribute('data-bound', 'true');
      btnSidebarSignout.addEventListener('click', function (e) {
        e.preventDefault();
        sessionStorage.removeItem('stackly_dashboard_session');
        window.location.href = 'login.html';
      });
    }

    // Profile Dropdown Toggle
    if (profileBtn && profileDropdown && !profileBtn.hasAttribute('data-bound')) {
      profileBtn.setAttribute('data-bound', 'true');
      profileBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = profileDropdown.classList.toggle('show');
        profileBtn.classList.toggle('active', isOpen);
        profileBtn.setAttribute('aria-expanded', isOpen);
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', function (e) {
        if (!profileContainer || !profileContainer.contains(e.target)) {
          profileDropdown.classList.remove('show');
          profileBtn.classList.remove('active');
          profileBtn.setAttribute('aria-expanded', 'false');
        }
      });

      // Close dropdown on Escape key
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && profileDropdown.classList.contains('show')) {
          profileDropdown.classList.remove('show');
          profileBtn.classList.remove('active');
          profileBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  // --- 8. TRUSTED BY PLANNERS PILLS & TESTIMONIAL CASE LINKS ---
  function initTrustedPills() {
    var pills = document.querySelectorAll('.client-badge-pill[data-target], .company-case-link[data-target]');
    if (!pills || pills.length === 0) return;

    pills.forEach(function (pill) {
      pill.addEventListener('click', function (e) {
        e.preventDefault();
        var targetId = pill.getAttribute('data-target');
        var targetCard = document.getElementById(targetId);
        if (!targetCard) return;

        // Active state for pills
        pills.forEach(function (p) { p.classList.remove('active'); });
        pill.classList.add('active');

        // Smooth scroll considering fixed navbar header offset
        var headerOffset = 105;
        var elementPosition = targetCard.getBoundingClientRect().top;
        var offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        // Trigger pulsating highlight on target card
        targetCard.classList.remove('card-highlight');
        void targetCard.offsetWidth; // trigger reflow
        targetCard.classList.add('card-highlight');

        setTimeout(function () {
          targetCard.classList.remove('card-highlight');
        }, 2600);
      });
    });
  }

  // --- 9. ABOUT SECTION SCROLL-TRIGGERED ANIMATIONS ---
  function initAboutSectionAnimation() {
    var aboutSection = document.getElementById('about');
    if (!aboutSection) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            aboutSection.classList.add('in-view');
          } else {
            aboutSection.classList.remove('in-view');
          }
        });
      }, { threshold: 0.12 });

      observer.observe(aboutSection);
    } else {
      aboutSection.classList.add('in-view');
    }
  }

  // --- 10. SECTION 3: CASE CARDS SHUFFLE & VIEW ALL PROJECTS ---
  function initCaseCardsShuffle() {
    var casesSection = document.getElementById('cases');
    var grid = document.getElementById('casesCardsGrid');
    var viewBtn = document.getElementById('btnViewAllProjects');
    if (!grid) return;

    var cards = Array.from(grid.querySelectorAll('.case-card'));
    if (cards.length < 4) return;

    // Target sequence specified by user:
    // 1: Kestrel, 2: Halden, 3: Bluepine, 4: Norvale
    var targetIds = ['case-kestrel', 'case-halden', 'case-bluepine', 'case-norvale'];

    var hasShuffled = false;

    function shuffleCards() {
      // If already arranged, reset temporarily to initial order so shuffle plays visibly
      var currentOrder = Array.from(grid.children).map(function (c) { return c.id; });
      if (currentOrder.join(',') === targetIds.join(',')) {
        ['case-bluepine', 'case-norvale', 'case-kestrel', 'case-halden'].forEach(function (id) {
          var el = document.getElementById(id);
          if (el) grid.appendChild(el);
        });
      }

      // 1. Record initial bounding rects of all cards
      var firstRects = new Map();
      cards.forEach(function (card) {
        firstRects.set(card, card.getBoundingClientRect());
        card.classList.remove('in-view');
        card.classList.add('is-shuffling');
      });

      // 2. Re-order DOM elements into target order: Kestrel, Halden, Bluepine, Norvale
      targetIds.forEach(function (id) {
        var card = document.getElementById(id);
        if (card) {
          grid.appendChild(card);
        }
      });

      // 3. Calculate FLIP deltas and invert positions
      cards.forEach(function (card) {
        var first = firstRects.get(card);
        var last = card.getBoundingClientRect();
        var dx = first.left - last.left;
        var dy = first.top - last.top;

        card.style.transition = 'none';
        var tilt = (card.id === 'case-kestrel' ? -3 : (card.id === 'case-halden' ? 2.5 : (card.id === 'case-bluepine' ? -2.5 : 3)));
        card.style.transform = 'translate(' + dx + 'px, ' + dy + 'px) scale(1.04) rotate(' + tilt + 'deg)';
      });

      // Force layout reflow
      void grid.offsetHeight;

      // 4. Play animation: glide cards to target positions
      requestAnimationFrame(function () {
        cards.forEach(function (card) {
          card.style.transition = 'transform 0.85s cubic-bezier(0.22, 1, 0.36, 1.15), box-shadow 0.85s ease';
          card.style.transform = 'translate(0, 0) scale(1) rotate(0deg)';
        });

        // Trigger image wrap-like unfold & typography entrance
        setTimeout(function () {
          cards.forEach(function (card) {
            card.classList.remove('is-shuffling');
            card.classList.add('in-view');
          });
        }, 320);
      });
    }

    // Scroll Observer: automatically trigger shuffle & card reveal when scrolled into view (bidirectional)
    if ('IntersectionObserver' in window && casesSection) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (!hasShuffled) {
              hasShuffled = true;
              setTimeout(shuffleCards, 150);
            }
          } else {
            hasShuffled = false;
            cards.forEach(function (card) {
              card.classList.remove('in-view');
            });
          }
        });
      }, { threshold: 0.12 });

      observer.observe(casesSection);
    } else {
      setTimeout(shuffleCards, 400);
    }

    // "View all projects" button click:
    // Displays the four cards, scrolls smoothly to them, and re-triggers the shuffle sequence
    if (viewBtn) {
      viewBtn.addEventListener('click', function (e) {
        e.preventDefault();

        // Smooth scroll to cards grid with header offset
        var headerOffset = 110;
        var gridPosition = grid.getBoundingClientRect().top;
        var offsetPosition = gridPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        // Trigger shuffle sequence to display and spotlight the cards
        setTimeout(function () {
          shuffleCards();
        }, 150);
      });
    }
  }

  // --- 11. SECTION 4: SERVICES ENTRANCE ANIMATION ON SCROLL ---
  function initServicesAnimation() {
    var servicesSection = document.getElementById('services');
    if (!servicesSection) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            servicesSection.classList.add('in-view');
          } else {
            servicesSection.classList.remove('in-view');
          }
        });
      }, { threshold: 0.12 });

      observer.observe(servicesSection);
    } else {
      servicesSection.classList.add('in-view');
    }
  }

  // --- 12. SECTION 5: LIVE TRACKING ANIMATION ON SCROLL ---
  function initLiveTrackingAnimation() {
    var trackingSection = document.getElementById('live-tracking');
    if (!trackingSection) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            trackingSection.classList.add('in-view');
          } else {
            trackingSection.classList.remove('in-view');
          }
        });
      }, { threshold: 0.12 });

      observer.observe(trackingSection);
    } else {
      trackingSection.classList.add('in-view');
    }
  }

  // --- 13. SECTION 6: BY THE NUMBERS (LIVE RUN & DIRECTIONAL CARDS) ---
  function initNumbersSectionAnimation() {
    var numbersSection = document.getElementById('numbers');
    if (!numbersSection) return;

    var counters = numbersSection.querySelectorAll('.num-counter');
    var hasAnimated = false;

    function runCounters() {
      if (hasAnimated) return;
      hasAnimated = true;

      counters.forEach(function (counter) {
        var target = parseFloat(counter.getAttribute('data-target')) || 0;
        var decimals = parseInt(counter.getAttribute('data-decimals'), 10) || 0;
        var suffix = counter.getAttribute('data-suffix') || '';
        var duration = 1800; // ms
        var startTime = null;

        // Reset to initial 0 before running
        counter.textContent = (0).toFixed(decimals) + suffix;

        function step(timestamp) {
          if (!startTime) startTime = timestamp;
          var elapsed = timestamp - startTime;
          var progress = Math.min(elapsed / duration, 1);

          // Smooth cubic ease-out progression
          var ease = 1 - Math.pow(1 - progress, 3);
          var currentVal = ease * target;

          counter.textContent = currentVal.toFixed(decimals) + suffix;

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            counter.textContent = target.toFixed(decimals) + suffix;
          }
        }

        requestAnimationFrame(step);
      });
    }

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            numbersSection.classList.add('in-view');
            setTimeout(runCounters, 150);
          } else {
            numbersSection.classList.remove('in-view');
            hasAnimated = false;
          }
        });
      }, { threshold: 0.15 });

      observer.observe(numbersSection);
    } else {
      numbersSection.classList.add('in-view');
      runCounters();
    }
  }

  // --- 14. SECTION 7: HOW IT WORKS / LIVE IN FOUR STEPS (ZIGZAG TIMELINE) ---
  function initStepsSectionAnimation() {
    var stepsSection = document.getElementById('how-it-works');
    if (!stepsSection) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            stepsSection.classList.add('in-view');
          } else {
            stepsSection.classList.remove('in-view');
          }
        });
      }, { threshold: 0.12 });

      observer.observe(stepsSection);
    } else {
      stepsSection.classList.add('in-view');
    }
  }

  // --- 15. SECTION 8: INDUSTRIES (SEQUENTIAL 1-BY-1 ENTRANCE) ---
  function initIndustriesSectionAnimation() {
    var industriesSection = document.getElementById('industries');
    if (!industriesSection) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            industriesSection.classList.add('in-view');
          } else {
            industriesSection.classList.remove('in-view');
          }
        });
      }, { threshold: 0.12 });

      observer.observe(industriesSection);
    } else {
      industriesSection.classList.add('in-view');
    }
  }

  // --- 16. SECTION 9: TESTIMONIALS (DIRECTIONAL 3-WAY ENTRANCE) ---
  function initTestimonialsSectionAnimation() {
    var testimonialsSection = document.getElementById('testimonials');
    if (!testimonialsSection) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            testimonialsSection.classList.add('in-view');
          } else {
            testimonialsSection.classList.remove('in-view');
          }
        });
      }, { threshold: 0.12 });

      observer.observe(testimonialsSection);
    } else {
      testimonialsSection.classList.add('in-view');
    }
  }

  // --- 17. SECTION 10: FROM THE BLOG (DIRECTIONAL 3-WAY ENTRANCE & 404 ROUTING) ---
  function initBlogSectionAnimation() {
    var blogSection = document.getElementById('blog');
    if (!blogSection) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            blogSection.classList.add('in-view');
          } else {
            blogSection.classList.remove('in-view');
          }
        });
      }, { threshold: 0.12 });

      observer.observe(blogSection);
    } else {
      blogSection.classList.add('in-view');
    }

    // Direct click handler for "Read article" links and "All articles" button to route cleanly to 404.html
    var blogLinks = blogSection.querySelectorAll('.blog-link, .btn-blog-all');
    blogLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        StacklyNavigation.navigateTo404();
      });
    });
  }

  // --- 18. SECTION 11: FAQ / BEFORE YOU SIGN (ALTERNATING DIRECTIONAL ENTRANCE, REPLAY & HOVER) ---
  function initFaqSectionAnimation() {
    var faqSections = document.querySelectorAll(
      '#faq, #questions, .faq-section, .questions-section-wrap'
    );
    if (!faqSections || faqSections.length === 0) return;

    faqSections.forEach(function (sec) {
      if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              sec.classList.add('in-view');
            } else {
              sec.classList.remove('in-view');
              cards.forEach(function (card) { card.classList.remove('animation-done'); });
            }
          });
        }, { threshold: 0.1 });
        observer.observe(sec);
      } else {
        sec.classList.add('in-view');
      }

      // Add .animation-done when cards finish entering to allow clean 60fps hover interaction
      var cards = sec.querySelectorAll('.faq-card, .question-card');
      cards.forEach(function (card) {
        card.addEventListener('animationend', function () {
          card.classList.add('animation-done');
        });
      });

      // Interactive Replay: Clicking "BEFORE YOU SIGN." replays the letter and card animations
      var replayHeading = sec.querySelector(
        '.faq-heading-replay, .faq-title-anim, #questionsHeading, #faqTitle, .section-heading-lg'
      );
      if (replayHeading) {
        replayHeading.style.cursor = 'pointer';
        replayHeading.addEventListener('click', function () {
          sec.classList.remove('in-view');
          cards.forEach(function (card) { card.classList.remove('animation-done'); });
          void sec.offsetWidth; // Force reflow
          setTimeout(function () {
            sec.classList.add('in-view');
          }, 30);
        });
      }
    });
  }

  // --- 18B. SECTION 4: PRICING (LEFT, DOWN, RIGHT DIRECTIONAL ENTRANCES, 3D FLIP & 404 ROUTING) ---
  function initPricingSectionAnimation() {
    var pricingSection = document.getElementById('pricing');
    if (!pricingSection) return;

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            pricingSection.classList.add('in-view');
          } else {
            pricingSection.classList.remove('in-view');
            flipCards.forEach(function (card) { card.classList.remove('animation-done'); });
          }
        });
      }, { threshold: 0.1 });
      observer.observe(pricingSection);
    } else {
      pricingSection.classList.add('in-view');
    }

    // Clean up animation on outer cards when entrance finishes so 3D flip has no transform locks
    var flipCards = pricingSection.querySelectorAll('.pricing-card-flip-wrap');
    flipCards.forEach(function (card) {
      card.addEventListener('animationend', function () {
        card.classList.add('animation-done');
      });

      // Mobile/touch flip toggle support
      card.addEventListener('click', function (e) {
        if (e.target.closest('.btn-pricing-flipper-cta')) return;
        card.classList.toggle('is-flipped');
      });
    });

    // Ensure Choose Starter, Choose Growth, and Choose Enterprise navigate to 404.html
    var pricingButtons = pricingSection.querySelectorAll(
      '.btn-pricing-flipper-cta, .btn-pricing-outline, .btn-pricing-filled'
    );
    pricingButtons.forEach(function (btn) {
      btn.setAttribute('href', '404.html');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        StacklyNavigation.navigateTo404(btn);
      });
    });
  }

  // --- 19. CTA BANNER (RIGHT SIDE ENTRANCE, LETTER ANIMATION & 404 ROUTING ACROSS ALL 5 PAGES) ---
  function initCtaBannerAnimation() {
    var ctaSections = document.querySelectorAll(
      '#contact, #cta-banner, #newsletter, #faq, .cta-banner-wrap, .about-cta-banner-wrap, .blog-cta-banners-section, .cta-banner-section, .questions-section-wrap'
    );
    if (!ctaSections || ctaSections.length === 0) return;

    ctaSections.forEach(function (sec) {
      if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              sec.classList.add('in-view');
              setTimeout(function () {
                var c = sec.querySelectorAll('.cta-banner-card, .cta-mint-banner-card, .about-cta-mint-card, .mint-banner-card');
                c.forEach(function (card) { card.classList.add('animation-done'); });
              }, 1100);
            } else {
              sec.classList.remove('in-view');
              var c = sec.querySelectorAll('.cta-banner-card, .cta-mint-banner-card, .about-cta-mint-card, .mint-banner-card');
              c.forEach(function (card) { card.classList.remove('animation-done'); });
            }
          });
        }, { threshold: 0.05 });
        observer.observe(sec);
      } else {
        sec.classList.add('in-view');
        setTimeout(function () {
          var c = sec.querySelectorAll('.cta-banner-card, .cta-mint-banner-card, .about-cta-mint-card, .mint-banner-card');
          c.forEach(function (card) { card.classList.add('animation-done'); });
        }, 1100);
      }

      // Immediate/load viewport check fallback
      setTimeout(function () {
        var rect = sec.getBoundingClientRect();
        if (rect.top < window.innerHeight + 100) {
          sec.classList.add('in-view');
          setTimeout(function () {
            var c = sec.querySelectorAll('.cta-banner-card, .cta-mint-banner-card, .about-cta-mint-card, .mint-banner-card');
            c.forEach(function (card) { card.classList.add('animation-done'); });
          }, 1100);
        }
      }, 120);

      // Clear animation property when finished for clean hover state
      var cards = sec.querySelectorAll(
        '.cta-banner-card, .cta-mint-banner-card, .about-cta-mint-card, .mint-banner-card'
      );
      cards.forEach(function (card) {
        card.addEventListener('animationend', function () {
          card.classList.add('animation-done');
        });
      });

      // Interactive Replay: clicking heading or eyebrow replays the animation
      var heading = sec.querySelector(
        '.cta-banner-heading, .cta-banner-title, .about-cta-heading, .mint-banner-heading'
      );
      if (heading) {
        heading.style.cursor = 'pointer';
        heading.addEventListener('click', function () {
          sec.classList.remove('in-view');
          cards.forEach(function (card) { card.classList.remove('animation-done'); });
          void sec.offsetWidth;
          setTimeout(function () {
            sec.classList.add('in-view');
            setTimeout(function () {
              cards.forEach(function (card) { card.classList.add('animation-done'); });
            }, 1100);
          }, 30);
        });
      }
    });

    // CTA banner buttons navigation: All CTA banner buttons navigate to 404.html
    var ctaButtons = document.querySelectorAll(
      '.btn-cta-banner, .btn-about-cta, .btn-cta-touch, a.btn-mint-card-action'
    );
    ctaButtons.forEach(function (btn) {
      btn.setAttribute('href', '404.html');
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        StacklyNavigation.navigateTo404(btn);
      });
    });
  }

  // --- 20. FOOTER 404 NAVIGATION LINKS ---
  function initFooter404Links() {
    var footer404Links = document.querySelectorAll(
      '.site-footer .social-icon-btn, .site-footer .footer-nav-col:nth-child(3) a, .site-footer .footer-legal-links a'
    );
    footer404Links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        StacklyNavigation.navigateTo404(link);
      });
    });
  }

  // --- 21. 404 PAGE GO BACK ACTION ---
  function init404GoBack() {
    StacklyNavigation.bindGoBackButtons();
  }

  // --- 22. DASHBOARD LETTERS ANIMATION: Letters slide in from right one by one ---
  function renderLettersAnimation(el, customText) {
    if (!el) return;
    var rawText = (typeof customText === 'string') ? customText.trim() : el.textContent.trim();
    if (!rawText) return;

    var words = rawText.split(/\s+/);
    var frag = document.createDocumentFragment();
    var charIndex = 0;

    words.forEach(function (word, wIdx) {
      var wordSpan = document.createElement('span');
      wordSpan.className = 'anim-word-unit';

      for (var i = 0; i < word.length; i++) {
        var charSpan = document.createElement('span');
        charSpan.className = 'anim-letter-right';
        charSpan.textContent = word[i];
        charSpan.style.setProperty('--delay', (charIndex * 0.02 + 0.03).toFixed(3) + 's');
        wordSpan.appendChild(charSpan);
        charIndex++;
      }

      frag.appendChild(wordSpan);

      if (wIdx < words.length - 1) {
        var spaceSpan = document.createElement('span');
        spaceSpan.className = 'anim-letter-space';
        spaceSpan.innerHTML = '&nbsp;';
        frag.appendChild(spaceSpan);
      }
    });

    el.innerHTML = '';
    el.appendChild(frag);
    el.classList.add('anim-letter-active');
    el.setAttribute('data-letters-animated', 'true');
  }

  // Expose globally for pages with letter-by-letter heading animations
  window.renderLettersAnimation = renderLettersAnimation;

  // Mobile dashboard short headings mapping
  var SHORT_DASHBOARD_HEADINGS = {
    'Overview & Stock Levels': 'Overview',
    'Quality Assurance Logs': 'Quality',
    'AI Predictive Models': 'AI Models',
    'Customs & Tariff': 'Customs',
    'Executive Audit & Exports': 'Executive Audit',
    'Overview & Ocean Manifests': 'Overview',
    'Live Waybill & Demurrage': 'Waybills',
    'Multi-Modal Route Pipeline': 'Routes',
    'Carrier Performance & SLA': 'Carriers',
    'Logistics Audit & Export': 'Logistics Audit'
  };

  function getShortDashboardHeading(title) {
    if (!title) return '';
    var trimmed = title.replace(/\s+/g, ' ').trim();
    if (SHORT_DASHBOARD_HEADINGS[trimmed]) {
      return SHORT_DASHBOARD_HEADINGS[trimmed];
    }
    var lower = trimmed.toLowerCase();
    for (var key in SHORT_DASHBOARD_HEADINGS) {
      if (key.toLowerCase() === lower) {
        return SHORT_DASHBOARD_HEADINGS[key];
      }
    }
    if (lower.indexOf('quality') !== -1) return 'Quality';
    if (lower.indexOf('executive audit') !== -1) return 'Executive Audit';
    if (lower.indexOf('stock') !== -1 || lower.indexOf('overview') !== -1) return 'Overview';
    if (lower.indexOf('customs') !== -1) return 'Customs';
    if (lower.indexOf('predictive') !== -1 || lower.indexOf('models') !== -1) return 'AI Models';
    if (lower.indexOf('waybill') !== -1 || lower.indexOf('demurrage') !== -1) return 'Waybills';
    if (lower.indexOf('route') !== -1 || lower.indexOf('pipeline') !== -1) return 'Routes';
    if (lower.indexOf('carrier') !== -1 || lower.indexOf('sla') !== -1) return 'Carriers';
    if (lower.indexOf('logistics audit') !== -1) return 'Logistics Audit';
    return trimmed;
  }

  function getHeadingForViewport(fullText, el) {
    var isMobile = window.innerWidth <= 768;
    if (isMobile) {
      if (el && el.getAttribute('data-short-title')) {
        return el.getAttribute('data-short-title');
      }
      return getShortDashboardHeading(fullText);
    }
    return fullText;
  }

  function initDashboardLetterAnimation() {
    var targets = document.querySelectorAll('.welcome-heading');
    if (!targets || targets.length === 0) return;

    targets.forEach(function (el) {
      if (el.getAttribute('data-letters-animated') === 'true') return;
      var text = el.textContent.trim();
      el.classList.add('anim-letter-active');
      renderLettersAnimation(el, text);
    });
  }

  // --- 23. DASHBOARD SIDEBAR HEADING & NAVBAR TITLE SYNC ---
  function initDashboardSidebarHeadingSync() {
    var topbarTitle = document.querySelector('.topbar-title');
    var navLinks = document.querySelectorAll('.sidebar-nav-link');
    if (!topbarTitle) return;

    // 1. Detect current page active link or match current URL path
    var activeLink = document.querySelector('.sidebar-nav-link.active');
    var currentFile = window.location.pathname.split('/').pop().toLowerCase();

    if (!activeLink && currentFile && navLinks.length > 0) {
      navLinks.forEach(function (link) {
        var href = (link.getAttribute('href') || '').toLowerCase();
        if (href && (href === currentFile || href.indexOf(currentFile) !== -1)) {
          activeLink = link;
          link.classList.add('active');
        }
      });
    }

    function syncNavbarHeading(linkEl) {
      if (!topbarTitle) return;
      var span = linkEl ? linkEl.querySelector('span') : null;
      var fullText = span ? span.textContent.trim() : (linkEl ? linkEl.textContent.trim() : '');
      if (!fullText) {
        fullText = topbarTitle.getAttribute('data-full-title') || topbarTitle.textContent.trim();
      }
      var shortText = linkEl ? linkEl.getAttribute('data-short-title') : null;
      if (!shortText) {
        shortText = topbarTitle.getAttribute('data-short-title') || getShortDashboardHeading(fullText);
      }

      topbarTitle.setAttribute('data-full-title', fullText);
      topbarTitle.setAttribute('data-short-title', shortText);

      var isMobile = window.innerWidth <= 768;
      var targetText = isMobile ? shortText : fullText;

      topbarTitle.textContent = targetText;
      topbarTitle.style.display = 'block';
      topbarTitle.style.opacity = '1';
      topbarTitle.style.visibility = 'visible';
    }

    // Sync navbar left-side heading with active sidebar heading or markup attributes
    if (activeLink) {
      syncNavbarHeading(activeLink);
    } else {
      var initialFull = topbarTitle.getAttribute('data-full-title') || topbarTitle.textContent.trim();
      var initialShort = topbarTitle.getAttribute('data-short-title') || getShortDashboardHeading(initialFull);
      topbarTitle.setAttribute('data-full-title', initialFull);
      topbarTitle.setAttribute('data-short-title', initialShort);
      var isMobile = window.innerWidth <= 768;
      topbarTitle.textContent = isMobile ? initialShort : initialFull;
      topbarTitle.style.display = 'block';
      topbarTitle.style.opacity = '1';
      topbarTitle.style.visibility = 'visible';
    }

    // 2. On click of any sidebar heading, instantly update navbar heading
    if (navLinks && navLinks.length > 0) {
      navLinks.forEach(function (link) {
        link.addEventListener('click', function () {
          navLinks.forEach(function (l) { l.classList.remove('active'); });
          link.classList.add('active');
          syncNavbarHeading(link);
        });
      });
    }

    // 3. Dynamic resize handler to toggle full vs short heading smoothly
    var headingResizeTimer = null;
    window.addEventListener('resize', function () {
      if (headingResizeTimer) clearTimeout(headingResizeTimer);
      headingResizeTimer = setTimeout(function () {
        if (!topbarTitle) return;
        var fullText = topbarTitle.getAttribute('data-full-title');
        var shortText = topbarTitle.getAttribute('data-short-title');
        if (!fullText) return;
        var isMobile = window.innerWidth <= 768;
        var expectedText = isMobile ? (shortText || getShortDashboardHeading(fullText)) : fullText;
        topbarTitle.textContent = expectedText;
        topbarTitle.style.display = 'block';
        topbarTitle.style.opacity = '1';
        topbarTitle.style.visibility = 'visible';
      }, 150);
    });
  }

  // --- 24. DASHBOARD DYNAMIC ANIMATIONS (Tables, Flow Nodes, KPI Cards, Pie Charts) ---
  function initDashboardDynamicAnimations() {
    // 1. Table rows: Row 1 comes first, row 2 second, row 3 third, row 4 fourth...
    var tables = document.querySelectorAll('.custom-dash-table');
    tables.forEach(function (table) {
      var rows = table.querySelectorAll('tbody tr');
      rows.forEach(function (row, idx) {
        row.style.animationDelay = (idx * 0.12 + 0.12).toFixed(2) + 's';
      });
    });

    // 2. Flow nodes: Tier 2, Tier 1, Central Hubs, Fulfillment Docks, Stores & Customers
    var flowContainers = document.querySelectorAll('.flow-nodes-row');
    flowContainers.forEach(function (flow) {
      var nodes = flow.querySelectorAll('.flow-node');
      nodes.forEach(function (node, idx) {
        node.style.animationDelay = (idx * 0.17 + 0.15).toFixed(2) + 's';
      });
    });
  }

  // --- 25. DASHBOARD MOBILE SIDEBAR DRAWER TOGGLE ---
  function initDashboardMobileSidebar() {
    var toggleBtn = document.getElementById('dashboardSidebarToggle');
    var sidebar = document.querySelector('.dashboard-sidebar');
    var closeBtn = document.getElementById('sidebarCloseBtn');
    if (!sidebar) return;

    if (toggleBtn) {
      toggleBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = sidebar.classList.toggle('open');
        toggleBtn.classList.toggle('open', isOpen);
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        sidebar.classList.remove('open');
        if (toggleBtn) toggleBtn.classList.remove('open');
      });
    }

    var navLinks = sidebar.querySelectorAll('.sidebar-nav-link');
    navLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        sidebar.classList.remove('open');
        if (toggleBtn) toggleBtn.classList.remove('open');
      });
    });

    document.addEventListener('click', function (e) {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
        sidebar.classList.remove('open');
        if (toggleBtn) toggleBtn.classList.remove('open');
      }
    });
  }

  // --- 26. WHITE HEADINGS LETTER ANIMATION & REPLAY SYSTEM ---
  function initWhiteHeadingsLetterAnimation() {
    var targets = document.querySelectorAll(
      '.white-heading-replay, .cta-heading-letters, .white-heading-letter-anim, .faq-heading-replay'
    );
    if (!targets || targets.length === 0) return;

    function triggerHeadingAnimation(el) {
      el.classList.remove('anim-letter-active');
      void el.offsetWidth;
      el.classList.add('anim-letter-active');

      var parentSec = el.closest('section, .cta-banner-wrap, .about-cta-banner-wrap');
      if (parentSec && !parentSec.classList.contains('in-view')) {
        parentSec.classList.add('in-view');
      }
    }

    targets.forEach(function (heading) {
      if ('IntersectionObserver' in window) {
        var obs = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              triggerHeadingAnimation(heading);
            } else {
              heading.classList.remove('anim-letter-active');
            }
          });
        }, { threshold: 0.1 });
        obs.observe(heading);
      } else {
        triggerHeadingAnimation(heading);
      }

      setTimeout(function () {
        var rect = heading.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          triggerHeadingAnimation(heading);
        }
      }, 100);

      heading.addEventListener('click', function () {
        triggerHeadingAnimation(heading);
      });
    });
  }

  // --- 27. INITIALIZE ALL COMPONENTS ---
  function initAll() {
    initLenisScroll();
    StacklyNavigation.init();
    initPreloader();
    initMobileMenu();
    initTracker();
    initFixedNavbar();
    initHeroBgCarousel();
    initDashboardUser();
    initDashboardLetterAnimation();
    initDashboardSidebarHeadingSync();
    initDashboardDynamicAnimations();
    initDashboardMobileSidebar();
    initTrustedPills();
    initAboutSectionAnimation();
    initCaseCardsShuffle();
    initServicesAnimation();
    initLiveTrackingAnimation();
    initNumbersSectionAnimation();
    initStepsSectionAnimation();
    initIndustriesSectionAnimation();
    initTestimonialsSectionAnimation();
    initBlogSectionAnimation();
    initFaqSectionAnimation();
    initPricingSectionAnimation();
    initCtaBannerAnimation();
    initWhiteHeadingsLetterAnimation();
    initFooter404Links();
    init404GoBack();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  // Ensure Lenis initializes even if script loaded with a small delay
  if (typeof Lenis === 'undefined') {
    var lenisPollCount = 0;
    var lenisPoll = setInterval(function () {
      lenisPollCount++;
      if (typeof Lenis !== 'undefined') {
        clearInterval(lenisPoll);
        initLenisScroll();
      } else if (lenisPollCount > 60) {
        clearInterval(lenisPoll);
      }
    }, 50);
  }

  window.addEventListener('pageshow', function () {
    initDashboardUser();
    if (window.lenis) {
      window.lenis.resize();
    }
  });
})();

