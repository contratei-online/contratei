import { temCredito } from './creditos.js';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Ctx } from './ctx.js';
import { COMPS, TIPOS, MODAL } from './data.js';
import { brl, faixa, turnosTxt, fraseMatch } from './engine.js';
import { Avatar, Btn, Bars, IcCal, IcChat, IcSend, IcSwap, IcBack, IcCheck, IcLock, IcClock, IcInfo, IcBolt } from './ui.jsx';

// ---------- datas ----------
export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const hoje = (add = 0) => { const d = new Date(); d.setDate(d.getDate() + add); return iso(d); };
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const fmtData = (s) => parse(s).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
export const fmtLonga = (s) => { const t = parse(s).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }); return t.charAt(0).toUpperCase() + t.slice(1); };
const hora = (ts) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const DIAKEY = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
export function diasAvaliacao(inicio, dias) {
  const out = []; const d = parse(inicio); let guard = 0;
  while (out.length < 5 && guard++ < 30) { if (dias.includes(DIAKEY[d.getDay()])) out.push(iso(d)); d.setDate(d.getDate() + 1); }
  return out;
}

export const ETAPAS = {
  conversa: 'Combinando entrevista', entrevista_agendada: 'Entrevista agendada', entrevista_realizada: 'Entrevista realizada',
  avaliacao_proposta: 'Avaliação proposta', avaliacao: 'Avaliação de 5 dias', efetivado: 'Efetivado', encerrado: 'Processo encerrado',
};

let seq = 0;
const mid = () => Date.now().toString(36) + (seq++);
export const sis = (t) => ({ id: mid(), de: 'sistema', tipo: 'texto', t, ts: Date.now() });

// pendências para o lado que está vendo
export function pendente(m, lado) {
  const prop = [...m.msgs].reverse().find((x) => x.tipo === 'horario' && x.status === 'pendente');
  if (prop && prop.de !== lado) return true;
  if (lado === 'emp' && (m.etapa === 'entrevista_realizada' || (m.etapa === 'avaliacao' && m.avaliacao.dia > 5))) return true;
  if (lado === 'cand' && m.etapa === 'avaliacao_proposta') return true;
  return false;
}

// ================= Lista de conversas =================
export function Conversas({ lado, id, threadId }) {
  const { db, openThread, closeThread } = useContext(Ctx);
  const lista = Object.values(db.matches).filter((m) => (lado === 'cand' ? m.candId === id : db.oportunidades[m.oppId]?.empresaId === id))
    .sort((a, b) => (b.msgs.at(-1)?.ts || 0) - (a.msgs.at(-1)?.ts || 0));
  const ativo = threadId && db.matches[threadId] ? threadId : null;
  return (
    <div className={`page chatpage ${ativo ? 'has-thread' : ''}`}>
      <div className="convs">
        <div className="page-h">
          <div className="eyebrow"><IcChat size={16} /> Conversas</div>
          <h1><span className="hl">Conversas</span></h1>
          <p className="muted small">Só existem conversas quando o interesse é recíproco.</p>
        </div>
        {lista.length === 0 && (
          <div className="card empty"><IcLock size={18} /><p>Nenhum match ainda. Quando você e a outra parte demonstrarem interesse, a conversa abre aqui.</p></div>
        )}
        {lista.map((m) => {
          const c = db.candidatos[m.candId], o = db.oportunidades[m.oppId], e = db.empresas[o.empresaId];
          const last = m.msgs.at(-1);
          return (
            <button key={m.id} className={`conv ${ativo === m.id ? 'on' : ''}`} onClick={() => openThread(m.id)}>
              <div className="conv-t"><span className="conv-who">{lado === 'emp' && <Avatar foto={c.foto} nome={c.nome} size={30} />}<b>{lado === 'cand' ? e.nome : c.nome}</b></span>{pendente(m, lado) && <span className="dot" />}</div>
              <div className="small muted">{o.titulo}</div>
              <div className="conv-b"><span className={`pill mini ${m.etapa === 'efetivado' ? 'lime' : ''}`}>{ETAPAS[m.etapa]}</span><span className="small muted ell">{last?.t}</span></div>
            </button>
          );
        })}
      </div>
      {ativo ? <Thread key={ativo} m={db.matches[ativo]} lado={lado} onBack={closeThread} /> : lista.length > 0 && <div className="thread-empty muted">Escolha uma conversa</div>}
    </div>
  );
}

