import { db } from './firebaseConfig.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function () {
    const btnLogin = document.getElementById('btnLogin');
    const usuarioInput = document.getElementById('usuario');
    const senhaInput = document.getElementById('senha');
    const saidaElement = document.getElementById('saida');

    btnLogin.addEventListener('click', async function (e) {
        e.preventDefault();

        const usuario = usuarioInput.value.trim();
        const senha = senhaInput.value.trim();

        if (!usuario || !senha) {
            mostrarMensagem('Por favor, preencha todos os campos.', true);
            return;
        }

        try {
            const usersCollection = collection(db, 'senha_login');
            const q = query(usersCollection, where('user', '==', usuario));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                mostrarMensagem(`O usuário "${usuario}" não existe.`, true);
                return;
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            if (userData.pass !== senha) {
                mostrarMensagem("Senha incorreta.", true);
                return;
            }

            // Login correto
            sessionStorage.setItem('currentUser', JSON.stringify({
                id: userDoc.id,
                username: userData.user
            }));

            mostrarMensagem("Login realizado com sucesso!", false);

            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);

        } catch (error) {
            console.error("Erro durante login:", error);
            mostrarMensagem("Erro ao realizar login. Tente novamente.", true);
        }
    });

    function mostrarMensagem(texto, isErro = true) {
        if (saidaElement) {
            saidaElement.textContent = texto;
            saidaElement.classList.remove('hidden');
            saidaElement.style.color = isErro ? 'red' : 'green';
        }
    }
});
