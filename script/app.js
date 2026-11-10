// app.js — roda em TODAS as páginas: cabeçalho, menu, rodapé, tema e contador do carrinho
// Cada página HTML tem <body data-pagina="inicio|produtos|ofertas|produto|carrinho|contato|sobre">

import { $, ler, salvar } from './util.js';
import { totalItens } from './carrinho.js';
import { link } from './whatsapp.js';
import { icone } from './componentes.js';
import { carregarCatalogo } from './catalogo.js';

const pagina = document.body.dataset.pagina;

// Catálogos interativos: os outros sites da loja, abertos pelo item do menu
const CATALOGOS = [
  ['https://farolprimavera.github.io/guia-de-impermeabilizacao/', 'Guia de impermeabilização', 'Descubra o produto certo para cada caso', 'imagens/catalogos/impermeabilizacao.png'],
  ['https://farolprimavera.github.io/site-tintas/', 'Simulador de tintas', 'Veja a cor na parede antes de comprar', 'imagens/catalogos/tintas.png'],
  ['https://farolprimavera.github.io/site-pisos/', 'Simulador de pisos', 'Troque o piso do ambiente e compare', 'imagens/catalogos/pisos.png'],
];

const MENU = [
  ['index.html', 'inicio', 'Início'],
  ['produtos.html', 'produtos', 'Produtos'],
  ['ofertas.html', 'ofertas', 'Super Ofertas'],
  ['contato.html', 'contato', 'Contato'],
  ['sobre.html', 'sobre', 'Sobre nós'],
];

function cabecalho() {
  const atual = pagina === 'produto' ? 'produtos' : pagina;
  const busca = new URLSearchParams(location.search).get('q') || '';
  return `<header class="cabecalho"><div class="largura lado cabecalho-linha">
      <a class="logo" href="index.html" aria-label="Farol da Primavera — página inicial"><img src="imagens/marca/logo.webp" alt="Farol da Primavera Materiais de Construção" width="160" height="92"></a>
      <form class="busca" role="search" action="produtos.html">
        <label for="busca" class="sr-only">Buscar produto</label>
        <input id="busca" name="q" type="search" placeholder="O que você procura?" autocomplete="off" value="${busca.replace(/"/g, '&quot;')}">
        <button type="submit" aria-label="Buscar"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg></button>
      </form>
      <div class="acoes">
        <a class="icone-btn" href="index.html" aria-label="Página inicial"${atual === 'inicio' ? ' aria-current="page"' : ''}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10"/></svg></a>
        <button class="icone-btn" id="btn-tema" type="button" aria-label="Alternar tema claro e escuro"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z"/></svg></button>
        <a class="icone-btn carrinho" href="carrinho.html" aria-label="Carrinho"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2.2l2.3 11h11l2-8H6.4"/><circle cx="9.5" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/></svg><span class="contador" id="contador">0</span></a>
        <button class="icone-btn btn-menu" id="btn-menu" type="button" aria-label="Abrir menu" aria-expanded="false" aria-controls="gaveta"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
      </div>
    </div></header>
    <nav class="menu" aria-label="Menu principal"><div class="largura lado">
      <a href="blackfriday.html" class="menu-black" id="menu-black" hidden${pagina === 'blackfriday' ? ' aria-current="page"' : ''}>Black Friday</a>
      ${MENU.map(([href, id, nome]) => `<a href="${href}"${id === 'ofertas' ? ' class="menu-oferta"' : ''}${id === atual ? ' aria-current="page"' : ''}>${nome}</a>`).join('')}
      <button type="button" class="menu-catalogos" id="btn-catalogos" aria-expanded="false" aria-controls="painel-catalogos">Catálogos interativos<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
    </div></nav>
    <div class="gaveta" id="gaveta" hidden>
      <div class="gaveta-fundo" data-fechar></div>
      <nav class="gaveta-painel" aria-label="Menu" role="dialog" aria-modal="true" aria-labelledby="gaveta-titulo">
        <div class="gaveta-topo"><strong id="gaveta-titulo">Menu</strong>
          <button type="button" class="gaveta-fechar" data-fechar aria-label="Fechar menu"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
        <a href="blackfriday.html" class="gaveta-black" id="gaveta-black" hidden>Black Friday</a>
        ${MENU.map(([href, id, nome]) => `<a href="${href}" class="gaveta-link${id === 'ofertas' ? ' oferta' : ''}"${id === atual ? ' aria-current="page"' : ''}>${nome}</a>`).join('')}
        <span class="gaveta-secao">Catálogos interativos</span>
        ${CATALOGOS.map(([href, nome, desc, icone]) => `<a href="${href}" class="gaveta-catalogo" target="_blank" rel="noopener"><img src="${icone}" alt="" width="36" height="36"><span><strong>${nome}</strong><span class="nota">${desc}</span></span></a>`).join('')}
        <a class="btn btn-whats gaveta-whats" href="${link()}" target="_blank" rel="noopener">Falar com o televendas</a>
      </nav>
    </div>
    <div class="menu-painel" id="painel-catalogos" hidden>
      ${CATALOGOS.map(([href, nome, desc, icone]) => `<a href="${href}" target="_blank" rel="noopener"><img class="icone-catalogo" src="${icone}" alt="" width="40" height="40"><span><strong>${nome}</strong><span class="nota">${desc}</span></span></a>`).join('')}
    </div>`;
}

