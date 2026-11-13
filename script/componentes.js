// componentes.js — pedaços de tela reutilizados: cartão de produto, ícones, janela "adicionado"

import { brl, fmt, esc, $ } from './util.js';
import { fotoPequena } from './catalogo.js';
import { carrinho, adicionar, definirQuantidade, totalItens } from './carrinho.js';
import { descontoPrazo } from './precos.js';
import { link } from './whatsapp.js';

/** Produto sem estoque na matriz: aparece no site, mas não entra no carrinho. */
export const esgotado = (p) => p.status === 'esgotado';
export const consultaEsgotado = (p) => link(`Olá! Vi no site que o produto ${p.cod} — ${p.nome} está esgotado. Vocês têm uma opção parecida?`);

const CAMINHOS = {
  'Básico': 'M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6',
  'Pisos e Revestimentos': 'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z',
  'Pintura': 'M3 3h15v6H3zM18 6h3v5h-9v3M10.5 14h3v7h-3z',
  'Hidráulico': 'M4 7h9a4 4 0 0 1 4 4v9M4 4v6M14 20h6',
  'Elétrico': 'M13 2L4 14h7l-1 8 9-12h-7z',
  'Ferramentas': 'M14.5 5.5a4 4 0 0 0 5 5L12 18l-3 3-3-3 3-3 7.5-7.5a4 4 0 0 1-2-2z',
  'Acabamento': 'M4 11h16a8 8 0 0 1-16 0zM12 3v8M9 6h6',
  'Ferragens': 'M12 3v12M8 7h8M10 21h4l-2-6z',
  'Limpeza': 'M12 3v9M7 12h10l-1 9H8z',
  'Faixas, Filetes e Rodapés': 'M3 8h18M3 12h18M3 16h18',
  whats: 'M4 20l1.3-3.8A8 8 0 1 1 8 19zM9 9.5c.3 2.2 2.3 4.2 4.5 4.5l1-1.2 2 .8-.5 1.6c-3.6.3-7.4-3.5-7.1-7.1l1.6-.5.8 2z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  caixa: 'M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10',
};
export const icone = (nome, tam = 26) =>
  `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${CAMINHOS[nome] || CAMINHOS.caixa}"/></svg>`;

export const semFoto = () => `<span class="sem-foto">${icone('caixa', 48)}</span>`;

/** Foto de produto que, se não carregar, vira o ícone de caixa. */
export const imgProduto = (src, alt, lazy = true) =>
  `<img src="${src}" alt="${esc(alt)}"${lazy ? ' loading="lazy"' : ''} decoding="async" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="sem-foto" hidden>${icone('caixa', 48)}</span>`;

/** Cartão de produto da vitrine. */
export function cartao(p) {
  const un = p.un ? `/${p.un}` : '';
  const desc = descontoPrazo(p);
  const de = desc ? `<span class="preco-de">De <s>${brl(p.prazo)}</s></span>` : '';
  const precos = p.bf
    ? `<span class="preco-black">${brl(p.bf)}<small>${un} à vista ou 3x sem juros · só retirada</small></span>
       ${de}`
    : p.super
    ? `<span class="preco-oferta">${brl(p.super)}<small>${un} à vista · só retirada</small></span>
       ${de}`
    : `<span class="preco-vista">${brl(p.vista)} <small>${un} à vista</small></span>
       <span class="preco-prazo">${brl(p.prazo)}${un} a prazo</span>`;
  const sem = esgotado(p);
  return `<article class="card${p.bf ? ' black' : p.super ? ' oferta' : ''}${sem ? ' esgotado' : ''}">
    <a class="card-link" href="produto.html?cod=${p.cod}">
      <div class="foto">${p.foto ? imgProduto(fotoPequena(p.foto), p.nome) : semFoto()}
        ${sem ? '<span class="selo selo-esgotado">ESGOTADO</span>' : p.bf ? '<span class="selo selo-black">BLACK FRIDAY</span>' : p.super ? '<span class="selo selo-oferta">SUPER OFERTA</span>' : ''}
        ${desc ? `<span class="selo selo-desconto${p.bf ? ' black' : ''}">-${desc}%</span>` : ''}
        ${p.fator ? `<span class="selo selo-caixa">cx ${fmt(p.fator)} m²</span>` : ''}</div>
      <div class="card-info"><span class="marca">${esc(p.marca || '')}</span><span class="card-nome">${esc(p.nome)}</span>
        <span class="codigo">Cód. ${p.cod}</span><div class="precos">${precos}</div></div>
    </a>
    ${sem ? `<a class="btn-adicionar btn-consultar" href="${consultaEsgotado(p)}" target="_blank" rel="noopener">Esgotado · Consultar</a>`
          : `<button class="btn-adicionar" type="button" data-adicionar="${p.cod}">Adicionar</button>`}
  </article>`;
}

export const textoQuantidade = (p, q) =>
  p.fator ? `${q} ${q === 1 ? 'caixa' : 'caixas'} (${fmt(Math.round(q * p.fator * 100) / 100)} m²)` : `${q} ${p.un || 'un'}`;

/** Janela "Adicionado ao carrinho" com quantidade, continuar comprando ou ir para o carrinho. */
export function abrirAdicionado(p) {
  let janela = $('#janela-adicionado');
  if (!janela) {
    janela = document.createElement('dialog');
    janela.id = 'janela-adicionado';
    janela.className = 'janela';
    janela.setAttribute('aria-labelledby', 'janela-titulo');
    document.body.append(janela);
    janela.addEventListener('click', (e) => { if (e.target === janela) janela.close(); });
  }
  const desenhar = () => {
    const q = carrinho.itens[p.cod] || 1;
    const total = totalItens();
    janela.innerHTML = `<div class="janela-corpo">
      <div class="janela-topo"><span class="janela-check">${icone('check', 24)}</span>
        <div><strong id="janela-titulo" style="font-size:18px">Adicionado ao carrinho</strong><br><span class="nota">${esc(p.nome)}</span></div></div>
      <div class="janela-qtd"><strong>Quantidade</strong>
        <div class="quantidade"><button type="button" data-delta="-1" aria-label="Diminuir">−</button><output style="min-width:120px">${textoQuantidade(p, q)}</output><button type="button" data-delta="1" aria-label="Aumentar">+</button></div></div>
      ${p.bf ? '<span class="alerta alerta-black">Black Friday: retirando na loja, à vista ou em 3x sem juros. Estoque limitado: o televendas confirma a disponibilidade.</span>' : p.super ? '<span class="alerta alerta-vermelho">Super Oferta: só à vista e retirando na loja.</span>' : ''}
      <span class="nota">Seu carrinho tem ${total} ${total === 1 ? 'item' : 'itens'} no total.</span>
      <div class="opcoes"><button type="button" data-acao="continuar">Continuar comprando</button>
        <a class="btn btn-principal" href="carrinho.html" style="min-height:52px">Ir para o carrinho</a></div></div>`;
  };
  janela.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.delta) { definirQuantidade(p.cod, (carrinho.itens[p.cod] || 1) + Number(b.dataset.delta)); desenhar(); }
    if (b.dataset.acao === 'continuar') janela.close();
  };
  desenhar();
  if (!janela.open) janela.showModal();
}

/** Liga todos os botões "Adicionar" da página. */
export function ligarBotoesAdicionar(porCodigo) {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-adicionar]');
    if (!b) return;
    const p = porCodigo[b.dataset.adicionar];
    if (!p || esgotado(p)) return;
    adicionar(p.cod, 1);
    abrirAdicionado(p);
  });
}
