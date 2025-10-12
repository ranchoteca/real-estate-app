import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function exportPropertyToPDF(property: any) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  let yPos = 20;

  // Título
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(property.title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Precio
  pdf.setFontSize(16);
  pdf.setTextColor(37, 99, 235);
  const price = property.price 
    ? `$${property.price.toLocaleString()}`
    : 'Precio a consultar';
  pdf.text(price, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Fotos (2-3 primeras)
  const photosToShow = property.photos?.slice(0, 3) || [];
  for (const photoUrl of photosToShow) {
    try {
      const img = await loadImage(photoUrl);
      const imgWidth = pageWidth - 40;
      const imgHeight = (img.height / img.width) * imgWidth;
      
      if (yPos + imgHeight > 270) {
        pdf.addPage();
        yPos = 20;
      }
      
      pdf.addImage(img, 'JPEG', 20, yPos, imgWidth, imgHeight);
      yPos += imgHeight + 10;
    } catch (err) {
      console.error('Error loading image:', err);
    }
  }

  // Detalles
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Detalles:', 20, yPos);
  yPos += 7;

  pdf.setFont('helvetica', 'normal');
  const details = [
    property.bedrooms && `🛏️ ${property.bedrooms} habitaciones`,
    property.bathrooms && `🚿 ${property.bathrooms} baños`,
    property.sqft && `📏 ${property.sqft.toLocaleString()} ft²`,
    property.property_type && `🏡 ${property.property_type}`,
  ].filter(Boolean);

  details.forEach(detail => {
    pdf.text(detail as string, 20, yPos);
    yPos += 7;
  });

  yPos += 5;

  // Ubicación
  if (property.address) {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Ubicación:', 20, yPos);
    yPos += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${property.address}`, 20, yPos);
    yPos += 7;
    pdf.text(`${property.city}, ${property.state} ${property.zip_code}`, 20, yPos);
    yPos += 10;
  }

  // Descripción
  pdf.setFont('helvetica', 'bold');
  pdf.text('Descripción:', 20, yPos);
  yPos += 7;
  pdf.setFont('helvetica', 'normal');
  
  const splitDescription = pdf.splitTextToSize(property.description, pageWidth - 40);
  splitDescription.forEach((line: string) => {
    if (yPos > 270) {
      pdf.addPage();
      yPos = 20;
    }
    pdf.text(line, 20, yPos);
    yPos += 7;
  });

  // Guardar
  pdf.save(`${property.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}