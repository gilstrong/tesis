// c:\Users\jaime\Downloads\Page Tesis\components.js

class ServiGacoNav extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <nav class="main-nav" role="navigation" aria-label="Navegación principal">
        <div class="nav-container">
          <!-- Logo -->
          <div class="nav-brand">
            <img src="logo.png" alt="Logo ServiGaco" class="nav-logo" />
          </div>

          <!-- Links de navegación -->
          <ul class="nav-links">
            <li class="nav-item">
              <a href="index.html" class="nav-link" id="navTesis">
                <span class="nav-icon">🎓</span>
                <span class="nav-text">Calculadora de Tesis</span>
              </a>
            </li>
            <li class="nav-item">
              <a href="calculadora_general.html" class="nav-link" id="navGeneral">
                <span class="nav-icon">📋</span>
                <span class="nav-text">Servicios Generales</span>
              </a>
            </li>
            <li class="nav-item hidden" id="navItemAnalytics">
              <a href="analitica-visitantes.html" class="nav-link" id="navAnalytics">
                <span class="nav-icon">🌐</span>
                <span class="nav-text">Visitantes</span>
              </a>
            </li>
          </ul>

          <!-- Botón Login/Logout (Seguridad) -->
          <button id="btnAuthNav" type="button" class="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none rounded-lg text-sm p-2.5 mr-1 transition-all" title="Acceso Empleados">
            <span id="iconAuth">🔓</span>
          </button>

          <!-- Botón Configuración -->
          <button id="btnSettings" type="button" class="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none rounded-lg text-sm p-2.5 mr-1 transition-all" title="Configuración">
            <span class="text-lg">⚙️</span>
          </button>

          <!-- Botón Dark Mode -->
          <button id="theme-toggle" type="button" class="text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:focus:ring-gray-700 rounded-lg text-sm p-2.5 mr-2 transition-all duration-300">
            <svg id="theme-toggle-dark-icon" class="hidden w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
            <svg id="theme-toggle-light-icon" class="hidden w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" fill-rule="evenodd" clip-rule="evenodd"></path></svg>
          </button>

          <!-- Botón móvil (hamburguesa) -->
          <button class="nav-toggle" aria-label="Abrir menú" aria-expanded="false">
            <span class="hamburger"></span>
          </button>
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

          <div class="text-xs font-medium text-gray-400 dark:text-gray-500">
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
            .notif-dot { position: absolute; top: -2px; right: -2px; width: 14px; height: 14px; background: var(--accent-orange); border-radius: 50%; display: none; border: 2.5px solid var(--bg-secondary); animation: pulse 2s infinite; }
            @keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.5); } 70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(244, 63, 94, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(244, 63, 94, 0); } }
        </style>

        <button id="chat-bubble" aria-label="Abrir asistente">
            <i class="ti ti-robot"></i>
            <span class="notif-dot" id="notif-dot"></span>
        </button>

        <div id="chat-panel">
            <div id="chat-header">
                <i class="ti ti-robot" style="font-size:20px; color:white;"></i>
                <span>Asistente ServiGaco</span>
                <button id="clear-btn" title="Limpiar chat"><i class="ti ti-trash"></i></button>
                <button id="close-btn" aria-label="Cerrar"><i class="ti ti-x"></i></button>
            </div>
            <div id="chat-messages">
                <div class="msg bot">¡Hola! Dime qué necesitas cotizar e imprimir, y te calcularé el precio de inmediato. 🖨️</div>
            </div>
            <div id="chat-input-area">
                <input type="file" id="chat-file-input" accept="application/pdf" style="display:none">
                <button id="chat-attach-btn" title="Adjuntar PDF" style="background:none; color:var(--primary-blue); box-shadow:none; padding:0; margin:0 6px 0 0; font-size:22px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:transform var(--transition-fast);">📎</button>
                <textarea id="chat-input" placeholder="Ej: tesis de 100 páginas..." rows="1"></textarea>
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
            messages.innerHTML = '<div class="msg bot">¡Hola! Dime qué necesitas imprimir y te doy el precio al instante. 🖨️</div>';
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
            div.innerHTML = formattedText;
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
            if (!window.pdfjsLib) {
                throw new Error('Librería PDF.js no cargada');
            }

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

/**
 * COMPONENTE: Settings Modal
 * Este es el "cerebro" que hace que el botón ⚙️ funcione.
 */
