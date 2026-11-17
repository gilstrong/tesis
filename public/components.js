// c:\Users\jaime\Downloads\Page Tesis\components.js

class ServiGacoNav extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <nav class="main-nav" role="navigation" aria-label="Navegación principal">
        <div class="nav-container">
          <!-- Logo -->
          <div class="nav-brand">
            <img src="/logo.webp" alt="Logo ServiGaco" class="nav-logo" width="384" height="297" />
          </div>

          <!-- Links de navegación -->
          <ul class="nav-links">
            <li class="nav-item">
              <a href="index.html" class="nav-link" id="navTesis">
                <span class="nav-icon"><i class="ti ti-school" aria-hidden="true"></i></span>
                <span class="nav-text">Calculadora de Tesis</span>
              </a>
            </li>
            <li class="nav-item">
              <a href="calculadora_general.html" class="nav-link" id="navGeneral">
                <span class="nav-icon"><i class="ti ti-briefcase" aria-hidden="true"></i></span>
                <span class="nav-text">Servicios Generales</span>
              </a>
            </li>
            <li class="nav-item hidden" id="navItemAnalytics">
              <a href="analitica-visitantes.html" class="nav-link" id="navAnalytics">
                <span class="nav-icon"><i class="ti ti-world" aria-hidden="true"></i></span>
                <span class="nav-text">Visitantes</span>
              </a>
            </li>
          </ul>

          <div class="nav-actions">
            <!-- Botón Login/Logout (Seguridad) -->
            <button id="btnAuthNav" type="button" class="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none rounded-lg text-sm p-2.5 mr-1 transition-all" title="Acceso Empleados" aria-label="Acceso de empleados">
              <span id="iconAuth"><i class="ti ti-lock-open" aria-hidden="true"></i></span>
            </button>

            <!-- Botón Configuración -->
            <button id="btnSettings" type="button" class="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none rounded-lg text-sm p-2.5 mr-1 transition-all" title="Configuración" aria-label="Configuración">
              <i class="ti ti-settings text-lg" aria-hidden="true"></i>
            </button>

            <!-- Botón Dark Mode -->
            <button id="theme-toggle" type="button" aria-label="Cambiar tema" class="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg text-sm p-2.5 mr-2 transition-all duration-300">
              <i id="theme-toggle-dark-icon" class="ti ti-moon text-xl hidden" aria-hidden="true"></i>
              <i id="theme-toggle-light-icon" class="ti ti-sun text-xl hidden" aria-hidden="true"></i>
            </button>

            <!-- Botón móvil (hamburguesa) -->
            <button class="nav-toggle" aria-label="Abrir menú" aria-expanded="false">
              <span class="hamburger"></span>
            </button>
          </div>
        </div>
      </nav>
    `;

    this.inicializarLogica();
  }

  inicializarLogica() {
    // 1. Marcar página activa
    const paginaActual = window.location.pathname.split('/').pop() || 'index.html';
    const linkTesis = this.querySelector('#navTesis');
    const linkGeneral = this.querySelector('#navGeneral');
    const linkAnalytics = this.querySelector('#navAnalytics');
    const navItemAnalytics = this.querySelector('#navItemAnalytics');

    if (paginaActual === 'index.html' || paginaActual === '') {
      linkTesis?.classList.add('active');
    } else if (paginaActual === 'calculadora_general.html') {
      linkGeneral?.classList.add('active');
    } else if (paginaActual.includes('analitica-visitantes') || paginaActual.includes('analytics')) {
      linkAnalytics?.classList.add('active');
    }

    // Mostrar sección de visitantes SOLO a administradores autenticados
    if (navItemAnalytics) {
      const checkAuth = () => {
        if (typeof firebase !== 'undefined' && firebase.auth) {
          firebase.auth().onAuthStateChanged((user) => {
            if (user) {
              navItemAnalytics.classList.remove('hidden');
            } else {
              navItemAnalytics.classList.add('hidden');
            }
          });
        }
      };
      if (typeof firebase !== 'undefined' && firebase.auth) {
        checkAuth();
      } else {
        setTimeout(checkAuth, 500);
      }
    }

    // 2. Lógica Menú Móvil
    const navToggle = this.querySelector('.nav-toggle');
    const navLinks = this.querySelector('.nav-links');
    
    if (navToggle && navLinks) {
      navToggle.addEventListener('click', () => {
        const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-expanded', !isExpanded);
        navLinks.classList.toggle('active');
      });
      
      // Cerrar al hacer click fuera
      document.addEventListener('click', (e) => {
        if (!this.contains(e.target)) {
          navToggle.setAttribute('aria-expanded', 'false');
          navLinks.classList.remove('active');
        }
      });
    }

    // 3. Lógica Dark Mode
    const themeToggleBtn = this.querySelector('#theme-toggle');
    const darkIcon = this.querySelector('#theme-toggle-dark-icon');
    const lightIcon = this.querySelector('#theme-toggle-light-icon');

    // Verificar tema inicial
    if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      lightIcon.classList.remove('hidden');
    } else {
      document.documentElement.classList.remove('dark');
      darkIcon.classList.remove('hidden');
    }

    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        darkIcon.classList.toggle('hidden');
        lightIcon.classList.toggle('hidden');

        if (localStorage.getItem('color-theme')) {
          if (localStorage.getItem('color-theme') === 'light') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
          } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
          }
        } else {
          if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
          } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
          }
        }
      });
    }

    // 4. Lógica Botón Settings
    const btnSettings = this.querySelector('#btnSettings');
    if (btnSettings) {
        btnSettings.addEventListener('click', () => {
            document.querySelector('servigaco-settings')?.open();
        });
    }
  }
}

customElements.define('servigaco-nav', ServiGacoNav);

class ServiGacoFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="w-full mt-12 p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 text-center transition-all duration-300 hover:shadow-xl">
        <div class="flex flex-col items-center justify-center gap-4">
          <div class="flex items-center gap-3">
            <span class="text-2xl font-black bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent font-montserrat">ServiGaco</span>
            <span class="w-px h-6 bg-gray-300 dark:bg-gray-600"></span>
            <span class="text-sm font-semibold text-gray-500 dark:text-gray-400 tracking-wide uppercase">Calidad y Rapidez</span>
          </div>
          
          <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md leading-relaxed">
            Expertos en impresión de tesis, planos y material publicitario. 
            <br>Ubicados en Santo Domingo, República Dominicana.
          </p>
          
          <div class="w-full h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent my-2"></div>

          <div class="text-xs font-medium text-gray-600 dark:text-gray-400">
            &copy; ${new Date().getFullYear()} ServiGaco. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    `;
  }
}

