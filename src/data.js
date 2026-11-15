// ---------- Vocabulário ----------
export const LIME = '#A7EC19';

export const TURNOS = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };
export const TL = { manha: 'manhã', tarde: 'tarde', noite: 'noite' };
export const DIAS = [
  ['seg', 'Seg'], ['ter', 'Ter'], ['qua', 'Qua'], ['qui', 'Qui'], ['sex', 'Sex'], ['sab', 'Sáb'], ['dom', 'Dom'],
];
export const DL = { seg: 'seg', ter: 'ter', qua: 'qua', qui: 'qui', sex: 'sex', sab: 'sáb', dom: 'dom' };
export const TIPOS = { balcao: 'Balcão', consultiva: 'Consultiva', telefone: 'Telefone', digital: 'Digital', externa: 'Externa' };
export const TIPO_FRASE = {
  balcao: 'venda de balcão', consultiva: 'venda consultiva', telefone: 'venda por telefone',
  digital: 'venda digital', externa: 'venda externa',
};
export const TIPO_REL = [['balcao', 'consultiva'], ['consultiva', 'externa'], ['telefone', 'digital']];
export const MODAL = { presencial: 'Presencial', hibrido: 'Híbrido', remoto: 'Remoto' };
export const MODAL_F = { presencial: 'presencial', hibrido: 'híbrida', remoto: 'remota' };
export const FUNCOES = [
  'Vendedor(a) de loja', 'Consultor(a) de vendas', 'Representante comercial', 'SDR / pré-vendas', 'Atendimento ao cliente',
];
export const FUNC_GRUPOS = [
  ['Vendedor(a) de loja', 'Consultor(a) de vendas', 'Atendimento ao cliente'],
  ['SDR / pré-vendas', 'Atendimento ao cliente'],
  ['Representante comercial', 'Consultor(a) de vendas'],
];
export const SEGMENTOS = ['Moda e vestuário', 'Agronegócio', 'Tecnologia', 'Serviços', 'Alimentação', 'Saúde e beleza'];
export const CIDADES = ['Passo Fundo', 'Marau', 'Carazinho', 'Erechim'];
export const COMPS = {
  atendimento: 'Atendimento',
  escuta: 'Escuta do cliente',
  consultiva: 'Venda consultiva',
  negociacao: 'Negociação',
  fechamento: 'Fechamento',
  digital: 'Ferramentas digitais',
};
export const PRIORIDADES = {
  aprendizado: 'Aprender e crescer', salario: 'Salário fixo', comissao: 'Ganhar por desempenho',
  proximidade: 'Perto de casa', rotina: 'Rotina estável', flexibilidade: 'Flexibilidade de horário',
};
export const EXPERIENCIA = [
  [0, 'Nenhuma ainda (primeira oportunidade)'], [6, 'Até 6 meses'], [12, '6 meses a 1 ano'],
  [24, '1 a 3 anos'], [48, 'Mais de 3 anos'],
];
export const expTxt = (m) => (m === 0 ? 'primeira experiência' : m < 12 ? `${m} meses de experiência` : m === 12 ? '1 ano de experiência' : `${Math.round(m / 12)} anos de experiência`);

export const PLANOS = [
  { id: 'essencial', nome: 'Essencial', creditos: 1, preco: 59.9, capTxt: '1 contratação' },
  { id: 'crescimento', nome: 'Crescimento', creditos: 5, preco: 149.9, capTxt: '5 contratações' },
  { id: 'escala', nome: 'Escala', creditos: null, preco: 399.9, capTxt: 'Contratações ilimitadas' },
];

const SEG_A_SAB = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const SEG_A_SEX = ['seg', 'ter', 'qua', 'qui', 'sex'];

