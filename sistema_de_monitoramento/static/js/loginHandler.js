// loginHandler.js - Manipulador de Login com coleção senha_login
import { db } from './firebaseConfig.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import AuthGuard from './authGuard.js';

console.log('🔑 LoginHandler carregado');

// Chave AES - deve ser a mesma do userManagement.js
const AES_KEY = "chaveSuperSecreta123!";

// Configuração de usuários padrão (fallback)
const DEFAULT_USERS = {
    'adm': {
        usuario: 'adm',
        senha: '123', // Senha em texto claro para comparação
        profile: 'admin'
    }
};

class LoginHandler {
    constructor() {
        this.initializeLoginForm();
        this.showLoginMessage();
    }

    initializeLoginForm() {
        const loginForm = document.getElementById('loginForm');
        const btnLogin = document.getElementById('btnLogin');
        const saida = document.getElementById('saida');

        if (!loginForm) {
            console.error('❌ Formulário de login não encontrado');
            return;
        }

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            await this.handleLogin(btnLogin, saida);
        });

        // Enter key para submissão
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !btnLogin.disabled) {
                event.preventDefault();
                loginForm.dispatchEvent(new Event('submit'));
            }
        });

        console.log('✅ Formulário de login inicializado');
    }

    showLoginMessage() {
        const message = sessionStorage.getItem('loginMessage');
        if (message) {
            this.showFeedback(message, 'warning');
            sessionStorage.removeItem('loginMessage');
        }
    }

    // Função para descriptografar senha AES
    descriptografarSenhaAES(senhaCriptografada) {
        try {
            const bytes = CryptoJS.AES.decrypt(senhaCriptografada, AES_KEY);
            return bytes.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error('Erro ao descriptografar senha AES:', error);
            return null;
        }
    }

    // Função para verificar se é uma senha criptografada com AES
    isAESEncrypted(senha) {
        // Senhas AES geralmente são mais longas e contêm caracteres específicos
        return senha && senha.length > 20 && (senha.includes('/') || senha.includes('+') || senha.includes('='));
    }

    // Função para verificar se é uma senha SHA256
    isSHA256Hash(senha) {
        // SHA256 sempre tem 64 caracteres hexadecimais
        return senha && senha.length === 64 && /^[a-f0-9]+$/i.test(senha);
    }

    async handleLogin(btnLogin, saida) {
        const usuario = document.getElementById('usuario').value.trim();
        const senha = document.getElementById('senha').value;

        // Validações básicas
        if (!usuario || !senha) {
            this.showFeedback('Por favor, preencha todos os campos.', 'error');
            return;
        }

        // UI feedback
        this.setLoginLoading(btnLogin, true);
        this.hideFeedback();

        try {
            console.log(`🔍 Tentativa de login para: ${usuario}`);

            // Verifica primeiro usuários padrão (fallback)
            if (await this.checkDefaultUser(usuario, senha)) {
                return;
            }

            // Verifica usuários na coleção senha_login
            await this.checkFirebaseUser(usuario, senha);

        } catch (error) {
            console.error('❌ Erro durante login:', error);
            this.showFeedback('Erro interno. Tente novamente.', 'error');
        } finally {
            this.setLoginLoading(btnLogin, false);
        }
    }

    async checkDefaultUser(usuario, senha) {
        const defaultUser = DEFAULT_USERS[usuario];

        if (defaultUser && defaultUser.senha === senha) {
            console.log('✅ Login com usuário padrão bem-sucedido');
            
            this.loginSuccess({
                usuario: defaultUser.usuario,
                profile: defaultUser.profile
            });
            return true;
        }
        return false;
    }

    async checkFirebaseUser(usuario, senha) {
        console.log('🔍 Verificando usuário no Firebase (coleção senha_login)...');

        try {
            const usersRef = collection(db, 'senha_login');
            const q = query(usersRef, where('user', '==', usuario)); // Campo 'user' da coleção senha_login

            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                console.log('❌ Usuário não encontrado na coleção senha_login');
                this.showFeedback('Usuário ou senha incorretos.', 'error');
                return false;
            }

            let userFound = false;
            querySnapshot.forEach((doc) => {
                const userData = doc.data();
                
                // Verifica se a senha está criptografada com AES
                if (this.isAESEncrypted(userData.pass)) {
                    const senhaDescriptografada = this.descriptografarSenhaAES(userData.pass);
                    
                    if (senhaDescriptografada === senha) {
                        console.log('✅ Login com senha AES bem-sucedido');
                        
                        this.loginSuccess({
                            usuario: userData.user,
                            profile: userData.profile || 'user'
                        });
                        userFound = true;
                    }
                } else {
                    // Se não estiver criptografada com AES, compara diretamente
                    if (userData.pass === senha) {
                        console.log('✅ Login com senha em texto claro bem-sucedido');
                        
                        this.loginSuccess({
                            usuario: userData.user,
                            profile: userData.profile || 'user'
                        });
                        userFound = true;
                    }
                }
            });

            if (!userFound) {
                console.log('❌ Senha incorreta');
                this.showFeedback('Usuário ou senha incorretos.', 'error');
            }

            return userFound;

        } catch (error) {
            console.error('Erro ao verificar usuário:', error);
            this.showFeedback('Erro interno. Tente novamente.', 'error');
            return false;
        }
    }

    loginSuccess(userData) {
        console.log(`🎉 Login bem-sucedido para: ${userData.usuario} (${userData.profile})`);
        
        // Salva sessão usando AuthGuard
        AuthGuard.setUserSession(userData);
        
        // Feedback de sucesso
        this.showFeedback('Login realizado com sucesso! Redirecionando...', 'success');
        
        // Redirect após pequeno delay
        setTimeout(() => {
            window.location.replace('dashboard.html');
        }, 1500);
    }

    setLoginLoading(btnLogin, isLoading) {
        if (!btnLogin) return;

        if (isLoading) {
            btnLogin.disabled = true;
            btnLogin.innerHTML = `
                <span class="flex items-center justify-center">
                    <svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verificando...
                </span>
            `;
        } else {
            btnLogin.disabled = false;
            btnLogin.innerHTML = `
                <span class="flex items-center justify-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                    </svg>
                    Entrar no Sistema
                </span>
            `;
        }
    }

    showFeedback(message, type) {
        const saida = document.getElementById('saida');
        if (!saida) return;

        const colors = {
            success: 'text-green-400',
            error: 'text-red-400',
            warning: 'text-yellow-400',
            info: 'text-blue-400'
        };

        saida.textContent = message;
        saida.className = `text-sm text-center ${colors[type] || colors.error}`;
        saida.classList.remove('hidden');

        // Auto hide após 5 segundos para mensagens não críticas
        if (type === 'success' || type === 'info') {
            setTimeout(() => this.hideFeedback(), 5000);
        }
    }

    hideFeedback() {
        const saida = document.getElementById('saida');
        if (saida) {
            saida.classList.add('hidden');
        }
    }
}

// Inicializa quando DOM estiver carregado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new LoginHandler();
    });
} else {
    new LoginHandler();
}

console.log('✅ LoginHandler inicializado com sucesso!');