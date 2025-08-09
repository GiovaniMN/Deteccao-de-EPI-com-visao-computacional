// Script de Logout - Para ser adicionado em todas as páginas protegidas
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚪 Configurando sistema de logout...');
    
    // Encontra todos os links de logout
    const logoutLinks = document.querySelectorAll('a[href="login.html"]');
    
    logoutLinks.forEach(link => {
        // Verifica se é realmente um link de logout (contém texto "Sair")
        if (link.textContent.includes('Sair')) {
            link.addEventListener('click', function(event) {
                event.preventDefault();
                
                console.log('🔄 Executando logout...');
                
                // Limpa a sessão
                localStorage.removeItem('currentUser');
                localStorage.removeItem('authToken');
                sessionStorage.clear();
                
                // Mostra mensagem de logout
                sessionStorage.setItem('loginMessage', 'Logout realizado com sucesso.');
                
                // Redireciona para login
                window.location.replace('login.html');
            });
        }
    });
    
    console.log(`✅ ${logoutLinks.length} links de logout configurados`);
});