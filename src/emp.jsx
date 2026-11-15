import { saldo, saldoTxt, plano, STATUS_PEDIDO } from './creditos.js';
import React, { useContext, useMemo, useState, useEffect } from 'react';
import { Ctx } from './ctx.js';
import { TURNOS, DIAS, TIPOS, MODAL, FUNCOES, SEGMENTOS, CIDADES, COMPS, EXPERIENCIA, PLANOS, nivelTreino, expTxt,
  ESCOLARIDADE, CONTRATOS, CARGAS, INICIOS, VIAGENS_O, VIAGENS_C, CNH_REQ, VEICULO_O, IDADE_MIN, BENEFICIOS, idade, escLabel, inicioLabel } from './data.js';
import { topMotivos, rankingOportunidade, brl, faixa, turnosTxt, diasTxt, diffOportunidade, lista } from './engine.js';
import { BancoOutros, SelectOutros, Avatar, Btn, Chips, Field, Switch, Score, Reasons, Breakdown, Collapse, Bars, IcLock, IcCoin, IcClock, IcPin, IcInfo, IcPlus, IcCheck } from './ui.jsx';
import { Fato, InteresseBox, CompsRelevantes, Requisitos } from './cand.jsx';

const ent = (o) => Object.entries(o);

const novaOpp = (empId, id) => ({
  id, empresaId: empId, titulo: 'Nova oportunidade privada', funcao: FUNCOES[0], segmento: SEGMENTOS[0], tipoVenda: 'balcao',
  cidade: 'Passo Fundo', bairro: '', modalidade: 'presencial', turnos: ['manha'], dias: ['seg', 'ter', 'qua', 'qui', 'sex'],
  salarioMin: 1800, salarioMax: 2200, comissao: { tem: false, desc: '' }, essenciais: ['atendimento'], desejaveis: [],
  aceitaIniciante: true, experienciaMin: 0, oferece: '', preferencias: '',
  publico: 'b2c', escolaridadeMin: 'medio', cnhReq: '', veiculoReq: '', viagens: 'nao', contrato: 'clt', carga: 'integral', inicio: '15d',
  idiomas: [], ferramentas: [], beneficios: ['vt'], idadeMinima: '18',
  obrig: { turno: true, dias: false, local: false, escolaridade: false, mobilidade: false, inicio: false },
});

