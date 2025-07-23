import { db, auth } from '../../../config/firebaseConfig.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { doc, setDoc, getDocs, collection, query, where, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    const addUserForm = document.getElementById('addUserForm');
    const newUsernameInput = document.getElementById('newUsername');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const userListUL = document.getElementById('userList');
    const feedbackP = document.getElementById('userManagementFeedback');

    const DEFAULT_ADMIN_EMAIL = 'adm@jupiter.com'; // Apenas para referência no código

    async function getUsersFromFirebase() {
        try {
            const usersCollection = collection(db, 'users');
            const querySnapshot = await getDocs(usersCollection);
            const users = [];
            querySnapshot.forEach((doc) => {
                users.push({ id: doc.id, ...doc.data() });
            });
            return users;
        } catch (error) {
            console.error("Error getting users from Firebase:", error);
            return [];
        }
    }

    async function deleteUserFromFirebase(userId) {
        // ATENÇÃO: Esta função agora só apaga o documento do Firestore.
        // A exclusão de um usuário do Firebase Auth é uma operação sensível
        // e deve ser feita com cuidado, geralmente por um backend (Cloud Function).
        try {
            await deleteDoc(doc(db, "users", userId));
            return true;
        } catch (error) {
            console.error("Error deleting user from Firebase:", error);
            return false;
        }
    }

    function displayFeedback(message, isError = false) {
        if (feedbackP) {
            feedbackP.textContent = message;
            feedbackP.className = isError ? 'mt-4 text-center text-sm text-red-400' : 'mt-4 text-center text-sm text-green-400';
        }
    }

    async function renderUserList() {
        if (!userListUL) return;
        userListUL.innerHTML = '';

        const users = await getUsersFromFirebase();
        if (users.length === 0) {
            userListUL.innerHTML = '<li class="text-gray-400 text-center">Nenhum usuário cadastrado.</li>';
            return;
        }
        users.forEach(user => {
            const li = document.createElement('li');
            li.className = 'flex items-center justify-between bg-gray-700/30 p-3 rounded-lg';
            li.innerHTML = `
                <div>
                    <span class="font-medium text-white">${user.email}</span>
                    <span class="text-xs ${user.role === 'admin' ? 'text-purple-400' : 'text-gray-400'} ml-2">${user.role}</span>
                </div>
                <button data-user-id="${user.id}" data-user-email="${user.email}" class="deleteUserButton text-red-500 hover:text-red-400 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            `;
            userListUL.appendChild(li);
        });
    }

    async function handleAddUserFormSubmit(event) {
        event.preventDefault();
        const email = newUsernameInput.value.trim();
        const password = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (!email || !password) {
            displayFeedback("Email e senha são obrigatórios.", true);
            return;
        }
        if (password !== confirmPassword) {
            displayFeedback("As senhas não coincidem.", true);
            return;
        }

        try {
            // 1. Criar usuário no Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // 2. Criar documento correspondente no Firestore
            const userDocRef = doc(db, "users", user.uid);
            await setDoc(userDocRef, {
                email: user.email,
                role: 'user' // Por padrão, novos usuários são 'user'
            });

            displayFeedback("Usuário adicionado com sucesso!", false);
            if(addUserForm) addUserForm.reset();
            renderUserList();

        } catch (error) {
            console.error("Error creating new user:", error);
            if (error.code === 'auth/email-already-in-use') {
                displayFeedback("Este endereço de e-mail já está em uso.", true);
            } else if (error.code === 'auth/weak-password') {
                displayFeedback("A senha é muito fraca. Use pelo menos 6 caracteres.", true);
            } else {
                displayFeedback(`Erro ao criar usuário: ${error.message}`, true);
            }
        }
    }

    async function handleDeleteUserClick(event) {
        const deleteButton = event.target.closest('.deleteUserButton');
        if (deleteButton) {
            const userId = deleteButton.dataset.userId;
            const userEmail = deleteButton.dataset.userEmail;

            if (userEmail === DEFAULT_ADMIN_EMAIL) {
                displayFeedback("O usuário administrador padrão não pode ser excluído.", true);
                return;
            }

            if (confirm(`Tem certeza que deseja excluir o registro do usuário "${userEmail}" do Firestore? \n\n(Atenção: Isso não removerá o usuário do sistema de autenticação do Firebase.)`)) {
                const success = await deleteUserFromFirebase(userId);
                if (success) {
                    displayFeedback(`Registro de "${userEmail}" excluído com sucesso.`, false);
                    renderUserList();
                } else {
                    displayFeedback("Erro ao excluir registro do usuário.", true);
                }
            }
        }
    }

    if (addUserForm) addUserForm.addEventListener('submit', handleAddUserFormSubmit);
    if (userListUL) userListUL.addEventListener('click', handleDeleteUserClick);
    
    renderUserList();
});
