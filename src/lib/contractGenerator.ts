import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import { Contract, PLAN_TYPE_LABELS, formatBRL } from '@/types/contract';
import logoUrl from '@/assets/logo-cantinho-full.png';

const PLACEHOLDER = '[ A PREENCHER ]';

const fmtDate = (iso?: string | null) => {
  if (!iso) return PLACEHOLDER;
  try {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(iso));
  } catch { return PLACEHOLDER; }
};

const safe = (v: any) => (v === null || v === undefined || v === '') ? PLACEHOLDER : String(v);

const loadImageAsDataURL = async (url: string): Promise<{ dataUrl: string; bytes: Uint8Array; w: number; h: number }> => {
  const res = await fetch(url);
  const blob = await res.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const dataUrl: string = await new Promise((resolve) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
  const dims: { w: number; h: number } = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = dataUrl;
  });
  return { dataUrl, bytes, w: dims.w, h: dims.h };
};

const buildContractText = (contract: Contract) => {
  const c = contract.client_snapshot || {};
  const today = new Date();
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(today);
  const planLabel = PLAN_TYPE_LABELS[contract.plan_type];

  // Build pet list (main pet + extra pets)
  const allPets = [
    {
      name: c.name, breed: c.breed, petSize: c.petSize,
      birthDate: c.birthDate, gender: c.gender, castrated: c.castrated,
    },
    ...((c.pets as any[]) || []),
  ];

  const petLines = allPets.map((p, idx) =>
    `${idx + 1}. ${safe(p.name)}, nascido em ${fmtDate(p.birthDate)}, raça ${safe(p.breed)}, porte ${safe(p.petSize)}${p.gender ? ', sexo ' + p.gender : ''}${p.castrated !== undefined ? ', ' + (p.castrated ? 'castrado' : 'não castrado') : ''}.`
  );

  const feePercent = Number(contract.discount_percent) || 0;
  const cancellationLine = feePercent > 0
    ? `Cláusula Vigésima Segunda – Cancelamento deve ser comunicado formalmente com 30 dias de antecedência. Em caso de rescisão antecipada, será cobrada multa de ${feePercent}% sobre o valor restante do contrato (meses não utilizados).`
    : 'Cláusula Vigésima Segunda – Cancelamento deve ser comunicado formalmente com 30 dias de antecedência.';

  return {
    title: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CRECHE',
    intro: [
      'CONTRATADA: CANTINHO DO AUAU COMERCIO E PET SHOP LTDA, CNPJ nº 34.828.130/0001-39 e IE nº 636.398.454.111, estabelecida na Rua Pará nº 196 - Centro – São Caetano do Sul / SP - CEP 09510-130.',
      '',
      `CONTRATANTE: ${safe(c.tutorName)}, brasileiro(a), inscrito(a) sob o CPF: ${safe(c.tutorCpf)}, residente e domiciliado no endereço: ${safe(c.tutorAddress)}${c.tutorNeighborhood ? ' - ' + c.tutorNeighborhood : ''}, telefone: ${safe(c.tutorPhone)}, doravante denominado proprietário do(s) animal(is) de estimação:`,
      '',
      ...petLines,
    ],
    plan: [
      'DO OBJETO DO CONTRATO',
      'Cláusula Primeira – O presente instrumento tem por objetivo a prestação, por parte da CONTRATADA, de serviço de creche para cães.',
      '',
      `§1. Plano contratado: ${planLabel}`,
      `Frequência: ${contract.frequency_per_week}x por semana`,
      `Valor mensal: ${formatBRL(contract.final_monthly_value)}`,
      `Valor total do contrato: ${formatBRL(contract.total_contract_value)}`,
      `Vigência: ${fmtDate(contract.start_date)} até ${fmtDate(contract.end_date)}`,
      `Forma de pagamento: ${safe(contract.payment_method)}`,
      contract.observations ? `Observações: ${contract.observations}` : '',
    ].filter(Boolean),
    clauses: [
      'DA RESPONSABILIDADE DO CONTRATANTE',
      'Cláusula Segunda – Anteriormente à frequência do cão na creche, é mandatório o preenchimento e entrega da documentação apresentada pela CONTRATADA composta por Ficha Cadastral, Questionário sobre Saúde, Comportamento e Alimentação, Termo de Responsabilidade e Cessão de Imagem, fotocópia da Carteira de Vacinação e o presente Contrato.',
      'Cláusula Terceira – Exige-se no ato da matrícula as vacinas V8/V10, Raiva, Gripe/Tosse e Giardia dentro da validade de 1 ano, vermifugação há pelo menos 3 meses, uso de antipulgas dentro de 30 dias e exames complementares conforme raça/idade.',
      'Cláusula Quarta – O CONTRATANTE autoriza exame parasitológico de fezes e vermifugação trimestral, e antipulgas mensal, sendo os custos de responsabilidade do CONTRATANTE.',
      'Cláusula Quinta – Caberá ao CONTRATANTE o envio da alimentação do cão, especificando marca e tipo da ração, e roupa de frio caso faça uso.',
      'Cláusula Sexta – Em caso de medicamentos, o CONTRATANTE deverá enviar a medicação e a posologia por escrito.',
      'Cláusula Sétima – O CONTRATANTE compromete-se a informar qualquer problema de saúde do(s) cão(es), assumindo responsabilidade no caso de omissão.',
      'Cláusula Oitava – O CONTRATANTE declara ciência dos riscos inerentes à socialização e atividades em grupo.',
      'Cláusula Nona – Em caso de comportamento agressivo, a permanência do cão na creche poderá ser revista.',
      'Cláusula Décima – Em emergências, o CONTRATANTE autoriza atendimento em clínica veterinária escolhida pela CONTRATADA, com despesas de responsabilidade do CONTRATANTE.',
      '',
      'DA RESPONSABILIDADE DA CONTRATADA',
      'Cláusula Décima Primeira – A CONTRATADA realiza avaliação médico-veterinária e comportamental do cão antes do início.',
      'Cláusula Décima Segunda – A CONTRATADA é responsável pela segurança, alimentação, higienização e socialização dos cães.',
      'Cláusula Décima Terceira – Em caso de imperícia/negligência comprovada, o CONTRATANTE será ressarcido do tratamento veterinário.',
      'Cláusula Décima Quarta – A CONTRATADA não se responsabiliza por picadas de insetos ou eventualidades alheias; em caso de óbito natural, custos de necropsia são do CONTRATANTE.',
      '',
      'DAS REGRAS DA CRECHE',
      'Cláusula Décima Quinta – Todos os cães deverão ser castrados, exceto filhotes até 1 ano e fêmeas (que ficarão afastadas durante o cio).',
      'Cláusula Décima Sexta – Horário: seg-sex 7h-9h entrada / até 18h saída; sábado 9h-10h / até 16h. Atrasos serão cobrados.',
      'Cláusula Décima Sétima – Vacinas devem estar em dia.',
      'Cláusula Décima Oitava – Faltas podem ser repostas no mesmo mês mediante agendamento.',
      'Cláusula Décima Nona – Faltas por motivo de saúde, com comprovação, podem ser repostas no mês seguinte.',
      'Cláusula Vigésima – A CONTRATADA aceita somente cães sociáveis.',
      '',
      'DO PAGAMENTO',
      'Cláusula Vigésima Primeira – Pagamentos no início da vigência e nos dias 10 ou 30 dos meses subsequentes. Custos adicionais serão cobrados no próximo pagamento.',
      'Cláusula Vigésima Segunda – Cancelamento deve ser comunicado formalmente com 30 dias de antecedência.',
      'Cláusula Vigésima Terceira – Em pagamento por cartão de crédito, valor restante será revertido em produtos/serviços ou devolvido conforme parcelas.',
      '',
      'DO FORO',
      'Cláusula Vigésima Quinta – Foro: Comarca de São Caetano do Sul/SP.',
    ],
    closing: [
      `Por estarem assim justos e contratados, firmam o presente em duas vias de igual teor.`,
      ``,
      `São Caetano do Sul, ${today.getDate()} de ${monthName} de ${today.getFullYear()}.`,
      ``,
      ``,
      `_____________________________________`,
      `${safe(c.tutorName)}`,
      `CPF: ${safe(c.tutorCpf)}`,
      ``,
      ``,
      `_____________________________________`,
      `CANTINHO DO AUAU COMERCIO E PET SHOP LTDA`,
      `CNPJ: 34.828.130/0001-39`,
    ],
  };
};

