// forgotPassword.js - manipulador da funcionalidade "esqueci a senha"
import { db } from './firebaseConfig.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    //controles do modal
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    const forgotPasswordModal = document.getElementById('forgotPasswordModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const successMessage = forgotPasswordModal.querySelector('#successMessage');
    const errorMessage = forgotPasswordModal.querySelector('#errorMessage');

    if (!forgotPasswordBtn || !forgotPasswordModal || !closeModalBtn || !forgotPasswordForm) {
        return; //elementos nao encontrados
    }

    forgotPasswordBtn.addEventListener('click', () => {
        forgotPasswordModal.classList.remove('hidden');
        successMessage.classList.add('hidden');
        errorMessage.classList.add('hidden');
    });

    closeModalBtn.addEventListener('click', () => {
        forgotPasswordModal.classList.add('hidden');
    });

    forgotPasswordModal.addEventListener('click', (e) => {
        if (e.target === forgotPasswordModal) {
            forgotPasswordModal.classList.add('hidden');
        }
    });

    //inicializa emailjs
    try {
        emailjs.init('_IMI1xksu8m22BH_b');
    } catch (error) {
        console.error("Falha ao inicializar o serviço de e-mail:", error);
    }
    

    forgotPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target.email.value.trim();
        const submitBtn = e.target.querySelector('button[type="submit"]');

        if (!email) {
            showError('Por favor, insira seu e-mail.');
            return;
        }

        setLoading(submitBtn, true);

        //verifica se o usuario existe no banco de dados
        try {
            const usersCollection = collection(db, 'senha_login');
            const q = query(usersCollection, where("user", "==", email));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                showError('Usuário não encontrado em nossa base de dados.');
                setLoading(submitBtn, false);
                return;
            }

            //se o usuario existe, envia o e-mail
            await emailjs.send('service_zndz5fl', 'template_32fstzi', {
                to_email: 'epirasp@gmail.com', //e-mail do administrador para notificacao
                from_name: 'Jupiter Supervision',
                reply_to: email,
                nome: "Sistema de Supervisão Jupiter",
                email: email,
                mensagem: `Solicitação de redefinição de senha para o usuário: ${email}.`
            });

            showSuccess('Solicitação enviada! Se o e-mail estiver correto, você receberá um link para redefinir sua senha.');
            e.target.email.value = ''; //limpa o campo
            setTimeout(() => forgotPasswordModal.classList.add('hidden'), 5000);

        } catch (error) {
            console.error('Erro no processo de recuperação de senha:', error);
            showError('Erro ao processar sua solicitação. Tente novamente.');
        } finally {
            setLoading(submitBtn, false);
        }
    });

    function showSuccess(message) {
        successMessage.querySelector('p').textContent = message;
        successMessage.classList.remove('hidden');
        errorMessage.classList.add('hidden');
    }

    function showError(message) {
        errorMessage.querySelector('p').textContent = message;
        errorMessage.classList.remove('hidden');
        successMessage.classList.add('hidden');
    }

    function setLoading(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.querySelector('span').textContent = 'Enviando...';
        } else {
            button.disabled = false;
            button.querySelector('span').textContent = 'Solicitar Redefinição';
        }
    }
});
