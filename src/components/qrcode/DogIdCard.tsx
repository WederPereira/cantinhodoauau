import React, { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useClients } from '@/context/ClientContext';
import { toast } from 'sonner';
import { CreditCard, Download, Printer } from 'lucide-react';
import { Client } from '@/types/client';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DogIdCard: React.FC = () => {
  const { clients } = useClients();
  const [selectedClientId, setSelectedClientId] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  const client = clients.find(c => c.id === selectedClientId);

  const handlePrint = () => {
    if (!cardRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('Não foi possível abrir a janela de impressão'); return; }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Carteirinha - ${client?.name || 'Dog'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f5f5f5; font-family: 'Segoe UI', Arial, sans-serif; }
          @media print { body { background: white; } }
        </style>
      </head>
      <body>
        ${cardRef.current.innerHTML}
        <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger><SelectValue placeholder="Selecione um pet para gerar a carteirinha..." /></SelectTrigger>
          <SelectContent>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} — {c.tutorName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {client && (
        <>
          <div ref={cardRef}>
            <div style={{
              width: '400px',
              height: '250px',
              borderRadius: '12px',
              border: '2px solid #1a365d',
              background: 'linear-gradient(135deg, #ebf4ff 0%, #dbeafe 50%, #bfdbfe 100%)',
              fontFamily: "'Segoe UI', Arial, sans-serif",
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>
              {/* Header bar */}
              <div style={{
                background: 'linear-gradient(90deg, #1e3a5f, #2563eb)',
                color: 'white',
                padding: '6px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                fontWeight: 'bold',
                letterSpacing: '1px',
              }}>
                <span>🐾 CARTEIRINHA DE IDENTIFICAÇÃO</span>
                <span>PET ID</span>
              </div>

              <div style={{ display: 'flex', padding: '12px 16px', gap: '14px', height: 'calc(100% - 32px)' }}>
                {/* Photo area */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <div style={{
                    width: '80px',
                    height: '90px',
                    borderRadius: '6px',
                    border: '2px solid #1e3a5f',
                    background: client.photo ? `url(${client.photo}) center/cover` : '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    color: '#94a3b8',
                  }}>
                    {!client.photo && '🐕'}
                  </div>
                  <QRCodeSVG
                    value={`Tutor: ${client.tutorName}\nDog: ${client.name}\nRaça: ${client.breed || 'N/A'}`}
                    size={78}
                    level="M"
                  />
                </div>

                {/* Info area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ marginBottom: '6px' }}>
                      <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nome</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>{client.name}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                      <div>
                        <div style={{ fontSize: '8px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Raça</div>
                        <div style={{ fontSize: '11px', color: '#334155', fontWeight: '500' }}>{client.breed || 'SRD'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '8px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Porte</div>
                        <div style={{ fontSize: '11px', color: '#334155', fontWeight: '500' }}>{client.petSize || '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '8px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Peso</div>
                        <div style={{ fontSize: '11px', color: '#334155', fontWeight: '500' }}>{client.weight ? `${client.weight} kg` : '—'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '8px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Nascimento</div>
                        <div style={{ fontSize: '11px', color: '#334155', fontWeight: '500' }}>
                          {client.birthDate ? format(new Date(client.birthDate), 'dd/MM/yyyy') : '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tutor info */}
                  <div style={{
                    borderTop: '1px solid #cbd5e1',
                    paddingTop: '4px',
                    marginTop: '4px',
                  }}>
                    <div style={{ fontSize: '8px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Tutor(a)</div>
                    <div style={{ fontSize: '11px', color: '#334155', fontWeight: '500' }}>{client.tutorName}</div>
                    {client.tutorPhone && (
                      <div style={{ fontSize: '10px', color: '#64748b' }}>Tel: {client.tutorPhone}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom stripe */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #1e3a5f, #2563eb, #3b82f6)',
              }} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handlePrint} className="flex-1">
              <Printer size={16} className="mr-2" /> Imprimir Carteirinha
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default DogIdCard;
