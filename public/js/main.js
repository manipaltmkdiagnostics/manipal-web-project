/* ================================================
   Manipal Tumkur Diagnostics - Main JS
   ================================================ */

/* ===========================
   CART STATE (localStorage-based)
=========================== */
const UI_ICONS = {
    package: '📦',
    time: '🕐',
    sample: '🧪',
    fasting: '🍽️',
    popular: '⭐',
    check: '✅'
};

function getCart() {
    try {
        return JSON.parse(localStorage.getItem('mtd_cart') || '[]');
    } catch (e) { return []; }
}

function setCart(cart) {
    localStorage.setItem('mtd_cart', JSON.stringify(cart));
}

function addToCart(test) {
    const cart = getCart();
    if (cart.find(c => c.id === test.id && c.itemType === test.itemType)) {
        showToast('Already in cart!', 'error');
        return;
    }
    cart.push(test);
    setCart(cart);
    updateCartUI();
    showToast(`${test.name} added to cart!`, 'success');
    const btn = document.querySelector(`.btn-cart[data-id="${test.id}"][data-item-type="${test.itemType}"]`);
    if (btn) { btn.textContent = '✅ Added'; btn.classList.add('added'); btn.disabled = true; }
}

function removeFromCart(testId, itemType = 'test') {
    let cart = getCart();
    cart = cart.filter(c => !(c.id === testId && c.itemType === itemType));
    setCart(cart);
    updateCartUI();
    const btn = document.querySelector(`.btn-cart[data-id="${testId}"][data-item-type="${itemType}"]`);
    if (btn) { btn.textContent = '+ Add to Cart'; btn.classList.remove('added'); btn.disabled = false; }
}

function updateCartUI() {
    const cart = getCart();
    const count = cart.length;
    const total = cart.reduce((s, t) => s + parseFloat(t.price), 0);

    // Update navbar badge
    const navBadge = document.getElementById('navCartBadge');
    if (navBadge) {
        navBadge.textContent = count;
        navBadge.classList.toggle('empty', count === 0);
    }

    // Update cart panel
    const cartSummary = document.getElementById('cartSummary');
    const cartItemsList = document.getElementById('cartItemsList');
    const cartItemCount = document.getElementById('cartItemCount');
    const cartTotalAmount = document.getElementById('cartTotalAmount');

    if (!cartItemsList) return;

    if (cartItemCount) cartItemCount.textContent = count;
    if (cartTotalAmount) cartTotalAmount.textContent = total.toLocaleString('en-IN');

    if (count > 0) {
        if (cartSummary) cartSummary.style.display = 'block';
        cartItemsList.innerHTML = cart.map(t => `
            <div class="cart-item">
                <div class="cart-item-icon">${t.itemType === 'package' ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.6 14.86a2 2 0 0 0 .4 1.14l2 4c.48.56 1.48.56 2 0l2-4a2 2 0 0 0 .4-1.14V7m-4-4V2m-2 0h6m-4 10h4"></path></svg>'}</div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${t.name}</div>
                    <div class="cart-item-cat">${t.category}</div>
                    <div class="cart-item-price">₹${t.price}</div>
                </div>
                <button class="cart-item-remove" data-remove-id="${t.id}" data-item-type="${t.itemType}" title="Remove"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
            </div>
        `).join('');
    } else {
        if (cartSummary) cartSummary.style.display = 'none';
        cartItemsList.innerHTML = `
            <div class="cart-empty-msg">
                <div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.5;margin-bottom:10px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg></div>
                <p>Your cart is empty. Add tests to get started!</p>
            </div>`;
    }
}

function openCart() {
    const overlay = document.getElementById('cartOverlay');
    if (overlay) {
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        const bookedMsg = document.getElementById('cartBookedMsg');
        const checkoutForm = document.getElementById('cartCheckoutForm');
        if (bookedMsg) bookedMsg.style.display = 'none';
        if (checkoutForm) checkoutForm.style.display = 'block';
    }
}

function closeCart() {
    const overlay = document.getElementById('cartOverlay');
    if (overlay) {
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    }
}

