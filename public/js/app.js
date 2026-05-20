document.addEventListener('DOMContentLoaded', () => {
const API = document.querySelector('meta[name="api-url"]')?.getAttribute('content') || 'https://menuderia-backend.onrender.com/api';
const IMG_MAP = {
    1:'menudo_grande.jpeg',2:'menudo_chico.jpg',3:'cafe_olla.jpg',4:'cocuela.webp',
    5:'jericalla.png',11:'menudo_mediano.jpeg',12:'quesadillas.jpg',13:'taco_frijol.jpg',
    14:'medio_kilo_tortillas.jpg',15:'aguacate_entero.webp',16:'medio_aguacate.webp',
    17:'canela_caliente.png',18:'jugo_naranja.avif',19:'jugo_verde.jpg',20:'choco_milk.jpg'
};

// State
let token = localStorage.getItem('mesero_token');
let meseroName = localStorage.getItem('mesero_name') || 'Mesero';
let meseroId = parseInt(localStorage.getItem('mesero_id')) || null;
let cart = JSON.parse(localStorage.getItem('mesero_cart')) || [];
let currentProduct = null;
let allCategories = [];
let activeFilter = 'all';

// DOM refs
const loginView = document.getElementById('login-view');
const menuView = document.getElementById('menu-view');
const cartView = document.getElementById('cart-view');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const loginBtn = document.getElementById('login-btn');
const productsGrid = document.getElementById('products-grid');
const loadingSpinner = document.getElementById('loading-spinner');
const categoryTabsContainer = document.getElementById('category-tabs-container');
const categoryTabs = document.getElementById('category-tabs');
const modal = document.getElementById('product-modal');
const profileModal = document.getElementById('profile-modal');
const createSessionModal = document.getElementById('create-session-modal');
const ticketModal = document.getElementById('ticket-modal');

window.appState = { token:()=>token, meseroId:()=>meseroId, meseroName:()=>meseroName, cart:()=>cart, API, IMG_MAP, saveCart, updateCartBadge };

updateCartBadge();

if (token) {
    document.getElementById('welcome-message').textContent = `Bienvenido, ${meseroName}`;
    showView(menuView, loginView);
    loadMenu();
    setTimeout(() => window.loadSessions && window.loadSessions(), 500);
} else {
    gsap.from('.login-card', { y:50, opacity:0, duration:1, ease:'power3.out' });
}

// LOGIN
loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const orig = loginBtn.innerHTML;
    loginBtn.innerHTML = '<span>Cargando...</span>';
    loginBtn.disabled = true;
    loginError.textContent = '';
    try {
        const r = await fetch(`${API}/login`, {
            method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'},
            body: JSON.stringify({ email, password_hash: password })
        });
        const d = await r.json();
        if (r.ok) {
            if (parseInt(d.role_id) !== 2) { loginError.textContent = 'Acceso denegado. Solo para meseros.'; return; }
            token = d.access_token; meseroName = d.full_name || 'Mesero'; meseroId = d.user_id || null;
            localStorage.setItem('mesero_token', token);
            localStorage.setItem('mesero_name', meseroName);
            if (meseroId) localStorage.setItem('mesero_id', meseroId);
            document.getElementById('welcome-message').textContent = `Bienvenido, ${meseroName}`;
            window.appState.token = () => token;
            window.appState.meseroId = () => meseroId;
            switchViews(loginView, menuView, () => { loadMenu(); setTimeout(() => window.loadSessions && window.loadSessions(), 600); });
        } else {
            loginError.textContent = d.mensaje || d.message || 'Error de autenticación';
            gsap.to('.login-card', { x: [-10,10,-10,10,0], duration:0.4 });
        }
    } catch(err) { loginError.textContent = 'Error al conectar con el servidor'; }
    finally { loginBtn.innerHTML = orig; loginBtn.disabled = false; }
});

// LOGOUT
document.querySelectorAll('.logout-btn').forEach(btn => btn.addEventListener('click', async () => {
    if (!token) return;
    try { await fetch(`${API}/logout`, { method:'POST', headers:{ Authorization:`Bearer ${token}`, Accept:'application/json' }}); } catch(e){}
    localStorage.removeItem('mesero_token'); localStorage.removeItem('mesero_name');
    localStorage.removeItem('mesero_cart'); localStorage.removeItem('mesero_id');
    token = null; cart = []; activeFilter = 'all';
    updateCartBadge();
    document.getElementById('email').value = ''; document.getElementById('password').value = '';
    cartView.classList.add('hidden'); cartView.classList.remove('active');
    switchViews(menuView, loginView, () => { productsGrid.innerHTML = ''; });
}));

