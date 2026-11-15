// Sincroniza o estado do aplicativo com o banco de dados compartilhado da página.
// O aplicativo continua trabalhando com um único objeto de estado; aqui ele é
// montado a partir das coleções do banco, e cada alteração vira gravações por documento.
import { seed, novoCandidato, novaEmpresa, novaOportunidade, DEMO_IDS } from './data.js';

export const COLS = ['candidatos', 'empresas', 'interesses', 'matches', 'mensagens', 'moderacao', 'creditos', 'pedidos', 'config'];
const toDoc = (k) => k.replace(/\|/g, '~');
const toKey = (k) => k.replace(/~/g, '|');
const limpo = (x) => JSON.parse(JSON.stringify(x ?? null));
const arr = (x) => (Array.isArray(x) ? x : []);
const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});

// ---------- Normalização (dados de outras pessoas são tratados como não confiáveis) ----------
function normCand(id, d) {
  const t = novoCandidato(id, '');
  const c = { ...t, ...obj(d), id };
  ['cidades', 'modalidades', 'turnos', 'dias', 'funcoes', 'segmentos', 'tiposVenda', 'competencias', 'desenvolver', 'prioridades',
    'idiomas', 'ferramentas', 'publicos', 'contratos', 'cargas', 'beneficios', 'experiencias'].forEach((k) => { c[k] = arr(c[k]); });
  c.obrig = { ...t.obrig, ...obj(c.obrig) };
  c.treinos = obj(c.treinos);
  c.salarioMin = Number(c.salarioMin) || 0;
  c.experiencia = Number(c.experiencia) || 0;
  ['nome', 'exib', 'cidade', 'sobre', 'cursos', 'resultados'].forEach((k) => { c[k] = typeof c[k] === 'string' ? c[k] : ''; });
  if (typeof c.foto !== 'string' || !c.foto.startsWith('data:image/')) c.foto = null;
  if (!c.exib) c.exib = c.nome ? c.nome.split(/\s+/)[0] : 'Candidato';
  return c;
}
function normOpp(empId, id, d) {
  const t = novaOportunidade(empId, id);
  const o = { ...t, ...obj(d), id, empresaId: empId };
  ['turnos', 'dias', 'essenciais', 'desejaveis', 'idiomas', 'ferramentas', 'beneficios'].forEach((k) => { o[k] = arr(o[k]); });
  if (!o.turnos.length) o.turnos = ['manha'];
  if (!o.dias.length) o.dias = ['seg'];
  o.obrig = { ...t.obrig, ...obj(o.obrig) };
  o.comissao = { ...t.comissao, ...obj(o.comissao) };
  o.salarioMin = Number(o.salarioMin) || 0;
  o.salarioMax = Math.max(Number(o.salarioMax) || 0, o.salarioMin);
  o.experienciaMin = Number(o.experienciaMin) || 0;
  return o;
}

