document.addEventListener('DOMContentLoaded', function() {
    const btnLogin = document.getElementById('btnLogin');
    const usuarioInput = document.getElementById('usuario');
    const senhaInput = document.getElementById('senha');
    const saidaElement = document.getElementById('saida');

    btnLogin.addEventListener('click', async function(event) {
        event.preventDefault();
        
        const usuario = usuarioInput.value.trim();
        const senha = senhaInput.value.trim();

        console.log('Login attempt:', { usuario, senha });

        // Basic validation
        if (!usuario || !senha) {
            saidaElement.textContent = 'Por favor, preencha todos os campos';
            saidaElement.style.color = 'red';
            return;
        }

        try {
            console.log('Querying Firestore for user:', usuario);
            // Query Firestore for the user
            const usersCollection = firebase.firestore().collection('users');
            const q = usersCollection.where('user', '==', usuario);
            const querySnapshot = await q.get();

            console.log('Query results:', querySnapshot.empty ? 'No user found' : 'User found');

            if (querySnapshot.empty) {
                saidaElement.textContent = 'Usuário não encontrado';
                saidaElement.style.color = 'red';
                return;
            }

            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();
            console.log('User data:', { ...userData, pass: '***' });

            if (userData.pass !== senha) {
                console.log('Password mismatch');
                saidaElement.textContent = 'Senha incorreta';
                saidaElement.style.color = 'red';
                return;
            }

            console.log('Login successful, storing user info');
            // Store user info in sessionStorage
            sessionStorage.setItem('currentUser', JSON.stringify({
                id: userDoc.id,
                username: userData.user
            }));

            // Show success message
            saidaElement.textContent = 'Login realizado com sucesso!';
            saidaElement.style.color = 'green';
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);
        } catch (error) {
            console.error("Error during login:", error);
            saidaElement.textContent = 'Erro ao realizar login. Tente novamente.';
            saidaElement.style.color = 'red';
        }
    });
});
