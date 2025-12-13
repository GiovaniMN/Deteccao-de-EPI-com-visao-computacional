// loginHandler.js - manipulador de login com colecao senha_login
import { db } from './firebaseConfig.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import AuthGuard from './authGuard.js';

//chave aes - deve ser a mesma do userManagement.js
const AES_KEY = "chaveSuperSecreta123!";

//configuracao de usuarios padrao (fallback)
const DEFAULT_USERS = {
    'adm': {
        usuario: 'adm',
        senha: '123', //senha em texto claro para comparacao
        profile: 'admin'
    }
};

class LoginHandler {
    constructor() {
        this.initializeLoginForm();
        this.showLoginMessage();
        this.loadRememberedUser(); //carrega o nome de usuario se estiver salvo no localstorage
    }

    initializeLoginForm() {
        const loginForm = document.getElementById('loginForm');
        const btnLogin = document.getElementById('btnLogin');

        if (!loginForm) {
            console.error('Formulário de login não encontrado.');
            return;
        }

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            await this.handleLogin(btnLogin);
        });

        //permite submissao com a tecla enter
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !btnLogin.disabled) {
                event.preventDefault();
                loginForm.dispatchEvent(new Event('submit'));
            }
        });
    }

    showLoginMessage() {
        const message = sessionStorage.getItem('loginMessage');
        if (message) {
            this.showFeedback(message, 'warning');
            sessionStorage.removeItem('loginMessage');
        }
    }

    loadRememberedUser() {
        const rememberedUser = localStorage.getItem('rememberedUser');
        if (rememberedUser) {
            document.getElementById('usuario').value = rememberedUser;
            document.getElementById('lembrarMe').checked = true;
        }
    }

    //funcao para descriptografar senha aes
    descriptografarSenhaAES(senhaCriptografada) {
        try {
            const bytes = CryptoJS.AES.decrypt(senhaCriptografada, AES_KEY);
            return bytes.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error('Erro ao descriptografar senha AES:', error);
            return null;
        }
    }

    //funcao para verificar se e uma senha criptografada com aes
    isAESEncrypted(senha) {
        //senhas aes geralmente sao mais longas e contem caracteres especificos
        return senha && senha.length > 20 && (senha.includes('/') || senha.includes('+') || senha.includes('='));
    }

    //funcao para verificar se e uma senha sha256 (nao usada, mas mantida para referencia)
    isSHA256Hash(senha) {
        //sha256 sempre tem 64 caracteres hexadecimais
        return senha && senha.length === 64 && /^[a-f0-9]+$/i.test(senha);
    }

    async handleLogin(btnLogin) {
        const usuario = document.getElementById('usuario').value.trim();
        const senha = document.getElementById('senha').value;
        const lembrarMe = document.getElementById('lembrarMe').checked;

        //validacoes basicas
        if (!usuario || !senha) {
            this.showFeedback('Por favor, preencha todos os campos.', 'error');
            return;
        }

        this.setLoginLoading(btnLogin, true);
        this.hideFeedback();

        try {
            //salva ou remove o usuario no "lembrar-me"
            if (lembrarMe) {
                localStorage.setItem('rememberedUser', usuario);
            } else {
                localStorage.removeItem('rememberedUser');
            }

            //verifica primeiro usuarios padrao (fallback)
            if (await this.checkDefaultUser(usuario, senha)) {
                return;
            }

            //verifica usuarios na colecao senha_login do firebase
            await this.checkFirebaseUser(usuario, senha);

        } catch (error) {
            console.error('Erro durante o processo de login:', error);
            this.showFeedback('Erro interno. Tente novamente.', 'error');
        } finally {
            this.setLoginLoading(btnLogin, false);
        }
    }

    async checkDefaultUser(usuario, senha) {
        const defaultUser = DEFAULT_USERS[usuario];

        if (defaultUser && defaultUser.senha === senha) {
            this.loginSuccess({
                usuario: defaultUser.usuario,
                profile: defaultUser.profile
            });
            return true;
        }
        return false;
    }

    async checkFirebaseUser(usuario, senha) {
        try {
            const usersRef = collection(db, 'senha_login');
            const q = query(usersRef, where('user', '==', usuario)); //campo 'user' da colecao senha_login

            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                this.showFeedback('Usuário ou senha incorretos.', 'error');
                return false;
            }

            let userFound = false;
            querySnapshot.forEach((doc) => {
                const userData = doc.data();
                
                //verifica se a senha esta criptografada com aes
                if (this.isAESEncrypted(userData.pass)) {
                    const senhaDescriptografada = this.descriptografarSenhaAES(userData.pass);
                    
                    if (senhaDescriptografada === senha) {
                        this.loginSuccess({
                            usuario: userData.user,
                            profile: userData.profile || 'user'
                        });
                        userFound = true;
                    }
                } else {
                    //se nao estiver criptografada com aes, compara diretamente
                    if (userData.pass === senha) {
                        this.loginSuccess({
                            usuario: userData.user,
                            profile: userData.profile || 'user'
                        });
                        userFound = true;
                    }
                }
            });

            if (!userFound) {
                this.showFeedback('Usuário ou senha incorretos.', 'error');
            }

            return userFound;

        } catch (error) {
            console.error('Erro ao verificar usuário no Firebase:', error);
            this.showFeedback('Erro interno. Tente novamente.', 'error');
            return false;
        }
    }

    loginSuccess(userData) {
        //salva sessao usando authguard
        AuthGuard.setUserSession(userData);
        
        //feedback de sucesso
        this.showFeedback('Login realizado com sucesso! Redirecionando...', 'success');
        
        //redireciona apos um pequeno atraso
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

        //oculta a mensagem automaticamente apos 5 segundos para tipos nao criticos
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

//inicializa o loginhandler quando o dom estiver carregado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new LoginHandler();
    });
} else {
    new LoginHandler();
}
