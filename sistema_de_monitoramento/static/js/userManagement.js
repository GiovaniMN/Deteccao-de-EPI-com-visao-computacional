import { db } from './firebaseConfig.js';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Chave AES para criptografia simétrica (use algo mais seguro em produção)
const AES_KEY = "chaveSuperSecreta123!";

document.addEventListener('DOMContentLoaded', async () => {
    const addUserForm = document.getElementById('addUserForm');
    const newUsernameInput = document.getElementById('newUsername');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const userListUL = document.getElementById('userList');
    const feedbackP = document.getElementById('userManagementFeedback');

    const DEFAULT_ADMIN_USER = 'adm';

    // 🔐 Criptografa senha com AES
    function criptografarSenhaAES(senha) {
        return CryptoJS.AES.encrypt(senha, AES_KEY).toString();
    }

    // Função para buscar usuários uma única vez (para validação)
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

        userListUL.innerHTML = ''; // Limpa a lista antes de renderizar

        if (users.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Nenhum usuário cadastrado.';
            li.className = 'text-gray-400 text-center';
            userListUL.appendChild(li);
            return;
        }

        users.forEach(user => {
            const li = document.createElement('li');
            li.className = 'flex items-center justify-between bg-gray-700/50 p-3 rounded-xl shadow';

            const usernameSpan = document.createElement('span');
            usernameSpan.className = 'text-gray-200 font-medium';
            usernameSpan.textContent = user.user;
            li.appendChild(usernameSpan);

            if (user.user.toLowerCase() !== DEFAULT_ADMIN_USER) {
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Excluir';
                deleteButton.dataset.userId = user.id;
                deleteButton.dataset.userName = user.user; // Adiciona para a mensagem de confirmação
                deleteButton.className = 'deleteUserButton text-red-400 hover:text-red-300 text-sm font-medium px-3 py-1 rounded-lg border border-red-500/50 hover:bg-red-500/20 transition-colors';
                li.appendChild(deleteButton);
            } else {
                const adminLabel = document.createElement('span');
                adminLabel.textContent = 'Admin';
                adminLabel.className = 'text-xs font-semibold text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full';
                li.appendChild(adminLabel);
            }

            userListUL.appendChild(li);
        });
    }

    // Listener em tempo real para a lista de usuários
    function listenForUserChanges() {
        const usersCollection = collection(db, 'senha_login');
        onSnapshot(query(usersCollection), (snapshot) => {
            console.log("🔥 Lista de usuários atualizada em tempo real!");
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

        if (!username || !password) {
            return displayFeedback("Usuário e senha são obrigatórios.", true);
        }
        if (password !== confirmPassword) {
            return displayFeedback("As senhas não coincidem.", true);
        }

        // Valida se o usuário já existe antes de adicionar
        const existingUsers = await getUsersOnce();
        if (existingUsers.find(u => u.user.toLowerCase() === username.toLowerCase())) {
            return displayFeedback("Este nome de usuário já existe.", true);
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

    // --- Setup Inicial ---
    if (addUserForm) {
        addUserForm.addEventListener('submit', handleAddUserFormSubmit);
    }
    if (userListUL) {
        userListUL.addEventListener('click', handleDeleteUserClick);
    }

    listenForUserChanges(); // Inicia o listener em tempo real
});
