import React, { useEffect, useMemo, useState, useContext, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Ctx } from './ctx.js';
import { CONTAS, contaDo, verificar, novoSal, hashSenha, senhaFraca } from './auth.js';
import { registrarTodos, registrar, existente, chaveDe, limpar, slug } from './outros.js';
import { seed, COMPS, TRILHAS, nivelTreino, REGRA_TREINO, novoCandidato, novaEmpresa, novaOportunidade } from './data.js';
import { saldo, saldoTxt, plano as planoDe } from './creditos.js';
import { PLANOS } from './data.js';
import { COLS, montar, diferencas, criarGravador } from './remote.js';
import { SUPA, cliente, criarStore, conta, erroAuth } from './supa.js';
import { Admin } from './admin.jsx';
import { POLITICA } from './legal.js';
import { FAQ } from './faq.js';
import { avaliar, fraseMatch, brl, turnosTxt, PARTES } from './engine.js';
import {
  IcMail, IcPhone, IcInsta, IcPin, IcShield, IcEye, Avatar, LOGO_FULL, LOGO_SYM, LOGO_DARK, HERO_IMG, IcHand, IcMsg, Btn, Modal, Bars, Delta, Reasons, IcChat, IcReset, IcScreen, IcDown, IcCheck, IcUser, IcBuilding, IcCoin, IcInfo, IcLock, IcBolt, IcChev,
} from './ui.jsx';
import { PerfilCandidato, Oportunidades, Treinamentos } from './cand.jsx';
import { PerfilEmpresa, Recomendados, PlanosPublicos } from './emp.jsx';
import { Conversas, Condicoes, sis, hoje, pendente } from './chat.jsx';

const KEY = 'contratei-mvp';
const load = () => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.db?.version === seed().version) return s;
    if (s && s.db?.outros) return { db: { ...seed(), outros: s.db.outros }, ui: s.ui }; // versão nova: mantém o banco “Outros”
    if (s && s.ui) return { db: null, ui: s.ui }; // modo online: o banco vem do servidor, a tela é restaurada
  } catch (e) { /* sem armazenamento */ }
  return null;
};
const UI0 = { perfil: null, tab: { cand: 'oportunidades', emp: 'recomendados' }, zoom: false, oppSel: null, thread: null, trilha: null, sessao: {}, login: null };