customElements.define('servigaco-footer', ServiGacoFooter);

/**
 * COMPONENTE: AI Assistant Bot
 */
class ServigacoAIChat extends HTMLElement {
    constructor() {
        super();
        this.history = this.loadHistory();
        this.isOpen = false;
        this.pendingAnalysis = null; // 🛡️ Almacén temporal de metadatos
    }

    connectedCallback() {
        this.render();
        this.setupEvents();
    }

    render() {
        this.innerHTML = `
        <style>
            #chat-bubble { position: fixed; bottom: 24px; right: 24px; width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, var(--primary-blue) 0%, var(--primary-dark) 100%); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; font-size: 26px; transition: all var(--transition-normal); z-index: 9999; box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.5), 0 8px 10px -6px rgba(99, 102, 241, 0.3); }
            #chat-bubble:hover { transform: scale(1.08) translateY(-2px); box-shadow: 0 15px 30px -5px rgba(99, 102, 241, 0.6), 0 10px 15px -6px rgba(99, 102, 241, 0.4); }
            #chat-bubble:active { transform: scale(0.95); }
            #chat-panel { position: fixed; bottom: 96px; right: 24px; width: 360px; background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: var(--radius-lg); display: none; flex-direction: column; overflow: hidden; z-index: 9999; box-shadow: var(--shadow-xl); transition: all var(--transition-normal); animation: panelSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            @keyframes panelSlideIn { from { transform: translateY(20px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
            #chat-panel.drag-over { border: 2px dashed var(--primary-blue); background: rgba(99, 102, 241, 0.03); }
            #chat-header { background: linear-gradient(135deg, var(--primary-blue) 0%, var(--primary-dark) 100%); padding: 12px 18px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
            #chat-header span { color: white; font-size: 15px; font-weight: 700; flex: 1; letter-spacing: 0.3px; }
            #chat-header button { background: rgba(255, 255, 255, 0.12); border: none; color: white; cursor: pointer; font-size: 15px; padding: 7px; line-height: 1; margin: 0; box-shadow: none; border-radius: 10px; transition: all var(--transition-fast); display: flex; align-items: center; justify-content: center; }
            #chat-header button:hover { background: rgba(255, 255, 255, 0.22); transform: translateY(-1px); }
            #chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; max-height: 400px; min-height: 250px; background: var(--bg-tertiary); scrollbar-width: thin; }
            #chat-messages::-webkit-scrollbar { width: 6px; }
            #chat-messages::-webkit-scrollbar-track { background: transparent; }
            #chat-messages::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.3); border-radius: 3px; }
            #chat-messages::-webkit-scrollbar-thumb:hover { background: rgba(156, 163, 175, 0.5); }
            .msg { max-width: 85%; padding: 10px 14px; border-radius: 16px; font-size: 13.5px; line-height: 1.5; font-family: 'Montserrat', sans-serif; font-weight: 500; word-break: break-word; }
            .msg.bot { background: var(--bg-secondary); color: var(--text-primary); align-self: flex-start; border-bottom-left-radius: 4px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-light); }
            .msg.user { background: linear-gradient(135deg, var(--primary-blue) 0%, var(--primary-dark) 100%); color: white; align-self: flex-end; border-bottom-right-radius: 4px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15); }
            .msg.loading { opacity: 0.7; display: flex; align-items: center; gap: 8px; }
            .typing-indicator { display: flex; gap: 5px; align-items: center; padding: 4px 2px; }
            .typing-indicator span { width: 7px; height: 7px; background: var(--text-primary); opacity: 0.4; border-radius: 50%; animation: typingBounce 1.4s infinite ease-in-out both; }
            .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
            .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
            @keyframes typingBounce { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; } 40% { transform: scale(1.1); opacity: 1; } }
            #chat-input-area { border-top: 1px solid var(--border-light); padding: 12px 16px; display: flex; gap: 10px; align-items: center; background: var(--bg-secondary); }
            #chat-input { flex: 1; resize: none; border: 1.5px solid var(--border-light); border-radius: var(--radius-md); padding: 10px 14px; font-size: 13.5px; min-height: 42px; max-height: 100px; background: var(--bg-tertiary); color: var(--text-primary); margin: 0; transition: all var(--transition-fast); font-family: inherit; font-weight: 500; }
            #chat-input:focus { outline: none; border-color: var(--primary-blue); background: var(--bg-secondary); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
            #send-btn { background: linear-gradient(135deg, var(--primary-blue) 0%, var(--primary-dark) 100%); border: none; color: white; border-radius: var(--radius-md); width: 42px; height: 42px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; margin: 0; transition: all var(--transition-fast); box-shadow: 0 4px 10px rgba(99, 102, 241, 0.2); }
            #send-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(99, 102, 241, 0.3); }
            #send-btn:disabled { background: var(--border-medium); cursor: not-allowed; transform: none; box-shadow: none; }
            .notif-dot { position: absolute; top: -2px; right: -2px; width: 14px; height: 14px; background: var(--accent-orange); border-radius: 50%; display: none; border: 2.5px solid var(--bg-secondary); transform-origin: center; animation: pulse 2s infinite; }
            @keyframes pulse { 0%, 100% { transform: scale(0.92); opacity: 0.85; } 50% { transform: scale(1.05); opacity: 1; } }
            @media (prefers-reduced-motion: reduce) { .notif-dot { animation: none; } }
        </style>

        <button id="chat-bubble" aria-label="Abrir asistente">
            <i class="ti ti-robot"></i>
            <span class="notif-dot" id="notif-dot"></span>
        </button>

        <div id="chat-panel">
            <div id="chat-header">
                <i class="ti ti-robot" style="font-size:20px; color:white;"></i>
                <span>Asistente ServiGaco</span>
                <button id="clear-btn" title="Limpiar chat" aria-label="Limpiar chat"><i class="ti ti-trash"></i></button>
                <button id="close-btn" aria-label="Cerrar"><i class="ti ti-x"></i></button>
            </div>
            <div id="chat-messages">
                <div class="msg bot">¡Hola! Dime qué necesitas cotizar e imprimir, y te calcularé el precio de inmediato. <i class="ti ti-printer" aria-hidden="true"></i></div>
            </div>
            <div id="chat-input-area">
                <input type="file" id="chat-file-input" accept="application/pdf" style="display:none">
                <button id="chat-attach-btn" title="Adjuntar PDF" aria-label="Adjuntar PDF" style="background:none; color:var(--primary-blue); box-shadow:none; padding:0; margin:0 6px 0 0; font-size:22px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:transform var(--transition-fast);"><i class="ti ti-paperclip" aria-hidden="true"></i></button>
                <textarea id="chat-input" aria-label="Mensaje para el asistente" placeholder="Ej: tesis de 100 páginas..." rows="1"></textarea>
                <button id="send-btn" aria-label="Enviar"><i class="ti ti-send"></i></button>
            </div>
        </div>
        `;

        // Renderizar historial previo si existe
        if (this.history.length > 0) {
            this.history.forEach(msg => this.addMsg(msg.content, msg.role === 'user' ? 'user' : 'bot'));
        }
    }

