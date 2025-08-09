import { db } from './firebaseConfig.js';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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
    const DEFAULT_ADMIN_PASSWORD = '123';

    // 🔐 Criptografa senha com AES
    function criptografarSenhaAES(senha) {
        return CryptoJS.AES.encrypt(senha, AES_KEY).toString();
    }

    async function initializeAdminUser() {
        try {
            const usersCollection = collection(db, 'senha_login');
            const q = query(usersCollection, where('user', '==', DEFAULT_ADMIN_USER));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                const senhaCriptografada = criptografarSenhaAES(DEFAULT_ADMIN_PASSWORD);
                await addDoc(usersCollection, {
                    user: DEFAULT_ADMIN_USER,
                    pass: senhaCriptografada
                });
                console.log('Admin user criado com sucesso.');
            } else {
                console.log('Admin user já existe.');
            }
        } catch (error) {
            console.error("Erro ao inicializar admin:", error);
        }
    }

    await initializeAdminUser();

    async function getUsersFromFirebase() {
        try {
            const usersCollection = collection(db, 'senha_login');
            const querySnapshot = await getDocs(usersCollection);
            const users = [];
            querySnapshot.forEach((doc) => {
                users.push({ id: doc.id, ...doc.data() });
            });
            return users;
        } catch (error) {
            console.error("Erro ao buscar usuários:", error);
            return [];
        }
    }

    async function saveUserToFirebase(userData) {
        try {
            const usersCollection = collection(db, 'senha_login');
            await addDoc(usersCollection, userData);
            return true;
        } catch (error) {
            console.error("Erro ao salvar usuário:", error);
            return false;
        }
    }

    async function deleteUserFromFirebase(userId) {
        try {
            await deleteDoc(doc(db, 'senha_login', userId));
            return true;
        } catch (error) {
            console.error("Erro ao deletar usuário:", error);
            return false;
        }
    }

    function displayFeedback(message, isError = false) {
        if (feedbackP) {
            feedbackP.textContent = message;
            feedbackP.className = isError
                ? 'mt-4 text-center text-sm text-red-400'
                : 'mt-4 text-center text-sm text-green-400';
        }
    }

    async function renderUserList() {
        if (!userListUL) return;

        userListUL.innerHTML = '';
        const users = await getUsersFromFirebase();

        if (users.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Nenhum usuário cadastrado.';
            li.className = 'text-gray-400 text-center';
            userListUL.appendChild(li);
            return;
        }

        users.forEach(user => {
            const li = document.createElement('li');
            li.className = 'flex items-center justify-between bg-[#303030] p-3 rounded-md shadow';

            const usernameSpan = document.createElement('span');
            usernameSpan.className = 'text-gray-200';
            usernameSpan.textContent = user.user;
            li.appendChild(usernameSpan);

            if (user.user.toLowerCase() !== DEFAULT_ADMIN_USER) {
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Excluir';
                deleteButton.dataset.userId = user.id;
                deleteButton.className = 'deleteUserButton text-red-400 hover:text-red-300 text-sm font-medium px-3 py-1 rounded-md bg-transparent border border-red-400 hover:bg-red-400 hover:text-gray-900 transition-colors';
                li.appendChild(deleteButton);
            } else {
                const adminLabel = document.createElement('span');
                adminLabel.textContent = '(Admin)';
                adminLabel.className = 'text-xs text-gray-500 ml-2';
                li.appendChild(adminLabel);
            }

            userListUL.appendChild(li);
        });
    }

    async function handleAddUserFormSubmit(event) {
        event.preventDefault();

        const username = newUsernameInput?.value.trim();
        const password = newPasswordInput?.value;
        const confirmPassword = confirmPasswordInput?.value;

        if (!username || !password) {
            displayFeedback("Usuário e senha são obrigatórios.", true);
            return;
        }

        if (password !== confirmPassword) {
            displayFeedback("As senhas não coincidem.", true);
            return;
        }

        const users = await getUsersFromFirebase();
        if (users.find(u => u.user.toLowerCase() === username.toLowerCase())) {
            displayFeedback("Este nome de usuário já existe.", true);
            return;
        }

        const senhaCriptografada = criptografarSenhaAES(password);

        const success = await saveUserToFirebase({
            user: username,
            pass: senhaCriptografada
        });

        if (success) {
            displayFeedback("Usuário adicionado com sucesso!");
            addUserForm?.reset();
            renderUserList();
        } else {
            displayFeedback("Erro ao adicionar usuário.", true);
        }
    }

    async function handleDeleteUserClick(event) {
        if (event.target.classList.contains('deleteUserButton')) {
            const userId = event.target.dataset.userId;
            if (!userId) return;

            const users = await getUsersFromFirebase();
            const userToDelete = users.find(u => u.id === userId);
            if (!userToDelete) return;

            if (!confirm(`Deseja excluir o usuário "${userToDelete.user}"?`)) return;

            if (userToDelete.user.toLowerCase() === DEFAULT_ADMIN_USER) {
                displayFeedback("O usuário administrador padrão não pode ser excluído.", true);
                return;
            }

            const success = await deleteUserFromFirebase(userId);
            if (success) {
                displayFeedback(`Usuário "${userToDelete.user}" excluído com sucesso.`);
                renderUserList();
            } else {
                displayFeedback("Erro ao excluir usuário.", true);
            }
        }
    }

    // Setup inicial
    if (addUserForm) {
        addUserForm.addEventListener('submit', handleAddUserFormSubmit);
    }

    if (userListUL) {
        userListUL.addEventListener('click', handleDeleteUserClick);
    }

    renderUserList();
});
