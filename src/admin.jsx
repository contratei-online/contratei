import React, { useContext, useMemo, useState } from 'react';
import { Ctx } from './ctx.js';
import { COMPS, PLANOS, DEMO_IDS, escLabel, nivelTreino } from './data.js';
import { avaliar, brl, lista, turnosTxt, diasTxt, topMotivos } from './engine.js';
import { CAMPOS } from './outros.js';
import { saldo, saldoTxt, plano as planoDe, STATUS_PEDIDO } from './creditos.js';
import { Btn, Modal, Avatar, Reasons, Breakdown, IcShield, IcUser, IcBuilding, IcChat, IcCheck, IcLock, IcBolt } from './ui.jsx';
import { ETAPAS } from './chat.jsx';

const ABAS = [['geral', 'Visão geral'], ['pagamentos', 'Pagamentos e créditos'], ['dados', 'Dados da empresa'], ['candidatos', 'Candidatos'], ['empresas', 'Empresas e vagas'], ['conexoes', 'Conexões'], ['sugestoes', 'Sugestões de match'], ['outros', 'Banco “Outros”']];

function completude(c) {
  const it = [c.foto, c.nascimento || c.maior18 !== undefined, c.escolaridade, c.cursos, c.sobre, c.funcoes?.length, c.segmentos?.length, c.tiposVenda?.length,
    c.publicos?.length, c.cidades?.length, c.modalidades?.length, c.turnos?.length, c.dias?.length, c.contratos?.length, c.cargas?.length,
    c.inicio, c.cnh, c.salarioMin, c.beneficios?.length, c.competencias?.length, c.desenvolver?.length, c.ferramentas?.length,
    c.idiomas?.length, c.experiencias?.length, c.resultados, c.prioridades?.length];
  return Math.round((it.filter(Boolean).length / it.length) * 100);
}
const dataBR = (ts) => (ts ? new Date(ts).toLocaleDateString('pt-BR') : '—');
const ehDemo = (id) => DEMO_IDS.cand.includes(id) || DEMO_IDS.emp.includes(id) || String(id).startsWith('t_');
const csvCel = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function Admin() {
  const ctx = useContext(Ctx);
  const { db, moderar: moderarBase, removerOutro: removerBase, toast, modo, eu, fecharAdmin, openModal, restaurarDemo: restaurarBase, podeAdministrar, ui, sairAdmin } = ctx;
  const bloqueado = () => { toast('Esta conta Claude não tem permissão para alterar o banco de dados. Peça ao dono da página para te dar acesso de Editor.'); };
  const guard = (fn) => (...args) => (podeAdministrar ? fn(...args) : bloqueado());
  const upd = guard(ctx.upd);
  const moderar = guard(moderarBase);
  const removerOutro = guard(removerBase);
  const restaurarDemo = guard(restaurarBase);
  const [aba, setAba] = useState('geral');
  const [busca, setBusca] = useState('');
  const [ver, setVer] = useState(null);
  const [apagar, setApagar] = useState(null);

  const cands = Object.values(db.candidatos);
  const emps = Object.values(db.empresas);
  const opps = Object.values(db.oportunidades);
  const ints = Object.entries(db.interesses);
  const mats = Object.values(db.matches);

  const kpi = useMemo(() => {
    const reais = cands.filter((c) => !ehDemo(c.id));
    const peds = Object.values(db.pedidos || {});
    const mrr = peds.filter((p) => p.status === 'confirmado').reduce((s, p) => s + (Number(p.valor) || 0), 0);
    const aConfirmar = peds.filter((p) => p.status === 'informado' || p.status === 'aguardando').length;
    return {
      cand: cands.length, candReais: reais.length, emp: emps.length, empReais: emps.filter((e) => !ehDemo(e.id)).length, opp: opps.length,
      interesses: ints.reduce((s, [, v]) => s + (v.cand ? 1 : 0) + (v.emp ? 1 : 0), 0), matches: mats.length,
      entrevistas: mats.filter((m) => m.entrevista?.status).length, avaliacoes: mats.filter((m) => m.avaliacao?.aceita).length,
      efetivados: mats.filter((m) => m.etapa === 'efetivado').length, mrr, aConfirmar,
      compMedia: cands.length ? Math.round(cands.reduce((s, c) => s + completude(c), 0) / cands.length) : 0,
      suspensos: cands.filter((c) => c.suspenso).length + emps.filter((e) => e.suspenso).length,
    };
  }, [db]);

  // Melhores combinações ainda sem match (conexões por compatibilidade a incentivar)
  const sugestoes = useMemo(() => {
    const out = [];
    cands.filter((c) => !c.suspenso && c.funcoes.length).forEach((c) => opps.forEach((o) => {
      if (db.empresas[o.empresaId]?.suspenso) return;
      const key = `${c.id}|${o.id}`;
      if (db.matches[key]) return;
      const r = avaliar(c, o);
      if (r.elegivel) out.push({ c, o, r, key, it: db.interesses[key] || {} });
    }));
    return out.sort((a, b) => b.r.total - a.r.total).slice(0, 25);
  }, [db]);

  const filtro = (txt) => !busca || txt.toLowerCase().includes(busca.toLowerCase());

  const copiarCSV = async () => {
    const linhas = [['id', 'nome', 'exibição', 'cidade', 'funções', 'segmentos', 'tipos de venda', 'pretensão', 'escolaridade', 'completude', 'status', 'origem', 'criado em']]
      .concat(cands.map((c) => [c.id, c.nome, c.exib, c.cidade, c.funcoes.join('; '), c.segmentos.join('; '), c.tiposVenda.join('; '), c.salarioMin, escLabel(c.escolaridade), `${completude(c)}%`, c.suspenso ? 'suspenso' : 'ativo', ehDemo(c.id) ? 'teste' : 'real', dataBR(c.criadoEm)]));
    try { await navigator.clipboard.writeText(linhas.map((l) => l.map(csvCel).join(',')).join('\n')); toast('Planilha de candidatos copiada. Cole no Excel ou no Google Planilhas.'); } catch (e) { toast('Não foi possível copiar.'); }
  };

  const excluir = (alvo) => {
    upd((d) => {
      if (alvo.tipo === 'cand') {
        delete d.candidatos[alvo.id];
        Object.keys(d.interesses).forEach((k) => { if (k.startsWith(alvo.id + '|')) delete d.interesses[k]; });
        Object.keys(d.matches).forEach((k) => { if (k.startsWith(alvo.id + '|')) delete d.matches[k]; });
      } else if (alvo.tipo === 'emp') {
        const oids = Object.values(d.oportunidades).filter((o) => o.empresaId === alvo.id).map((o) => o.id);
        delete d.empresas[alvo.id];
        oids.forEach((oid) => {
          delete d.oportunidades[oid];
          Object.keys(d.interesses).forEach((k) => { if (k.endsWith('|' + oid)) delete d.interesses[k]; });
          Object.keys(d.matches).forEach((k) => { if (k.endsWith('|' + oid)) delete d.matches[k]; });
        });
      } else if (alvo.tipo === 'opp') {
        delete d.oportunidades[alvo.id];
        Object.keys(d.interesses).forEach((k) => { if (k.endsWith('|' + alvo.id)) delete d.interesses[k]; });
        Object.keys(d.matches).forEach((k) => { if (k.endsWith('|' + alvo.id)) delete d.matches[k]; });
      }
    });
    setApagar(null);
    if (podeAdministrar) toast('Cadastro excluído do banco de dados.');
  };

  const Status = ({ s }) => <span className={`pill mini ${s ? 'warn' : 'lime'}`}>{s ? 'Suspenso' : 'Ativo'}</span>;
  const Origem = ({ id }) => <span className={`pill mini ${ehDemo(id) ? '' : 'cand'}`}>{ehDemo(id) ? 'Teste' : 'Real'}</span>;

  return (
    <div className="page admin">
      <div className="admin-h">
        <div>
          <div className="eyebrow"><IcShield size={15} /> Administração</div>
          <h1>Painel <span className="hl">admin</span></h1>
          <p className="muted small">{modo === 'online' ? 'Conectado ao banco de dados compartilhado. Alterações aqui valem para todos os usuários.' : 'Modo local: dados apenas deste navegador.'}</p>
        </div>
        <span className="acts-cel"><Btn kind="ghost" onClick={fecharAdmin}>Fechar painel</Btn>{ui.sessao?.admin && <Btn kind="ghost" onClick={sairAdmin}>Sair do admin</Btn>}</span>
      </div>
      {!podeAdministrar && <div className="card notice"><b>Modo somente leitura.</b> Você entrou com o login de administrador, mas a sua conta Claude não tem permissão de edição nesta página. Para confirmar pagamentos, liberar créditos ou moderar cadastros, o dono da página precisa te dar acesso de Editor.</div>}

      <div className="tabs-inline admin-tabs">
        {ABAS.map(([k, l]) => <button key={k} className={aba === k ? 'on' : ''} onClick={() => setAba(k)}>{l}</button>)}
      </div>

      {['candidatos', 'empresas', 'conexoes'].includes(aba) && (
        <input className="in admin-busca" placeholder="Buscar por nome, cidade, função, vaga…" value={busca} onChange={(e) => setBusca(e.target.value)} />
      )}

      {aba === 'geral' && (
        <>
          <div className="kpis">
            {[['Candidatos', kpi.cand, `${kpi.candReais} reais`], ['Empresas', kpi.emp, `${kpi.empReais} reais`], ['Oportunidades', kpi.opp, 'privadas e ativas'],
              ['Interesses', kpi.interesses, 'enviados'], ['Matches', kpi.matches, 'interesse recíproco'], ['Entrevistas', kpi.entrevistas, 'agendadas ou feitas'],
              ['Avaliações 5 dias', kpi.avaliacoes, 'aceitas'], ['Efetivações', kpi.efetivados, 'contratações'], ['Receita confirmada', brl(kpi.mrr, 2), 'pacotes de créditos'], ['Pagamentos a confirmar', kpi.aConfirmar, 'pedidos'],
              ['Completude média', `${kpi.compMedia}%`, 'dos perfis'], ['Suspensos', kpi.suspensos, 'cadastros']].map(([l, v, s]) => (
              <div key={l} className="card kpi"><span className="muted small">{l}</span><b>{v}</b><span className="small muted">{s}</span></div>
            ))}
          </div>
          <div className="card funil">
            <h3>Funil de conexões</h3>
            {[['Combinações compatíveis', sugestoes.length + kpi.matches], ['Com interesse de um lado', ints.filter(([, v]) => v.cand !== v.emp).length], ['Matches', kpi.matches], ['Entrevistas', kpi.entrevistas], ['Efetivações', kpi.efetivados]].map(([l, v], i, arr) => (
              <div key={l} className="funil-r"><span>{l}</span><div className="bd-bar"><i style={{ width: `${arr[0][1] ? Math.max(4, (v / arr[0][1]) * 100) : 0}%` }} /></div><b>{v}</b></div>
            ))}
          </div>
          <div className="card">
            <h3>Cadastros mais recentes</h3>
            <table className="tbl">
              <thead><tr><th>Nome</th><th>Tipo</th><th>Origem</th><th>Criado em</th></tr></thead>
              <tbody>
                {[...cands.map((c) => ({ id: c.id, nome: c.nome || c.exib, tipo: 'Candidato', ts: c.criadoEm })), ...emps.map((e) => ({ id: e.id, nome: e.nome || '(sem nome)', tipo: 'Empresa', ts: e.criadoEm }))]
                  .sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 8)
                  .map((x) => <tr key={x.tipo + x.id}><td>{x.nome}</td><td>{x.tipo}</td><td><Origem id={x.id} /></td><td>{dataBR(x.ts)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </>
      )}

      {aba === 'pagamentos' && <Pagamentos />}
      {aba === 'dados' && <DadosEmpresa />}

      {aba === 'candidatos' && (
        <div className="card">
          <div className="row-between wrap"><h3>Candidatos ({cands.length})</h3><Btn kind="ghost" size="sm" onClick={copiarCSV}>Copiar planilha (CSV)</Btn></div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr><th>Candidato</th><th>Cidade</th><th>Funções</th><th>Completude</th><th>Treinos</th><th>Status</th><th>Origem</th><th /></tr></thead>
              <tbody>
                {cands.filter((c) => filtro(`${c.nome} ${c.exib} ${c.cidade} ${c.funcoes.join(' ')}`)).map((c) => (
                  <tr key={c.id}>
                    <td><span className="adm-who"><Avatar foto={c.foto} nome={c.nome || c.exib} size={32} /><span><b>{c.nome || '(sem nome)'}</b><small className="muted">{c.exib}</small></span></span></td>
                    <td>{c.cidade}</td>
                    <td className="small">{lista(c.funcoes) || '—'}</td>
                    <td><div className="mini-bar"><i style={{ width: `${completude(c)}%` }} /></div><small>{completude(c)}%</small></td>
                    <td className="small">{Object.entries(c.treinos).filter(([, t]) => t.score >= 50).map(([k]) => COMPS[k]).join(', ') || '—'}</td>
                    <td><Status s={c.suspenso} /></td>
                    <td><Origem id={c.id} /></td>
                    <td className="acts-cel">
                      <Btn kind="ghost" size="sm" onClick={() => setVer({ tipo: 'cand', id: c.id })}>Ver</Btn>
                      <Btn kind="ghost" size="sm" onClick={() => moderar(c.id, c.suspenso ? 'ativo' : 'suspenso')}>{c.suspenso ? 'Reativar' : 'Suspender'}</Btn>
                      <Btn kind="danger" size="sm" onClick={() => setApagar({ tipo: 'cand', id: c.id, nome: c.nome || c.exib })}>Excluir</Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {aba === 'empresas' && (
        <div className="stack">
          {emps.filter((e) => filtro(`${e.nome} ${e.resumo} ${opps.filter((o) => o.empresaId === e.id).map((o) => o.titulo).join(' ')}`)).map((e) => {
            const vagas = opps.filter((o) => o.empresaId === e.id);
            const sd = saldo(db, e.id);
            return (
              <div key={e.id} className="card">
                <div className="row-between wrap">
                  <span className="adm-who"><span className="ico-tile"><IcBuilding size={20} /></span><span><b>{e.nome || '(sem nome)'}</b><small className="muted">{e.resumo || '—'} · {e.responsavel || 'sem responsável'}</small></span></span>
                  <span className="acts-cel">
                    <span className="pill mini">{saldoTxt(sd)} · {vagas.length} {vagas.length === 1 ? 'vaga' : 'vagas'}</span>
                    <Status s={e.suspenso} /><Origem id={e.id} />
                    <Btn kind="ghost" size="sm" onClick={() => moderar(e.id, e.suspenso ? 'ativo' : 'suspenso')}>{e.suspenso ? 'Reativar' : 'Suspender'}</Btn>
                    <Btn kind="danger" size="sm" onClick={() => setApagar({ tipo: 'emp', id: e.id, nome: e.nome })}>Excluir</Btn>
                  </span>
                </div>
                <table className="tbl">
                  <thead><tr><th>Oportunidade</th><th>Faixa</th><th>Turno</th><th>Candidatos compatíveis</th><th>Interesses</th><th /></tr></thead>
                  <tbody>
                    {vagas.map((o) => {
                      const comp = cands.filter((c) => !c.suspenso && c.funcoes.length && avaliar(c, o).elegivel).length;
                      const nInt = ints.filter(([k, v]) => k.endsWith('|' + o.id) && (v.cand || v.emp)).length;
                      return (
                        <tr key={o.id}>
                          <td><b>{o.titulo}</b><div className="small muted">{o.funcao} · {o.cidade}</div></td>
                          <td>{brl(o.salarioMin)} a {brl(o.salarioMax)}</td>
                          <td className="small">{turnosTxt(o.turnos)} · {diasTxt(o.dias)}</td>
                          <td>{comp}</td><td>{nInt}</td>
                          <td><Btn kind="danger" size="sm" onClick={() => setApagar({ tipo: 'opp', id: o.id, nome: o.titulo })}>Excluir</Btn></td>
                        </tr>
                      );
                    })}
                    {!vagas.length && <tr><td colSpan={6} className="muted small">Nenhuma oportunidade cadastrada.</td></tr>}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {aba === 'conexoes' && (
        <>
          <div className="card">
            <h3>Matches ({mats.length})</h3>
            <table className="tbl">
              <thead><tr><th>Candidato</th><th>Empresa e vaga</th><th>Etapa</th><th>Entrevista</th><th>Mensagens</th><th>Desde</th></tr></thead>
              <tbody>
                {mats.filter((m) => filtro(`${db.candidatos[m.candId]?.nome} ${db.oportunidades[m.oppId]?.titulo}`)).map((m) => {
                  const c = db.candidatos[m.candId], o = db.oportunidades[m.oppId], e = db.empresas[o.empresaId];
                  return <tr key={m.id}><td>{c.nome}</td><td>{e?.nome}<div className="small muted">{o.titulo}</div></td><td><span className={`pill mini ${m.etapa === 'efetivado' ? 'lime' : ''}`}>{ETAPAS[m.etapa]}</span></td><td className="small">{m.entrevista ? `${m.entrevista.data} ${m.entrevista.hora}` : '—'}</td><td>{m.msgs.filter((x) => x.de !== 'sistema').length}</td><td>{dataBR(m.criadoEm)}</td></tr>;
                })}
                {!mats.length && <tr><td colSpan={6} className="muted small">Nenhum match ainda.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="card">
            <h3>Interesses sem reciprocidade</h3>
            <table className="tbl">
              <thead><tr><th>Candidato</th><th>Vaga</th><th>Quem demonstrou</th><th>Compatibilidade</th></tr></thead>
              <tbody>
                {ints.filter(([k, v]) => !db.matches[k] && (v.cand || v.emp)).filter(([k]) => { const [c, o] = k.split('|'); return filtro(`${db.candidatos[c]?.nome} ${db.oportunidades[o]?.titulo}`); }).map(([k, v]) => {
                  const [cid, oid] = k.split('|'); const c = db.candidatos[cid], o = db.oportunidades[oid]; const r = avaliar(c, o);
                  return <tr key={k}><td>{c.nome}</td><td>{o.titulo}</td><td>{v.cand ? 'Candidato' : 'Empresa'} <span className="muted small">(aguardando {v.cand ? 'empresa' : 'candidato'})</span></td><td>{r.elegivel ? `${r.total}/100` : 'fora (requisito)'}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {aba === 'sugestoes' && (
        <div className="card">
          <h3>Melhores combinações ainda sem match</h3>
          <p className="small muted">Calculadas pelo algoritmo de compatibilidade sobre todos os perfis do banco. O match continua dependendo do interesse dos dois lados; use esta lista para acompanhar e incentivar as conexões.</p>
          <table className="tbl">
            <thead><tr><th>Pontos</th><th>Candidato</th><th>Vaga</th><th>Principais motivos</th><th>Situação</th></tr></thead>
            <tbody>
              {sugestoes.map((s) => (
                <tr key={s.key}>
                  <td><b className="pts">{s.r.total}</b></td>
                  <td>{s.c.nome || s.c.exib}<div className="small muted">{s.c.cidade}</div></td>
                  <td>{s.o.titulo}<div className="small muted">{db.empresas[s.o.empresaId]?.nome}</div></td>
                  <td className="small">{topMotivos(s.r.rc, 3).map((x) => x.t).join(' ')}</td>
                  <td className="small">{s.it.cand ? 'Candidato tem interesse' : s.it.emp ? 'Empresa tem interesse' : 'Sem interesse ainda'}</td>
                </tr>
              ))}
              {!sugestoes.length && <tr><td colSpan={5} className="muted small">Nenhuma combinação compatível no momento.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {aba === 'outros' && (
        <div className="card">
          <h3>Banco de respostas “Outros”</h3>
          <p className="small muted">Opções criadas pelos usuários. Remover aqui tira a opção da lista para novos cadastros; perfis que já a escolheram continuam com ela.</p>
          {Object.entries(db.outros || {}).filter(([, v]) => Object.keys(v).length).map(([campo, itens]) => (
            <div key={campo} className="outros-adm">
              <div className="why-h">{CAMPOS[campo] || campo}</div>
              <div className="chips static">
                {Object.entries(itens).map(([k, it]) => (
                  <span key={k} className="chip novo">{it.label}<button className="chip-x" aria-label={`Remover ${it.label}`} onClick={() => removerOutro(campo, k)}>×</button></span>
                ))}
              </div>
            </div>
          ))}
          {!Object.values(db.outros || {}).some((v) => Object.keys(v).length) && <p className="small muted">Nenhuma resposta “Outros” ainda.</p>}
        </div>
      )}

      {ver && db.candidatos[ver.id] && (() => {
        const c = db.candidatos[ver.id];
        return (
          <Modal onClose={() => setVer(null)} wide>
            <div className="adm-who"><Avatar foto={c.foto} nome={c.nome || c.exib} size={56} /><span><h2>{c.nome || '(sem nome)'}</h2><small className="muted">{c.exib} · {c.cidade} · {completude(c)}% completo · criado em {dataBR(c.criadoEm)}</small></span></div>
            <div className="reqs">
              {[['Funções', lista(c.funcoes)], ['Segmentos', lista(c.segmentos)], ['Tipos de venda', lista(c.tiposVenda)], ['Pretensão', brl(c.salarioMin)], ['Turnos', turnosTxt(c.turnos)], ['Dias', diasTxt(c.dias)],
                ['Escolaridade', escLabel(c.escolaridade)], ['Maior de 18', c.maior18 === undefined ? '—' : c.maior18 ? 'Sim' : 'Não'], ['Ferramentas', lista(c.ferramentas)], ['Idiomas', lista(c.idiomas)],
                ['Competências', lista(c.competencias.map((k) => COMPS[k] || k))], ['Treinamentos', Object.entries(c.treinos).map(([k, t]) => `${COMPS[k] || k}: ${nivelTreino(t.score)}`).join('; ')]].map(([l, v]) => <div key={l}><span className="muted small">{l}</span><b className="small">{v || '—'}</b></div>)}
            </div>
            {c.sobre && <p className="small"><span className="muted">Sobre:</span> {c.sobre}</p>}
            <h3>Compatibilidade com as vagas</h3>
            <table className="tbl"><tbody>
              {opps.map((o) => { const r = avaliar(c, o); return <tr key={o.id}><td>{o.titulo}<div className="small muted">{db.empresas[o.empresaId]?.nome}</div></td><td>{r.elegivel ? <b>{r.total}/100</b> : <span className="small muted">{r.bloqueios[0]?.texto}</span>}</td></tr>; })}
            </tbody></table>
          </Modal>
        );
      })()}

      {apagar && (
        <Modal onClose={() => setApagar(null)}>
          <h2>Excluir “{apagar.nome || 'cadastro'}”?</h2>
          <p className="muted">O cadastro{apagar.tipo === 'emp' ? ', as vagas dessa empresa' : ''} e os interesses e conversas ligados a ele serão apagados do banco de dados. Esta ação não pode ser desfeita.</p>
          <div className="m-actions"><Btn kind="ghost" onClick={() => setApagar(null)}>Cancelar</Btn><Btn kind="danger" onClick={() => excluir(apagar)}>Excluir definitivamente</Btn></div>
        </Modal>
      )}
    </div>
  );
}

// ---------- Pagamentos e créditos ----------
function Pagamentos() {
  const { db, upd: updBase, toast, podeAdministrar } = useContext(Ctx);
  const upd = (fn) => (podeAdministrar ? updBase(fn) : toast('Esta conta Claude não tem permissão para alterar o banco de dados. Peça acesso de Editor ao dono da página.'));
  const [links, setLinks] = useState(() => ({ essencial: '', crescimento: '', escala: '', ...(db.config?.links || {}) }));
  const peds = Object.entries(db.pedidos || {}).sort((a, b) => (b[1].criadoEm || 0) - (a[1].criadoEm || 0));
  const salvarLinks = () => {
    if (!podeAdministrar) { upd(() => {}); return; }
    const bad = Object.values(links).some((l) => l && !/^https:\/\//.test(l));
    if (bad) { toast('Os links precisam começar com https://'); return; }
    upd((d) => { d.config = { ...(d.config || {}), links: { ...links } }; });
    toast('Links de pagamento salvos.');
  };
  const confirmar = (id) => {
    if (!podeAdministrar) { upd(() => {}); return; }
    const p = db.pedidos[id]; const pl = planoDe(p.plano);
    upd((d) => {
      d.pedidos[id].status = 'confirmado'; d.pedidos[id].confirmadoEm = Date.now();
      d.creditos = d.creditos || {};
      const c = d.creditos[p.empId] || { total: 0, ilimitado: false, historico: [] };
      if (!pl.creditos) c.ilimitado = true; else c.total = (Number(c.total) || 0) + pl.creditos;
      c.historico = [...(c.historico || []), { ts: Date.now(), qtd: pl.creditos || 'ilimitado', plano: pl.id, pedido: id, origem: 'pagamento confirmado' }].slice(-50);
      d.creditos[p.empId] = c;
    });
    toast(`Pagamento confirmado: ${pl.capTxt.toLowerCase()} liberadas para ${db.empresas[p.empId]?.nome || 'a empresa'}.`);
  };
  const recusar = (id) => upd((d) => { d.pedidos[id].status = 'recusado'; });
  const ajustar = (empId, delta) => upd((d) => {
    d.creditos = d.creditos || {};
    const c = d.creditos[empId] || { total: 0, ilimitado: false, historico: [] };
    c.total = Math.max(0, (Number(c.total) || 0) + delta);
    c.historico = [...(c.historico || []), { ts: Date.now(), qtd: delta, origem: 'ajuste manual' }].slice(-50);
    d.creditos[empId] = c;
  });
  const alternarIlimitado = (empId) => upd((d) => {
    d.creditos = d.creditos || {};
    const c = d.creditos[empId] || { total: 0, ilimitado: false, historico: [] };
    c.ilimitado = !c.ilimitado;
    c.historico = [...(c.historico || []), { ts: Date.now(), qtd: c.ilimitado ? 'ilimitado' : 'fim do ilimitado', origem: 'ajuste manual' }].slice(-50);
    d.creditos[empId] = c;
  });
  return (
    <>
      <div className="card">
        <h3>Pedidos de compra</h3>
        <p className="small muted">Confira o recebimento no app da InfinitePay antes de confirmar. Ao confirmar, os créditos são liberados na hora para a empresa.</p>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Pedido</th><th>Empresa</th><th>Pacote</th><th>Valor</th><th>Status</th><th>Comprovante</th><th>Data</th><th /></tr></thead>
            <tbody>
              {peds.map(([id, p]) => (
                <tr key={id}>
                  <td><b>{id.toUpperCase()}</b></td>
                  <td>{db.empresas[p.empId]?.nome || p.empId}</td>
                  <td>{planoDe(p.plano)?.nome} <span className="small muted">({planoDe(p.plano)?.capTxt})</span></td>
                  <td>{brl(p.valor, 2)}</td>
                  <td><span className={`pill mini ${p.status === 'confirmado' ? 'lime' : p.status === 'informado' ? 'warn' : ''}`}>{STATUS_PEDIDO[p.status] || p.status}</span></td>
                  <td className="small">{p.comprovante || '—'}</td>
                  <td className="small">{dataBR(p.criadoEm)}</td>
                  <td className="acts-cel">
                    {p.status !== 'confirmado' && p.status !== 'recusado' && <><Btn kind="lime" size="sm" onClick={() => confirmar(id)}>Confirmar pagamento</Btn><Btn kind="ghost" size="sm" onClick={() => recusar(id)}>Recusar</Btn></>}
                  </td>
                </tr>
              ))}
              {!peds.length && <tr><td colSpan={8} className="muted small">Nenhum pedido ainda.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <h3>Créditos por empresa</h3>
        <table className="tbl">
          <thead><tr><th>Empresa</th><th>Saldo</th><th>Liberados</th><th>Usados (efetivações)</th><th /></tr></thead>
          <tbody>
            {Object.values(db.empresas).map((e) => {
              const sd = saldo(db, e.id);
              return (
                <tr key={e.id}>
                  <td>{e.nome || '(sem nome)'}</td>
                  <td><b>{sd.ilimitado ? 'Ilimitado' : sd.disponivel}</b></td>
                  <td>{sd.ilimitado ? '∞' : sd.total}</td>
                  <td>{sd.usados}</td>
                  <td className="acts-cel">
                    <Btn kind="ghost" size="sm" onClick={() => ajustar(e.id, 1)}>+1 crédito</Btn>
                    <Btn kind="ghost" size="sm" disabled={sd.ilimitado || sd.total <= 0} onClick={() => ajustar(e.id, -1)}>−1</Btn>
                    <Btn kind="ghost" size="sm" onClick={() => alternarIlimitado(e.id)}>{sd.ilimitado ? 'Tirar ilimitado' : 'Tornar ilimitado'}</Btn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="card form">
        <h3>Links de pagamento da InfinitePay</h3>
        <p className="small muted">No app da InfinitePay, crie um link de pagamento com o valor de cada pacote e cole aqui. As empresas são enviadas para o link do pacote escolhido.</p>
        {[['essencial', 'Essencial · R$ 59,90 · 1 contratação'], ['crescimento', 'Crescimento · R$ 149,90 · 5 contratações'], ['escala', 'Escala · R$ 399,90 · ilimitadas']].map(([k, l]) => (
          <label key={k} className="field"><span className="field-l">{l}</span>
            <input className="in" placeholder="https://..." value={links[k] || ''} onChange={(ev) => setLinks({ ...links, [k]: ev.target.value.trim() })} />
          </label>
        ))}
        <div className="row-end"><Btn kind="lime" onClick={salvarLinks}>Salvar links</Btn></div>
      </div>
    </>
  );
}

// ---------- Dados da empresa (rodapé e Política de Privacidade) ----------
function DadosEmpresa() {
  const { db, upd: updBase, toast, abrirPagina, podeAdministrar } = useContext(Ctx);
  const upd = (fn) => (podeAdministrar ? updBase(fn) : toast('Esta conta Claude não tem permissão para alterar o banco de dados. Peça acesso de Editor ao dono da página.'));
  const [f, setF] = useState(() => ({ razao: '', cnpj: '', endereco: '', email: '', telefone: '', whatsapp: '', instagram: '', cidade: 'Passo Fundo - RS - Brasil', ...(db.config?.empresa || {}) }));
  const campos = [['razao', 'Razão social', 'Aparece na Política de Privacidade'], ['cnpj', 'CNPJ', 'Aparece no rodapé e na política. Deixe em branco até o CNPJ da Contratei estar aberto.'],
    ['endereco', 'Endereço da sede', 'Política de Privacidade'], ['email', 'E-mail oficial (contato de privacidade)', 'Rodapé e política'],
    ['telefone', 'Telefone de suporte', 'Rodapé'], ['whatsapp', 'Telefone para empresas', 'Rodapé'], ['instagram', 'Instagram', 'Ex.: @contratei'], ['cidade', 'Cidade', 'Rodapé']];
  const salvar = () => {
    if (!podeAdministrar) { upd(() => {}); return; }
    if (f.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) { toast('E-mail inválido.'); return; }
    if (f.cnpj && soDig(f.cnpj).length !== 14) { toast('O CNPJ precisa ter 14 dígitos.'); return; }
    upd((d) => { d.config = { ...(d.config || {}), empresa: Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v || '').trim()])) }; });
    toast('Dados da empresa salvos. O rodapé e a política já foram atualizados.');
  };
  return (
    <div className="card form">
      <div className="row-between wrap"><h3>Dados da empresa</h3><Btn kind="ghost" size="sm" onClick={() => abrirPagina('privacidade')}>Ver Política de Privacidade</Btn></div>
      <p className="small muted">Estes dados preenchem o rodapé do site e a Política de Privacidade (LGPD). Campos em branco não aparecem no rodapé e ficam como “a informar” na política.</p>
      <div className="grid2">
        {campos.map(([k, l, h]) => (
          <label key={k} className="field"><span className="field-l">{l}</span><span className="field-hint">{h}</span>
            <input className="in" value={f[k] || ''} onChange={(ev) => setF({ ...f, [k]: ev.target.value })} />
          </label>
        ))}
      </div>
      <div className="row-end"><Btn kind="lime" onClick={salvar}>Salvar dados</Btn></div>
    </div>
  );
}
const soDig = (s) => String(s || '').replace(/\D/g, '');
