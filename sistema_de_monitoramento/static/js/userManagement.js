import { db } from './firebaseConfig.js';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

//chave aes para criptografia simetrica. atencao: em producao, considere gerenciar esta chave de forma mais segura.
const AES_KEY = "chaveSuperSecreta123!";

document.addEventListener('DOMContentLoaded', async () => {
    const addUserForm = document.getElementById('addUserForm');
    const newUsernameInput = document.getElementById('newUsername');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const userListUL = document.getElementById('userList');
    const feedbackP = document.getElementById('userManagementFeedback');

    const DEFAULT_ADMIN_USER = 'adm';

    //criptografa a senha usando aes.
    function criptografarSenhaAES(senha) {
        return CryptoJS.AES.encrypt(senha, AES_KEY).toString();
    }

    //funcao para buscar usuarios uma unica vez (para validacao)
    async function getUsersOnce() {
        const usersCollection = collection(db, 'senha_login');
        const querySnapshot = await getDocs(usersCollection);
        const users = [];
        querySnapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() });
        });
        return users;
    }

    function renderUserList(users) {
        if (!userListUL) return;

        userListUL.innerHTML = ''; //limpa a lista antes de renderizar

        if (users.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Nenhum usuário cadastrado.';
            li.className = 'text-gray-400 text-center';
            userListUL.appendChild(li);
            return;
        }

        users.forEach(user => {
            const li = document.createElement('li');
            li.className = 'flex items-center justify-between bg-gray-100 dark:bg-gray-700/50 p-3 rounded-xl shadow-sm dark:shadow';

            const usernameSpan = document.createElement('span');
            usernameSpan.className = 'text-gray-700 dark:text-gray-200 font-medium';
            usernameSpan.textContent = user.user;
            li.appendChild(usernameSpan);

            if (user.user.toLowerCase() !== DEFAULT_ADMIN_USER) {
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Excluir';
                deleteButton.dataset.userId = user.id;
                deleteButton.dataset.userName = user.user; 
                deleteButton.className = 'deleteUserButton text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium px-3 py-1 rounded-lg border border-red-200 dark:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors';
                li.appendChild(deleteButton);
            } else {
                const adminLabel = document.createElement('span');
                adminLabel.textContent = 'Admin';
                adminLabel.className = 'text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/10 px-2 py-1 rounded-full';
                li.appendChild(adminLabel);
            }

            userListUL.appendChild(li);
        });
    }

    //listener em tempo real para a lista de usuarios
    function listenForUserChanges() {
        const usersCollection = collection(db, 'senha_login');
        onSnapshot(query(usersCollection), (snapshot) => {
            const users = [];
            snapshot.forEach((doc) => {
                users.push({ id: doc.id, ...doc.data() });
            });
            renderUserList(users);
        }, (error) => {
            console.error("Erro ao escutar por usuários: ", error);
            displayFeedback("Erro ao carregar a lista de usuários.", true);
        });
    }

    async function handleAddUserFormSubmit(event) {
        event.preventDefault();

        const username = newUsernameInput?.value.trim();
        const password = newPasswordInput?.value;
        const confirmPassword = confirmPasswordInput?.value;

        //expressao regular para validar e-mail com tlds comuns
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        if (!username || !password) {
            return displayFeedback("E-mail e senha são obrigatórios.", true);
        }
        if (!emailRegex.test(username)) {
            return displayFeedback("Por favor, insira um endereço de e-mail válido (ex: nome@dominio.com).", true);
        }
        if (password.length < 8) {
            return displayFeedback("A senha deve ter no mínimo 8 caracteres.", true);
        }
        if (password !== confirmPassword) {
            return displayFeedback("As senhas não coincidem.", true);
        }

        //valida se o usuario ja existe antes de adicionar
        const existingUsers = await getUsersOnce();
        if (existingUsers.find(u => u.user.toLowerCase() === username.toLowerCase())) {
            return displayFeedback("Este endereço de e-mail já está em uso.", true);
        }

        const senhaCriptografada = criptografarSenhaAES(password);
        try {
            await addDoc(collection(db, 'senha_login'), { user: username, pass: senhaCriptografada });
            displayFeedback("Usuário adicionado com sucesso!");
            addUserForm?.reset();
        } catch (error) {
            console.error("Erro ao salvar usuário:", error);
            displayFeedback("Erro ao adicionar usuário.", true);
        }
    }

    async function handleDeleteUserClick(event) {
        if (event.target.classList.contains('deleteUserButton')) {
            const userId = event.target.dataset.userId;
            const userName = event.target.dataset.userName;

            if (!userId || !userName) return;
            if (userName.toLowerCase() === DEFAULT_ADMIN_USER) {
                return displayFeedback("O usuário administrador padrão não pode ser excluído.", true);
            }
            if (!confirm(`Deseja excluir o usuário "${userName}"?`)) return;

            try {
                await deleteDoc(doc(db, 'senha_login', userId));
                displayFeedback(`Usuário "${userName}" excluído com sucesso.`);
            } catch (error) {
                console.error("Erro ao excluir usuário:", error);
                displayFeedback("Erro ao excluir usuário.", true);
            }
        }
    }

    function displayFeedback(message, isError = false) {
        if (!feedbackP) return;
        feedbackP.textContent = message;
        feedbackP.className = `mt-4 text-center text-sm ${isError ? 'text-red-400' : 'text-green-400'}`;
        setTimeout(() => { feedbackP.textContent = ''; }, 4000);
    }

    // --- setup inicial ---
    if (addUserForm) {
        addUserForm.addEventListener('submit', handleAddUserFormSubmit);
    }
    if (userListUL) {
        userListUL.addEventListener('click', handleDeleteUserClick);
    }

    listenForUserChanges(); //inicia o listener em tempo real
});