/* ===========================
   INJECT CART PANEL HTML
=========================== */
function injectCartPanel() {
    if (document.getElementById('cartOverlay')) return;

    const panelHTML = `
    <div class="cart-overlay" id="cartOverlay">
        <div class="cart-panel">
            <div class="cart-panel-header">
                <h3><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:10px;vertical-align:text-bottom;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>Your Cart</h3>
                <button class="cart-close-btn" id="cartCloseBtn" aria-label="Close cart" style="background:rgba(255,255,255,0.2); border:none; border-radius:4px; padding:4px 12px; cursor:pointer; color:inherit; font-weight:600; font-size:0.9rem; transition:background 0.2s;">Close</button>
            </div>
            <div class="cart-items-list" id="cartItemsList">
                <div class="cart-empty-msg">
                    <div class="empty-icon">�Y>'</div>
                    <p>Your cart is empty. Add tests to get started!</p>
                </div>
            </div>
            <div class="cart-summary" id="cartSummary" style="display:none;">
                <div class="cart-total-row">
                    <span class="cart-total-label">Total (<span id="cartItemCount">0</span> tests)</span>
                    <span class="cart-total-amount">₹<span id="cartTotalAmount">0</span></span>
                </div>
                <div class="cart-checkout-form" id="cartCheckoutForm">
                    <div class="form-group">
                        <label>Patient Name *</label>
                        <input type="text" id="cartPatientName" placeholder="Enter patient's full name">
                    </div>
                    <div class="form-group">
                        <label>Contact Number *</label>
                        <input type="tel" id="cartPhone" placeholder="10-digit mobile number" maxlength="10">
                    </div>
                                        <div class="form-group home-collection-group" style="margin-top:20px; margin-bottom:15px; padding:10px; background:#f0f9ff; border-radius:8px; border:1px solid #bae6fd;">
                        <label style="display:flex; align-items:center; cursor:pointer; gap:10px; margin:0;">
                            <input type="checkbox" id="cartHomeCollection" style="width:18px; height:18px; cursor:pointer;">
                            <span style="font-weight:600; color:#0369a1;">I want sample collection from home</span>
                        </label>
                    </div>
                    
                    <div id="homeCollectionFields" style="display:none; background:#f8fafc; padding:15px; border-radius:8px; margin-bottom:15px; border:1px solid #e2e8f0;">
                        <div class="form-group">
                            <label>Home Address *</label>
                            <textarea id="cartAddress" placeholder="Enter your full home address" rows="2" style="width:100%; border:1px solid #ccc; padding:8px; border-radius:4px; resize:vertical; font-family:inherit;"></textarea>
                        </div>
                        <div class="form-group" style="margin-bottom:0;">
                            <label>Google Maps Location Link <span style="font-weight:normal; color:#64748b;">(Optional)</span></label>
                            <input type="url" id="cartLocationLink" placeholder="Paste Google Maps link here" style="width:100%; border:1px solid #ccc; padding:8px; border-radius:4px; font-family:inherit;">
                        </div>
                    </div>
                    <button class="cart-book-btn" id="cartBookBtn" style="font-weight:600; padding:12px 20px;">Confirm Test</button>
                </div>
                <div class="cart-booked-msg" id="cartBookedMsg">
                    <div class="booked-icon"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:15px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></div>
                    <h4>Test Booked Successfully!</h4>
                    <p>Your test has been booked successfully. Our team will call you shortly to confirm your appointment.</p>
                    <button class="btn btn-primary btn-sm" id="cartClearAfterBook" style="margin-top:12px;">Continue Browsing</button>
                </div>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', panelHTML);

    document.getElementById('cartCloseBtn').addEventListener('click', closeCart);
    document.getElementById('cartOverlay').addEventListener('click', e => {
        if (e.target === document.getElementById('cartOverlay')) closeCart();
    });

    // Pre-fill patient info from localStorage
    const visitorName = localStorage.getItem('visitor_name');
    const visitorPhone = localStorage.getItem('visitor_phone');
    if (visitorName) document.getElementById('cartPatientName').value = visitorName;
    if (visitorPhone) document.getElementById('cartPhone').value = visitorPhone;

    document.getElementById('cartHomeCollection').addEventListener('change', function(e) {
        const fields = document.getElementById('homeCollectionFields');
        if (e.target.checked) {
            fields.style.display = 'block';
        } else {
            fields.style.display = 'none';
        }
    });

    document.getElementById('cartBookBtn').addEventListener('click', handleCartBooking);

    document.getElementById('cartClearAfterBook').addEventListener('click', () => {
        closeCart();
        const bookedMsg = document.getElementById('cartBookedMsg');
        const checkoutForm = document.getElementById('cartCheckoutForm');
        if (bookedMsg) bookedMsg.style.display = 'none';
        if (checkoutForm) checkoutForm.style.display = 'block';
    });
}

/* ===========================
   BOOKING FROM CART
=========================== */
async function handleCartBooking() {
    const cart = getCart();
    if (cart.length === 0) { showToast('Add at least one test to your cart', 'error'); return; }

    const name = document.getElementById('cartPatientName').value.trim();
    const phone = document.getElementById('cartPhone').value.trim();
    const homeCollection = document.getElementById('cartHomeCollection') ? document.getElementById('cartHomeCollection').checked : false;
    const address = document.getElementById('cartAddress') ? document.getElementById('cartAddress').value.trim() : '';
    const locationLink = document.getElementById('cartLocationLink') ? document.getElementById('cartLocationLink').value.trim() : '';

    if (!name) { showToast('Please enter patient name', 'error'); document.getElementById('cartPatientName').focus(); return; }
    if (!phone || !/^[0-9]{10}$/.test(phone)) { showToast('Enter a valid 10-digit contact number', 'error'); document.getElementById('cartPhone').focus(); return; }

    if (homeCollection && !address) {
        showToast('Please enter your home address', 'error');
        document.getElementById('cartAddress').focus();
        return;
    }

    const btn = document.getElementById('cartBookBtn');
    btn.disabled = true;
    btn.textContent = 'Booking...';

    try {
        const testNames = cart.map(t => t.name).join(', ');
        const primaryTest = cart[0];
        const notes = cart.length > 1 ? `Multiple tests requested: ${testNames}` : '';

        const res = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_name: name,
                phone,
                test_id: primaryTest.id,
                test_name: cart.length > 1 ? testNames : primaryTest.name,
                notes
,
                home_collection: homeCollection,
                address: address,
                location_link: locationLink
            })
        });

        if (res.ok) {
            document.getElementById('cartCheckoutForm').style.display = 'none';
            document.getElementById('cartBookedMsg').style.display = 'block';
            cart.forEach(t => {
                const cartBtn = document.querySelector(`.btn-cart[data-id="${t.id}"]`);
                if (cartBtn) { cartBtn.textContent = '+ Add to Cart'; cartBtn.classList.remove('added'); cartBtn.disabled = false; }
            });
            setCart([]);
            updateCartUI();
        } else {
            const err = await res.json();
            showToast(err.error || 'Booking failed. Please try again.', 'error');
            btn.disabled = false;
            btn.textContent = 'Confirm Test';
        }
    } catch (err) {
        showToast('Network error. Please try again.', 'error');
        btn.disabled = false;
        btn.textContent = 'Confirm Test';
    }
}

/* ------ Testimonial Infinite Slider ------ */
function initTestimonialSlider() {
    const track = document.getElementById('testimonialsTrack');
    if (!track) return;

    // Clone all existing cards and append them to the track
    // This creates a seamless loop — the CSS animation scrolls -50% then resets
    const cards = Array.from(track.children);
    cards.forEach(card => {
        const clone = card.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.appendChild(clone);
    });

    // Adjust animation duration based on total items (faster for fewer cards)
    const totalCards = track.children.length;
    const baseDuration = Math.max(20, totalCards * 3.5);
    track.style.animationDuration = `${baseDuration}s`;
}


/* ===========================
   INIT
=========================== */
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initAuthButton();
    initScrollAnimations();
    initFAQ();
    initTestimonialSlider();
    loadPopularTests();
    loadGallery();
    initHeroSearch();
    initStatCounters();
    initScrollControls('featuresScroll', 'featuresScrollLeft', 'featuresScrollRight');
    initScrollControls('categoriesScroll', 'categoriesScrollLeft', 'categoriesScrollRight');

    // Cart system
    injectCartPanel();
    updateCartUI();
});

/* ------ Auth Button (Sign In / Sign Out) ------ */
function initAuthButton() {
    const token = localStorage.getItem('admin_token');
    const userStr = localStorage.getItem('admin_user');

    const signInLink = document.querySelector('.nav-cta a[href="/admin/login.html"]');
    const footerAuthBtn = document.getElementById('footerAuthBtn');

    const handleSignOut = (e) => {
        e.preventDefault();
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/';
    };

    if (token && userStr) {
        fetch('/api/auth/me', { headers: { 'Authorization': 'Bearer ' + token } })
            .then(r => {
                if (r.ok) {
                    const user = JSON.parse(userStr);
                    if (signInLink) {
                        signInLink.href = '#';
                        signInLink.innerHTML = '🔐 Sign Out';
                        signInLink.title = 'Signed in as ' + (user.full_name || user.username);
                        signInLink.classList.remove('btn-outline');
                        signInLink.classList.add('btn-danger-outline');
                        signInLink.addEventListener('click', handleSignOut);
                    }
                    if (footerAuthBtn) {
                        footerAuthBtn.href = '#';
                        footerAuthBtn.innerHTML = 'Sign Out';
                        footerAuthBtn.addEventListener('click', handleSignOut);
                    }
                }
            })
            .catch(() => { });
    }
}

/* ------ Navbar ------ */
function initNavbar() {
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    const navbar = document.getElementById('navbar');

    if (toggle && links) {
        toggle.addEventListener('click', () => {
            links.classList.toggle('open');
            toggle.classList.toggle('active');
        });

        links.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                links.classList.remove('open');
                toggle.classList.remove('active');
            });
        });
    }

    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 20) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // Cart navbar button click
    const navCartBtn = document.getElementById('navCartBtn');
    if (navCartBtn) {
        navCartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openCart();
        });
    }
}

/* ------ Scroll Animations ------ */
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
}

/* ------ FAQ Accordion ------ */
function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', () => {
            const item = q.parentElement;
            const isActive = item.classList.contains('active');
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

/* ------ Testimonial Slider ------ */
function initTestimonialSlider() {
    const track = document.getElementById('testimonialsTrack');
    const prev = document.getElementById('prevSlide');
    const next = document.getElementById('nextSlide');

    if (!track || !prev || !next) return;

    let pos = 0;
    const cards = track.querySelectorAll('.testimonial-card');
    const cardWidth = 384;

    function slide(dir) {
        const maxPos = Math.max(0, (cards.length * cardWidth) - track.parentElement.offsetWidth);
        pos = Math.max(0, Math.min(pos + dir * cardWidth, maxPos));
        track.style.transform = `translateX(-${pos}px)`;
    }

    prev.addEventListener('click', () => slide(-1));
    next.addEventListener('click', () => slide(1));

    let autoSlide = setInterval(() => slide(1), 4000);
    track.parentElement.addEventListener('mouseenter', () => clearInterval(autoSlide));
    track.parentElement.addEventListener('mouseleave', () => {
        autoSlide = setInterval(() => slide(1), 4000);
    });
}

/* ------ Stat Counters ------ */
function initStatCounters() {
    const counters = document.querySelectorAll('.stat-number[data-target]');
    if (counters.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.target);
                animateCounter(el, target);
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
}

function animateCounter(el, target) {
    const duration = 2000;
    const start = performance.now();

    function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);
        el.textContent = current.toLocaleString() + '+';

        if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
}

/* ------ Popular Tests ------ */
async function loadPopularTests() {
    const packagesGrid = document.getElementById('packagesScroll');
    const testsGrid = document.getElementById('testsScroll');
    if (!packagesGrid || !testsGrid) return;

    try {
        const [testsRes, pkgsRes] = await Promise.all([
            fetch('/api/tests'),
            fetch('/api/health-packages')
        ]);
        
        const allTests = (await testsRes.json()).map(t => ({ ...t, itemType: 'test' }));
        const allPackages = (await pkgsRes.json()).map(p => ({ 
            ...p, 
            itemType: 'package',
            category: 'Health Package',
            is_popular: true 
        }));

        packagesGrid.innerHTML = allPackages.map(p => createTestCard(p)).join('');
        
        const popularTests = allTests.filter(t => t.is_popular);
        testsGrid.innerHTML = popularTests.slice(0, 10).map(t => createTestCard(t)).join('');

        initScrollControls('categoriesScroll', 'categoriesScrollLeft', 'categoriesScrollRight');
        initScrollControls('packagesScroll', 'packagesScrollLeft', 'packagesScrollRight');
        initScrollControls('testsScroll', 'testsScrollLeft', 'testsScrollRight');
    } catch (err) {
        packagesGrid.innerHTML = '<p style="text-align:center;color:var(--text-muted);">Failed to load packages</p>';
        testsGrid.innerHTML = '<p style="text-align:center;color:var(--text-muted);">Failed to load tests</p>';
    }
}

function createTestCard(t) {
    const discount = t.original_price ? Math.round((1 - t.price / t.original_price) * 100) : 0;
    const cart = getCart();
    const inCart = cart.find(c => c.id === t.id && c.itemType === t.itemType);
    
    let watermark = '';
    if (t.itemType === 'package') {
        watermark = `<div class="test-card-watermark" style="font-size:120px;opacity:0.04;display:flex;align-items:center;justify-content:center;height:100%;width:100%;">�Y"�</div>`;
    } else if (t.image_file) {
        watermark = `
            <div class="test-card-watermark" style="
                background-image: url('/uploads/test-images/${t.image_file}');
                width: ${t.image_standard_size ? '200px' : (t.image_max_width || 200) + 'px'};
                height: ${t.image_standard_size ? '200px' : (t.image_max_height || 200) + 'px'};
            "></div>
        `;
    }

    return `
        <div class="test-card ${t.itemType === 'package' ? 'package-card' : ''}" style="${t.itemType === 'package' ? 'border-top: 4px solid var(--primary);' : ''}">
          ${watermark}
          <div class="test-card-header">
            <span class="test-card-badge" style="${t.itemType === 'package' ? 'background:var(--primary);color:white;' : ''}">${t.category}</span>
            ${t.is_popular ? '<span style="color:var(--secondary);font-size:0.8rem;font-weight:600;">⭐ Popular</span>' : ''}
          </div>
          <h3>${t.name}</h3>
          <p>${(t.description || '').substring(0, 100)}${(t.description || '').length > 100 ? '...' : ''}</p>
          <div class="test-card-meta">
            <span>�Y.� ${t.turnaround_time || 'Same day'}</span>
            <span>�Y�� ${t.sample_type || 'Blood'}</span>
            ${t.fasting_required ? '<span>�Y��️ Fasting</span>' : ''}
          </div>
          <div class="test-card-footer">
            <div class="test-price">
              <span class="current">₹${t.price}</span>
              ${t.original_price ? `<span class="original">₹${t.original_price}</span>` : ''}
              ${discount > 0 ? `<span class="discount">${discount}% OFF</span>` : ''}
            </div>
            <div class="test-card-actions">
              <button class="btn-cart ${inCart ? 'added' : ''}" data-id="${t.id}"
                  data-item-type="${t.itemType}"
                  data-name="${(t.name || '').replace(/"/g, '&quot;')}"
                  data-category="${(t.category || '').replace(/"/g, '&quot;')}"
                  data-price="${t.price}"
                  ${inCart ? 'disabled' : ''}>
                  ${inCart ? '✅ Added' : '+ Add to Cart'}
              </button>
            </div>
          </div>
        </div>
    `;
}

