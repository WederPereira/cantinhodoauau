import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Client } from '@/types/client';

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('img'));
    img.src = src;
  });

interface PresenceItem {
  dogName: string;
  tutorName: string;
  photoUrl: string | null;
}

const renderPage = async (pdf: jsPDF, title: string, items: PresenceItem[]) => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  
  pdf.setFontSize(18);
  pdf.setTextColor('#0f1830');
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, pageWidth / 2, margin + 10, { align: 'center' });
  
  const todayDisplay = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor('#64748b');
  pdf.text(todayDisplay, pageWidth / 2, margin + 18, { align: 'center' });
  
  const itemHeight = 22;
  
  let y = margin + 30;
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    // Move to next page if out of space
    if (y + itemHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin + 10;
    }
    
    const boxSize = 18;
    const x = margin;
    
    // Draw Photo
    if (item.photoUrl) {
      try {
        const img = await loadImage(item.photoUrl);
        const ratio = img.width / img.height;
        let w = boxSize;
        let h = boxSize;
        
        // contain logic
        if (ratio > 1) {
          h = boxSize / ratio;
        } else {
          w = boxSize * ratio;
        }
        
        const imgX = x + (boxSize - w) / 2;
        const imgY = y + (boxSize - h) / 2;
        
        pdf.addImage(img, 'JPEG', imgX, imgY, w, h);
        
        // Border around the photo slot
        pdf.setDrawColor('#e2e8f0');
        pdf.setLineWidth(0.5);
        pdf.roundedRect(x, y, boxSize, boxSize, 1, 1);
      } catch (e) {
        console.error('Error loading image for', item.dogName, e);
        pdf.setFillColor('#f1f5f9');
        pdf.roundedRect(x, y, boxSize, boxSize, 1, 1, 'F');
      }
    } else {
      pdf.setFillColor('#f1f5f9');
      pdf.roundedRect(x, y, boxSize, boxSize, 1, 1, 'F');
    }
    
    // Draw Number
    pdf.setFontSize(9);
    pdf.setTextColor('#94a3b8');
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${i + 1}.`, x + boxSize + 4, y + 6);
    
    // Draw Name
    pdf.setFontSize(12);
    pdf.setTextColor('#0f1830');
    pdf.setFont('helvetica', 'bold');
    const shortName = pdf.splitTextToSize(item.dogName, pageWidth - margin - (x + boxSize + 12))[0];
    pdf.text(shortName, x + boxSize + 12, y + 8);
    
    // Draw Tutor
    pdf.setFontSize(9);
    pdf.setTextColor('#64748b');
    pdf.setFont('helvetica', 'normal');
    const shortTutor = pdf.splitTextToSize(`Tutor: ${item.tutorName}`, pageWidth - margin - (x + boxSize + 12))[0];
    pdf.text(shortTutor, x + boxSize + 12, y + 14);
    
    // Divider line
    pdf.setDrawColor('#f1f5f9');
    pdf.setLineWidth(0.5);
    pdf.line(margin, y + itemHeight - 2, pageWidth - margin, y + itemHeight - 2);
    
    // Move to next line
    y += itemHeight;
  }
};

export const generatePresencePDF = async (daycareItems: PresenceItem[], hotelItems: PresenceItem[]) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  if (daycareItems.length > 0) {
    await renderPage(pdf, 'Creche - Presentes do Dia', daycareItems);
  } else {
    pdf.setFontSize(16);
    pdf.text('Creche - Nenhum cão presente hoje', pdf.internal.pageSize.getWidth() / 2, 50, { align: 'center' });
  }
  
  if (hotelItems.length > 0) {
    if (daycareItems.length > 0) {
      pdf.addPage();
    }
    await renderPage(pdf, 'Hotel - Presentes do Dia', hotelItems);
  } else {
    if (daycareItems.length > 0) {
      pdf.addPage();
    }
    pdf.setFontSize(16);
    pdf.text('Hotel - Nenhum cão presente hoje', pdf.internal.pageSize.getWidth() / 2, 50, { align: 'center' });
  }
  
  pdf.save(`presentes-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};
