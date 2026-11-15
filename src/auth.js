// Conta do administrador. A senha não fica no código: só o hash SHA-256.
// Login apenas de demonstração, feito no navegador; não é segurança de produção.
export const CONTAS = [
  { email: 'contrateionline@gmail.com', hash: 'c0c7e45941d57fb5482a9221dad2f852c6096443f9d74cbdd313db8ff50417c5', tipo: 'admin', id: 'admin', nome: 'Administrador' },
];
export const contaDo = (tipo, id) => CONTAS.find((c) => c.tipo === tipo && c.id === id) || null;

async function sha256(txt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verificar(email, senha) {
  const c = CONTAS.find((x) => x.email === String(email || '').trim().toLowerCase());
  if (!c || !senha) return null;
  try { return (await sha256(senha)) === c.hash ? c : null; } catch (e) { return null; }
}

// Senha das contas reais: fica no espaço privado de cada pessoa no banco (data/users/<id>/acesso),
// guardada como hash SHA-256 com sal. Ninguém mais lê esse espaço, nem o dono da página.
export const novoSal = () => [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
export const hashSenha = (senha, sal) => sha256(`${sal}:${senha}`);
export const senhaFraca = (s) => (s.length < 8 ? 'Use pelo menos 8 caracteres.' : !/[A-Za-z]/.test(s) || !/[0-9]/.test(s) ? 'Use letras e números.' : '');