function App() {
  const saved = useMemo(load, []);
  const inicial = useMemo(() => {
    const d = saved?.db || seed();
    if (!d.outros) d.outros = {};
    registrarTodos(d.outros);
    return d;
  }, []);
  const [db, setDbState] = useState(inicial);
  const dbRef = useRef(inicial);
  const setDb = (next) => { dbRef.current = next; setDbState(next); };
  const temRuntime = SUPA || !!(window.claude && window.claude.use);
  const [sessaoVer, setSessaoVer] = useState(0); // muda quando alguém entra ou sai (Supabase)
  const [pronto, setPronto] = useState(null); // conta para a qual os dados já foram carregados
  // Ação que espera o login terminar e os dados carregarem (sobrevive à volta do link de confirmação)
  const PKEY = 'contratei-pendente';
  const pendente = {
    get: () => { try { const x = JSON.parse(localStorage.getItem(PKEY)); return x && Date.now() - x.ts < 86400000 ? x.v : null; } catch (e) { return null; } },
    set: (v) => { try { if (v) localStorage.setItem(PKEY, JSON.stringify({ v, ts: Date.now() })); else localStorage.removeItem(PKEY); } catch (e) { /* ignora */ } },
  };
  // Plano escolhido antes do login: depois de entrar (e cadastrar a empresa), abre o pagamento dele
  const planoPend = {
    get: () => { try { const x = JSON.parse(localStorage.getItem('contratei-plano')); return x && Date.now() - x.ts < 86400000 ? x.v : null; } catch (e) { return null; } },
    set: (v) => { try { if (v) localStorage.setItem('contratei-plano', JSON.stringify({ v, ts: Date.now() })); else localStorage.removeItem('contratei-plano'); } catch (e) { /* ignora */ } },
  };
  const [modo, setModo] = useState(temRuntime ? 'carregando' : 'local');
  const modoRef = useRef(modo);
  useEffect(() => { modoRef.current = modo; }, [modo]);
  const [eu, setEu] = useState({ id: null, nome: '', admin: false, escrever: null });
  const remoto = useRef(null);
  const gravar = useRef(null);
  const cache = useRef({});
  const bancoStatus = modo === 'online' ? 'online' : modo === 'carregando' ? 'carregando' : 'local';

  // Banco de dados compartilhado da página publicada
  useEffect(() => {
    if (!temRuntime) return undefined;
    let vivo = true;
    const unsubs = [];
    const falha = SUPA ? 'erro' : 'local';
    const timer = setTimeout(() => { if (vivo && modoRef.current === 'carregando') setModo(falha); }, 15000);
    const cair = () => { clearTimeout(timer); if (modoRef.current === 'carregando') setModo(falha); };
    let contaAtual = 'anon';
    setPronto(null);
    (async () => {
      let store = null, user = null;
      if (SUPA) {
        const sb = await cliente();
        const { data } = await sb.auth.getSession();
        const u = data?.session?.user || null;
        const admin = u ? await conta.ehAdmin() : false;
        if (!vivo) return;
        contaAtual = u ? u.id : 'anon';
        setEu(u ? { id: u.id, uid: u.id, nome: (u.user_metadata && u.user_metadata.nome) || '', email: u.email, admin, escrever: true } : { id: null, nome: '', admin: false, escrever: null });
        store = criarStore(sb);
      } else {
        [store, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      }
      if (!vivo) return;
      if (user) {
        const me = await user.me();
        const w = await user.can('data.write');
        let uid = me.id;
        try { if (typeof user.id === 'function') uid = (await user.id()) || me.id; } catch (e) { /* usa me.id */ }
        contaAtual = me.id;
        if (vivo) setEu({ id: me.id, uid, nome: me.name || '', admin: !!(me.isOwner || me.canEdit), escrever: w });
      }
      if (!store) { cair(); return; }
      remoto.current = store;
      gravar.current = criarGravador(store, (e) => {
        if (SUPA) {
          setToast(e?.code === 'sem_credito' ? 'Você precisa de pelo menos 1 crédito de contratação para esta ação.'
            : e?.code === 'invalid_argument' ? 'Esta ação não é permitida para a sua conta.' : 'Não foi possível salvar agora. Verifique sua conexão e tente novamente.');
          if (store.recarregar) store.recarregar();
          return;
        }
        setToast(e?.code === 'invalid_argument' ? 'Sem permissão para gravar no banco de dados. Peça ao administrador para te convidar como Colaborador.'
          : e?.code === 'quota_exceeded' ? 'O banco de dados atingiu o limite de armazenamento.' : 'Não foi possível salvar agora. Tente novamente.');
      });
      const recebidos = new Set();
      COLS.forEach((col) => {
        cache.current[col] = {};
        unsubs.push(store.collection(col).onSnapshot((snap) => {
          const m = {};
          snap.docs.forEach((d) => { const x = d.data(); if (x) m[d.id] = x; });
          cache.current[col] = m;
          recebidos.add(col);
          if (recebidos.size === COLS.length) {
            clearTimeout(timer);
            setDb({ ...montar(cache.current), outros: dbRef.current.outros || {} });
            if (modoRef.current !== 'online') setModo('online');
            setPronto(contaAtual);
          }
        }, cair));
      });
      unsubs.push(store.collection('outros').onSnapshot((snap) => {
        const novos = [];
        snap.docs.forEach((doc) => {
          const it = doc.data();
          if (!it || typeof it.campo !== 'string' || typeof it.chave !== 'string' || typeof it.label !== 'string') return;
          const label = limpar(it.label);
          if (label) novos.push([it.campo, it.chave, label, it.ts || 0, doc.id]);
        });
        novos.forEach(([c, k, l]) => registrar(c, k, l));
        const outros = {};
        novos.forEach(([c, k, l, ts, docId]) => { outros[c] = outros[c] || {}; outros[c][k] = { label: l, ts, doc: docId }; });
        setDb({ ...dbRef.current, outros });
      }, () => {}));
    })().catch(cair);
    return () => { vivo = false; clearTimeout(timer); unsubs.forEach((u) => u()); };
  }, [sessaoVer]);

  // Supabase: acompanha login, logout e o link de "redefinir senha"
  useEffect(() => {
    if (!SUPA) return undefined;
    let sub = null; let ultimo;
    cliente().then((sb) => {
      sb.auth.getSession().then(({ data }) => { ultimo = data?.session?.user?.id || null; });
      const r = sb.auth.onAuthStateChange((ev, session) => {
        const id = session?.user?.id || null;
        if (ev === 'PASSWORD_RECOVERY') setUi((u) => ({ ...u, login: { etapa: 'nova-senha' }, tela: null, perfil: null }));
        if (ultimo !== undefined && id !== ultimo) { ultimo = id; setSessaoVer((v) => v + 1); }
      });
      sub = r.data.subscription;
    }).catch(() => {});
    return () => { if (sub) sub.unsubscribe(); };
  }, []);

  const [ui, setUi] = useState(() => {
    const u = { ...UI0, ...(saved?.ui || {}), login: null, tela: null, wizard: null };
    u.sessao = u.sessao || {};
    u.perfil = null; // a identidade é confirmada a cada visita (abaixo)
    return u;
  });
  // Ao carregar, volta para o perfil em que a pessoa estava, se ele for dela (conta própria ou sessão de demonstração)
  const perfilSalvo = useRef(saved?.ui?.perfil || null);
  useEffect(() => {
    const ps = perfilSalvo.current;
    if (!ps || modo === 'carregando') return;
    if (modo === 'online' && !eu.id && temRuntime) return;
    if (SUPA && pronto !== eu.id) return;
    const existe = ps.tipo === 'cand' ? db.candidatos[ps.id] : db.empresas[ps.id];
    const logado = typeof ui.sessao?.conta === 'number' && Date.now() - ui.sessao.conta < 12 * 60 * 60 * 1000;
    const meu = SUPA ? ps.id === eu.id : (modo === 'online' && eu.id && ps.id === eu.id && logado) || (modo !== 'online' && ui.sessao?.[ps.tipo] === ps.id);
    if (existe && meu) setUi((u) => ({ ...u, perfil: ps }));
    perfilSalvo.current = null;
  }, [modo, eu.id, db, pronto]);
  const [modal, setModal] = useState(null);
  const [toastMsg, setToast] = useState(null);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(modo === 'local' ? { db, ui } : { db: saved?.db || null, ui })); } catch (e) { /* ignora */ }
  }, [db, ui, modo]);
  useEffect(() => { document.documentElement.classList.toggle('telao', !!ui.zoom); }, [ui.zoom]);
  useEffect(() => { if (!toastMsg) return; const t = setTimeout(() => setToast(null), 4200); return () => clearTimeout(t); }, [toastMsg]);

  // Toda alteração passa por aqui: atualiza a tela e, no modo online, grava no banco só o que mudou
  const upd = (fn) => {
    const cur = dbRef.current;
    const next = structuredClone(cur);
    fn(next);
    setDb(next);
    if (modoRef.current === 'online' && gravar.current) gravar.current(diferencas(cur, next));
  };
  const ADMIN_TTL = 8 * 60 * 60 * 1000;
  const adminLogado = SUPA ? !!eu.admin : typeof ui.sessao?.admin === 'number' && Date.now() - ui.sessao.admin < ADMIN_TTL;
  const isAdmin = adminLogado; // o painel e as funções de administrador só abrem depois do login do admin
  const CONTA_TTL = 12 * 60 * 60 * 1000;
  const contaLogada = SUPA ? !!eu.id : typeof ui.sessao?.conta === 'number' && Date.now() - ui.sessao.conta < CONTA_TTL;
  const mostrarBotaoAdmin = SUPA ? !!eu.admin : modo === 'local' || eu.admin || adminLogado;
  const podeAdministrar = SUPA ? !!eu.admin : modo === 'local' || eu.admin;
  const tipo = ui.perfil?.tipo;
  const tab = tipo ? ui.tab[tipo] : null;

  const addOutro = (campo, texto) => {
    const label = limpar(texto);
    if (!label) return null;
    const ja = existente(campo, label);
    if (ja) return ja;
    const chave = chaveDe(campo, label);
    registrar(campo, chave, label);
    const ts = Date.now();
    const docId = `${campo}~${slug(label) || 'item'}`;
    const d = structuredClone(dbRef.current);
    d.outros = d.outros || {}; d.outros[campo] = d.outros[campo] || {}; d.outros[campo][chave] = { label, ts, doc: docId };
    setDb(d);
    if (remoto.current) {
      remoto.current.collection('outros').doc(docId).set({ campo, chave, label, ts })
        .catch(() => setToast('Opção salva neste navegador. Não foi possível gravar no banco de dados compartilhado.'));
    }
    setToast(`“${label}” adicionado e registrado no banco de respostas.`);
    return chave;
  };
  const removerOutro = (campo, chave) => {
    const it = dbRef.current.outros?.[campo]?.[chave];
    const d = structuredClone(dbRef.current);
    if (d.outros?.[campo]) delete d.outros[campo][chave];
    setDb(d);
    if (remoto.current && it?.doc) remoto.current.collection('outros').doc(it.doc).delete().catch(() => setToast('Não foi possível remover do banco.'));
  };
  const moderar = (id, status) => {
    if (!remoto.current) {
      upd((d) => { if (d.candidatos[id]) d.candidatos[id].suspenso = status === 'suspenso'; if (d.empresas[id]) d.empresas[id].suspenso = status === 'suspenso'; });
      return;
    }
    const ref = remoto.current.collection('moderacao').doc(id);
    (status === 'ativo' ? ref.delete() : ref.set({ status, ts: Date.now() })).catch(() => setToast('Sem permissão para moderar.'));
  };

  // Cadastro real (conta da pessoa que está acessando)
  const abrirCadastro = (tp, jaLogado = false, aba = 'entrar') => {
    setModal(null); window.scrollTo(0, 0);
    if (SUPA) {
      if (!eu.id) { setUi((u) => ({ ...u, login: { tipo: tp, etapa: 'senha', aba }, tela: null })); return; }
      // Já conectado e pediu para criar conta: pergunta se é com esta conta ou com outra
      const temPerfil = tp === 'cand' ? dbRef.current.candidatos[eu.id] : dbRef.current.empresas[eu.id];
      if (aba === 'criar' && !temPerfil) { setUi((u) => ({ ...u, login: { tipo: tp, etapa: 'conta', aba: 'criar' }, tela: null })); return; }
      if (pronto !== eu.id) { pendente.set(tp); return; } // espera os dados da conta carregarem
    }
    if (modoRef.current === 'online' && eu.id && !jaLogado && !contaLogada) {
      setUi((u) => ({ ...u, login: { tipo: tp, etapa: 'senha' }, tela: null }));
      return;
    }
    if (modoRef.current !== 'online' || !eu.id) {
      setToast('O cadastro funciona na página publicada, para quem tem acesso.');
      return;
    }
    const cur = dbRef.current;
    if (tp === 'cand') {
      const existe = !!cur.candidatos[eu.id];
      if (!existe) upd((d) => { d.candidatos[eu.id] = novoCandidato(eu.id, eu.nome); });
      setUi((u) => ({ ...u, login: null, tela: null, perfil: { tipo: 'cand', id: eu.id }, wizard: existe ? null : 'cand', tab: { ...u.tab, cand: existe ? u.tab.cand : 'perfil' }, thread: null }));
    } else {
      const existe = !!cur.empresas[eu.id];
      if (!existe) {
        const oid = 'o' + Date.now().toString(36);
        upd((d) => { d.empresas[eu.id] = novaEmpresa(eu.id, ''); d.oportunidades[oid] = novaOportunidade(eu.id, oid); });
      }
      setUi((u) => ({ ...u, login: null, tela: null, perfil: { tipo: 'emp', id: eu.id }, wizard: existe ? null : 'emp', tab: { ...u.tab, emp: existe ? u.tab.emp : 'perfil' }, thread: null }));
      const pl = planoPend.get();
      if (pl && existe) { planoPend.set(null); setModal({ type: 'comprar', empId: eu.id, plano: pl }); }
      else if (pl) setToast('Cadastre sua empresa. Ao concluir, abrimos o pagamento do plano escolhido.');
    }
  };

  // Supabase: depois do login (ou da confirmação do e-mail), continua para onde a pessoa ia
  useEffect(() => {
    if (!SUPA || !eu.id || pronto !== eu.id) return;
    const v = pendente.get();
    if (!v) return;
    pendente.set(null);
    if (v === 'admin') {
      if (eu.admin) { setUi((u) => ({ ...u, login: null, perfil: null, thread: null, tela: 'admin' })); setToast('Acesso de administrador liberado.'); }
      return;
    }
    abrirCadastro(v);
  }, [pronto, eu.id, eu.admin]);
  const aguardarLogin = (v) => pendente.set(v);

  // Acesso com e-mail e senha (espaço privado da pessoa no banco)
  const acessoRef = () => (remoto.current && eu.uid ? remoto.current.collection(`data/users/${eu.uid}`).doc('acesso') : null);
  const lerAcesso = async () => { const r = acessoRef(); if (!r) throw new Error('sem banco'); const s = await r.get(); return s && s.exists ? s.data() : null; };
  const salvarAcesso = async (email, senha) => {
    const r = acessoRef(); if (!r) throw new Error('sem banco');
    const sal = novoSal();
    await r.set({ email: String(email).trim().toLowerCase(), sal, hash: await hashSenha(senha, sal), atualizadoEm: Date.now() });
  };
  const conferirSenha = async (acesso, senha) => (await hashSenha(senha, acesso.sal)) === acesso.hash;
  const entrarConta = (tp) => {
    setUi((u) => ({ ...u, sessao: { ...u.sessao, conta: Date.now() } }));
    abrirCadastro(tp, true);
  };

  const ctx = {
    aguardarLogin, pronto, contaLogada, lerAcesso, salvarAcesso, conferirSenha, entrarConta, senhaFraca,
    adminLogado, mostrarBotaoAdmin, podeAdministrar, db, ui, upd, addOutro, removerOutro, moderar, bancoStatus, modo, eu, isAdmin, abrirCadastro,
    irInicio: (id) => { setModal(null); setUi((u) => ({ ...u, perfil: null, tela: null, login: null, thread: null })); setTimeout(() => irPara(id), 150); },
    abrirPagina: (tela) => { setModal(null); setUi((u) => ({ ...u, tela, login: null })); window.scrollTo(0, 0); },
    restaurarDemo: () => setModal({ type: 'reset' }),
    abrirAdmin: () => { setModal(null); window.scrollTo(0, 0); setUi((u) => ({ ...u, tela: adminLogado ? 'admin' : 'admin-login', login: null })); },
    fecharAdmin: () => setUi((u) => ({ ...u, tela: null })),
    sairAdmin: () => { if (SUPA) conta.sair().catch(() => {}); setUi((u) => { const s = { ...u.sessao }; delete s.admin; return { ...u, sessao: s, tela: null }; }); setToast('Você saiu do acesso de administrador.'); },
    concluirWizard: (tp) => {
      setUi((u) => ({ ...u, wizard: null, tab: { ...u.tab, [tp]: tp === 'cand' ? 'oportunidades' : 'recomendados' } })); window.scrollTo(0, 0);
      const pl = tp === 'emp' && planoPend.get();
      if (pl && ui.perfil?.id) { planoPend.set(null); setModal({ type: 'comprar', empId: ui.perfil.id, plano: pl }); return; }
      setToast('Cadastro concluído! O ranking já foi calculado com o seu perfil.');
    },
    // Botão "Comprar" dos planos na página inicial
    comprarPlano: (plano) => {
      if (SUPA) {
        if (eu.id && pronto === eu.id && dbRef.current.empresas[eu.id]) { setModal({ type: 'comprar', empId: eu.id, plano }); return; }
        planoPend.set(plano);
        if (eu.id) { abrirCadastro('emp'); return; }
        setModal(null); window.scrollTo(0, 0);
        setUi((u) => ({ ...u, login: { tipo: 'emp', etapa: 'senha', aba: 'criar', plano }, tela: null }));
        return;
      }
      if (ui.perfil?.tipo === 'emp') setModal({ type: 'comprar', empId: ui.perfil.id, plano });
      else if (ui.sessao?.emp) setModal({ type: 'comprar', empId: ui.sessao.emp, plano });
      else { setModal(null); window.scrollTo(0, 0); setUi((u) => ({ ...u, login: { tipo: 'emp', email: '', destino: null, etapa: 'tipo' } })); }
    },
    openModal: setModal,
    toast: setToast,
    go: (t, extra = {}) => { setUi((u) => ({ ...u, tab: { ...u.tab, [u.perfil.tipo]: t }, ...extra })); window.scrollTo(0, 0); },
    // Troca de perfil: só entra em uma conta já autenticada nesta sessão; senão, pede login
    switchTo: (tp, id, t, extra = {}) => {
      setModal(null);
      window.scrollTo(0, 0);
      const proprio = modo === 'online' && eu.id && id === eu.id && contaLogada;
      if (modo === 'online' && eu.id && id === eu.id && !contaLogada) { setUi((u) => ({ ...u, login: { tipo: tp, etapa: 'senha' } })); return; }
      if (!proprio && ui.sessao?.[tp] !== id) {
        const conta = contaDo(tp, id);
        if (!conta) { setToast('Só o dono deste perfil pode entrar nele.'); return; }
        setUi((u) => ({ ...u, login: { tipo: tp, email: conta.email, destino: { tp, id, t, extra } } }));
        return;
      }
      setUi((u) => ({ ...u, login: null, tela: null, wizard: null, perfil: { tipo: tp, id }, tab: { ...u.tab, [tp]: t || u.tab[tp] }, thread: null, trilha: null, ...extra }));
    },
    abrirLogin: (tipoLogin = 'cand', destino = null) => { setModal(null); window.scrollTo(0, 0); setUi((u) => ({ ...u, login: { tipo: tipoLogin, email: '', destino, etapa: 'tipo' } })); },
    fecharLogin: () => setUi((u) => ({ ...u, login: null })),
    entrar: (conta) => {
      if (conta.tipo === 'admin') {
        setUi((u) => ({ ...u, login: null, perfil: null, thread: null, tela: 'admin', sessao: { ...u.sessao, admin: Date.now() } }));
        window.scrollTo(0, 0);
        setToast('Acesso de administrador liberado.');
        return;
      }
      setUi((u) => {
        const dest = u.login?.destino;
        const ok = dest && dest.tp === conta.tipo && dest.id === conta.id;
        const t = ok ? dest.t : undefined;
        return {
          ...u, login: null, sessao: { ...u.sessao, [conta.tipo]: conta.id },
          perfil: { tipo: conta.tipo, id: conta.id }, tab: { ...u.tab, [conta.tipo]: t || u.tab[conta.tipo] },
          thread: null, trilha: null, ...(ok ? dest.extra : {}),
        };
      });
      window.scrollTo(0, 0);
      setToast(`Bem-vindo(a), ${conta.nome}!`);
    },
    sair: () => { if (SUPA) { pendente.set(null); conta.sair().catch(() => {}); } setUi((u) => { const s = { ...u.sessao }; delete s.conta; if (u.perfil) delete s[u.perfil.tipo]; return { ...u, sessao: s, perfil: null, thread: null, login: null }; }); window.scrollTo(0, 0); },
    openThread: (key) => { setUi((u) => ({ ...u, tab: { ...u.tab, [u.perfil.tipo]: 'conversas' }, thread: key })); setModal(null); window.scrollTo(0, 0); },
    verPlanos: () => { setUi((u) => ({ ...u, perfil: null, thread: null })); setTimeout(() => irPara('planos'), 120); },
    closeThread: () => setUi((u) => ({ ...u, thread: null })),
    interesse: (candId, oppId, lado) => {
      const key = `${candId}|${oppId}`;
      const it = { ...(db.interesses[key] || { cand: false, emp: false }), [lado]: true };
      const vira = it.cand && it.emp && !db.matches[key];
      upd((d) => {
        d.interesses[key] = it;
        if (vira) {
          const c = d.candidatos[candId], o = d.oportunidades[oppId], e = d.empresas[o.empresaId];
          d.matches[key] = {
            id: key, candId, oppId, criadoEm: Date.now(), etapa: 'conversa', entrevista: null, avaliacao: null, efetivacao: null,
            msgs: [sis(`Deu match! ${c.nome} e ${e.nome} demonstraram interesse em “${o.titulo}”. Nomes liberados; contatos pessoais continuam privados.`)],
          };
        }
      });
      if (vira) setModal({ type: 'match', key });
    },
    retirar: (candId, oppId, lado) => upd((d) => { const k = `${candId}|${oppId}`; if (d.interesses[k]) d.interesses[k][lado] = false; }),
  };

  const reset = () => {
    if (modoRef.current === 'online') { setModal(null); return; }
    try { localStorage.removeItem(KEY); } catch (e) { /* ignora */ }
    setDb({ ...seed(), outros: dbRef.current.outros || {} }); setUi(UI0); setModal(null); window.scrollTo(0, 0);
  };

  let page = null;
  if (tipo === 'cand') {
    const id = ui.perfil.id;
    page = tab === 'perfil' ? <PerfilCandidato key={id + (ui.wizard || '')} candId={id} wizard={ui.wizard === 'cand'} onConcluir={() => ctx.concluirWizard('cand')} />
      : tab === 'treinos' ? <Treinamentos key={id + (ui.trilha || '')} candId={id} trilhaInicial={ui.trilha} />
        : tab === 'conversas' ? <Conversas lado="cand" id={id} threadId={ui.thread} />
          : <Oportunidades candId={id} />;
  } else if (tipo === 'emp') {
    const id = ui.perfil.id;
    page = tab === 'perfil' ? <PerfilEmpresa key={id} empId={id} wizard={ui.wizard === 'emp'} onConcluir={() => ctx.concluirWizard('emp')} />
      : tab === 'conversas' ? <Conversas lado="emp" id={id} threadId={ui.thread} />
          : <Recomendados empId={id} oppSel={ui.oppSel} setOppSel={(v) => setUi((u) => ({ ...u, oppSel: v }))} />;
  }

  return (
    <Ctx.Provider value={ctx}>
      <div className={`app ${tipo ? 'in' : 'out'}`}>
        <Header ui={ui} setUi={setUi} onReset={() => setModal({ type: 'reset' })} />
        {modo === 'carregando' ? <div className="loading"><img src={LOGO_SYM} alt="" /><span>Conectando ao banco de dados…</span></div>
          : modo === 'erro' ? <div className="loading"><img src={LOGO_SYM} alt="" /><span>Não foi possível conectar ao servidor. Verifique sua internet e recarregue a página.</span></div>
          : ui.tela === 'admin' && adminLogado ? <main className="main wide"><Admin /></main>
          : ui.tela === 'admin' || ui.tela === 'admin-login' ? <AdminLogin />
          : ui.tela === 'privacidade' ? <PaginaLegal tipo="privacidade" />
          : ui.tela === 'termos' ? <PaginaLegal tipo="termos" />
          : ui.login ? (SUPA ? <LoginSupa /> : <Login />) : tipo && (db.candidatos[ui.perfil.id] || db.empresas[ui.perfil.id]) ? (
          <>
            {!ui.wizard && <Tabs tipo={tipo} tab={tab} id={ui.perfil.id} onTab={(t) => ctx.go(t, { thread: t === 'conversas' ? ui.thread : null, trilha: null })} />}
            <main className="main">{page}</main>
          </>
        ) : <Entrada />}
        {modo !== 'carregando' && <Rodape />}
        {modal && <ModalHost modal={modal} close={() => setModal(null)} reset={reset} ui={ui} />}
        {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
      </div>
    </Ctx.Provider>
  );
}

