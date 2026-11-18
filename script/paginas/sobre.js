// sobre.html — fotos da loja ("Venha nos visitar"); tocar numa foto abre ela maior (igual ao site de tintas)

import { esc } from '../util.js';
import { carregarConteudo } from '../conteudo.js';

const { galeria } = await carregarConteudo();
document.getElementById('galeria').innerHTML = galeria.map((f) => `<figure><button type="button" class="foto-zoom" data-grande="${esc(f.grande || f.foto)}" data-legenda="${esc(f.legenda)}" aria-label="Ampliar foto: ${esc(f.legenda)}"><img src="${esc(f.foto)}" alt="${esc(f.texto)}" loading="lazy"></button><figcaption>${esc(f.legenda)}</figcaption></figure>`).join('');
document.getElementById('visite').hidden = galeria.length === 0;

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
