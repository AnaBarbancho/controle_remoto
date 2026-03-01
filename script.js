/**
 * script.js — Samsung Remote
 * Usa a classe SamsungRemote (via WebSocket) para controlar a TV diretamente.
 */

/* ── State ─────────────────────────────────── */
const state = {
  volume: 40,
  muted: false,
  playing: false,
  channel: 1,
  volTimer: null,
  toastTimer: null,
  remote: null, // Instância do SamsungRemote
  connected: false,
};

/* ── DOM refs ───────────────────────────────── */
const connectScreen = document.getElementById('connect-screen');
const remoteWrapper = document.getElementById('remote-wrapper');
const roomInput = document.getElementById('room-input');
const btnConnect = document.getElementById('btn-connect');
const connectStatus = document.getElementById('connect-status');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const clock = document.getElementById('clock');
const toast = document.getElementById('toast');
const iconPlay = document.getElementById('icon-play');
const iconPause = document.getElementById('icon-pause');
const btnMute = document.getElementById('btn-mute');
const rippleContainer = document.getElementById('ripple-container');
const btnDisconnect = document.getElementById('btn-disconnect');
const deviceName = document.getElementById('device-name');
const sslFix = document.getElementById('ssl-fix');

/* ── Clock ──────────────────────────────────── */
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  clock.textContent = `${h}:${m}`;
}
updateClock();
setInterval(updateClock, 15000);

/* ── Toast ──────────────────────────────────── */
function showToast(msg, duration = 1800) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

/* ── Ripple ─────────────────────────────────── */
function spawnRipple(x, y) {
  const el = document.createElement('div');
  el.className = 'ripple';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  rippleContainer.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

document.addEventListener('pointerdown', e => spawnRipple(e.clientX, e.clientY));

/* ── Press visual feedback ──────────────────── */
function pressEffect(btn) {
  btn.classList.add('pressed');
  setTimeout(() => btn.classList.remove('pressed'), 200);
}

/* ── Connection status UI ───────────────────── */
function setStatus(state_name, text) {
  statusDot.className = `status-dot-${state_name}`;
  statusText.textContent = text;
}

/* ── Connect to Samsung TV ──────────────────── */
async function connectToTV(ip) {
  ip = ip.trim();
  if (!ip) { setStatus('error', 'Digite o IP da TV'); return; }

  setStatus('connecting', 'Conectando...');
  btnConnect.disabled = true;

  // Inicia o controlador Samsung
  state.remote = new SamsungRemote(ip, 'iPhone Controle');

  state.remote.onStatusChange = (status) => {
    if (status === 'connected') {
      state.connected = true;
      setStatus('connected', `Conectado · ${ip}`);
      deviceName.textContent = `Samsung TV`;

      connectScreen.style.display = 'none';
      remoteWrapper.style.display = 'flex';
      showToast('📺 TV Samsung Conectada!');
      requestWakeLock();
    } else if (status === 'error' || status === 'disconnected') {
      handleDisconnect(status === 'error' ? 'Erro de conexão' : 'TV desconectada');
    }
  };

  try {
    await state.remote.connect();
  } catch (e) {
    handleDisconnect('Não foi possível conectar');
  }
}

function handleDisconnect(msg) {
  state.connected = false;
  connectScreen.style.display = 'flex';
  remoteWrapper.style.display = 'none';
  setStatus('error', msg || 'Desconectado');
  btnConnect.disabled = false;
  showToast('⚠️ ' + (msg || 'Desconectado'));

  // Se estivermos em HTTPS, mostrar dica de SSL
  if (window.location.protocol === 'https:') {
    sslFix.style.display = 'block';
  }
}

/* ── Send command to TV ─────────────────────── */
function sendCmd(action) {
  if (!state.connected || !state.remote) {
    showToast('⚠️ TV não conectada');
    return false;
  }
  state.remote.sendKey(action);
  return true;
}

/* ── Action handlers ────────────────────────── */
const actions = {
  'power': () => { sendCmd('power'); showToast('⏻ Power'); },
  'source': () => { sendCmd('source'); showToast('🔌 Source'); },
  'home': () => { sendCmd('home'); showToast('🏠 Home'); },

  'vol-up': () => { sendCmd('vol-up'); },
  'vol-down': () => { sendCmd('vol-down'); },
  'mute': () => {
    state.muted = !state.muted;
    btnMute.style.color = state.muted ? 'var(--accent-2)' : '';
    sendCmd('mute');
  },

  'up': () => { sendCmd('up'); },
  'down': () => { sendCmd('down'); },
  'left': () => { sendCmd('left'); },
  'right': () => { sendCmd('right'); },
  'ok': () => { sendCmd('ok'); },
  'back': () => { sendCmd('back'); },
  'menu': () => { sendCmd('menu'); },
  'info': () => { sendCmd('info'); },

  'ch-up': () => { sendCmd('ch-up'); },
  'ch-down': () => { sendCmd('ch-down'); },

  'play-pause': () => {
    state.playing = !state.playing;
    iconPlay.style.display = state.playing ? 'none' : 'block';
    iconPause.style.display = state.playing ? 'block' : 'none';
    sendCmd('play-pause');
  },
  'prev': () => { sendCmd('prev'); },
  'next': () => { sendCmd('next'); },
  'rewind': () => { sendCmd('rewind'); },
  'forward': () => { sendCmd('forward'); },

  'red': () => { sendCmd('red'); },
  'green': () => { sendCmd('green'); },
  'yellow': () => { sendCmd('yellow'); },
  'blue': () => { sendCmd('blue'); },

  // Apps (Comandos simplificados)
  'netflix': () => { showToast('Abrindo Netflix...'); sendCmd('home'); /* Futuramente podemos usar LaunchApp */ },
  'youtube': () => { showToast('Abrindo YouTube...'); sendCmd('home'); },
};

// Teclado numérico
for (let i = 0; i <= 9; i++) {
  actions[`num-${i}`] = () => sendCmd(`num-${i}`);
}

/* ── Attach button listeners ────────────────── */
document.querySelectorAll('.btn[data-action]').forEach(btn => {
  const action = btn.dataset.action;

  btn.addEventListener('click', () => {
    pressEffect(btn);
    if (actions[action]) actions[action]();
  });

  // Long press para volume
  if (['vol-up', 'vol-down', 'ch-up', 'ch-down', 'up', 'down', 'left', 'right'].includes(action)) {
    let longInterval = null;
    btn.addEventListener('pointerdown', () => {
      longInterval = setInterval(() => { if (actions[action]) actions[action](); }, 200);
    });
    const stop = () => clearInterval(longInterval);
    btn.addEventListener('pointerup', stop);
    btn.addEventListener('pointerleave', stop);
    btn.addEventListener('pointercancel', stop);
  }
});

/* ── Connect button ─────────────────────────── */
btnConnect.addEventListener('click', () => {
  connectToTV(roomInput.value);
});

roomInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') connectToTV(roomInput.value);
});

