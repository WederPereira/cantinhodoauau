import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { useClients } from '@/context/ClientContext';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { Client } from '@/types/client';
import { format } from 'date-fns';

// Credit card: 85.6mm × 53.98mm → ratio ~1.586
const CARD_WIDTH = 430;
const CARD_HEIGHT = 271;

const generateCardCanvas = (client: Client): Promise<HTMLCanvasElement> => {
  return new Promise((resolve) => {
    const scale = 4; // 4x for high-quality print
    const w = CARD_WIDTH * scale;
    const h = CARD_HEIGHT * scale;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    // Rounded rect helper
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

    // Background with gradient
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#f0fdf4');
    bgGrad.addColorStop(1, '#dcfce7');
    roundRect(0, 0, w, h, 16 * scale);
    ctx.fillStyle = bgGrad;
    ctx.fill();

    // Top green header bar
    const headerH = 38 * scale;
    ctx.fillStyle = '#166534';
    ctx.fillRect(0, 0, w, headerH);

    // Header text
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${10 * scale}px 'Segoe UI', Arial, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('CARTEIRINHA PET', 16 * scale, 24 * scale);

    ctx.textAlign = 'right';
    ctx.font = `${8 * scale}px 'Segoe UI', Arial, sans-serif`;
    ctx.fillStyle = '#bbf7d0';
    ctx.fillText('REGISTRO ANIMAL', w - 16 * scale, 24 * scale);

    // Photo area (RG proportion ~3:4)
    const photoX = 16 * scale;
    const photoY = headerH + 14 * scale;
    const photoW = 90 * scale;
    const photoH = 120 * scale;

    // Photo border with shadow effect
    ctx.fillStyle = '#e2e8f0';
    roundRect(photoX - 2 * scale, photoY - 2 * scale, photoW + 4 * scale, photoH + 4 * scale, 6 * scale);
    ctx.fill();

    const drawContent = () => {
      // Right side content
      const rightX = photoX + photoW + 18 * scale;
      let curY = headerH + 18 * scale;

      // Pet name
      ctx.fillStyle = '#166534';
      ctx.font = `bold ${18 * scale}px 'Georgia', 'Times New Roman', serif`;
      ctx.textAlign = 'left';
      ctx.fillText(client.name.toUpperCase(), rightX, curY + 16 * scale);
      curY += 28 * scale;

      // Divider line
      ctx.strokeStyle = '#86efac';
      ctx.lineWidth = 1.5 * scale;
      ctx.beginPath();
      ctx.moveTo(rightX, curY);
      ctx.lineTo(w - 16 * scale, curY);
      ctx.stroke();
      curY += 10 * scale;

      // Info fields
      ctx.font = `${8 * scale}px 'Segoe UI', Arial, sans-serif`;
      const drawField = (label: string, value: string) => {
        ctx.fillStyle = '#6b7280';
        ctx.fillText(label, rightX, curY);
        ctx.fillStyle = '#1f2937';
        ctx.font = `bold ${8 * scale}px 'Segoe UI', Arial, sans-serif`;
        ctx.fillText(value, rightX + 50 * scale, curY);
        ctx.font = `${8 * scale}px 'Segoe UI', Arial, sans-serif`;
        curY += 13 * scale;
      };

      if (client.breed) drawField('Raça:', client.breed);
      if (client.weight) drawField('Peso:', `${client.weight} kg`);
      if (client.petSize) drawField('Porte:', client.petSize);
      if (client.birthDate) drawField('Nasc:', format(new Date(client.birthDate), 'dd/MM/yyyy'));
      drawField('Tutor:', client.tutorName);
      if (client.tutorPhone) drawField('Tel:', client.tutorPhone);

      // QR Code area - bottom right
      const qrSize = 80 * scale;
      const qrX = w - qrSize - 16 * scale;
      const qrY = h - qrSize - 42 * scale;

      ctx.fillStyle = '#ffffff';
      roundRect(qrX - 4 * scale, qrY - 4 * scale, qrSize + 8 * scale, qrSize + 8 * scale, 4 * scale);
      ctx.fill();

      // Render QR from hidden SVG
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
        // Bottom bar
        const footerH = 26 * scale;
        ctx.fillStyle = '#166534';
        ctx.fillRect(0, h - footerH, w, footerH);
        ctx.fillStyle = '#ffffff';
        ctx.font = `italic bold ${9 * scale}px 'Georgia', 'Times New Roman', serif`;
        ctx.textAlign = 'center';
        ctx.fillText('🐾 AQUI SEU DOGUINHO É MAIS FELIZ 🐾', w / 2, h - 9 * scale);

        resolve(canvas);
      }
    };

    // Load photo
    if (client.photo) {
      const photoImg = new Image();
      photoImg.crossOrigin = 'anonymous';
      photoImg.onload = () => {
        // Cover fit for 3:4 ratio
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
        // Clip rounded corners
        ctx.save();
        roundRect(photoX, photoY, photoW, photoH, 4 * scale);
        ctx.clip();
        ctx.drawImage(photoImg, sx, sy, sw, sh, photoX, photoY, photoW, photoH);
        ctx.restore();
        drawContent();
      };
      photoImg.onerror = () => {
        drawPlaceholder();
        drawContent();
      };
      photoImg.src = client.photo;
    } else {
      drawPlaceholder();
      drawContent();
    }

    function drawPlaceholder() {
      ctx.fillStyle = '#d1fae5';
      roundRect(photoX, photoY, photoW, photoH, 4 * scale);
      ctx.fill();
      ctx.fillStyle = '#86efac';
      ctx.font = `${40 * scale}px sans-serif`;
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {clients.length} carteirinha(s) — geradas automaticamente
        </p>
        <Button onClick={handleDownloadAll} variant="outline" size="sm" className="gap-2">
          <Download size={14} /> Baixar Todas
        </Button>
      </div>

      <div className="grid gap-6">
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

            {/* Visual preview */}
            <div className="mx-auto rounded-xl overflow-hidden shadow-lg" style={{ width: `${CARD_WIDTH}px`, height: `${CARD_HEIGHT}px` }}>
              <div className="relative w-full h-full" style={{ fontFamily: "'Segoe UI', Arial, sans-serif" }}>
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-green-100" />

                {/* Header */}
                <div className="absolute top-0 left-0 right-0 h-[38px] bg-green-800 flex items-center justify-between px-4">
                  <span className="text-white text-[10px] font-bold tracking-wide">CARTEIRINHA PET</span>
                  <span className="text-green-300 text-[8px]">REGISTRO ANIMAL</span>
                </div>

                {/* Photo */}
                <div className="absolute left-4 top-[52px] w-[90px] h-[120px] rounded border-2 border-gray-200 overflow-hidden bg-green-100 flex items-center justify-center">
                  {client.photo ? (
                    <img src={client.photo} alt={client.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">🐕</span>
                  )}
                </div>

                {/* Info */}
                <div className="absolute left-[120px] top-[52px] right-4">
                  <h3 className="text-[18px] font-bold text-green-800 font-serif">{client.name.toUpperCase()}</h3>
                  <div className="h-[1px] bg-green-300 my-1.5" />
                  <div className="text-[8px] leading-[14px] text-gray-600 space-y-0.5">
                    {client.breed && <div><span className="text-gray-400">Raça:</span> <span className="font-semibold text-gray-800">{client.breed}</span></div>}
                    {client.weight && <div><span className="text-gray-400">Peso:</span> <span className="font-semibold text-gray-800">{client.weight} kg</span></div>}
                    {client.petSize && <div><span className="text-gray-400">Porte:</span> <span className="font-semibold text-gray-800">{client.petSize}</span></div>}
                    {client.birthDate && <div><span className="text-gray-400">Nasc:</span> <span className="font-semibold text-gray-800">{format(new Date(client.birthDate), 'dd/MM/yyyy')}</span></div>}
                    <div><span className="text-gray-400">Tutor:</span> <span className="font-bold text-gray-900">{client.tutorName}</span></div>
                    {client.tutorPhone && <div><span className="text-gray-400">Tel:</span> <span className="text-gray-700">{client.tutorPhone}</span></div>}
                  </div>
                </div>

                {/* QR */}
                <div className="absolute right-4 bottom-[40px] bg-white rounded p-1">
                  <QRCodeSVG
                    value={`Tutor: ${client.tutorName}\nDog: ${client.name}\nRaça: ${client.breed || 'N/A'}`}
                    size={65}
                    level="M"
                  />
                </div>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 h-[26px] bg-green-800 flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold italic font-serif">
                    🐾 AQUI SEU DOGUINHO É MAIS FELIZ 🐾
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={() => handleDownload(client)} className="gap-1">
                <Download size={14} /> Baixar
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DogIdCard;