// ---------- Dados fictícios ----------
export function seed() {
  // Banco começa vazio: só cadastros reais. Os links de pagamento ficam como padrão.
  return {
    version: 6,
    candidatos: {}, empresas: {}, oportunidades: {}, interesses: {}, matches: {}, creditos: {}, pedidos: {},
    config: { links: {
      essencial: 'https://link.infinitepay.io/parvusstudio/VC1DLUMtSQ-xH6yeajwq9-59,90',
      crescimento: 'https://link.infinitepay.io/parvusstudio/VC1DLUMtSQ-uYFZREcJvX-149,90',
      escala: 'https://link.infinitepay.io/parvusstudio/VC1DLUMtSQ-IHYTHeJnUB-399,90',
    } },
  };
}

// ---------- Trilhas de treinamento ----------
export const TRILHAS = [
  {
    comp: 'escuta', titulo: 'Escuta do cliente', duracao: '3 min', destaque: true,
    resumo: 'Entender a necessidade antes de oferecer um produto.',
    questoes: [
      {
        cenario: 'Uma cliente entra na loja e conta que procura uma roupa para uma entrevista de emprego. Ela tem R$ 150.',
        pergunta: 'Como você iniciaria o atendimento?',
        opcoes: [
          { t: '“Temos blazers lindos na promoção, a partir de R$ 129. Quer experimentar?”', p: 50,
            f: 'Resposta aceitável. Você respeitou o orçamento, mas ofereceu um produto antes de entender a vaga e o estilo da cliente. Pode acertar, mas por sorte.' },
          { t: '“Que legal, parabéns pela entrevista! É para qual tipo de vaga? Assim eu penso em algo que combine com o ambiente, dentro dos R$ 150.”', p: 100,
            f: 'Ótima escolha. Você acolheu, fez uma pergunta aberta sobre o contexto e mostrou que vai respeitar o orçamento. Isso é escuta ativa: entender antes de oferecer.' },
          { t: '“Com R$ 150 fica difícil montar algo para entrevista, mas posso mostrar as peças mais baratas.”', p: 0,
            f: 'Esta resposta desvaloriza o orçamento e a cliente. O foco fica no que falta, não no que é possível, e a chance de ela ir embora sem comprar aumenta.' },
        ],
      },
      {
        cenario: 'Durante o atendimento, a cliente comenta: “Eu nunca sei o que fica bem em mim”.',
        pergunta: 'O que você faz?',
        opcoes: [
          { t: 'Escolho o look por ela para agilizar o atendimento.', p: 0,
            f: 'Decidir pela cliente ignora o que ela sente. Ela pode até levar, mas dificilmente volta.' },
          { t: 'Digo que tudo fica bem nela e trago as peças mais vendidas.', p: 50,
            f: 'É gentil, mas genérico. As mais vendidas não respondem à insegurança que ela contou.' },
          { t: 'Pergunto em que roupas ela se sente confiante no dia a dia e sugiro duas opções a partir disso.', p: 100,
            f: 'Perfeito. Você usou o que ela disse para orientar a sugestão e reduziu as opções, o que ajuda a decidir.' },
        ],
      },
    ],
  },
  {
    comp: 'atendimento', titulo: 'Atendimento que acolhe', duracao: '3 min',
    resumo: 'Primeiro contato, postura e resolução de problemas.',
    questoes: [
      {
        cenario: 'Você está repondo o estoque e um cliente entra na loja.', pergunta: 'Qual é a melhor atitude?',
        opcoes: [
          { t: 'Termino a reposição antes de falar com ele.', p: 0, f: 'O cliente percebe que não é prioridade. Os primeiros segundos definem a experiência.' },
          { t: 'Paro o que estou fazendo, cumprimento olhando nos olhos e pergunto como posso ajudar.', p: 100, f: 'Isso mesmo. Atenção imediata e um convite aberto para a conversa.' },
          { t: 'Cumprimento de longe e digo que já vou atender.', p: 50, f: 'Melhor do que ignorar, mas o cliente ainda espera sem saber quanto tempo.' },
        ],
      },
      {
        cenario: 'Um cliente reclama que a peça comprada ontem descosturou.', pergunta: 'Como você responde?',
        opcoes: [
          { t: 'Peço desculpas, verifico a peça e ofereço troca ou conserto na hora, conforme a política da loja.', p: 100, f: 'Ótimo. Você assumiu o problema e resolveu sem transferir o desconforto ao cliente.' },
          { t: 'Explico que provavelmente foi uso incorreto.', p: 0, f: 'Culpar o cliente encerra a relação. Primeiro se resolve, depois se orienta.' },
          { t: 'Digo que vou ver com a gerente quando ela chegar.', p: 50, f: 'Aceitável se você não tiver autonomia, mas combine um prazo e um retorno claro.' },
        ],
      },
    ],
  },
  {
    comp: 'consultiva', titulo: 'Venda consultiva', duracao: '4 min',
    resumo: 'Diagnosticar a necessidade e conectar a solução ao problema.',
    questoes: [
      {
        cenario: 'Um produtor rural pede “o adubo mais barato que vocês tiverem”.', pergunta: 'Qual é o primeiro passo?',
        opcoes: [
          { t: 'Mostro o mais barato e também o mais vendido.', p: 50, f: 'Dar opções ajuda, mas você ainda não sabe se algum deles serve para a lavoura dele.' },
          { t: 'Pergunto a cultura, a área e o resultado da última análise de solo antes de indicar.', p: 100, f: 'Excelente. Sem diagnóstico, o “mais barato” pode sair caro para o cliente.' },
          { t: 'Vendo o mais barato, ele sabe o que quer.', p: 0, f: 'Você perde a chance de ajudar e de construir confiança para as próximas safras.' },
        ],
      },
      {
        cenario: 'Você já entendeu a necessidade do cliente.', pergunta: 'Como apresentar a solução?',
        opcoes: [
          { t: 'Começo pelo preço.', p: 0, f: 'Preço sem contexto vira comparação. Mostre primeiro o valor para o problema dele.' },
          { t: 'Listo todas as vantagens do produto.', p: 50, f: 'Informação demais dilui o que importa para este cliente.' },
          { t: 'Conecto cada característica ao problema que o cliente contou.', p: 100, f: 'Isso é venda consultiva: a solução fala a língua do problema.' },
        ],
      },
    ],
  },
  {
    comp: 'negociacao', titulo: 'Negociação', duracao: '4 min',
    resumo: 'Defender valor e criar acordos bons para os dois lados.',
    questoes: [
      {
        cenario: 'A cliente diz: “Na outra loja está R$ 20 mais barato”.', pergunta: 'O que você responde?',
        opcoes: [
          { t: 'Pergunto o que está incluído lá e mostro o que oferecemos de diferente, como ajuste e troca facilitada, antes de falar em desconto.', p: 100, f: 'Ótimo. Você compara valor, não só preço, e preserva a margem.' },
          { t: 'Dou R$ 20 de desconto para não perder a venda.', p: 50, f: 'Às vezes funciona, mas ensina o cliente a sempre pedir desconto.' },
          { t: 'Digo que não dá para fazer nada.', p: 0, f: 'Fecha a conversa. Mesmo sem desconto, sempre há algo a explorar.' },
        ],
      },
      {
        cenario: 'O cliente pede um prazo maior de pagamento.', pergunta: 'Como você conduz?',
        opcoes: [
          { t: 'Concedo o prazo direto.', p: 50, f: 'Resolve agora, mas você cedeu sem pedir nada em troca.' },
          { t: 'Recuso, a política é à vista.', p: 0, f: 'Antes de recusar, vale entender o que é possível dentro da política.' },
          { t: 'Pergunto que parcela cabe no orçamento e proponho o prazo em troca de uma entrada ou de um pedido maior.', p: 100, f: 'Negociação de verdade: cada concessão tem uma contrapartida.' },
        ],
      },
    ],
  },
  {
    comp: 'fechamento', titulo: 'Fechamento', duracao: '3 min',
    resumo: 'Conduzir a decisão e cuidar do pós-venda.',
    questoes: [
      {
        cenario: 'O cliente experimentou, gostou e ficou em silêncio.', pergunta: 'O que você faz?',
        opcoes: [
          { t: 'Mostro mais cinco opções.', p: 0, f: 'Mais opções neste momento geram dúvida e adiam a decisão.' },
          { t: 'Faço uma pergunta de fechamento: “Vamos levar esta ou quer comparar com a azul?”', p: 100, f: 'Ótimo. Uma escolha simples entre duas opções ajuda o cliente a decidir.' },
          { t: 'Espero ele decidir sozinho.', p: 50, f: 'Respeitoso, mas o silêncio pode virar “vou pensar”.' },
        ],
      },
      {
        cenario: 'A venda foi concluída.', pergunta: 'Qual é o próximo passo?',
        opcoes: [
          { t: 'Agradeço, explico como funciona a troca e peço permissão para avisar sobre novidades.', p: 100, f: 'O fechamento abre a próxima venda. Excelente.' },
          { t: 'Agradeço e entrego a sacola.', p: 50, f: 'Correto, mas você perde a chance de criar relacionamento.' },
          { t: 'Vou direto para o próximo cliente.', p: 0, f: 'O cliente sai sem a sensação de ter sido bem atendido.' },
        ],
      },
    ],
  },
];

