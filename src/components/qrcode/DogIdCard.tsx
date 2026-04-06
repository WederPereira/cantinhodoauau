import React, { useState, useMemo, useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClients } from '@/context/ClientContext';
import { toast } from 'sonner';
import { Download, Search, FileText, Filter } from 'lucide-react';
import { Client } from '@/types/client';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import jsPDF from 'jspdf';
import logoSrc from '@/assets/logo-cantinho.png';

// Card dimensions in mm for PDF
const CARD_MM_W = 59;
const CARD_MM_H = 86;

// Preview dimensions in px
const PREVIEW_W = 354; // ~59mm * 6
const PREVIEW_H = 516; // ~86mm * 6

// Canvas render scale for high quality
const RENDER_SCALE = 6;
const CANVAS_W = CARD_MM_W * RENDER_SCALE;
const CANVAS_H = CARD_MM_H * RENDER_SCALE;

// Preload logo
let cachedLogo: HTMLImageElement | null = null;
const loadLogo = (): Promise<HTMLImageElement> => {
  if (cachedLogo) return Promise.resolve(cachedLogo);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { cachedLogo = img; resolve(img); };
    img.onerror = reject;
    img.src = logoSrc;
  });
};

const qrValue = (client: Client) =>
  `Tutor: ${client.tutorName}\nDog: ${client.name}\nRaça: ${client.breed || 'N/A'}`;

