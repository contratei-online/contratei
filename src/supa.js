// Integração com o Supabase (versão publicada fora do Claude).
// A configuração pública (URL + chave publishable) é injetada no HTML pelo build-web.
// O cliente oficial é carregado do CDN, então o projeto não precisa de npm para rodar.

export const CFG = typeof window !== 'undefined' ? window.CONTRATEI_SUPABASE || null : null;
export const SUPA = !!(CFG && CFG.url && CFG.key);
const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

let clienteP = null;
export function cliente() {
  if (!SUPA) return Promise.reject(new Error('Supabase não configurado'));
  if (!clienteP) {
    clienteP = (window.__SUPA_MOCK ? Promise.resolve(window.__SUPA_MOCK) : import(/* @vite-ignore */ CDN).then((m) => m))
      .then((m) => m.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }));
  }
  return clienteP;
}

// Traduz erros do banco para códigos que o app entende
function traduz(error) {
  const msg = String(error?.message || '');
  if (/sem_credito/.test(msg)) return { code: 'sem_credito', message: msg };
  if (error?.code === '42501' || /row-level security|permission denied/i.test(msg)) return { code: 'invalid_argument', message: msg };
  return { code: error?.code || 'erro', message: msg };
}

// Adaptador com a mesma interface do banco do MVP: collection().onSnapshot, doc().set/delete/get
export function criarStore(sb) {
  let fila = Promise.resolve();
  const enfileirar = (fn) => { const p = fila.then(fn); fila = p.catch(() => {}); return p; }; // grava na ordem em que o app pediu
  const ouvintes = new Set();
  const docRef = (col, id) => ({
    set: (data) => enfileirar(async () => { const { error } = await sb.from(col).upsert({ id, data }); if (error) throw traduz(error); }),
    delete: () => enfileirar(async () => { const { error } = await sb.from(col).delete().eq('id', id); if (error) throw traduz(error); }),
    get: async () => {
      const { data, error } = await sb.from(col).select('id,data').eq('id', id).maybeSingle();
      if (error) throw traduz(error);
      return { exists: !!data, data: () => (data ? data.data : undefined) };
    },
  });
  const store = {
    doc: (path) => { const i = path.indexOf('/'); return docRef(path.slice(0, i), path.slice(i + 1)); },
    collection: (col) => ({
      doc: (id) => docRef(col, id),
      onSnapshot(cb, onErr) {
        const mapa = new Map();
        let vivo = true; let timer = null; let carregado = false;
        const snap = () => ({ docs: [...mapa].map(([id, d]) => ({ id, data: () => d })) });
        const emitir = () => { clearTimeout(timer); timer = setTimeout(() => { if (vivo) cb(snap()); }, 40); };
        const carregar = async () => {
          const linhas = [];
          for (let de = 0; ; de += 1000) {
            const { data, error } = await sb.from(col).select('id,data').range(de, de + 999);
            if (error) throw traduz(error);
            linhas.push(...data);
            if (data.length < 1000) break;
          }
          if (!vivo) return;
          mapa.clear(); linhas.forEach((r) => mapa.set(r.id, r.data));
          carregado = true;
          cb(snap());
        };
        const ch = sb.channel(`rt-${col}-${Math.random().toString(36).slice(2, 8)}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: col }, (p) => {
            if (p.eventType === 'DELETE') { if (p.old && p.old.id) mapa.delete(p.old.id); } else if (p.new && p.new.id) mapa.set(p.new.id, p.new.data);
            emitir();
          })
          .subscribe((status) => { if (status === 'SUBSCRIBED' && carregado) carregar().catch(() => {}); }); // reconexão: recarrega
        const ouvinte = { recarregar: () => carregar().catch(() => {}) };
        ouvintes.add(ouvinte);
        carregar().catch((e) => { if (onErr) onErr(e); });
        return () => { vivo = false; clearTimeout(timer); ouvintes.delete(ouvinte); try { sb.removeChannel(ch); } catch (e) { /* ignora */ } };
      },
    }),
    // Depois de uma gravação recusada, recarrega tudo para a tela voltar a refletir o banco
    recarregar: () => ouvintes.forEach((o) => o.recarregar()),
  };
  return store;
}

const ERROS_AUTH = [
  [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
  [/email not confirmed/i, 'Confirme seu e-mail antes de entrar. Procure a mensagem da Contratei na sua caixa de entrada (e no spam).'],
  [/user already registered|already been registered/i, 'Já existe uma conta com este e-mail. Use “Entrar” ou “Esqueci minha senha”.'],
  [/password should be at least|weak password/i, 'Senha fraca. Use pelo menos 8 caracteres, com letras e números.'],
  [/email rate limit|over_email_send_rate_limit/i, 'O envio de e-mails de confirmação atingiu o limite por hora. Tente de novo mais tarde ou avise a equipe da Contratei.'],
  [/security purposes|after \d+ seconds/i, 'Por segurança, aguarde alguns segundos antes de tentar de novo.'],
  [/rate limit|too many requests/i, 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.'],
  [/unable to validate email|invalid email/i, 'E-mail inválido.'],
  [/same password|different from the old/i, 'A nova senha precisa ser diferente da anterior.'],
];
export const erroAuth = (e) => {
  const m = String(e?.message || e || '');
  const achado = ERROS_AUTH.find(([re]) => re.test(m));
  return achado ? achado[1] : 'Não foi possível concluir agora. Verifique sua conexão e tente novamente.';
};

// Ações de conta
export const conta = {
  async entrar(email, senha) {
    const sb = await cliente();
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha });
    if (error) throw error;
    return data;
  },
  async criar(nome, email, senha) {
    const sb = await cliente();
    const { data, error } = await sb.auth.signUp({
      email: email.trim().toLowerCase(), password: senha,
      options: { data: { nome: nome.trim() }, emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (error) throw error;
    // Com confirmação de e-mail ligada, não vem sessão: a pessoa precisa clicar no link
    if (data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error('User already registered');
    return { precisaConfirmar: !data.session };
  },
  async esqueci(email) {
    const sb = await cliente();
    const { error } = await sb.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: window.location.origin + window.location.pathname });
    if (error) throw error;
  },
  async novaSenha(senha) {
    const sb = await cliente();
    const { error } = await sb.auth.updateUser({ password: senha });
    if (error) throw error;
  },
  async sair() {
    const sb = await cliente();
    await sb.auth.signOut();
  },
  async ehAdmin() {
    const sb = await cliente();
    const { data, error } = await sb.rpc('is_admin');
    return !error && data === true;
  },
};