// ================= Conversa =================
function Thread({ m, lado, onBack }) {
  const { db, upd, switchTo, openModal } = useContext(Ctx);
  const c = db.candidatos[m.candId], o = db.oportunidades[m.oppId], e = db.empresas[o.empresaId];
  const [aba, setAba] = useState('conversa');
  const [txt, setTxt] = useState('');
  const [prop, setProp] = useState(null);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [m.msgs.length, aba]);

  const mu = (fn) => upd((x) => fn(x.matches[m.id]));
  const enviar = () => { if (!txt.trim()) return; mu((mm) => mm.msgs.push({ id: mid(), de: lado, tipo: 'texto', t: txt.trim(), ts: Date.now() })); setTxt(''); };
  const sugerir = () => {
    mu((mm) => {
      mm.msgs.forEach((x) => { if (x.tipo === 'horario' && x.status === 'pendente') x.status = 'substituida'; });
      mm.msgs.push({ id: mid(), de: lado, tipo: 'horario', data: prop.data, hora: prop.hora, local: prop.local, status: 'pendente', t: `Sugestão de entrevista: ${fmtData(prop.data)} às ${prop.hora}`, ts: Date.now() });
    });
    setProp(null);
  };
  const aceitar = (msgId) => mu((mm) => {
    const p = mm.msgs.find((x) => x.id === msgId); p.status = 'aceita';
    mm.entrevista = { data: p.data, hora: p.hora, local: p.local, status: 'agendada' };
    mm.etapa = 'entrevista_agendada';
    mm.msgs.push(sis(`Entrevista agendada: ${fmtLonga(p.data).toLowerCase()}, às ${p.hora}. ${p.local}.`));
  });
  const outroNome = lado === 'cand' ? e.nome : c.nome;
  const pend = pendente(m, lado);
  const novaProp = () => setProp({ data: hoje(3), hora: '14:00', local: o.modalidade === 'remoto' ? 'Por vídeo' : `Presencial · ${o.cidade}${o.bairro ? ', ' + o.bairro : ''}` });

  return (
    <div className="thread">
      <div className="thread-h">
        <button className="iconbtn only-m" onClick={onBack} aria-label="Voltar"><IcBack /></button>
        {lado === 'emp' && <Avatar foto={c.foto} nome={c.nome} size={40} />}
        <div className="th-who">
          <b>{outroNome}</b>
          <span className="small muted">{o.titulo}</span>
        </div>
        <button className="link small lime-l" onClick={() => (lado === 'cand' ? switchTo('emp', o.empresaId, 'conversas', { thread: m.id }) : switchTo('cand', c.id, 'conversas', { thread: m.id }))}>
          <IcSwap size={14} /> <span className="hide-s">Ver como </span>{lado === 'cand' ? e.nome.split(' ')[0] + '…' : c.exib}
        </button>
      </div>
      {m.entrevista && m.entrevista.status === 'agendada' && (
        <div className="agendada"><IcCal size={18} /><div><span className="small">Entrevista agendada</span><b>{fmtLonga(m.entrevista.data)} · {m.entrevista.hora}</b><span className="small muted">{m.entrevista.local}</span></div></div>
      )}
      <div className="seg big thread-tabs">
        <button className={aba === 'conversa' ? 'on' : ''} onClick={() => setAba('conversa')}>Conversa</button>
        <button className={aba === 'processo' ? 'on' : ''} onClick={() => setAba('processo')}>Processo seletivo {pend && m.etapa !== 'conversa' && <span className="dot" />}</button>
      </div>

      {aba === 'conversa' ? (
        <>
          <div className="msgs">
            {m.msgs.map((x) => {
              if (x.de === 'sistema') return <div key={x.id} className="msg-sys">{x.t}</div>;
              const meu = x.de === lado;
              if (x.tipo === 'horario') {
                return (
                  <div key={x.id} className={`msg-row ${meu ? 'me' : ''}`}>
                    <div className={`propcard ${x.status}`}>
                      <div className="pc-h"><IcCal size={16} /> Sugestão de entrevista</div>
                      <b className="pc-d">{fmtLonga(x.data)} · {x.hora}</b>
                      <span className="small muted">{x.local}</span>
                      {x.status === 'pendente' && (meu
                        ? <span className="small muted"><IcClock size={13} /> Aguardando confirmação de {outroNome}</span>
                        : <div className="pc-a"><Btn kind="lime" onClick={() => aceitar(x.id)}><IcCheck size={16} /> Confirmar entrevista</Btn><Btn kind="ghost" onClick={novaProp}>Propor outro horário</Btn></div>)}
                      {x.status === 'aceita' && <span className="pill lime mini"><IcCheck size={13} /> Confirmada pelos dois lados</span>}
                      {x.status === 'substituida' && <span className="small muted">Substituída por outra sugestão</span>}
                      <span className="msg-ts">{meu ? 'Você' : outroNome.split(' ')[0]} · {hora(x.ts)}</span>
                    </div>
                  </div>
                );
              }
              return (
                <div key={x.id} className={`msg-row ${meu ? 'me' : ''}`}>
                  <div className="bubble">{x.t}<span className="msg-ts">{hora(x.ts)}</span></div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          {prop && (
            <div className="propform">
              <div className="pf-h"><IcCal size={16} /> Sugerir data e horário</div>
              <div className="pf-in">
                <input type="date" className="in" value={prop.data} min={hoje(0)} onChange={(ev) => setProp({ ...prop, data: ev.target.value })} aria-label="Data" />
                <input type="time" className="in" value={prop.hora} onChange={(ev) => setProp({ ...prop, hora: ev.target.value })} aria-label="Horário" />
              </div>
              <input className="in" value={prop.local} onChange={(ev) => setProp({ ...prop, local: ev.target.value })} aria-label="Local" />
              <div className="pf-a"><Btn kind="ghost" onClick={() => setProp(null)}>Cancelar</Btn><Btn kind="lime" onClick={sugerir} disabled={!prop.data || !prop.hora}>Enviar sugestão</Btn></div>
            </div>
          )}
          {m.etapa !== 'encerrado' && (
            <div className="composer">
              {!prop && !['avaliacao', 'efetivado'].includes(m.etapa) && <Btn kind="lime-o" onClick={novaProp}><IcCal size={16} /><span className="hide-s">Sugerir </span>horário</Btn>}
              <input className="in" placeholder="Escreva uma mensagem" value={txt} onChange={(ev) => setTxt(ev.target.value)} onKeyDown={(ev) => ev.key === 'Enter' && enviar()} />
              <button className="iconbtn send" onClick={enviar} aria-label="Enviar"><IcSend /></button>
            </div>
          )}
        </>
      ) : (
        <Processo m={m} lado={lado} c={c} o={o} e={e} mu={mu} />
      )}
    </div>
  );
}

// ================= Processo seletivo =================
const STEPS = [['match', 'Match'], ['entrevista', 'Entrevista'], ['avaliacao', 'Avaliação 5 dias'], ['efetivacao', 'Efetivação']];
const stepIdx = (et) => ({ conversa: 1, entrevista_agendada: 1, entrevista_realizada: 2, avaliacao_proposta: 2, avaliacao: 2, efetivado: 4, encerrado: -1 }[et]);

function Processo({ m, lado, c, o, e, mu }) {
  const { openModal, db } = useContext(Ctx);
  const si = stepIdx(m.etapa);
  const av = m.avaliacao;
  const dias = av ? diasAvaliacao(av.cond.inicio, o.dias) : [];
  const [obs, setObs] = useState({ comp: o.essenciais[0], nivel: 'Atendeu', texto: '' });
  const [verDia, setVerDia] = useState(null);

  return (
    <div className="proc">
      <div className="stepper">
        {STEPS.map(([k, l], i) => (
          <div key={k} className={`st ${m.etapa === 'encerrado' ? '' : i < si ? 'done' : i === si ? 'cur' : ''}`}>
            <i>{i < si ? <IcCheck size={13} /> : i + 1}</i><span>{l}</span>
          </div>
        ))}
      </div>

      {m.etapa === 'conversa' && <div className="card pstep"><p>Combinem a entrevista na aba <b>Conversa</b>: qualquer lado pode sugerir data e horário, e a entrevista fica agendada quando o outro confirma.</p></div>}

      {m.etapa === 'entrevista_agendada' && (
        <div className="card pstep">
          <h3><IcCal size={18} /> Entrevista agendada</h3>
          <p className="big-info">{fmtLonga(m.entrevista.data)} · {m.entrevista.hora}</p>
          <p className="small muted">{m.entrevista.local}</p>
          {lado === 'emp'
            ? <Btn kind="ghost" onClick={() => mu((mm) => { mm.entrevista.status = 'realizada'; mm.etapa = 'entrevista_realizada'; mm.msgs.push(sis('A empresa registrou a entrevista como realizada.')); })}><IcBolt size={15} /> Demonstração: registrar entrevista como realizada</Btn>
            : <p className="small muted">Depois da entrevista, a empresa decide o próximo passo.</p>}
        </div>
      )}

      {m.etapa === 'entrevista_realizada' && (
        <div className="card pstep">
          <h3>Entrevista realizada</h3>
          {lado === 'emp' ? (
            <>
              <p className="muted">Qual é o próximo passo com {c.exib}?</p>
              <div className="pc-a">
                <Btn kind="lime" onClick={() => (temCredito(db, o.empresaId) ? openModal({ type: 'condicoes', matchId: m.id }) : openModal({ type: 'comprar', empId: o.empresaId, motivo: 'Para avançar para a avaliação de 5 dias, você precisa de 1 crédito de contratação disponível.' }))}>Avançar para avaliação de 5 dias</Btn>
                <Btn kind="ghost" onClick={() => openModal({ type: 'encerrar', matchId: m.id })}>Encerrar processo</Btn>
              </div>
            </>
          ) : <p className="muted">Aguardando a decisão de {e.nome}.</p>}
        </div>
      )}

      {m.etapa === 'avaliacao_proposta' && (
        <div className="card pstep">
          <h3>Avaliação de 5 dias: condições propostas</h3>
          <Condicoes cond={av.cond} o={o} />
          {lado === 'cand' ? (
            <div className="pc-a">
              <Btn kind="lime" onClick={() => mu((mm) => { mm.avaliacao.aceita = true; mm.avaliacao.dia = 1; mm.etapa = 'avaliacao'; mm.msgs.push(sis(`${c.exib} aceitou as condições da avaliação de 5 dias.`)); })}><IcCheck size={16} /> Aceitar etapa</Btn>
              <Btn kind="ghost" onClick={() => mu((mm) => { mm.avaliacao = null; mm.etapa = 'entrevista_realizada'; mm.msgs.push(sis(`${c.exib} não aceitou as condições propostas.`)); })}>Não aceitar</Btn>
            </div>
          ) : <p className="small muted"><IcClock size={13} /> Aguardando o aceite de {c.exib}.</p>}
        </div>
      )}

      {(m.etapa === 'avaliacao' || (av && av.aceita && ['efetivado', 'encerrado'].includes(m.etapa))) && (
        <div className="card pstep">
          <div className="row-between wrap">
            <h3>Avaliação de 5 dias</h3>
            <span className="pill mini work">Início de trabalho na empresa · remunerado e formalizado</span>
          </div>
          <div className="timeline">
            {dias.map((d, i) => {
              const n = i + 1;
              const st = av.dia > n ? 'done' : av.dia === n ? 'cur' : '';
              const obsDia = av.obs.filter((x) => x.dia === n);
              return (
                <button key={d} className={`tl ${st} ${verDia === n ? 'sel' : ''}`} onClick={() => setVerDia(verDia === n ? null : n)}>
                  <i>{av.dia > n ? <IcCheck size={13} /> : n}</i>
                  <span>Dia {n}</span><span className="small muted">{fmtData(d)}</span>
                  {obsDia.length > 0 && <em>{obsDia.length} obs.</em>}
                </button>
              );
            })}
          </div>
          {lado === 'emp' && m.etapa === 'avaliacao' && (
            <div className="demo-ctl">
              <span className="small"><IcBolt size={14} /> Andamento da avaliação</span>
              {av.dia <= 5
                ? <Btn kind="ghost" size="sm" onClick={() => mu((mm) => { mm.avaliacao.dia += 1; mm.msgs.push(sis(mm.avaliacao.dia > 5 ? 'Os 5 dias de avaliação foram concluídos.' : `Avaliação: dia ${mm.avaliacao.dia - 1} concluído.`)); })}>{av.dia === 5 ? 'Concluir o 5º dia' : `Concluir o dia ${av.dia} e avançar`}</Btn>
                : <span className="small muted">Avaliação concluída</span>}
            </div>
          )}
          <div className="obs-list">
            <div className="why-h">{lado === 'emp' ? 'Observações registradas' : 'Feedback da empresa'}</div>
            {av.obs.length === 0 && <p className="small muted">Nenhuma observação registrada ainda.</p>}
            {av.obs.filter((x) => !verDia || x.dia === verDia).map((x) => (
              <div key={x.id} className="obs">
                <div className="obs-h"><b>Dia {x.dia} · {COMPS[x.comp]}</b><span className={`pill mini ${x.nivel === 'Superou' ? 'lime' : x.nivel === 'Atendeu' ? '' : 'warn'}`}>{x.nivel}</span></div>
                {x.texto && <p className="small">{x.texto}</p>}
              </div>
            ))}
          </div>
          {lado === 'emp' && m.etapa === 'avaliacao' && av.dia <= 5 && (
            <div className="obs-form">
              <div className="why-h">Nova observação · dia {av.dia}</div>
              <div className="grid2 tight">
                <select className="in" value={obs.comp} onChange={(ev) => setObs({ ...obs, comp: ev.target.value })}>
                  {[...new Set([...o.essenciais, ...o.desejaveis])].map((k) => <option key={k} value={k}>{COMPS[k]}</option>)}
                </select>
                <select className="in" value={obs.nivel} onChange={(ev) => setObs({ ...obs, nivel: ev.target.value })}>
                  {['Superou', 'Atendeu', 'Em desenvolvimento'].map((k) => <option key={k}>{k}</option>)}
                </select>
              </div>
              <textarea className="in" rows={2} placeholder="Ex.: Fez perguntas antes de oferecer as peças e fechou duas vendas." value={obs.texto} onChange={(ev) => setObs({ ...obs, texto: ev.target.value })} />
              <Btn kind="lime" onClick={() => { mu((mm) => mm.avaliacao.obs.push({ id: mid(), dia: mm.avaliacao.dia, ...obs })); setObs({ ...obs, texto: '' }); }}>Registrar observação</Btn>
            </div>
          )}
          {m.etapa === 'avaliacao' && av.dia > 5 && (lado === 'emp' ? (
            <div className="decisao">
              <div className="why-h">Decisão final</div>
              <div className="pc-a">
                <Btn kind="lime" size="lg" onClick={() => (temCredito(db, o.empresaId) ? openModal({ type: 'efetivar', matchId: m.id }) : openModal({ type: 'comprar', empId: o.empresaId, motivo: 'Para efetivar a contratação, você precisa de 1 crédito disponível.' }))}>Efetivar {c.exib}</Btn>
                <Btn kind="ghost" onClick={() => openModal({ type: 'encerrar', matchId: m.id })}>Encerrar processo</Btn>
              </div>
            </div>
          ) : <p className="small muted">Avaliação concluída. Aguardando a decisão de {e.nome}.</p>)}
        </div>
      )}

      {m.etapa === 'efetivado' && (
        <div className="card pstep efetivado">
          <Bars stage="all" size={40} />
          <h3>{c.nome} foi efetivada(o) em {e.nome}</h3>
          <p className="muted">Salário-base registrado: <b className="t-white">{brl(m.efetivacao.salarioBase)}</b>. A contratação é só o começo: a evolução continua.</p>
        </div>
      )}
      {m.etapa === 'encerrado' && <div className="card pstep"><h3>Processo encerrado</h3><p className="muted">{m.encerramento || 'A empresa encerrou este processo.'}</p></div>}
    </div>
  );
}

export function Condicoes({ cond, o }) {
  const dias = diasAvaliacao(cond.inicio, o.dias);
  return (
    <div className="cond">
      <div className="fatos">
        <div className="fato"><span className="fato-l">Período</span><span className="fato-v strong">{fmtData(dias[0])} a {fmtData(dias[4])} (5 dias)</span></div>
        <div className="fato"><span className="fato-l">Turno</span><span className="fato-v strong">{cond.turno}</span></div>
        <div className="fato"><span className="fato-l">Remuneração</span><span className="fato-v strong">{brl(cond.diaria, 2)} por dia{o.comissao.tem ? ' + comissão' : ''}</span></div>
        <div className="fato"><span className="fato-l">Vínculo</span><span className="fato-v">{cond.vinculo}</span></div>
        <div className="fato"><span className="fato-l">Acompanhamento</span><span className="fato-v">{cond.responsavel}</span></div>
        <div className="fato"><span className="fato-l">Salário se efetivado</span><span className="fato-v strong">{brl(cond.salarioPrevisto)}</span></div>
      </div>
      <p className="small"><span className="muted">Competências combinadas:</span> {cond.comps.map((k) => COMPS[k]).join(', ')}</p>
      <p className="small"><span className="muted">Objetivo:</span> {cond.objetivo}</p>
      <p className="small legal"><IcInfo size={14} /> Esta etapa é início de trabalho na empresa: depende de formalização do vínculo e de remuneração adequada desde o 1º dia. É diferente das simulações de qualificação, feitas dentro da Contratei.</p>
    </div>
  );
}