/* ── Disconnect button ──────────────────────── */
btnDisconnect.addEventListener('click', () => {
  handleDisconnect('Desconectado');
});

/* ── Wake Lock ──────────────────────────────── */
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) await navigator.wakeLock.request('screen');
  } catch (_) { }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.connected) requestWakeLock();
});

/* ── PWA Service Worker ─────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { });
  });
}

/* ── MODO IPHONE (Data URL Fix) ──────────────── */
window.gerarModoiPhone = function () {
  const ip = roomInput.value.trim() || "192.168.3.8";
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><title>Controle Samsung</title><style>body{background:#121212;color:white;font-family:sans-serif;text-align:center;margin:0;padding:20px} .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;max-width:300px;margin:20px auto} button{background:#333;border:none;color:white;padding:20px;border-radius:15px;font-size:16px;font-weight:bold} button:active{background:#555;transform:scale(.95)} .btn-pwr{background:#e74c3c;grid-column:span 3} .st{color:#2ecc71;margin-bottom:20px;font-size:14px}</style></head><body><div id="st" class="st">🔌 Conectando à TV (${ip})...</div><div class="grid"><button class="btn-pwr" onclick="send('KEY_POWER')">LIGAR / DESLIGAR</button><button onclick="send('KEY_VOLUP')">VOL +</button><button onclick="send('KEY_HOME')">HOME</button><button onclick="send('KEY_CHUP')">CH +</button><button onclick="send('KEY_VOLDOWN')">VOL -</button><button onclick="send('KEY_ENTER')">OK</button><button onclick="send('KEY_CHDOWN')">CH -</button><button onclick="send('KEY_RETURN')" style="grid-column:span 3">VOLTAR</button></div><script>let ws;function cn(){ws=new WebSocket("ws://${ip}:8001/api/v2/channels/samsung.remote.control?name=aVBob25l");ws.onopen=()=>document.getElementById("st").innerText="✅ CONECTADO!";ws.onerror=()=>document.getElementById("st").innerText="❌ ERRO: LIGUE A TV";ws.onclose=()=>setTimeout(cn,3000)}function send(k){if(ws&&ws.readyState===1)ws.send(JSON.stringify({method:"ms.remote.control",params:{Cmd:"Click",DataOfCmd:k,Option:"false",TypeOfRemote:"SendRemoteKey"}}))}cn()<\/script></body></html>`;

  // No iPhone, abrir um Data URL por código as vezes é bloqueado. 
  // O melhor é injetar um link e pedir para o usuário clicar ou tentar o redirect.
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.location.href = url;
};
