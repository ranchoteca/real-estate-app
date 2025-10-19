import jsPDF from 'jspdf';

export async function exportPropertyToPDF(property: any) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  let yPos = 20;

  // Fotos primero (3-7 primeras)
  const photosToShow = property.photos?.slice(0, 7) || [];
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

  // Título en MAYÚSCULAS
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  const title = property.title.toUpperCase();
  const splitTitle = pdf.splitTextToSize(title, pageWidth - 40);
  splitTitle.forEach((line: string) => {
    if (yPos > 270) {
      pdf.addPage();
      yPos = 20;
    }
    pdf.text(line, 20, yPos);
    yPos += 10;
  });
  yPos += 5;

  // Precio en azul
  pdf.setFontSize(20);
  pdf.setTextColor(37, 99, 235);
  const price = property.price 
    ? `$${property.price.toLocaleString()}`
    : 'Precio a consultar';
  pdf.text(price, 20, yPos);
  yPos += 15;

  // Estado de la propiedad (Venta/Alquiler)
  if (property.listing_type) {
    if (yPos > 250) {
      pdf.addPage();
      yPos = 20;
    }

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    
    // Color y texto según el tipo
    if (property.listing_type === 'sale') {
      pdf.setTextColor(34, 197, 94);
      pdf.text('EN VENTA', 20, yPos);
    } else if (property.listing_type === 'rent') {
      pdf.setTextColor(59, 130, 246);
      pdf.text('EN ALQUILER', 20, yPos);
    }
    
    pdf.setTextColor(0, 0, 0); // Resetear a negro
    yPos += 15;
  }

  // NUEVO: Tipo de Propiedad
  if (property.property_type) {
    if (yPos > 250) {
      pdf.addPage();
      yPos = 20;
    }
    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Tipo de Propiedad', 20, yPos);
    yPos += 10;

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    
    // Traducir tipo de propiedad
    const propertyTypes: { [key: string]: string } = {
      'house': 'Casa',
      'condo': 'Condominio',
      'apartment': 'Apartamento',
      'land': 'Terreno',
      'commercial': 'Comercial'
    };

    const propertyTypeText = propertyTypes[property.property_type] || property.property_type;
    pdf.text(propertyTypeText, 20, yPos);
    yPos += 15;
  }

  // Detalles (ahora solo características)
  if (yPos > 250) {
    pdf.addPage();
    yPos = 20;
  }
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Características', 20, yPos);
  yPos += 10;

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  
  const details = [
    property.bedrooms > 0 && `${property.bedrooms} habitación${property.bedrooms > 1 ? 'es' : ''}`,
    property.bathrooms > 0 && `${property.bathrooms} baño${property.bathrooms > 1 ? 's' : ''}`,
    property.sqft > 0 && `${property.sqft.toLocaleString()} ft²`,
  ].filter(Boolean);

  if (details.length === 0) {
    pdf.text('No se especificaron características', 20, yPos);
    yPos += 8;
  } else {
    details.forEach(detail => {
      // Checkmark verde
      pdf.setTextColor(34, 197, 94); // green-500
      pdf.text('✓', 20, yPos);
      pdf.setTextColor(0, 0, 0);
      pdf.text(detail as string, 28, yPos);
      yPos += 8;
    });
  }

  yPos += 10;

  // Ubicación (MEJORADO con subtítulo)
  const locationParts = [
    property.address,
    property.city,
    property.state,
    property.zip_code
  ].filter(Boolean);

  if (locationParts.length > 0) {
    if (yPos > 250) {
      pdf.addPage();
      yPos = 20;
    }
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Ubicación', 20, yPos);
    yPos += 10;

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    const location = locationParts.join(', ');
    const splitLocation = pdf.splitTextToSize(location, pageWidth - 40);
    splitLocation.forEach((line: string) => {
      if (yPos > 270) {
        pdf.addPage();
        yPos = 20;
      }
      pdf.text(line, 20, yPos);
      yPos += 8;
    });
    yPos += 10;
  }

  // Descripción (MEJORADO con alineación justificada)
  if (yPos > 240) {
    pdf.addPage();
    yPos = 20;
  }

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Descripción de la Propiedad', 20, yPos);
  yPos += 10;

  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'normal');
  
  const splitDescription = pdf.splitTextToSize(property.description, pageWidth - 40);
  splitDescription.forEach((line: string, index: number) => {
    if (yPos > 270) {
      pdf.addPage();
      yPos = 20;
    }
    
    // Simular justificación: todas las líneas alineadas a la izquierda
    // excepto la última que queda sin justificar
    const isLastLine = index === splitDescription.length - 1;
    
    if (!isLastLine && line.length > 20) {
      // Para líneas intermedias, agregar espacios entre palabras
      const words = line.trim().split(' ');
      if (words.length > 1) {
        const textWidth = pdf.getTextWidth(line);
        const maxWidth = pageWidth - 40;
        const gap = (maxWidth - textWidth) / (words.length - 1);
        
        let xPos = 20;
        words.forEach((word, i) => {
          pdf.text(word, xPos, yPos);
          xPos += pdf.getTextWidth(word) + pdf.getTextWidth(' ') + gap;
        });
      } else {
        pdf.text(line, 20, yPos);
      }
    } else {
      pdf.text(line, 20, yPos);
    }
    
    yPos += 7;
  });

  // QR Code al final
  yPos += 15;
  if (yPos > 230) {
    pdf.addPage();
    yPos = 20;
  }

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Escanea para ver más:', 20, yPos);
  yPos += 10;

  // Generar QR con URL de la propiedad
  const propertyUrl = `${window.location.origin}/p/${property.slug}`;
  const qrSize = 50;
  
  try {
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(propertyUrl)}`;
    const qrImg = await loadImage(qrCodeUrl);
    pdf.addImage(qrImg, 'PNG', 20, yPos, qrSize, qrSize);
  } catch (err) {
    console.error('Error generando QR:', err);
    pdf.setFontSize(10);
    pdf.text(propertyUrl, 20, yPos);
  }

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