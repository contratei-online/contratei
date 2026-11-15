// "A história por trás da Contratei": cada parte da marca conta um passo da jornada da Ana.
import { useContext, useEffect, useRef, useState } from 'react';
import { Ctx } from './ctx.js';
import MARCA_CONTRAT from '../assets/marca-contrat.png';
import MARCA_EI from '../assets/marca-ei.png';

const ETAPAS = [
  {
    id: 'potencial', parte: 'b1', titulo: 'Potencial', curta: 'Ana já sabia ouvir o cliente.',
    texto: 'No balcão da loja da família, Ana aprendeu a escutar antes de oferecer qualquer coisa. Nunca teve carteira assinada em vendas, mas tinha justamente o que muitas vagas procuram. O problema: esse talento não cabia em um currículo.',
    na: 'O perfil mostra interesses, habilidades e objetivos, e não só cargos anteriores.',
  },
  {
    id: 'preparo', parte: 'b2', titulo: 'Preparo', curta: 'Com treino, ela ganha confiança.',
    texto: 'Ana fez as trilhas de treinamento: situações reais de venda, em poucos minutos, no celular. Cada trilha concluída virou uma competência demonstrada no perfil dela, e ela passou a se enxergar como vendedora.',
    na: 'Treinamentos curtos e gratuitos, que destacam o perfil nas oportunidades em que aquela habilidade importa.',
  },
  {
    id: 'encontro', parte: 'b3', titulo: 'Encontro', curta: 'Uma empresa busca o perfil dela.',
    texto: 'Uma loja de Passo Fundo procurava alguém que soubesse escutar o cliente. A Contratei comparou o que a empresa precisava com o que Ana queria e sabia fazer, e mostrou os motivos da compatibilidade. As duas partes demonstraram interesse: deu match, e a conversa começou.',
    na: 'Ranking por compatibilidade, interesse dos dois lados e chat liberado só depois do match.',
  },
  {
    id: 'crescimento', parte: 'tip', titulo: 'Crescimento', curta: 'A contratação é só o começo.',
    texto: 'Entrevista marcada pelo chat, cinco dias de avaliação acompanhada e a efetivação. Ana começou sabendo o que a empresa esperava dela, e a empresa sabia exatamente por que tinha escolhido Ana. A seta para cima é o que vem depois.',
    na: 'Entrevista, avaliação de 5 dias e efetivação registradas na plataforma, do primeiro contato à contratação.',
  },
  {
    id: 'convite', parte: 'ei', titulo: 'O convite', tituloM: 'Convite', curta: 'Ei, já percebeu esse talento?',
    texto: 'O “ei” da Contratei é um chamado. Para a empresa: olhe além do currículo. Para quem busca uma oportunidade: perceba o seu próprio potencial. Toda boa contratação começa com alguém dizendo “ei, você tem algo aqui”.',
    na: 'Criar o perfil e treinar é gratuito. A empresa só paga quando efetiva uma contratação.',
    convite: true,
  },
];
const DURACAO = 7000;

// Símbolo da marca em partes: barras 1, 2, 3 e a ponta da seta
function Simbolo({ ativa, todas, className = '' }) {
  const cor = (p) => (todas || ativa === p ? 'var(--lime)' : 'rgba(255,255,255,.16)');
  return (
    <svg className={className} viewBox="0 0 30 24" aria-hidden="true">
      <polygon className={`hs-p ${ativa === 'b1' ? 'on' : ''}`} points="1,23 2.6,17 9,13.4 7.6,23" fill={cor('b1')} />
      <polygon className={`hs-p ${ativa === 'b2' ? 'on' : ''}`} points="10,23 12.2,12 17.2,9.2 15.4,23" fill={cor('b2')} />
      <polygon className={`hs-p ${ativa === 'b3' ? 'on' : ''}`} points="18,23 21,8.4 27.66,8.4 25.8,23" fill={cor('b3')} />
      <polygon className={`hs-p ${ativa === 'tip' ? 'on' : ''}`} points="17.4,10.4 28.6,1 27.66,8.4 21,8.4" fill={cor('tip')} />
    </svg>
  );
}

