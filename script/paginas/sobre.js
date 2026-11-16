// sobre.html — tocar numa foto abre ela maior (igual ao site de tintas)

const dlg = document.getElementById('foto-ampliada');
const img = document.getElementById('foto-ampliada-img');
const legenda = document.getElementById('foto-ampliada-legenda');

document.addEventListener('click', (e) => {
  const b = e.target.closest('.foto-zoom');
  if (!b || !dlg?.showModal) return;
  img.src = b.dataset.grande;
  img.alt = b.querySelector('img')?.alt || '';
  legenda.textContent = b.dataset.legenda || '';
  dlg.showModal();
});

// fecha no X ou clicando fora da foto (Esc já fecha sozinho)
dlg?.addEventListener('click', (e) => {
  if (e.target === dlg || e.target.closest('[data-fechar-foto]')) dlg.close();
});