    setupEvents() {
        const bubble = this.querySelector('#chat-bubble');
        const panel = this.querySelector('#chat-panel');
        const closeBtn = this.querySelector('#close-btn');
        const clearBtn = this.querySelector('#clear-btn');
        const attachBtn = this.querySelector('#chat-attach-btn');
        const fileInput = this.querySelector('#chat-file-input');
        const input = this.querySelector('#chat-input');
        const sendBtn = this.querySelector('#send-btn');
        const notifDot = this.querySelector('#notif-dot');

        bubble.onclick = () => {
            this.isOpen = !this.isOpen;
            panel.style.display = this.isOpen ? 'flex' : 'none';
            notifDot.style.display = 'none';
            if (this.isOpen) input.focus();
        };

        closeBtn.onclick = () => {
            this.isOpen = false;
            panel.style.display = 'none';
        };

        clearBtn.onclick = () => this.clearChat();

        attachBtn.onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
            if (e.target.files.length > 0) this.handlePDFUpload(e.target.files[0]);
        };

        // Drag & Drop
        panel.ondragover = (e) => { e.preventDefault(); panel.classList.add('drag-over'); };
        panel.ondragleave = () => panel.classList.remove('drag-over');
        panel.ondrop = (e) => {
            e.preventDefault();
            panel.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'application/pdf') {
                this.handlePDFUpload(file);
            } else {
                mostrarNotificacion('Solo se permiten archivos PDF', 'error');
            }
        };

        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendMessage(); }
        };

        sendBtn.onclick = () => this.sendMessage();

        input.oninput = () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 100) + 'px';
        };

        setTimeout(() => { if (!this.isOpen) notifDot.style.display = 'block'; }, 3000);
    }

    loadHistory() {
        try {
            return JSON.parse(localStorage.getItem('servigaco_chat_history')) || [];
        } catch (e) {
            return [];
        }
    }

    saveHistory() {
        localStorage.setItem('servigaco_chat_history', JSON.stringify(this.history));
    }

    clearChat() {
        if (confirm('¿Deseas borrar el historial del chat?')) {
            this.history = [];
            this.saveHistory();
            const messages = this.querySelector('#chat-messages');
            messages.innerHTML = '<div class="msg bot">¡Hola! Dime qué necesitas imprimir y te doy el precio al instante. <i class="ti ti-printer" aria-hidden="true"></i></div>';
            if (typeof mostrarNotificacion === 'function') {
                mostrarNotificacion('Historial del chat borrado', 'info');
            }
        }
    }

    addMsg(text, type) {
        const messages = this.querySelector('#chat-messages');
        const div = document.createElement('div');
        div.className = 'msg ' + type;
        
        // Formateo básico para mensajes de la IA
        if (type === 'loading') {
            // Render HTML directly for loading states (typing indicator)
            div.innerHTML = text;
        } else if (type === 'bot') {
            let formattedText = text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Negritas
                .replace(/\n/g, '<br>'); // Saltos de línea
            div.innerHTML = window.servigacoReplaceIconGlyphs(formattedText);
        } else {
            div.textContent = text;
        }

        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return div;
    }

    async handlePDFUpload(file) {
        const loadingId = 'pdf-loading-' + Date.now();
        this.addMsg(`📄 Analizando localmente: ${file.name}...`, 'bot loading', loadingId);

        try {
            // 🛡️ SOLUCIÓN: Analizar en el cliente para evitar caídas del servidor (OOM)
            await window.ensurePdfJs();

            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const totalPaginas = pdfDoc.numPages;

            let paginasColor = 0;
            let paginasBN = 0;

            // Canvas oculto para análisis
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const ESCALA = 0.35; // Escala optimizada para velocidad

            // Analizar todas las páginas (o una muestra si es muy grande)
            const maxPages = totalPaginas > 50 ? 20 : totalPaginas; 
            
            for (let i = 1; i <= totalPaginas; i++) {
                // Si es un PDF gigante (>50mb), usamos muestreo para no congelar el navegador
                if (totalPaginas > 50 && i > 10 && i < totalPaginas - 10) continue;

                const page = await pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: ESCALA });
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                
                // Reutilizamos la lógica de detección de color que ya tienes en script.js
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                let esColor = false;
                const TOLERANCIA = 20;

                for (let j = 0; j < data.length; j += 16) { // Muestreo de pixeles
                    const r = data[j], g = data[j+1], b = data[j+2];
                    if (Math.abs(r - g) + Math.abs(r - b) + Math.abs(g - b) > TOLERANCIA) {
                        if (r < 240 || g < 240 || b < 240) { // No es blanco/brillante
                            esColor = true;
                            break;
                        }
                    }
                }

                if (esColor) paginasColor++; else paginasBN++;
            }

            // Ajustar estimados si hubo muestreo
            const finalColor = totalPaginas > 50 ? `~${Math.round(paginasColor * (totalPaginas/20))}` : paginasColor;
            const finalBN = totalPaginas > 50 ? `~${Math.round(paginasBN * (totalPaginas/20))}` : paginasBN;

            this.querySelector(`#${loadingId}`)?.remove();

            const summary = `✅ **Documento analizado localmente**\n• Archivo: ${file.name}\n• Total: ${totalPaginas} páginas\n• Color: ${finalColor} | B/N: ${finalBN}\n\n*Los datos se han cargado. Ya puedes preguntarme precios sobre este archivo.*`;
            this.addMsg(summary, 'bot');

            // 🛡️ CAMBIO CLAVE: No llamamos a sendMessage automáticamente.
            // Guardamos los datos para incluirlos en la próxima pregunta del usuario.
            this.pendingAnalysis = {
                nombre: file.name,
                total: totalPaginas,
                color: finalColor,
                bn: finalBN
            };
            this.saveHistory();

        } catch (error) {
            console.error(error);
            this.querySelector(`#${loadingId}`)?.remove();
            this.addMsg('❌ No pude analizar el PDF. Intenta subirlo de nuevo.', 'bot');
        }
    }

    /**
     * Enviar mensaje a la IA
     * @param {string} customText - Mensaje opcional (para sistemas internos)
     * @param {boolean} silent - Si es true, no muestra el mensaje del usuario en el chat
     */
    async sendMessage(customText = null, silent = false) {
        const input = this.querySelector('#chat-input');
        const sendBtn = this.querySelector('#send-btn');
        let text = customText || input.value.trim();
        if (!text) return;

        if (!silent) {
            // 🛡️ INYECCIÓN DE CONTEXTO: 
            // Si hay un análisis pendiente, lo adjuntamos al mensaje del usuario
            // de forma invisible para que la IA sepa de qué archivo hablamos.
            if (this.pendingAnalysis) {
                const meta = this.pendingAnalysis;
                text = `[CONTEXTO PDF: ${meta.nombre}, ${meta.total} págs, Color:${meta.color}, BN:${meta.bn}] ${text}`;
                this.pendingAnalysis = null; // Limpiar para que no se repita
            }
            this.addMsg(text, 'user');
            input.value = '';
            input.style.height = 'auto';
        }
        
        sendBtn.disabled = true;

        const loadingMsg = this.addMsg('<div class="typing-indicator"><span></span><span></span><span></span></div>', 'bot loading');

        try {
            // Si estamos en Live Server (puerto 5500), apuntamos al backend (puerto 3000)
            // De lo contrario, usamos ruta relativa.
            const apiUrl = window.location.port === '5500' ? 'http://localhost:3000/chat-ia' : '/chat-ia';

            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mensaje: text, history: this.history })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Error en el servidor');
            }

            const data = await res.json();
            if (loadingMsg) {
                loadingMsg.remove();
            }
            
            const reply = data.reply || 'No pude procesar eso.';
            this.addMsg(reply, 'bot');
            this.history.push({ role: 'user', content: text });
            this.history.push({ role: 'assistant', content: reply });
            this.saveHistory();
        } catch(e) {
            console.error('Chat Error:', e);
            if (loadingMsg) {
                loadingMsg.remove();
            }
            this.addMsg('⚠️ Error: No puedo conectar con el servidor. Asegúrate de ejecutar "node server.js".', 'bot');
        }
        sendBtn.disabled = false;
    }
}