export const REGRA_TREINO =
  'Cada resposta vale 100 (ótima), 50 (aceitável) ou 0 (fraca). O nível da competência é a média da trilha. Com média de 50 ou mais, a competência fica registrada como demonstrada: Avançado (80 ou mais) ou Intermediário (50 a 79). Vale sempre o melhor resultado.';
export const nivelTreino = (s) => (s >= 80 ? 'Avançado' : s >= 50 ? 'Intermediário' : 'Em desenvolvimento');

// ---------- Campos ampliados do perfil ----------
export const ESCOLARIDADE = [
  ['fund', 'Ensino fundamental'], ['medio_inc', 'Ensino médio incompleto'], ['medio', 'Ensino médio completo'],
  ['tecnico', 'Curso técnico'], ['sup_cursando', 'Superior em andamento'], ['sup', 'Superior completo'], ['pos', 'Pós-graduação'],
];
export const escIdx = (k) => ESCOLARIDADE.findIndex(([x]) => x === k);
export const escLabel = (k) => (ESCOLARIDADE.find(([x]) => x === k) || [, 'Não informada'])[1];
export const IDIOMAS = ['Inglês', 'Espanhol', 'Italiano', 'Alemão', 'Libras'];
export const FERRAMENTAS = ['WhatsApp Business', 'Instagram', 'Excel/planilhas', 'CRM', 'Sistema de PDV', 'E-commerce/marketplace'];
export const PUBLICOS = { b2c: 'Consumidor final', b2b: 'Empresas (B2B)', agro: 'Produtor rural' };
export const BENEFICIOS = {
  vt: 'Vale-transporte', vr: 'Vale-refeição/alimentação', plano: 'Plano de saúde', treinamento: 'Treinamento',
  carreira: 'Plano de carreira', desconto: 'Desconto em produtos', celular: 'Celular corporativo', carro: 'Carro da empresa',
};
export const CONTRATOS = { clt: 'CLT', pj: 'PJ', temporario: 'Temporário', estagio: 'Estágio', aprendiz: 'Jovem aprendiz' };
export const CARGAS = { integral: 'Tempo integral', meio: 'Meio período', flexivel: 'Horário flexível' };
export const INICIOS = [['imediato', 'Imediato'], ['15d', 'Em até 15 dias'], ['30d', 'Em até 30 dias'], ['mais30', 'Mais de 30 dias']];
export const inicioIdx = (k) => INICIOS.findIndex(([x]) => x === k);
export const inicioLabel = (k) => (INICIOS.find(([x]) => x === k) || [, '—'])[1];
export const VIAGENS_C = { sim: 'Posso viajar com frequência', eventual: 'Viagens eventuais', nao: 'Não posso viajar' };
export const VIAGENS_O = { nao: 'Sem viagens', eventual: 'Viagens eventuais', frequente: 'Viagens frequentes' };
export const CNH = [['nenhuma', 'Não tenho'], ['A', 'A (moto)'], ['B', 'B (carro)'], ['AB', 'AB'], ['C+', 'C, D ou E']];
export const CNH_REQ = [['', 'Não exige'], ['A', 'Categoria A'], ['B', 'Categoria B']];
export const VEICULO_C = [['nenhum', 'Não tenho'], ['moto', 'Moto'], ['carro', 'Carro']];
export const VEICULO_O = [['', 'Não exige'], ['qualquer', 'Moto ou carro'], ['moto', 'Moto'], ['carro', 'Carro']];
export const IDADE_MIN = [['18', 'Maior de 18 anos'], ['aprendiz', 'Aceita jovem aprendiz (a partir de 14 anos)']];
export const idade = (nasc) => {
  if (!nasc) return null;
  const [y, m, d] = nasc.split('-').map(Number); const h = new Date();
  let a = h.getFullYear() - y; if (h.getMonth() + 1 < m || (h.getMonth() + 1 === m && h.getDate() < d)) a -= 1;
  return a;
};

