import { db, auth } from '../config/firebaseConfig.js';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const usuario = document.getElementById('usuario').value;
            const senha = document.getElementById('senha').value;
            
            console.log('Tentativa de login:', { usuario });
            
            try {
                const userRef = db.collection('usuarios');
                const query = await userRef
                    .where('usuario', '==', usuario)
                    .where('senha', '==', senha)
                    .get();
                
                if (!query.empty) {
                    console.log('Login bem-sucedido');
                    window.location.href = './dashboard.html';
                } else {
                    console.log('Usuário ou senha inválidos');
                    alert('Usuário ou senha inválidos');
                }
            } catch (error) {
                console.error('Erro no login:', error);
                alert('Erro ao fazer login');
            }
        });
    }
});
