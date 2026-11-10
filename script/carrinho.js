// carrinho.js — o carrinho fica salvo no navegador do cliente (vale para todas as páginas)

import { salvar, ler } from './util.js';

const CHAVE = 'farol-carrinho';
const PADRAO = { itens: {}, modo: 'retirar', pag: 'vista', bairro: null, nome: '' };

export const carrinho = { ...PADRAO, ...ler(CHAVE, {}) };

function gravar() {
  salvar(CHAVE, carrinho);
  document.dispatchEvent(new CustomEvent('carrinho:mudou'));
}

export const totalItens = () => Object.values(carrinho.itens).reduce((a, b) => a + b, 0);

export function adicionar(cod, qtd = 1) {
  carrinho.itens[cod] = (carrinho.itens[cod] || 0) + qtd;
  gravar();
}

export function definirQuantidade(cod, qtd) {
  carrinho.itens[cod] = Math.max(1, qtd);
  gravar();
}

export function remover(cod) {
  delete carrinho.itens[cod];
  gravar();
}

export function escolher(campo, valor) {
  carrinho[campo] = valor;
  gravar();
}

/** Tira do carrinho códigos que saíram do site (sem estoque) e devolve quantos tirou. */
export function limparInexistentes(porCodigo) {
  // sai do carrinho o que saiu do site ou ficou esgotado
  const fora = Object.keys(carrinho.itens).filter((c) => !porCodigo[c] || porCodigo[c].status === 'esgotado');
  fora.forEach((c) => delete carrinho.itens[c]);
  if (fora.length) gravar();
  return fora.length;
}
