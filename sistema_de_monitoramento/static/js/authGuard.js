// authGuard.js - Sistema de Autenticação com Controle de Perfis

// Configuração de páginas e permissões
const PROTECTED_PAGES = ['dashboard.html', 'historico.html', 'usuarios.html', 'configuracao.html'];
const ADMIN_ONLY_PAGES = ['usuarios.html', 'configuracao.html'];
const PUBLIC_PAGES = ['index.html', 'login.html'];

class AuthGuard {
    constructor() {
        this.currentPage = this.getCurrentPageName();
        this.init();
    }

    getCurrentPageName() {
        const path = window.location.pathname;
        return path.split('/').pop() || 'index.html';
    }

    init() {
        if (this.currentPage === 'login.html') {
            this.handleLoginPage();
            return;
        }

        if (PUBLIC_PAGES.includes(this.currentPage)) {
            return;
        }

        this.checkAuthentication();
    }

    handleLoginPage() {
        const currentUser = this.getCurrentUser();
        if (currentUser && this.isValidSession()) {
            window.location.replace('dashboard.html');
            return;
        }
        this.clearInvalidSessions();
    }

    checkAuthentication() {
        const currentUser = this.getCurrentUser();
        
        if (!currentUser || !this.isValidSession()) {
            this.redirectToLogin('Você precisa estar logado para acessar esta página.');
            return;
        }

        if (ADMIN_ONLY_PAGES.includes(this.currentPage)) {
            if (currentUser.profile !== 'admin') {
                this.showAccessDeniedAndRedirect();
                return;
            }
        }
        this.updateLastActivity();
    }

    getCurrentUser() {
        try {
            const userData = localStorage.getItem('currentUser');
            if (!userData) return null;

            const user = JSON.parse(userData);
            
            // Verifica a integridade mínima dos dados do usuário na sessão
            if (!user.usuario || !user.profile || !user.loginTime) {
                console.warn('Dados de usuário incompletos ou corrompidos, limpando sessão.');
                this.clearSession();
                return null;
            }

            return user;
        } catch (error) {
            console.error('Erro ao recuperar dados do usuário do localStorage:', error);
            this.clearSession();
            return null;
        }
    }

    isValidSession() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;

        try {
            // A sessão expira após 24 horas
            const loginTime = new Date(currentUser.loginTime);
            const now = new Date();
            const sessionDurationHours = (now - loginTime) / (1000 * 60 * 60);

            if (sessionDurationHours > 24) {
                this.clearSession();
                return false;
            }

            return true;
        } catch (error) {
            console.error('Erro ao validar a sessão do usuário:', error);
            this.clearSession();
            return false;
        }
    }

    updateLastActivity() {
        const currentUser = this.getCurrentUser();
        if (currentUser) {
            currentUser.lastActivity = new Date().toISOString();
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
    }

    clearSession() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        sessionStorage.clear();
    }

    clearInvalidSessions() {
        const currentUser = this.getCurrentUser();
        if (currentUser && !this.isValidSession()) {
            this.clearSession();
        }
    }

    redirectToLogin(message = '') {
        this.clearSession();
        
        if (message) {
            sessionStorage.setItem('loginMessage', message);
        }
        
        window.location.replace('login.html');
    }

    showAccessDeniedAndRedirect() {
        this.showAccessDeniedModal();
    }

    showAccessDeniedModal() {
        const existingModal = document.getElementById('accessDeniedModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'accessDeniedModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-gray-800 rounded-2xl p-8 shadow-2xl max-w-md w-full border border-red-500/30">
                <div class="text-center">
                    <div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                    </div>
                    <h3 class="text-xl font-semibold text-white mb-2">Acesso Negado</h3>
                    <p class="text-gray-300 mb-6">Você não tem permissão para acessar esta página. Apenas administradores podem visualizar este conteúdo.</p>
                    <div class="space-y-3">
                        <button id="goToDashboard" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all">
                            Ir para Dashboard
                        </button>
                        <button id="logout" class="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-xl transition-all">
                            Fazer Logout
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById('goToDashboard').addEventListener('click', () => {
            window.location.replace('dashboard.html');
        });

        document.getElementById('logout').addEventListener('click', () => {
            this.redirectToLogin('Sessão encerrada.');
        });

        // Redirecionamento automático para segurança
        setTimeout(() => {
            if (document.getElementById('accessDeniedModal')) {
                window.location.replace('dashboard.html');
            }
        }, 10000);
    }

    static setUserSession(userData) {
        const sessionData = {
            usuario: userData.usuario,
            profile: userData.profile || 'user',
            loginTime: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };

        localStorage.setItem('currentUser', JSON.stringify(sessionData));
    }

    static logout() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        sessionStorage.clear();
        window.location.replace('login.html');
    }

    static isAdmin() {
        try {
            const userData = localStorage.getItem('currentUser');
            if (!userData) return false;
            
            const user = JSON.parse(userData);
            return user.profile === 'admin';
        } catch (error) {
            console.error('Erro ao verificar perfil de administrador:', error);
            return false;
        }
    }

    static getCurrentUser() {
        try {
            const userData = localStorage.getItem('currentUser');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Erro ao obter usuário atual:', error);
            return null;
        }
    }
}

// Inicializa o AuthGuard
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new AuthGuard());
} else {
    new AuthGuard();
}

window.AuthGuard = AuthGuard;

// Sincroniza o logout entre abas
window.addEventListener('storage', (event) => {
    if (event.key === 'currentUser' && event.newValue === null) {
        window.location.reload();
    }
});

export default AuthGuard;
