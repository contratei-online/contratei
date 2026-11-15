import { temCredito } from './creditos.js';
import React, { useContext, useMemo, useState } from 'react';
import { Ctx } from './ctx.js';
import {
  TURNOS, DIAS, TIPOS, MODAL, FUNCOES, SEGMENTOS, CIDADES, COMPS, PRIORIDADES, EXPERIENCIA, TRILHAS, REGRA_TREINO, nivelTreino, expTxt,
  ESCOLARIDADE, CONTRATOS, CARGAS, INICIOS, VIAGENS_C, CNH, VEICULO_C, BENEFICIOS, VIAGENS_O, idade, escLabel, inicioLabel,
} from './data.js';
import { topMotivos, avaliar, rankingCandidato, brl, faixa, turnosTxt, diasTxt, diffCandidato, lista } from './engine.js';
import {
  BancoOutros, SelectOutros, Avatar, reduzirFoto, Btn, Chips, Field, Score, Reasons, Breakdown, Collapse, Bars, IcLock, IcCheck, IcChat, IcSwap, IcPin, IcClock, IcCoin, IcInfo, IcBolt, IcCal,
} from './ui.jsx';

const ent = (o) => Object.entries(o);
const FUNC_OPTS = FUNCOES.map((f) => [f, f]);
const SEG_OPTS = SEGMENTOS.map((s) => [s, s]);
const CID_OPTS = CIDADES.map((s) => [s, s]);

