// authGuard.js - Sistema de Autenticação com Controle de Perfis
console.log('🔐 AuthGuard carregado');

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
        const pageName = path.split('/').pop() || 'index.html';
        console.log(`📄 Página atual: ${pageName}`);
        return pageName;
    }

    init() {
        console.log('🚀 Iniciando verificação de autenticação...');
        
        // Se estiver na página de login, trata de forma especial
        if (this.currentPage === 'login.html') {
            this.handleLoginPage();
            return;
        }

        // Para páginas públicas, permite acesso livre
        if (PUBLIC_PAGES.includes(this.currentPage)) {
            console.log('✅ Página pública, acesso liberado');
            return;
        }

        // Para páginas protegidas, verifica autenticação
        this.checkAuthentication();
    }

    handleLoginPage() {
        console.log('📝 Processando página de login');
        
        // Verifica se já está logado
        const currentUser = this.getCurrentUser();
        if (currentUser && this.isValidSession()) {
            console.log('👤 Usuário já está logado, redirecionando para dashboard...');
            window.location.replace('dashboard.html');
            return;
        }

        // Limpa sessões antigas inválidas
        this.clearInvalidSessions();
    }

    checkAuthentication() {
        console.log('🔍 Verificando autenticação para página protegida...');
        
        const currentUser = this.getCurrentUser();
        
        // Verifica se está logado
        if (!currentUser || !this.isValidSession()) {
            console.log('❌ Usuário não autenticado, redirecionando para login...');
            this.redirectToLogin('Você precisa estar logado para acessar esta página.');
            return;
        }

        // Verifica se tem permissão para páginas administrativas
        if (ADMIN_ONLY_PAGES.includes(this.currentPage)) {
            if (currentUser.profile !== 'admin') {
                console.log(`❌ Acesso negado - ${currentUser.usuario} não é administrador`);
                this.showAccessDeniedAndRedirect();
                return;
            }
        }

        console.log(`✅ Acesso autorizado para ${currentUser.usuario} (perfil: ${currentUser.profile})`);
        this.updateLastActivity();
    }

    getCurrentUser() {
        try {
            const userData = localStorage.getItem('currentUser');
            if (!userData) return null;

            const user = JSON.parse(userData);
            
            // Verifica estrutura mínima necessária
            if (!user.usuario || !user.profile || !user.loginTime) {
                console.log('⚠️ Dados de usuário incompletos, limpando sessão');
                this.clearSession();
                return null;
            }

            return user;
        } catch (error) {
            console.error('❌ Erro ao recuperar dados do usuário:', error);
            this.clearSession();
            return null;
        }
    }

    isValidSession() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;

        try {
            // Verifica se a sessão não expirou (24 horas)
            const loginTime = new Date(currentUser.loginTime);
            const now = new Date();
            const sessionDuration = (now - loginTime) / (1000 * 60 * 60); // em horas

            if (sessionDuration > 24) {
                console.log('⏰ Sessão expirada (mais de 24 horas)');
                this.clearSession();
                return false;
            }

            return true;
        } catch (error) {
            console.error('❌ Erro ao validar sessão:', error);
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
        console.log('🧹 Limpando sessão do usuário');
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
        console.log('🔄 Redirecionando para página de login...');
        this.clearSession();
        
        if (message) {
            sessionStorage.setItem('loginMessage', message);
        }
        
        // Usa replace para evitar volta no histórico
        window.location.replace('login.html');
    }

    showAccessDeniedAndRedirect() {
        console.log('🚫 Mostrando mensagem de acesso negado...');
        
        // Cria modal de acesso negado
        this.showAccessDeniedModal();
    }

    showAccessDeniedModal() {
        // Remove modal existente se houver
        const existingModal = document.getElementById('accessDeniedModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Cria modal de acesso negado
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

        // Event listeners para os botões
        document.getElementById('goToDashboard').addEventListener('click', () => {
            window.location.replace('dashboard.html');
        });

        document.getElementById('logout').addEventListener('click', () => {
            this.redirectToLogin('Sessão encerrada.');
        });

        // Auto redirect após 10 segundos
        setTimeout(() => {
            if (document.getElementById('accessDeniedModal')) {
                window.location.replace('dashboard.html');
            }
        }, 10000);
    }

    // Método estático para login (usado pelo loginHandler.js)
    static setUserSession(userData) {
        console.log('💾 Salvando sessão do usuário:', userData.usuario);
        
        const sessionData = {
            usuario: userData.usuario,
            profile: userData.profile || 'user',
            loginTime: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };

        localStorage.setItem('currentUser', JSON.stringify(sessionData));
        console.log('✅ Sessão salva com sucesso');
    }

    // Método estático para logout
    static logout() {
        console.log('🚪 Executando logout...');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        sessionStorage.clear();
        window.location.replace('login.html');
    }

    // Método estático para verificar se é admin
    static isAdmin() {
        try {
            const userData = localStorage.getItem('currentUser');
            if (!userData) return false;
            
            const user = JSON.parse(userData);
            return user.profile === 'admin';
        } catch (error) {
            console.error('❌ Erro ao verificar perfil admin:', error);
            return false;
        }
    }

    // Método estático para obter usuário atual
    static getCurrentUser() {
        try {
            const userData = localStorage.getItem('currentUser');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('❌ Erro ao obter usuário atual:', error);
            return null;
        }
    }
}

// Inicializa o AuthGuard quando o DOM estiver carregado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new AuthGuard();
    });
} else {
    new AuthGuard();
}

// Torna AuthGuard disponível globalmente
window.AuthGuard = AuthGuard;

// Adiciona listener para storage changes (logout em outras abas)
window.addEventListener('storage', (event) => {
    if (event.key === 'currentUser' && event.newValue === null) {
        console.log('🔄 Logout detectado em outra aba');
        window.location.reload();
    }
});

console.log('✅ AuthGuard inicializado com sucesso!');
export default AuthGuard;
