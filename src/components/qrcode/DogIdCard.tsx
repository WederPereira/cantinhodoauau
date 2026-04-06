import React, { useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClients } from '@/context/ClientContext';
import { toast } from 'sonner';
import { Download, Search, FileText, Filter } from 'lucide-react';
import { Client } from '@/types/client';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import logoSrc from '@/assets/logo-cantinho.png';

const CARD_WIDTH = 430;
const CARD_HEIGHT = 271;

const generateCardCanvas = (client: Client, logoImg: HTMLImageElement | null): Promise<HTMLCanvasElement> => {
  return new Promise((resolve) => {
    const scale = 4;
    const w = CARD_WIDTH * scale;
    const h = CARD_HEIGHT * scale;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const roundRect = (x: number, y: number, rw: number, rh: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + rw - r, y);
      ctx.quadraticCurveTo(x + rw, y, x + rw, y + r);
      ctx.lineTo(x + rw, y + rh - r);
      ctx.quadraticCurveTo(x + rw, y + rh, x + rw - r, y + rh);
      ctx.lineTo(x + r, y + rh);
      ctx.quadraticCurveTo(x, y + rh, x, y + rh - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#1a1a2e');
    bgGrad.addColorStop(1, '#16213e');
    roundRect(0, 0, w, h, 16 * scale);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // Top accent line
    ctx.fillStyle = '#4cc9f0';
    ctx.fillRect(0, 0, w, 4 * scale);

    // Photo area
    const photoX = 18 * scale;
    const photoY = 22 * scale;
    const photoW = 100 * scale;
    const photoH = 130 * scale;

    const drawContent = () => {
      const rightX = photoX + photoW + 20 * scale;
      let curY = 30 * scale;

      // Pet name
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${20 * scale}px 'Inter', 'Segoe UI', sans-serif`;
      ctx.textAlign = 'left';
      const name = client.name.toUpperCase();
      ctx.fillText(name, rightX, curY + 16 * scale);
      curY += 30 * scale;

      // Accent line
      ctx.strokeStyle = '#4cc9f0';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(rightX, curY);
      ctx.lineTo(rightX + 80 * scale, curY);
      ctx.stroke();
      curY += 14 * scale;

      // Info fields
      ctx.font = `${8.5 * scale}px 'Inter', 'Segoe UI', sans-serif`;
      const drawField = (label: string, value: string) => {
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(label, rightX, curY);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = `600 ${8.5 * scale}px 'Inter', 'Segoe UI', sans-serif`;
        ctx.fillText(value, rightX + 48 * scale, curY);
        ctx.font = `${8.5 * scale}px 'Inter', 'Segoe UI', sans-serif`;
        curY += 15 * scale;
      };

      if (client.breed) drawField('Raça', client.breed);
      if (client.birthDate) drawField('Nasc.', format(new Date(client.birthDate), 'dd/MM/yyyy'));
      drawField('Tutor', client.tutorName);

      // QR Code area
      const qrSize = 80 * scale;
      const qrX = w - qrSize - 18 * scale;
      const qrY = h - qrSize - 36 * scale;

      ctx.fillStyle = '#ffffff';
      roundRect(qrX - 4 * scale, qrY - 4 * scale, qrSize + 8 * scale, qrSize + 8 * scale, 6 * scale);
      ctx.fill();

      // Render QR
      const tempSvg = document.querySelector(`[data-card-qr="${client.id}"] svg`);
      if (tempSvg) {
        const svgData = new XMLSerializer().serializeToString(tempSvg);
        const qrImg = new Image();
        qrImg.onload = () => {
          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          finishCard();
        };
        qrImg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      } else {
        finishCard();
      }

      function finishCard() {
        // Footer
        const footerH = 22 * scale;
        ctx.fillStyle = '#4cc9f0';
        ctx.fillRect(0, h - footerH, w, footerH);
        ctx.fillStyle = '#1a1a2e';
        ctx.font = `bold ${8 * scale}px 'Inter', 'Segoe UI', sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('CANTINHO DO AUAU', w / 2, h - 7 * scale);
        resolve(canvas);
      }
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
        roundRect(photoX, photoY, photoW, photoH, 8 * scale);
        ctx.clip();
        ctx.drawImage(photoImg, sx, sy, sw, sh, photoX, photoY, photoW, photoH);
        ctx.restore();
        drawContent();
      };
      photoImg.onerror = () => { drawPlaceholder(); drawContent(); };
      photoImg.src = client.photo;
    } else {
      drawPlaceholder();
      drawContent();
    }

    function drawPlaceholder() {
      ctx.fillStyle = '#334155';
      roundRect(photoX, photoY, photoW, photoH, 8 * scale);
      ctx.fill();
      ctx.fillStyle = '#64748b';
      ctx.font = `${40 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🐕', photoX + photoW / 2, photoY + photoH / 2);
      ctx.textBaseline = 'alphabetic';
    }
  });
};

const generatePdfCards = async (clients: Client[], logoImg: HTMLImageElement | null) => {
  const cardsPerPage = 4;
  const pageWidth = 595; // A4
  const pageHeight = 842;
  const margin = 30;
  const cardW = (pageWidth - margin * 3) / 2;
  const cardH = cardW / (CARD_WIDTH / CARD_HEIGHT);
  const gapY = 20;

  const pages: HTMLCanvasElement[] = [];
  
  for (let i = 0; i < clients.length; i += cardsPerPage) {
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = pageWidth * 3;
    pageCanvas.height = pageHeight * 3;
    const pCtx = pageCanvas.getContext('2d')!;
    pCtx.scale(3, 3);
    pCtx.fillStyle = '#ffffff';
    pCtx.fillRect(0, 0, pageWidth, pageHeight);

    const batch = clients.slice(i, i + cardsPerPage);
    for (let j = 0; j < batch.length; j++) {
      const col = j % 2;
      const row = Math.floor(j / 2);
      const x = margin + col * (cardW + margin);
      const y = margin + row * (cardH + gapY);

      const cardCanvas = await generateCardCanvas(batch[j], logoImg);
      pCtx.drawImage(cardCanvas, x, y, cardW, cardH);
    }
    pages.push(pageCanvas);
  }

  // Build PDF using jsPDF-like approach with canvas
  // We'll create a simple multi-page download using print
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast.error('Permita pop-ups para gerar o PDF');
    return;
  }

  const imagesHtml = pages.map(p => 
    `<img src="${p.toDataURL('image/png')}" style="width:100%;page-break-after:always;" />`
  ).join('');

  printWindow.document.write(`
    <html>
      <head><title>Carteirinhas Pet - PDF</title>
        <style>
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; }
          img { display: block; }
          img:last-child { page-break-after: avoid; }
        </style>
      </head>
      <body>${imagesHtml}</body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
};

export const downloadCardForClient = async (client: Client): Promise<void> => {
  const canvas = await generateCardCanvas(client, null);
  const link = document.createElement('a');
  link.download = `carteirinha_${client.name}_${client.tutorName}.png`.replace(/\s+/g, '_');
  link.href = canvas.toDataURL('image/png');
  link.click();
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

  const handleDownload = async (client: Client) => {
    await downloadCardForClient(client);
    toast.success(`Carteirinha de ${client.name} baixada!`);
  };

  const handleDownloadAllPng = async () => {
    for (const client of filtered) {
      await handleDownload(client);
      await new Promise(r => setTimeout(r, 400));
    }
    toast.success(`${filtered.length} carteirinha(s) gerada(s)!`);
  };

  const handleGeneratePdf = async () => {
    if (filtered.length === 0) return;
    toast.info('Gerando PDF...');
    await generatePdfCards(filtered, null);
  };

  const handleDownloadSinglePdf = async (client: Client) => {
    toast.info('Gerando PDF...');
    await generatePdfCards([client], null);
  };

  const qrValue = (client: Client) =>
    `Tutor: ${client.tutorName}\nDog: ${client.name}\nRaça: ${client.breed || 'N/A'}`;

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
            <FileText size={14} /> PDF
          </Button>
          <Button onClick={handleDownloadAllPng} variant="outline" size="sm" className="gap-1 text-xs">
            <Download size={14} /> PNG
          </Button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-6">
        {filtered.map(client => (
          <div key={client.id} className="space-y-2">
            {/* Hidden QR for canvas rendering */}
            <div data-card-qr={client.id} className="hidden">
              <QRCodeSVG
                value={qrValue(client)}
                size={200}
                level="H"
                imageSettings={{
                  src: logoSrc,
                  x: undefined,
                  y: undefined,
                  height: 50,
                  width: 50,
                  excavate: true,
                }}
              />
            </div>

            {/* Visual preview */}
            <div className="mx-auto rounded-xl overflow-hidden shadow-lg border border-border" style={{ width: `${CARD_WIDTH}px`, height: `${CARD_HEIGHT}px` }}>
              <div className="relative w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e]">
                {/* Top accent */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#4cc9f0]" />

                {/* Photo */}
                <div className="absolute left-[18px] top-[22px] w-[100px] h-[130px] rounded-lg overflow-hidden bg-slate-700">
                  {client.photo ? (
                    <img src={client.photo} alt={client.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🐕</div>
                  )}
                </div>

                {/* Info */}
                <div className="absolute left-[138px] top-[30px] right-[16px]">
                  <h3 className="text-[20px] font-bold text-white tracking-wide">{client.name.toUpperCase()}</h3>
                  <div className="h-[2px] w-20 bg-[#4cc9f0] mt-2 mb-3" />
                  <div className="text-[8.5px] leading-[16px] space-y-1">
                    {client.breed && (
                      <div><span className="text-slate-400">Raça</span> <span className="text-slate-200 font-semibold ml-5">{client.breed}</span></div>
                    )}
                    {client.birthDate && (
                      <div><span className="text-slate-400">Nasc.</span> <span className="text-slate-200 font-semibold ml-5">{format(new Date(client.birthDate), 'dd/MM/yyyy')}</span></div>
                    )}
                    <div><span className="text-slate-400">Tutor</span> <span className="text-slate-200 font-semibold ml-5">{client.tutorName}</span></div>
                  </div>
                </div>

                {/* QR */}
                <div className="absolute right-4 bottom-[30px] bg-white rounded-md p-1">
                  <QRCodeSVG
                    value={qrValue(client)}
                    size={65}
                    level="H"
                    imageSettings={{
                      src: logoSrc,
                      x: undefined,
                      y: undefined,
                      height: 16,
                      width: 16,
                      excavate: true,
                    }}
                  />
                </div>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 h-[22px] bg-[#4cc9f0] flex items-center justify-center">
                  <span className="text-[#1a1a2e] text-[8px] font-bold tracking-widest">
                    CANTINHO DO AUAU
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => handleDownload(client)} className="gap-1 text-xs">
                <Download size={14} /> PNG
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDownloadSinglePdf(client)} className="gap-1 text-xs">
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
