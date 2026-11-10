// frete.js — bairros de Duque de Caxias e valor do frete (dados/fretes.json)
// Cada linha: [nome, valor] ou [nome, valor, "c"]  ("c" = ponto crítico, confirmar com o televendas)

import { normalizar } from './util.js';

let lista = null;

export async function carregarFretes() {
  if (lista) return lista;
  const resp = await fetch('dados/fretes.json', { cache: 'no-cache' });
  const dados = await resp.json();
  lista = dados.map(([nome, valor, marca], i) => ({ i, nome, valor, critico: marca === 'c' }));
  return lista;
}

/** Até 8 bairros que combinam com o que o cliente digitou (começo do nome primeiro). */
export function procurarBairro(texto) {
  const q = normalizar(texto.trim());
  if (q.length < 2 || !lista) return [];
  return lista
    .filter((b) => normalizar(b.nome).includes(q))
    .sort((a, b) => (normalizar(b.nome).startsWith(q) - normalizar(a.nome).startsWith(q)) || a.nome.localeCompare(b.nome, 'pt-BR'))
    .slice(0, 8);
}

export const bairroPorIndice = (i) => (lista && typeof i === 'number' ? lista[i] : null);