customElements.define('servigaco-ai-chat', ServigacoAIChat);
document.body.insertAdjacentHTML('beforeend', '<servigaco-ai-chat></servigaco-ai-chat>');

const SETTINGS_SECTIONS = [
    {
        id: 'tesis',
        label: 'Tesis',
        groups: [
            {
                title: 'Impresión — Carta',
                fields: [
                    { path: ['tesis', 'impresion', 'carta', 'bond', 'bn'], label: 'Bond B/N', unit: 'RD$ / página' },
                    { path: ['tesis', 'impresion', 'carta', 'bond', 'color'], label: 'Bond color', unit: 'RD$ / página' },
                    { path: ['tesis', 'impresion', 'carta', 'hilo', 'bn'], label: 'Hilo B/N', unit: 'RD$ / página' },
                    { path: ['tesis', 'impresion', 'carta', 'hilo', 'color'], label: 'Hilo color', unit: 'RD$ / página' },
                    { path: ['tesis', 'impresion', 'carta', 'satinado', 'precio'], label: 'Satinado', unit: 'RD$ / página' }
                ]
            },
            {
                title: 'Impresión — Legal y Tabloide',
                fields: [
                    { type: 'ranges', path: ['tesis', 'impresion', 'legal', 'bondBN'], label: 'Legal B/N' },
                    { type: 'ranges', path: ['tesis', 'impresion', 'legal', 'bondColor'], label: 'Legal color' },
                    { type: 'ranges', path: ['tesis', 'impresion', 'legal', 'satinado'], label: 'Legal satinado' },
                    { path: ['tesis', 'impresion', 'legal', 'hiloExtra', 'bn'], label: 'Recargo legal hilo B/N', unit: 'RD$ / página' },
                    { path: ['tesis', 'impresion', 'legal', 'hiloExtra', 'color'], label: 'Recargo legal hilo color', unit: 'RD$ / página' },
                    { path: ['tesis', 'impresion', 'legal', 'itlaSatinado'], label: 'Precio ITLA satinado', unit: 'RD$ / página' },
                    { path: ['tesis', 'impresion', 'tabloide', 'satinado', 'precio'], label: 'Tabloide satinado', unit: 'RD$ / página' }
                ]
            },
            {
                title: 'Empastado, vinil y espiral',
                fields: [
                    ...Object.entries({
                        beige: 'Beige',
                        morado: 'Morado',
                        azul_marino: 'Azul marino',
                        azul_cielo: 'Azul cielo',
                        rojo: 'Rojo',
                        verde_botella: 'Verde botella',
                        amarillo_medicina: 'Amarillo medicina',
                        blanco: 'Blanco'
                    }).map(([color, label]) => ({
                        path: ['tesis', 'tapaDura', 'colores', color],
                        label: `Tapa dura ${label}`,
                        unit: 'RD$ / tomo'
                    })),
                    { path: ['tesis', 'tapaDura', 'legal'], label: 'Tapa dura legal', unit: 'RD$ / tomo' },
                    { path: ['tesis', 'tapaDura', 'itla'], label: 'Tapa dura ITLA', unit: 'RD$ / tomo' },
                    { path: ['tesis', 'vinil', 'carta'], label: 'Vinil carta', unit: 'RD$ / tomo' },
                    { path: ['tesis', 'vinil', 'legal'], label: 'Vinil legal', unit: 'RD$ / tomo' },
                    { path: ['tesis', 'vinil', 'tabloide'], label: 'Vinil tabloide', unit: 'RD$ / tomo' },
                    { type: 'ranges', path: ['tesis', 'encuadernado'], label: 'Encuadernado espiral' }
                ]
            },
            {
                title: 'Servicios y entrega',
                fields: [
                    { path: ['tesis', 'servicios', 'lomo'], label: 'Rotulación de lomo', unit: 'RD$ / tomo' },
                    { path: ['tesis', 'servicios', 'cd'], label: 'CD rotulado', unit: 'RD$ / unidad' },
                    { path: ['tesis', 'servicios', 'redondeoMultiplo'], label: 'Redondear total al múltiplo de', unit: 'RD$' },
                    { path: ['tesis', 'entrega', 'tapaDura'], label: 'Tiempo de tapa dura', type: 'text' },
                    { path: ['tesis', 'entrega', 'vinil'], label: 'Tiempo de vinil', type: 'text' }
                ]
            }
        ]
    },
    {
        id: 'general',
        label: 'Servicios generales',
        groups: [
            ...[
                ['bn', 'B/N'],
                ['color', 'Color'],
                ['fullColor', 'Full color'],
                ['especiales', 'Especiales (cartonite, satinado y adhesivo)']
            ].map(([kind, label]) => ({
                title: `Impresión ${label}`,
                fields: ['carta', 'legal', 'tabloide'].map(size => ({
                    type: 'ranges',
                    path: ['general', 'impresion', kind, size],
                    label: size.charAt(0).toUpperCase() + size.slice(1)
                }))
            })),
            {
                title: 'Terminación y plastificado',
                fields: [
                    { type: 'ranges', path: ['general', 'encuadernado'], label: 'Encuadernado espiral' },
                    { path: ['general', 'empastado', 'tapaDura', 'carta'], label: 'Tapa dura carta', unit: 'RD$ / unidad' },
                    { path: ['general', 'empastado', 'tapaDura', 'legal'], label: 'Tapa dura legal', unit: 'RD$ / unidad' },
                    { path: ['general', 'empastado', 'tapaDura', 'tabloide'], label: 'Tapa dura tabloide', unit: 'RD$ / unidad' },
                    { path: ['general', 'empastado', 'tapaBlanda', 'carta'], label: 'Tapa blanda carta', unit: 'RD$ / unidad' },
                    { path: ['general', 'plastificado', 'cedula'], label: 'Plastificado cédula', unit: 'RD$ / hoja' },
                    { path: ['general', 'plastificado', 'carta'], label: 'Plastificado carta', unit: 'RD$ / hoja' },
                    { path: ['general', 'plastificado', 'legal'], label: 'Plastificado legal', unit: 'RD$ / hoja' },
                    { path: ['general', 'plastificado', 'tabloide'], label: 'Plastificado tabloide', unit: 'RD$ / hoja' }
                ]
            },
            {
                title: 'Ploteo — Bond por tamaño',
                fields: [
                    ...[
                        ['bondBN', 'Bond B/N'],
                        ['bondColor', 'Bond color'],
                        ['bondFullColor', 'Bond full color']
                    ].flatMap(([kind, label]) =>
                        ['17x22', '18x24', '24x36'].map(size => ({
                            path: ['general', 'ploteo', kind, size],
                            label: `${label} ${size}"`,
                            unit: 'RD$ / unidad'
                        }))
                    )
                ]
            },
            {
                title: 'Ploteo — Tamaño personalizado y materiales',
                fields: [
                    { path: ['general', 'ploteo', 'bondPorPie', 'bond_bn'], label: 'Bond B/N personalizado', unit: 'RD$ / pie²' },
                    { path: ['general', 'ploteo', 'bondPorPie', 'bond_color'], label: 'Bond color personalizado', unit: 'RD$ / pie²' },
                    { path: ['general', 'ploteo', 'bondPorPie', 'bond_full_color'], label: 'Bond full color personalizado', unit: 'RD$ / pie²' },
                    { path: ['general', 'ploteo', 'porPie', 'cartonite'], label: 'Cartonite', unit: 'RD$ / pie²' },
                    { path: ['general', 'ploteo', 'porPie', 'fotografico'], label: 'Fotográfico', unit: 'RD$ / pie²' },
                    { path: ['general', 'ploteo', 'porPie', 'lona'], label: 'Lona', unit: 'RD$ / pie²' },
                    { path: ['general', 'ploteo', 'porPie', 'cintra'], label: 'Cintra', unit: 'RD$ / pie²' },
                    { path: ['general', 'ploteo', 'porPie', 'canvas'], label: 'Canvas', unit: 'RD$ / pie²' },
                    { path: ['general', 'ploteo', 'fallbackPorPie'], label: 'Otros materiales', unit: 'RD$ / pie²' }
                ]
            }
        ]
    },
    {
        id: 'booklet',
        label: 'Booklet',
        groups: [{
            title: 'Impresión y portada',
            fields: [
                { path: ['booklet', 'bondBN'], label: 'Impresión Bond B/N', unit: 'RD$ / hoja física' },
                { path: ['booklet', 'bondColor'], label: 'Impresión Bond color', unit: 'RD$ / hoja física' },
                { path: ['booklet', 'cartonite'], label: 'Portada en cartonite', unit: 'RD$ / portada' }
            ]
        }]
    }
];

