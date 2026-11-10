// util.js — pequenas funções usadas em todo o site

export const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const fmt = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// tira acentos e deixa minúsculo, para a busca achar "ceramica" e "cerâmica"
export const normalizar = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// protege textos que vêm da planilha antes de colocar no HTML
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const $ = (seletor, raiz = document) => raiz.querySelector(seletor);

// localStorage pode falhar (aba anônima, navegador bloqueado): nunca quebra o site
export function salvar(chave, valor) {
  try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* sem armazenamento */ }
}
export function ler(chave, padrao) {
  try { const v = localStorage.getItem(chave); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; }
}

export const parametro = (nome) => new URLSearchParams(location.search).get(nome);