class ServigacoSettings extends HTMLElement {
    constructor() {
        super();
        this.config = window.SERVIGACO_CONFIG || {};
    }

    connectedCallback() {
        this.render();
        this.setupEvents();
    }

    open() {
        this.querySelector('#settings-overlay').classList.remove('hidden');
        this.querySelector('#settings-modal').classList.remove('hidden');
    }

    close() {
        this.querySelector('#settings-overlay').classList.add('hidden');
        this.querySelector('#settings-modal').classList.add('hidden');
    }

    render() {
        this.innerHTML = `
        <style>
            #settings-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); z-index: 10000; transition: opacity var(--transition-normal); }
            #settings-modal { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-width: 480px; background: var(--bg-secondary); border-radius: var(--radius-lg); box-shadow: var(--shadow-xl); z-index: 10001; padding: 28px; color: var(--text-primary); border: 1px solid var(--border-light); animation: modalZoomIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            @keyframes modalZoomIn { from { transform: translate(-50%, -50%) scale(0.95); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
            .settings-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; border-bottom: 1.5px solid var(--border-light); padding-bottom: 14px; }
            .settings-header h3 { font-size: 1.15rem; font-weight: 800; letter-spacing: -0.2px; }
            .settings-body { display: flex; flex-direction: column; gap: 20px; }
            .setting-item { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
            .setting-item label { margin: 0; font-size: 0.9rem; font-weight: 600; color: var(--text-secondary); }
            .setting-item input { width: 90px; padding: 8px 12px; margin: 0; border: 1.5px solid var(--border-light); border-radius: var(--radius-md); background: var(--bg-tertiary); color: var(--text-primary); text-align: center; font-weight: 700; font-family: inherit; transition: all var(--transition-fast); }
            .setting-item input:focus { border-color: var(--primary-blue); background: var(--bg-secondary); outline: none; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
            .hidden { display: none; }
            #save-settings { margin-top: 10px; background: linear-gradient(135deg, var(--primary-blue) 0%, var(--primary-dark) 100%); color: white; border: none; padding: 12px; border-radius: var(--radius-md); font-weight: 700; cursor: pointer; transition: all var(--transition-fast); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2); width: 100%; display: flex; align-items: center; justify-content: center; }
            #save-settings:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(99, 102, 241, 0.3); }
        </style>
        <div id="settings-overlay" class="hidden"></div>
        <div id="settings-modal" class="hidden">
            <div class="settings-header">
                <h3 class="font-bold text-lg">⚙️ Configuración</h3>
                <button id="close-settings" style="background:none; color:var(--text-muted); box-shadow:none; padding:6px; margin:0; cursor:pointer; font-size:16px; display:flex; align-items:center; justify-content:center; border-radius:50%; width:32px; height:32px; transition:background var(--transition-fast); border:none;" onmouseover="this.style.background='var(--bg-tertiary)'" onmouseout="this.style.background='none'">✕</button>
            </div>
            <div class="settings-body">
                <div class="setting-item">
                    <label>Precio B/N (Carta)</label>
                    <input type="number" id="set-bn" value="6">
                </div>
                <div class="setting-item">
                    <label>Precio Color (Carta)</label>
                    <input type="number" id="set-color" value="12">
                </div>
                <hr class="border-gray-100 dark:border-gray-700" style="margin: 4px 0;">
                <p class="text-xs text-gray-400 dark:text-gray-500 font-medium">Esta configuración se guarda localmente en este navegador.</p>
                <button id="save-settings" class="w-full bg-blue-600 py-2 rounded-lg font-bold">Guardar Cambios</button>
            </div>
        </div>
        `;
    }

    setupEvents() {
        const closeX = this.querySelector('#close-settings');
        const overlay = this.querySelector('#settings-overlay');
        const saveBtn = this.querySelector('#save-settings');

        const closeHandler = () => this.close();
        closeX.onclick = closeHandler;
        overlay.onclick = closeHandler;
        saveBtn.onclick = () => {
            mostrarNotificacion('✅ Configuración actualizada (Simulado)', 'success');
            this.close();
        };
    }
}

customElements.define('servigaco-settings', ServigacoSettings);
document.body.insertAdjacentHTML('beforeend', '<servigaco-settings></servigaco-settings>');
