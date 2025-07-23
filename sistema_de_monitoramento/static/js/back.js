document.addEventListener('DOMContentLoaded', function() {
    const btnLogin = document.getElementById('btnLogin');
    const usuarioInput = document.getElementById('usuario');
    const senhaInput = document.getElementById('senha');
    const saidaElement = document.getElementById('saida');

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const usuario = document.getElementById('usuario').value;
        const senha = document.getElementById('senha').value;
        const saida = document.getElementById('saida');
        
        console.log('Login attempt:', { usuario, senha });

        try {
            const userQuery = await window.db.collection('usuarios')
                .where('usuario', '==', usuario)
                .where('senha', '==', senha)
                .get();

            if (!userQuery.empty) {
                // Login successful
                localStorage.setItem('userLoggedIn', 'true');
                window.location.href = 'dashboard.html';
            } else {
                // Login failed
                saida.textContent = 'Usuário ou senha inválidos';
                saida.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Error during login:', error);
            saida.textContent = 'Erro ao tentar fazer login';
            saida.classList.remove('hidden');
        }
    });
});
