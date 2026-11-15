import { TL, DL, TIPOS, TIPO_FRASE, TIPO_REL, MODAL_F, FUNC_GRUPOS, COMPS, expTxt, nivelTreino, TRILHAS,
  escIdx, escLabel, inicioIdx, inicioLabel, CONTRATOS, CARGAS, PUBLICOS, BENEFICIOS, idade } from './data.js';

export const brl = (v, dec) => {
  const d = dec ?? (Math.round(v) === v ? 0 : 2);
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
};
export const lista = (a) => (!a.length ? '' : a.length === 1 ? a[0] : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1]);
const ORD = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
export const diasTxt = (d) => {
  const extra = d.filter((x) => !ORD.includes(x));
  if (extra.length) return lista([...ORD.filter((x) => d.includes(x)), ...extra].map((x) => DL[x] || x));
  const s = ORD.filter((x) => d.includes(x)).join(',');
  if (s === 'seg,ter,qua,qui,sex') return 'seg a sex';
  if (s === 'seg,ter,qua,qui,sex,sab') return 'seg a sáb';
  if (s === 'ter,qua,qui,sex,sab,dom') return 'ter a dom';
  if (d.length === 7) return 'todos os dias';
  return lista(ORD.filter((x) => d.includes(x)).map((x) => DL[x]));
};
const TORD = ['manha', 'tarde', 'noite'];
export const turnosTxt = (t) => lista([...TORD.filter((x) => t.includes(x)), ...t.filter((x) => !TORD.includes(x))].map((x) => TL[x] || x));
export const faixa = (o) => `${brl(o.salarioMin)} a ${brl(o.salarioMax)}`;
const lc = (s) => s.charAt(0).toLowerCase() + s.slice(1);

const ORDEM_TRILHA = ['escuta', 'atendimento', 'consultiva', 'negociacao', 'fechamento', 'digital'];

// Motivos mais importantes para o cartão, nesta ordem
export function topMotivos(list, n = 5) {
  const pri = ['treino', 'tipo', 'turno', 'sal', 'funcao', 'local', 'inic', 'comp', 'ferr', 'inicio', 'com', 'publico', 'contrato', 'seg', 'esc', 'dias', 'modal', 'carga', 'mobil', 'benef', 'idioma'];
  const ok = list.filter((x) => x.kind === 'ok').sort((a, b) => pri.indexOf(a.k) - pri.indexOf(b.k));
  const parc = list.filter((x) => x.kind === 'parcial');
  const head = ok.slice(0, Math.max(3, n - parc.length));
  return [...head, ...parc].slice(0, n);
}

export const PARTES = {
  A: { label: 'Função, segmento, tipo de venda e público', max: 30 },
  B: { label: 'Remuneração, comissão, contrato e benefícios', max: 25 },
  C: { label: 'Rotina, modalidade, local, início e mobilidade', max: 20 },
  D: { label: 'Competências, ferramentas, escolaridade e idiomas', max: 15 },
  E: { label: 'Desempenho em treinamentos', max: 10 },
};

/**
 * Avalia a compatibilidade entre um candidato e uma oportunidade privada.
 * Retorna elegibilidade (requisitos obrigatórios dos dois lados), pontuação 0–100
 * e motivos em linguagem simples, escritos para cada lado.
 * Usa apenas informações profissionais. O pagamento nunca entra no cálculo.
 */
