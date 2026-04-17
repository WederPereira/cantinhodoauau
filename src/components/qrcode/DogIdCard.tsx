import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClients } from '@/context/ClientContext';
import { toast } from 'sonner';
import { Download, Search, FileText, Filter, Loader2 } from 'lucide-react';
import { Client } from '@/types/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import logoSrc from '@/assets/logo-cantinho.png';
import jsPDF from 'jspdf';

// Vertical card aspect (similar to the PDF model: ~6.5 x 8.5 cm)
const CARD_W_MM = 65;
const CARD_H_MM = 90;

const COLORS = {
  bg: '#0f1830',
  bgGradEnd: '#0a1226',
  accent: '#f5a623',  // amber for name
  white: '#ffffff',
  muted: '#cbd5e1',
  logoOrange: '#e7691f',
  logoBlue: '#2c8acf',
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('img'));
    img.src = src;
  });

const svgToPngDataUrl = (svgEl: SVGElement, sizePx: number): Promise<string> =>
  new Promise((resolve, reject) => {
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = sizePx;
      canvas.height = sizePx;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, sizePx, sizePx);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('svg'));
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  });

const roundedRectPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const drawCardBackground = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, COLORS.bg);
  grad.addColorStop(1, COLORS.bgGradEnd);
  roundedRectPath(ctx, 0, 0, w, h, 18);
  ctx.fillStyle = grad;
  ctx.fill();
};

const drawLogoText = (ctx: CanvasRenderingContext2D, cx: number, cy: number, scale = 1) => {
  // "CANTINHO" orange
  ctx.font = `900 ${22 * scale}px 'Arial Black', 'Arial', sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.logoOrange;
  ctx.fillText('CANTINHO', cx, cy);
  // "DO AUAU" blue
  ctx.fillStyle = COLORS.logoBlue;
  ctx.fillText('DO AUAU', cx, cy + 22 * scale);
  // tagline
  ctx.font = `600 ${5.5 * scale}px 'Arial', sans-serif`;
  ctx.fillStyle = '#9aa9c5';
  ctx.fillText('AQUI O SEU DOGUINHO É MAIS FELIZ', cx, cy + 32 * scale);
};

/** FRONT card: QR + name + breed + tutor */
const renderFrontCanvas = async (client: Client, qrDataUrl: string, scale = 4): Promise<HTMLCanvasElement> => {
  const W = CARD_W_MM * scale * 3;  // mm -> px conversion approximation
  const H = CARD_H_MM * scale * 3;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  drawCardBackground(ctx, W, H);

  // QR (white panel)
  const qrSize = W * 0.55;
  const qrX = (W - qrSize) / 2;
  const qrY = H * 0.08;
  ctx.fillStyle = COLORS.white;
  roundedRectPath(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 12);
  ctx.fill();
  const qrImg = await loadImage(qrDataUrl);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // Name (amber)
  ctx.fillStyle = COLORS.accent;
  ctx.textAlign = 'center';
  ctx.font = `bold ${W * 0.075}px 'Arial', sans-serif`;
  const nameY = qrY + qrSize + W * 0.13;
  ctx.fillText(client.name, W / 2, nameY);

  // Raça
  ctx.fillStyle = COLORS.white;
  ctx.font = `600 ${W * 0.045}px 'Arial', sans-serif`;
  ctx.fillText(`Raça: ${client.breed || 'SRD'}`, W / 2, nameY + W * 0.08);

  // Tutor (wrap if long)
  ctx.font = `600 ${W * 0.04}px 'Arial', sans-serif`;
  const tutorText = `Tutor: ${client.tutorName || '—'}`;
  const maxW = W - 40;
  const words = tutorText.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  let ty = nameY + W * 0.15;
  for (const l of lines.slice(0, 2)) {
    ctx.fillText(l, W / 2, ty);
    ty += W * 0.055;
  }

  return canvas;
};

/** BACK card: photo + Cantinho do AuAu logo */
const renderBackCanvas = async (client: Client, scale = 4): Promise<HTMLCanvasElement> => {
  const W = CARD_W_MM * scale * 3;
  const H = CARD_H_MM * scale * 3;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  drawCardBackground(ctx, W, H);

  // Photo box
  const boxSize = W * 0.7;
  const boxX = (W - boxSize) / 2;
  const boxY = H * 0.12;
  ctx.fillStyle = '#000';
  roundedRectPath(ctx, boxX, boxY, boxSize, boxSize, 12);
  ctx.fill();

  if (client.photo) {
    try {
      const img = await loadImage(client.photo);
      ctx.save();
      roundedRectPath(ctx, boxX, boxY, boxSize, boxSize, 12);
      ctx.clip();
      // cover fit
      const ir = img.width / img.height;
      const br = 1;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (ir > br) { sw = img.height * br; sx = (img.width - sw) / 2; }
      else { sh = img.width / br; sy = (img.height - sh) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, boxX, boxY, boxSize, boxSize);
      ctx.restore();
    } catch {
      ctx.fillStyle = '#94a3b8';
      ctx.font = `500 ${W * 0.05}px 'Arial', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Sem foto', W / 2, boxY + boxSize / 2);
    }
  } else {
    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 ${W * 0.05}px 'Arial', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Sem foto', W / 2, boxY + boxSize / 2);
  }

  // Logo text below photo
  const logoY = boxY + boxSize + H * 0.07;
  drawLogoText(ctx, W / 2, logoY, scale);

  return canvas;
};