function rodape() {
  return `<footer class="rodape"><div class="largura lado">
      <div><strong style="font-size:18px">Farol da Primavera</strong><p>Materiais de construção, reforma e acabamento no Jardim Primavera desde 1979.</p></div>
      <div><strong>Onde estamos</strong><p>Av. Jornalista Moacir Padilha, 351<br>Jardim Primavera, Duque de Caxias / RJ<br>CEP 25215-250</p></div>
      <div><strong>Atendimento</strong><p>Segunda a sábado, 8h às 18h</p><p><a class="btn btn-whats" style="min-height:42px" href="${link()}" target="_blank" rel="noopener">Televendas (21) 2776-3391</a></p></div>
      <div><strong>Redes sociais</strong><p class="redes"><a href="https://www.instagram.com/faroldaprimavera/" target="_blank" rel="noopener">Instagram</a><a href="https://www.facebook.com/FarolDaPrimavera/" target="_blank" rel="noopener">Facebook</a><a href="https://www.tiktok.com/@faroldaprimavera" target="_blank" rel="noopener">TikTok</a></p></div>
    </div>
    <div class="rodape-base"><div class="largura lado">Preços e estoque atualizados diariamente e sujeitos a confirmação do televendas.</div></div></footer>
    <a class="whats-flutuante" href="${link()}" target="_blank" rel="noopener" aria-label="Falar com o televendas pelo WhatsApp">${icone('whats', 32)}</a>`;
}

// monta cabeçalho e rodapé
document.body.insertAdjacentHTML('afterbegin', cabecalho());
document.body.insertAdjacentHTML('beforeend', rodape());

// menu "Catálogos interativos": o painel fica fora do menu (que rola de lado no celular) e abre embaixo do botão
const btnCat = $('#btn-catalogos'), painel = $('#painel-catalogos');
function fecharCatalogos() { painel.hidden = true; btnCat.setAttribute('aria-expanded', 'false'); }
btnCat.addEventListener('click', (e) => {
  e.stopPropagation();
  if (!painel.hidden) return fecharCatalogos();
  painel.hidden = false;
  btnCat.setAttribute('aria-expanded', 'true');
  const r = btnCat.getBoundingClientRect();
  painel.style.top = `${r.bottom + 6}px`;
  painel.style.left = `${Math.max(16, Math.min(r.left, innerWidth - painel.offsetWidth - 16))}px`;
});
document.addEventListener('click', (e) => { if (!painel.hidden && !painel.contains(e.target)) fecharCatalogos(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !painel.hidden) { fecharCatalogos(); btnCat.focus(); } });
addEventListener('scroll', fecharCatalogos, { passive: true });
addEventListener('resize', fecharCatalogos);
btnCat.parentElement.addEventListener('scroll', fecharCatalogos, { passive: true });

// menu hambúrguer (só no celular): abre a gaveta com o menu inteiro
const gaveta = $('#gaveta'), btnMenu = $('#btn-menu');
function abrirGaveta() { gaveta.hidden = false; document.body.classList.add('sem-rolagem'); btnMenu.setAttribute('aria-expanded', 'true'); gaveta.querySelector('.gaveta-fechar').focus(); }
function fecharGaveta() { if (gaveta.hidden) return; gaveta.hidden = true; document.body.classList.remove('sem-rolagem'); btnMenu.setAttribute('aria-expanded', 'false'); btnMenu.focus(); }
btnMenu.addEventListener('click', abrirGaveta);
gaveta.addEventListener('click', (e) => { if (e.target.closest('[data-fechar]') || e.target.closest('a')) fecharGaveta(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharGaveta(); });
matchMedia('(min-width: 721px)').addEventListener('change', (e) => { if (e.matches) fecharGaveta(); });

// tema claro/escuro (lembra a escolha do cliente)
const tema = ler('farol-tema', null);
if (tema) document.documentElement.dataset.theme = tema;
$('#btn-tema').addEventListener('click', () => {
  const raiz = document.documentElement;
  const escuro = raiz.dataset.theme ? raiz.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  raiz.dataset.theme = escuro ? 'light' : 'dark';
  salvar('farol-tema', raiz.dataset.theme);
});

// Black Friday aparece no menu só enquanto a campanha estiver valendo
carregarCatalogo().then((d) => { if (d.blackAtiva) { $('#menu-black').hidden = false; $('#gaveta-black').hidden = false; } }).catch(() => {});

// contador do carrinho no cabeçalho
const atualizarContador = () => { $('#contador').textContent = totalItens(); };
atualizarContador();
document.addEventListener('carrinho:mudou', atualizarContador);