function IconeEtapa({ e }) {
  if (e.parte === 'ei') return <span className="hs-ei-ic">ei</span>;
  return <Simbolo ativa={e.parte} className="hs-ic" />;
}

export function Historia() {
  const { abrirCadastro } = useContext(Ctx);
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  const [visivel, setVisivel] = useState(false);
  const raiz = useRef(null);
  const e = ETAPAS[i];

  // Só anda sozinho quando a seção está na tela e a pessoa não pediu menos movimento
  useEffect(() => {
    const el = raiz.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setVisivel(true); return undefined; }
    const io = new IntersectionObserver(([x]) => setVisivel(x.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const calmo = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const andando = auto && visivel && !calmo;
  useEffect(() => {
    if (!andando) return undefined;
    const t = setTimeout(() => setI((x) => (x + 1) % ETAPAS.length), DURACAO);
    return () => clearTimeout(t);
  }, [i, andando]);

  const ir = (n) => { setAuto(false); setI((n + ETAPAS.length) % ETAPAS.length); };
  const teclas = (ev) => {
    if (ev.key === 'ArrowRight') { ev.preventDefault(); ir(i + 1); }
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); ir(i - 1); }
  };

  return (
    <div className="hs" ref={raiz}>
      <div className="hs-top">
        <h2 className="hs-h"><span className="hs-slash">/</span> A história por trás da Contratei</h2>
        <p className="hs-sub">Cada parte da nossa marca conta um passo da jornada da Ana, e de quem ainda vai descobrir o próprio talento. Toque nas etapas.</p>
      </div>

      <div className={`hs-logo etapa-${e.parte}`} aria-hidden="true">
        <Simbolo ativa={e.parte} todas className="hs-simbolo" />
        <span className="hs-word">
          <img src={MARCA_CONTRAT} alt="" className="hs-contrat" />
          <img src={MARCA_EI} alt="" className={`hs-eiw ${e.parte === 'ei' ? 'on' : ''}`} />
        </span>
      </div>

      <div className="hs-corpo">
      <div className="hs-etapas" role="tablist" aria-label="Etapas da história da Contratei" onKeyDown={teclas}>
        {ETAPAS.map((x, n) => (
          <button key={x.id} role="tab" id={`hs-t-${x.id}`} aria-selected={n === i} aria-controls="hs-painel" tabIndex={n === i ? 0 : -1}
            className={`hs-et ${n === i ? 'on' : ''} ${n < i ? 'feita' : ''}`} onClick={() => ir(n)}>
            <span className="hs-et-ic"><IconeEtapa e={x} /></span>
            <b>{x.tituloM ? <><span className="hs-td">{x.titulo}</span><span className="hs-tm">{x.tituloM}</span></> : x.titulo}</b>
            <span className="hs-et-c">{x.curta}</span>
            <i className="hs-bar">{n === i && andando && <i key={i} className="hs-fill" style={{ animationDuration: `${DURACAO}ms` }} />}{(n < i || (n === i && !andando)) && <i className="hs-fill cheia" />}</i>
          </button>
        ))}
      </div>

      <div className="hs-painel" id="hs-painel" role="tabpanel" aria-labelledby={`hs-t-${e.id}`} key={e.id}>
        <div className="hs-p-num">{String(i + 1).padStart(2, '0')} <span>/ 05</span></div>
        <div className="hs-p-body">
          <div className="hs-p-k">{e.titulo}</div>
          <h3>{e.curta}</h3>
          <p>{e.texto}</p>
          <div className="hs-na"><span>Na Contratei</span>{e.na}</div>
          {e.convite && (
            <div className="hs-cta">
              <button className="b-lime" onClick={() => abrirCadastro('cand', false, 'criar')}>Quero trabalhar</button>
              <button className="b-out hs-out" onClick={() => abrirCadastro('emp', false, 'criar')}>Quero contratar</button>
            </div>
          )}
        </div>
        <div className="hs-nav">
          <button onClick={() => ir(i - 1)} aria-label="Etapa anterior">‹</button>
          <button onClick={() => ir(i + 1)} aria-label="Próxima etapa">›</button>
        </div>
      </div>
      </div>
    </div>
  );
}
