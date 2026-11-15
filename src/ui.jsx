import React, { useState, useContext } from 'react';
import { Ctx } from './ctx.js';
import { CAMPOS, opcoes } from './outros.js';
import LOGO_FULL from '../assets/logo-full-sm.png';
import LOGO_SYM from '../assets/logo-sym.png';
import LOGO_DARK from '../assets/logo-dark.png';
import HERO_IMG from '../assets/hero.jpg';

export { LOGO_FULL, LOGO_SYM, LOGO_DARK, HERO_IMG };

// ---------- Ícones ----------
export function Bars({ stage = 0, size = 22 }) {
  const on = (i) => (stage === i || stage === 'all' ? 'var(--lime)' : 'var(--dim)');
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 30 24" aria-hidden="true">
      <polygon points="1,23 2.6,17 9,13.4 7.6,23" fill={on(1)} />
      <polygon points="10,23 12.2,12 17.2,9.2 15.4,23" fill={on(2)} />
      <polygon points="18,23 21,8.4 17.4,10.4 28.6,1 25.8,23" fill={on(3)} />
    </svg>
  );
}
const I = (d, extra) => ({ size = 18, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    {d}{extra}
  </svg>
);
export const IcChat = I(<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />);
export const IcLock = I(<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>);
export const IcCheck = I(<path d="m5 12 5 5L20 7" />);
export const IcX = I(<path d="M18 6 6 18M6 6l12 12" />);
export const IcCal = I(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>);
export const IcPin = I(<><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12Z" /><circle cx="12" cy="10" r="2.5" /></>);
export const IcClock = I(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
export const IcCoin = I(<><circle cx="12" cy="12" r="9" /><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2" /></>);
export const IcReset = I(<><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></>);
export const IcScreen = I(<><rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></>);
export const IcSwap = I(<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />);
export const IcDown = I(<path d="m6 9 6 6 6-6" />);
export const IcChev = I(<path d="m9 18 6-6-6-6" />);
export const IcHand = I(<><path d="m11 17 2 2a1 1 0 1 0 3-3" /><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" /><path d="m21 3 1 11h-2" /><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" /><path d="M3 4h8" /></>);
export const IcMsg = I(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 10h.01M12 10h.01M16 10h.01" /></>);
export const IcShield = I(<><path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6l-8-3Z" /><path d="m9 12 2 2 4-4" /></>);
export const IcMail = I(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>);
export const IcPhone = I(<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" />);
export const IcInsta = I(<><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17.5 6.5h.01" /></>);
export const IcBack = I(<path d="m15 18-6-6 6-6" />);
export const IcInfo = I(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>);
export const IcSend = I(<path d="M22 2 11 13M22 2l-7 20-4-9-9-4Z" />);
export const IcUser = I(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>);
export const IcBuilding = I(<><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3" /></>);
export const IcPlus = I(<path d="M12 5v14M5 12h14" />);
export const IcBolt = I(<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />);
export const IcEye = I(<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>);

// ---------- Componentes base ----------
export const Btn = ({ kind = 'ghost', size, className = '', children, ...p }) => (
  <button type="button" className={`btn btn-${kind} ${size ? 'btn-' + size : ''} ${className}`} {...p}>{children}</button>
);

function OutroInput({ onAdd, onCancel }) {
  const [t, setT] = useState('');
  const ok = () => { if (t.trim()) onAdd(t); };
  return (
    <span className="outro-in">
      <input className="in" autoFocus placeholder="Digite e adicione" value={t} maxLength={48}
        onChange={(e) => setT(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); ok(); } if (e.key === 'Escape') onCancel(); }} />
      <button type="button" className="btn btn-lime btn-sm" onClick={ok} disabled={!t.trim()}>Adicionar</button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancelar</button>
    </span>
  );
}

export function Chips({ opts, value, onChange, multi = true, max, campo }) {
  const ctx = useContext(Ctx);
  const [abrir, setAbrir] = useState(false);
  const sel = multi ? value : [value];
  const lista = campo ? opcoes(campo) : opts;
  const banco = (campo && ctx?.db?.outros?.[campo]) || {};
  const add = (txt) => {
    const k = ctx.addOutro(campo, txt);
    if (k) {
      if (!multi) onChange(k);
      else if (!value.includes(k) && (!max || value.length < max)) onChange([...value, k]);
    }
    setAbrir(false);
  };
  return (
    <div className="chips">
      {lista.map(([v, l]) => {
        const on = sel.includes(v);
        return (
          <button type="button" key={v} className={`chip ${on ? 'on' : ''} ${banco[v] ? 'novo' : ''}`} aria-pressed={on}
            title={banco[v] ? 'Opção criada por um usuário (banco “Outros”)' : undefined}
            onClick={() => {
              if (!multi) return onChange(v);
              if (on) onChange(value.filter((x) => x !== v));
              else if (!max || value.length < max) onChange([...value, v]);
            }}>
            {on && multi && <IcCheck size={14} />}{l}
          </button>
        );
      })}
      {campo && (abrir
        ? <OutroInput onAdd={add} onCancel={() => setAbrir(false)} />
        : <button type="button" className="chip outros" onClick={() => setAbrir(true)}>+ Outros</button>)}
    </div>
  );
}

// Lista suspensa com a opção "Outro…", que abre um campo de texto
export function SelectOutros({ campo, value, onChange }) {
  const ctx = useContext(Ctx);
  const [abrir, setAbrir] = useState(false);
  if (abrir) {
    return <OutroInput onAdd={(t) => { const k = ctx.addOutro(campo, t); if (k) onChange(k); setAbrir(false); }} onCancel={() => setAbrir(false)} />;
  }
  return (
    <select className="in" value={value} onChange={(e) => (e.target.value === '__outro' ? setAbrir(true) : onChange(e.target.value))}>
      {opcoes(campo).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      <option value="__outro">Outro…</option>
    </select>
  );
}

export function BancoOutros() {
  const { db, bancoStatus } = useContext(Ctx);
  const grupos = Object.entries(db.outros || {}).filter(([, v]) => Object.keys(v).length);
  const total = grupos.reduce((s, [, v]) => s + Object.keys(v).length, 0);
  return (
    <section className="card banco">
      <div className="row-between wrap">
        <h3>Banco de dados de respostas “Outros”</h3>
        <span className={`pill mini ${bancoStatus === 'online' ? 'lime' : ''}`}>
          {bancoStatus === 'online' ? 'Sincronizado com o banco de dados' : bancoStatus === 'carregando' ? 'Conectando ao banco…' : 'Salvo neste navegador'}
        </span>
      </div>
      <p className="small muted">Tudo o que for digitado em “+ Outros” vira uma opção nova para todos os perfis, conta no cálculo de compatibilidade e fica registrado aqui.</p>
      {total === 0 ? <p className="small muted">Nenhuma resposta “Outros” ainda.</p> : (
        <div className="banco-g">
          {grupos.map(([campo, itens]) => (
            <div key={campo}>
              <div className="why-h">{CAMPOS[campo] || campo}</div>
              <div className="chips static">{Object.entries(itens).map(([k, it]) => <span key={k} className="chip novo">{it.label}</span>)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function ObrigToggle({ value, onChange }) {
  return (
    <div className="seg" role="group" aria-label="Obrigatório ou preferível">
      <button type="button" className={value ? 'on obrig' : ''} onClick={() => onChange(true)}>Obrigatório</button>
      <button type="button" className={!value ? 'on' : ''} onClick={() => onChange(false)}>Preferível</button>
    </div>
  );
}

export function Field({ label, hint, obrig, onObrig, children }) {
  return (
    <div className="field">
      <div className="field-h">
        <div>
          <div className="field-l">{label}</div>
          {hint && <div className="field-hint">{hint}</div>}
        </div>
        {onObrig && <ObrigToggle value={obrig} onChange={onObrig} />}
      </div>
      {children}
    </div>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="sw" aria-hidden="true" />
      <span>{label}</span>
    </label>
  );
}

export function Score({ v, big }) {
  return (
    <div className={`score ${big ? 'big' : ''}`} style={{ '--p': v }}>
      <div className="score-ring"><span>{v}</span></div>
      <div className="score-l"><b>{v} de 100</b><span>pontos de compatibilidade</span></div>
    </div>
  );
}

export function Modal({ onClose, children, wide, tone }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className={`modal ${wide ? 'wide' : ''} ${tone || ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {onClose && <button className="modal-x" onClick={onClose} aria-label="Fechar"><IcX /></button>}
        {children}
      </div>
    </div>
  );
}

export function Reasons({ list }) {
  return (
    <ul className="reasons">
      {list.map((r, i) => (
        <li key={i} className={r.kind}>
          <span className="ri">{r.kind === 'ok' ? <IcCheck size={14} /> : r.kind === 'parcial' ? '◐' : <IcX size={13} />}</span>
          <span>{r.t}{r.kind === 'parcial' && <em className="tag-parcial">parcial</em>}</span>
        </li>
      ))}
    </ul>
  );
}

export function Breakdown({ partes }) {
  return (
    <div className="bd">
      {Object.entries(partes).map(([k, p]) => (
        <div className="bd-row" key={k}>
          <div className="bd-l"><span>{p.label}</span><b>{(Math.round(p.pts * 10) / 10).toLocaleString('pt-BR')} / {p.max}</b></div>
          <div className="bd-bar"><i style={{ width: `${(p.pts / p.max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

export function Delta({ a, b }) {
  if (a === null && b === null) return <span className="delta out">fora</span>;
  if (a === null) return <span className="delta up">entrou</span>;
  if (b === null) return <span className="delta down">saiu</span>;
  const d = b - a;
  return <span className={`delta ${d > 0 ? 'up' : d < 0 ? 'down' : 'eq'}`}>{d > 0 ? '+' : ''}{d}</span>;
}

export function Collapse({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`collapse ${open ? 'open' : ''}`}>
      <button type="button" className="collapse-h" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{title}</span><IcDown size={16} />
      </button>
      {open && <div className="collapse-b">{children}</div>}
    </div>
  );
}

// ---------- Foto de perfil ----------
export function Avatar({ foto, nome = '', size = 44, oculta }) {
  const ini = nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return (
    <span className={`avatar ${oculta ? 'oculta' : ''}`} style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {foto && !oculta ? <img src={foto} alt={`Foto de ${nome}`} /> : <span>{ini}</span>}
      {oculta && foto && <i className="av-lock" title="Foto liberada após o match"><IcLock size={Math.max(10, size * 0.26)} /></i>}
    </span>
  );
}

// Lê a imagem escolhida, recorta em quadrado no centro e reduz para 320 px (JPEG)
export function reduzirFoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return reject(new Error('Escolha um arquivo de imagem.'));
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    fr.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagem não suportado.'));
      img.onload = () => {
        const lado = Math.min(img.width, img.height);
        const cv = document.createElement('canvas');
        cv.width = cv.height = 320;
        cv.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 320, 320);
        resolve(cv.toDataURL('image/jpeg', 0.85));
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