// ================= Perfil da empresa =================
export function PerfilEmpresa({ empId, wizard, onConcluir }) {
  const { db, upd, openModal, toast, verPlanos } = useContext(Ctx);
  const emp = db.empresas[empId];
  const opps = Object.values(db.oportunidades).filter((o) => o.empresaId === empId);
  const sd = saldo(db, empId);
  const meusPedidos = Object.entries(db.pedidos || {}).filter(([, p]) => p.empId === empId).sort((a, b) => b[1].criadoEm - a[1].criadoEm).slice(0, 3);
  const [sel, setSel] = useState(opps[0]?.id);
  const [e, setE] = useState(() => ({ ...emp }));
  const empDirty = JSON.stringify(e) !== JSON.stringify(emp);

  const criar = () => {
    const id = 'o' + Date.now().toString(36);
    upd((x) => { x.oportunidades[id] = novaOpp(empId, id); });
    setSel(id);
  };

  return (
    <div className="page">
      {wizard && (
        <div className="card wiz-emp">
          <div className="kicker">Cadastro de empresa</div>
          <h2>Bem-vindo! Seu cadastro tem dois passos.</h2>
          <ol><li><b>Dados da empresa:</b> preencha e clique em “Salvar empresa”.</li><li><b>Sua primeira oportunidade privada:</b> descreva a vaga e clique em “Salvar e recalcular ranking”.</li></ol>
          <Btn kind="lime" onClick={onConcluir}>Concluir cadastro e ver perfis recomendados</Btn>
        </div>
      )}
      {emp.suspenso && <div className="card notice"><b>Esta empresa está suspensa pela administração.</b> Suas oportunidades não aparecem para candidatos.</div>}
      <div className="page-h">
        <div className="eyebrow"><Bars stage={1} /> Necessidade</div>
        <h1>Perfil da <span className="hl">empresa</span></h1>
        <p className="muted">Sua necessidade de contratação fica em sigilo: cada oportunidade só aparece para os candidatos recomendados, sem o nome da empresa até o match.</p>
      </div>
      <section className="card form">
        <h3>Empresa</h3>
        <div className="grid2">
          <Field label="Nome da empresa" hint="Privado até o match."><input className="in" value={e.nome} onChange={(ev) => setE({ ...e, nome: ev.target.value })} /></Field>
          <Field label="Identificação resumida" hint="O que o candidato vê antes do match."><input className="in" value={e.resumo} onChange={(ev) => setE({ ...e, resumo: ev.target.value })} /></Field>
          <Field label="Setor"><input className="in" value={e.setor} onChange={(ev) => setE({ ...e, setor: ev.target.value })} /></Field>
          <Field label="Responsável pela contratação"><input className="in" value={e.responsavel} onChange={(ev) => setE({ ...e, responsavel: ev.target.value })} /></Field>
        </div>
        <Field label="Sobre a empresa"><textarea className="in" rows={2} value={e.descricao} onChange={(ev) => setE({ ...e, descricao: ev.target.value })} /></Field>
        {(empDirty || wizard) && <div className="row-end"><Btn kind="lime" disabled={!e.nome?.trim()} onClick={() => { upd((x) => { x.empresas[empId] = { ...e }; }); toast('Dados da empresa salvos.'); }}>Salvar empresa</Btn></div>}
      </section>

      <div className="card plano-atual">
        <div>
          <span className="muted small">Créditos de contratação</span>
          <b>{saldoTxt(sd)}</b>
          <span className="small muted">{sd.ilimitado ? `${sd.usados} contratações feitas pela Contratei` : `${sd.usados} de ${sd.total} já usados. 1 crédito é descontado só quando você efetiva uma contratação.`}</span>
          {meusPedidos.map(([id, p]) => <span key={id} className="small"><span className={`pill mini ${p.status === 'confirmado' ? 'lime' : p.status === 'recusado' ? 'warn' : ''}`}>{STATUS_PEDIDO[p.status]}</span> {plano(p.plano)?.nome} · {brl(p.valor, 2)} · {new Date(p.criadoEm).toLocaleDateString('pt-BR')}</span>)}
        </div>
        <Btn kind="lime" onClick={() => openModal({ type: 'comprar', empId })}>Comprar créditos</Btn>
      </div>

      <div className="opps-h">
        <h2>Oportunidades privadas <span className="muted small">{opps.length} {opps.length === 1 ? 'ativa' : 'ativas'}</span></h2>
        <Btn kind="ghost" onClick={criar}><IcPlus size={16} /> Nova oportunidade</Btn>
      </div>
      <div className="tabs-inline">
        {opps.map((o) => <button key={o.id} className={sel === o.id ? 'on' : ''} onClick={() => setSel(o.id)}>{o.titulo}</button>)}
      </div>
      {sel && db.oportunidades[sel] && <OppForm key={sel} oppId={sel} />}
      <BancoOutros />
    </div>
  );
}