// ================= Meu perfil =================
export function PerfilCandidato({ candId, wizard, onConcluir }) {
  const { db, upd, openModal, toast } = useContext(Ctx);
  const [passo, setPasso] = useState(0);
  const PASSOS = ['Identificação', 'O que quero fazer', 'Onde e quando', 'Formato de trabalho', 'Remuneração', 'Experiência e competências'];
  const ver = (k) => !wizard || passo === k;
  const [d, setD] = useState(() => structuredClone(db.candidatos[candId]));
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const setOb = (k, v) => setD((x) => ({ ...x, obrig: { ...x.obrig, [k]: v } }));
  const dirty = JSON.stringify(d) !== JSON.stringify(db.candidatos[candId]);
  const itensPerfil = [d.foto, d.nascimento, d.escolaridade, d.cursos, d.sobre, d.funcoes?.length, d.segmentos?.length, d.tiposVenda?.length,
    d.publicos?.length, d.cidades?.length, d.modalidades?.length, d.turnos?.length, d.dias?.length, d.contratos?.length, d.cargas?.length,
    d.inicio, d.cnh, d.salarioMin, d.beneficios?.length, d.competencias?.length, d.desenvolver?.length, d.ferramentas?.length,
    d.idiomas?.length, d.experiencias?.length, d.resultados, d.prioridades?.length];
  const completo = Math.round((itensPerfil.filter(Boolean).length / itensPerfil.length) * 100);
  const setExp = (i, k, v) => set('experiencias', (d.experiencias || []).map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const anos = idade(d.nascimento);

  const [erroFoto, setErroFoto] = useState('');
  const escolherFoto = async (ev) => {
    const f = ev.target.files?.[0]; ev.target.value = '';
    if (!f) return;
    try { setErroFoto(''); set('foto', await reduzirFoto(f)); } catch (err) { setErroFoto(err.message); }
  };
  const completarExib = (x) => { if (!x.exib?.trim() && x.nome?.trim()) { const p = x.nome.trim().split(/\s+/); x.exib = p[0] + (p[1] ? ` ${p[p.length - 1][0]}.` : ''); } x.maior18 = idade(x.nascimento) === null ? x.maior18 : idade(x.nascimento) >= 18; return x; };
  const semFoto = (x) => JSON.stringify({ ...x, foto: null });
  const salvar = () => {
    if (semFoto(d) === semFoto(db.candidatos[candId])) {
      upd((x) => { x.candidatos[candId] = completarExib(structuredClone(d)); });
      toast(d.foto ? 'Foto do perfil salva.' : 'Foto removida.');
      return;
    }
    const antes = db;
    const depois = structuredClone(db);
    depois.candidatos[candId] = completarExib(structuredClone(d));
    upd((x) => { x.candidatos[candId] = completarExib(structuredClone(d)); });
    openModal({ type: 'diff', titulo: 'Ranking de oportunidades recalculado', sub: 'A partir das respostas salvas no seu perfil.', rows: diffCandidato(antes, depois, candId) });
  };

  return (
    <div className="page">
      {wizard && (
        <div className="wiz">
          <div className="kicker">Cadastro de candidato</div>
          <div className="wiz-steps">{PASSOS.map((p, k) => <span key={p} className={k < passo ? 'done' : k === passo ? 'cur' : ''}><i>{k + 1}</i><b>{p}</b></span>)}</div>
        </div>
      )}
      <div className="page-h">
        <div className="eyebrow"><Bars stage={1} /> Potencial</div>
        <h1>{wizard ? <>Crie seu <span className="hl">perfil</span></> : <>Meu <span className="hl">perfil</span></>}</h1>
        <p className="muted">O que você sabe fazer, o que quer aprender e em quais condições quer trabalhar. Marque o que é <b className="t-lime">obrigatório</b> e o que é apenas <b>preferível</b>: o obrigatório tira uma oportunidade das recomendações; o preferível só muda a pontuação.</p>
      </div>

      {d.suspenso && <div className="card notice"><b>Seu perfil está suspenso pela administração.</b> Ele não aparece para as empresas enquanto estiver suspenso.</div>}
      <div className="card progress-card">
        <div className="pc-top"><b>Perfil {completo}% completo</b><span className="muted small">Quanto mais completo, mais precisa fica a compatibilidade com as empresas.</span></div>
        <div className="pbar"><i style={{ width: `${completo}%` }} /></div>
      </div>

      {ver(0) && (<section className="card form">
        <h3>Identificação</h3>
        <div className="foto-row">
          <Avatar foto={d.foto} nome={d.nome} size={96} />
          <div className="foto-tx">
            <div className="field-l">Foto do perfil</div>
            <div className="field-hint">Opcional. Para proteger sua privacidade, a empresa só vê a foto depois do match. Antes disso, aparecem suas iniciais.</div>
            <div className="foto-btns">
              <label className="btn btn-lime btn-sm">
                <input type="file" accept="image/*" className="sr-only" onChange={escolherFoto} />
                {d.foto ? 'Trocar foto' : 'Enviar foto'}
              </label>
              {d.foto && <Btn kind="ghost" size="sm" onClick={() => set('foto', null)}>Remover</Btn>}
            </div>
            {erroFoto && <div className="small" style={{ color: 'var(--red)' }}>{erroFoto}</div>}
          </div>
        </div>
        <div className="grid2">
          <Field label="Nome completo" hint="Privado. Só aparece para a empresa depois do match.">
            <input className="in" value={d.nome} onChange={(e) => set('nome', e.target.value)} />
          </Field>
          <Field label="Identificação resumida" hint="Como as empresas veem você antes do match.">
            <input className="in" value={d.exib} onChange={(e) => set('exib', e.target.value)} />
          </Field>
          <Field label="Cidade onde mora">
            <SelectOutros campo="cidade" value={d.cidade} onChange={(v) => set('cidade', v)} />
          </Field>
        </div>
        <div className="grid2">
          <Field label="Data de nascimento" hint="Privada. Usada só para requisitos legais (maioridade ou jovem aprendiz). Não entra na pontuação e não aparece para empresas.">
            <input className="in" type="date" value={d.nascimento || ''} onChange={(e) => set('nascimento', e.target.value)} />
            {anos !== null && <span className="small muted">{anos} anos · empresas veem apenas “{anos >= 18 ? 'maior de 18 anos' : 'menor de 18 anos'}”</span>}
          </Field>
          <Field label="Escolaridade">
            <select className="in" value={d.escolaridade || ''} onChange={(e) => set('escolaridade', e.target.value)}>
              <option value="" disabled>Selecione</option>
              {ESCOLARIDADE.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Cursos e certificações" hint="Ex.: técnico, faculdade, cursos livres.">
          <input className="in" value={d.cursos || ''} onChange={(e) => set('cursos', e.target.value)} />
        </Field>
        <Field label="Sobre você" hint="Visível para as empresas recomendadas.">
          <textarea className="in" rows={2} value={d.sobre} onChange={(e) => set('sobre', e.target.value)} />
        </Field>
      </section>)}

      {ver(1) && (<section className="card form">
        <h3>O que quero fazer</h3>
        <Field label="Funções em que deseja atuar">
          <Chips campo="funcao" value={d.funcoes} onChange={(v) => set('funcoes', v)} />
        </Field>
        <Field label="Segmentos" obrig={d.obrig.segmento} onObrig={(v) => setOb('segmento', v)}>
          <Chips campo="segmento" value={d.segmentos} onChange={(v) => set('segmentos', v)} />
        </Field>
        <Field label="Tipo de venda que prefere" obrig={d.obrig.tipoVenda} onObrig={(v) => setOb('tipoVenda', v)}>
          <Chips campo="tipoVenda" value={d.tiposVenda} onChange={(v) => set('tiposVenda', v)} />
        </Field>
        <Field label="Para quem gosta de vender">
          <Chips campo="publico" value={d.publicos || []} onChange={(v) => set('publicos', v)} />
        </Field>
      </section>)}

      {ver(2) && (<section className="card form">
        <h3>Onde e quando</h3>
        <Field label="Cidades em que pode trabalhar" hint="Disponibilidade de deslocamento." obrig={d.obrig.local} onObrig={(v) => setOb('local', v)}>
          <Chips campo="cidade" value={d.cidades} onChange={(v) => set('cidades', v)} />
        </Field>
        <Field label="Modalidade de trabalho" obrig={d.obrig.modalidade} onObrig={(v) => setOb('modalidade', v)}>
          <Chips campo="modalidade" value={d.modalidades} onChange={(v) => set('modalidades', v)} />
        </Field>
        <Field label="Turnos disponíveis" obrig={d.obrig.turno} onObrig={(v) => setOb('turno', v)}>
          <Chips campo="turno" value={d.turnos} onChange={(v) => set('turnos', v)} />
        </Field>
        <Field label="Dias disponíveis" obrig={d.obrig.dias} onObrig={(v) => setOb('dias', v)}>
          <Chips campo="dia" value={d.dias} onChange={(v) => set('dias', v)} />
        </Field>
      </section>)}

      {ver(3) && (<section className="card form">
        <h3>Formato de trabalho</h3>
        <Field label="Tipos de contrato que aceita" obrig={d.obrig.contrato} onObrig={(v) => setOb('contrato', v)}>
          <Chips opts={Object.entries(CONTRATOS)} value={d.contratos || []} onChange={(v) => set('contratos', v)} />
        </Field>
        <Field label="Carga horária" obrig={d.obrig.carga} onObrig={(v) => setOb('carga', v)}>
          <Chips opts={Object.entries(CARGAS)} value={d.cargas || []} onChange={(v) => set('cargas', v)} />
        </Field>
        <Field label="Quando pode começar">
          <Chips multi={false} opts={INICIOS} value={d.inicio} onChange={(v) => set('inicio', v)} />
        </Field>
        <Field label="Disponibilidade para viagens">
          <Chips multi={false} opts={Object.entries(VIAGENS_C)} value={d.viagens} onChange={(v) => set('viagens', v)} />
        </Field>
        <div className="grid2">
          <Field label="CNH">
            <Chips multi={false} opts={CNH} value={d.cnh} onChange={(v) => set('cnh', v)} />
          </Field>
          <Field label="Veículo próprio">
            <Chips multi={false} opts={VEICULO_C} value={d.veiculo} onChange={(v) => set('veiculo', v)} />
          </Field>
        </div>
      </section>)}

      {ver(4) && (<section className="card form">
        <h3>Remuneração</h3>
        <Field label="Salário fixo mínimo pretendido" obrig={d.obrig.salario} onObrig={(v) => setOb('salario', v)}>
          <div className="money-in">
            <span>R$</span>
            <input className="in" type="number" step="50" min="0" value={d.salarioMin} onChange={(e) => set('salarioMin', Number(e.target.value) || 0)} />
          </div>
        </Field>
        <Field label="Interesse em comissão">
          <Chips multi={false} opts={[['sim', 'Tenho interesse'], ['indiferente', 'Indiferente'], ['nao', 'Prefiro só fixo']]} value={d.comissao} onChange={(v) => set('comissao', v)} />
        </Field>
        <Field label="Benefícios que mais valoriza">
          <Chips campo="beneficio" value={d.beneficios || []} onChange={(v) => set('beneficios', v)} />
        </Field>
      </section>)}

      {ver(5) && (<section className="card form">
        <h3>Experiência e competências</h3>
        <Field label="Experiência em vendas ou atendimento">
          <select className="in" value={d.experiencia} onChange={(e) => set('experiencia', Number(e.target.value))}>
            {EXPERIENCIA.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Competências que já tenho" hint="Declaradas. As demonstradas em treinamento valem mais.">
          <Chips campo="competencia" value={d.competencias} onChange={(v) => set('competencias', v)} />
        </Field>
        <Field label="Áreas que quero desenvolver" hint="Contam pontos em oportunidades abertas a iniciantes.">
          <Chips campo="competencia" value={d.desenvolver} onChange={(v) => set('desenvolver', v)} />
        </Field>
        <Field label="Ferramentas que sabe usar">
          <Chips campo="ferramenta" value={d.ferramentas || []} onChange={(v) => set('ferramentas', v)} />
        </Field>
        <Field label="Idiomas">
          <Chips campo="idioma" value={d.idiomas || []} onChange={(v) => set('idiomas', v)} />
        </Field>
        <Field label="Experiências anteriores" hint="Formais ou informais: loja da família, feiras, vendas por conta própria, voluntariado.">
          <div className="exps">
            {(d.experiencias || []).map((x, i) => (
              <div key={i} className="exp">
                <div className="grid3">
                  <input className="in" placeholder="Cargo ou atividade" value={x.cargo} onChange={(e) => setExp(i, 'cargo', e.target.value)} />
                  <input className="in" placeholder="Onde" value={x.empresa} onChange={(e) => setExp(i, 'empresa', e.target.value)} />
                  <input className="in" placeholder="Quanto tempo" value={x.periodo} onChange={(e) => setExp(i, 'periodo', e.target.value)} />
                </div>
                <textarea className="in" rows={2} placeholder="O que você fazia e o que vendia" value={x.descricao} onChange={(e) => setExp(i, 'descricao', e.target.value)} />
                <button type="button" className="link small" onClick={() => set('experiencias', d.experiencias.filter((_, j) => j !== i))}>Remover experiência</button>
              </div>
            ))}
            <Btn kind="ghost" size="sm" onClick={() => set('experiencias', [...(d.experiencias || []), { cargo: '', empresa: '', periodo: '', descricao: '' }])}>+ Adicionar experiência</Btn>
          </div>
        </Field>
        <Field label="Conquistas e resultados" hint="Metas batidas, elogios de clientes, números que mostram seu trabalho.">
          <textarea className="in" rows={2} value={d.resultados || ''} onChange={(e) => set('resultados', e.target.value)} />
        </Field>
        <Field label="Prioridades na escolha de um trabalho" hint="Até 3.">
          <Chips campo="prioridade" value={d.prioridades} onChange={(v) => set('prioridades', v)} max={3} />
        </Field>
      </section>)}

      {!wizard && <BancoOutros />}

      {wizard ? (
        <div className="savebar wiz-bar">
          <span className="muted small">Passo {passo + 1} de {PASSOS.length} · {PASSOS[passo]}</span>
          {passo > 0 && <Btn kind="ghost" onClick={() => { setPasso(passo - 1); window.scrollTo(0, 0); }}>Voltar</Btn>}
          {passo < PASSOS.length - 1
            ? <Btn kind="lime" onClick={() => {
              const falta = passo === 0 ? (!d.nome?.trim() && 'Informe seu nome completo.') : passo === 1 ? (!d.funcoes.length && 'Escolha pelo menos uma função.') : passo === 2 ? (!d.turnos.length && 'Marque pelo menos um turno.') : '';
              if (falta) { toast(falta); return; }
              upd((x) => { x.candidatos[candId] = completarExib(structuredClone(d)); });
              setPasso(passo + 1); window.scrollTo(0, 0);
            }}>Salvar e continuar</Btn>
            : <Btn kind="lime" onClick={() => { upd((x) => { x.candidatos[candId] = completarExib(structuredClone(d)); }); onConcluir && onConcluir(); }}>Concluir cadastro e ver oportunidades</Btn>}
        </div>
      ) : <div className="savebar">
        <span className="muted small">{dirty ? 'Alterações não salvas' : 'Perfil salvo'}</span>
        <Btn kind="ghost" disabled={!dirty} onClick={() => setD(structuredClone(db.candidatos[candId]))}>Descartar</Btn>
        <Btn kind="lime" disabled={!dirty} onClick={salvar}>Salvar e recalcular ranking</Btn>
      </div>}
    </div>
  );
}

// ================= Oportunidades =================
export function Fato({ ic, l, v, strong }) {
  return (
    <div className="fato">
      <span className="fato-l">{ic}{l}</span>
      <span className={`fato-v ${strong ? 'strong' : ''}`}>{v}</span>
    </div>
  );
}

export function InteresseBox({ candId, oppId, lado }) {
  const { db, interesse, retirar, switchTo, openThread, openModal } = useContext(Ctx);
  const key = `${candId}|${oppId}`;
  const it = db.interesses[key] || { cand: false, emp: false };
  const outro = lado === 'cand' ? 'emp' : 'cand';
  const match = db.matches[key];
  const opp = db.oportunidades[oppId];

  if (match) {
    return (
      <div className="ibox match">
        <span className="pill lime"><IcCheck size={14} /> Deu match</span>
        <Btn kind="lime" onClick={() => openThread(key)}><IcChat size={16} /> Abrir conversa</Btn>
      </div>
    );
  }
  if (it[lado]) {
    return (
      <div className="ibox sent">
        <div className="ibox-row">
          <span className="pill"><IcCheck size={14} /> Interesse enviado</span>
          <span className="muted small">Aguardando interesse da outra parte</span>
        </div>
        <div className="locked"><IcLock size={14} /> Chat fechado até o interesse ser recíproco</div>
        <div className="ibox-row">
          <button className="link" onClick={() => retirar(candId, oppId, lado)}>Retirar interesse</button>
        </div>
      </div>
    );
  }
  if (lado === 'emp' && !temCredito(db, opp.empresaId)) {
    return (
      <div className="ibox">
        {it[outro] && <div className="incoming"><IcBolt size={14} /> Este candidato já demonstrou interesse em você</div>}
        <div className="locked"><IcLock size={14} /> Você precisa de pelo menos 1 crédito de contratação para demonstrar interesse. O crédito só é descontado quando você efetiva.</div>
        <Btn kind="lime" size="lg" onClick={() => openModal({ type: 'comprar', empId: opp.empresaId })}>Comprar créditos</Btn>
      </div>
    );
  }
  return (
    <div className="ibox">
      {it[outro] && <div className="incoming"><IcBolt size={14} /> {lado === 'cand' ? 'A empresa' : 'Este candidato'} já demonstrou interesse em você</div>}
      <Btn kind="lime" size="lg" onClick={() => interesse(candId, oppId, lado)}>Tenho interesse</Btn>
      <span className="muted small">O chat só abre se os dois lados tiverem interesse.</span>
    </div>
  );
}

export function CompsRelevantes({ o, c }) {
  const st = (k) => (c?.treinos?.[k]?.score >= 50 ? 'demo' : c?.competencias.includes(k) ? 'decl' : '');
  return (
    <div className="comps">
      <div><span className="muted small">Essenciais nesta função</span>
        <div className="chips static">{o.essenciais.map((k) => <span key={k} className={`chip ${st(k)}`}>{st(k) === 'demo' && <IcCheck size={13} />}{COMPS[k]}</span>)}</div>
      </div>
      {o.desejaveis.length > 0 && <div><span className="muted small">Desejáveis</span>
        <div className="chips static">{o.desejaveis.map((k) => <span key={k} className={`chip ${st(k)}`}>{st(k) === 'demo' && <IcCheck size={13} />}{COMPS[k]}</span>)}</div>
      </div>}
      {c && <div className="legend small muted"><span className="chip demo mini">demonstrada</span> <span className="chip decl mini">declarada</span></div>}
    </div>
  );
}

export function Requisitos({ o }) {
  const itens = [
    ['Escolaridade mínima', o.escolaridadeMin ? escLabel(o.escolaridadeMin) + (o.obrig?.escolaridade ? ' (obrigatória)' : '') : 'Não exige'],
    ['CNH e veículo', [o.cnhReq && `CNH ${o.cnhReq}`, o.veiculoReq && `veículo próprio`].filter(Boolean).join(' e ') || 'Não exige'],
    ['Viagens', VIAGENS_O[o.viagens] || '—'],
    ['Ferramentas', lista(o.ferramentas || []) || '—'],
    ['Idiomas', lista(o.idiomas || []) || 'Não exige'],
    ['Idade', o.idadeMinima === 'aprendiz' ? 'Aceita jovem aprendiz' : 'Maior de 18 anos (requisito legal)'],
  ];
  return (
    <div className="reqs">
      {itens.map(([l, v]) => <div key={l}><span className="muted small">{l}</span><b className="small">{v}</b></div>)}
    </div>
  );
}

function OppCard({ c, o, r, pos }) {
  const { db, go, openModal } = useContext(Ctx);
  const emp = db.empresas[o.empresaId];
  const match = db.matches[`${c.id}|${o.id}`];
  const top = topMotivos(r.rc);
  const dica = r.dicas[0];
  return (
    <article className="card opp">
      <div className="opp-h">
        <div>
          <div className="rank">#{pos} para você</div>
          <h2>{o.titulo}</h2>
          <div className="muted">{match ? <b className="t-white">{emp.nome}</b> : <><IcLock size={13} /> {emp.resumo}</>}</div>
        </div>
        <Score v={r.total} />
      </div>
      <div className="fatos">
        <Fato ic={<IcCoin size={15} />} l="Salário fixo" v={faixa(o)} strong />
        <Fato l="Comissão" v={o.comissao.tem ? o.comissao.desc : 'Sem comissão'} />
        <Fato ic={<IcClock size={15} />} l="Turno" v={`${turnosTxt(o.turnos)} · ${diasTxt(o.dias)}`} strong />
        <Fato ic={<IcPin size={15} />} l="Região" v={`${o.cidade}${o.bairro ? ' · ' + o.bairro : ''}`} strong />
        <Fato l="Modalidade" v={MODAL[o.modalidade]} />
        <Fato l="Tipo de venda" v={TIPOS[o.tipoVenda]} />
        <Fato l="Contrato e carga" v={`${CONTRATOS[o.contrato] || '—'} · ${CARGAS[o.carga] || '—'}`} strong />
        <Fato l="Início" v={inicioLabel(o.inicio)} />
        <Fato l="Benefícios" v={lista((o.beneficios || []).map((b) => BENEFICIOS[b] || b)) || '—'} />
      </div>
      <div className="why">
        <div className="why-h">Por que vocês foram aproximados</div>
        <Reasons list={top} />
      </div>
      <Collapse title="Ver todos os motivos e a pontuação">
        <Breakdown partes={r.partes} />
        <Reasons list={r.rc} />
        <CompsRelevantes o={o} c={c} />
        <Requisitos o={o} />
        {o.oferece && <p className="small"><span className="muted">A empresa oferece:</span> {o.oferece}</p>}
        <button className="link small" onClick={() => openModal({ type: 'regras' })}><IcInfo size={14} /> Como a pontuação é calculada</button>
      </Collapse>
      {dica && !match && (
        <button className="tip" onClick={() => go('treinos', { trilha: dica.k })}>
          <Bars stage={2} size={18} /> <span>Faça a trilha <b>{COMPS[dica.k]}</b> ({dica.w === 2 ? 'essencial' : 'desejável'} nesta função) para mostrar essa competência e subir no ranking.</span>
        </button>
      )}
      <InteresseBox candId={c.id} oppId={o.id} lado="cand" />
    </article>
  );
}

export function Oportunidades({ candId }) {
  const { db } = useContext(Ctx);
  const c = db.candidatos[candId];
  const rk = useMemo(() => rankingCandidato(db, candId), [db, candId]);
  return (
    <div className="page">
      <div className="page-h">
        <div className="eyebrow"><Bars stage={3} /> Encontro</div>
        <h1>Oportunidades <span className="hl">para você</span></h1>
        <p className="muted">Oportunidades privadas: só aparecem para perfis compatíveis. Ordenadas pela pontuação calculada a partir das suas respostas salvas.</p>
      </div>
      {rk.recomendadas.length === 0 && rk.fora.length === 0 && <div className="card empty">Ainda não há oportunidades abertas. Assim que uma empresa compatível publicar uma vaga, ela aparece aqui.</div>}
      {rk.recomendadas.length === 0 && rk.fora.length > 0 && <div className="card empty">Nenhuma oportunidade atende aos seus requisitos obrigatórios. Revise o que marcou como obrigatório no seu perfil.</div>}
      <div className="stack">
        {rk.recomendadas.map((x, i) => <OppCard key={x.o.id} c={c} o={x.o} r={x.r} pos={i + 1} />)}
      </div>
      {rk.fora.length > 0 && (
        <Collapse title={`Fora das recomendações (${rk.fora.length}) · requisito obrigatório não atendido`}>
          <p className="small muted">Estas oportunidades não aparecem no seu ranking e não recebem nota.</p>
          {rk.fora.map(({ o, r }) => (
            <div key={o.id} className="fora">
              <b>{o.titulo}</b>
              {r.bloqueios.map((b, i) => <div key={i} className="small"><span className={`pill mini ${b.lado}`}>{b.lado === 'cand' ? 'seu requisito' : 'requisito da empresa'}</span> {b.texto}</div>)}
            </div>
          ))}
        </Collapse>
      )}
    </div>
  );
}

// ================= Treinamentos =================
export function CobrancaAviso() {
  return (
    <div className="card notice gratis">
      <div className="notice-h"><IcInfo size={16} /> Gratuito para quem busca emprego</div>
      <p className="small">Criar o perfil, fazer os treinamentos, receber recomendações e conversar com as empresas não custa nada para você. Quem paga a Contratei são as empresas, por contratação.</p>
    </div>
  );
}

export function Treinamentos({ candId, trilhaInicial }) {
  const { db, upd, openModal } = useContext(Ctx);
  const c = db.candidatos[candId];
  const [ativa, setAtiva] = useState(trilhaInicial || null);
  const rk = useMemo(() => rankingCandidato(db, candId), [db, candId]);
  const feitas = TRILHAS.filter((t) => c.treinos[t.comp]?.score >= 50).length;

  if (ativa) {
    const tr = TRILHAS.find((t) => t.comp === ativa);
    return (
      <Runner tr={tr} onExit={() => setAtiva(null)} onDone={(score) => {
        const antes = db;
        const depois = structuredClone(db);
        const prev = depois.candidatos[candId].treinos[tr.comp];
        const best = !prev || score > prev.score ? { score, data: Date.now() } : prev;
        depois.candidatos[candId].treinos[tr.comp] = best;
        upd((x) => { x.candidatos[candId].treinos[tr.comp] = best; });
        setAtiva(null);
        openModal({ type: 'treino', comp: tr.comp, score, best: best.score, rows: diffCandidato(antes, depois, candId) });
      }} />
    );
  }

  return (
    <div className="page">
      <div className="page-h">
        <div className="eyebrow"><Bars stage={2} /> Preparo</div>
        <h1><span className="hl">Treinamentos</span></h1>
        <p className="muted">Trilhas curtas com situações reais de venda. Cada trilha concluída registra uma competência demonstrada, que destaca você nas oportunidades em que ela importa.</p>
      </div>
      <div className="card progress-card">
        <div className="pc-top"><b>Seu preparo</b><span className="muted">{feitas} de {TRILHAS.length} competências demonstradas</span></div>
        <div className="pbar"><i style={{ width: `${(feitas / TRILHAS.length) * 100}%` }} /></div>
        <div className="small muted sim-tag"><span className="pill mini">Simulação de qualificação</span> Exercícios dentro da Contratei, sem atividade produtiva para nenhuma empresa.</div>
      </div>
      <div className="grid-trilhas">
        {TRILHAS.map((t) => {
          const res = c.treinos[t.comp];
          const relevantes = rk.recomendadas.filter(({ o }) => o.essenciais.includes(t.comp) || o.desejaveis.includes(t.comp));
          return (
            <div key={t.comp} className={`card trilha ${t.destaque ? 'destaque' : ''}`}>
              <div className="trilha-h">
                <h3>{t.titulo}</h3>
                <span className="muted small">{t.duracao} · {t.questoes.length} situações</span>
              </div>
              <p className="small muted">{t.resumo}</p>
              {res ? (
                <div className="tres">
                  <div className="pbar sm"><i style={{ width: `${res.score}%` }} /></div>
                  <span className="small"><b className={res.score >= 50 ? 't-lime' : ''}>{nivelTreino(res.score)}</b> · {res.score}/100</span>
                </div>
              ) : <div className="small muted">Ainda não feita</div>}
              <div className="small rel">{relevantes.length
                ? <>Relevante em {relevantes.length} {relevantes.length > 1 ? 'oportunidades recomendadas' : 'oportunidade recomendada'} para você</>
                : <span className="muted">Não é pedida nas suas oportunidades atuais</span>}</div>
              <Btn kind={res ? 'ghost' : 'lime'} onClick={() => setAtiva(t.comp)}>{res ? 'Refazer trilha' : 'Começar'}</Btn>
            </div>
          );
        })}
      </div>
      <div className="card rule"><div className="notice-h"><IcInfo size={16} /> Regra de registro da competência</div><p className="small">{REGRA_TREINO}</p></div>
      <CobrancaAviso />
    </div>
  );
}

function Runner({ tr, onExit, onDone }) {
  const [i, setI] = useState(0);
  const [esc, setEsc] = useState(null);
  const [pts, setPts] = useState([]);
  const q = tr.questoes[i];
  const ultima = i === tr.questoes.length - 1;
  const escolher = (j) => { if (esc === null) setEsc(j); };
  const prox = () => {
    const np = [...pts, q.opcoes[esc].p];
    if (ultima) onDone(Math.round(np.reduce((a, b) => a + b, 0) / np.length));
    else { setPts(np); setI(i + 1); setEsc(null); }
  };
  return (
    <div className="page runner">
      <div className="runner-top">
        <button className="link" onClick={onExit}>← Sair da trilha</button>
        <span className="pill mini">Simulação de qualificação</span>
      </div>
      <div className="eyebrow"><Bars stage={2} /> {tr.titulo}</div>
      <div className="steps">{tr.questoes.map((_, k) => <i key={k} className={k < i || (k === i && esc !== null) ? 'done' : k === i ? 'cur' : ''} />)}</div>
      <div className="card q">
        <div className="muted small">Situação {i + 1} de {tr.questoes.length}</div>
        <p className="cenario">{q.cenario}</p>
        <h2>{q.pergunta}</h2>
        <div className="opts">
          {q.opcoes.map((op, j) => {
            const st = esc === null ? '' : j === esc ? (op.p === 100 ? 'best' : op.p === 50 ? 'mid' : 'bad') : 'dim';
            return (
              <button key={j} className={`opt ${st}`} onClick={() => escolher(j)} disabled={esc !== null && j !== esc}>
                <span className="opt-k">{String.fromCharCode(65 + j)}</span>
                <span>{op.t}</span>
              </button>
            );
          })}
        </div>
        {esc !== null && (
          <div className={`fb ${q.opcoes[esc].p === 100 ? 'best' : q.opcoes[esc].p === 50 ? 'mid' : 'bad'}`}>
            <div className="fb-h">{q.opcoes[esc].p === 100 ? 'Ótima resposta' : q.opcoes[esc].p === 50 ? 'Resposta aceitável' : 'Resposta fraca'} · {q.opcoes[esc].p} pontos</div>
            <p>{q.opcoes[esc].f}</p>
            {q.opcoes[esc].p < 100 && <p className="small muted">Melhor resposta: {String.fromCharCode(65 + q.opcoes.findIndex((o) => o.p === 100))}. {q.opcoes.find((o) => o.p === 100).t}</p>}
            <Btn kind="lime" onClick={prox}>{ultima ? 'Concluir trilha' : 'Próxima situação'}</Btn>
          </div>
        )}
      </div>
      <p className="small muted">{REGRA_TREINO}</p>
    </div>
  );
}
