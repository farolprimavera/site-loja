// carrinho.html — itens, retirar/receber, à vista/a prazo, bairro, nome e envio pelo WhatsApp

import { $, brl, fmt, esc } from '../util.js';
import { carregarCatalogo, fotoPequena } from '../catalogo.js';
import { imgProduto, semFoto } from '../componentes.js';
import { carrinho, definirQuantidade, remover, escolher, limparInexistentes } from '../carrinho.js';
import { precoUnitario, melhorPreco, quantidadeVenda, podeEntregar, nomeOferta } from '../precos.js';
import { carregarFretes, procurarBairro, bairroPorIndice } from '../frete.js';
import { link, mensagemPedido } from '../whatsapp.js';

const { porCodigo } = await carregarCatalogo();
await carregarFretes();
const removidos = limparInexistentes(porCodigo);
const area = $('#carrinho');

function calcular() {
  const retirar = carrinho.modo === 'retirar';
  const aVista = carrinho.pag === 'vista';
  const itens = Object.entries(carrinho.itens).filter(([c, q]) => q > 0 && porCodigo[c]).map(([c, q]) => {
    const p = porCodigo[c];
    const unit = precoUnitario(p, retirar, aVista);
    const qtdVenda = quantidadeVenda(p, q);
    return { p, qtd: q, unit, qtdVenda, total: unit * qtdVenda };
  });
  const subtotal = itens.reduce((a, i) => a + i.total, 0);
  const ofertas = itens.filter((i) => !podeEntregar(i.p));
  const temBlack = itens.some((i) => i.p.bf);
  const conflito = !retirar && ofertas.length > 0;
  const economia = itens.reduce((a, i) => a + (i.unit - melhorPreco(i.p)) * i.qtdVenda, 0);
  const foraDaLista = !retirar && carrinho.bairro === 'outra';
  const bairro = bairroPorIndice(carrinho.bairro);
  const frete = retirar || !bairro ? 0 : bairro.valor;
  const faltas = [];
  if (!retirar && carrinho.bairro === null && !conflito) faltas.push('o bairro');
  if (!carrinho.nome.trim()) faltas.push('seu nome');
  return { retirar, aVista, itens, subtotal, ofertas, conflito, economia, foraDaLista, bairro, frete, total: subtotal + frete, faltas, temBlack };
}

function htmlItem(i) {
  const p = i.p;
  let aviso = '';
  if (!podeEntregar(p) && carrinho.modo !== 'retirar') aviso = `<span class="alerta alerta-vermelho">${nomeOferta(p)}: não entregamos este produto. Só retirada na loja.</span>`;
  else if (p.bf) aviso = '<span class="alerta alerta-black">Black Friday: à vista ou em 3x sem juros.</span>';
  else if (p.super && carrinho.pag !== 'vista') aviso = `<span class="alerta alerta-vermelho">Na Super Oferta sai ${brl(p.super)} pagando à vista.</span>`;
  else if (!p.super && p.vistaRet && carrinho.modo !== 'retirar') aviso = `<span class="alerta alerta-verde">Retirando na loja: ${brl(p.vistaRet)}/${p.un || 'un'} à vista.</span>`;
  return `<div class="item">
    <a class="item-foto" href="produto.html?cod=${p.cod}">${p.foto ? imgProduto(fotoPequena(p.foto), p.nome) : semFoto()}</a>
    <div class="item-dados"><a href="produto.html?cod=${p.cod}">${esc(p.nome)}</a>
      <span class="nota">Cód. ${p.cod} · ${brl(i.unit)}/${p.un || 'un'}${p.fator ? ` · caixa com ${fmt(p.fator)} m² → ${fmt(i.qtdVenda)} m²` : ''}</span>${aviso}</div>
    <div class="item-acoes">
      <div class="quantidade" role="group" aria-label="Quantidade de ${esc(p.nome)}"><button type="button" data-cod="${p.cod}" data-delta="-1" aria-label="Diminuir">−</button><output>${p.fator ? `${i.qtd} cx` : i.qtd}</output><button type="button" data-cod="${p.cod}" data-delta="1" aria-label="Aumentar">+</button></div>
      <div class="item-total"><strong>${brl(i.total)}</strong><button type="button" class="remover" data-remover="${p.cod}">Remover</button></div>
    </div></div>`;
}

