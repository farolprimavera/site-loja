// produtos.html e ofertas.html: categorias, busca, ordenação e grade
// Endereços: produtos.html?grupo=Básico&sub=Cimentícios&q=cimento&ordem=menor

import { $, esc, parametro } from '../util.js';
import { carregarCatalogo, buscar, contarCategorias } from '../catalogo.js';
import { cartao, ligarBotoesAdicionar } from '../componentes.js';

const pagina = document.body.dataset.pagina;
const soOfertas = pagina === 'ofertas';
const soBlack = pagina === 'blackfriday';
const POR_VEZ = 48;
const filtro = { grupo: parametro('grupo'), sub: parametro('sub'), q: parametro('q') || '', ordem: parametro('ordem') || 'nome', limite: POR_VEZ };

const { produtos, porCodigo, blackAtiva } = await carregarCatalogo();
ligarBotoesAdicionar(porCodigo);
const base = soBlack ? produtos.filter((p) => p.bf) : soOfertas ? produtos.filter((p) => p.super) : produtos;
if (soBlack && !blackAtiva) {
  document.querySelector('.catalogo').innerHTML = '<div class="vazio" style="flex:1">A Black Friday da Farol terminou. Obrigado a todos que participaram! <a href="ofertas.html">Veja as Super Ofertas →</a></div>';
  throw new Error('Black Friday encerrada');
}
const grupos = contarCategorias(base);

const precoAtual = (p) => p.bf ?? p.super ?? p.vista;
const ORDENS = {
  nome: null,
  menor: (a, b) => precoAtual(a) - precoAtual(b),
  maior: (a, b) => precoAtual(b) - precoAtual(a),
  desconto: (a, b) => (b.vista - precoAtual(b)) / b.vista - (a.vista - precoAtual(a)) / a.vista,
};

function filtrar() {
  let lista = base;
  if (filtro.grupo) lista = lista.filter((p) => p.grupo === filtro.grupo);
  if (filtro.sub) lista = lista.filter((p) => p.sub === filtro.sub);
  if (filtro.q) lista = buscar(lista, filtro.q);
  if (ORDENS[filtro.ordem]) lista = [...lista].sort(ORDENS[filtro.ordem]);
  // esgotados sempre no fim da lista
  return [...lista.filter((p) => p.status !== 'esgotado'), ...lista.filter((p) => p.status === 'esgotado')];
}

function atualizarEndereco() {
  const u = new URLSearchParams();
  if (filtro.grupo) u.set('grupo', filtro.grupo);
  if (filtro.sub) u.set('sub', filtro.sub);
  if (filtro.q) u.set('q', filtro.q);
  if (filtro.ordem !== 'nome') u.set('ordem', filtro.ordem);
  history.replaceState(null, '', `${location.pathname}${u.toString() ? '?' + u : ''}`);
}

function desenharCategorias() {
  let h = `<button class="cat" type="button" data-grupo="" aria-pressed="${!filtro.grupo}">${soBlack ? 'Toda a Black Friday' : soOfertas ? 'Todas as ofertas' : 'Todos os produtos'}<span class="qtd">${base.length}</span></button>`;
  for (const g of Object.keys(grupos).sort((a, b) => a.localeCompare(b, 'pt-BR'))) {
    h += `<button class="cat" type="button" data-grupo="${esc(g)}" aria-pressed="${filtro.grupo === g && !filtro.sub}" aria-expanded="${filtro.grupo === g}">${esc(g)}<span class="qtd">${grupos[g].total}</span></button>`;
    if (filtro.grupo === g) {
      h += '<div class="subcats">' + Object.entries(grupos[g].subs).sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
        .map(([s, n]) => `<button class="cat" type="button" data-grupo="${esc(g)}" data-sub="${esc(s)}" aria-pressed="${filtro.sub === s}">${esc(s)}<span class="qtd">${n}</span></button>`).join('') + '</div>';
    }
  }
  $('#categorias').innerHTML = h;
}

function desenhar() {
  const lista = filtrar();
  const titulo = filtro.sub || filtro.grupo || (soBlack ? 'Black Friday' : soOfertas ? 'Super Ofertas' : 'Todos os produtos');
  $('#titulo').textContent = titulo;
  document.title = `${titulo} · Farol da Primavera`;
  $('#resultado').innerHTML = `${filtro.q ? `Busca “${esc(filtro.q)}” · ` : ''}${lista.length.toLocaleString('pt-BR')} ${lista.length === 1 ? 'produto' : 'produtos'}${filtro.q ? ' · <button type="button" class="link-simples" id="limpar-busca">limpar busca</button>' : ''}`;
  $('#grade').innerHTML = lista.length
    ? lista.slice(0, filtro.limite).map(cartao).join('')
    : '<div class="vazio">Nenhum produto encontrado. Tente outra palavra ou fale com o televendas.</div>';
  const mais = $('#mais');
  mais.hidden = lista.length <= filtro.limite;
  mais.textContent = `Mostrar mais (${(lista.length - filtro.limite).toLocaleString('pt-BR')} restantes)`;
  $('#ordem').value = filtro.ordem;
  atualizarEndereco();
}

$('#categorias').addEventListener('click', (e) => {
  const b = e.target.closest('.cat');
  if (!b) return;
  const g = b.dataset.grupo || null, s = b.dataset.sub || null;
  if (!s && g && filtro.grupo === g && !filtro.sub) filtro.grupo = null; // tocar de novo fecha o grupo
  else { filtro.grupo = g; filtro.sub = s; }
  filtro.limite = POR_VEZ;
  desenharCategorias();
  desenhar();
  if (innerWidth < 860) $('#titulo').scrollIntoView({ behavior: 'smooth' });
});
$('#ordem').addEventListener('change', (e) => { filtro.ordem = e.target.value; desenhar(); });
$('#mais').addEventListener('click', () => { filtro.limite += POR_VEZ; desenhar(); });
document.addEventListener('click', (e) => {
  if (e.target.id !== 'limpar-busca') return;
  filtro.q = ''; $('#busca').value = ''; desenhar();
});

// a busca do cabeçalho filtra na hora, sem recarregar a página
let espera;
$('#busca').addEventListener('input', (e) => {
  clearTimeout(espera);
  espera = setTimeout(() => { filtro.q = e.target.value.trim(); filtro.limite = POR_VEZ; desenhar(); }, 250);
});
$('form.busca').addEventListener('submit', (e) => { e.preventDefault(); filtro.q = $('#busca').value.trim(); filtro.grupo = null; filtro.sub = null; desenharCategorias(); desenhar(); });

desenharCategorias();
desenhar();