// LOAD MENU (categories + products)
async function loadMenu() {
    loadingSpinner.classList.remove('hidden');
    productsGrid.classList.add('hidden');
    categoryTabsContainer.classList.add('hidden');
    try {
        const [catRes, prodRes] = await Promise.all([
            fetch(`${API}/categories`, { headers:{ Authorization:`Bearer ${token}`, Accept:'application/json' }}),
            fetch(`${API}/products`, { headers:{ Authorization:`Bearer ${token}`, Accept:'application/json' }})
        ]);
        if (catRes.status === 401 || prodRes.status === 401) { doLogout(); return; }
        allCategories = await catRes.json();
        const products = await prodRes.json();
        renderMenu(allCategories, products);
    } catch(e) {
        productsGrid.innerHTML = '<p style="grid-column:1/-1;text-align:center;">Error al cargar el menú.</p>';
        loadingSpinner.classList.add('hidden'); productsGrid.classList.remove('hidden');
    }
}

function renderMenu(categories, products) {
    productsGrid.innerHTML = ''; categoryTabs.innerHTML = '';
    const grouped = {};
    products.forEach(p => {
        const cid = p.category_id || 0;
        if (!grouped[cid]) grouped[cid] = [];
        grouped[cid].push(p);
    });
    const catMap = {};
    categories.forEach(c => { catMap[c.category_id] = c.name; });

    // Build tabs
    const allTab = document.createElement('button');
    allTab.className = 'category-tab active'; allTab.textContent = 'Todos';
    allTab.dataset.cat = 'all';
    allTab.addEventListener('click', () => filterCategory('all', allTab));
    categoryTabs.appendChild(allTab);

    categories.forEach(cat => {
        if (!grouped[cat.category_id]) return;
        const tab = document.createElement('button');
        tab.className = 'category-tab'; tab.textContent = cat.name;
        tab.dataset.cat = cat.category_id;
        tab.addEventListener('click', () => filterCategory(cat.category_id, tab));
        categoryTabs.appendChild(tab);
    });

    // Build sections
    categories.forEach(cat => {
        if (!grouped[cat.category_id]) return;
        const section = document.createElement('div');
        section.className = 'category-section'; section.dataset.catSection = cat.category_id;
        section.innerHTML = `<div class="category-section-title">${cat.name}</div>`;
        const grid = document.createElement('div'); grid.className = 'grid';
        grouped[cat.category_id].forEach((p, i) => { grid.appendChild(buildProductCard(p, i)); });
        section.appendChild(grid); productsGrid.appendChild(section);
    });
    // Uncategorized
    if (grouped[0]) {
        const section = document.createElement('div');
        section.className = 'category-section'; section.dataset.catSection = '0';
        section.innerHTML = '<div class="category-section-title">Otros</div>';
        const grid = document.createElement('div'); grid.className = 'grid';
        grouped[0].forEach((p, i) => { grid.appendChild(buildProductCard(p, i)); });
        section.appendChild(grid); productsGrid.appendChild(section);
    }

    loadingSpinner.classList.add('hidden');
    productsGrid.classList.remove('hidden');
    categoryTabsContainer.classList.remove('hidden');
    gsap.from('.product-card', { y:30, opacity:0, duration:0.5, stagger:0.05, ease:'back.out(1.7)' });
}

function buildProductCard(product) {
    const card = document.createElement('div');
    card.className = 'glass-card product-card';
    const imgFile = IMG_MAP[product.product_id] || 'menudo_grande.jpeg';
    card.innerHTML = `
        <div style="width:100%;height:150px;border-radius:12px;overflow:hidden;margin-bottom:1rem;background:rgba(255,255,255,0.05);flex-shrink:0;">
            <img src="/images/products/${imgFile}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" style="width:100%;height:100%;object-fit:cover;" alt="${product.name}">
            <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;color:var(--text-secondary);font-size:0.85rem;">Sin imagen</div>
        </div>
        <div class="product-title">${product.name}</div>
        <div class="product-desc">${product.description || 'Sin descripción'}</div>
        <div class="product-footer"><span class="price">$${parseFloat(product.price).toFixed(2)}</span></div>`;
    card.addEventListener('click', () => openModal(product));
    return card;
}

function filterCategory(catId, clickedTab) {
    activeFilter = catId;
    document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    clickedTab.classList.add('active');
    document.querySelectorAll('.category-section').forEach(s => {
        s.style.display = (catId === 'all' || s.dataset.catSection == catId) ? '' : 'none';
    });
}

// MODAL
function openModal(product) {
    currentProduct = product;
    const imgFile = IMG_MAP[product.product_id] || 'menudo_grande.jpeg';
    document.querySelector('.modal-image-placeholder').innerHTML = `
        <img src="/images/products/${imgFile}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" alt="${product.name}">
        <div style="display:none;width:100%;height:100%;align-items:center;justify-content:center;color:var(--text-secondary);">Sin imagen</div>`;
    document.getElementById('modal-title').textContent = product.name;
    const catName = allCategories.find(c => c.category_id === product.category_id)?.name || '';
    document.getElementById('modal-category').textContent = catName;
    document.getElementById('modal-desc').textContent = product.description || 'Sin descripción adicional.';
    document.getElementById('modal-price').textContent = `$${parseFloat(product.price).toFixed(2)}`;
    document.getElementById('modal-notes').value = '';
    modal.classList.remove('hidden');
    gsap.from('.modal-content', { scale:0.85, opacity:0, duration:0.3, ease:'power2.out' });
}