const EXTRA_CAND = {
  ana: {
    nascimento: '2003-03-12', escolaridade: 'medio', cursos: 'Atendimento ao cliente (curso livre, 20 h)',
    idiomas: [], ferramentas: ['WhatsApp Business', 'Instagram'], publicos: ['b2c'], cnh: 'B', veiculo: 'nenhum', viagens: 'eventual',
    contratos: ['clt', 'temporario'], cargas: ['integral', 'meio'], inicio: 'imediato', beneficios: ['vt', 'vr', 'treinamento'],
    experiencias: [{ cargo: 'Atendente (informal)', empresa: 'Loja da família', periodo: '8 meses', descricao: 'Atendimento no balcão, caixa e organização da vitrine.' }],
    resultados: 'Montou a vitrine de fim de ano da loja da família, que aumentou o movimento em dezembro.',
  },
  bruno: {
    nascimento: '1990-08-21', escolaridade: 'tecnico', cursos: 'Técnico em Agropecuária',
    idiomas: ['Espanhol'], ferramentas: ['CRM', 'Excel/planilhas', 'WhatsApp Business'], publicos: ['agro', 'b2b'], cnh: 'AB', veiculo: 'carro', viagens: 'sim',
    contratos: ['clt', 'pj'], cargas: ['integral'], inicio: '30d', beneficios: ['plano', 'carro', 'celular'],
    experiencias: [{ cargo: 'Representante comercial', empresa: 'Revenda de insumos', periodo: '4 anos', descricao: 'Carteira de 120 produtores na região de Carazinho.' }],
    resultados: 'Bateu a meta anual de vendas em três dos quatro anos.',
  },
  carla: {
    nascimento: '1998-11-02', escolaridade: 'sup_cursando', cursos: 'Administração (5º semestre)',
    idiomas: ['Inglês'], ferramentas: ['CRM', 'Excel/planilhas', 'WhatsApp Business'], publicos: ['b2c', 'b2b'], cnh: 'B', veiculo: 'moto', viagens: 'eventual',
    contratos: ['clt'], cargas: ['integral', 'meio'], inicio: '15d', beneficios: ['vr', 'plano'],
    experiencias: [{ cargo: 'Operadora de atendimento', empresa: 'Central de atendimento', periodo: '2 anos', descricao: 'Atendimento ativo e receptivo, com metas de satisfação.' }],
    resultados: 'Nota média de satisfação de 4,8/5 nos atendimentos.',
  },
};
const EXTRA_OPP = {
  o1: { publico: 'b2c', escolaridadeMin: 'medio', cnhReq: '', veiculoReq: '', viagens: 'nao', contrato: 'clt', carga: 'integral', inicio: '15d', idiomas: [], ferramentas: ['WhatsApp Business', 'Instagram'], beneficios: ['vt', 'desconto', 'treinamento'], idadeMinima: '18' },
  o3: { publico: 'b2c', escolaridadeMin: 'medio_inc', cnhReq: '', veiculoReq: '', viagens: 'nao', contrato: 'clt', carga: 'integral', inicio: 'imediato', idiomas: [], ferramentas: ['Sistema de PDV'], beneficios: ['vt', 'vr'], idadeMinima: '18' },
  o2: { publico: 'agro', escolaridadeMin: 'medio', cnhReq: 'B', veiculoReq: '', viagens: 'frequente', contrato: 'clt', carga: 'integral', inicio: '30d', idiomas: ['Espanhol'], ferramentas: ['CRM', 'Excel/planilhas'], beneficios: ['plano', 'carro', 'celular'], idadeMinima: '18' },
  o4: { publico: 'agro', escolaridadeMin: 'medio', cnhReq: '', veiculoReq: '', viagens: 'nao', contrato: 'clt', carga: 'integral', inicio: 'imediato', idiomas: [], ferramentas: ['CRM', 'Excel/planilhas'], beneficios: ['plano', 'vr', 'carreira'], idadeMinima: '18' },
};
export function completarSeed(s) {
  Object.entries(EXTRA_CAND).forEach(([k, v]) => { Object.assign(s.candidatos[k], v); Object.assign(s.candidatos[k].obrig, { contrato: false, carga: false }); });
  Object.entries(EXTRA_OPP).forEach(([k, v]) => { Object.assign(s.oportunidades[k], v); Object.assign(s.oportunidades[k].obrig, { escolaridade: false, mobilidade: k === 'o2', inicio: false }); });
  return s;
}

