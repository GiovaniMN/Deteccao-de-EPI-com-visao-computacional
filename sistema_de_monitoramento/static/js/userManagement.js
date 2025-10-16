import { db } from './firebaseConfig.js';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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

    // **NOVA**: Função para buscar usuários da collection senha_login
    async function getUsersOnce() {
        const usersCollection = collection(db, 'senha_login');
        const querySnapshot = await getDocs(usersCollection);
        const users = [];
        querySnapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() });
        });
        return users;
    }

    // **MODIFICADA**: Renderizar lista com status Telegram
    function renderUserList(users) {
        if (!userListUL) return;

        userListUL.innerHTML = '';

        if (users.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'Nenhum usuário cadastrado.';
            li.className = 'text-gray-400 text-center';
            userListUL.appendChild(li);
            return;
        }

        let telegramActiveCount = 0;

        users.forEach(user => {
            // **Verificar campos Telegram**
            const receiveAlerts = user.receber_alertas || false;
            const chatId = user.telegram_chat_id || null;
            
            if (receiveAlerts && chatId) telegramActiveCount++;

            // Status Telegram
            let telegramStatus = '';
            if (receiveAlerts && chatId) {
                telegramStatus = '<span class="text-green-400 text-xs">🔔 Telegram Ativo</span>';
            } else if (receiveAlerts && !chatId) {
                telegramStatus = '<span class="text-yellow-400 text-xs">⏳ Pendente</span>';
            }

            const li = document.createElement('li');
            li.className = 'flex items-center justify-between bg-gray-700/50 p-3 rounded-xl shadow';

            const userInfo = document.createElement('div');
            userInfo.innerHTML = `
                <div>
                    <span class="text-gray-200 font-medium block">${user.nome || user.user}</span>
                    <span class="text-gray-400 text-xs block">${user.user}</span>
                    ${telegramStatus}
                    ${chatId ? `<span class="text-blue-400 text-xs">ID: ${chatId}</span>` : ''}
                </div>
            `;

            li.appendChild(userInfo);

            // **Botões (mantidos + novo botão Telegram)**
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'flex items-center space-x-2';

            // Botão toggle alertas
            if (user.user.toLowerCase() !== DEFAULT_ADMIN_USER) {
                const alertButton = document.createElement('button');
                alertButton.innerHTML = receiveAlerts ? '🔔' : '📵';
                alertButton.title = receiveAlerts ? 'Desativar alertas' : 'Ativar alertas';
                alertButton.className = 'text-blue-400 hover:text-blue-300 p-2 hover:bg-blue-500/10 rounded-lg transition-all';
                alertButton.onclick = () => toggleUserAlerts(user.id, !receiveAlerts);
                buttonsDiv.appendChild(alertButton);
            }

            if (user.user.toLowerCase() !== DEFAULT_ADMIN_USER) {
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Excluir';
                deleteButton.dataset.userId = user.id;
                deleteButton.dataset.userName = user.user;
                deleteButton.className = 'deleteUserButton text-red-400 hover:text-red-300 text-sm font-medium px-3 py-1 rounded-lg border border-red-500/50 hover:bg-red-500/20 transition-colors';
                buttonsDiv.appendChild(deleteButton);
            } else {
                const adminLabel = document.createElement('span');
                adminLabel.textContent = 'Admin';
                adminLabel.className = 'text-xs font-semibold text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full';
                buttonsDiv.appendChild(adminLabel);
            }

            li.appendChild(buttonsDiv);
            userListUL.appendChild(li);
        });

        // **Atualizar botão de teste**
        const testBtn = document.getElementById('testTelegramAlertsBtn');
        if (testBtn) {
            testBtn.innerHTML = `🔔 Teste (${telegramActiveCount})`;
        }
    }

    // **NOVA**: Função para ativar/desativar alertas
    async function toggleUserAlerts(userId, newStatus) {
        try {
            await updateDoc(doc(db, 'senha_login', userId), {
                receber_alertas: newStatus
            });
            
            const statusText = newStatus ? 'ativados' : 'desativados';
            displayFeedback(`✅ Alertas ${statusText}!`);
            
        } catch (error) {
            console.error('Erro ao alterar alertas:', error);
            displayFeedback('❌ Erro ao alterar alertas', true);
        }
    }

    // **NOVA**: Teste de alertas
    async function testTelegramAlerts() {
        try {
            const users = await getUsersOnce();
            const alertUsers = users.filter(u => u.receber_alertas && u.telegram_chat_id);
            
            if (alertUsers.length === 0) {
                displayFeedback('⚠️ Nenhum usuário com alertas e Chat ID vinculado', true);
                return;
            }
            
            displayFeedback(`📤 Teste enviado para ${alertUsers.length} usuários`);
            
            // **AQUI**: Chamada para API Python ou webhook
            // fetch('/api/test-telegram', { method: 'POST' });
            
        } catch (error) {
            displayFeedback('❌ Erro no teste', true);
        }
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

    // **MODIFICADA**: Função para adicionar usuário com campos Telegram
    async function handleAddUserFormSubmit(event) {
        event.preventDefault();

        const username = newUsernameInput?.value.trim();
        const password = newPasswordInput?.value;
        const confirmPassword = confirmPasswordInput?.value;
        
        // **NOVO**: Dados Telegram
        const fullName = document.getElementById('fullName')?.value.trim();
        const receiveAlerts = document.getElementById('receiveAlerts')?.checked || false;
        const chatId = window.telegramData?.getChatId() || null;

        if (!username || !password) {
            return displayFeedback("Usuário e senha são obrigatórios.", true);
        }
        if (password !== confirmPassword) {
            return displayFeedback("As senhas não coincidem.", true);
        }

        // Validar alertas
        if (receiveAlerts && !chatId) {
            return displayFeedback("Para receber alertas, vincule o Chat ID do Telegram.", true);
        }

        // Valida se o usuário já existe
        const existingUsers = await getUsersOnce();
        if (existingUsers.find(u => u.user.toLowerCase() === username.toLowerCase())) {
            return displayFeedback("Este nome de usuário já existe.", true);
        }

        const senhaCriptografada = criptografarSenhaAES(password);
        
        // **ESTRUTURA EXPANDIDA**: Adicionar campos Telegram à sua collection existente
        const userData = {
            user: username,
            pass: senhaCriptografada,
            // **NOVOS CAMPOS**:
            nome: fullName || username,
            receber_alertas: receiveAlerts,
            telegram_chat_id: chatId
        };

        try {
            await addDoc(collection(db, 'senha_login'), userData);
            
            const alertMsg = receiveAlerts ? 
                (chatId ? '✅ Usuário criado e Chat ID vinculado!' : '✅ Usuário criado (Chat ID pendente)') :
                '✅ Usuário criado!';
            
            displayFeedback(alertMsg);
            addUserForm?.reset();
            
            // **Reset Telegram**
            if (window.telegramData) {
                window.telegramData.reset();
            }
            document.getElementById('telegramConfigSection').classList.add('hidden');
            
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

    // **NOVA**: Expor função toggle alertas globalmente
    window.toggleUserAlerts = toggleUserAlerts;

    // --- Setup Inicial ---
    if (addUserForm) {
        addUserForm.addEventListener('submit', handleAddUserFormSubmit);
    }
    if (userListUL) {
        userListUL.addEventListener('click', handleDeleteUserClick);
    }

    // **NOVO**: Setup botão teste
    const testBtn = document.getElementById('testTelegramAlertsBtn');
    if (testBtn) {
        testBtn.addEventListener('click', testTelegramAlerts);
    }

    listenForUserChanges();
});