function closeModal() {
    gsap.to('.modal-content', { scale:0.9, opacity:0, duration:0.2, onComplete:() => {
        modal.classList.add('hidden');
        gsap.set('.modal-content', { clearProps:'all' });
    }});
}

document.querySelectorAll('.close-modal-btn, #product-modal .modal-backdrop').forEach(b => b.addEventListener('click', closeModal));

// ADD TO CART
document.getElementById('add-to-cart-btn').addEventListener('click', () => {
    if (!currentProduct) return;
    const notes = document.getElementById('modal-notes').value.trim();
    const existing = cart.find(i => i.product_id === currentProduct.product_id && i.notes === notes);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...currentProduct, quantity:1, notes, imageFile: IMG_MAP[currentProduct.product_id] || 'menudo_grande.jpeg' });
    }
    saveCart(); updateCartBadge(); closeModal();
    gsap.fromTo('.cart-icon-btn', { scale:1.4 }, { scale:1, duration:0.4, ease:'bounce.out' });
});

// CART
function saveCart() { localStorage.setItem('mesero_cart', JSON.stringify(cart)); }
function updateCartBadge() {
    const b = document.getElementById('cart-badge');
    if (b) b.textContent = cart.reduce((s,i) => s+i.quantity, 0);
}

function renderCartView() {
    const container = document.getElementById('cart-items-container');
    const emptyMsg = document.getElementById('cart-empty-msg');
    const summaryBox = document.getElementById('cart-summary-box');
    container.innerHTML = '';
    if (cart.length === 0) { emptyMsg.classList.remove('hidden'); summaryBox.classList.add('hidden'); return; }
    emptyMsg.classList.add('hidden'); summaryBox.classList.remove('hidden');
    let total = 0;
    cart.forEach(item => {
        const sub = item.price * item.quantity; total += sub;
        const div = document.createElement('div');
        div.className = 'glass-card cart-item';
        div.innerHTML = `
            <img src="/images/products/${item.imageFile}" class="cart-item-img" alt="${item.name}" onerror="this.style.display='none'">
            <div class="cart-item-details">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">$${parseFloat(item.price).toFixed(2)} c/u</div>
                ${item.notes ? `<div class="cart-item-notes">Nota: ${item.notes}</div>` : ''}
            </div>
            <div class="cart-item-actions">
                <div class="quantity-controls">
                    <button class="qty-btn dec-btn" data-idx="${cart.indexOf(item)}">-</button>
                    <span class="qty-display">${item.quantity}</span>
                    <button class="qty-btn inc-btn" data-idx="${cart.indexOf(item)}">+</button>
                </div>
                <div class="cart-item-subtotal">$${sub.toFixed(2)}</div>
                <button class="remove-item-btn" data-idx="${cart.indexOf(item)}" title="Eliminar">Eliminar</button>
            </div>`;
        container.appendChild(div);
    });
    document.getElementById('cart-total-price').textContent = `$${total.toFixed(2)}`;
    container.querySelectorAll('.dec-btn').forEach(b => b.addEventListener('click', e => changeQty(+e.target.dataset.idx, -1)));
    container.querySelectorAll('.inc-btn').forEach(b => b.addEventListener('click', e => changeQty(+e.target.dataset.idx, 1)));
    container.querySelectorAll('.remove-item-btn').forEach(b => b.addEventListener('click', e => removeItem(+e.target.dataset.idx)));
    populateSessionSelect();
}

function changeQty(idx, delta) {
    if (cart[idx]) { cart[idx].quantity += delta; if (cart[idx].quantity <= 0) cart.splice(idx,1); }
    saveCart(); updateCartBadge(); renderCartView();
}
function removeItem(idx) { cart.splice(idx,1); saveCart(); updateCartBadge(); renderCartView(); }

document.getElementById('empty-cart-btn').addEventListener('click', () => {
    cart=[]; saveCart(); updateCartBadge(); renderCartView(); window.showToast('Orden vaciada', 'success');
});
document.getElementById('confirm-order-btn').addEventListener('click', () => window.confirmOrder && window.confirmOrder());

// SESSION SELECT in cart
function populateSessionSelect() {
    const sel = document.getElementById('session-select');
    if (!sel || !window.activeSessions) return;
    sel.innerHTML = '<option value="">-- Selecciona una sesión --</option>';
    (window.activeSessions || []).forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.session_id; opt.textContent = `${s.titular_name} (Mesa: ${s.session_tables?.map(t=>t.table?.table_number||'?').join(', ')||'Sin mesa'})`;
        sel.appendChild(opt);
    });
}

// NAVIGATION
document.getElementById('cart-btn').addEventListener('click', () => { renderCartView(); switchViews(menuView, cartView, ()=>{}); });
document.getElementById('back-to-menu-btn').addEventListener('click', () => switchViews(cartView, menuView, ()=>{}));
document.getElementById('new-session-btn').addEventListener('click', () => window.openCreateSessionModal && window.openCreateSessionModal());

