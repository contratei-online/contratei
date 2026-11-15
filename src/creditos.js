// Créditos de contratação: 1 crédito = 1 contratação efetivada.
// O saldo é calculado: créditos liberados pelo administrador menos as efetivações da empresa.
import { PLANOS } from './data.js';

export const plano = (id) => PLANOS.find((p) => p.id === id);
export function usados(db, empId) {
  return Object.values(db.matches || {}).filter((m) => m.etapa === 'efetivado' && db.oportunidades[m.oppId]?.empresaId === empId).length;
}
export function saldo(db, empId) {
  const c = db.creditos?.[empId] || {};
  if (c.ilimitado) return { ilimitado: true, total: Infinity, usados: usados(db, empId), disponivel: Infinity };
  const total = Number(c.total) || 0, u = usados(db, empId);
  return { ilimitado: false, total, usados: u, disponivel: Math.max(0, total - u) };
}
export const temCredito = (db, empId) => saldo(db, empId).disponivel >= 1;
export const saldoTxt = (s) => (s.ilimitado ? 'Contratações ilimitadas' : `${s.disponivel} ${s.disponivel === 1 ? 'crédito disponível' : 'créditos disponíveis'}`);
export const STATUS_PEDIDO = { aguardando: 'Aguardando pagamento', informado: 'Pagamento informado', confirmado: 'Confirmado', recusado: 'Recusado' };
