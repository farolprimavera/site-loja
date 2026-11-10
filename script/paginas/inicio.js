// página inicial: carrossel, Super Ofertas, categorias

import { $, esc } from '../util.js';
import { carregarCatalogo, contarCategorias } from '../catalogo.js';
import { cartao, icone, ligarBotoesAdicionar } from '../componentes.js';

// Vitrines da página inicial: códigos escolhidos a dedo (fotos bonitas), na ordem em que aparecem.
// Mostra os 8 primeiros que estiverem no site; se faltar (sem estoque), completa com outros do mesmo subgrupo com foto.
const VITRINES = [
  { id: 'vitrine-pisos', grupo: 'Pisos e Revestimentos',
    codigos: ['1012830', '1012775', '1012321', '1012184', '1012190', '1012124', '1012603', '1012758',
              '1012818', '1012583', '1009997', '1012195', '1011458'] },
  { id: 'vitrine-gabinetes', grupo: 'Acabamento', sub: 'Armários/gabinetes',
    codigos: ['1012826', '1007056', '1005954', '1012330', '1008877', '1007059', '1012333', '1009218',
              '1012824', '1008878', '1006708', '1007060', '1004866', '1009215'] },
];
const POR_VITRINE = 8;

const { produtos, porCodigo, blackAtiva } = await carregarCatalogo();

// ---------- carrossel de banners ----------
const carrossel = $('#carrossel');
// o banner da Black Friday sai sozinho quando a campanha termina
if (!blackAtiva) carrossel.querySelector('[data-black]')?.remove();
const imagens = [...carrossel.querySelectorAll('img')];
const pontos = $('#carrossel-pontos');
carrossel.classList.toggle('um-so', imagens.length < 2);
pontos.innerHTML = imagens.map((_, i) => `<button type="button" aria-label="Ir para o destaque ${i + 1}"${i === 0 ? ' class="ativo"' : ''}></button>`).join('');
let atual = 0;
function mostrar(i) {
  atual = (i + imagens.length) % imagens.length;
  imagens.forEach((img, k) => img.classList.toggle('ativo', k === atual));
  [...pontos.children].forEach((b, k) => b.classList.toggle('ativo', k === atual));
  // o botão "Confira nossas ofertas" só fica clicável quando o banner dele está na tela
  carrossel.querySelectorAll('[data-banner]').forEach((a) => { a.hidden = imagens[atual].id !== a.dataset.banner; });
}
carrossel.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.passo) mostrar(atual + Number(b.dataset.passo));
  else mostrar([...pontos.children].indexOf(b));
});
mostrar(0); // a Black Friday abre primeiro; quando ela sai, o banner principal volta a ser o primeiro
if (imagens.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(() => mostrar(atual + 1), 6000);

// ---------- produtos ----------
ligarBotoesAdicionar(porCodigo);

const ofertas = produtos.filter((p) => p.super && p.status !== 'esgotado');
const desconto = (p) => (p.vista - p.super) / p.vista;
$('#total-ofertas').textContent = `Ver todas as ${ofertas.length} →`;
// na vitrine da home só entram ofertas com foto (as maiores descontos primeiro)
$('#grade-ofertas').innerHTML = ofertas.filter((p) => p.foto).sort((a, b) => desconto(b) - desconto(a)).slice(0, 8).map(cartao).join('');

// ---------- vitrines ----------
for (const v of VITRINES) {
  const escolhidos = v.codigos.map((c) => porCodigo[c]).filter((p) => p && p.status !== 'esgotado');
  if (escolhidos.length < POR_VITRINE) {
    const extras = produtos.filter((p) => p.foto && p.status !== 'esgotado' && p.grupo === v.grupo && (!v.sub || p.sub === v.sub) && !escolhidos.includes(p));
    escolhidos.push(...extras.slice(0, POR_VITRINE - escolhidos.length));
  }
  $('#' + v.id).innerHTML = escolhidos.slice(0, POR_VITRINE).map(cartao).join('');
}

const grupos = contarCategorias(produtos);
$('#categorias').innerHTML = Object.entries(grupos)
  .sort((a, b) => b[1].total - a[1].total)
  .map(([g, d]) => `<a class="categoria" href="produtos.html?grupo=${encodeURIComponent(g)}"><span class="ico">${icone(g)}</span><strong>${esc(g)}</strong><span>${d.total.toLocaleString('pt-BR')} produtos</span></a>`)
  .join('');
$('#qtd-pisos').textContent = `${(grupos['Pisos e Revestimentos']?.total || 0).toLocaleString('pt-BR')} opções, vendidas por caixa`;