// ================= Cabeçalho e navegação =================
const irPara = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

function Header({ ui, setUi, onReset }) {
  const { db, switchTo, abrirLogin, sair, modo, eu, isAdmin, abrirCadastro, abrirAdmin, mostrarBotaoAdmin, adminLogado } = useContext(Ctx);
  const [open, setOpen] = useState(false);
  const p = ui.perfil;
  const landing = !p || ['admin', 'admin-login', 'privacidade', 'termos'].includes(ui.tela);
  const nome = p ? (p.tipo === 'cand' ? db.candidatos[p.id].exib : db.empresas[p.id].nome) : null;
  const grupo = (tipo) => {
    const online = modo === 'online' && eu.id;
    const meu = online && (tipo === 'cand' ? db.candidatos[eu.id] : db.empresas[eu.id]);
    const demos = (!online || isAdmin || eu.admin) ? CONTAS.filter((c) => c.tipo === tipo) : [];
    const Ic = tipo === 'cand' ? IcUser : IcBuilding;
    return (
      <>
        {online && <div className="sw-g">Sua conta</div>}
        {online && (
          <button className={p?.id === eu.id && p?.tipo === tipo ? 'on' : ''} onClick={() => { setOpen(false); abrirCadastro(tipo); }}>
            <Ic size={16} /><span><b>{meu ? (tipo === 'cand' ? meu.exib || meu.nome || 'Meu perfil' : meu.nome || 'Minha empresa') : (tipo === 'cand' ? 'Criar meu perfil de candidato' : 'Cadastrar minha empresa')}</b><small>{meu ? 'Seu cadastro' : 'Cadastro em etapas'}</small></span>
          </button>
        )}
        {demos.length > 0 && <div className="sw-g">{online ? 'Demonstração (pitch)' : tipo === 'cand' ? 'Conta de candidato' : 'Conta de empresa'}</div>}
        {demos.map((c) => {
          const logado = ui.sessao?.[c.tipo] === c.id;
          return (
            <button key={c.email} className={p?.id === c.id ? 'on' : ''} onClick={() => { switchTo(c.tipo, c.id); setOpen(false); }}>
              <Ic size={16} />
              <span><b>{c.nome}</b><small>{c.email}{logado ? ' · conectada' : ' · pede senha'}</small></span>
            </button>
          );
        })}
      </>
    );
  };
  return (
    <header className={`hdr ${landing ? 'is-landing' : ''}`}>
      <button className="brand" onClick={() => { setOpen(false); setUi((u) => ({ ...u, perfil: null, thread: null, login: null, tela: null, wizard: null, trilha: null })); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="Voltar para a tela inicial" title="Tela inicial">
        <img src={LOGO_SYM} alt="" className="brand-sym" />
        <img src={LOGO_DARK} alt="Contratei" className="brand-full" />
      </button>
      {landing && (
        <nav className="hnav">
          <button onClick={() => irPara('como')}>Como funciona</button>
          <button onClick={() => irPara('candidatos')}>Para candidatos</button>
          <button onClick={() => irPara('empresas')}>Para empresas</button>
          <button onClick={() => irPara('planos')}>Planos</button>
        </nav>
      )}
      <div className="hdr-r">
        <div className="switcher">
          {landing ? (
            <div className="duo">
              <button className="h-link" onClick={() => { setOpen(false); abrirLogin('cand'); }}>Entrar</button>
              <button className="h-cta" onClick={() => { setOpen(false); abrirCadastro('cand', false, 'criar'); }}>Criar meu perfil</button>
            </div>
          ) : (
            <div className="duo">
              <button className={`duo-b outline ${p.tipo === 'cand' ? 'cur' : ''}`} onClick={() => setOpen(open === 'cand' ? false : 'cand')} aria-expanded={open === 'cand'}>
                Busco oportunidade{p.tipo === 'cand' && <span className="duo-n hide-s">· {nome}</span>}<IcDown size={14} />
              </button>
              <button className={`duo-b solid ${p.tipo === 'emp' ? 'cur' : ''}`} onClick={() => setOpen(open === 'emp' ? false : 'emp')} aria-expanded={open === 'emp'}>
                Sou empresário{p.tipo === 'emp' && <span className="duo-n hide-s">· {nome}</span>}<IcDown size={14} />
              </button>
            </div>
          )}
          {open && (
            <>
              <div className="sw-bg" onClick={() => setOpen(false)} />
              <div className="sw-menu">
                {(open === 'all' || open === 'cand') && grupo('cand')}
                {(open === 'all' || open === 'emp') && grupo('emp')}
                {p && <button className="sw-sair" onClick={() => { setOpen(false); sair(); }}>Sair da conta {p.tipo === 'cand' ? 'de candidato' : 'da empresa'}</button>}
              </div>
            </>
          )}
        </div>
        {mostrarBotaoAdmin && <button className={`iconbtn admin-btn ${ui.tela === 'admin' && adminLogado ? 'on' : ''}`} title="Painel admin" aria-label="Painel admin" onClick={() => { setOpen(false); abrirAdmin(); }}><IcShield /><span className="hide-s">Admin</span></button>}
        {!landing && <button className={`iconbtn hide-s ${ui.zoom ? 'on' : ''}`} title="Modo telão (texto maior)" aria-label="Modo telão" onClick={() => setUi((u) => ({ ...u, zoom: !u.zoom }))}><IcScreen /></button>}
      </div>
    </header>
  );
}

function Tabs({ tipo, tab, id, onTab }) {
  const { db } = useContext(Ctx);
  const mine = Object.values(db.matches).filter((m) => (tipo === 'cand' ? m.candId === id : db.oportunidades[m.oppId]?.empresaId === id));
  const pend = mine.filter((m) => pendente(m, tipo)).length;
  const novos = tipo === 'emp'
    ? Object.entries(db.interesses).filter(([k, v]) => v.cand && !v.emp && !db.matches[k] && db.oportunidades[k.split('|')[1]]?.empresaId === id).length
    : 0;
  const items = tipo === 'cand'
    ? [['perfil', 'Meu perfil', <Bars stage={1} />], ['treinos', 'Treinamentos', <Bars stage={2} />], ['oportunidades', 'Oportunidades', <Bars stage={3} />], ['conversas', 'Conversas', <IcChat size={20} />, pend || mine.length]]
    : [['perfil', 'Perfil da empresa', <IcBuilding size={20} />], ['recomendados', 'Perfis recomendados', <Bars stage={3} />, novos], ['conversas', 'Conversas', <IcChat size={20} />, pend || mine.length]];
  return (
    <nav className="tabs" aria-label="Navegação">
      {items.map(([k, l, ic, n]) => (
        <button key={k} className={tab === k ? 'on' : ''} onClick={() => onTab(k)} aria-current={tab === k}>
          <span className="tab-ic">{ic}{n ? <span className="tab-n">{n}</span> : null}</span>
          <span className="tab-l">{l}</span>
        </button>
      ))}
    </nav>
  );
}

// ================= Rodapé (LGPD) =================
export const dadosEmpresa = (db) => ({ razao: '', cnpj: '', endereco: '', email: '', telefone: '', whatsapp: '', instagram: '', cidade: 'Passo Fundo - RS - Brasil', ...(db.config?.empresa || {}) });
const soDigitos = (s) => String(s || '').replace(/\D/g, '');

function Rodape() {
  const { db, abrirPagina, ui, irInicio, abrirLogin, isAdmin, abrirAdmin } = useContext(Ctx);
  const e = dadosEmpresa(db);
  const abrirLoginAdm = () => abrirAdmin();
  const ir = (id) => (ui.perfil || ui.tela || ui.login ? irInicio(id) : irPara(id));
  return (
    <footer className="rodape">
      <div className="rodape-in">
        <div className="rod-marca">
          <img src={LOGO_FULL} alt="Contratei" />
          <p>Conectamos pessoas e empresas por compatibilidade. Para quem busca emprego é grátis; a empresa paga por contratação.</p>
        </div>
        <div className="rod-col">
          <h4>Legal</h4>
          <button onClick={() => abrirPagina('termos')}>Termos de Uso</button>
          <button onClick={() => abrirPagina('privacidade')}>Política de Privacidade (LGPD)</button>
          <button onClick={() => abrirLoginAdm()}>Acesso administrativo</button>
        </div>
        <div className="rod-col">
          <h4>Plataforma</h4>
          <button onClick={() => ir('como')}>Como funciona</button>
          <button onClick={() => ir('planos')}>Planos para empresas</button>
          <button onClick={() => abrirPagina('privacidade')}>Seus dados e direitos</button>
        </div>
        <div className="rod-col rod-contato">
          <h4>Contato</h4>
          {e.email && <a href={`mailto:${e.email}`}><IcMail size={17} /> {e.email}</a>}
          {e.telefone && <a href={`tel:+55${soDigitos(e.telefone)}`}><IcPhone size={17} /> {e.telefone} - Suporte</a>}
          {e.whatsapp && <a href={`tel:+55${soDigitos(e.whatsapp)}`}><IcPhone size={17} /> {e.whatsapp} - Empresas</a>}
          <span><IcPin size={17} /> {e.cidade || 'Passo Fundo - RS - Brasil'}</span>
          {e.instagram && <><i className="rod-sep" /><a href={`https://instagram.com/${e.instagram.replace(/^@/, '')}`} target="_blank" rel="noopener noreferrer"><IcInsta size={17} /> @{e.instagram.replace(/^@/, '')}</a></>}
        </div>
      </div>
      <div className="rodape-base">
        <span>© {new Date().getFullYear()} Contratei. Todos os direitos reservados.</span>
        <span className="rod-lgpd"><button onClick={() => abrirPagina('privacidade')}>Em conformidade com a LGPD (Lei nº 13.709/2018)</button>{e.cnpj && <> · CNPJ: {e.cnpj}</>} <IcLock size={15} /></span>
      </div>
    </footer>
  );
}

// Renderiza o texto da política (títulos, negrito e listas)
function Markdown({ texto }) {
  const linhas = texto.split('\n');
  const out = []; let lista = [];
  const inline = (s, k) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') ? <b key={k + '-' + i}>{p.slice(2, -2)}</b> : p));
  const fecha = (k) => { if (lista.length) { out.push(<ul key={'ul' + k}>{lista}</ul>); lista = []; } };
  linhas.forEach((l, k) => {
    if (l.startsWith('- ')) { lista.push(<li key={k}>{inline(l.slice(2), k)}</li>); return; }
    fecha(k);
    if (l.startsWith('### ')) out.push(<h3 key={k}>{l.slice(4)}</h3>);
    else if (l.startsWith('## ')) out.push(<div key={k} className="leg-sub">{l.slice(3)}</div>);
    else if (l.startsWith('# ')) out.push(<h1 key={k}>{l.slice(2)}</h1>);
    else if (l.trim()) out.push(<p key={k}>{inline(l, k)}</p>);
  });
  fecha('fim');
  return <>{out}</>;
}

function PaginaLegal({ tipo }) {
  const { db, abrirPagina } = useContext(Ctx);
  const e = dadosEmpresa(db);
  const falta = (v) => v || 'a informar';
  const texto = POLITICA.replace('{RAZAO}', falta(e.razao)).replace('{CNPJ}', falta(e.cnpj)).replace('{ENDERECO}', falta(e.endereco)).replace('{EMAIL}', falta(e.email));
  return (
    <main className="legal-pg">
      <article className="legal-doc">
        <button className="link small" onClick={() => abrirPagina(null)}>← Voltar</button>
        {tipo === 'privacidade' ? <Markdown texto={texto} /> : (
          <>
            <h1>TERMOS DE USO</h1>
            <div className="leg-sub">CONTRATEI</div>
            <p>Os Termos de Uso da Contratei estão em elaboração e serão publicados antes do lançamento oficial da plataforma.</p>
            <p>Enquanto isso, o tratamento dos seus dados pessoais segue a nossa <button className="link" onClick={() => abrirPagina('privacidade')}>Política de Privacidade (LGPD)</button>.</p>
            {e.email && <p>Dúvidas: <a href={`mailto:${e.email}`}>{e.email}</a></p>}
          </>
        )}
      </article>
    </main>
  );
}

// ================= Entrada do administrador =================
function AdminLogin() {
  const { entrar, abrirPagina, aguardarLogin } = useContext(Ctx);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  const [tentativas, setTentativas] = useState(0);
  const enviar = async (ev) => {
    ev.preventDefault();
    if (tentativas >= 5) { setErro('Muitas tentativas. Recarregue a página para tentar de novo.'); return; }
    setErro(''); setBusy(true);
    if (SUPA) {
      try {
        await conta.entrar(email, senha);
        if (!(await conta.ehAdmin())) { await conta.sair(); setBusy(false); setTentativas((t) => t + 1); setErro('Esta conta não tem acesso de administrador.'); return; }
        aguardarLogin('admin');
      } catch (e) { setBusy(false); setTentativas((t) => t + 1); setErro(erroAuth(e)); setSenha(''); }
      return;
    }
    const ct = await verificar(email, senha);
    await new Promise((r) => setTimeout(r, 600)); // atraso contra tentativas em sequência
    setBusy(false);
    if (!ct || ct.tipo !== 'admin') { setTentativas((t) => t + 1); setErro('E-mail ou senha de administrador incorretos.'); setSenha(''); return; }
    entrar(ct);
  };
  return (
    <main className="login-pg adm-login-pg">
      <form className="login-card adm-login" onSubmit={enviar} noValidate>
        <div className="adm-login-top"><img src={LOGO_FULL} alt="Contratei" /><span className="adm-badge"><IcShield size={14} /> Painel administrativo</span></div>
        <h1>Acesso restrito</h1>
        <p className="muted">Entre com o e-mail e a senha de administrador para gerenciar cadastros, pagamentos e créditos.</p>
        <label className="field"><span className="field-l">E-mail do administrador</span>
          <input className="in" type="email" autoComplete="username" placeholder="admin@email.com" value={email} onChange={(e) => { setEmail(e.target.value); setErro(''); }} autoFocus />
        </label>
        <label className="field"><span className="field-l">Senha</span>
          <span className="pw">
            <input className="in" type={ver ? 'text' : 'password'} autoComplete="current-password" placeholder="Senha" value={senha} onChange={(e) => { setSenha(e.target.value); setErro(''); }} />
            <button type="button" className="pw-t" onClick={() => setVer(!ver)} aria-label={ver ? 'Ocultar senha' : 'Mostrar senha'}><IcEye size={18} /></button>
          </span>
        </label>
        {erro && <div className="login-erro" role="alert">{erro}</div>}
        <button type="submit" className="b-lime login-btn" disabled={busy || !email || !senha}>{busy ? 'Verificando…' : 'Entrar no painel'}</button>
        <p className="small muted adm-nota"><IcLock size={13} /> A sessão de administrador expira após 8 horas.</p>
        <div className="login-links"><button type="button" className="link small" onClick={() => abrirPagina(null)}>Voltar para o site</button></div>
      </form>
    </main>
  );
}

// ================= Login (Supabase) =================
function LoginSupa() {
  const { ui, fecharLogin, eu, db, abrirCadastro, aguardarLogin, senhaFraca, pronto } = useContext(Ctx);
  const ini = ui.login || {};
  const [tipo, setTipo] = useState(ini.tipo || 'cand');
  const [etapa, setEtapa] = useState(['nova-senha', 'senha', 'conta'].includes(ini.etapa) ? ini.etapa : 'tipo');
  const [aba, setAba] = useState(ini.aba === 'criar' ? 'criar' : 'entrar'); // entrar | criar | esqueci
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [busy, setBusy] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const limpa = () => { setErro(''); setAviso(''); };
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Já conectado: escolher o tipo leva direto ao perfil
  const escolher = (t) => { setTipo(t); limpa(); if (eu.id) { abrirCadastro(t); return; } setEtapa('senha'); };

  const enviar = async (ev) => {
    ev.preventDefault();
    if (busy) return;
    limpa();
    if (etapa === 'nova-senha') {
      const f = senhaFraca(senha); if (f) { setErro(f); return; }
      if (senha !== senha2) { setErro('As senhas não conferem.'); return; }
      setBusy(true);
      try { await conta.novaSenha(senha); setBusy(false); setAviso('Senha alterada! Você já está conectado.'); setEtapa('tipo'); setSenha(''); setSenha2(''); }
      catch (e) { setBusy(false); setErro(erroAuth(e)); }
      return;
    }
    if (!emailOk) { setErro('Informe um e-mail válido.'); return; }
    if (aba === 'esqueci') {
      setBusy(true);
      try { await conta.esqueci(email); setAviso(`Se existir uma conta com ${email.trim()}, enviamos um link para criar uma nova senha. Confira também o spam.`); }
      catch (e) { setErro(erroAuth(e)); }
      setBusy(false);
      return;
    }
    if (aba === 'criar') {
      if (nome.trim().length < 2) { setErro(tipo === 'cand' ? 'Informe seu nome.' : 'Informe seu nome (responsável pela empresa).'); return; }
      const f = senhaFraca(senha); if (f) { setErro(f); return; }
      if (senha !== senha2) { setErro('As senhas não conferem.'); return; }
      setBusy(true);
      try {
        aguardarLogin(tipo);
        const r = await conta.criar(nome, email, senha);
        setBusy(false);
        if (r.precisaConfirmar) { setAviso(`Conta criada! Enviamos um link de confirmação para ${email.trim()}. Abra o e-mail e clique no link: você volta para cá já conectado. Confira também o spam.`); setSenha(''); setSenha2(''); }
        else setEntrando(true);
      } catch (e) { aguardarLogin(null); setBusy(false); setErro(erroAuth(e)); }
      return;
    }
    setBusy(true);
    try { aguardarLogin(tipo); await conta.entrar(email, senha); setEntrando(true); }
    catch (e) { aguardarLogin(null); setErro(erroAuth(e)); setSenha(''); }
    setBusy(false);
  };

  const pwField = (label, val, set, auto, ph) => (
    <label className="field"><span className="field-l">{label}</span>
      <span className="pw">
        <input className="in" type={ver ? 'text' : 'password'} autoComplete={auto} placeholder={ph} value={val} onChange={(e) => { set(e.target.value); limpa(); }} />
        <button type="button" className="pw-t" onClick={() => setVer(!ver)} aria-label={ver ? 'Ocultar senha' : 'Mostrar senha'}><IcEye size={18} /></button>
      </span>
    </label>
  );

  if (etapa === 'conta' && eu.id) {
    const outraConta = async () => { setBusy(true); aguardarLogin(null); await conta.sair().catch(() => {}); setBusy(false); setAba('criar'); setEtapa('senha'); };
    return (
      <main className="login-pg"><div className="login-card">
        <img src={LOGO_DARK} alt="Contratei" className="login-logo" />
        <span className="pill mini login-tipo">{tipo === 'cand' ? <IcUser size={13} /> : <IcBuilding size={13} />} {tipo === 'cand' ? 'Quero trabalhar' : 'Quero contratar'}</span>
        <h1>Você já está conectado</h1>
        <p className="muted">Este navegador está com a conta <b>{eu.email || eu.nome}</b> aberta. Quer criar o {tipo === 'cand' ? 'perfil de candidato' : 'cadastro da empresa'} nesta conta ou criar uma conta nova?</p>
        <div className="login-escolha">
          <button type="button" className="b-lime login-btn" disabled={busy} onClick={outraConta}>{busy ? 'Saindo…' : 'Criar uma conta nova'}</button>
          <button type="button" className="b-out login-btn" disabled={busy} onClick={() => abrirCadastro(tipo)}>Usar a conta {eu.email || 'conectada'}</button>
        </div>
        <div className="login-links"><button type="button" className="link small" onClick={fecharLogin}>Voltar para o início</button></div>
      </div></main>
    );
  }

  if (entrando || (eu.id && etapa === 'senha')) {
    return (
      <main className="login-pg"><div className="login-card">
        <img src={LOGO_DARK} alt="Contratei" className="login-logo" />
        <h1>Entrando…</h1>
        <p className="muted">Carregando a sua conta{pronto === eu.id && eu.id ? '' : ' e as oportunidades'}.</p>
      </div></main>
    );
  }

  if (etapa === 'tipo') {
    return (
      <main className="login-pg">
        <div className="login-card">
          <img src={LOGO_DARK} alt="Contratei" className="login-logo" />
          <h1>Entrar na Contratei</h1>
          <p className="muted">{eu.id ? `Você está conectado${eu.email ? ` como ${eu.email}` : ''}. Como quer usar a Contratei?` : 'Escolha como você quer usar a Contratei.'}</p>
          {aviso && <div className="login-ok" role="status">{aviso}</div>}
          <div className="login-escolha">
            <button type="button" className="b-lime login-btn" onClick={() => escolher('cand')}><IcUser size={18} /> {eu.id && db.candidatos[eu.id] ? 'Meu perfil de candidato' : 'Quero trabalhar'}</button>
            <button type="button" className="b-out login-btn" onClick={() => escolher('emp')}><IcBuilding size={18} /> {eu.id && db.empresas[eu.id] ? 'Minha empresa' : 'Quero contratar'}</button>
          </div>
          <div className="login-links"><button type="button" className="link small" onClick={fecharLogin}>Voltar para o início</button></div>
        </div>
      </main>
    );
  }

  const tipoTxt = tipo === 'cand' ? 'Quero trabalhar' : 'Quero contratar';
  const titulo = etapa === 'nova-senha' ? 'Crie uma nova senha' : aba === 'entrar' ? 'Entre com e-mail e senha' : aba === 'criar' ? 'Crie sua conta' : 'Recuperar senha';
  const sub = etapa === 'nova-senha' ? 'Escolha a nova senha da sua conta.'
    : aba === 'entrar' ? 'Digite o e-mail e a senha da sua conta.'
      : aba === 'criar' ? (tipo === 'cand' ? 'É gratuito. Depois você completa o perfil em etapas.' : 'Crie o acesso do responsável. Depois você cadastra a empresa e as vagas.')
        : 'Informe o e-mail da conta. Enviaremos um link para você criar uma nova senha.';
  return (
    <main className="login-pg">
      <form className="login-card" onSubmit={enviar} noValidate>
        <img src={LOGO_DARK} alt="Contratei" className="login-logo" />
        {etapa !== 'nova-senha' && <span className="pill mini login-tipo">{tipo === 'cand' ? <IcUser size={13} /> : <IcBuilding size={13} />} {tipoTxt}</span>}
        {etapa !== 'nova-senha' && aba !== 'esqueci' && (
          <div className="seg login-seg" role="tablist">
            <button type="button" className={aba === 'entrar' ? 'on' : ''} onClick={() => { setAba('entrar'); limpa(); }}>Entrar</button>
            <button type="button" className={aba === 'criar' ? 'on' : ''} onClick={() => { setAba('criar'); limpa(); }}>Criar conta</button>
          </div>
        )}
        <h1>{titulo}</h1>
        <p className="muted">{sub}</p>
        {ini.plano && etapa !== 'nova-senha' && <div className="login-ok" role="status">Para comprar o plano <b>{(PLANOS.find((p) => p.id === ini.plano) || {}).nome || ini.plano}</b>, entre ou crie a conta da empresa. Em seguida, abrimos o pagamento.</div>}
        {etapa !== 'nova-senha' && aba === 'criar' && (
          <label className="field"><span className="field-l">{tipo === 'cand' ? 'Seu nome completo' : 'Nome do responsável'}</span>
            <input className="in" autoComplete="name" placeholder="Nome e sobrenome" value={nome} onChange={(e) => { setNome(e.target.value); limpa(); }} />
          </label>
        )}
        {etapa !== 'nova-senha' && (
          <label className="field"><span className="field-l">E-mail</span>
            <input className="in" type="email" autoComplete="username" placeholder="voce@email.com" value={email} onChange={(e) => { setEmail(e.target.value); limpa(); }} autoFocus={aba !== 'criar'} />
          </label>
        )}
        {etapa === 'nova-senha' || aba === 'criar'
          ? <>{pwField(etapa === 'nova-senha' ? 'Nova senha' : 'Crie uma senha', senha, setSenha, 'new-password', 'Mínimo de 8 caracteres, com letras e números')}{pwField('Confirme a senha', senha2, setSenha2, 'new-password', 'Repita a senha')}</>
          : aba === 'entrar' ? pwField('Senha', senha, setSenha, 'current-password', 'Sua senha') : null}
        {aba === 'criar' && etapa !== 'nova-senha' && <p className="small muted">Ao criar a conta, você concorda com os Termos de Uso e a Política de Privacidade da Contratei.</p>}
        {erro && <div className="login-erro" role="alert">{erro}</div>}
        {aviso && <div className="login-ok" role="status">{aviso}</div>}
        <button type="submit" className="b-lime login-btn" disabled={busy || (etapa !== 'nova-senha' && !email) || (aba !== 'esqueci' && !senha)}>
          {busy ? 'Aguarde…' : etapa === 'nova-senha' ? 'Salvar nova senha' : aba === 'entrar' ? 'Entrar' : aba === 'criar' ? 'Criar conta' : 'Enviar link'}
        </button>
        <div className="login-links">
          {etapa !== 'nova-senha' && aba === 'entrar' && <button type="button" className="link small" onClick={() => { setAba('esqueci'); setSenha(''); limpa(); }}>Esqueci minha senha</button>}
          {etapa !== 'nova-senha' && aba === 'esqueci' && <button type="button" className="link small" onClick={() => { setAba('entrar'); limpa(); }}>Voltar para entrar</button>}
          {etapa !== 'nova-senha' && <button type="button" className="link small" onClick={() => { setEtapa('tipo'); limpa(); }}>Trocar: {tipo === 'cand' ? 'quero contratar' : 'quero trabalhar'}</button>}
          <button type="button" className="link small" onClick={fecharLogin}>Voltar para o início</button>
        </div>
      </form>
    </main>
  );
}

// ================= Login =================
function Login() {
  const { ui, fecharLogin, modo, eu, db, lerAcesso, salvarAcesso, conferirSenha, entrarConta, senhaFraca } = useContext(Ctx);
  const online = modo === 'online' && eu.id;
  const ini = ui.login || {};
  const [tipo, setTipo] = useState(ini.tipo || 'cand');
  const [etapa, setEtapa] = useState(ini.etapa === 'senha' ? 'senha' : 'tipo');
  const [acesso, setAcesso] = useState(undefined); // undefined = carregando, null = ainda não criou
  const [modoSenha, setModoSenha] = useState('entrar'); // entrar | criar | redefinir
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [ver, setVer] = useState(false);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  const [tentativas, setTentativas] = useState(0);

  useEffect(() => {
    if (etapa !== 'senha' || !online) return;
    let vivo = true;
    setAcesso(undefined);
    lerAcesso().then((a) => { if (!vivo) return; setAcesso(a); setModoSenha(a ? 'entrar' : 'criar'); })
      .catch(() => { if (vivo) { setAcesso(null); setErro('Não foi possível verificar seu acesso agora. Recarregue a página.'); } });
    return () => { vivo = false; };
  }, [etapa, online]);

  const escolher = (t) => { setTipo(t); setEtapa('senha'); setErro(''); setSenha(''); setSenha2(''); };
  const limpa = () => setErro('');
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const enviar = async (ev) => {
    ev.preventDefault();
    if (busy) return;
    setErro('');
    if (!emailOk) { setErro('Informe um e-mail válido.'); return; }
    if (modoSenha === 'entrar') {
      if (tentativas >= 5) { setErro('Muitas tentativas. Recarregue a página para tentar de novo.'); return; }
      setBusy(true);
      const ok = email.trim().toLowerCase() === acesso.email && await conferirSenha(acesso, senha);
      await new Promise((r) => setTimeout(r, 500));
      setBusy(false);
      if (!ok) { setTentativas((n) => n + 1); setSenha(''); setErro('E-mail ou senha incorretos.'); return; }
      entrarConta(tipo);
      return;
    }
    if (modoSenha === 'redefinir' && email.trim().toLowerCase() !== acesso?.email) { setErro('Este não é o e-mail cadastrado no seu acesso.'); return; }
    const fraca = senhaFraca(senha);
    if (fraca) { setErro(fraca); return; }
    if (senha !== senha2) { setErro('As senhas não conferem.'); return; }
    setBusy(true);
    try { await salvarAcesso(email, senha); } catch (e) { setBusy(false); setErro('Não foi possível salvar sua senha. Tente novamente.'); return; }
    setBusy(false);
    entrarConta(tipo);
  };

  const tipoTxt = tipo === 'cand' ? 'Quero trabalhar' : 'Quero contratar';
  const temPerfil = tipo === 'cand' ? !!db.candidatos[eu.id] : !!db.empresas[eu.id];
  const pwField = (label, val, set, auto, ph) => (
    <label className="field"><span className="field-l">{label}</span>
      <span className="pw">
        <input className="in" type={ver ? 'text' : 'password'} autoComplete={auto} placeholder={ph} value={val} onChange={(e) => { set(e.target.value); limpa(); }} />
        <button type="button" className="pw-t" onClick={() => setVer(!ver)} aria-label={ver ? 'Ocultar senha' : 'Mostrar senha'}><IcEye size={18} /></button>
      </span>
    </label>
  );

  if (etapa === 'tipo' || !online) {
    return (
      <main className="login-pg">
        <div className="login-card">
          <img src={LOGO_DARK} alt="Contratei" className="login-logo" />
          <h1>Entrar na Contratei</h1>
          <p className="muted">Escolha como você quer usar a Contratei.</p>
          {!online && <div className="login-erro" role="status">O acesso funciona na página publicada, para quem tem convite.</div>}
          {online && (
            <div className="login-escolha">
              <button type="button" className="b-lime login-btn" onClick={() => escolher('cand')}><IcUser size={18} /> Quero trabalhar</button>
              <button type="button" className="b-out login-btn" onClick={() => escolher('emp')}><IcBuilding size={18} /> Quero contratar</button>
            </div>
          )}
          <div className="login-links"><button type="button" className="link small" onClick={fecharLogin}>Voltar para o início</button></div>
        </div>
      </main>
    );
  }

  const titulo = acesso === undefined ? 'Verificando…' : modoSenha === 'entrar' ? 'Entre com e-mail e senha' : modoSenha === 'criar' ? 'Crie seu acesso' : 'Redefinir senha';
  const sub = modoSenha === 'entrar' ? (temPerfil ? 'Digite seu e-mail e sua senha para acessar o seu perfil.' : 'Digite seu e-mail e sua senha para continuar o cadastro.')
    : modoSenha === 'criar' ? 'Primeiro acesso: cadastre o e-mail e a senha que você vai usar para entrar.'
      : 'Confirme o e-mail cadastrado e escolha uma nova senha.';
  return (
    <main className="login-pg">
      <form className="login-card" onSubmit={enviar} noValidate>
        <img src={LOGO_DARK} alt="Contratei" className="login-logo" />
        <span className="pill mini login-tipo">{tipo === 'cand' ? <IcUser size={13} /> : <IcBuilding size={13} />} {tipoTxt}</span>
        <h1>{titulo}</h1>
        {acesso !== undefined && <p className="muted">{sub}</p>}
        {acesso !== undefined && (
          <>
            <label className="field"><span className="field-l">E-mail</span>
              <input className="in" type="email" autoComplete="username" placeholder="voce@email.com" value={email} onChange={(e) => { setEmail(e.target.value); limpa(); }} autoFocus />
            </label>
            {modoSenha === 'entrar'
              ? pwField('Senha', senha, setSenha, 'current-password', 'Sua senha')
              : <>{pwField(modoSenha === 'criar' ? 'Crie uma senha' : 'Nova senha', senha, setSenha, 'new-password', 'Mínimo de 8 caracteres, com letras e números')}{pwField('Confirme a senha', senha2, setSenha2, 'new-password', 'Repita a senha')}</>}
            {erro && <div className="login-erro" role="alert">{erro}</div>}
            <button type="submit" className="b-lime login-btn" disabled={busy || !email || !senha || (modoSenha !== 'entrar' && !senha2)}>
              {busy ? 'Aguarde…' : modoSenha === 'entrar' ? 'Entrar' : modoSenha === 'criar' ? 'Criar acesso e continuar' : 'Salvar nova senha e entrar'}
            </button>
          </>
        )}
        <div className="login-links">
          {acesso && modoSenha === 'entrar' && <button type="button" className="link small" onClick={() => { setModoSenha('redefinir'); setSenha(''); setSenha2(''); limpa(); }}>Esqueci minha senha</button>}
          {acesso && modoSenha === 'redefinir' && <button type="button" className="link small" onClick={() => { setModoSenha('entrar'); setSenha(''); limpa(); }}>Lembrei a senha</button>}
          <button type="button" className="link small" onClick={() => { setEtapa('tipo'); limpa(); }}>Trocar: {tipo === 'cand' ? 'quero contratar' : 'quero trabalhar'}</button>
          <button type="button" className="link small" onClick={fecharLogin}>Voltar para o início</button>
        </div>
      </form>
    </main>
  );
}

// ================= Perguntas frequentes =================
function PerguntasFrequentes() {
  const [aberta, setAberta] = useState(null);
  return (
    <div className="faq">
      <div className="faq-h">
        <h2 className="lp-h2">Perguntas frequentes</h2>
        <p className="lp-p">Entenda como nossa inteligência artificial conecta profissionais e empresas.</p>
      </div>
      <div className="faq-list">
        {FAQ.map((f, i) => {
          const on = aberta === i;
          return (
            <div key={i} className={`faq-item ${on ? 'on' : ''}`}>
              <h3>
                <button type="button" className="faq-q" aria-expanded={on} aria-controls={`faq-r${i}`} id={`faq-q${i}`} onClick={() => setAberta(on ? null : i)}>
                  <span className="faq-n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="faq-t">{f.p}</span>
                  <span className="faq-ic" aria-hidden="true"><IcDown size={18} /></span>
                </button>
              </h3>
              <div className="faq-r" id={`faq-r${i}`} role="region" aria-labelledby={`faq-q${i}`} hidden={!on}>
                <p>{f.r}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ================= Entrada =================
function Entrada() {
  const { abrirLogin, abrirCadastro } = useContext(Ctx);
  return (
    <main className="lp">
      <section className="lp-hero lp-wrap">
        <div className="lp-l">
          <div className="kicker">Encontros que fazem sentido</div>
          <h1 className="lp-h">Seu próximo passo começa com uma <span className="ul">boa conexão.</span></h1>
          <p className="lp-p">Conectamos pessoas e empresas pelo que realmente importa: interesses, habilidades e objetivos em comum.</p>
          <div className="lp-btns">
            <button className="b-lime" onClick={() => abrirCadastro('cand', false, 'criar')}>Quero trabalhar</button>
            <button className="b-out" onClick={() => abrirCadastro('emp', false, 'criar')}>Quero contratar</button>
          </div>
          <p className="lp-note">Crie seu perfil. Descubra conexões com mais sentido.</p>
        </div>
        <div className="lp-photo">
          <img src={HERO_IMG} alt="Uma candidata e um empresário conversando em um café" />
          <div className="lp-card">
            <b>Mais afinidade. Mais possibilidades.</b>
            <ul>
              <li><IcCheck size={18} /> Interesses alinhados</li>
              <li><IcCheck size={18} /> Habilidades compatíveis</li>
              <li><IcCheck size={18} /> Objetivos em comum</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="lp-wrap" id="candidatos">
        <div className="lp-strip">
          <div><IcUser size={38} /><b>Seu perfil vai além do currículo</b></div>
          <div><IcHand size={40} /><b>O interesse precisa ser dos dois</b></div>
          <div><IcMsg size={38} /><b>A conversa começa com um match</b></div>
        </div>
      </section>

      <section className="lp-wrap lp-steps" id="como">
        <div className="kicker">Simples desde o começo</div>
        <h2 className="lp-h2">Menos procura. Mais conexão.</h2>
        <div className="lp-grid">
          {[['01', 'Conte o que você busca', 'Crie um perfil com suas habilidades, preferências e objetivos.'],
            ['02', 'Conheça suas conexões', 'Veja pessoas ou empresas com interesses próximos aos seus.'],
            ['03', 'Conversem sobre o próximo passo', 'Com interesse dos dois lados, o chat é liberado para marcar uma entrevista.']].map(([n, t, d]) => (
            <div key={n} className="lp-step">
              <div className="lp-num"><span>{n}</span><i /></div>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-wrap" id="planos">
        <PlanosPublicos />
      </section>

      <section className="lp-wrap" id="perguntas">
        <PerguntasFrequentes />
      </section>

      <section className="lp-wrap" id="empresas">
        <div className="lp-band">
          <div>
            <h2>A pessoa certa para o momento da sua empresa.</h2>
            <p>Encontre profissionais com afinidade com sua equipe e com a oportunidade.</p>
          </div>
          <span className="vdiv" />
          <button className="b-lime" onClick={() => abrirCadastro('emp', false, 'criar')}>Conhecer a Contratei para empresas</button>
        </div>
      </section>

    </main>
  );
}

// ================= Modais =================
function ModalHost({ modal, close, reset }) {
  const { db, upd, openThread, toast } = useContext(Ctx);

  if (modal.type === 'reset') {
    return (
      <Modal onClose={close}>
        <h2>Reiniciar a demonstração?</h2>
        <p className="muted">Os perfis de demonstração (Ana, Bruno, Carla, Ateliê Aurora e Campo Forte) e as conversas deles voltam ao estado inicial. Cadastros reais não são apagados.</p>
        <div className="m-actions"><Btn kind="ghost" onClick={close}>Cancelar</Btn><Btn kind="danger" onClick={reset}>Reiniciar</Btn></div>
      </Modal>
    );
  }

  if (modal.type === 'match') {
    const m = db.matches[modal.key];
    if (!m) return null;
    const c = db.candidatos[m.candId], o = db.oportunidades[m.oppId], e = db.empresas[o.empresaId];
    return (
      <Modal onClose={close} tone="celebra">
        <div className="match-m">
          <img src={LOGO_SYM} alt="" className="match-sym" />
          <h1>Deu match!</h1>
          <p className="match-f">{fraseMatch(c, o)}</p>
          <div className="match-p">
            <div><Avatar foto={c.foto} nome={c.nome} size={52} /><b>{c.nome}</b><span>{c.cidade}</span></div>
            <div className="match-x">+</div>
            <div><IcBuilding size={18} /><b>{e.nome}</b><span>{o.titulo}</span></div>
          </div>
          <p className="small muted">Os nomes foram liberados. Telefones e e-mails continuam privados: a conversa acontece aqui.</p>
          <Btn kind="lime" size="lg" onClick={() => openThread(m.id)}>Abrir conversa</Btn>
        </div>
      </Modal>
    );
  }

  if (modal.type === 'diff' || modal.type === 'treino') {
    const isT = modal.type === 'treino';
    const rows = modal.rows;
    return (
      <Modal onClose={close} wide>
        {isT ? (
          <div className="treino-res">
            <Bars stage={2} size={40} />
            {modal.score >= 50 ? (
              <>
                <h2>Competência demonstrada: {COMPS[modal.comp]}</h2>
                <p>Nível <b className="t-lime">{nivelTreino(modal.score)}</b> · {modal.score}/100{modal.best > modal.score ? ` (vale o seu melhor resultado: ${modal.best})` : ''}</p>
              </>
            ) : (
              <>
                <h2>{COMPS[modal.comp]}: em desenvolvimento</h2>
                <p>Você fez {modal.score}/100. Com 50 ou mais, a competência fica registrada como demonstrada. Que tal refazer?</p>
              </>
            )}
            <p className="small muted">{REGRA_TREINO}</p>
          </div>
        ) : (
          <>
            <h2>{modal.titulo}</h2>
            <p className="muted">{modal.sub}</p>
          </>
        )}
        <div className="why-h">{isT ? 'Como suas oportunidades mudaram' : 'Antes → depois'}</div>
        <div className="diff">
          {rows.map((x) => {
            const rel = isT && x.o && (x.o.essenciais.includes(modal.comp) || x.o.desejaveis.includes(modal.comp));
            const ess = isT && x.o && x.o.essenciais.includes(modal.comp);
            return (
              <div key={x.id} className={`diff-r ${x.depois !== x.antes ? 'chg' : ''}`}>
                <div className="diff-t">
                  <b>{x.titulo}</b>
                  {isT && x.depois !== null && (
                    <span className="small muted">{rel
                      ? `${COMPS[modal.comp]} é ${ess ? 'essencial' : 'desejável'} nesta função: conta em competências e em treinamentos.`
                      : `Sem alteração: ${COMPS[modal.comp].toLowerCase()} não é pedida nesta função.`}</span>
                  )}
                  {!isT && x.depois === null && x.r.bloqueios[0] && <span className="small muted">{x.r.bloqueios[0].texto}</span>}
                  {x.depois === null && isT && <span className="small muted">Fora das recomendações por requisito obrigatório.</span>}
                </div>
                <div className="diff-n">
                  <span className="muted">{x.antes ?? '—'}</span><span className="muted">→</span><b>{x.depois ?? '—'}</b>
                  <Delta a={x.antes} b={x.depois} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="m-actions"><Btn kind="lime" onClick={close}>Entendi</Btn></div>
      </Modal>
    );
  }

  if (modal.type === 'regras') {
    return (
      <Modal onClose={close} wide>
        <h2>Como a pontuação é calculada</h2>
        <p className="muted">Algoritmo simples por regras, hipótese inicial do MVP. Usa apenas informações profissionais. Uma nota de 85/100 representa compatibilidade pelas regras do protótipo, não uma avaliação da pessoa.</p>
        <ol className="rules">
          <li><b>Requisitos obrigatórios dos dois lados.</b> Se algo marcado como obrigatório não é atendido (ex.: só manhã × vaga exige noite), a conexão sai das recomendações. Se a empresa aceita iniciantes, a falta de experiência formal não elimina.</li>
          <li><b>Pontuação de 0 a 100</b> para cada combinação elegível, com correspondência total ou parcial.</li>
        </ol>
        <table className="tbl">
          <tbody>
            {Object.values(PARTES).map((p) => <tr key={p.label}><td>{p.label}</td><td className="t-lime">{p.max} pts</td></tr>)}
          </tbody>
        </table>
        <ul className="rules small">
          <li>Função (9), segmento (8), tipo de venda (9) e público de venda (4). Funções ou tipos de venda próximos valem metade.</li>
          <li>Salário fixo (15: piso atende, 11: pretensão cabe na faixa, menos se fica abaixo), comissão (5), tipo de contrato (3) e benefícios desejados que a vaga oferece (2).</li>
          <li>Turnos (6), dias (3), modalidade (3), local (3), carga horária (2), data de início (2) e mobilidade: CNH, veículo e viagens (1).</li>
          <li>Competências (10: essenciais valem o dobro; demonstrada em treino = 100%, declarada = 50%, “quero desenvolver” = 25% em vagas abertas a iniciantes), ferramentas (2), escolaridade (2) e idiomas (1).</li>
          <li>Treinamentos (10): nota das trilhas nas competências relevantes para a função.</li>
          <li><b>Idade não entra na pontuação.</b> A data de nascimento é privada e só verifica requisitos legais (maioridade ou jovem aprendiz).</li>
          <li><b>Pagamentos nunca entram no cálculo do ranking.</b></li>
        </ul>
        <div className="m-actions"><Btn kind="lime" onClick={close}>Fechar</Btn></div>
      </Modal>
    );
  }

  if (modal.type === 'comprar') return <ComprarModal empId={modal.empId} planoIni={modal.plano} motivo={modal.motivo} close={close} />;
  if (modal.type === 'condicoes') return <CondicoesModal matchId={modal.matchId} close={close} />;
  if (modal.type === 'efetivar') return <EfetivarModal matchId={modal.matchId} close={close} />;
  if (modal.type === 'encerrar') {
    const m = db.matches[modal.matchId];
    return (
      <Modal onClose={close}>
        <h2>Encerrar o processo?</h2>
        <p className="muted">A conversa fica registrada e {db.candidatos[m.candId].exib} é avisado(a) do encerramento.</p>
        <div className="m-actions">
          <Btn kind="ghost" onClick={close}>Cancelar</Btn>
          <Btn kind="danger" onClick={() => { upd((d) => { const mm = d.matches[m.id]; mm.etapa = 'encerrado'; mm.msgs.push(sis('A empresa encerrou o processo. Obrigado pela participação!')); }); close(); }}>Encerrar processo</Btn>
        </div>
      </Modal>
    );
  }
  return null;
}

function CondicoesModal({ matchId, close }) {
  const { db, upd } = useContext(Ctx);
  const m = db.matches[matchId];
  const c = db.candidatos[m.candId], o = db.oportunidades[m.oppId], e = db.empresas[o.empresaId];
  const base = Math.round((o.salarioMin + o.salarioMax) / 2 / 50) * 50;
  const [cond, setCond] = useState({
    inicio: hoje(7), turno: turnosTxt(o.turnos).replace(/^./, (s) => s.toUpperCase()), diaria: Math.round((base / 22) * 100) / 100,
    salarioPrevisto: base, vinculo: 'Contrato de experiência com registro em carteira',
    responsavel: e.responsavel, comps: [...o.essenciais], objetivo: `Acompanhar ${c.exib} no dia a dia, com apoio da equipe, e avaliar as competências combinadas.`,
  });
  const [ok, setOk] = useState(false);
  const s = (k, v) => setCond({ ...cond, [k]: v });
  return (
    <Modal onClose={close} wide>
      <h2>Avaliação de 5 dias: condições</h2>
      <p className="muted">Defina as condições que {c.exib} verá antes de aceitar.</p>
      <div className="grid2">
        <label className="field"><span className="field-l">Início</span><input className="in" type="date" value={cond.inicio} onChange={(ev) => s('inicio', ev.target.value)} /></label>
        <label className="field"><span className="field-l">Turno</span><input className="in" value={cond.turno} onChange={(ev) => s('turno', ev.target.value)} /></label>
        <label className="field"><span className="field-l">Remuneração por dia (R$)</span><input className="in" type="number" step="0.01" value={cond.diaria} onChange={(ev) => s('diaria', Number(ev.target.value) || 0)} /></label>
        <label className="field"><span className="field-l">Salário-base se efetivado (R$)</span><input className="in" type="number" step="50" value={cond.salarioPrevisto} onChange={(ev) => s('salarioPrevisto', Number(ev.target.value) || 0)} /></label>
        <label className="field"><span className="field-l">Vínculo</span>
          <select className="in" value={cond.vinculo} onChange={(ev) => s('vinculo', ev.target.value)}>
            <option>Contrato de experiência com registro em carteira</option>
            <option>Contrato por prazo determinado</option>
          </select>
        </label>
        <label className="field"><span className="field-l">Acompanhamento</span><input className="in" value={cond.responsavel} onChange={(ev) => s('responsavel', ev.target.value)} /></label>
      </div>
      <label className="field"><span className="field-l">Objetivo</span><textarea className="in" rows={2} value={cond.objetivo} onChange={(ev) => s('objetivo', ev.target.value)} /></label>
      <p className="small"><span className="muted">Competências a observar:</span> {cond.comps.map((k) => COMPS[k]).join(', ')}</p>
      <label className="check">
        <input type="checkbox" checked={ok} onChange={(ev) => setOk(ev.target.checked)} />
        <span>Confirmo que a empresa formaliza o vínculo e remunera os 5 dias. Esta etapa é início de trabalho, não um período sem custo ou encargos.</span>
      </label>
      <div className="m-actions">
        <Btn kind="ghost" onClick={close}>Cancelar</Btn>
        <Btn kind="lime" disabled={!ok || !cond.inicio} onClick={() => {
          upd((d) => { const mm = d.matches[matchId]; mm.avaliacao = { cond, aceita: false, dia: 0, obs: [] }; mm.etapa = 'avaliacao_proposta'; mm.msgs.push(sis(`${e.nome} propôs avançar para a avaliação de 5 dias. Veja as condições em “Processo seletivo”.`)); });
          close();
        }}>Enviar condições ao candidato</Btn>
      </div>
    </Modal>
  );
}

function ComprarModal({ empId, planoIni, motivo, close }) {
  const { db, upd, toast } = useContext(Ctx);
  const [pl, setPl] = useState(planoIni || 'crescimento');
  const [pedidoId, setPedidoId] = useState(null);
  const [comp, setComp] = useState('');
  const p = planoDe(pl);
  const link = db.config?.links?.[pl] || '';
  const sd = saldo(db, empId);
  const emp = db.empresas[empId];
  const criar = () => {
    const id = 'p' + Date.now().toString(36);
    upd((d) => { d.pedidos = d.pedidos || {}; d.pedidos[id] = { empId, plano: pl, valor: p.preco, status: 'aguardando', criadoEm: Date.now(), comprovante: '' }; });
    setPedidoId(id);
  };
  const informar = () => {
    upd((d) => { const x = d.pedidos[pedidoId]; if (x) { x.status = 'informado'; x.comprovante = comp.trim().slice(0, 200); x.informadoEm = Date.now(); } });
    toast('Pagamento informado. Os créditos aparecem assim que a Contratei confirmar o recebimento.');
    close();
  };
  return (
    <Modal onClose={close} wide>
      <h2>Comprar créditos de contratação</h2>
      <p className="muted">{emp?.nome || 'Sua empresa'} · saldo atual: <b className="t-white">{saldoTxt(sd)}</b></p>
      {motivo && <div className="login-erro">{motivo}</div>}
      {!pedidoId ? (
        <>
          <div className="pacotes">
            {PLANOS.map((x) => (
              <button key={x.id} className={`pacote ${pl === x.id ? 'on' : ''}`} onClick={() => setPl(x.id)}>
                <b>{x.nome}</b>
                <span className="pac-n">{x.creditos || '∞'}</span>
                <span className="small">{x.capTxt}</span>
                <span className="pac-p">{brl(x.preco, 2)}</span>
                <span className="small muted">{x.creditos ? `${brl(x.preco / x.creditos, 2)} por contratação` : 'pagamento único'}</span>
              </button>
            ))}
          </div>
          <p className="small muted">Pagamento único, sem mensalidade. 1 crédito é descontado só quando você efetiva uma contratação.</p>
          <div className="m-actions"><Btn kind="ghost" onClick={close}>Cancelar</Btn><Btn kind="lime" onClick={criar}>Continuar para o pagamento</Btn></div>
        </>
      ) : (
        <div className="pagar">
          <div className="pedido-box">
            <span className="muted small">Pedido</span><b>{pedidoId.toUpperCase()}</b>
            <span className="muted small">Pacote</span><b>{p.nome} · {p.capTxt}</b>
            <span className="muted small">Valor</span><b>{brl(p.preco, 2)}</b>
          </div>
          <p className="small"><b>1.</b> Pague pelo link seguro da InfinitePay (abre em outra aba). Se houver campo de observação, informe o código do pedido <b>{pedidoId.toUpperCase()}</b>.</p>
          {link ? <a className="b-lime pay-link" href={link} target="_blank" rel="noopener noreferrer">Pagar {brl(p.preco, 2)} na InfinitePay</a>
            : <div className="login-erro">O link de pagamento deste pacote ainda não foi configurado pela Contratei. Seu pedido ficou registrado e entraremos em contato.</div>}
          <p className="small"><b>2.</b> Depois de pagar, avise a Contratei. Os créditos são liberados assim que o pagamento for confirmado.</p>
          <input className="in" placeholder="Código da transação ou observação (opcional)" value={comp} onChange={(ev) => setComp(ev.target.value)} />
          <div className="m-actions"><Btn kind="ghost" onClick={close}>Pagar depois</Btn><Btn kind="lime" onClick={informar}>Já paguei</Btn></div>
        </div>
      )}
    </Modal>
  );
}

function EfetivarModal({ matchId, close }) {
  const { db, upd } = useContext(Ctx);
  const m = db.matches[matchId];
  const c = db.candidatos[m.candId];
  const [s, setS] = useState(m.avaliacao?.cond.salarioPrevisto || 2000);
  return (
    <Modal onClose={close}>
      <h2>Efetivar {c.nome}</h2>
      <p className="muted">Registre o salário-base mensal da efetivação.</p>
      {(() => { const sd = saldo(db, db.oportunidades[m.oppId].empresaId); return <div className="credito-uso"><b>Esta efetivação usa 1 crédito de contratação.</b> <span className="small">{sd.ilimitado ? 'Seu pacote é ilimitado.' : `Depois dela, restarão ${sd.disponivel - 1} ${sd.disponivel - 1 === 1 ? 'crédito' : 'créditos'}.`}</span></div>; })()}
      <div className="money-in"><span>R$</span><input className="in" type="number" step="50" value={s} onChange={(ev) => setS(Number(ev.target.value) || 0)} /></div>
      <div className="m-actions">
        <Btn kind="ghost" onClick={close}>Cancelar</Btn>
        <Btn kind="lime" onClick={() => { upd((d) => { const mm = d.matches[matchId]; mm.etapa = 'efetivado'; mm.efetivacao = { salarioBase: s, data: Date.now() }; mm.msgs.push(sis(`${c.nome} foi efetivada(o)! Salário-base: ${brl(s)}.`)); }); close(); }}>Confirmar efetivação</Btn>
      </div>
    </Modal>
  );
}

// ================= Inicialização =================
class Boundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) {
      return (
        <div className="crash">
          <img src={LOGO_DARK} alt="Contratei" />
          <p>Algo saiu do esperado na demonstração.</p>
          <button className="btn btn-lime" onClick={() => { try { localStorage.removeItem(KEY); } catch (e) { /* */ } location.reload(); }}>Reiniciar demonstração</button>
          <pre>{String(this.state.err?.message || this.state.err)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(<Boundary><App /></Boundary>);