const generateCardCanvas = async (client: Client): Promise<HTMLCanvasElement> => {
  const logo = await loadLogo().catch(() => null);
  const s = RENDER_SCALE; // shorthand for scale

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d')!;

    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
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

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
    bgGrad.addColorStop(0, '#1a1a2e');
    bgGrad.addColorStop(1, '#16213e');
    roundRect(0, 0, CANVAS_W, CANVAS_H, 10 * s);
    ctx.fillStyle = bgGrad;
    ctx.fill();
    ctx.save();
    roundRect(0, 0, CANVAS_W, CANVAS_H, 10 * s);
    ctx.clip();

    // Top accent
    ctx.fillStyle = '#4cc9f0';
    ctx.fillRect(0, 0, CANVAS_W, 3 * s);

    // Photo area - vertical card so photo on top
    const photoMargin = 6 * s;
    const photoW = CANVAS_W - photoMargin * 2;
    const photoH = 34 * s;
    const photoX = photoMargin;
    const photoY = 6 * s;

    const drawAfterPhoto = () => {
      // Pet name
      let curY = photoY + photoH + 6 * s;
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${7 * s}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(client.name.toUpperCase(), CANVAS_W / 2, curY);
      curY += 3 * s;

      // Accent line
      const lineW = 20 * s;
      ctx.strokeStyle = '#4cc9f0';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(CANVAS_W / 2 - lineW / 2, curY);
      ctx.lineTo(CANVAS_W / 2 + lineW / 2, curY);
      ctx.stroke();
      curY += 5 * s;

      // Info fields
      ctx.font = `${3.5 * s}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.textAlign = 'center';

      const drawField = (label: string, value: string) => {
        ctx.fillStyle = '#94a3b8';
        ctx.font = `${3 * s}px 'Inter', 'Segoe UI', sans-serif`;
        ctx.fillText(label, CANVAS_W / 2, curY);
        curY += 3.5 * s;
        ctx.fillStyle = '#e2e8f0';
        ctx.font = `600 ${3.5 * s}px 'Inter', 'Segoe UI', sans-serif`;
        ctx.fillText(value, CANVAS_W / 2, curY);
        curY += 4.5 * s;
      };

      if (client.breed) drawField('RAÇA', client.breed);
      if (client.birthDate) drawField('NASCIMENTO', format(new Date(client.birthDate), 'dd/MM/yyyy'));
      drawField('TUTOR', client.tutorName);

      // QR Code - generate on a temp canvas
      const qrCanvas = document.createElement('canvas');
      const qrSize = 160;
      qrCanvas.width = qrSize;
      qrCanvas.height = qrSize;

      // Create an off-screen container for QRCodeCanvas
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'fixed';
      tempDiv.style.left = '-9999px';
      document.body.appendChild(tempDiv);

      // Use a React-independent approach: draw QR manually
      // We'll use the hidden QR canvases rendered in the component
      const hiddenQr = document.querySelector(`[data-card-qr="${client.id}"] canvas`) as HTMLCanvasElement | null;

      const qrRenderSize = 18 * s;
      const qrX = (CANVAS_W - qrRenderSize) / 2;
      const qrY = CANVAS_H - qrRenderSize - 12 * s;

      // White background for QR
      ctx.fillStyle = '#ffffff';
      roundRect(qrX - 2 * s, qrY - 2 * s, qrRenderSize + 4 * s, qrRenderSize + 4 * s, 3 * s);
      ctx.fill();

      if (hiddenQr) {
        ctx.drawImage(hiddenQr, qrX, qrY, qrRenderSize, qrRenderSize);
      }

      // Draw logo on top of QR
      if (logo) {
        const logoSize = 5 * s;
        const logoX = qrX + (qrRenderSize - logoSize) / 2;
        const logoY = qrY + (qrRenderSize - logoSize) / 2;
        // White circle behind logo
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 1 * s, 0, Math.PI * 2);
        ctx.fill();
        // Draw logo
        ctx.save();
        ctx.beginPath();
        ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      }

      // Footer
      const footerH = 7 * s;
      ctx.fillStyle = '#4cc9f0';
      ctx.fillRect(0, CANVAS_H - footerH, CANVAS_W, footerH);
      ctx.fillStyle = '#1a1a2e';
      ctx.font = `bold ${3 * s}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('CANTINHO DO AUAU', CANVAS_W / 2, CANVAS_H - 2.5 * s);

      ctx.restore();
      document.body.removeChild(tempDiv);
      resolve(canvas);
    };

    // Load photo
    if (client.photo) {
      const photoImg = new Image();
      photoImg.crossOrigin = 'anonymous';
      photoImg.onload = () => {
        const imgRatio = photoImg.width / photoImg.height;
        const boxRatio = photoW / photoH;
        let sx = 0, sy = 0, sw = photoImg.width, sh = photoImg.height;
        if (imgRatio > boxRatio) {
          sw = photoImg.height * boxRatio;
          sx = (photoImg.width - sw) / 2;
        } else {
          sh = photoImg.width / boxRatio;
          sy = (photoImg.height - sh) / 2;
        }
        ctx.save();
        roundRect(photoX, photoY, photoW, photoH, 4 * s);
        ctx.clip();
        ctx.drawImage(photoImg, sx, sy, sw, sh, photoX, photoY, photoW, photoH);
        ctx.restore();
        drawAfterPhoto();
      };
      photoImg.onerror = () => {
        drawPlaceholder();
        drawAfterPhoto();
      };
      photoImg.src = client.photo;
    } else {
      drawPlaceholder();
      drawAfterPhoto();
    }

    function drawPlaceholder() {
      ctx.fillStyle = '#334155';
      roundRect(photoX, photoY, photoW, photoH, 4 * s);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.font = `${16 * s}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🐕', photoX + photoW / 2, photoY + photoH / 2);
      ctx.textBaseline = 'alphabetic';
    }
  });
};

export const downloadCardForClient = async (client: Client): Promise<void> => {
  const canvas = await generateCardCanvas(client);
  const link = document.createElement('a');
  link.download = `carteirinha_${client.name}_${client.tutorName}.png`.replace(/\s+/g, '_');
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
};

const generatePdf = async (clients: Client[], single = false) => {
  if (clients.length === 0) return;

  // A4 dimensions in mm
  const pageW = 210;
  const pageH = 297;
  const margin = 5;
  const gap = 3;

  const cols = Math.floor((pageW - margin * 2 + gap) / (CARD_MM_W + gap));
  const rows = Math.floor((pageH - margin * 2 + gap) / (CARD_MM_H + gap));
  const cardsPerPage = cols * rows;

  // Center cards on page
  const totalW = cols * CARD_MM_W + (cols - 1) * gap;
  const totalH = rows * CARD_MM_H + (rows - 1) * gap;
  const offsetX = (pageW - totalW) / 2;
  const offsetY = (pageH - totalH) / 2;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  for (let i = 0; i < clients.length; i++) {
    if (i > 0 && i % cardsPerPage === 0) {
      pdf.addPage();
    }

    const pageIdx = i % cardsPerPage;
    const col = pageIdx % cols;
    const row = Math.floor(pageIdx / cols);
    const x = offsetX + col * (CARD_MM_W + gap);
    const y = offsetY + row * (CARD_MM_H + gap);

    const canvas = await generateCardCanvas(clients[i]);
    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', x, y, CARD_MM_W, CARD_MM_H);
  }

  const filename = single
    ? `carteirinha_${clients[0].name}.pdf`.replace(/\s+/g, '_')
    : 'carteirinhas_pet.pdf';
  pdf.save(filename);
};

const DogIdCard: React.FC = () => {
  const { clients } = useClients();
  const [search, setSearch] = useState('');
  const [breedFilter, setBreedFilter] = useState('all');

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

  const handleDownloadPng = async (client: Client) => {
    await downloadCardForClient(client);
    toast.success(`Carteirinha de ${client.name} baixada!`);
  };

  const handleGeneratePdf = async () => {
    if (filtered.length === 0) return;
    toast.info('Gerando PDF...');
    await generatePdf(filtered);
    toast.success('PDF gerado!');
  };

  const handleSinglePdf = async (client: Client) => {
    toast.info('Gerando PDF...');
    await generatePdf([client], true);
    toast.success('PDF gerado!');
  };

  return (
    <div className="space-y-4">
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
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          {filtered.length} carteirinha(s)
        </p>
        <div className="flex gap-2">
          <Button onClick={handleGeneratePdf} variant="outline" size="sm" className="gap-1 text-xs">
            <FileText size={14} /> PDF Todos
          </Button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-6">
        {filtered.map(client => (
          <div key={client.id} className="space-y-2">
            {/* Hidden QR canvas for rendering */}
            <div data-card-qr={client.id} className="hidden">
              <QRCodeCanvas
                value={qrValue(client)}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Visual preview - vertical card 59x86 ratio */}
            <div
              className="mx-auto rounded-xl overflow-hidden shadow-lg border border-border"
              style={{ width: `${PREVIEW_W}px`, height: `${PREVIEW_H}px` }}
            >
              <div className="relative w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
                {/* Top accent */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#4cc9f0]" />

                {/* Photo - top area */}
                <div className="absolute left-[24px] top-[24px] right-[24px] h-[200px] rounded-lg overflow-hidden bg-slate-700">
                  {client.photo ? (
                    <img src={client.photo} alt={client.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">🐕</div>
                  )}
                </div>

                {/* Info - centered */}
                <div className="absolute left-0 right-0 top-[236px] text-center px-4">
                  <h3 className="text-lg font-bold text-white tracking-wide">{client.name.toUpperCase()}</h3>
                  <div className="h-[2px] w-16 bg-[#4cc9f0] mx-auto mt-1 mb-2" />
                  <div className="text-[10px] space-y-0.5">
                    {client.breed && (
                      <p><span className="text-slate-400">Raça:</span> <span className="text-slate-200 font-semibold">{client.breed}</span></p>
                    )}
                    {client.birthDate && (
                      <p><span className="text-slate-400">Nasc:</span> <span className="text-slate-200 font-semibold">{format(new Date(client.birthDate), 'dd/MM/yyyy')}</span></p>
                    )}
                    <p><span className="text-slate-400">Tutor:</span> <span className="text-slate-200 font-semibold">{client.tutorName}</span></p>
                  </div>
                </div>

                {/* QR with logo */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-[48px]">
                  <div className="bg-white rounded-md p-1.5 relative">
                    <QRCodeCanvas
                      value={qrValue(client)}
                      size={80}
                      level="H"
                      includeMargin={false}
                    />
                    {/* Logo overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white rounded-full p-0.5">
                        <img src={logoSrc} alt="Logo" className="w-5 h-5 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 h-[32px] bg-[#4cc9f0] flex items-center justify-center">
                  <span className="text-[#1a1a2e] text-[9px] font-bold tracking-widest">
                    CANTINHO DO AUAU
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDownloadPng(client)} className="gap-1 text-xs">
                <Download size={14} /> PNG
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleSinglePdf(client)} className="gap-1 text-xs">
                <FileText size={14} /> PDF
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DogIdCard;