function htmlBairro(c) {
  if (c.retirar || c.conflito) return '';
  const regras = `<ul class="regras"><li>Prazo de entrega: até 3 dias úteis.</li><li>Areia, pedra e tijolo a granel são descarregados ao lado do caminhão.</li><li>Não entregamos em 2º andar, ladeiras e becos onde o caminhão não entra.</li></ul>`;
  if (carrinho.bairro === null) {
    return `<div class="bairro pulsa" id="bairro">
      <label for="campo-bairro"><strong style="font-size:17px">Onde vamos entregar?</strong><br><span class="nota">Escolha seu bairro em Duque de Caxias para calcular o frete</span></label>
      <input class="campo" id="campo-bairro" type="search" autocomplete="off" placeholder="Digite seu bairro aqui">
      <ul class="sugestoes" id="sugestoes" hidden></ul>
      <button type="button" class="link-simples" style="align-self:flex-start" data-bairro="outra">Não achei meu bairro ou é outra cidade</button></div>${regras}`;
  }
  const aviso = c.foraDaLista
    ? '<span class="alerta alerta-vermelho">O televendas calcula o frete pelo seu endereço. Fora de Duque de Caxias o frete é por carga e a entrega costuma ser aos sábados.</span>'
    : c.bairro.critico ? '<span class="alerta alerta-vermelho">Local com acesso especial: a rua precisa dar passagem para caminhão. O televendas confirma o frete.</span>' : '';
  return `<div class="bairro escolhido" id="bairro"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
      <span><strong>${c.foraDaLista ? 'Localidade fora da lista' : esc(c.bairro.nome)}</strong><br><span class="nota">Frete: ${c.foraDaLista ? 'a combinar com o televendas' : brl(c.bairro.valor)}</span></span>
      <button type="button" class="btn btn-contorno" style="min-height:40px;padding:0 14px" data-bairro="trocar">Trocar</button></div>${aviso}</div>${regras}`;
}

function desenhar() {
  const c = calcular();
  if (!c.itens.length) {
    area.innerHTML = `<h1 class="titulo-pagina">Seu carrinho</h1>
      ${removidos ? '<p class="alerta alerta-vermelho">Alguns produtos saíram do carrinho porque ficaram sem estoque.</p>' : ''}
      <div class="vazio" style="display:flex;flex-direction:column;gap:14px;align-items:center"><strong style="font-size:20px;color:var(--text)">Seu carrinho está vazio</strong>
      Escolha os produtos da sua obra e eles aparecem aqui.<a class="btn btn-principal" href="produtos.html">Ver produtos</a><a class="btn btn-contorno" href="ofertas.html">Ver Super Ofertas</a></div>`;
    return;
  }
  const qtdTotal = c.itens.reduce((a, i) => a + i.qtd, 0);
  const pronto = !c.conflito && !c.faltas.length;
  const freteTxt = c.retirar ? 'Grátis (retirada)' : c.conflito ? '—' : c.foraDaLista ? 'A combinar'
    : c.bairro ? brl(c.frete) + (c.bairro.critico ? ' (a confirmar)' : '') : '<a href="#bairro" style="color:var(--vermelho);font-weight:800">Escolha o bairro ↑</a>';
  const envio = pronto
    ? `<a class="btn btn-whats enviar" href="${link(mensagemPedido({ nome: carrinho.nome, ...c }))}" target="_blank" rel="noopener">Enviar pedido pelo WhatsApp</a>`
    : `<button class="btn enviar" type="button" disabled>Enviar pedido pelo WhatsApp</button>
       <span class="alerta alerta-vermelho" role="status" style="text-align:center">${c.conflito ? 'Itens em oferta só podem ser retirados na loja.' : `Falta informar ${c.faltas.join(' e ')}.`}</span>`;

  area.innerHTML = `<div class="secao-titulo"><h1 class="titulo-pagina">Seu carrinho</h1><span class="nota">${qtdTotal} ${qtdTotal === 1 ? 'item' : 'itens'} · ${c.itens.length} ${c.itens.length === 1 ? 'produto' : 'produtos'}</span></div>
  ${removidos ? '<p class="alerta alerta-vermelho">Alguns produtos saíram do carrinho porque ficaram sem estoque.</p>' : ''}
  <div class="carrinho">
    <div class="carrinho-itens"><section class="bloco"><h2>Itens do pedido</h2>${c.itens.map(htmlItem).join('')}
      <div class="continuar"><a href="produtos.html" style="font-weight:700;color:var(--verde)">+ Continuar comprando</a></div></section></div>
    <aside class="resumo" aria-label="Finalizar pedido"><h2>Finalizar pedido</h2>
      <fieldset><legend>1. Como quer receber?</legend><div class="opcoes">
        <button type="button" data-modo="retirar" aria-pressed="${c.retirar}">Retirar na loja</button><button type="button" data-modo="receber" aria-pressed="${!c.retirar}">Receber em casa</button></div>
        ${c.economia > 0.009 && !c.conflito ? `<span class="alerta alerta-verde">Retirando na loja à vista você economiza ${brl(c.economia)}.</span>` : ''}</fieldset>
      ${c.conflito ? `<div class="alerta alerta-vermelho" style="display:flex;flex-direction:column;gap:10px;padding:14px;border:2px solid var(--vermelho-forte)">
        <strong>Produtos em oferta não são entregues</strong>
        <span style="font-weight:500">${esc(c.ofertas.map((i) => i.p.nome).join(', '))} ${c.ofertas.length === 1 ? 'é' : 'são'} da Super Oferta ou da Black Friday: só para retirada na loja.</span>
        <div class="opcoes"><button type="button" data-modo="retirar">Retirar tudo na loja</button><button type="button" id="tirar-ofertas">Remover itens da oferta</button></div></div>` : ''}
      ${htmlBairro(c)}
      <fieldset><legend>2. Forma de pagamento</legend><div class="opcoes">
        <button type="button" data-pag="vista" aria-pressed="${c.aVista}">À vista</button><button type="button" data-pag="prazo" aria-pressed="${!c.aVista}">${c.temBlack ? '3x sem juros' : 'A prazo'}</button></div>
        <span class="nota">O pagamento é combinado com o televendas.</span></fieldset>
      <label style="display:flex;flex-direction:column;gap:6px"><strong style="font-size:14px">3. Seu nome</strong>
        <input class="campo" id="nome" type="text" autocomplete="name" placeholder="Como podemos te chamar?" value="${esc(carrinho.nome)}"></label>
      <dl class="soma"><div><dt>Subtotal (${qtdTotal} ${qtdTotal === 1 ? 'item' : 'itens'})</dt><dd>${brl(c.subtotal)}</dd></div>
        <div><dt>Frete</dt><dd>${freteTxt}</dd></div>
        <div class="total"><dt>Total estimado</dt><dd>${brl(c.total)}${c.foraDaLista ? ' + frete' : ''}</dd></div></dl>
      ${c.temBlack ? '<span class="alerta alerta-black">Itens da Black Friday têm estoque limitado: o televendas confirma a disponibilidade e a quantidade antes de fechar o pedido.</span>' : ''}
      ${envio}
      <span class="nota" style="text-align:center">Preços sujeitos a confirmação do televendas. Estoque e valores atualizados diariamente.</span>
    </aside>
  </div>`;
  ligarBusca();
}