/* ------ Scroll Controls ------ */
function initScrollControls(containerId, leftBtnId, rightBtnId) {
    const container = document.getElementById(containerId);
    const leftBtn = document.getElementById(leftBtnId);
    const rightBtn = document.getElementById(rightBtnId);

    if (!container || !leftBtn || !rightBtn) return;

    const scrollAmount = 340;

    function updateArrows() {
        const { scrollLeft, scrollWidth, clientWidth } = container;
        leftBtn.disabled = scrollLeft <= 0;
        rightBtn.disabled = scrollLeft + clientWidth >= scrollWidth - 10;
    }

}

/* ------ Scroll Animations ------ */
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
}

/* ------ FAQ Accordion ------ */
function initFAQ() {
    document.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', () => {
            const item = q.parentElement;
            const isActive = item.classList.contains('active');
            document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

/* ------ Testimonial Slider ------ */
function initTestimonialSlider() {
    const track = document.getElementById('testimonialsTrack');
    const prev = document.getElementById('prevSlide');
    const next = document.getElementById('nextSlide');

    if (!track || !prev || !next) return;

    let pos = 0;
    const cards = track.querySelectorAll('.testimonial-card');
    const cardWidth = 384;

    function slide(dir) {
        const maxPos = Math.max(0, (cards.length * cardWidth) - track.parentElement.offsetWidth);
        pos = Math.max(0, Math.min(pos + dir * cardWidth, maxPos));
        track.style.transform = `translateX(-${pos}px)`;
    }

    prev.addEventListener('click', () => slide(-1));
    next.addEventListener('click', () => slide(1));

    let autoSlide = setInterval(() => slide(1), 4000);
    track.parentElement.addEventListener('mouseenter', () => clearInterval(autoSlide));
    track.parentElement.addEventListener('mouseleave', () => {
        autoSlide = setInterval(() => slide(1), 4000);
    });
}

/* ------ Stat Counters ------ */
function initStatCounters() {
    const counters = document.querySelectorAll('.stat-number[data-target]');
    if (counters.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.target);
                animateCounter(el, target);
                observer.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
}

function animateCounter(el, target) {
    const duration = 2000;
    const start = performance.now();

    function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(eased * target);
        el.textContent = current.toLocaleString() + '+';

        if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
}

/* ------ Popular Tests ------ */
async function loadPopularTests() {
    const packagesGrid = document.getElementById('packagesScroll');
    const testsGrid = document.getElementById('testsScroll');
    if (!packagesGrid || !testsGrid) return;

    try {
        const [testsRes, pkgsRes] = await Promise.all([
            fetch('/api/tests'),
            fetch('/api/health-packages')
        ]);
        
        const allTests = (await testsRes.json()).map(t => ({ ...t, itemType: 'test' }));
        const allPackages = (await pkgsRes.json()).map(p => ({ 
            ...p, 
            itemType: 'package',
            category: 'Health Package',
            is_popular: true 
        }));

        // Dynamically update category test counts on homepage
        const catCounts = {};
        [...allTests, ...allPackages].forEach(item => {
            if (item.category) {
                catCounts[item.category] = (catCounts[item.category] || 0) + 1;
            }
        });
        document.querySelectorAll('.category-card').forEach(card => {
            const catName = card.dataset.category;
            const countEl = card.querySelector('.cat-count');
            if (catName && countEl) {
                const count = catCounts[catName] || 0;
                if (catName === 'Health Package' || catName === 'Health Packages') {
                    countEl.textContent = count + (count === 1 ? ' Package' : ' Packages');
                } else {
                    countEl.textContent = count + (count === 1 ? ' Test' : ' Tests');
                }
            }
        });

        packagesGrid.innerHTML = allPackages.map(p => createTestCard(p)).join('');
        
        const popularTests = allTests.filter(t => t.is_popular);
        testsGrid.innerHTML = popularTests.slice(0, 10).map(t => createTestCard(t)).join('');

        initScrollControls('categoriesScroll', 'categoriesScrollLeft', 'categoriesScrollRight');
        initScrollControls('packagesScroll', 'packagesScrollLeft', 'packagesScrollRight');
        initScrollControls('testsScroll', 'testsScrollLeft', 'testsScrollRight');
    } catch (err) {
        packagesGrid.innerHTML = '<p style="text-align:center;color:var(--text-muted);">Failed to load packages</p>';
        testsGrid.innerHTML = '<p style="text-align:center;color:var(--text-muted);">Failed to load tests</p>';
    }
}

function createTestCard(t) {
    const discount = t.original_price ? Math.round((1 - t.price / t.original_price) * 100) : 0;
    const cart = getCart();
    const inCart = cart.find(c => c.id === t.id && c.itemType === t.itemType);
    
    let watermark = '';
    if (t.itemType === 'package') {
        watermark = `<div class="test-card-watermark" style="font-size:120px;opacity:0.04;display:flex;align-items:center;justify-content:center;height:100%;width:100%;">${UI_ICONS.package}</div>`;
    } else if (t.image_file) {
        watermark = `
            <div class="test-card-watermark" style="
                background-image: url('/uploads/test-images/${t.image_file}');
                width: ${t.image_standard_size ? '200px' : (t.image_max_width || 200) + 'px'};
                height: ${t.image_standard_size ? '200px' : (t.image_max_height || 200) + 'px'};
            "></div>
        `;
    }

    return `
        <div class="test-card ${t.itemType === 'package' ? 'package-card' : ''}" style="${t.itemType === 'package' ? 'border-top: 4px solid var(--primary);' : ''}">
          ${watermark}
          <div class="test-card-header">
            <span class="test-card-badge" style="${t.itemType === 'package' ? 'background:var(--primary);color:white;' : ''}">${t.category}</span>
            ${t.is_popular ? `<span style="color:var(--secondary);font-size:0.8rem;font-weight:600;">${UI_ICONS.popular} Popular</span>` : ''}
          </div>
          <h3>${t.name}</h3>
          <p>${(t.description || '').substring(0, 100)}${(t.description || '').length > 100 ? '...' : ''}</p>
          <div class="test-card-meta">
            <span>${UI_ICONS.time} ${t.turnaround_time || 'Same day'}</span>
            <span>${UI_ICONS.sample} ${t.sample_type || 'Blood'}</span>
            ${t.fasting_required ? `<span>${UI_ICONS.fasting} Fasting</span>` : ''}
          </div>
          <div class="test-card-footer">
            <div class="test-price">
              <span class="current">₹${t.price}</span>
              ${t.original_price ? `<span class="original">₹${t.original_price}</span>` : ''}
              ${discount > 0 ? `<span class="discount">${discount}% OFF</span>` : ''}
            </div>
            <div class="test-card-actions">
              <button class="btn-cart ${inCart ? 'added' : ''}" data-id="${t.id}"
                  data-item-type="${t.itemType}"
                  data-name="${(t.name || '').replace(/"/g, '&quot;')}"
                  data-category="${(t.category || '').replace(/"/g, '&quot;')}"
                  data-price="${t.price}"
                  ${inCart ? 'disabled' : ''}>
                  ${inCart ? `${UI_ICONS.check} Added` : '+ Add to Cart'}
              </button>
            </div>
          </div>
        </div>
    `;
}

/* ------ Scroll Controls ------ */
function initScrollControls(containerId, leftBtnId, rightBtnId) {
    const container = document.getElementById(containerId);
    const leftBtn = document.getElementById(leftBtnId);
    const rightBtn = document.getElementById(rightBtnId);

    if (!container || !leftBtn || !rightBtn) return;

    const scrollAmount = 340;

    function updateArrows() {
        const { scrollLeft, scrollWidth, clientWidth } = container;
        leftBtn.disabled = scrollLeft <= 0;
        rightBtn.disabled = scrollLeft + clientWidth >= scrollWidth - 10;
    }

    leftBtn.addEventListener('click', () => {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        setTimeout(updateArrows, 300);
    });

    rightBtn.addEventListener('click', () => {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        setTimeout(updateArrows, 300);
    });

    container.addEventListener('scroll', updateArrows);
    updateArrows();
}

/* ------ Gallery ------ */
async function loadGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!grid) return;

    try {
        const res = await fetch('/api/photos');
        const photos = await res.json();

        if (photos.length > 0) {
            grid.innerHTML = photos.map(p => `
        <div class="gallery-item">
          <img src="/uploads/photos/${p.filename}" alt="${p.title}" loading="lazy">
          <div class="gallery-overlay"><span>${p.title}</span></div>
        </div>
      `).join('');
        } else {
            const defaults = [
                { title: 'Modern Laboratory', emoji: '🏥' },
                { title: 'Sample Collection', emoji: '💉' },
                { title: 'Advanced Equipment', emoji: '🔬' },
                { title: 'Patient Care', emoji: '❤️' },
                { title: 'Clean Environment', emoji: '🧼' },
                { title: 'Expert Team', emoji: '👨‍⚕️' },
            ];
            grid.innerHTML = defaults.map(d => `
        <div class="gallery-item feature-placeholder">
          <div class="feature-content">
            <div class="feature-emoji">${d.emoji}</div>
            <div class="feature-title">${d.title}</div>
          </div>
        </div>
      `).join('');
        }

        initScrollControls('galleryGrid', 'galleryScrollLeft', 'galleryScrollRight');
    } catch (err) {
        console.error('Gallery load failed');
    }
}

