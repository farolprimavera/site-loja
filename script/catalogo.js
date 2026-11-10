// catalogo.js — carrega os produtos gerados pelo ferramentas/atualizar_site.py

import { normalizar } from './util.js';

let cache = null;

/** Lista de todos os produtos do site (dados/catalogo.json). */
export async function carregarCatalogo() {
  if (cache) return cache;
  const resp = await fetch('dados/catalogo.json', { cache: 'no-cache' });
  if (!resp.ok) throw new Error('Não foi possível carregar os produtos.');
  const dados = await resp.json();
  dados.produtos.forEach((p) => { p._busca = normalizar(`${p.nome} ${p.cod} ${p.ean || ''} ${p.marca || ''}`); });
  // Black Friday: depois da data de fim o preço especial some sozinho, mesmo sem atualizar o catálogo
  const fimBF = dados.blackfriday ? new Date(dados.blackfriday.fim) : null;
  dados.blackAtiva = !!fimBF && Date.now() <= fimBF.getTime() && dados.produtos.some((p) => p.bf);
  if (!dados.blackAtiva) dados.produtos.forEach((p) => { delete p.bf; });
  dados.porCodigo = Object.fromEntries(dados.produtos.map((p) => [p.cod, p]));
  cache = dados;
  return dados;
}

/** Descrição, ficha técnica e galeria de um produto (dados/detalhes/NN.json). */
export async function carregarDetalhe(cod) {
  const pedaco = cod.slice(-2).padStart(2, '0');
  try {
    const resp = await fetch(`dados/detalhes/${pedaco}.json`, { cache: 'no-cache' });
    const dados = await resp.json();
    return dados[cod] || { descricao: [], ficha: {} };
  } catch (e) {
    return { descricao: [], ficha: {} };
  }
}

/** Busca por nome, código ou código de barras: todas as palavras precisam aparecer. */
export function buscar(produtos, texto) {
  const palavras = normalizar(texto).split(/\s+/).filter(Boolean);
  if (!palavras.length) return produtos;
  return produtos.filter((p) => palavras.every((w) => p._busca.includes(w)));
}

/** Grupos e subgrupos com a quantidade de produtos de cada um. */
export function contarCategorias(produtos) {
  const grupos = {};
  for (const p of produtos) {
    grupos[p.grupo] ??= { total: 0, subs: {} };
    grupos[p.grupo].total++;
    grupos[p.grupo].subs[p.sub] = (grupos[p.grupo].subs[p.sub] || 0) + 1;
  }
  return grupos;
}

/** Caminho das fotos: a grande (800 px) e a miniatura (300 px). */
export const fotoGrande = (nome) => `imagens/produtos/${nome}.webp`;
export const fotoPequena = (nome) => `imagens/produtos/${nome}-p.webp`;