// ---------- Montagem do estado ----------
export function montar(cache) {
  const st = { version: 5, candidatos: {}, empresas: {}, oportunidades: {}, interesses: {}, matches: {}, creditos: {}, pedidos: {}, config: { links: { essencial: '', crescimento: '', escala: '' } } };
  Object.entries(cache.creditos || {}).forEach(([id, d]) => {
    st.creditos[id] = { total: Math.max(0, Number(d.total) || 0), ilimitado: !!d.ilimitado, historico: arr(d.historico).slice(-50) };
  });
  Object.entries(cache.pedidos || {}).forEach(([id, d]) => {
    if (typeof d.empId === 'string' && typeof d.plano === 'string') st.pedidos[id] = { ...d, valor: Number(d.valor) || 0, status: String(d.status || 'aguardando') };
  });
  const lk = obj(cache.config?.pagamento?.links);
  ['essencial', 'crescimento', 'escala'].forEach((k) => { if (typeof lk[k] === 'string' && /^https:\/\//.test(lk[k])) st.config.links[k] = lk[k]; });
  const ep = obj(cache.config?.pagamento?.empresa);
  const empresa = {};
  ['razao', 'cnpj', 'endereco', 'email', 'telefone', 'whatsapp', 'instagram', 'cidade'].forEach((k) => { if (typeof ep[k] === 'string') empresa[k] = ep[k].slice(0, 160); });
  st.config.empresa = empresa;
  const mod = cache.moderacao || {};
  Object.entries(cache.candidatos || {}).forEach(([id, d]) => {
    st.candidatos[id] = { ...normCand(id, d), suspenso: mod[id]?.status === 'suspenso' };
  });
  Object.entries(cache.empresas || {}).forEach(([id, d]) => {
    const { oportunidades, ...e } = obj(d);
    st.empresas[id] = { ...novaEmpresa(id, ''), ...e, id, suspenso: mod[id]?.status === 'suspenso' };
    Object.entries(obj(oportunidades)).forEach(([oid, o]) => { st.oportunidades[oid] = normOpp(id, oid, o); });
  });
  const valido = (key) => { const [c, o] = key.split('|'); return st.candidatos[c] && st.oportunidades[o]; };
  Object.entries(cache.interesses || {}).forEach(([doc, d]) => {
    const key = toKey(doc); if (valido(key)) st.interesses[key] = { cand: !!d.cand, emp: !!d.emp };
  });
  Object.entries(cache.matches || {}).forEach(([doc, d]) => {
    const key = toKey(doc); if (!valido(key)) return;
    const [candId, oppId] = key.split('|');
    st.matches[key] = { etapa: 'conversa', entrevista: null, avaliacao: null, efetivacao: null, ...obj(d), id: key, candId, oppId, msgs: [] };
  });
  Object.entries(cache.mensagens || {}).forEach(([id, m]) => {
    const key = typeof m.match === 'string' ? m.match : '';
    if (st.matches[key]) { const { match, ...rest } = m; st.matches[key].msgs.push({ ...rest, id }); }
  });
  Object.values(st.matches).forEach((m) => m.msgs.sort((a, b) => (a.ts || 0) - (b.ts || 0)));
  return st;
}

// ---------- Gravação: compara o estado anterior com o novo e grava só o que mudou ----------
const semMeta = (x) => { if (!x) return x; const { suspenso, id, ...r } = x; return r; };
function compEmpresa(st, eid) {
  const e = st.empresas[eid]; if (!e) return null;
  const oportunidades = {};
  Object.values(st.oportunidades).filter((o) => o.empresaId === eid).forEach((o) => { const { id, empresaId, ...r } = o; oportunidades[id] = r; });
  return { ...semMeta(e), oportunidades };
}
function compMatch(m) { if (!m) return null; const { msgs, id, candId, oppId, ...r } = m; return r; }

export function diferencas(a, b) {
  const ops = [];
  const put = (path, data) => ops.push({ path, data: limpo(data) });
  const del = (path) => ops.push({ path, del: true });
  const iguais = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  new Set([...Object.keys(a.candidatos), ...Object.keys(b.candidatos)]).forEach((id) => {
    const x = semMeta(a.candidatos[id]), y = semMeta(b.candidatos[id]);
    if (!y && x) del(`candidatos/${id}`); else if (y && !iguais(x, y)) put(`candidatos/${id}`, { ...y, atualizadoEm: Date.now() });
  });
  const emps = new Set([...Object.keys(a.empresas), ...Object.keys(b.empresas)]);
  emps.forEach((id) => {
    const x = compEmpresa(a, id), y = compEmpresa(b, id);
    if (!y && x) del(`empresas/${id}`); else if (y && !iguais(x, y)) put(`empresas/${id}`, { ...y, atualizadoEm: Date.now() });
  });
  new Set([...Object.keys(a.interesses), ...Object.keys(b.interesses)]).forEach((k) => {
    const x = a.interesses[k], y = b.interesses[k];
    if (!y && x) del(`interesses/${toDoc(k)}`); else if (y && !iguais(x, y)) put(`interesses/${toDoc(k)}`, { ...y, ts: Date.now() });
  });
  new Set([...Object.keys(a.matches), ...Object.keys(b.matches)]).forEach((k) => {
    const ma = a.matches[k], mb = b.matches[k];
    const x = compMatch(ma), y = compMatch(mb);
    if (!y && x) { del(`matches/${toDoc(k)}`); ma.msgs.forEach((m) => del(`mensagens/${m.id}`)); return; }
    if (y && !iguais(x, y)) put(`matches/${toDoc(k)}`, y);
    const ant = {}; (ma?.msgs || []).forEach((m) => { ant[m.id] = m; });
    (mb?.msgs || []).forEach((m) => { if (!iguais(ant[m.id], m)) { const { id, ...r } = m; put(`mensagens/${id}`, { ...r, match: k }); } });
  });
  ['creditos', 'pedidos'].forEach((col) => {
    new Set([...Object.keys(a[col] || {}), ...Object.keys(b[col] || {})]).forEach((id) => {
      const x = a[col]?.[id], y = b[col]?.[id];
      if (!y && x) del(`${col}/${id}`); else if (y && !iguais(x, y)) put(`${col}/${id}`, y);
    });
  });
  if (!iguais(a.config, b.config) && b.config) put('config/pagamento', b.config);
  return ops;
}

// Fila: uma gravação por vez em cada documento
export function criarGravador(store, onErro) {
  const filas = {};
  return (ops) => ops.forEach((op) => {
    const ref = store.doc(op.path);
    filas[op.path] = (filas[op.path] || Promise.resolve())
      .then(() => (op.del ? ref.delete() : ref.set(op.data)))
      .catch((e) => onErro(e, op));
  });
}