function ligarBusca() {
  const campo = $('#campo-bairro');
  if (!campo) return;
  const lista = $('#sugestoes');
  campo.addEventListener('input', () => {
    const achados = procurarBairro(campo.value);
    if (campo.value.trim().length < 2) { lista.hidden = true; return; }
    lista.innerHTML = achados.length
      ? achados.map((b) => `<li><button type="button" data-bairro="${b.i}"><span><strong>${esc(b.nome)}</strong>${b.critico ? '<br><span class="nota">acesso especial · confirmar</span>' : ''}</span><strong>${brl(b.valor)}</strong></button></li>`).join('')
      : '<li class="nota" style="padding:10px">Nenhum bairro com esse nome. Use “Não achei meu bairro”.</li>';
    lista.hidden = false;
  });
}

area.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.delta) definirQuantidade(b.dataset.cod, (carrinho.itens[b.dataset.cod] || 1) + Number(b.dataset.delta));
  else if (b.dataset.remover) remover(b.dataset.remover);
  else if (b.dataset.modo) escolher('modo', b.dataset.modo);
  else if (b.dataset.pag) escolher('pag', b.dataset.pag);
  else if (b.id === 'tirar-ofertas') Object.keys(carrinho.itens).forEach((c) => { if (porCodigo[c] && !podeEntregar(porCodigo[c])) remover(c); });
  else if (b.dataset.bairro) {
    const v = b.dataset.bairro;
    escolher('bairro', v === 'trocar' ? null : v === 'outra' ? 'outra' : Number(v));
    desenhar();
    if (v === 'trocar') $('#campo-bairro')?.focus();
    return;
  } else return;
  desenhar();
});

// o nome é salvo enquanto o cliente digita; a tela se atualiza quando ele sai do campo
area.addEventListener('input', (e) => { if (e.target.id === 'nome') carrinho.nome = e.target.value; });
area.addEventListener('change', (e) => { if (e.target.id === 'nome') { escolher('nome', e.target.value); desenhar(); } });

desenhar();