/* ------ Hero Search ------ */
function initHeroSearch() {
    const input = document.getElementById('heroSearch');
    const results = document.getElementById('heroSearchResults');
    if (!input || !results) return;

    let debounce = null;

    input.addEventListener('input', () => {
        clearTimeout(debounce);
        const query = input.value.trim();

        if (query.length < 2) {
            results.innerHTML = '';
            return;
        }

        debounce = setTimeout(async () => {
            try {
                const res = await fetch(`/api/tests?search=${encodeURIComponent(query)}`);
                const tests = await res.json();

                if (tests.length === 0) {
                    results.innerHTML = '<div style="color:rgba(255,255,255,0.6);font-size:0.85rem;padding:8px;">No tests found</div>';
                    return;
                }

                results.innerHTML = tests.slice(0, 5).map(t => `
          <a href="/tests.html?search=${encodeURIComponent(t.name)}" 
             style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:rgba(255,255,255,0.1);border-radius:8px;margin-bottom:6px;color:white;text-decoration:none;font-size:0.85rem;transition:all 0.2s;"
             onmouseover="this.style.background='rgba(255,255,255,0.2)'" 
             onmouseout="this.style.background='rgba(255,255,255,0.1)'">
            <span>${t.name}</span>
            <span style="font-weight:700;">₹${t.price}</span>
          </a>
        `).join('');
            } catch (err) {
                console.error('Search failed');
            }
        }, 300);
    });
}

