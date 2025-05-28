const btnLogin = document.getElementById('btnLogin');
const usuario = document.getElementById('usuario');
const senha = document.getElementById('senha');
const saida = document.getElementById('saida');

// Evento para validar alterações nos campos
usuario.addEventListener('change', onChange);
senha.addEventListener('change', onChange);

// Lista de usuários e senhas
let usuarios = [
    { user: 'adm', pass: '123' }
];

function onChange() {
    if (!validNt(this.value)) {
        this.value = '';
        this.focus();
    }
}

// Validações adicionais podem ser feitas na função abaixo
function validNt(value) {
    return value.trim().length > 0; // Garante que não está vazio
}

function gtUsuario() {
    return usuario.value.trim();
}

function gtSenha() {
    return senha.value.trim();
}

function comparar(user, pass) {
    const match = usuarios.find(u => u.user === user && u.pass === pass);
    return match ? true : false;
}

btnLogin.addEventListener('click', onClick);

function onClick() {
    const user = gtUsuario();
    const pass = gtSenha();

    if (comparar(user, pass)) {
        // Redireciona para a nova página em caso de sucesso
        window.location.href = "pagina-principal.html";
    } else {
        saida.textContent = "Usuário ou Senha Incorretos";
    }
}

