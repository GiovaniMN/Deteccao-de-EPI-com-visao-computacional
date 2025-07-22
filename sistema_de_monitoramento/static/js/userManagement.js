import { db, auth } from "./firebaseConfig.js";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
// import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js"; // Descomentar se for usar Firebase Auth para criar usuários
// Assumindo que firebaseConfig.js está em sistema_de_monitoramento/firebaseConfig.js durante o deploy

document.addEventListener('DOMContentLoaded', async () => {
    const addUserForm = document.getElementById('addUserForm');
    const newUsernameInput = document.getElementById('newUsername');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const userListUL = document.getElementById('userList');
    const feedbackP = document.getElementById('userManagementFeedback');

    const DEFAULT_ADMIN_USER = 'adm'; // Define admin username
    const DEFAULT_ADMIN_PASSWORD = '123'; // Define admin password

    async function initializeAdminUser() {
        try {
            console.log('Checking for admin user...');
            const usersCollection = collection(db, 'users');
            const q = query(usersCollection, where('user', '==', DEFAULT_ADMIN_USER));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.log('Admin user not found, creating...');
                const docRef = await addDoc(usersCollection, {
                    user: DEFAULT_ADMIN_USER,
                    pass: DEFAULT_ADMIN_PASSWORD
                });
                console.log('Admin user created successfully with ID:', docRef.id);
            } else {
                console.log('Admin user already exists');
                querySnapshot.forEach((doc) => {
                    console.log('Admin user data:', doc.id, doc.data());
                });
            }
        } catch (error) {
            console.error("Error initializing admin user:", error);
        }
    }

    // Initialize admin user when the page loads
    await initializeAdminUser();

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

    async function saveUserToFirebase(userData) {
        try {
            const usersCollection = collection(db, 'users');
            await addDoc(usersCollection, userData);
            return true;
        } catch (error) {
            console.error("Error saving user to Firebase:", error);
            return false;
        }
    }

    async function deleteUserFromFirebase(userId) {
        try {
            await deleteDoc(doc(db, 'users', userId));
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
        if (!userListUL) {
            console.error("Element userListUL not found for rendering.");
            return;
        }
        userListUL.innerHTML = ''; // Clear existing list

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
        if (!newUsernameInput || !newPasswordInput || !confirmPasswordInput) {
            displayFeedback("Erro: Elementos do formulário não encontrados.", true);
            return;
        }

        const username = newUsernameInput.value.trim();
        const password = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

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

        const success = await saveUserToFirebase({ user: username, pass: password });
        if (success) {
            displayFeedback("Usuário adicionado com sucesso!", false);
            if(addUserForm) addUserForm.reset();
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

            if (!confirm(`Tem certeza que deseja excluir o usuário "${userToDelete.user}"?`)) {
                return;
            }
            
            if (userToDelete.user.toLowerCase() === DEFAULT_ADMIN_USER) {
                displayFeedback("O usuário administrador padrão não pode ser excluído.", true);
                return;
            }

            const success = await deleteUserFromFirebase(userId);
            if (success) {
                displayFeedback(`Usuário "${userToDelete.user}" excluído com sucesso.`, false);
                renderUserList();
            } else {
                displayFeedback("Erro ao excluir usuário.", true);
            }
        }
    }

    // Initial setup
    if (addUserForm) {
        addUserForm.addEventListener('submit', handleAddUserFormSubmit);
    } else {
        console.error("Formulário de adicionar usuário (addUserForm) não encontrado.");
    }

    if (userListUL) {
        userListUL.addEventListener('click', handleDeleteUserClick);
    } else {
        console.error("Lista de usuários (userListUL) não encontrada.");
    }
    
    renderUserList();
});
