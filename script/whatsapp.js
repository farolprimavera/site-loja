// whatsapp.js — número do televendas e a mensagem do pedido

import { brl, fmt } from './util.js';

export const NUMERO = '552127763391';            // (21) 2776-3391
export const OLA = 'Olá! Vim pelo site da Farol da Primavera.';

export const link = (texto = OLA) => `https://wa.me/${NUMERO}?text=${encodeURIComponent(texto)}`;

/**
 * Mensagem que chega no televendas. Cada item numa linha, nesta ordem:
 *   código | quantidade | produto | preço unitário / total
 */
export function mensagemPedido({ nome, itens, retirar, aVista, bairro, foraDaLista, frete, subtotal, total }) {
  const linhas = [
    '*NOVO PEDIDO PELO SITE*',
    `Cliente: ${nome.trim()}`,
    '',
    '*Itens* (cód. | qtd | produto | unit. / total)',
  ];
  for (const i of itens) {
    const qtd = i.p.fator ? `${fmt(i.qtdVenda)} m² (${i.qtd} cx)` : `${i.qtd} ${i.p.un || 'un'}`;
    const oferta = retirar && i.p.bf === i.unit ? ' *(BLACK FRIDAY)*' : retirar && i.p.super === i.unit ? ' *(SUPER OFERTA)*' : '';
    linhas.push(`*${i.p.cod}* | ${qtd} | ${i.p.nome} | ${brl(i.unit)} / ${brl(i.total)}${oferta}`);
  }
  linhas.push('');
  if (retirar) {
    linhas.push('Entrega: *Retirar na loja*');
  } else if (foraDaLista) {
    linhas.push('Entrega: *Receber em casa* — FORA DA LISTA, calcular frete');
  } else {
    linhas.push(`Entrega: *Receber em casa* — ${bairro.nome}${bairro.critico ? ' — PONTO CRÍTICO' : ''}`);
  }
  const black = retirar && itens.some((i) => i.p.bf === i.unit);
  linhas.push(`Pagamento: *${aVista ? 'À vista' : black ? '3x sem juros' : 'A prazo'}*`, '');
  if (black) linhas.push('_Confirmar disponibilidade dos itens da Black Friday._', '');
  linhas.push(`Subtotal: ${brl(subtotal)}`);
  linhas.push(`Frete: ${retirar ? 'retirada na loja' : foraDaLista ? 'a combinar' : brl(frete) + (bairro.critico ? ' (confirmar)' : '')}`);
  linhas.push(`*Total estimado: ${brl(total)}${foraDaLista ? ' + frete' : ''}*`);
  return linhas.join('\n');
}