function getSettingsValue(catalog, path) {
    return path.reduce((value, key) => value && value[key], catalog);
}

function setSettingsValue(catalog, path, value) {
    const parent = path.slice(0, -1).reduce((current, key) => current[key], catalog);
    parent[path[path.length - 1]] = value;
}

function escapeSettingsHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

class ServigacoSettings extends HTMLElement {
    constructor() {
        super();
        this.activeSection = 'tesis';
        this.dirty = false;
        this.conflict = false;
        this.isAdmin = false;
        this.status = { ready: false, message: 'Cargando precios compartidos…' };
        this.saving = false;
    }

    connectedCallback() {
        this.render();
        this.setupEvents();
        if (window.ServigacoPricing) {
            window.ServigacoPricing.onChange((catalog, status) => this.handleCatalogChange(catalog, status));
        }
        if (window.firebase?.auth) {
            window.firebase.auth().onAuthStateChanged(() => this.refreshPermission());
        }
        this.refreshPermission();
    }

    open() {
        this.dirty = false;
        this.conflict = false;
        this.renderFields(window.ServigacoPricing.get());
        this.updateStatus();
        this.refreshPermission();
        this.querySelector('#settings-overlay').classList.remove('hidden');
        this.querySelector('#settings-modal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        this.querySelector('#close-settings').focus();
    }

    close() {
        this.querySelector('#settings-overlay').classList.add('hidden');
        this.querySelector('#settings-modal').classList.add('hidden');
        document.body.style.overflow = '';
    }

    render() {
        this.innerHTML = `
        <style>
            #settings-overlay { position: fixed; inset: 0; z-index: 10000; background: rgba(15, 23, 42, .58); }
            #settings-modal { position: fixed; inset: 5vh 50% auto auto; transform: translateX(50%); z-index: 10001; width: min(940px, calc(100vw - 28px)); max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; color: var(--text-primary); background: var(--bg-secondary); border: 1px solid var(--border-light); border-radius: var(--radius-lg); box-shadow: 0 24px 70px rgba(15, 23, 42, .28); }
            #settings-modal.hidden, #settings-overlay.hidden { display: none; }
            .settings-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 22px; border-bottom: 1px solid var(--border-light); }
            .settings-header h2 { margin: 0; font-size: 1.15rem; font-weight: 800; }
            .settings-header p { margin: 3px 0 0; color: var(--text-secondary); font-size: .82rem; }
            .settings-close { flex: 0 0 38px; width: 38px; height: 38px; border: 1px solid var(--border-light); border-radius: 9px; color: var(--text-primary); background: transparent; cursor: pointer; }
            .settings-close:focus-visible, .settings-tab:focus-visible, .settings-control:focus-visible, #save-settings:focus-visible { outline: 3px solid var(--primary-blue); outline-offset: 2px; }
            .settings-header, .settings-status, .settings-tabs, .settings-footer { flex-shrink: 0; }
            .settings-status { padding: 10px 22px; color: var(--text-secondary); font-size: .82rem; background: var(--bg-tertiary); }
            .settings-status[data-error="true"] { color: #b42318; background: #fef3f2; }
            .settings-tabs { display: flex; gap: 8px; overflow-x: auto; padding: 12px 22px 0; border-bottom: 1px solid var(--border-light); }
            .settings-tab { flex: 0 0 auto; padding: 9px 13px; border: 0; border-bottom: 2px solid transparent; color: var(--text-secondary); background: transparent; font: inherit; font-size: .9rem; font-weight: 700; cursor: pointer; }
            .settings-tab[aria-selected="true"] { color: var(--primary-blue); border-color: var(--primary-blue); }
            .settings-content { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 18px 22px; scrollbar-color: #94a3b8 transparent; }
            .settings-section[hidden] { display: none; }
            .settings-group { margin: 0 0 22px; }
            .settings-group h3 { margin: 0 0 10px; padding-bottom: 7px; border-bottom: 1px solid var(--border-light); font-size: .98rem; font-weight: 800; }
            .settings-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 16px; }
            .settings-field { min-width: 0; }
            .settings-field label, .settings-range-title { display: block; margin-bottom: 5px; font-size: .82rem; font-weight: 700; color: var(--text-primary); }
            .settings-input-wrap { display: flex; align-items: center; gap: 8px; min-height: 42px; padding: 0 10px; border: 1px solid var(--border-light); border-radius: 8px; background: var(--bg-secondary); }
            .settings-control { width: 100%; min-width: 0; padding: 9px 0; border: 0; outline: 0; color: var(--text-primary); background: transparent; font: inherit; font-size: .95rem; font-variant-numeric: tabular-nums; }
            .settings-control:disabled { cursor: not-allowed; color: var(--text-primary); -webkit-text-fill-color: var(--text-primary); opacity: 1; }
            .settings-unit { flex: 0 0 auto; color: var(--text-secondary); font-size: .75rem; }
            .settings-range { grid-column: 1 / -1; margin: 0; padding: 10px; border: 1px solid var(--border-light); border-radius: 9px; }
            .settings-range-title { margin-bottom: 8px; }
            .settings-range-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 8px; }
            .settings-range-row label { display: block; margin-bottom: 3px; color: var(--text-secondary); font-size: .72rem; }
            .settings-range-row .settings-input-wrap { min-height: 38px; }
            .settings-range-row .settings-control { padding: 7px 0; font-size: .88rem; }
            .settings-note { margin: 0; color: var(--text-secondary); font-size: .8rem; }
            .settings-footer { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 22px; border-top: 1px solid var(--border-light); }
            .settings-permission { color: var(--text-secondary); font-size: .8rem; }
            #save-settings { flex: 0 0 auto; min-height: 42px; padding: 0 18px; border: 0; border-radius: 8px; color: #fff; background: var(--primary-blue); font: inherit; font-weight: 800; cursor: pointer; }
            #save-settings:hover:not(:disabled) { filter: brightness(.94); }
            #save-settings:disabled { cursor: not-allowed; opacity: .55; }
            @media (max-width: 620px) {
                #settings-modal { inset: 2vh 50% auto auto; width: calc(100vw - 18px); max-height: 96vh; border-radius: 12px; }
                .settings-header, .settings-content { padding-right: 14px; padding-left: 14px; }
                .settings-status, .settings-tabs, .settings-footer { padding-right: 14px; padding-left: 14px; }
                .settings-fields { grid-template-columns: minmax(0, 1fr); }
                .settings-range-row { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
                .settings-range { grid-column: auto; }
                .settings-footer { align-items: stretch; flex-direction: column; }
                #save-settings { width: 100%; }
            }
        </style>
        <div id="settings-overlay" class="hidden"></div>
        <section id="settings-modal" class="hidden" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <header class="settings-header">
                <div>
                    <h2 id="settings-title"><i class="ti ti-settings" aria-hidden="true"></i> Configuración de precios</h2>
                    <p>Catálogo compartido para cotizaciones nuevas</p>
                </div>
                <button id="close-settings" class="settings-close" type="button" aria-label="Cerrar configuración" title="Cerrar">
                    <i class="ti ti-x" aria-hidden="true"></i>
                </button>
            </header>
            <div id="settings-status" class="settings-status" role="status" aria-live="polite"></div>
            <nav class="settings-tabs" role="tablist" aria-label="Secciones de precios"></nav>
            <div class="settings-content"></div>
            <footer class="settings-footer">
                <span class="settings-permission" id="settings-permission"></span>
                <button id="save-settings" type="button"><i class="ti ti-device-floppy" aria-hidden="true"></i> Guardar precios</button>
            </footer>
        </section>`;
        this.renderTabs();
    }

    renderTabs() {
        this.renderCatalog = window.ServigacoPricing.get();
        this.querySelector('.settings-tabs').innerHTML = SETTINGS_SECTIONS.map(section => `
            <button type="button" class="settings-tab" role="tab" data-section="${section.id}" aria-selected="${section.id === this.activeSection}">
                ${section.label}
            </button>
        `).join('');
        this.querySelector('.settings-content').innerHTML = SETTINGS_SECTIONS.map(section => `
            <div class="settings-section" role="tabpanel" data-panel="${section.id}" ${section.id === this.activeSection ? '' : 'hidden'}>
                ${section.groups.map((group, groupIndex) => `
                    <section class="settings-group">
                        <h3>${group.title}</h3>
                        <div class="settings-fields">
                            ${group.fields.map((field, fieldIndex) => this.renderField(field, `${section.id}-${groupIndex}-${fieldIndex}`)).join('')}
                        </div>
                    </section>
                `).join('')}
            </div>
        `).join('');
    }

    renderField(field, idPrefix) {
        if (field.type === 'ranges') {
            const ranges = getSettingsValue(this.renderCatalog, field.path);
            return `
                <fieldset class="settings-range">
                    <legend class="settings-range-title">${field.label} <span class="settings-unit">RD$ / página</span></legend>
                    ${ranges.map((range, index) => `
                        <div class="settings-range-row">
                            ${this.renderInput([...field.path, index, 'min'], 'Desde', `${idPrefix}-${index}-min`, 'number', 'páginas', '1')}
                            ${this.renderInput([...field.path, index, 'max'], 'Hasta', `${idPrefix}-${index}-max`, 'max', 'vacío = sin límite', '1')}
                            ${this.renderInput([...field.path, index, 'precio'], `Precio ${index + 1}`, `${idPrefix}-${index}-precio`, 'number', 'RD$', '0.01')}
                        </div>
                    `).join('')}
                </fieldset>
            `;
        }
        return this.renderInput(field.path, field.label, idPrefix, field.type || 'number', field.unit || 'RD$', field.step || '0.01');
    }

    renderInput(path, label, id, type, unit, step) {
        const value = getSettingsValue(this.renderCatalog, path);
        const inputType = type === 'text' ? 'text' : 'number';
        const optionalMax = type === 'max';
        const min = type === 'number' && step === '1' ? '1' : '0';
        return `
            <div class="settings-field">
                <label for="${id}">${label}</label>
                <div class="settings-input-wrap">
                    <input id="${id}" class="settings-control" type="${inputType}" data-price-input
                        data-path="${encodeURIComponent(JSON.stringify(path))}" data-kind="${type}"
                        value="${escapeSettingsHtml(value === null ? '' : value)}"
                        ${inputType === 'number' ? `min="${min}" step="${step}"` : ''}
                        ${optionalMax ? '' : 'required'}>
                    <span class="settings-unit">${unit}</span>
                </div>
            </div>
        `;
    }

    renderFields(catalog = window.ServigacoPricing.get()) {
        this.renderCatalog = catalog;
        this.querySelectorAll('[data-price-input]').forEach(input => {
            const path = JSON.parse(decodeURIComponent(input.dataset.path));
            const value = getSettingsValue(catalog, path);
            input.value = value === null ? '' : String(value);
        });
    }

    setupEvents() {
        this.querySelector('#close-settings').addEventListener('click', () => this.close());
        this.querySelector('#settings-overlay').addEventListener('click', () => this.close());
        this.querySelector('#save-settings').addEventListener('click', () => this.save());
        this.querySelector('.settings-tabs').addEventListener('click', event => {
            const tab = event.target.closest('[data-section]');
            if (!tab) return;
            this.activeSection = tab.dataset.section;
            this.querySelectorAll('.settings-tab').forEach(button => {
                button.setAttribute('aria-selected', String(button === tab));
            });
            this.querySelectorAll('.settings-section').forEach(panel => {
                panel.hidden = panel.dataset.panel !== this.activeSection;
            });
        });
        this.querySelector('.settings-content').addEventListener('input', event => {
            if (!event.target.matches('[data-price-input]')) return;
            this.dirty = true;
            this.updateStatus();
            this.updateControls();
        });
        this.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !this.querySelector('#settings-modal').classList.contains('hidden')) {
                this.close();
            }
        });
    }

    handleCatalogChange(catalog, status) {
        this.status = status;
        if (!this.querySelector('#settings-modal').classList.contains('hidden')) {
            if (this.dirty) {
                this.conflict = true;
            } else {
                this.renderFields(catalog);
            }
        } else {
            this.renderCatalog = catalog;
        }
        this.updateStatus();
        this.updateControls();
    }

    async refreshPermission() {
        const user = window.firebase?.auth?.().currentUser;
        this.isAdmin = false;
        if (user) {
            try {
                const token = await user.getIdTokenResult();
                this.isAdmin = token.claims.admin === true;
            } catch (error) {
                console.error('[Configuración] No se pudo comprobar el claim de administrador:', error);
            }
        }
        this.updateStatus();
        this.updateControls();
    }

    updateStatus() {
        const status = this.querySelector('#settings-status');
        if (!status) return;
        const message = this.conflict
            ? 'El catálogo cambió en otro dispositivo. Cierra y vuelve a abrir para revisar los valores nuevos.'
            : this.status.message;
        status.textContent = message;
        status.dataset.error = String(this.conflict || !this.status.ready);
        const permission = this.querySelector('#settings-permission');
        if (permission) {
            permission.textContent = this.isAdmin
                ? 'Administrador verificado · los cambios se sincronizan entre dispositivos.'
                : 'Solo lectura · se requiere el claim admin: true para guardar.';
        }
    }

    updateControls() {
        const canEdit = this.isAdmin && this.status.ready && !this.conflict && !this.saving;
        this.querySelectorAll('[data-price-input]').forEach(input => {
            input.disabled = !canEdit;
        });
        const saveButton = this.querySelector('#save-settings');
        if (saveButton) {
            saveButton.disabled = !canEdit;
            saveButton.innerHTML = this.saving
                ? '<i class="ti ti-loader-2" aria-hidden="true"></i> Guardando…'
                : '<i class="ti ti-device-floppy" aria-hidden="true"></i> Guardar precios';
        }
    }

    async save() {
        if (!window.ServigacoPricing) return;
        const draft = window.ServigacoPricing.get();
        try {
            this.querySelectorAll('[data-price-input]').forEach(input => {
                if (!input.reportValidity()) throw new Error('Completa todos los campos requeridos con valores válidos.');
                const path = JSON.parse(decodeURIComponent(input.dataset.path));
                const value = input.value.trim();
                if (input.dataset.kind === 'text') {
                    setSettingsValue(draft, path, value);
                } else if (input.dataset.kind === 'max' && value === '') {
                    setSettingsValue(draft, path, null);
                } else {
                    const number = Number(value);
                    if (!Number.isFinite(number)) throw new Error('Todos los precios y rangos deben ser números finitos.');
                    setSettingsValue(draft, path, number);
                }
            });
            const errors = window.ServigacoPricing.validate(draft);
            if (errors.length) throw new Error(errors[0]);
            this.saving = true;
            this.updateControls();
            await window.ServigacoPricing.save(draft);
            this.dirty = false;
            this.conflict = false;
            if (typeof window.mostrarNotificacion === 'function') {
                window.mostrarNotificacion('Precios guardados y sincronizados con Firebase.', 'success');
            }
            this.close();
        } catch (error) {
            console.error('[Configuración] Error guardando precios:', error);
            this.querySelector('#settings-status').textContent = error.message || 'No se pudieron guardar los precios.';
            this.querySelector('#settings-status').dataset.error = 'true';
        } finally {
            this.saving = false;
            this.updateControls();
        }
    }
}

customElements.define('servigaco-settings', ServigacoSettings);
document.body.insertAdjacentHTML('beforeend', '<servigaco-settings></servigaco-settings>');
