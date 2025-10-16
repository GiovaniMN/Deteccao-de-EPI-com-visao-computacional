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

    // **VARIÁVEIS TELEGRAM**
    let selectedChatId = null;
    let widgetCreated = false;

    // **CALLBACK GLOBAL TELEGRAM**
    window.onTelegramAuth = function(user) {
        console.log('🎯 Telegram Auth:', user);
        selectedChatId = user.id;
        
        document.getElementById('chatIdValue').textContent = user.id;
        document.getElementById('currentChatIdDisplay').classList.remove('hidden');
        
        // Auto-preencher nome
        const nameField = document.getElementById('fullName');
        if (!nameField.value && user.first_name) {
            nameField.value = `${user.first_name} ${user.last_name || ''}`.trim();
        }
        
        displayFeedback(`✅ Chat ID ${user.id} vinculado automaticamente!`);
    };

    // **CONTROLE CHECKBOX ALERTAS**
    const receiveAlertsCheckbox = document.getElementById('receiveAlerts');
    if (receiveAlertsCheckbox) {
        receiveAlertsCheckbox.addEventListener('change', (e) => {
            const section = document.getElementById('telegramConfigSection');
            
            if (e.target.checked) {
                section.classList.remove('hidden');
                createTelegramWidget();
                console.log('🔔 Seção Telegram ativada');
            } else {
                section.classList.add('hidden');
                selectedChatId = null;
                document.getElementById('currentChatIdDisplay').classList.add('hidden');
                console.log('📵 Seção Telegram desativada');
            }
        });
    }

    // **CRIAR WIDGET DINAMICAMENTE** (SOLUÇÃO PRINCIPAL)
    function createTelegramWidget() {
        if (widgetCreated) {
            console.log('🔄 Widget já criado');
            return;
        }
        
        console.log('🚀 Criando widget Telegram...');
        const container = document.getElementById('telegramWidgetContainer');
        
        if (!container) {
            console.log('❌ Container não encontrado');
            return;
        }
        
        // **CRIAR SCRIPT DINAMICAMENTE**
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', 'AlertaEpiBot');
        script.setAttribute('data-size', 'large');
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.setAttribute('data-request-access', 'write');
        
        // **ADICIONAR AO CONTAINER**
        container.appendChild(script);
        widgetCreated = true;
        
        console.log('✅ Script do widget adicionado');
        
        // **AGUARDAR CARREGAMENTO**
        setTimeout(() => {
            const iframe = container.querySelector('iframe');
            if (iframe) {
                console.log('✅ Widget Telegram carregado');
            } else {
                console.log('❌ Widget não carregou - verificar BotFather');
                container.innerHTML = '<p class="text-red-400 text-xs">❌ Erro: Verificar configuração BotFather</p>';
            }
        }, 3000);
    }

    // **TOGGLE MÉTODO MANUAL**
    const toggleBtn = document.getElementById('toggleManualChatId');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const manualDiv = document.getElementById('manualChatIdDiv');
            manualDiv.classList.toggle('hidden');
        });
    }

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

    // **RENDERIZAR LISTA COM STATUS TELEGRAM**
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

            const li = document.createElement('li');
            li.className = 'flex items-center justify-between bg-gray-700/50 p-3 rounded-xl shadow';

            const userInfo = document.createElement('div');
            userInfo.className = 'flex-1';

            // **Nome e status Telegram**
            let telegramStatusHtml = '';
            if (receiveAlerts && chatId) {
                telegramStatusHtml = '<div class="text-green-400 text-xs">🔔 Telegram Ativo</div>';
            } else if (receiveAlerts && !chatId) {
                telegramStatusHtml = '<div class="text-yellow-400 text-xs">⏳ Telegram Pendente</div>';
            } else {
                telegramStatusHtml = '<div class="text-gray-400 text-xs">📵 Sem alertas</div>';
            }

            userInfo.innerHTML = `
                <span class="text-gray-200 font-medium block">${user.nome || user.user}</span>
                <span class="text-gray-400 text-xs block">${user.user}</span>
                ${telegramStatusHtml}
                ${chatId ? `<div class="text-blue-400 text-xs">ID: ${chatId}</div>` : ''}
            `;

            li.appendChild(userInfo);

            // **Botões**
            if (user.user.toLowerCase() !== DEFAULT_ADMIN_USER) {
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Excluir';
                deleteButton.dataset.userId = user.id;
                deleteButton.dataset.userName = user.user;
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

        // **Atualizar botão teste**
        const testBtn = document.getElementById('testTelegramAlertsBtn');
        if (testBtn) {
            testBtn.textContent = `🔔 Teste (${telegramActiveCount})`;
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

    // **FORMULÁRIO MODIFICADO COM CAMPOS TELEGRAM**
    async function handleAddUserFormSubmit(event) {
        event.preventDefault();

        const username = newUsernameInput?.value.trim();
        const password = newPasswordInput?.value;
        const confirmPassword = confirmPasswordInput?.value;
        
        // **CAMPOS TELEGRAM**
        const fullName = document.getElementById('fullName')?.value.trim();
        const receiveAlerts = document.getElementById('receiveAlerts')?.checked || false;
        const finalChatId = selectedChatId || document.getElementById('manualChatId')?.value || null;

        if (!username || !password) {
            return displayFeedback("Usuário e senha são obrigatórios.", true);
        }
        if (password !== confirmPassword) {
            return displayFeedback("As senhas não coincidem.", true);
        }

        // **Validar alertas**
        if (receiveAlerts && !finalChatId) {
            return displayFeedback("Para receber alertas, vincule o Chat ID do Telegram.", true);
        }

        // Valida se o usuário já existe
        const existingUsers = await getUsersOnce();
        if (existingUsers.find(u => u.user.toLowerCase() === username.toLowerCase())) {
            return displayFeedback("Este nome de usuário já existe.", true);
        }

        const senhaCriptografada = criptografarSenhaAES(password);
        
        // **ESTRUTURA EXPANDIDA COM CAMPOS TELEGRAM**
        const userData = {
            user: username,
            pass: senhaCriptografada,
            nome: fullName || username,
            receber_alertas: receiveAlerts,
            telegram_chat_id: finalChatId
        };

        try {
            await addDoc(collection(db, 'senha_login'), userData);
            
            const alertMsg = receiveAlerts ? 
                (finalChatId ? '✅ Usuário criado e Chat ID vinculado!' : '✅ Usuário criado (Chat ID pendente)') :
                '✅ Usuário criado!';
            
            displayFeedback(alertMsg);
            addUserForm?.reset();
            
            // **Reset Telegram**
            selectedChatId = null;
            document.getElementById('currentChatIdDisplay')?.classList.add('hidden');
            document.getElementById('telegramConfigSection')?.classList.add('hidden');
            document.getElementById('manualChatId').value = '';
            
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
    
    console.log('✅ UserManagement carregado com funcionalidade Telegram');
});
