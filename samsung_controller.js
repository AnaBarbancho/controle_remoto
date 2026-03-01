/**
 * samsung_controller.js
 * 
 * Lógica de comunicação centralizada para TVs Samsung (Tizen) 
 * via WebSockets na porta 8001/8002.
 */

class SamsungRemote {
    constructor(tvIp, appName = 'Controle Remoto') {
        this.tvIp = tvIp;
        this.appName = appName;
        this.ws = null;
        this.token = localStorage.getItem('samsung_tv_token') || '';
        this.isConnected = false;
        this.onStatusChange = null; // Callback para o UI

        // Mapeamento de comandos do Remote para a Samsung
        this.keyMap = {
            'power': 'KEY_POWER',
            'source': 'KEY_SOURCE',
            'home': 'KEY_HOME',
            'vol-up': 'KEY_VOLUP',
            'vol-down': 'KEY_VOLDOWN',
            'mute': 'KEY_MUTE',
            'up': 'KEY_UP',
            'down': 'KEY_DOWN',
            'left': 'KEY_LEFT',
            'right': 'KEY_RIGHT',
            'ok': 'KEY_ENTER',
            'back': 'KEY_RETURN',
            'menu': 'KEY_MENU',
            'info': 'KEY_INFO',
            'ch-up': 'KEY_CHUP',
            'ch-down': 'KEY_CHDOWN',
            'play-pause': 'KEY_PLAY_PAUSE',
            'prev': 'KEY_PREVIOUS',
            'next': 'KEY_NEXT',
            'rewind': 'KEY_REWIND',
            'forward': 'KEY_FF',
            'red': 'KEY_RED',
            'green': 'KEY_GREEN',
            'yellow': 'KEY_YELLOW',
            'blue': 'KEY_BLUE',
            // Canais numéricos
            'num-0': 'KEY_0', 'num-1': 'KEY_1', 'num-2': 'KEY_2', 'num-3': 'KEY_3',
            'num-4': 'KEY_4', 'num-5': 'KEY_5', 'num-6': 'KEY_6', 'num-7': 'KEY_7',
            'num-8': 'KEY_8', 'num-9': 'KEY_9',
        };
    }

    // Gera a URL de conexão com a TV
    getWsUrl() {
        const base64Name = btoa(this.appName);
        let url = `ws://${this.tvIp}:8001/api/v2/channels/samsung.remote.control?name=${base64Name}`;
        if (this.token) {
            url += `&token=${this.token}`;
        }
        return url;
    }

    connect() {
        return new Promise((resolve, reject) => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                resolve();
                return;
            }

            console.log('🔄 Conectando à TV Samsung em', this.tvIp);
            this.ws = new WebSocket(this.getWsUrl());

            this.ws.onopen = () => {
                console.log('✅ Canal WebSocket aberto');
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('📩 Mensagem da TV:', data);

                if (data.event === 'ms.channel.connect') {
                    this.isConnected = true;
                    if (data.data && data.data.token) {
                        this.token = data.data.token;
                        localStorage.setItem('samsung_tv_token', this.token);
                    }
                    if (this.onStatusChange) this.onStatusChange('connected');
                    resolve();
                }
            };

            this.ws.onerror = (err) => {
                console.error('❌ Erro no WebSocket:', err);
                this.isConnected = false;
                if (this.onStatusChange) this.onStatusChange('error');
                reject(err);
            };

            this.ws.onclose = () => {
                console.log('🔌 Conexão fechada com a TV');
                this.isConnected = false;
                if (this.onStatusChange) this.onStatusChange('disconnected');
            };
        });
    }

    sendKey(action) {
        const key = this.keyMap[action];
        if (!key) {
            console.warn('⚠️ Comando não mapeado:', action);
            return;
        }

        if (!this.isConnected) {
            this.connect().then(() => this._sendRawKey(key));
        } else {
            this._sendRawKey(key);
        }
    }

    _sendRawKey(key) {
        const payload = {
            method: 'ms.remote.control',
            params: {
                Cmd: 'Click',
                DataOfCmd: key,
                Option: 'false',
                TypeOfRemote: 'SendRemoteKey'
            }
        };
        this.ws.send(JSON.stringify(payload));
    }
}

window.SamsungRemote = SamsungRemote;
