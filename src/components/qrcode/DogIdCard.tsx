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
import logoFullSrc from '@/assets/logo-cantinho-full.png';
import qrLogoMarkSrc from '@/assets/qr-logo-mark.png';
import jsPDF from 'jspdf';

// Foldable ID card dimensions (matches user-provided spec)
const CARD_W_MM = 55;
const CARD_H_MM = 62;
const PAIR_GAP_MM = 2; // fold line gap between front and back
const PAGE_GAP_MM = 4; // gap between pairs on the page

const COLORS = {
  bg: '#0f1830',
  bgGradEnd: '#0a1226',
  accent: '#f5a623',
  white: '#ffffff',
  muted: '#cbd5e1',
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('img'));
    img.src = src;
  });

// Pre-load the small QR-center mark (transparent paw, no square frame)
let cachedQrMarkImg: HTMLImageElement | null = null;
const getQrMarkImg = async (): Promise<HTMLImageElement> => {
  if (cachedQrMarkImg) return cachedQrMarkImg;
  cachedQrMarkImg = await loadImage(qrLogoMarkSrc);
  return cachedQrMarkImg;
};

let cachedFullLogoImg: HTMLImageElement | null = null;
const getFullLogoImg = async (): Promise<HTMLImageElement> => {
  if (cachedFullLogoImg) return cachedFullLogoImg;
  cachedFullLogoImg = await loadImage(logoFullSrc);
  return cachedFullLogoImg;
};

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

/** Render a QR code as PNG with the logo composited in the center (works reliably in PDF) */
const renderQrWithLogo = async (client: Client, sizePx = 600): Promise<string> => {
  // Find the hidden SVG element rendered for this client
  const el = document.querySelector(`[data-card-qr="${client.id}"] svg`) as SVGElement | null;
  let baseDataUrl = '';
  if (el) {
    baseDataUrl = await svgToPngDataUrl(el, sizePx);
  }
  if (!baseDataUrl) return '';

  // Composite logo on top of QR
  const canvas = document.createElement('canvas');
  canvas.width = sizePx;
  canvas.height = sizePx;
  const ctx = canvas.getContext('2d')!;
  const qrImg = await loadImage(baseDataUrl);
  ctx.drawImage(qrImg, 0, 0, sizePx, sizePx);

  try {
    const logo = await getQrMarkImg();
    const logoSize = sizePx * 0.18;
    const lx = (sizePx - logoSize) / 2;
    const ly = (sizePx - logoSize) / 2;
    // Draw transparent paw mark directly on QR (no white square frame)
    ctx.drawImage(logo, lx, ly, logoSize, logoSize);
  } catch {
    // ignore — QR remains valid without logo
  }

  return canvas.toDataURL('image/png');
};

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

