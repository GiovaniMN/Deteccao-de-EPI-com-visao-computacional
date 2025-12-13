// copyLink.js - lida com a funcionalidade de copiar o link do grupo do telegram.
document.addEventListener('DOMContentLoaded', () => {
    const copyBtn = document.getElementById('copyGroupLinkBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            const linkField = document.getElementById('groupInviteLink');
            const originalHTML = copyBtn.innerHTML;

            try {
                await navigator.clipboard.writeText(linkField.value);
                copyBtn.innerHTML = `
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    <span>Copiado</span>
                `;
                copyBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                copyBtn.classList.add('bg-green-600');

                setTimeout(() => {
                    copyBtn.innerHTML = originalHTML;
                    copyBtn.classList.remove('bg-green-600');
                    copyBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
                }, 2000);

            } catch (err) {
                //fallback para navegadores mais antigos
                linkField.select();
                document.execCommand('copy');
                
                copyBtn.innerHTML = '<span>Copiado</span>';
                setTimeout(() => {
                    copyBtn.innerHTML = originalHTML;
                }, 2000);
            }
        });
    }
});