export function avaliar(c, o) {
  const nome = c.exib;
  const bloqueios = [];
  const rc = []; // motivos vistos pelo candidato
  const re = []; // motivos vistos pela empresa
  let curK = '';
  const add = (kind, cat, tc, te) => {
    if (tc) rc.push({ kind, cat, k: curK, t: tc });
    if (te) re.push({ kind, cat, k: curK, t: te });
  };
  const K = (k) => { curK = k; };
  const B = (lado, texto) => bloqueios.push({ lado, texto });

  const turnosFalt = o.turnos.filter((t) => !c.turnos.includes(t));
  const diasFalt = o.dias.filter((d) => !c.dias.includes(d));
  const remoto = o.modalidade === 'remoto';
  const cidadeOk = remoto || c.cidades.includes(o.cidade);
  const modalOk = c.modalidades.includes(o.modalidade);
  const salOk = o.salarioMax >= c.salarioMin;
  const tipoOk = c.tiposVenda.includes(o.tipoVenda);
  const segOk = c.segmentos.includes(o.segmento);
  const expOk = o.aceitaIniciante || c.experiencia >= o.experienciaMin;

  // 1. Requisitos obrigatórios dos dois lados
  if (turnosFalt.length && (c.obrig.turno || o.obrig.turno))
    B(c.obrig.turno ? 'cand' : 'emp', `Turno: a oportunidade precisa da ${turnosTxt(turnosFalt)}, e a disponibilidade${c.obrig.turno ? ' obrigatória' : ''} do candidato é ${turnosTxt(c.turnos) || 'nenhuma'}.`);
  if (diasFalt.length && (c.obrig.dias || o.obrig.dias))
    B(c.obrig.dias ? 'cand' : 'emp', `Dias: a oportunidade precisa de ${lista(diasFalt.map((d) => DL[d]))}, fora da disponibilidade do candidato.`);
  if (!salOk && c.obrig.salario)
    B('cand', `Salário: o teto da faixa (${brl(o.salarioMax)}) fica abaixo do mínimo obrigatório do candidato (${brl(c.salarioMin)}).`);
  if (!modalOk && c.obrig.modalidade)
    B('cand', `Modalidade: a oportunidade é ${MODAL_F[o.modalidade]}, e o candidato aceita apenas ${lista(c.modalidades.map((m) => MODAL_F[m])) || 'nenhuma'}.`);
  if (!cidadeOk && (c.obrig.local || o.obrig.local))
    B(c.obrig.local ? 'cand' : 'emp', `Local: o trabalho é em ${o.cidade}, fora das cidades em que o candidato pode atuar.`);
  if (!tipoOk && c.obrig.tipoVenda)
    B('cand', `Tipo de venda: ${lc(TIPO_FRASE[o.tipoVenda])} não está entre os tipos obrigatórios do candidato.`);
  if (!segOk && c.obrig.segmento)
    B('cand', `Segmento: ${o.segmento} está fora dos segmentos obrigatórios do candidato.`);
  // Requisitos ampliados
  const arr = (x) => (Array.isArray(x) ? x : []);
  const contratoOk = !o.contrato || arr(c.contratos).includes(o.contrato);
  const cargaOk = !o.carga || arr(c.cargas).includes(o.carga);
  const escOk = !o.escolaridadeMin || escIdx(c.escolaridade) >= escIdx(o.escolaridadeMin);
  const cnhOk = !o.cnhReq || (o.cnhReq === 'A' ? ['A', 'AB'].includes(c.cnh) : ['B', 'AB', 'C+'].includes(c.cnh));
  const veicOk = !o.veiculoReq || (o.veiculoReq === 'qualquer' ? ['moto', 'carro'].includes(c.veiculo) : c.veiculo === o.veiculoReq);
  const viagemOk = !(o.viagens === 'frequente' && c.viagens === 'nao') && !(o.viagens === 'eventual' && c.viagens === 'nao');
  const ci = inicioIdx(c.inicio), oi = inicioIdx(o.inicio);
  const inicioOk = ci < 0 || oi < 0 || ci <= oi;
  const anos = idade(c.nascimento);
  const menor = anos !== null ? anos < 18 : c.maior18 === false;
  if (menor && (o.idadeMinima || '18') === '18')
    B('emp', 'Requisito legal: esta função exige maioridade (18 anos). A idade é usada só para requisitos legais e não entra na pontuação.');
  if (anos !== null && anos < 14)
    B('emp', 'Requisito legal: idade mínima para trabalhar não atingida.');
  if (!contratoOk && c.obrig.contrato)
    B('cand', `Contrato: a oportunidade é ${CONTRATOS[o.contrato] || o.contrato}, fora dos tipos de contrato obrigatórios do candidato.`);
  if (!cargaOk && c.obrig.carga)
    B('cand', `Carga horária: a oportunidade é ${(CARGAS[o.carga] || o.carga).toLowerCase()}, e o candidato marcou outra como obrigatória.`);
  if (!escOk && o.obrig.escolaridade)
    B('emp', `Escolaridade: a oportunidade exige ${escLabel(o.escolaridadeMin).toLowerCase()}.`);
  if ((!cnhOk || !veicOk) && o.obrig.mobilidade)
    B('emp', `Mobilidade: a oportunidade exige ${[o.cnhReq && `CNH ${o.cnhReq}`, o.veiculoReq && 'veículo próprio'].filter(Boolean).join(' e ')}.`);
  if (o.viagens === 'frequente' && c.viagens === 'nao')
    B('cand', 'Viagens: a oportunidade tem viagens frequentes, e o candidato informou que não pode viajar.');
  if (!inicioOk && o.obrig.inicio)
    B('emp', `Início: a empresa precisa de alguém ${inicioLabel(o.inicio).toLowerCase()}, e o candidato pode começar ${inicioLabel(c.inicio).toLowerCase()}.`);
  if (!expOk)
    B('emp', `Experiência: a oportunidade exige ${expTxt(o.experienciaMin)} e não está aberta a iniciantes.`);

  // 2. Pontuação
  // A — função (10), segmento (10), tipo de venda (10)
  const funcRel = FUNC_GRUPOS.some((g) => g.includes(o.funcao) && c.funcoes.some((f) => g.includes(f)));
  K('funcao');
  const pf = c.funcoes.includes(o.funcao) ? 9 : funcRel ? 4.5 : 0;
  if (pf === 9) add('ok', 'A', `Você quer atuar como ${lc(o.funcao)}, a função desta oportunidade.`, `${nome} quer atuar como ${lc(o.funcao)}.`);
  else if (pf > 0) add('parcial', 'A', `A função (${lc(o.funcao)}) é próxima das que você escolheu, mas não está na sua lista.`, `A função é próxima das escolhidas por ${nome} (${lc(lista(c.funcoes))}).`);
  else add('nao', 'A', `A função ${lc(o.funcao)} não está entre as que você procura.`, `${nome} não indicou a função ${lc(o.funcao)}.`);

  K('seg');
  const psg = segOk ? 8 : 0;
  if (segOk) add('ok', 'A', `O segmento (${o.segmento}) está entre os que você escolheu.`, `${nome} quer atuar em ${o.segmento}.`);
  else add('nao', 'A', `O segmento ${o.segmento} não está na sua lista.`, `${o.segmento} não está entre os segmentos de ${nome}.`);

  K('tipo');
  const tipoRel = TIPO_REL.some(([a, b]) => (a === o.tipoVenda && c.tiposVenda.includes(b)) || (b === o.tipoVenda && c.tiposVenda.includes(a)));
  const ptv = tipoOk ? 9 : tipoRel ? 4.5 : 0;
  const prefTipos = lista(c.tiposVenda.map((t) => TIPO_FRASE[t]));
  if (tipoOk) add('ok', 'A', `Você procura ${TIPO_FRASE[o.tipoVenda]}, e esta oportunidade é de ${TIPO_FRASE[o.tipoVenda]}.`, `${nome} prefere ${prefTipos}.`);
  else if (tipoRel) add('parcial', 'A', `É ${TIPO_FRASE[o.tipoVenda]}; você preferiu ${prefTipos}. Preferência parcialmente atendida.`, `${nome} prefere ${prefTipos}, próximo de ${TIPO_FRASE[o.tipoVenda]}.`);
  else add('nao', 'A', `É ${TIPO_FRASE[o.tipoVenda]}, fora dos tipos que você prefere (${prefTipos}).`, `${nome} prefere ${prefTipos}.`);

  K('publico');
  let ppu = 2;
  if (o.publico) {
    if (!arr(c.publicos).length) ppu = 2;
    else if (arr(c.publicos).includes(o.publico)) { ppu = 4; add('ok', 'A', `Você já vende ou quer vender para ${(PUBLICOS[o.publico] || o.publico).toLowerCase()}, o público desta vaga.`, `Tem afinidade com o público da vaga (${(PUBLICOS[o.publico] || o.publico).toLowerCase()}).`); }
    else { ppu = 0; add('nao', 'A', `O público desta vaga (${(PUBLICOS[o.publico] || o.publico).toLowerCase()}) não está entre os que você marcou.`, `${nome} não marcou o público ${(PUBLICOS[o.publico] || o.publico).toLowerCase()}.`); }
  }

  // B — salário fixo (15), comissão (5), contrato (3), benefícios (2)
  K('sal');
  let ps;
  if (o.salarioMin >= c.salarioMin) {
    ps = 15;
    add('ok', 'B', `O salário fixo (${faixa(o)}) está dentro da sua expectativa (a partir de ${brl(c.salarioMin)}).`, `A faixa salarial atende à pretensão de ${nome} (a partir de ${brl(c.salarioMin)}).`);
  } else if (o.salarioMax >= c.salarioMin) {
    ps = 11;
    add('parcial', 'B', `Sua pretensão (${brl(c.salarioMin)}) cabe na faixa (${faixa(o)}), mas fica acima do piso. Preferência parcialmente atendida.`, `A pretensão de ${nome} (${brl(c.salarioMin)}) cabe na faixa, acima do piso.`);
  } else {
    const gap = c.salarioMin - o.salarioMax;
    ps = Math.max(0, Math.round(6 * (1 - gap / (0.25 * c.salarioMin))));
    add(ps > 0 ? 'parcial' : 'nao', 'B', `O teto da faixa (${brl(o.salarioMax)}) fica ${brl(gap)} abaixo da sua pretensão.`, `A pretensão de ${nome} (${brl(c.salarioMin)}) fica acima do teto da faixa.`);
  }
  K('com');
  let pc;
  const tem = o.comissao.tem;
  if (c.comissao === 'sim') {
    pc = tem ? 5 : 1;
    if (tem) add('ok', 'B', `Tem comissão (${o.comissao.desc}), como você queria.`, `${nome} tem interesse em ganhar comissão.`);
    else add('parcial', 'B', 'Você tem interesse em comissão, mas esta oportunidade paga apenas salário fixo.', `${nome} gostaria de ganhar comissão; a vaga paga só fixo.`);
  } else if (c.comissao === 'indiferente') {
    pc = 4;
    if (tem) add('ok', 'B', `Oferece comissão (${o.comissao.desc}).`, null);
  } else {
    pc = tem ? 3 : 5;
    if (tem) add('parcial', 'B', 'Você prefere só salário fixo; aqui parte da renda vem de comissão.', `${nome} prefere remuneração só fixa.`);
    else add('ok', 'B', 'Remuneração só fixa, como você prefere.', null);
  }

  K('contrato');
  const pct = contratoOk ? 3 : 0;
  if (o.contrato) {
    if (contratoOk) add('ok', 'B', `Contrato ${CONTRATOS[o.contrato] || o.contrato}, que você aceita.`, `Aceita contrato ${CONTRATOS[o.contrato] || o.contrato}.`);
    else add('nao', 'B', `O contrato é ${CONTRATOS[o.contrato] || o.contrato}, que você não marcou.`, `${nome} não marcou contrato ${CONTRATOS[o.contrato] || o.contrato}.`);
  }
  K('benef');
  const desej = arr(c.beneficios), ofer = arr(o.beneficios);
  const atend = desej.filter((b) => ofer.includes(b));
  const pbe = desej.length ? 2 * (atend.length / desej.length) : 2;
  if (desej.length && atend.length) add(atend.length === desej.length ? 'ok' : 'parcial', 'B', `Benefícios que você procura e esta vaga oferece: ${lista(atend.map((b) => (BENEFICIOS[b] || b).toLowerCase()))}.`, null);

  // C — turnos (6), dias (3), modalidade (3), local (3), carga (2), início (2), mobilidade (1)
  K('turno');
  const covT = (o.turnos.length - turnosFalt.length) / o.turnos.length;
  const pt = 6 * covT;
  if (covT === 1) add('ok', 'C', `O turno (${turnosTxt(o.turnos)}) combina com sua disponibilidade.`, `Disponível no turno necessário (${turnosTxt(o.turnos)}).`);
  else add(covT > 0 ? 'parcial' : 'nao', 'C', `A vaga precisa da ${turnosTxt(turnosFalt)}, que você não marcou.`, `${nome} não tem disponibilidade na ${turnosTxt(turnosFalt)}.`);

  K('dias');
  const covD = (o.dias.length - diasFalt.length) / o.dias.length;
  const pd = 3 * covD;
  if (covD === 1) add('ok', 'C', `Os dias (${diasTxt(o.dias)}) cabem na sua semana.`, `Disponível nos dias necessários (${diasTxt(o.dias)}).`);
  else add('parcial', 'C', `Faltam ${lista(diasFalt.map((d) => DL[d]))} na sua disponibilidade. Preferência parcialmente atendida.`, `${nome} não marcou ${lista(diasFalt.map((d) => DL[d]))}.`);

  K('modal');
  const pm = modalOk ? 3 : o.modalidade === 'hibrido' ? 1.5 : 0;
  if (modalOk) add('ok', 'C', `Modalidade ${MODAL_F[o.modalidade]}, como você prefere.`, `Aceita trabalho ${MODAL_F[o.modalidade]}.`);
  else add(pm ? 'parcial' : 'nao', 'C', `A modalidade é ${MODAL_F[o.modalidade]}; você preferiu ${lista(c.modalidades.map((m) => MODAL_F[m]))}.${pm ? ' Preferência parcialmente atendida.' : ''}`, `${nome} preferiu modalidade ${lista(c.modalidades.map((m) => MODAL_F[m]))}.`);

  K('local');
  const pl = remoto ? 3 : o.cidade === c.cidade ? 3 : cidadeOk ? 2 : 0;
  if (remoto) add('ok', 'C', 'Trabalho remoto: sem deslocamento.', null);
  else if (o.cidade === c.cidade) add('ok', 'C', `Trabalho em ${o.cidade}, na sua cidade.`, `Mora em ${c.cidade}.`);
  else if (cidadeOk) add('parcial', 'C', `Trabalho em ${o.cidade}: exige deslocamento, que você aceita.`, `Mora em ${c.cidade} e aceita trabalhar em ${o.cidade}.`);
  else add('nao', 'C', `Trabalho em ${o.cidade}, fora das cidades que você indicou.`, `${nome} não indicou ${o.cidade}.`);

  K('carga');
  const pcg = cargaOk ? 2 : 0;
  if (o.carga) {
    if (cargaOk) add('ok', 'C', `${CARGAS[o.carga] || o.carga}, como você aceita.`, `Aceita ${(CARGAS[o.carga] || o.carga).toLowerCase()}.`);
    else add('nao', 'C', `A carga é ${(CARGAS[o.carga] || o.carga).toLowerCase()}, que você não marcou.`, `${nome} não marcou ${(CARGAS[o.carga] || o.carga).toLowerCase()}.`);
  }
  K('inicio');
  const pin = ci < 0 || oi < 0 ? 1 : ci <= oi ? 2 : ci === oi + 1 ? 1 : 0;
  if (ci >= 0 && oi >= 0) {
    if (ci <= oi) add('ok', 'C', `Você pode começar ${inicioLabel(c.inicio).toLowerCase()}, dentro do prazo da empresa (${inicioLabel(o.inicio).toLowerCase()}).`, `Pode começar ${inicioLabel(c.inicio).toLowerCase()}.`);
    else add('parcial', 'C', `A empresa quer início ${inicioLabel(o.inicio).toLowerCase()}; você indicou ${inicioLabel(c.inicio).toLowerCase()}.`, `Pode começar ${inicioLabel(c.inicio).toLowerCase()}, depois do desejado.`);
  }
  K('mobil');
  const mob = [cnhOk, veicOk, viagemOk];
  const pmo = mob.filter(Boolean).length / 3;
  if (o.cnhReq || o.veiculoReq || o.viagens !== 'nao') {
    if (pmo === 1) add('ok', 'C', 'Você atende à mobilidade pedida (CNH, veículo e viagens).', `Atende à mobilidade pedida${o.cnhReq ? ` (CNH ${c.cnh})` : ''}.`);
    else add('parcial', 'C', `Mobilidade parcialmente atendida: ${[!cnhOk && `CNH ${o.cnhReq}`, !veicOk && 'veículo próprio', !viagemOk && 'disponibilidade para viajar'].filter(Boolean).join(', ')}.`, `Mobilidade parcial: falta ${[!cnhOk && `CNH ${o.cnhReq}`, !veicOk && 'veículo', !viagemOk && 'viagens'].filter(Boolean).join(', ')}.`);
  }

  // D — competências (10), ferramentas (2), escolaridade (2), idiomas (1) e E — treinamentos (10)
  const rel = [...o.essenciais.map((k) => [k, 2]), ...o.desejaveis.filter((k) => !o.essenciais.includes(k)).map((k) => [k, 1])];
  const W = rel.reduce((s, [, w]) => s + w, 0) || 1;
  let sd = 0, se = 0;
  const demo = [], decl = [], dev = [], falta = [], dica = [], cert = [];
  const comCert = new Set((Array.isArray(c.certificados) ? c.certificados : []).map((x) => x && x.comp).filter(Boolean));
  rel.forEach(([k, w]) => {
    const t = c.treinos?.[k];
    const demonstrada = t && t.score >= 50;
    let lvl = 0;
    if (demonstrada) { lvl = 1; demo.push(k); se += w * (t.score / 100); }
    else if (c.competencias.includes(k)) { lvl = 0.5; decl.push(k); }
    else if (comCert.has(k)) { lvl = 0.5; cert.push(k); }
    else if (o.aceitaIniciante && c.desenvolver.includes(k)) { lvl = 0.25; dev.push(k); }
    else if (w === 2) falta.push(k);
    if (!demonstrada) dica.push(k);
    sd += w * lvl;
  });
  const pdc = (10 * sd) / W;
  const ptr = (10 * se) / W;
  const nm = (ks) => lista(ks.map((k) => lc(COMPS[k])));
  const essTxt = (ks) => (ks.some((k) => o.essenciais.includes(k)) ? 'relevante para esta função' : 'desejável nesta função');
  K('treino');
  if (demo.length) {
    add('ok', 'E', `Seu treinamento em ${nm(demo)} conta pontos aqui (${essTxt(demo)}).`,
      `Demonstrou ${nm(demo)} nos treinamentos da Contratei (${demo.map((k) => `${nivelTreino(c.treinos[k].score).toLowerCase()}, ${c.treinos[k].score}/100`).join('; ')}).`);
  }
  K('comp');
  if (decl.length) add('ok', 'D', `Você declarou ${nm(decl)}, ${decl.length > 1 ? 'competências pedidas' : 'competência pedida'} nesta oportunidade.`, `Declara ${nm(decl)}.`);
  if (cert.length) add('ok', 'D', `Seu curso/certificado em ${nm(cert)} conta como competência nesta oportunidade.`, `Tem curso ou certificado em ${nm(cert)}.`);
  K('dev');
  if (dev.length) add('parcial', 'D', `Você quer desenvolver ${nm(dev)}, e a empresa aceita quem está começando.`, `Quer desenvolver ${nm(dev)}.`);
  K('falta');
  if (falta.length) add('nao', 'D', `Ainda não aparece no seu perfil: ${nm(falta)}.`, `Não indicou ${nm(falta)}.`);
  K('inic');
  if (c.experiencia === 0 && o.aceitaIniciante)
    add('ok', 'D', 'A empresa aceita iniciantes: não ter experiência formal não elimina você.', 'Primeira experiência em vendas. Sua oportunidade aceita iniciantes.');
  else if (c.experiencia > 0)
    add('ok', 'D', null, `Tem ${expTxt(c.experiencia)} em vendas ou atendimento.`);

  K('ferr');
  const fq = arr(o.ferramentas), fc = arr(c.ferramentas);
  const fOk = fq.filter((f) => fc.includes(f));
  const pfe = fq.length ? 2 * (fOk.length / fq.length) : 2;
  if (fq.length) {
    if (fOk.length) add(fOk.length === fq.length ? 'ok' : 'parcial', 'D', `Você usa ${lista(fOk)}, ${fOk.length > 1 ? 'ferramentas usadas' : 'ferramenta usada'} nesta vaga.`, `Usa ${lista(fOk)}.`);
    const falt = fq.filter((f) => !fc.includes(f));
    if (falt.length) add('nao', 'D', `Ferramentas desta vaga que não estão no seu perfil: ${lista(falt)}.`, `Não indicou ${lista(falt)}.`);
  }
  K('esc');
  const di = escIdx(c.escolaridade) - escIdx(o.escolaridadeMin);
  const pes = !o.escolaridadeMin ? 2 : di >= 0 ? 2 : di === -1 ? 1 : 0;
  if (o.escolaridadeMin) {
    if (di >= 0) add('ok', 'D', `Sua escolaridade (${escLabel(c.escolaridade).toLowerCase()}) atende ao pedido.`, `Escolaridade: ${escLabel(c.escolaridade).toLowerCase()}.`);
    else add('parcial', 'D', `A vaga pede ${escLabel(o.escolaridadeMin).toLowerCase()}; você informou ${escLabel(c.escolaridade).toLowerCase()}.`, `Escolaridade abaixo da pedida (${escLabel(c.escolaridade).toLowerCase()}).`);
  }
  K('idioma');
  const iq = arr(o.idiomas), iOk = iq.filter((x) => arr(c.idiomas).includes(x));
  const pid = iq.length ? iOk.length / iq.length : 1;
  if (iq.length) {
    if (iOk.length) add('ok', 'D', `Você fala ${lista(iOk)}, idioma desejado nesta vaga.`, `Fala ${lista(iOk)}.`);
    else add('nao', 'D', `A vaga valoriza ${lista(iq)}.`, `Não indicou ${lista(iq)}.`);
  }

  const partes = {
    A: { ...PARTES.A, pts: pf + psg + ptv + ppu },
    B: { ...PARTES.B, pts: ps + pc + pct + pbe },
    C: { ...PARTES.C, pts: pt + pd + pm + pl + pcg + pin + pmo },
    D: { ...PARTES.D, pts: pdc + pfe + pes + pid },
    E: { ...PARTES.E, pts: ptr },
  };
  const total = Math.round(Object.values(partes).reduce((s, p) => s + p.pts, 0));
  const ganhoPossivel = dica
    .filter((k) => TRILHAS.some((t) => t.comp === k))
    .map((k) => ({ k, w: o.essenciais.includes(k) ? 2 : 1 }))
    .sort((a, b) => b.w - a.w || ORDEM_TRILHA.indexOf(a.k) - ORDEM_TRILHA.indexOf(b.k));

  return { elegivel: bloqueios.length === 0, bloqueios, total, partes, rc, re, dicas: ganhoPossivel };
}