function OppForm({ oppId }) {
  const { db, upd, openModal } = useContext(Ctx);
  const [d, setD] = useState(() => structuredClone(db.oportunidades[oppId]));
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const setOb = (k, v) => setD((x) => ({ ...x, obrig: { ...x.obrig, [k]: v } }));
  const dirty = JSON.stringify(d) !== JSON.stringify(db.oportunidades[oppId]);
  const salvar = () => {
    const antes = db;
    const depois = structuredClone(db);
    depois.oportunidades[oppId] = d;
    upd((x) => { x.oportunidades[oppId] = structuredClone(d); });
    openModal({ type: 'diff', titulo: 'Ranking de candidatos recalculado', sub: d.titulo, rows: diffOportunidade(antes, depois, oppId) });
  };
  return (
    <>
      <section className="card form">
        <h3>Função e tipo de venda</h3>
        <Field label="Título interno da oportunidade"><input className="in" value={d.titulo} onChange={(e) => set('titulo', e.target.value)} /></Field>
        <div className="grid2">
          <Field label="Função"><SelectOutros campo="funcao" value={d.funcao} onChange={(v) => set('funcao', v)} /></Field>
          <Field label="Segmento"><SelectOutros campo="segmento" value={d.segmento} onChange={(v) => set('segmento', v)} /></Field>
        </div>
        <Field label="Tipo de venda no dia a dia"><Chips multi={false} campo="tipoVenda" value={d.tipoVenda} onChange={(v) => set('tipoVenda', v)} /></Field>
        <Field label="Público principal de venda"><Chips multi={false} campo="publico" value={d.publico} onChange={(v) => set('publico', v)} /></Field>
      </section>
      <section className="card form">
        <h3>Formato e requisitos</h3>
        <div className="grid2">
          <Field label="Tipo de contrato"><Chips multi={false} opts={Object.entries(CONTRATOS)} value={d.contrato} onChange={(v) => set('contrato', v)} /></Field>
          <Field label="Carga horária"><Chips multi={false} opts={Object.entries(CARGAS)} value={d.carga} onChange={(v) => set('carga', v)} /></Field>
        </div>
        <Field label="Início desejado" obrig={d.obrig.inicio} onObrig={(v) => setOb('inicio', v)}><Chips multi={false} opts={INICIOS} value={d.inicio} onChange={(v) => set('inicio', v)} /></Field>
        <Field label="Viagens"><Chips multi={false} opts={Object.entries(VIAGENS_O)} value={d.viagens} onChange={(v) => set('viagens', v)} /></Field>
        <div className="grid2">
          <Field label="Escolaridade mínima" obrig={d.obrig.escolaridade} onObrig={(v) => setOb('escolaridade', v)}>
            <select className="in" value={d.escolaridadeMin} onChange={(ev) => set('escolaridadeMin', ev.target.value)}>
              <option value="">Não exige</option>
              {ESCOLARIDADE.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="Idade (somente requisito legal)" hint="Não entra na pontuação.">
            <select className="in" value={d.idadeMinima} onChange={(ev) => set('idadeMinima', ev.target.value)}>
              {IDADE_MIN.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
        </div>
        <Field label="CNH e veículo" obrig={d.obrig.mobilidade} onObrig={(v) => setOb('mobilidade', v)}>
          <div className="grid2 tight">
            <select className="in" value={d.cnhReq} onChange={(ev) => set('cnhReq', ev.target.value)} aria-label="CNH exigida">
              {CNH_REQ.map(([k, l]) => <option key={k} value={k}>CNH: {l}</option>)}
            </select>
            <select className="in" value={d.veiculoReq} onChange={(ev) => set('veiculoReq', ev.target.value)} aria-label="Veículo exigido">
              {VEICULO_O.map(([k, l]) => <option key={k} value={k}>Veículo: {l}</option>)}
            </select>
          </div>
        </Field>
        <Field label="Ferramentas usadas na função"><Chips campo="ferramenta" value={d.ferramentas || []} onChange={(v) => set('ferramentas', v)} /></Field>
        <Field label="Idiomas desejáveis"><Chips campo="idioma" value={d.idiomas || []} onChange={(v) => set('idiomas', v)} /></Field>
      </section>
      <section className="card form">
        <h3>Local e rotina</h3>
        <div className="grid2">
          <Field label="Cidade de trabalho" obrig={d.obrig.local} onObrig={(v) => setOb('local', v)}>
            <SelectOutros campo="cidade" value={d.cidade} onChange={(v) => set('cidade', v)} />
          </Field>
          <Field label="Bairro ou referência"><input className="in" value={d.bairro} onChange={(e) => set('bairro', e.target.value)} /></Field>
        </div>
        <Field label="Modalidade oferecida"><Chips multi={false} campo="modalidade" value={d.modalidade} onChange={(v) => set('modalidade', v)} /></Field>
        <Field label="Turnos necessários" obrig={d.obrig.turno} onObrig={(v) => setOb('turno', v)}><Chips campo="turno" value={d.turnos} onChange={(v) => v.length && set('turnos', v)} /></Field>
        <Field label="Dias necessários" obrig={d.obrig.dias} onObrig={(v) => setOb('dias', v)}><Chips campo="dia" value={d.dias} onChange={(v) => v.length && set('dias', v)} /></Field>
      </section>
      <section className="card form">
        <h3>Remuneração</h3>
        <Field label="Faixa salarial fixa">
          <div className="grid2 tight">
            <div className="money-in"><span>de R$</span><input className="in" type="number" step="50" value={d.salarioMin} onChange={(e) => set('salarioMin', Number(e.target.value) || 0)} /></div>
            <div className="money-in"><span>até R$</span><input className="in" type="number" step="50" value={d.salarioMax} onChange={(e) => set('salarioMax', Number(e.target.value) || 0)} /></div>
          </div>
        </Field>
        <Field label="Benefícios oferecidos"><Chips campo="beneficio" value={d.beneficios || []} onChange={(v) => set('beneficios', v)} /></Field>
        <Field label="Política de comissão">
          <Switch checked={d.comissao.tem} onChange={(v) => set('comissao', { ...d.comissao, tem: v })} label="Oferece comissão" />
          {d.comissao.tem && <input className="in mt" placeholder="Ex.: 2% sobre vendas" value={d.comissao.desc} onChange={(e) => set('comissao', { ...d.comissao, desc: e.target.value })} />}
        </Field>
      </section>
      <section className="card form">
        <h3>Competências e requisitos</h3>
        <Field label="Competências essenciais" hint="Valem o dobro na pontuação."><Chips campo="competencia" value={d.essenciais} onChange={(v) => set('essenciais', v)} /></Field>
        <Field label="Competências desejáveis"><Chips campo="competencia" value={d.desejaveis} onChange={(v) => set('desejaveis', v)} /></Field>
        <Field label="Abertura a iniciantes" hint={d.aceitaIniciante ? 'A falta de experiência formal não elimina o candidato.' : 'Requisito obrigatório: elimina quem tem menos experiência que o mínimo.'}>
          <Switch checked={d.aceitaIniciante} onChange={(v) => set('aceitaIniciante', v)} label="Aceito iniciantes" />
          {!d.aceitaIniciante && (
            <select className="in mt" value={d.experienciaMin} onChange={(e) => set('experienciaMin', Number(e.target.value))}>
              {EXPERIENCIA.map(([v, l]) => <option key={v} value={v}>Mínimo: {l}</option>)}
            </select>
          )}
        </Field>
        <div className="grid2">
          <Field label="O que a empresa oferece"><textarea className="in" rows={2} value={d.oferece} onChange={(e) => set('oferece', e.target.value)} /></Field>
          <Field label="Preferências da empresa" hint="Texto livre, visível ao candidato."><textarea className="in" rows={2} value={d.preferencias} onChange={(e) => set('preferencias', e.target.value)} /></Field>
        </div>
      </section>
      <div className="savebar">
        <span className="muted small">{dirty ? 'Alterações não salvas' : 'Oportunidade salva'}</span>
        <Btn kind="ghost" disabled={!dirty} onClick={() => setD(structuredClone(db.oportunidades[oppId]))}>Descartar</Btn>
        <Btn kind="lime" disabled={!dirty} onClick={salvar}>Salvar e recalcular ranking</Btn>
      </div>
    </>
  );
}

// ================= Perfis recomendados =================
function CandCard({ c, o, r, pos }) {
  const { db, openModal } = useContext(Ctx);
  const match = db.matches[`${c.id}|${o.id}`];
  const treinos = Object.entries(c.treinos).filter(([, t]) => t.score >= 50);
  const top = topMotivos(r.re);
  return (
    <article className="card opp">
      <div className="opp-h">
        <div className="who-row">
          <Avatar foto={c.foto} nome={match ? c.nome : c.exib} size={56} oculta={!match} />
          <div>
          <div className="rank">#{pos} nesta oportunidade</div>
          <h2>{match ? c.nome : c.exib}</h2>
          <div className="muted">{c.cidade} · {c.experiencia === 0 ? 'Primeira oportunidade em vendas' : expTxt(c.experiencia)}{!match && <> · <IcLock size={13} /> nome completo, foto e contatos após o match</>}</div>
          </div>
        </div>
        <Score v={r.total} />
      </div>
      <p className="sobre">“{c.sobre}”</p>
      <div className="fatos">
        <Fato ic={<IcCoin size={15} />} l="Pretensão fixa" v={`a partir de ${brl(c.salarioMin)}`} strong />
        <Fato l="Comissão" v={{ sim: 'Tem interesse', indiferente: 'Indiferente', nao: 'Prefere só fixo' }[c.comissao]} />
        <Fato ic={<IcClock size={15} />} l="Disponibilidade" v={`${turnosTxt(c.turnos)} · ${diasTxt(c.dias)}`} strong />
        <Fato ic={<IcPin size={15} />} l="Pode atuar em" v={lista(c.cidades)} strong />
        <Fato l="Modalidade" v={lista(c.modalidades.map((m) => MODAL[m]))} />
        <Fato l="Prefere" v={lista(c.tiposVenda.map((t) => TIPOS[t]))} />
        <Fato l="Escolaridade" v={escLabel(c.escolaridade)} strong />
        <Fato l="Pode começar" v={inicioLabel(c.inicio)} strong />
        <Fato l="Contrato aceito" v={lista((c.contratos || []).map((k) => CONTRATOS[k] || k)) || '—'} />
        <Fato l="CNH e veículo" v={`${c.cnh && c.cnh !== 'nenhuma' ? 'CNH ' + c.cnh : 'Sem CNH'} · ${{ moto: 'moto', carro: 'carro' }[c.veiculo] || 'sem veículo'}`} />
        <Fato l="Ferramentas" v={lista(c.ferramentas || []) || '—'} />
        <Fato l="Idiomas" v={lista(c.idiomas || []) || '—'} />
      </div>
      <div className="badges">
        {(idade(c.nascimento) !== null || c.maior18 !== undefined) && <span className="badge light">{(idade(c.nascimento) !== null ? idade(c.nascimento) >= 18 : c.maior18) ? 'Maior de 18 anos' : 'Menor de 18 anos'}</span>}
        {c.cursos && <span className="badge light">{c.cursos}</span>}
        {c.viagens && <span className="badge light">{VIAGENS_C[c.viagens]}</span>}
      </div>
      {treinos.length > 0 && (
        <div className="badges">{treinos.map(([k, t]) => <span key={k} className="badge"><Bars stage={2} size={15} /> {COMPS[k]} · {nivelTreino(t.score)} ({t.score})</span>)}</div>
      )}
      <div className="why">
        <div className="why-h">Por que este perfil foi recomendado</div>
        <Reasons list={top} />
      </div>
      <Collapse title="Ver experiências, motivos e pontuação">
        {(c.experiencias || []).length > 0 && (
          <div className="exp-view">
            <div className="why-h">Experiências</div>
            {c.experiencias.map((x, i) => <div key={i} className="small"><b>{x.cargo}</b>{x.empresa && ` · ${match ? x.empresa : x.empresa}`}{x.periodo && ` · ${x.periodo}`}{x.descricao && <div className="muted">{x.descricao}</div>}</div>)}
            {c.resultados && <div className="small"><span className="muted">Resultados:</span> {c.resultados}</div>}
          </div>
        )}
        <Breakdown partes={r.partes} />
        <Reasons list={r.re} />
        <CompsRelevantes o={o} c={c} />
        <button className="link small" onClick={() => openModal({ type: 'regras' })}><IcInfo size={14} /> Como a pontuação é calculada</button>
      </Collapse>
      <InteresseBox candId={c.id} oppId={o.id} lado="emp" />
    </article>
  );
}

export function Recomendados({ empId, oppSel, setOppSel }) {
  const { db } = useContext(Ctx);
  const opps = Object.values(db.oportunidades).filter((o) => o.empresaId === empId);
  const sel = opps.find((o) => o.id === oppSel) ? oppSel : opps[0]?.id;
  const o = db.oportunidades[sel];
  const rk = useMemo(() => (o ? rankingOportunidade(db, sel) : null), [db, sel]);
  const pend = (oid) => Object.entries(db.interesses).filter(([k, v]) => k.endsWith('|' + oid) && v.cand && !v.emp && !db.matches[k]).length;
  return (
    <div className="page">
      <div className="page-h">
        <div className="eyebrow"><Bars stage={3} /> Encontro</div>
        <h1>Perfis <span className="hl">recomendados</span></h1>
        <p className="muted">Ranking de candidatos para cada oportunidade privada. Antes do match você vê a identificação resumida e as condições de cada pessoa.</p>
      </div>
      <div className="tabs-inline">
        {opps.map((x) => <button key={x.id} className={sel === x.id ? 'on' : ''} onClick={() => setOppSel(x.id)}>{x.titulo}{pend(x.id) > 0 && <span className="dot-n">{pend(x.id)}</span>}</button>)}
      </div>
      {o && (
        <div className="card opp-sum">
          <div className="fatos">
            <Fato l="Faixa fixa" v={faixa(o)} strong />
            <Fato l="Comissão" v={o.comissao.tem ? o.comissao.desc : 'Sem comissão'} />
            <Fato l="Turno" v={`${turnosTxt(o.turnos)} · ${diasTxt(o.dias)}`} strong />
            <Fato l="Local" v={`${o.cidade} · ${MODAL[o.modalidade]}`} strong />
          </div>
          <CompsRelevantes o={o} />
          <Requisitos o={o} />
        </div>
      )}
      {rk && rk.recomendados.length === 0 && <div className="card empty">{(rk.fora || []).length ? 'Nenhum candidato atende aos requisitos obrigatórios desta oportunidade.' : 'Ainda não há candidatos cadastrados. Assim que alguém compatível se cadastrar, aparece aqui.'}</div>}
      <div className="stack">
        {rk && rk.recomendados.map((x, i) => <CandCard key={x.c.id} c={x.c} o={o} r={x.r} pos={i + 1} />)}
      </div>
      {rk && rk.fora.length > 0 && (
        <Collapse title={`Fora das recomendações (${rk.fora.length}) · requisito obrigatório não atendido`}>
          {rk.fora.map(({ c, r }) => (
            <div key={c.id} className="fora">
              <b>{c.exib}</b>
              {r.bloqueios.map((b, i) => <div key={i} className="small"><span className={`pill mini ${b.lado}`}>{b.lado === 'cand' ? 'requisito do candidato' : 'seu requisito'}</span> {b.texto}</div>)}
            </div>
          ))}
        </Collapse>
      )}
    </div>
  );
}

// ================= Plano e receita =================

// Seção pública de planos (página inicial): pacotes de créditos, pagamento único
export function PlanosPublicos() {
  const { ui, abrirLogin, openModal } = useContext(Ctx);
  const comprar = (p) => {
    if (ui.perfil?.tipo === 'emp') openModal({ type: 'comprar', empId: ui.perfil.id, plano: p.id });
    else if (ui.sessao?.emp) openModal({ type: 'comprar', empId: ui.sessao.emp, plano: p.id });
    else abrirLogin('emp');
  };
  return (
    <div className="lp-planos">
      <div className="lp-planos-h">
        <div>
          <div className="kicker">Planos para empresas</div>
          <h2 className="lp-h2">Pague por contratação.</h2>
          <p className="lp-p">Sem mensalidade: você compra créditos com pagamento único, e cada crédito vale uma contratação efetivada pela Contratei. Para quem busca emprego, criar o perfil e treinar é gratuito.</p>
        </div>
      </div>
      <div className="planos">
        {PLANOS.map((p) => (
          <div key={p.id} className={`card plano ${p.id === 'crescimento' ? 'atual' : ''}`}>
            {p.id === 'crescimento' && <span className="pill lime mini">Mais escolhido</span>}
            <h3>{p.nome}</h3>
            <div className="preco">{brl(p.preco, 2)}<span> pagamento único</span></div>
            <div className="creditos-n"><b>{p.creditos ? p.creditos : '∞'}</b><span>{p.creditos ? (p.creditos === 1 ? 'contratação' : 'contratações') : 'contratações ilimitadas'}</span></div>
            <p className="small muted">{p.creditos ? `${brl(p.preco / p.creditos, 2)} por contratação` : 'Para quem contrata com frequência'}</p>
            <ul className="plano-it">
              <li><IcCheck size={14} /> Oportunidades privadas ilimitadas</li>
              <li><IcCheck size={14} /> Ranking por compatibilidade e chat com match</li>
              <li><IcCheck size={14} /> O crédito só é usado quando você efetiva</li>
            </ul>
            <button className={p.id === 'crescimento' ? 'b-lime' : 'b-out'} onClick={() => comprar(p)}>Comprar {p.nome}</button>
          </div>
        ))}
      </div>
      <p className="small muted pay-note">Pagamento pela InfinitePay, por link seguro. Os créditos são liberados assim que o pagamento é confirmado.</p>
    </div>
  );
}