export const generateContractPDF = async (contract: Contract) => {
  const data = buildContractText(contract);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 18;
  const maxWidth = 210 - margin * 2;
  let y = margin;

  // Logo
  try {
    const logo = await loadImageAsDataURL(logoUrl);
    const logoW = 30;
    const logoH = (logo.h / logo.w) * logoW;
    doc.addImage(logo.dataUrl, 'PNG', (210 - logoW) / 2, y, logoW, logoH);
    y += logoH + 4;
  } catch { /* ignore */ }

  const writeBlock = (lines: string[], opts: { bold?: boolean; size?: number; gap?: number } = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.size ?? 10);
    lines.forEach(line => {
      if (!line) { y += 3; return; }
      const wrapped = doc.splitTextToSize(line, maxWidth);
      wrapped.forEach((w: string) => {
        if (y > 280) { doc.addPage(); y = margin; }
        if (w.includes(PLACEHOLDER)) {
          doc.setTextColor(200, 30, 30);
        } else {
          doc.setTextColor(20, 20, 20);
        }
        doc.text(w, margin, y);
        y += (opts.size ?? 10) * 0.45 + 1.5;
      });
      y += opts.gap ?? 1;
    });
  };

  // Title
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(data.title, 105, y, { align: 'center' }); y += 8;

  writeBlock(data.intro);
  y += 2;
  writeBlock([data.plan[0]], { bold: true, size: 11 });
  writeBlock(data.plan.slice(1));
  y += 2;
  data.clauses.forEach(line => {
    if (line === line.toUpperCase() && line.length > 0 && line.length < 60) {
      y += 2;
      writeBlock([line], { bold: true, size: 11 });
    } else {
      writeBlock([line]);
    }
  });
  y += 4;
  writeBlock(data.closing);

  doc.save(`Contrato_${(contract.client_snapshot?.tutorName || 'cliente').replace(/\s+/g, '_')}.pdf`);
};