// PROFILE
document.querySelectorAll('#profile-btn, #profile-btn-cart').forEach(b => b.addEventListener('click', async () => {
    if (!token) return;
    try {
        const r = await fetch(`${API}/user`, { headers:{ Authorization:`Bearer ${token}`, Accept:'application/json' }});
        if (r.ok) {
            const d = await r.json();
            document.getElementById('profile-name').textContent = d.full_name;
            document.getElementById('profile-email').textContent = d.email;
            document.getElementById('profile-initial').textContent = d.full_name.charAt(0).toUpperCase();
            if (!meseroId && d.user_id) { meseroId = d.user_id; localStorage.setItem('mesero_id', meseroId); }
            profileModal.classList.remove('hidden');
            gsap.from('#profile-modal .modal-content', { scale:0.85, opacity:0, duration:0.3, ease:'power2.out' });
        } else if (r.status===401) doLogout();
    } catch(e) {}
}));
document.querySelectorAll('.close-profile-btn, #profile-modal .modal-backdrop').forEach(b => b.addEventListener('click', () => {
    gsap.to('#profile-modal .modal-content', { scale:0.9, opacity:0, duration:0.2, onComplete:() => {
        profileModal.classList.add('hidden'); gsap.set('#profile-modal .modal-content', { clearProps:'all' });
    }});
}));

// HELPERS
function doLogout() { document.querySelector('.logout-btn')?.click(); }
function switchViews(hide, show, cb) {
    gsap.to(hide, { opacity:0, y:20, duration:0.35, onComplete:() => {
        hide.classList.remove('active'); hide.classList.add('hidden');
        show.classList.remove('hidden'); show.classList.add('active');
        gsap.fromTo(show, { opacity:0, y:-20 }, { opacity:1, y:0, duration:0.4, ease:'power2.out', onComplete:cb });
    }});
}
function showView(show, hide) {
    hide.classList.add('hidden'); hide.classList.remove('active');
    show.classList.remove('hidden'); show.classList.add('active');
}

// ==========================================
// SESIONES, ORDENES, TICKETS Y PDF (NUEVO)
// ==========================================

window.activeSessions = [];
window.allTables = [];

// 1. CARGAR SESIONES
window.loadSessions = async function() {
    const API = window.appState.API;
    const token = window.appState.token();
    if(!token) return;
    
    try {
        const r = await fetch(`${API}/mesero/mis-sesiones`, { headers:{ Authorization:`Bearer ${token}`, Accept:'application/json' }});
        if(r.ok) {
            const data = await r.json();
            window.activeSessions = data.sesiones || [];
            renderSessionsSidebar();
            if(typeof populateSessionSelect !== 'undefined') populateSessionSelect();
        }
    } catch(e) { console.error('Error loading sessions', e); }
};