const generateQrSvg = async (client: Client): Promise<string> => {
  // Find the hidden SVG element rendered for this client
  const el = document.querySelector(`[data-card-qr="${client.id}"] svg`) as SVGElement | null;
  if (!el) {
    // Fallback: render via offscreen
    return '';
  }
  return svgToPngDataUrl(el, 600);
};

export const downloadCardForClient = async (client: Client) => {
  const qrDataUrl = await generateQrSvg(client);
  const front = await renderFrontCanvas(client, qrDataUrl);
  const back = await renderBackCanvas(client);

  const dl = (canvas: HTMLCanvasElement, side: string) => {
    const a = document.createElement('a');
    a.download = `carteirinha_${client.name}_${side}.png`.replace(/\s+/g, '_');
    a.href = canvas.toDataURL('image/png');
    a.click();
  };
  dl(front, 'frente');
  await new Promise(r => setTimeout(r, 250));
  dl(back, 'verso');
};

const downloadPngForClient = downloadCardForClient;

/** Build a multi-page PDF: 6 cards per page (3x2), front+back alternating pages */
const generatePdf = async (clients: Client[]): Promise<Blob> => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const cols = 3;
  const rows = 3;
  const perPage = cols * rows;
  const marginX = (pageW - cols * CARD_W_MM) / (cols + 1);
  const marginY = (pageH - rows * CARD_H_MM) / (rows + 1);

  const drawSheet = async (batch: Client[], side: 'front' | 'back') => {
    for (let i = 0; i < batch.length; i++) {
      const client = batch[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = marginX + col * (CARD_W_MM + marginX);
      const y = marginY + row * (CARD_H_MM + marginY);
      const qrDataUrl = side === 'front' ? await generateQrSvg(client) : '';
      const canvas = side === 'front'
        ? await renderFrontCanvas(client, qrDataUrl)
        : await renderBackCanvas(client);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      pdf.addImage(dataUrl, 'JPEG', x, y, CARD_W_MM, CARD_H_MM);
    }
  };

  for (let i = 0; i < clients.length; i += perPage) {
    const batch = clients.slice(i, i + perPage);
    if (i > 0) pdf.addPage();
    await drawSheet(batch, 'front');
    pdf.addPage();
    await drawSheet(batch, 'back');
  }

  return pdf.output('blob');
};