export const generateContractDOCX = async (contract: Contract) => {
  const data = buildContractText(contract);

  const para = (text: string, opts: { bold?: boolean; heading?: any; align?: any } = {}) =>
    new Paragraph({
      heading: opts.heading,
      alignment: opts.align,
      children: [new TextRun({ text, bold: opts.bold, color: text.includes(PLACEHOLDER) ? 'C81E1E' : '141414' })],
      spacing: { after: 120 },
    });

  // Logo image paragraph
  let logoParagraph: Paragraph | null = null;
  try {
    const logo = await loadImageAsDataURL(logoUrl);
    const targetW = 120;
    const targetH = Math.round((logo.h / logo.w) * targetW);
    logoParagraph = new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({
        type: 'png',
        data: logo.bytes,
        transformation: { width: targetW, height: targetH },
        altText: { title: 'Logo', description: 'Cantinho do AuAu', name: 'logo' },
      } as any)],
      spacing: { after: 200 },
    });
  } catch { /* ignore */ }

  const children: Paragraph[] = [
    ...(logoParagraph ? [logoParagraph] : []),
    para(data.title, { bold: true, heading: HeadingLevel.HEADING_1, align: AlignmentType.CENTER }),
    ...data.intro.map(t => para(t)),
    para(data.plan[0], { bold: true, heading: HeadingLevel.HEADING_2 }),
    ...data.plan.slice(1).map(t => para(t)),
    ...data.clauses.map(t => {
      const isHeader = t === t.toUpperCase() && t.length > 0 && t.length < 60;
      return para(t, { bold: isHeader, heading: isHeader ? HeadingLevel.HEADING_2 : undefined });
    }),
    new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 200 } }),
    ...data.closing.map(t => para(t, { align: AlignmentType.CENTER })),
  ];

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children,
    }],
    styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Contrato_${(contract.client_snapshot?.tutorName || 'cliente').replace(/\s+/g, '_')}.docx`);
};
