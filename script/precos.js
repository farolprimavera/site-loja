// precos.js — TODAS as regras de preço do site ficam aqui
//
//  Receber em casa  + à vista  -> TAB A VISTA
//  Receber em casa  + a prazo  -> TAB A PRAZO
//  Retirar na loja  + à vista  -> Super Oferta (se tiver), senão A VISTA - RET (se tiver), senão A VISTA
//  Retirar na loja  + a prazo  -> A PRAZO - RET (se tiver), senão A PRAZO
//
//  Super Oferta: só à vista e só retirando na loja. Não entregamos itens da Super Oferta.
//  Black Friday: retirando na loja, à vista ou em 3x sem juros (a prazo). Também não entregamos.
//  Retirando, vale sempre o MENOR preço entre os que se aplicam.

/**
 * Preço de UMA unidade de venda (un, saco, m²...) conforme as escolhas do carrinho.
 * @param {object} p        produto do catálogo
 * @param {boolean} retirar true = retirar na loja, false = receber em casa
 * @param {boolean} aVista  true = à vista, false = a prazo
 */
export function precoUnitario(p, retirar, aVista) {
  if (!retirar) return aVista ? p.vista : p.prazo;
  const opcoes = [aVista ? (p.vistaRet ?? p.vista) : (p.prazoRet ?? p.prazo)];
  if (p.bf) opcoes.push(p.bf);
  if (p.super && aVista) opcoes.push(p.super);
  return Math.min(...opcoes);
}

/** Preço de destaque na vitrine: Black Friday > Super Oferta > à vista. */
export const precoDestaque = (p) => p.bf ?? p.super ?? p.vista;

/** Menor preço possível do produto (usado para mostrar quanto se economiza retirando). */
export const melhorPreco = (p) => Math.min(p.vista, p.vistaRet ?? Infinity, p.super ?? Infinity, p.bf ?? Infinity);

/** Pisos são vendidos em caixa fechada: a quantidade é em caixas, o preço é por m². */
export const quantidadeVenda = (p, caixas) => (p.fator ? Math.round(caixas * p.fator * 100) / 100 : caixas);

/** Quantas caixas para cobrir X m² (sempre arredonda para cima). */
export const caixasPara = (p, m2) => Math.max(1, Math.ceil(m2 / p.fator - 1e-9));

/**
 * Todo produto pode ser entregue. A Super Oferta e a Black Friday só valem retirando na loja;
 * na entrega o produto sai pelo preço normal (precoUnitario já cuida disso).
 */
export const podeEntregar = () => true;

/** Desconto da oferta (Black Friday ou Super Oferta) em cima do preço a prazo, em % inteiro. 0 = sem oferta. */
export function descontoPrazo(p) {
  const promo = p.bf ?? p.super;
  if (!promo || !p.prazo || promo >= p.prazo) return 0;
  return Math.round((1 - promo / p.prazo) * 100);
}

/** Nome da oferta do produto, para avisos. */
export const nomeOferta = (p) => (p.bf ? 'Black Friday' : p.super ? 'Super Oferta' : null);
