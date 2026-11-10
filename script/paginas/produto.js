// produto.html?cod=6579 — página de um produto

import { $, brl, fmt, esc, parametro } from '../util.js';
import { carregarCatalogo, carregarDetalhe, fotoGrande, fotoPequena } from '../catalogo.js';
import { cartao, icone, imgProduto, semFoto, abrirAdicionado, ligarBotoesAdicionar, textoQuantidade, esgotado, consultaEsgotado } from '../componentes.js';
import { adicionar } from '../carrinho.js';
import { caixasPara, precoDestaque, descontoPrazo } from '../precos.js';
import { link } from '../whatsapp.js';

const cod = parametro('cod') || '';
const { produtos, porCodigo, atualizado } = await carregarCatalogo();
ligarBotoesAdicionar(porCodigo);
const p = porCodigo[cod];
const area = $('#produto');

if (!p) {
  document.title = 'Produto não encontrado · Farol da Primavera';
  area.innerHTML = `<div class="vazio" style="display:flex;flex-direction:column;gap:14px;align-items:center">
    <strong style="font-size:20px;color:var(--text)">Produto ${esc(cod)} não encontrado</strong>
    Ele pode ter saído do site por falta de estoque. Fale com o televendas ou veja produtos parecidos.
    <a class="btn btn-principal" href="produtos.html">Ver produtos</a></div>`;
} else {
  const d = await carregarDetalhe(cod);
  const f = d.ficha || {};
  const fotos = d.galeria || (p.foto ? [p.foto] : []);
  const un = p.un ? `/${p.un}` : '';
  const dataPreco = new Date(atualizado).toLocaleDateString('pt-BR');
  document.title = `${p.nome} · Farol da Primavera`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', `${p.nome} na Farol da Primavera, Jardim Primavera, Duque de Caxias. ${brl(precoDestaque(p))} à vista. Peça pelo WhatsApp.`);

  const desc = descontoPrazo(p);
  const de = desc ? `<span class="preco-de-grande">De <s>${brl(p.prazo)}</s> <span class="pilula-desconto">-${desc}%</span></span>` : '';
  const preco = p.bf
    ? `<div class="caixa-preco black">${de}<span class="grande">${brl(p.bf)}<span class="nota">${un}</span></span>
        <strong>Black Friday · à vista ou em 3x sem juros, retirando na loja</strong>
        <span class="nota">Válido até 30/11 ou enquanto durar o estoque.</span>
        <a class="link-black" href="${link(`Olá! Quero consultar a disponibilidade do produto ${p.cod} — ${p.nome} da Black Friday.`)}" target="_blank" rel="noopener">Consulte a disponibilidade com o televendas →</a></div>`
    : p.super
    ? `<div class="caixa-preco oferta">${de}<span class="grande">${brl(p.super)}<span class="nota">${un}</span></span>
        <strong>Super Oferta · à vista e só retirando na loja</strong>
        </div>`
    : `<div class="caixa-preco"><span class="grande">${brl(p.vista)}<span class="nota"> ${un} à vista</span></span>
        <span>ou <strong>${brl(p.prazo)}</strong>${un} a prazo</span>
        ${p.vistaRet ? `<span class="alerta alerta-verde" style="align-self:flex-start">Retirando na loja: ${brl(p.vistaRet)}${un} à vista</span>` : ''}
        <span class="nota">Preço de ${dataPreco}, sujeito a confirmação do televendas.</span></div>`;

  const caixa = p.fator
    ? `<div class="dica">Vendido em <strong>caixa fechada com ${fmt(p.fator)} m²</strong>${f.pecas_caixa ? ` (${f.pecas_caixa} peças)` : ''}. Uma caixa sai por <strong>${brl(precoDestaque(p) * p.fator)}</strong>.</div>
       <label class="calc-m2"><strong>Quantos m² você precisa?</strong>
        <input class="campo" id="m2" type="text" inputmode="decimal" placeholder="Ex.: 10">
        <span class="nota" id="m2-texto">Arredondamos para caixas fechadas. Dica: some de 10% a 15% para recortes e quebras.</span></label>`
    : '';

  const ficha = [
    ['Código do produto', p.cod], ['Código de barras (EAN)', p.ean], ['Marca', p.marca], ['Categoria', `${p.grupo} › ${p.sub}`],
    ['Vendido por', p.fator ? 'caixa' : p.un], ['Peso', f.peso_kg ? `${f.peso_kg.toLocaleString('pt-BR')} kg` : null],
    ['m² por caixa', p.fator ? `${fmt(p.fator)} m²` : null], ['Peças por caixa', f.pecas_caixa], ['PEI', f.pei],
    ['Junta', f.junta_mm ? `${f.junta_mm} mm` : null], ['Qualidade', f.qualidade], ['Lote', f.lote], ['Localização', f.local],
  ].filter((x) => x[1]);

  // linhas "Rótulo: valor" ou "Rótulo - valor" ficam com o rótulo em negrito
  const linha = (t) => {
    const m = t.match(/^([A-Za-zÀ-ú][A-Za-zÀ-ú ]{1,24}?) - (.+)$/) || t.match(/^([A-Za-zÀ-ú][A-Za-zÀ-ú ]{1,24}): (.+)$/);
    return m ? `<li><strong>${esc(m[1])}:</strong> ${esc(m[2])}</li>` : `<li>${esc(t)}</li>`;
  };
  const descricao = (d.descricao || []).filter((t) => !p.fator || !/^EXTRA\s*-/i.test(t));
  const parecidos = produtos.filter((x) => x.grupo === p.grupo && x.sub === p.sub && x.cod !== p.cod).slice(0, 4);
  const duvida = `Olá! Vim pelo site e tenho uma dúvida sobre o produto ${p.cod} — ${p.nome}.`;

  area.innerHTML = `
    <nav class="trilha" aria-label="Você está em"><a href="index.html">Início</a><span aria-hidden="true">›</span>
      <a href="produtos.html?grupo=${encodeURIComponent(p.grupo)}">${esc(p.grupo)}</a><span aria-hidden="true">›</span>
      <a href="produtos.html?grupo=${encodeURIComponent(p.grupo)}&sub=${encodeURIComponent(p.sub)}">${esc(p.sub)}</a></nav>
    <div class="produto">
      <div class="produto-fotos">
        <div class="foto" id="foto-principal">${fotos.length ? imgProduto(fotoGrande(fotos[0]), p.nome, false) : semFoto()}
          ${p.bf ? '<span class="selo selo-black">BLACK FRIDAY</span>' : p.super ? '<span class="selo selo-oferta">SUPER OFERTA</span>' : ''}</div>
        ${fotos.length > 1 ? `<div class="miniaturas">${fotos.map((n, i) => `<button type="button" data-foto="${n}" aria-pressed="${i === 0}" aria-label="Foto ${i + 1}"><img src="${fotoPequena(n)}" alt=""></button>`).join('')}</div>` : ''}
      </div>
      <div class="produto-info">
        <div style="display:flex;flex-direction:column;gap:8px"><span class="marca">${esc(p.marca || '')}</span><h1>${esc(p.nome)}</h1>
          <div class="etiquetas"><span class="etiqueta"><span>Cód.</span> <strong>${p.cod}</strong></span>${p.ean ? `<span class="etiqueta"><span>EAN</span> <strong>${p.ean}</strong></span>` : ''}${f.lote ? `<span class="etiqueta"><span>Lote</span> <strong>${esc(f.lote)}</strong></span>` : ''}${esgotado(p) ? '<span class="etiqueta esgotado">Esgotado</span>' : '<span class="etiqueta ok">Disponível</span>'}</div></div>
        ${preco}${caixa}
        ${esgotado(p) ? `<div class="aviso-esgotado" role="status"><strong>Produto esgotado no momento</strong>
          <span class="nota">Ele ainda não pode ser pedido pelo site. Fale com o televendas para saber quando chega ou ver uma opção parecida.</span>
          <a class="btn btn-whats" href="${consultaEsgotado(p)}" target="_blank" rel="noopener">Consultar no WhatsApp</a></div>` : `<div class="compra">
          <div class="quantidade" role="group" aria-label="Quantidade"><button type="button" data-delta="-1" aria-label="Diminuir">−</button><output id="qtd">${p.fator ? '1 cx' : '1'}</output><button type="button" data-delta="1" aria-label="Aumentar">+</button></div>
          <button class="btn ${p.bf ? 'btn-black' : p.super ? 'btn-oferta' : 'btn-principal'}" type="button" id="comprar">Adicionar ao carrinho</button>
        </div>`}
        ${p.grupo === 'Pintura' ? `<a class="atalho" href="https://farolprimavera.github.io/site-tintas/" target="_blank" rel="noopener"><span class="bola" style="background:var(--amarelo);color:#17201b">${icone('Pintura', 22)}</span><span><strong>Veja a cor antes de comprar</strong><br><span class="nota">Abrir o simulador de tintas</span></span></a>` : ''}
        <a class="atalho whats" href="${link(duvida)}" target="_blank" rel="noopener"><span class="bola" style="background:var(--whats);color:#fff">${icone('whats', 22)}</span><span><strong>Dúvida sobre este produto?</strong><br><span class="nota">Fale com o televendas pelo WhatsApp</span></span></a>
      </div>
    </div>
    <div class="produto-detalhes">
      <section class="bloco descricao"><h2>Descrição</h2>${descricao.length ? `<ul>${descricao.map(linha).join('')}</ul>` : '<p class="nota" style="margin:0">Este produto ainda não tem descrição. Fale com o televendas para tirar dúvidas.</p>'}</section>
      <section class="bloco ficha"><h2>Ficha técnica</h2><dl>${ficha.map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl></section>
    </div>
    ${parecidos.length ? `<section class="secao"><div class="secao-titulo"><h2>Mais em ${esc(p.sub)}</h2><a href="produtos.html?grupo=${encodeURIComponent(p.grupo)}&sub=${encodeURIComponent(p.sub)}">Ver todos →</a></div><div class="grade">${parecidos.map(cartao).join('')}</div></section>` : ''}`;

  // quantidade e calculadora de m²
  let qtd = 1;
  const mostrarQtd = () => {
    if ($('#qtd')) $('#qtd').textContent = p.fator ? `${qtd} cx` : qtd;
    if (p.fator) $('#m2-texto').innerHTML = `<strong>${textoQuantidade(p, qtd)}</strong>. Dica: some de 10% a 15% para recortes e quebras.`;
  };
  area.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.delta) { qtd = Math.max(1, qtd + Number(b.dataset.delta)); mostrarQtd(); }
    if (b.id === 'comprar') { adicionar(p.cod, qtd); abrirAdicionado(p); }
    if (b.dataset.foto) {
      $('#foto-principal img')?.setAttribute('src', fotoGrande(b.dataset.foto));
      area.querySelectorAll('[data-foto]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    }
  });
  $('#m2')?.addEventListener('input', (e) => {
    const m2 = parseFloat(e.target.value.replace(',', '.'));
    if (m2 > 0) { qtd = caixasPara(p, m2); mostrarQtd(); }
  });
}
