import { auth } from '../../config/firebaseConfig.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const saida = document.getElementById('saida');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('usuario').value;
            const senha = document.getElementById('senha').value;
            
            console.log('Tentativa de login com email:', { email });

            try {
                await signInWithEmailAndPassword(auth, email, senha);
                console.log('Login bem-sucedido');
                // Exibe mensagem de sucesso e redireciona
                saida.textContent = 'Login bem-sucedido! Redirecionando...';
                saida.className = 'text-green-400 text-sm text-center';
                saida.classList.remove('hidden');
                setTimeout(() => {
                    window.location.href = './dashboard.html';
                }, 1000);

            } catch (error) {
                console.error('Erro no login:', error.code, error.message);
                let mensagemErro = 'Ocorreu um erro ao tentar fazer login.';
                
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                    mensagemErro = 'Email ou senha inválidos.';
                } else if (error.code === 'auth/invalid-email') {
                    mensagemErro = 'O formato do email é inválido.';
                }
                
                // Exibe a mensagem de erro no elemento 'saida'
                saida.textContent = mensagemErro;
                saida.className = 'text-red-400 text-sm text-center';
                saida.classList.remove('hidden');
            }
        });
    }
});
