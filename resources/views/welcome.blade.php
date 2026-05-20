<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Panel de Mesero - Menudería Aviña</title>
    <meta name="api-url" content="{{ config('app.api_url') }}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/style.css') }}">
</head>
<body>
    <div id="background-blobs">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
    </div>

    <div id="app">
        <!-- VISTA DE LOGIN -->
        <section id="login-view" class="view active">
            <div class="glass-card login-card">
                <div class="login-header">
                    <h2>Bienvenido</h2>
                    <p>Ingresa tus credenciales para continuar</p>
                </div>
                <form id="login-form">
                    <div class="input-group">
                        <label for="email">Correo Electrónico</label>
                        <input type="email" id="email" placeholder="mesero@ejemplo.com" required>
                    </div>
                    <div class="input-group">
                        <label for="password">Contraseña</label>
                        <input type="password" id="password" placeholder="Tu contraseña" required>
                    </div>
                    <p id="login-error" class="error-message"></p>
                    <button type="submit" class="btn-primary" id="login-btn">
                        <span>Iniciar Sesión</span>
                    </button>
                </form>
            </div>
        </section>

        <!-- VISTA DEL MENÚ -->
        <section id="menu-view" class="view hidden">
            <header class="glass-header">
                <div class="header-top">
                    <span id="welcome-message" class="welcome-text">Bienvenido</span>
                    <div class="header-actions">
                        <button id="new-session-btn" class="btn-success btn-sm">+ Nueva Sesión</button>
                        <button id="profile-btn" class="btn-secondary btn-sm">Mi Perfil</button>
                        <button id="cart-btn" class="cart-icon-btn" style="display:flex; align-items:center; gap:0.5rem; padding:0.4rem 0.8rem;">
                            <img src="{{ asset('images/products/Caarrito_compras.png') }}" alt="Carrito" style="width:24px; height:24px; object-fit:contain; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));">
                            <span id="cart-badge" class="badge-count">0</span>
                        </button>
                        <button class="logout-btn btn-secondary btn-sm">Cerrar Sesión</button>
                    </div>
                </div>
                <div class="header-title">
                    <h1 class="text-center">Catálogo del Menú</h1>
                </div>
            </header>

            <div class="main-layout">
                <div class="menu-area">
                    <div id="loading-spinner" class="spinner-container">
                        <div class="spinner"></div>
                        <p>Cargando menú...</p>
                    </div>
                    <!-- Category Tabs -->
                    <div id="category-tabs-container" class="category-tabs-container hidden">
                        <div id="category-tabs" class="category-tabs"></div>
                    </div>
                    <!-- Products Grid -->
                    <div id="products-grid" class="hidden"></div>
                </div>

                <!-- Sidebar de Sesiones Activas -->
                <aside class="sessions-sidebar" id="sessions-sidebar">
                    <div class="sidebar-title" style="text-align: center; justify-content: center;">
                        Mis Sesiones Activas
                    </div>
                    <div id="sessions-list">
                        <div class="no-sessions-msg">Cargando sesiones...</div>
                    </div>
                </aside>
            </div>


        </section>

        <!-- VISTA DEL CARRITO -->
        <section id="cart-view" class="view hidden">
            <header class="glass-header">
                <div class="header-top">
                    <button id="back-to-menu-btn" class="btn-secondary btn-sm">← Volver al Menú</button>
                    <div class="header-actions">
                        <button id="profile-btn-cart" class="btn-secondary btn-sm">Mi Perfil</button>
                        <button class="logout-btn btn-secondary btn-sm">Cerrar Sesión</button>
                    </div>
                </div>
                <div class="header-title">
                    <h1 class="text-center">Orden Actual</h1>
                </div>
            </header>

            <main class="menu-container" style="padding-top:1.5rem;">
                <!-- Session selector -->
                <div class="session-selector glass-card" id="session-selector-box">
                    <label>Asignar a sesión activa:</label>
                    <select id="session-select" class="input-group">
                        <option value="">-- Selecciona una sesión --</option>
                    </select>
                </div>

                <div id="cart-empty-msg" class="text-center hidden" style="padding: 3rem;">
                    <p style="font-size: 1.2rem; color: var(--text-secondary);">No hay platillos en la orden aún.</p>
                </div>

                <div id="cart-items-container" class="cart-list"></div>

                <div class="cart-summary glass-card hidden" id="cart-summary-box">
                    <div class="summary-row total-row">
                        <span>Total de la Orden:</span>
                        <span id="cart-total-price" class="price">$0.00</span>
                    </div>
                    <div class="summary-actions">
                        <button id="empty-cart-btn" class="btn-secondary">Vaciar Orden</button>
                        <button id="confirm-order-btn" class="btn-primary">Confirmar Orden</button>
                    </div>
                </div>
            </main>
        </section>

        <!-- MODAL CREAR SESIÓN -->
        <div id="create-session-modal" class="modal hidden">
            <div class="modal-backdrop"></div>
            <div class="glass-card modal-content" style="max-width: 480px;">
                <button class="close-modal-btn close-create-session" aria-label="Cerrar">&times;</button>
                <div class="modal-body">
                    <h2 style="margin-bottom:0.5rem;">Nueva Sesión</h2>
                    <p style="color:var(--text-secondary); margin-bottom: 1.5rem;">Atendiendo: <span id="create-session-mesero-name" style="font-weight:bold;color:var(--accent);"></span></p>
                    <div class="create-session-form">
                        <div class="input-group">
                            <label for="session-titular">Nombre del titular (cliente)</label>
                            <input type="text" id="session-titular" placeholder="Ej: Familia García" required>
                        </div>
                        <div class="input-group">
                            <label>Seleccionar mesa(s):</label>
                            <div id="tables-chips" class="tables-selector">
                                <p style="color:var(--text-secondary);font-size:0.85rem;">Cargando mesas...</p>
                            </div>
                            <div id="selected-tables-info" class="selected-tables-list"></div>
                        </div>
                        <p id="create-session-error" class="error-message"></p>
                        <button id="create-session-submit" class="btn-primary">Crear Sesión</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL DE PERFIL -->
        <div id="profile-modal" class="modal hidden">
            <div class="modal-backdrop"></div>
            <div class="modal-content glass-card" style="max-width: 400px;">
                <button class="close-profile-btn" style="position:absolute;top:1rem;right:1rem;background:rgba(0,0,0,0.3);border:none;color:white;width:32px;height:32px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:1.2rem;transition:background 0.3s;z-index:10;">✕</button>
                <div class="modal-body text-center">
                    <div style="width:80px;height:80px;border-radius:50%;background:var(--accent);color:white;display:flex;align-items:center;justify-content:center;font-size:2.5rem;margin:0 auto 1.5rem auto;font-weight:bold;box-shadow:0 4px 15px rgba(59,130,246,0.4);">
                        <span id="profile-initial">M</span>
                    </div>
                    <h2 id="profile-name" style="margin-bottom:0.5rem;font-size:1.5rem;color:var(--text-primary);">Cargando...</h2>
                    <p id="profile-email" style="color:var(--text-secondary);margin-bottom:1rem;">...</p>
                    <span class="badge" style="background:rgba(16,185,129,0.2);color:var(--success);margin-bottom:1.5rem;">Mesero Autorizado</span>
                    <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--glass-border);text-align:left;">
                        <p style="font-size:0.85rem;color:var(--text-secondary);line-height:1.5;">
                            * Por razones de seguridad, la edición de perfil está restringida al Administrador del sistema.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL DE TICKET -->
        <div id="ticket-modal" class="modal hidden">
            <div class="modal-backdrop"></div>
            <div class="glass-card modal-content" style="max-width:440px;background:transparent;border:none;box-shadow:none;backdrop-filter:none;">
                <div id="ticket-content" class="ticket-content">
                    <!-- Se renderiza dinámicamente -->
                </div>
                <div class="ticket-actions">
                    <button id="ticket-download-pdf" class="btn-primary btn-sm">Descargar PDF</button>
                    <button id="ticket-close" class="btn-secondary btn-sm">Cerrar</button>
                </div>
            </div>
        </div>
    </div>

    <!-- MODAL PRODUCTO -->
    <div id="product-modal" class="modal hidden">
        <div class="modal-backdrop"></div>
        <div class="glass-card modal-content">
            <button class="close-modal-btn" aria-label="Cerrar">&times;</button>
            <div class="modal-body">
                <div class="modal-image-placeholder"></div>
                <h2 id="modal-title"></h2>
                <span id="modal-category" class="badge"></span>
                <p id="modal-desc"></p>
                <div class="notes-group">
                    <label for="modal-notes">Notas especiales para este platillo:</label>
                    <textarea id="modal-notes" class="notes-textarea" placeholder="Ej: Sin cebolla, extra picante, sin limón..." maxlength="255"></textarea>
                </div>
                <div class="modal-footer">
                    <span id="modal-price" class="price"></span>
                    <button id="add-to-cart-btn" class="btn-primary">Añadir a orden</button>
                </div>
            </div>
        </div>
    </div>

    <div id="toast-container" class="toast-container"></div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="{{ asset('js/app.js') }}"></script>
</body>
</html>