// ---------- Modelos para cadastros reais ----------
export const DEMO_IDS = { cand: ['ana', 'bruno', 'carla'], emp: ['aurora', 'campo'] };
export const novoCandidato = (id, nome = '') => ({
  id, nome, exib: '', cidade: 'Passo Fundo', cidades: ['Passo Fundo'], modalidades: ['presencial'], turnos: [], dias: ['seg', 'ter', 'qua', 'qui', 'sex'],
  salarioMin: 1600, comissao: 'indiferente', funcoes: [], segmentos: [], tiposVenda: [], experiencia: 0, competencias: [], desenvolver: [],
  prioridades: [], sobre: '', treinos: {}, nascimento: '', escolaridade: '', cursos: '', idiomas: [], ferramentas: [], publicos: [],
  cnh: 'nenhuma', veiculo: 'nenhum', viagens: 'eventual', contratos: ['clt'], cargas: ['integral'], inicio: '15d', beneficios: [],
  experiencias: [], resultados: '', foto: null, certificados: [],
  obrig: { turno: false, dias: false, salario: false, modalidade: false, local: false, tipoVenda: false, segmento: false, contrato: false, carga: false },
  criadoEm: Date.now(),
});
export const novaEmpresa = (id, nome = '') => ({
  id, nome, resumo: '', setor: '', porte: '', responsavel: '', descricao: '', plano: 'essencial', criadoEm: Date.now(),
});
export const novaOportunidade = (empId, id) => ({
  id, empresaId: empId, titulo: 'Nova oportunidade privada', funcao: 'Vendedor(a) de loja', segmento: 'Moda e vestuário', tipoVenda: 'balcao',
  cidade: 'Passo Fundo', bairro: '', modalidade: 'presencial', turnos: ['manha'], dias: ['seg', 'ter', 'qua', 'qui', 'sex'],
  salarioMin: 1800, salarioMax: 2200, comissao: { tem: false, desc: '' }, essenciais: ['atendimento'], desejaveis: [],
  aceitaIniciante: true, experienciaMin: 0, oferece: '', preferencias: '',
  publico: 'b2c', escolaridadeMin: 'medio', cnhReq: '', veiculoReq: '', viagens: 'nao', contrato: 'clt', carga: 'integral', inicio: '15d',
  idiomas: [], ferramentas: [], beneficios: ['vt'], idadeMinima: '18',
  obrig: { turno: true, dias: false, local: false, escolaridade: false, mobilidade: false, inicio: false },
});
