// Respostas "Outros": viram opções novas para todos e entram no banco de dados.
import { FUNCOES, SEGMENTOS, CIDADES, TIPOS, TIPO_FRASE, MODAL, MODAL_F, TURNOS, TL, DIAS, DL, COMPS, PRIORIDADES, IDIOMAS, FERRAMENTAS, PUBLICOS, BENEFICIOS } from './data.js';

export const CAMPOS = {
  funcao: 'Funções', segmento: 'Segmentos', cidade: 'Cidades', tipoVenda: 'Tipos de venda', modalidade: 'Modalidades',
  turno: 'Turnos', dia: 'Dias', competencia: 'Competências', prioridade: 'Prioridades',
  idioma: 'Idiomas', ferramenta: 'Ferramentas', publico: 'Públicos de venda', beneficio: 'Benefícios',
};
const LABEL_E_CHAVE = ['funcao', 'segmento', 'cidade', 'idioma', 'ferramenta'];

export const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

export const limpar = (s) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim().slice(0, 48);
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
};

export const chaveDe = (campo, label) => (LABEL_E_CHAVE.includes(campo) ? label : 'x-' + slug(label));

// Opções que já existem no campo, como pares [chave, rótulo]
export function opcoes(campo) {
  switch (campo) {
    case 'funcao': return FUNCOES.map((f) => [f, f]);
    case 'segmento': return SEGMENTOS.map((f) => [f, f]);
    case 'cidade': return CIDADES.map((f) => [f, f]);
    case 'tipoVenda': return Object.entries(TIPOS);
    case 'modalidade': return Object.entries(MODAL);
    case 'turno': return Object.entries(TURNOS);
    case 'dia': return DIAS;
    case 'competencia': return Object.entries(COMPS);
    case 'prioridade': return Object.entries(PRIORIDADES);
    case 'idioma': return IDIOMAS.map((f) => [f, f]);
    case 'ferramenta': return FERRAMENTAS.map((f) => [f, f]);
    case 'publico': return Object.entries(PUBLICOS);
    case 'beneficio': return Object.entries(BENEFICIOS);
    default: return [];
  }
}

// Procura uma opção com o mesmo texto (sem diferenciar maiúsculas e acentos)
export function existente(campo, label) {
  const s = slug(label);
  const hit = opcoes(campo).find(([, l]) => slug(l) === s);
  return hit ? hit[0] : null;
}

// Registra a opção nos dicionários usados pelos formulários e pelo cálculo
export function registrar(campo, chave, label) {
  const lc = label.charAt(0).toLowerCase() + label.slice(1);
  switch (campo) {
    case 'funcao': if (!FUNCOES.includes(label)) FUNCOES.push(label); break;
    case 'segmento': if (!SEGMENTOS.includes(label)) SEGMENTOS.push(label); break;
    case 'cidade': if (!CIDADES.includes(label)) CIDADES.push(label); break;
    case 'tipoVenda': if (!TIPOS[chave]) { TIPOS[chave] = label; TIPO_FRASE[chave] = `venda: ${lc}`; } break;
    case 'modalidade': if (!MODAL[chave]) { MODAL[chave] = label; MODAL_F[chave] = lc; } break;
    case 'turno': if (!TURNOS[chave]) { TURNOS[chave] = label; TL[chave] = lc; } break;
    case 'dia': if (!DL[chave]) { DIAS.push([chave, label]); DL[chave] = lc; } break;
    case 'competencia': if (!COMPS[chave]) COMPS[chave] = label; break;
    case 'prioridade': if (!PRIORIDADES[chave]) PRIORIDADES[chave] = label; break;
    case 'idioma': if (!IDIOMAS.includes(label)) IDIOMAS.push(label); break;
    case 'ferramenta': if (!FERRAMENTAS.includes(label)) FERRAMENTAS.push(label); break;
    case 'publico': if (!PUBLICOS[chave]) PUBLICOS[chave] = label; break;
    case 'beneficio': if (!BENEFICIOS[chave]) BENEFICIOS[chave] = label; break;
    default: break;
  }
}

export function registrarTodos(banco) {
  Object.entries(banco || {}).forEach(([campo, itens]) =>
    Object.entries(itens || {}).forEach(([chave, it]) => registrar(campo, chave, it.label)));
}