const DogIdCard: React.FC = () => {
  const { clients } = useClients();
  const [search, setSearch] = useState('');
  const [breedFilter, setBreedFilter] = useState('all');
  const [generating, setGenerating] = useState(false);

  const breeds = useMemo(() => {
    const set = new Set(clients.map(c => c.breed).filter(Boolean));
    return Array.from(set).sort();
  }, [clients]);

  const filtered = useMemo(() => {
    let list = [...clients];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(s) || c.tutorName.toLowerCase().includes(s));
    }
    if (breedFilter !== 'all') {
      list = list.filter(c => c.breed === breedFilter);
    }
    return list;
  }, [clients, search, breedFilter]);

  const qrValue = (client: Client) =>
    `Tutor: ${client.tutorName}\nDog: ${client.name}\nRaça: ${client.breed || 'N/A'}`;

  const handleDownloadAllPdf = async () => {
    if (filtered.length === 0) return;
    setGenerating(true);
    try {
      toast.info(`Gerando PDF de ${filtered.length} carteirinha(s)...`);
      // Wait a tick to ensure QR SVGs are mounted
      await new Promise(r => setTimeout(r, 100));
      const blob = await generatePdf(filtered);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carteirinhas-pet_${filtered.length}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF gerado!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadSinglePdf = async (client: Client) => {
    setGenerating(true);
    try {
      await new Promise(r => setTimeout(r, 100));
      const blob = await generatePdf([client]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carteirinha_${client.name}.pdf`.replace(/\s+/g, '_');
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao gerar PDF');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPng = async (client: Client) => {
    await downloadPngForClient(client);
    toast.success(`Carteirinha de ${client.name} baixada!`);
  };

  return (
    <div className="space-y-4">
      {/* Hidden QR codes (used to compose canvases) */}
      <div className="hidden">
        {filtered.map(client => (
          <div key={client.id} data-card-qr={client.id}>
            <QRCodeSVG
              value={qrValue(client)}
              size={300}
              level="H"
              imageSettings={{
                src: logoSrc,
                x: undefined,
                y: undefined,
                height: 60,
                width: 60,
                excavate: true,
              }}
            />
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar pet ou tutor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>
        <Select value={breedFilter} onValueChange={setBreedFilter}>
          <SelectTrigger className="w-[140px] h-10 text-xs">
            <Filter size={14} className="mr-1" />
            <SelectValue placeholder="Raça" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas ({clients.length})</SelectItem>
            {breeds.map(b => (
              <SelectItem key={b} value={b!}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {filtered.length} carteirinha(s) — frente + verso
        </p>
        <Button onClick={handleDownloadAllPdf} disabled={generating || filtered.length === 0} size="sm" className="gap-1.5 text-xs">
          {generating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
          Baixar todos em PDF
        </Button>
      </div>

      {/* Cards preview */}
      <div className="grid gap-6">
        {filtered.map(client => (
          <div key={`preview-${client.id}`} className="space-y-3">
            <div className="flex justify-center gap-3">
              {/* Front preview */}
              <div className="rounded-2xl overflow-hidden shadow-xl border border-border" style={{ width: 180, height: 248, background: COLORS.bg }}>
                <div className="relative w-full h-full bg-gradient-to-b from-[#0f1830] to-[#0a1226] p-3 flex flex-col items-center">
                  <div className="bg-white p-1.5 rounded-md mt-2">
                    <QRCodeSVG
                      value={qrValue(client)}
                      size={100}
                      level="H"
                      imageSettings={{ src: logoSrc, height: 22, width: 22, excavate: true, x: undefined, y: undefined }}
                    />
                  </div>
                  <h3 className="text-[#f5a623] text-[15px] font-bold mt-3 text-center leading-tight">{client.name}</h3>
                  <p className="text-white text-[10px] font-semibold mt-1.5">Raça: {client.breed || 'SRD'}</p>
                  <p className="text-white text-[9px] font-semibold mt-1 text-center px-1 leading-tight">Tutor: {client.tutorName}</p>
                </div>
              </div>

              {/* Back preview */}
              <div className="rounded-2xl overflow-hidden shadow-xl border border-border" style={{ width: 180, height: 248, background: COLORS.bg }}>
                <div className="relative w-full h-full bg-gradient-to-b from-[#0f1830] to-[#0a1226] p-3 flex flex-col items-center">
                  <div className="w-[130px] h-[130px] bg-black rounded-md overflow-hidden mt-3">
                    {client.photo ? (
                      <img src={client.photo} alt={client.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">Sem foto</div>
                    )}
                  </div>
                  <div className="mt-4 text-center leading-none">
                    <div className="text-[#e7691f] font-black text-[16px] tracking-tight">CANTINHO</div>
                    <div className="text-[#2c8acf] font-black text-[16px] tracking-tight">DO AUAU</div>
                    <div className="text-[6px] text-slate-400 font-semibold mt-1 tracking-wider">AQUI O SEU DOGUINHO É MAIS FELIZ</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDownloadPng(client)} className="gap-1 text-xs">
                <Download size={14} /> PNG (frente+verso)
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDownloadSinglePdf(client)} disabled={generating} className="gap-1 text-xs">
                {generating ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />} PDF
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DogIdCard;
