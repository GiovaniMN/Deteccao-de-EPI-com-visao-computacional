// script de logout para paginas protegidas.
document.addEventListener('DOMContentLoaded', function() {
    //encontra todos os links de logout
    const logoutLinks = document.querySelectorAll('a[href="login.html"]');
    
    logoutLinks.forEach(link => {
        //verifica se e realmente um link de logout (contem texto "sair")
        if (link.textContent.includes('Sair')) {
            link.addEventListener('click', function(event) {
                event.preventDefault();
                
                //limpa a sessao
                localStorage.removeItem('currentUser');
                localStorage.removeItem('authToken');
                sessionStorage.clear();
                
                //mostra mensagem de logout
                sessionStorage.setItem('loginMessage', 'Logout realizado com sucesso.');
                
                //redireciona para login
                window.location.replace('login.html');
            });
        }
    });
});