// Frase que dá sentido ao encontro (tela de match)
export function fraseMatch(c, o) {
  const partes = [];
  if (c.tiposVenda.includes(o.tipoVenda)) partes.push(`interesse em ${TIPO_FRASE[o.tipoVenda]}`);
  else partes.push(`interesse na função de ${lc(o.funcao)}`);
  if (o.turnos.every((t) => c.turnos.includes(t))) partes.push(`disponibilidade no mesmo turno (${turnosTxt(o.turnos)})`);
  else if (o.salarioMax >= c.salarioMin) partes.push('expectativa salarial dentro da faixa');
  return `Vocês têm ${lista(partes)}.`;
}

export function rankingCandidato(state, candId) {
  const c = state.candidatos[candId];
  const all = Object.values(state.oportunidades).filter((o) => !state.empresas[o.empresaId]?.suspenso).map((o) => ({ o, r: avaliar(c, o) }));
  return {
    recomendadas: all.filter((x) => x.r.elegivel).sort((a, b) => b.r.total - a.r.total),
    fora: all.filter((x) => !x.r.elegivel),
  };
}

export function rankingOportunidade(state, oppId) {
  const o = state.oportunidades[oppId];
  const all = Object.values(state.candidatos).filter((c) => !c.suspenso && c.funcoes?.length).map((c) => ({ c, r: avaliar(c, o) }));
  return {
    recomendados: all.filter((x) => x.r.elegivel).sort((a, b) => b.r.total - a.r.total),
    fora: all.filter((x) => !x.r.elegivel),
  };
}

// Compara o antes e o depois para mostrar o recálculo ao vivo
export function diffCandidato(antes, depois, candId) {
  const A = antes.candidatos[candId], D = depois.candidatos[candId];
  return Object.values(depois.oportunidades).map((o) => {
    const ra = avaliar(A, antes.oportunidades[o.id] || o), rd = avaliar(D, o);
    return { id: o.id, titulo: o.titulo, antes: ra.elegivel ? ra.total : null, depois: rd.elegivel ? rd.total : null, r: rd, o };
  }).sort((x, y) => (y.depois ?? -1) - (x.depois ?? -1));
}

export function diffOportunidade(antes, depois, oppId) {
  const oa = antes.oportunidades[oppId], od = depois.oportunidades[oppId];
  return Object.values(depois.candidatos).map((c) => {
    const ra = oa ? avaliar(antes.candidatos[c.id], oa) : null, rd = avaliar(c, od);
    return { id: c.id, titulo: c.exib, antes: ra && ra.elegivel ? ra.total : null, depois: rd.elegivel ? rd.total : null, r: rd };
  }).sort((x, y) => (y.depois ?? -1) - (x.depois ?? -1));
}

export const resumoEmpresa = (state, o) => state.empresas[o.empresaId].resumo;