/* ------ Category Cards ------ */
document.addEventListener('click', (e) => {
    const card = e.target.closest('.category-card');
    if (card && card.dataset.category) {
        window.location.href = `/tests.html?category=${encodeURIComponent(card.dataset.category)}`;
    }
});

/* ------ Toast ------ */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = 'toast ' + type;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}


/* ===========================
   EVENT DELEGATION FOR CART BUTTONS
=========================== */
document.addEventListener('click', (e) => {
    // Handle "Add to Cart" button clicks
    const cartBtn = e.target.closest('.btn-cart');
    if (cartBtn && !cartBtn.disabled) {
        e.preventDefault();
        const test = {
            id: cartBtn.getAttribute('data-id'), // Firestore IDs are strings — do NOT parseInt
            itemType: cartBtn.getAttribute('data-item-type') || 'test',
            name: cartBtn.getAttribute('data-name'),
            category: cartBtn.getAttribute('data-category'),
            price: parseFloat(cartBtn.getAttribute('data-price'))
        };
        addToCart(test);
        return;
    }

    // Handle cart item remove button
    const removeBtn = e.target.closest('.cart-item-remove');
    if (removeBtn) {
        const removeId = removeBtn.getAttribute('data-remove-id'); // Keep as string — Firestore IDs are strings
        const removeType = removeBtn.getAttribute('data-item-type') || 'test';
        if (removeId) removeFromCart(removeId, removeType);
        return;
    }
});