/** FRONT card: QR + name + breed + tutor */
const renderFrontCanvas = async (client: Client, qrDataUrl: string, scale = 4): Promise<HTMLCanvasElement> => {
  const W = CARD_W_MM * scale * 3;
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
  if (qrDataUrl) {
    const qrImg = await loadImage(qrDataUrl);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  }

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

/** BACK card: photo + Cantinho do AuAu logo image (logo always fully visible) */
const renderBackCanvas = async (client: Client, scale = 4): Promise<HTMLCanvasElement> => {
  const W = CARD_W_MM * scale * 3;
  const H = CARD_H_MM * scale * 3;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  drawCardBackground(ctx, W, H);

  // Reserve a larger bottom strip for the logo (per user: smaller photo, bigger logo)
  const logoStripH = H * 0.32;
  const padTop = H * 0.06;
  const padX = W * 0.12;
  const photoMaxH = H - logoStripH - padTop - H * 0.04;
  const photoMaxW = W - padX * 2;
  const boxSize = Math.min(photoMaxH, photoMaxW);
  const boxX = (W - boxSize) / 2;
  const boxY = padTop;

  ctx.fillStyle = '#000';
  roundedRectPath(ctx, boxX, boxY, boxSize, boxSize, 12);
  ctx.fill();

  if (client.photo) {
    try {
      const img = await loadImage(client.photo);
      ctx.save();
      roundedRectPath(ctx, boxX, boxY, boxSize, boxSize, 12);
      ctx.clip();
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

  // Logo strip at the bottom — bigger, always fully visible
  try {
    const logo = await getFullLogoImg();
    const stripY = H - logoStripH;
    const maxW = W * 0.94;
    const maxH = logoStripH * 0.95;
    const ratio = logo.width / logo.height;
    let lw = maxW;
    let lh = lw / ratio;
    if (lh > maxH) {
      lh = maxH;
      lw = lh * ratio;
    }
    const lx = (W - lw) / 2;
    const ly = stripY + (logoStripH - lh) / 2;
    ctx.drawImage(logo, lx, ly, lw, lh);
  } catch {
    // ignore
  }

  return canvas;
};

export const downloadCardForClient = async (client: Client) => {
  const qrDataUrl = await renderQrWithLogo(client);
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

/**
 * Build a multi-page PDF: 6 cards per page (3 cols x 2 rows of folding pairs).
 * Each "slot" stacks: FRONT (QR) ROTATED 180° on top + BACK (photo+logo) UPRIGHT on bottom.
 * When printed and folded horizontally between the two halves, both sides appear upright -
 * a finished double-sided card like an RG/ID document.
 *
 *   [ FRONT QR  (upside down) ]   ← top half
 *   ───────── fold ─────────
 *   [ BACK photo (upright)   ]   ← bottom half
 */
const generatePdf = async (clients: Client[]): Promise<Blob> => {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const COLS = 3;
  const ROWS = 2;
  const perPage = COLS * ROWS;
  const pairH = CARD_H_MM * 2 + PAIR_GAP_MM;
  const startX = (pageW - COLS * CARD_W_MM - (COLS - 1) * PAGE_GAP_MM) / 2;
  const startY = (pageH - ROWS * pairH - (ROWS - 1) * PAGE_GAP_MM) / 2;

  for (let i = 0; i < clients.length; i++) {
    const slotIndex = i % perPage;
    if (slotIndex === 0 && i > 0) pdf.addPage();

    const client = clients[i];
    const col = slotIndex % COLS;
    const row = Math.floor(slotIndex / COLS);
    const x = startX + col * (CARD_W_MM + PAGE_GAP_MM);
    const yFront = startY + row * (pairH + PAGE_GAP_MM);
    const yBack = yFront + CARD_H_MM + PAIR_GAP_MM;

    const qrDataUrl = await renderQrWithLogo(client);
    const frontCanvas = await renderFrontCanvas(client, qrDataUrl);
    const backCanvas = await renderBackCanvas(client);

    // FRONT (QR) on TOP, rotated 180° so it becomes upright after folding
    const rotatedFront = document.createElement('canvas');
    rotatedFront.width = frontCanvas.width;
    rotatedFront.height = frontCanvas.height;
    const fctx = rotatedFront.getContext('2d')!;
    fctx.translate(rotatedFront.width / 2, rotatedFront.height / 2);
    fctx.rotate(Math.PI);
    fctx.drawImage(frontCanvas, -frontCanvas.width / 2, -frontCanvas.height / 2);
    pdf.addImage(rotatedFront.toDataURL('image/jpeg', 0.92), 'JPEG', x, yFront, CARD_W_MM, CARD_H_MM);

    // BACK (photo + logo) on BOTTOM, upright
    pdf.addImage(backCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', x, yBack, CARD_W_MM, CARD_H_MM);

    // Fold line (dashed) in the 2mm gap between front and back
    const foldY = yFront + CARD_H_MM + PAIR_GAP_MM / 2;
    pdf.setLineDashPattern([1, 1], 0);
    pdf.setDrawColor(180, 180, 180);
    pdf.line(x, foldY, x + CARD_W_MM, foldY);
    pdf.setLineDashPattern([], 0);
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
          {filtered.length} carteirinha(s) — 6 por página, dobrável (frente + verso)
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
                <div className="relative w-full h-full bg-gradient-to-b from-[#0f1830] to-[#0a1226] p-3 flex flex-col items-center justify-start">
                  <div className="w-[130px] h-[130px] bg-black rounded-md overflow-hidden mt-3">
                    {client.photo ? (
                      <img src={client.photo} alt={client.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">Sem foto</div>
                    )}
                  </div>
                  <img src={logoFullSrc} alt="Cantinho do AuAu" className="mt-4 max-w-[140px] object-contain" />
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