// 2. RENDERIZAR SIDEBAR
function renderSessionsSidebar() {
    const list = document.getElementById('sessions-list');
    if(!list) return;
    list.innerHTML = '';
    
    if(window.activeSessions.length === 0) {
        list.innerHTML = '<div class="no-sessions-msg">No tienes sesiones activas en este momento.</div>';
        return;
    }
    
    window.activeSessions.forEach(s => {
        const card = document.createElement('div');
        card.className = 'session-card';
        
        const tables = s.session_tables && s.session_tables.length > 0 
            ? s.session_tables.map(st => st.table?.table_number || '?').join(', ') 
            : 'Sin mesa';
            
        let total = 0;
        let paidTotal = 0;
        let ordersHtml = '';
        
        if(s.orders && s.orders.length > 0) {
            s.orders.forEach(o => {
                const oTotal = parseFloat(o.total_amount || 0);
                total += oTotal;
                
                let badgeClass = o.status === 'PENDING' ? 'status-pending' : (o.status === 'COOKING' ? 'status-cooking' : 'status-served');
                if(o.status === 'CANCELLED') badgeClass = 'status-cancelled';
                if(o.status === 'PAID') {
                    badgeClass = 'status-paid';
                    paidTotal += oTotal;
                }
                
                let paymentHtml = '';
                if(o.status === 'PAID' && o.transaction_id) {
                    paymentHtml = `
                        <div class="transaction-info">
                            <small>Transacción: ${o.transaction_id}</small>
                            <small>Aprobado - ${new Date(o.payment_date).toLocaleDateString()}</small>
                        </div>
                    `;
                } else if(o.status !== 'CANCELLED') {
                    paymentHtml = `<button class="btn-primary btn-xs pay-order-btn" data-oid="${o.order_id}">Pagar</button>`;
                }

                ordersHtml += `
                    <div class="order-mini-card">
                        <div class="order-mini-header">
                            <span class="order-mini-id">Orden #${o.order_id}</span>
                            <span class="order-mini-status ${badgeClass}">${o.status}</span>
                        </div>
                        <div class="order-mini-items">${o.details?.length || 0} platillos</div>
                        <div class="order-mini-footer">
                            <div class="order-mini-total">$${oTotal.toFixed(2)}</div>
                            <div class="order-mini-actions">
                                <button class="btn-secondary btn-xs view-order-ticket-btn" data-sid="${s.session_id}" data-oid="${o.order_id}">Ticket</button>
                                ${paymentHtml}
                            </div>
                        </div>
                    </div>
                `;
            });
        } else {
            ordersHtml = '<div style="font-size:0.8rem;color:var(--text-secondary);text-align:center;padding:0.5rem;">Sin órdenes aún</div>';
        }
        
        let isSessionFullyPaid = total > 0 && paidTotal === total;
        if(isSessionFullyPaid) {
            card.classList.add('session-fully-paid');
        }

        card.innerHTML = `
            <div class="session-card-header">
                <span class="session-titular">${s.titular_name}</span>
                <span class="session-token">${s.session_token}</span>
            </div>
            <div class="session-meta">
                <span class="session-meta-tag tag-active">Mesas: ${tables}</span>
            </div>
            <div class="session-orders-count">${s.orders?.length || 0} órdenes registradas</div>
            <div class="session-actions-row">
                <button class="btn-primary btn-xs add-order-btn" data-sid="${s.session_id}">+ Orden</button>
                ${s.orders && s.orders.length > 0 ? `<button class="btn-secondary btn-xs view-ticket-btn" data-sid="${s.session_id}">Ticket</button>` : ''}
                ${(total - paidTotal) > 0 ? `<button class="btn-success btn-xs pay-session-btn" data-sid="${s.session_id}">Pagar Todo</button>` : ''}
                <button class="btn-danger btn-xs close-session-btn" data-sid="${s.session_id}">Cerrar</button>
            </div>
            <div class="session-detail-panel hidden">
                ${ordersHtml}
                <div class="session-totals-row">
                    <div style="font-weight:bold;color:var(--text-secondary);text-align:left;">
                        Total Restante: $${(total - paidTotal).toFixed(2)}
                    </div>
                    <div style="font-weight:bold;color:var(--success);text-align:right;">
                        Total Sesión: $${total.toFixed(2)}
                    </div>
                </div>
            </div>
        `;
        
        // Toggle expansion
        card.addEventListener('click', (e) => {
            if(e.target.tagName === 'BUTTON') return;
            const panel = card.querySelector('.session-detail-panel');
            panel.classList.toggle('hidden');
        });
        
        // Add order bound
        const addBtn = card.querySelector('.add-order-btn');
        if(addBtn) {
            addBtn.addEventListener('click', () => {
                const sel = document.getElementById('session-select');
                if(sel) sel.value = s.session_id;
                document.getElementById('cart-btn').click();
            });
        }
        
        // View ticket general bound
        const ticketBtn = card.querySelector('.view-ticket-btn');
        if(ticketBtn) {
            ticketBtn.addEventListener('click', () => showTicketForSession(s));
        }

        // View ticket individual bound
        card.querySelectorAll('.view-order-ticket-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const oid = e.target.dataset.oid;
                const specificOrder = s.orders.find(o => o.order_id == oid);
                if(specificOrder) showTicketForSession(s, specificOrder);
            });
        });

        // Pay order bound
        card.querySelectorAll('.pay-order-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const oid = e.target.dataset.oid;
                const API = window.appState.API;
                const token = window.appState.token();
                const orig = e.target.innerHTML;
                e.target.innerHTML = 'Procesando...'; e.target.disabled = true;

                try {
                    const r = await fetch(`${API}/mesero/pedidos/${oid}/pagar`, {
                        method: 'POST',
                        headers: { Authorization:`Bearer ${token}`, Accept:'application/json' }
                    });
                    const data = await r.json();
                    
                    if(r.ok && data.init_point) {
                        window.open(data.init_point, '_blank');
                        // Optionally refresh sessions after a short delay so the user sees changes later if webhook fires quickly
                        setTimeout(window.loadSessions, 5000); 
                    } else {
                        window.showToast(data.mensaje || 'Error al conectar con Mercado Pago', 'error');
                        e.target.innerHTML = orig; e.target.disabled = false;
                    }
                } catch(err) {
                    window.showToast('Error de conexión', 'error');
                    e.target.innerHTML = orig; e.target.disabled = false;
                }
            });
        });
        
        // Pay session bound
        const paySessionBtn = card.querySelector('.pay-session-btn');
        if(paySessionBtn) {
            paySessionBtn.addEventListener('click', async (e) => {
                const sid = e.target.dataset.sid;
                const API = window.appState.API;
                const token = window.appState.token();
                const orig = e.target.innerHTML;
                e.target.innerHTML = 'Procesando...'; e.target.disabled = true;

                try {
                    const r = await fetch(`${API}/mesero/sesiones/${sid}/pagar`, {
                        method: 'POST',
                        headers: { Authorization:`Bearer ${token}`, Accept:'application/json' }
                    });
                    const data = await r.json();
                    
                    if(r.ok && data.init_point) {
                        window.open(data.init_point, '_blank');
                        setTimeout(window.loadSessions, 5000);
                    } else {
                        window.showToast(data.mensaje || 'Error al conectar con Mercado Pago', 'error');
                        e.target.innerHTML = orig; e.target.disabled = false;
                    }
                } catch(err) {
                    window.showToast('Error de conexión', 'error');
                    e.target.innerHTML = orig; e.target.disabled = false;
                }
            });
        }
        
        // Close session bound
        const closeBtn = card.querySelector('.close-session-btn');
        if(closeBtn) {
            closeBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); // don't toggle expansion
                try {
                    const API = window.appState.API;
                    const token = window.appState.token();
                    const btn = e.target;
                    btn.innerHTML = '...'; btn.disabled = true;
                    const r = await fetch(`${API}/mesero/sesiones/${s.session_id}/cerrar`, {
                        method: 'PUT',
                        headers: { Authorization:`Bearer ${token}`, Accept:'application/json' }
                    });
                    if(r.ok) {
                        window.showToast('Sesión cerrada correctamente.', 'success');
                        window.loadSessions();
                    } else {
                        window.showToast('Error al cerrar la sesión.', 'error');
                        btn.innerHTML = 'Cerrar'; btn.disabled = false;
                    }
                } catch(err) {
                    window.showToast('Error de conexión.', 'error');
                }
            });
        }
        
        list.appendChild(card);
    });
}

