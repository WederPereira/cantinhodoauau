import React, { useRef, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { useClients } from '@/context/ClientContext';
import { toast } from 'sonner';
import { Download, Printer, CreditCard } from 'lucide-react';
import { Client } from '@/types/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Credit card dimensions: 85.6mm × 53.98mm → ratio ~1.586
// At 300 DPI: 1011px × 638px. We'll use scaled-down for screen, full for print.
const CARD_WIDTH = 404;
const CARD_HEIGHT = 255;

const generateCardCanvas = (client: Client): Promise<HTMLCanvasElement> => {
  return new Promise((resolve) => {
    const scale = 3; // 3x for print quality
    const w = CARD_WIDTH * scale;
    const h = CARD_HEIGHT * scale;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#e8f5e9';
    ctx.fillRect(0, 0, w, h);

    // Decorative squiggles (subtle pattern)
    ctx.strokeStyle = '#c8e6c9';
    ctx.lineWidth = 2 * scale;
    ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 15 * scale, y - 10 * scale, x + 30 * scale, y + 5 * scale);
      ctx.stroke();
    }

    // Left green bar
    const barWidth = 36 * scale;
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(0, 0, barWidth, h);

    // Vertical text on green bar
    ctx.save();
    ctx.translate(barWidth / 2, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${9 * scale}px 'Segoe UI', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('REGISTRO DOS BICHINHOS FOFOS DA INTERNET', 0, 0);
    ctx.restore();

    // Photo area
    const photoX = barWidth + 20 * scale;
    const photoY = 16 * scale;
    const photoW = 130 * scale;
    const photoH = 120 * scale;

    // Photo border
    ctx.fillStyle = '#1565c0';
    ctx.fillRect(photoX - 3 * scale, photoY - 3 * scale, photoW + 6 * scale, photoH + 6 * scale);

    const drawRest = () => {
      // Dots row under photo
      const dotsY = photoY + photoH + 8 * scale;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(photoX + 15 * scale + i * 22 * scale, dotsY, 4 * scale, 0, Math.PI * 2);
        ctx.fill();
      }

      // QR Code area
      const qrX = photoX + 10 * scale;
      const qrY = dotsY + 14 * scale;
      const qrBoxW = photoW - 20 * scale;
      const qrBoxH = 80 * scale;

      // White QR background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrX, qrY, qrBoxW, qrBoxH);

      // QR Code label
      ctx.fillStyle = '#9e9e9e';
      ctx.font = `${7 * scale}px 'Segoe UI', Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('QR CODE', qrX + qrBoxW / 2, qrY + 12 * scale);

      // Draw QR code using a temporary SVG
      const qrSize = 55 * scale;
      const tempDiv = document.createElement('div');
      document.body.appendChild(tempDiv);
      const svgNS = 'http://www.w3.org/2000/svg';
      
      // We'll draw a placeholder QR pattern - actual QR will be rendered by component
      const qrValue = `Tutor: ${client.tutorName}\nDog: ${client.name}\nRaça: ${client.breed || 'N/A'}`;
      // Use canvas-based QR rendering
      const qrCanvas = document.createElement('canvas');
      qrCanvas.width = qrSize;
      qrCanvas.height = qrSize;
      
      // Import QR code rendering
      const tempSvg = document.querySelector(`[data-card-qr="${client.id}"] svg`);
      if (tempSvg) {
        const svgData = new XMLSerializer().serializeToString(tempSvg);
        const qrImg = new Image();
        qrImg.onload = () => {
          ctx.drawImage(qrImg, qrX + (qrBoxW - qrSize) / 2, qrY + 16 * scale, qrSize, qrSize);
          finishCard();
        };
        qrImg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      } else {
        finishCard();
      }
      tempDiv.remove();

      function finishCard() {
        // Right side - Name in cursive style
        const rightX = photoX + photoW + 20 * scale;
        ctx.save();
        ctx.translate(rightX + 10 * scale, h * 0.45);
        ctx.rotate(-0.15);
        ctx.fillStyle = '#2e7d32';
        ctx.font = `italic bold ${22 * scale}px 'Georgia', 'Times New Roman', serif`;
        ctx.textAlign = 'left';
        ctx.fillText(client.name, 0, 0);
        ctx.restore();

        // Right side - Info below name
        const infoX = rightX;
        let infoY = h * 0.55;
        ctx.fillStyle = '#558b2f';
        ctx.font = `${7 * scale}px 'Segoe UI', Arial, sans-serif`;
        ctx.textAlign = 'left';

        // Vertical green line
        ctx.strokeStyle = '#2e7d32';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(infoX - 5 * scale, h * 0.35);
        ctx.lineTo(infoX - 5 * scale, h * 0.75);
        ctx.stroke();

        // Breed
        if (client.breed) {
          ctx.fillStyle = '#616161';
          ctx.font = `${7 * scale}px 'Segoe UI', Arial, sans-serif`;
          ctx.fillText(`Raça: ${client.breed}`, infoX, infoY);
          infoY += 14 * scale;
        }

        // Weight
        if (client.weight) {
          ctx.fillText(`Peso: ${client.weight} kg`, infoX, infoY);
          infoY += 14 * scale;
        }

        // Size
        if (client.petSize) {
          ctx.fillText(`Porte: ${client.petSize}`, infoX, infoY);
          infoY += 14 * scale;
        }

        // Birth date
        if (client.birthDate) {
          ctx.fillText(`Nasc: ${format(new Date(client.birthDate), 'dd/MM/yyyy')}`, infoX, infoY);
          infoY += 14 * scale;
        }

        // Tutor
        ctx.fillStyle = '#424242';
        ctx.font = `bold ${7 * scale}px 'Segoe UI', Arial, sans-serif`;
        ctx.fillText(`Tutor: ${client.tutorName}`, infoX, infoY);
        infoY += 12 * scale;
        if (client.tutorPhone) {
          ctx.font = `${6 * scale}px 'Segoe UI', Arial, sans-serif`;
          ctx.fillStyle = '#757575';
          ctx.fillText(`Tel: ${client.tutorPhone}`, infoX, infoY);
        }

        // Bottom bar
        ctx.fillStyle = '#2e7d32';
        ctx.fillRect(0, h - 28 * scale, w, 28 * scale);
        ctx.fillStyle = '#ffffff';
        ctx.font = `italic bold ${9 * scale}px 'Georgia', 'Times New Roman', serif`;
        ctx.textAlign = 'center';
        ctx.fillText('AQUI SEU DOGUINHO É MAIS FELIZ', w / 2, h - 10 * scale);

        resolve(canvas);
      }
    };

    // Load photo
    if (client.photo) {
      const photoImg = new Image();
      photoImg.crossOrigin = 'anonymous';
      photoImg.onload = () => {
        // Cover fit
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
        ctx.drawImage(photoImg, sx, sy, sw, sh, photoX, photoY, photoW, photoH);
        drawRest();
      };
      photoImg.onerror = () => {
        ctx.fillStyle = '#bbdefb';
        ctx.fillRect(photoX, photoY, photoW, photoH);
        ctx.fillStyle = '#90caf9';
        ctx.font = `${40 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐕', photoX + photoW / 2, photoY + photoH / 2);
        drawRest();
      };
      photoImg.src = client.photo;
    } else {
      ctx.fillStyle = '#bbdefb';
      ctx.fillRect(photoX, photoY, photoW, photoH);
      ctx.fillStyle = '#90caf9';
      ctx.font = `${40 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🐕', photoX + photoW / 2, photoY + photoH / 2);
      drawRest();
    }
  });
};

export const downloadCardForClient = async (client: Client): Promise<void> => {
  const canvas = await generateCardCanvas(client);
  const link = document.createElement('a');
  link.download = `carteirinha_${client.name}_${client.tutorName}.png`.replace(/\s+/g, '_');
  link.href = canvas.toDataURL('image/png');
  link.click();
};

const DogIdCard: React.FC = () => {
  const { clients } = useClients();

  const handleDownload = async (client: Client) => {
    await downloadCardForClient(client);
    toast.success(`Carteirinha de ${client.name} baixada!`);
  };

  const handleDownloadAll = async () => {
    for (const client of clients) {
      await handleDownload(client);
      await new Promise(r => setTimeout(r, 400));
    }
    toast.success(`${clients.length} carteirinha(s) gerada(s)!`);
  };

  const handlePrint = (client: Client) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('Não foi possível abrir a janela de impressão'); return; }

    const cardEl = document.querySelector(`[data-card-preview="${client.id}"]`);
    if (!cardEl) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Carteirinha - ${client.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; }
          @media print { body { background: white; } }
          .card { width: 85.6mm; height: 53.98mm; }
        </style>
      </head>
      <body>
        ${cardEl.innerHTML}
        <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {clients.length} carteirinha(s) disponíveis — geradas automaticamente
        </p>
        <Button onClick={handleDownloadAll} variant="outline" size="sm" className="gap-2">
          <Download size={14} /> Baixar Todas
        </Button>
      </div>

      <div className="grid gap-4">
        {clients.map(client => (
          <div key={client.id} className="space-y-2">
            {/* Hidden QR for canvas rendering */}
            <div data-card-qr={client.id} className="hidden">
              <QRCodeSVG
                value={`Tutor: ${client.tutorName}\nDog: ${client.name}\nRaça: ${client.breed || 'N/A'}`}
                size={200}
                level="M"
              />
            </div>

            {/* Visual preview card */}
            <div data-card-preview={client.id} className="mx-auto" style={{ width: `${CARD_WIDTH}px` }}>
              <div style={{
                width: `${CARD_WIDTH}px`,
                height: `${CARD_HEIGHT}px`,
                borderRadius: '12px',
                overflow: 'hidden',
                position: 'relative',
                fontFamily: "'Segoe UI', Arial, sans-serif",
                background: '#e8f5e9',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              }}>
                {/* Left green bar */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0, width: '36px',
                  background: '#2e7d32',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{
                    writingMode: 'vertical-rl', transform: 'rotate(180deg)',
                    color: 'white', fontSize: '8px', fontWeight: 'bold',
                    letterSpacing: '0.5px', whiteSpace: 'nowrap',
                  }}>
                    REGISTRO DOS BICHINHOS FOFOS DA INTERNET
                  </span>
                </div>

                {/* Photo */}
                <div style={{
                  position: 'absolute', left: '48px', top: '12px',
                  width: '110px', height: '100px',
                  borderRadius: '4px', border: '3px solid #1565c0',
                  background: client.photo ? `url(${client.photo}) center/cover` : '#bbdefb',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '36px', color: '#90caf9',
                }}>
                  {!client.photo && '🐕'}
                </div>

                {/* Dots */}
                <div style={{
                  position: 'absolute', left: '52px', top: '118px',
                  display: 'flex', gap: '8px',
                }}>
                  {[...Array(5)].map((_, i) => (
                    <div key={i} style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: 'white',
                    }} />
                  ))}
                </div>

                {/* QR Code section */}
                <div style={{
                  position: 'absolute', left: '52px', top: '132px',
                  width: '102px', height: '110px',
                  background: 'white', borderRadius: '4px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '4px',
                }}>
                  <span style={{ fontSize: '7px', color: '#9e9e9e', marginBottom: '2px' }}>QR CODE</span>
                  <QRCodeSVG
                    value={`Tutor: ${client.tutorName}\nDog: ${client.name}\nRaça: ${client.breed || 'N/A'}`}
                    size={85}
                    level="M"
                  />
                </div>

                {/* Right side - Name */}
                <div style={{
                  position: 'absolute', right: '16px', top: '20px',
                  maxWidth: '180px',
                }}>
                  {/* Vertical line */}
                  <div style={{
                    position: 'absolute', left: '-12px', top: '0', bottom: '-60px',
                    width: '2px', background: '#2e7d32',
                  }} />

                  <div style={{
                    fontSize: '24px', fontWeight: 'bold', fontStyle: 'italic',
                    color: '#2e7d32', fontFamily: "'Georgia', 'Times New Roman', serif",
                    transform: 'rotate(-5deg)', marginBottom: '8px',
                  }}>
                    {client.name}
                  </div>

                  <div style={{ fontSize: '9px', color: '#616161', lineHeight: '1.6' }}>
                    {client.breed && <div>Raça: {client.breed}</div>}
                    {client.weight && <div>Peso: {client.weight} kg</div>}
                    {client.petSize && <div>Porte: {client.petSize}</div>}
                    {client.birthDate && <div>Nasc: {format(new Date(client.birthDate), 'dd/MM/yyyy')}</div>}
                  </div>

                  <div style={{ marginTop: '6px', fontSize: '9px' }}>
                    <div style={{ fontWeight: 'bold', color: '#424242' }}>Tutor: {client.tutorName}</div>
                    {client.tutorPhone && (
                      <div style={{ color: '#757575', fontSize: '8px' }}>Tel: {client.tutorPhone}</div>
                    )}
                  </div>
                </div>

                {/* Bottom bar */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: '24px', background: '#2e7d32',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{
                    color: 'white', fontSize: '9px', fontWeight: 'bold',
                    fontStyle: 'italic', fontFamily: "'Georgia', 'Times New Roman', serif",
                  }}>
                    AQUI SEU DOGUINHO É MAIS FELIZ
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={() => handleDownload(client)} className="gap-1">
                <Download size={14} /> Baixar
              </Button>
              <Button variant="outline" size="sm" onClick={() => handlePrint(client)} className="gap-1">
                <Printer size={14} /> Imprimir
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DogIdCard;