// 3. CREAR SESIÓN (MODAL)
window.openCreateSessionModal = async function() {
    const API = window.appState.API;
    const token = window.appState.token();
    document.getElementById('session-titular').value = '';
    document.getElementById('create-session-error').textContent = '';
    
    // Fetch tables
    try {
        const r = await fetch(`${API}/tables`, { headers:{ Authorization:`Bearer ${token}`, Accept:'application/json' }});
        if(r.ok) {
            window.allTables = await r.json();
            renderTablesSelector();
        }
    } catch(e) {}
    
    const modal = document.getElementById('create-session-modal');
    modal.classList.remove('hidden');
    gsap.from('#create-session-modal .modal-content', { scale:0.8, opacity:0, duration:0.3 });
};

document.querySelectorAll('.close-create-session, #create-session-modal .modal-backdrop').forEach(b => {
    b.addEventListener('click', () => {
        gsap.to('#create-session-modal .modal-content', { scale:0.9, opacity:0, duration:0.2, onComplete:()=>{
            document.getElementById('create-session-modal').classList.add('hidden');
            gsap.set('#create-session-modal .modal-content', {clearProps:'all'});
        }});
    });
});

let selectedTables = [];
function renderTablesSelector() {
    const container = document.getElementById('tables-chips');
    container.innerHTML = '';
    selectedTables = [];
    updateSelectedTablesInfo();
    
    // Simplification: We assume API returns `{ data: [...] }` or just array
    const tables = Array.isArray(window.allTables) ? window.allTables : (window.allTables.data || []);
    
    if(tables.length === 0) {
        container.innerHTML = '<p style="color:var(--warning);font-size:0.85rem;">No hay mesas disponibles en el sistema.</p>';
        return;
    }
    
    tables.forEach(t => {
        const chip = document.createElement('div');
        chip.className = 'table-chip';
        chip.textContent = `Mesa ${t.table_number} (Cap: ${t.capacity || '?'})`;
        
        if (t.status === 'occupied') {
            chip.classList.add('occupied');
            chip.title = 'Mesa ocupada actualmente';
        } else {
            chip.addEventListener('click', () => {
                chip.classList.toggle('selected');
                if(chip.classList.contains('selected')) selectedTables.push(t.table_id);
                else selectedTables = selectedTables.filter(id => id !== t.table_id);
                updateSelectedTablesInfo();
            });
        }
        container.appendChild(chip);
    });
}

function updateSelectedTablesInfo() {
    const info = document.getElementById('selected-tables-info');
    if(selectedTables.length === 0) info.textContent = '';
    else info.textContent = `${selectedTables.length} mesa(s) seleccionada(s).`;
}

document.getElementById('create-session-submit').addEventListener('click', async () => {
    const titular = document.getElementById('session-titular').value.trim();
    const err = document.getElementById('create-session-error');
    if(!titular) { err.textContent = 'El nombre del titular es requerido.'; return; }
    
    const API = window.appState.API;
    const token = window.appState.token();
    const btn = document.getElementById('create-session-submit');
    const orig = btn.innerHTML;
    btn.innerHTML = 'Creando...'; btn.disabled = true; err.textContent = '';
    
    try {
        // 1. Create Session
        const r1 = await fetch(`${API}/mesero/sesiones`, {
            method:'POST',
            headers: {'Content-Type':'application/json','Accept':'application/json','Authorization':`Bearer ${token}`},
            body: JSON.stringify({ titular_name: titular })
        });
        const d1 = await r1.json();
        
        if(!r1.ok) { err.textContent = d1.mensaje || 'Error al crear la sesión'; return; }
        
        const sessionId = d1.sesion.session_id;
        
        // 2. Link Tables
        for(let tid of selectedTables) {
            await fetch(`${API}/mesero/sesiones/${sessionId}/mesas`, {
                method:'POST',
                headers: {'Content-Type':'application/json','Accept':'application/json','Authorization':`Bearer ${token}`},
                body: JSON.stringify({ table_id: tid })
            });
        }
        
        // Success
        document.querySelector('.close-create-session').click();
        window.loadSessions(); // reload sidebar
        
        // Pre-select in cart if open
        const sel = document.getElementById('session-select');
        if(sel) {
            setTimeout(() => { sel.value = sessionId; }, 800);
        }
        
    } catch(e) {
        err.textContent = 'Error de conexión';
    } finally {
        btn.innerHTML = orig; btn.disabled = false;
    }
});

// 4. CONFIRMAR ORDEN REAL
window.confirmOrder = async function() {
    const API = window.appState.API;
    const token = window.appState.token();
    const cart = window.appState.cart();
    
    if(cart.length === 0) { window.showToast('La orden está vacía.', 'warning'); return; }
    
    const sid = document.getElementById('session-select').value;
    if(!sid) { window.showToast('DEBES SELECCIONAR UNA SESIÓN (CLIENTE) ANTES DE CONFIRMAR LA ORDEN.', 'error'); return; }
    
    const btn = document.getElementById('confirm-order-btn');
    const orig = btn.innerHTML;
    btn.innerHTML = 'Enviando...'; btn.disabled = true;
    
    const payload = {
        session_id: parseInt(sid),
        productos: cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price_snapshot: item.price,
            notes: item.notes || null
        }))
    };
    
    try {
        const r = await fetch(`${API}/mesero/pedidos`, {
            method:'POST',
            headers: {'Content-Type':'application/json','Accept':'application/json','Authorization':`Bearer ${token}`},
            body: JSON.stringify(payload)
        });
        
        const data = await r.json();
        
        if(r.ok) {
            window.showToast('¡Orden enviada a cocina exitosamente!', 'success');
            document.getElementById('empty-cart-btn').click(); // vaciar carrito
            window.loadSessions(); // recargar panel
            
            // Buscar la sesión para mostrar el ticket
            const s = window.activeSessions.find(x => x.session_id == sid);
            if(s) showTicketForSession(s, data.pedido); // data.pedido is the specific order just created
            
        } else {
            window.showToast('Error: ' + (data.mensaje || 'No se pudo guardar la orden.'), 'error');
        }
    } catch(e) {
        window.showToast('Error de conexión al enviar la orden.', 'error');
    } finally {
        btn.innerHTML = orig; btn.disabled = false;
    }
};

// 5. TICKET Y PDF
let currentTicketData = null;

function showTicketForSession(session, specificOrder = null) {
    // Si mandamos un specificOrder, mostramos ticket solo de esa orden.
    // Si no, sumamos todas las órdenes de la sesión (cuenta total).
    
    const tc = document.getElementById('ticket-content');
    const modal = document.getElementById('ticket-modal');
    
    let items = [];
    let total = 0;
    let isPaid = false;
    let title = specificOrder ? `TICKET ORDEN #${specificOrder.order_id}` : `CUENTA TOTAL`;
    
    if(specificOrder) {
        // Un solo ticket de orden
        isPaid = specificOrder.status === 'PAID';
        specificOrder.details?.forEach(d => {
            items.push({
                name: d.product?.name || `Prod #${d.product_id}`,
                qty: d.quantity,
                price: parseFloat(d.unit_price_snapshot),
                notes: d.notes
            });
            total += (d.quantity * parseFloat(d.unit_price_snapshot));
        });
    } else {
        // Todas las órdenes de la sesión
        let allPaid = true;
        let hasOrders = false;
        session.orders?.forEach(o => {
            if(o.status === 'CANCELLED') return;
            hasOrders = true;
            if(o.status !== 'PAID') allPaid = false;
            o.details?.forEach(d => {
                items.push({
                    name: d.product?.name || `Prod #${d.product_id}`,
                    qty: d.quantity,
                    price: parseFloat(d.unit_price_snapshot),
                    notes: d.notes
                });
                total += (d.quantity * parseFloat(d.unit_price_snapshot));
            });
        });
        isPaid = hasOrders && allPaid;
    }
    
    const tablesStr = session.session_tables && session.session_tables.length > 0 
        ? session.session_tables.map(st => st.table?.table_number || '?').join(', ') 
        : 'Sin mesa asignada';
    
    const meseroN = window.appState.meseroName();
    const dateStr = new Date().toLocaleString('es-MX');
    
    currentTicketData = { session, items, total, title, tablesStr, meseroN, dateStr, isPaid };
    
    let html = `
        <div class="ticket-header">
            <h2>MENUDERÍA AVIÑA</h2>
            <p>La mejor birria y menudo de la región</p>
            <p style="margin-top:0.5rem;font-weight:bold;">${title}</p>
            <p>Atendió: ${meseroN}</p>
            <p>Cliente: ${session.titular_name}</p>
            <p>Mesa(s): ${tablesStr}</p>
            <p>${dateStr}</p>
        </div>
        <div class="ticket-items">
    `;
    
    items.forEach(i => {
        const sub = (i.qty * i.price).toFixed(2);
        html += `
            <div class="ticket-item">
                <span class="ticket-item-qty">${i.qty}x</span>
                <span class="ticket-item-name">${i.name}</span>
                <span class="ticket-item-price">$${sub}</span>
            </div>
            ${i.notes ? `<div class="ticket-item-notes">${i.notes}</div>` : ''}
        `;
    });
    
    html += `
        </div>
        <hr class="ticket-divider">
        <div class="ticket-total">
            <span>TOTAL A PAGAR:</span>
            <span>$${total.toFixed(2)}</span>
        </div>
        <div class="ticket-footer">
            <p>¡Gracias por su preferencia!</p>
            <p style="margin-top:0.5rem;color:${isPaid ? 'var(--success)' : 'var(--error)'};font-size:1.1rem;font-weight:bold;">
                ${isPaid ? 'PAGADO' : 'FAVOR DE PAGAR EN CAJA'}
            </p>
            <small>Ticket generado electrónicamente</small>
        </div>
    `;
    
    tc.innerHTML = html;
    
    modal.classList.remove('hidden');
    gsap.from('#ticket-modal .modal-content', { y: 50, opacity: 0, duration: 0.4, ease: 'back.out(1.5)' });
}

document.getElementById('ticket-close').addEventListener('click', () => {
    gsap.to('#ticket-modal .modal-content', { y: 20, opacity: 0, duration: 0.2, onComplete:()=>{
        document.getElementById('ticket-modal').classList.add('hidden');
        gsap.set('#ticket-modal .modal-content', {clearProps:'all'});
    }});
});

// GENERAR PDF DE VERDAD
document.getElementById('ticket-download-pdf').addEventListener('click', () => {
    if(!currentTicketData) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ format: [80, 200] }); // Formato ticketera térmica de 80mm
    
    const m = 5; // margin left
    let y = 10;
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("MENUDERIA AVINA", 40, y, { align: "center" });
    y += 6;
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(currentTicketData.title, 40, y, { align: "center" });
    y += 5;
    
    doc.setFontSize(8);
    doc.text(`Atendio: ${currentTicketData.meseroN}`, m, y); y += 4;
    doc.text(`Cliente: ${currentTicketData.session.titular_name}`, m, y); y += 4;
    doc.text(`Mesa(s): ${currentTicketData.tablesStr}`, m, y); y += 4;
    doc.text(currentTicketData.dateStr, m, y); y += 6;
    
    doc.setLineDash([1, 1], 0);
    doc.line(m, y, 75, y); y += 5;
    
    doc.setFont("helvetica", "bold");
    doc.text("CANT DESCRIPCION       IMPORTE", m, y); y += 5;
    doc.setFont("helvetica", "normal");
    
    currentTicketData.items.forEach(i => {
        const sub = (i.qty * i.price).toFixed(2);
        const qtyStr = i.qty.toString().padStart(2,' ');
        const priceStr = `$${sub}`;
        
        // Configurar líneas de texto si el nombre es muy largo
        const splitName = doc.splitTextToSize(i.name, 45); // width para el nombre
        
        doc.text(`${qtyStr}x`, m, y);
        doc.text(splitName, m + 8, y); // 8 es margen después de cant
        doc.text(priceStr, 75, y, { align: "right" });
        
        y += (splitName.length * 4); // Sumar líneas de texto
        
        if(i.notes) {
            const safeNotes = doc.splitTextToSize(`* ${i.notes}`, 60);
            doc.setFontSize(6);
            doc.text(safeNotes, m+8, y);
            doc.setFontSize(8);
            y += (safeNotes.length * 3);
        }
    });
    
    y += 2;
    doc.line(m, y, 75, y); y += 6;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: $${currentTicketData.total.toFixed(2)}`, 75, y, { align: "right" });
    
    y += 8;
    doc.setFontSize(10);
    if(currentTicketData.isPaid) {
        doc.text("PAGADO", 40, y, { align: "center" });
    } else {
        doc.text("PAGAR EN CAJA", 40, y, { align: "center" });
    }
    
    y += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Gracias por su preferencia", 40, y, { align: "center" });
    
    const safeName = currentTicketData.session.titular_name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    doc.save(`ticket_${safeName}_${currentTicketData.session.session_id}.pdf`);
});

window.showToast = function(msg, type='success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : '!');
    toast.innerHTML = `<span style="font-weight:bold;font-size:1.2rem;">${icon}</span> <span>${msg}</span>`;
    container.appendChild(toast);
    
    // trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // remove after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
};

});
