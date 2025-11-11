import jsPDF from 'jspdf';

// Colores de Flow Estate AI
const COLORS = {
  primary: '#2563eb', // Azul principal
  secondary: '#1e40af', // Azul oscuro
  accent: '#3b82f6', // Azul claro
  success: '#22c55e', // Verde
  text: '#1f2937', // Gris oscuro
  textLight: '#6b7280', // Gris medio
  border: '#e5e7eb', // Gris claro
  background: '#f9fafb', // Fondo claro
};

interface AgentInfo {
  full_name?: string;
  name?: string;
  phone?: string;
  email?: string;
  brokerage?: string;
  watermark_logo?: string;
  watermark_position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  watermark_size?: 'small' | 'medium' | 'large';
}

export async function exportPropertyToPDF(property: any, agent?: AgentInfo) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // ============================================
  // PORTADA
  // ============================================
  await createCoverPage(pdf, property, agent, pageWidth, pageHeight, margin);

  // ============================================
  // PÁGINA DE IMÁGENES (Grid)
  // ============================================
  if (property.photos && property.photos.length > 1) {
    pdf.addPage();
    await createImageGridPage(pdf, property.photos.slice(1, 7), agent, pageWidth, pageHeight, margin);
  }

  // ============================================
  // PÁGINA DE DETALLES
  // ============================================
  pdf.addPage();
  await createDetailsPage(pdf, property, agent, pageWidth, pageHeight, margin, contentWidth);

  // ============================================
  // PÁGINA DE DESCRIPCIÓN
  // ============================================
  pdf.addPage();
  await createDescriptionPage(pdf, property, agent, pageWidth, pageHeight, margin, contentWidth);

  // Guardar PDF
  const fileName = `${property.title.replace(/[^a-z0-9]/gi, '_')}_FlowEstate.pdf`;
  pdf.save(fileName);
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

async function createCoverPage(
  pdf: jsPDF,
  property: any,
  agent: AgentInfo | undefined,
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  // Imagen principal (ocupa 60% de la página)
  if (property.photos && property.photos.length > 0) {
    try {
      const img = await loadImage(property.photos[0]);
      const imgHeight = pageHeight * 0.6;
      const imgWidth = pageWidth;
      pdf.addImage(img, 'JPEG', 0, 0, imgWidth, imgHeight);
      
      // Overlay oscuro para mejor legibilidad del texto
      pdf.setFillColor(0, 0, 0);
      pdf.setGState(new pdf.GState({ opacity: 0.4 }));
      pdf.rect(0, 0, imgWidth, imgHeight, 'F');
      pdf.setGState(new pdf.GState({ opacity: 1 }));
    } catch (err) {
      console.error('Error loading cover image:', err);
    }
  }

  // Logo y marca de agua
  await addHeaderLogo(pdf, agent, margin, 10);

  // Badge de estado (Venta/Alquiler)
  const badgeY = pageHeight * 0.5;
  if (property.listing_type) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    
    const badgeText = property.listing_type === 'sale' ? 'EN VENTA' : 'EN ALQUILER';
    const badgeColor = property.listing_type === 'sale' ? COLORS.success : COLORS.accent;
    
    // Fondo del badge
    pdf.setFillColor(hexToRgb(badgeColor).r, hexToRgb(badgeColor).g, hexToRgb(badgeColor).b);
    pdf.roundedRect(margin, badgeY - 7, 40, 10, 2, 2, 'F');
    
    // Texto del badge
    pdf.setTextColor(255, 255, 255);
    pdf.text(badgeText, margin + 3, badgeY);
  }

  // Título (en blanco sobre la imagen)
  const titleY = pageHeight * 0.55;
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  const title = property.title.toUpperCase();
  const splitTitle = pdf.splitTextToSize(title, pageWidth - (margin * 2));
  let currentY = titleY;
  splitTitle.forEach((line: string) => {
    pdf.text(line, margin, currentY);
    currentY += 10;
  });

  // Precio (grande y destacado)
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  const price = property.price 
    ? `$${property.price.toLocaleString()}`
    : 'Precio a consultar';
  pdf.text(price, margin, currentY + 15);

  // Información del agente (parte inferior)
  const footerY = pageHeight - 40;
  await addAgentInfo(pdf, agent, margin, footerY, pageWidth);

  // Marca de agua en la portada
  await addWatermark(pdf, agent, pageWidth, pageHeight);
}

async function createImageGridPage(
  pdf: jsPDF,
  photos: string[],
  agent: AgentInfo | undefined,
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  await addHeaderLogo(pdf, agent, margin, 10);

  // Título de la sección
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
  pdf.text('GALERÍA DE IMÁGENES', margin, 30);

  // Grid 2x3 de imágenes
  const imageSize = (pageWidth - (margin * 3)) / 2;
  const spacing = 5;
  let xPos = margin;
  let yPos = 40;
  let count = 0;

  for (const photoUrl of photos) {
    if (count >= 6) break;

    try {
      const img = await loadImage(photoUrl);
      
      // Calcular posición en el grid
      if (count > 0 && count % 2 === 0) {
        xPos = margin;
        yPos += imageSize + spacing;
      }

      // Verificar si cabe en la página
      if (yPos + imageSize > pageHeight - 30) break;

      // Dibujar imagen con borde
      pdf.setDrawColor(hexToRgb(COLORS.border).r, hexToRgb(COLORS.border).g, hexToRgb(COLORS.border).b);
      pdf.setLineWidth(0.5);
      pdf.addImage(img, 'JPEG', xPos, yPos, imageSize, imageSize);
      pdf.rect(xPos, yPos, imageSize, imageSize);

      xPos += imageSize + spacing;
      count++;
    } catch (err) {
      console.error('Error loading image:', err);
    }
  }

  await addFooter(pdf, agent, pageWidth, pageHeight);
  await addWatermark(pdf, agent, pageWidth, pageHeight);
}

async function createDetailsPage(
  pdf: jsPDF,
  property: any,
  agent: AgentInfo | undefined,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number
) {
  await addHeaderLogo(pdf, agent, margin, 10);

  let yPos = 35;

  // Tipo de Propiedad
  if (property.property_type) {
    yPos = addSection(pdf, 'TIPO DE PROPIEDAD', yPos, margin);
    
    const propertyTypes: { [key: string]: string } = {
      'house': 'Casa',
      'condo': 'Condominio',
      'apartment': 'Apartamento',
      'land': 'Terreno',
      'commercial': 'Comercial'
    };

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
    const propertyTypeText = propertyTypes[property.property_type] || property.property_type;
    pdf.text(propertyTypeText, margin, yPos);
    yPos += 15;
  }

  // Características principales
  yPos = addSection(pdf, 'CARACTERÍSTICAS', yPos, margin);
  
  const mainFeatures = [
    { value: property.bedrooms, label: 'Habitaciones', icon: '🛏️' },
    { value: property.bathrooms, label: 'Baños', icon: '🚿' },
    { value: property.sqft, label: 'ft²', icon: '📐' },
  ].filter(f => f.value > 0);

  if (mainFeatures.length > 0) {
    const boxWidth = (contentWidth - 10) / mainFeatures.length;
    let xPos = margin;

    mainFeatures.forEach(feature => {
      // Caja con borde
      pdf.setDrawColor(hexToRgb(COLORS.border).r, hexToRgb(COLORS.border).g, hexToRgb(COLORS.border).b);
      pdf.setFillColor(hexToRgb(COLORS.background).r, hexToRgb(COLORS.background).g, hexToRgb(COLORS.background).b);
      pdf.roundedRect(xPos, yPos, boxWidth - 5, 25, 3, 3, 'FD');

      // Valor
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
      const valueText = feature.value.toLocaleString();
      const valueWidth = pdf.getTextWidth(valueText);
      pdf.text(valueText, xPos + (boxWidth - 5) / 2 - valueWidth / 2, yPos + 12);

      // Label
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);
      const labelWidth = pdf.getTextWidth(feature.label);
      pdf.text(feature.label, xPos + (boxWidth - 5) / 2 - labelWidth / 2, yPos + 20);

      xPos += boxWidth;
    });

    yPos += 35;
  }

  // Campos personalizados
  if (property.custom_fields_data && Object.keys(property.custom_fields_data).length > 0) {
    yPos = addSection(pdf, 'DETALLES ADICIONALES', yPos, margin);
    
    Object.entries(property.custom_fields_data).forEach(([key, value]) => {
      if (value) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
        
        // Checkmark
        pdf.setTextColor(hexToRgb(COLORS.success).r, hexToRgb(COLORS.success).g, hexToRgb(COLORS.success).b);
        pdf.text('✓', margin, yPos);
        
        pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
        pdf.text(`${key}: ${value}`, margin + 8, yPos);
        yPos += 8;
      }
    });
    yPos += 10;
  }

  // Ubicación
  const locationParts = [
    property.address,
    property.city,
    property.state,
    property.zip_code
  ].filter(Boolean);

  if (locationParts.length > 0) {
    yPos = addSection(pdf, 'UBICACIÓN', yPos, margin);
    
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
    const location = locationParts.join(', ');
    const splitLocation = pdf.splitTextToSize(location, contentWidth);
    splitLocation.forEach((line: string) => {
      pdf.text(line, margin, yPos);
      yPos += 7;
    });
    yPos += 10;
  }

  // QR Code
  if (yPos < pageHeight - 80) {
    yPos = addSection(pdf, 'VER MÁS INFORMACIÓN', yPos, margin);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);
    pdf.text('Escanea este código para ver la propiedad en línea:', margin, yPos);
    yPos += 10;

    const propertyUrl = `${window.location.origin}/p/${property.slug}`;
    const qrSize = 45;
    
    try {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(propertyUrl)}`;
      const qrImg = await loadImage(qrCodeUrl);
      
      // Fondo blanco para el QR
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin - 2, yPos - 2, qrSize + 4, qrSize + 4, 2, 2, 'F');
      
      pdf.addImage(qrImg, 'PNG', margin, yPos, qrSize, qrSize);
    } catch (err) {
      console.error('Error generando QR:', err);
      pdf.setFontSize(9);
      pdf.text(propertyUrl, margin, yPos);
    }
  }

  await addFooter(pdf, agent, pageWidth, pageHeight);
  await addWatermark(pdf, agent, pageWidth, pageHeight);
}

async function createDescriptionPage(
  pdf: jsPDF,
  property: any,
  agent: AgentInfo | undefined,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number
) {
  await addHeaderLogo(pdf, agent, margin, 10);

  let yPos = 35;

  // Título de sección
  yPos = addSection(pdf, 'DESCRIPCIÓN DE LA PROPIEDAD', yPos, margin);

  // Descripción con formato mejorado
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
  
  const splitDescription = pdf.splitTextToSize(property.description, contentWidth);
  splitDescription.forEach((line: string) => {
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      addHeaderLogo(pdf, agent, margin, 10);
      yPos = 35;
    }
    pdf.text(line, margin, yPos);
    yPos += 7;
  });

  await addFooter(pdf, agent, pageWidth, pageHeight);
  await addWatermark(pdf, agent, pageWidth, pageHeight);
}

// ============================================
// COMPONENTES REUTILIZABLES
// ============================================

function addSection(pdf: jsPDF, title: string, yPos: number, margin: number): number {
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
  pdf.text(title, margin, yPos);
  
  // Línea decorativa
  pdf.setDrawColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
  pdf.setLineWidth(0.8);
  pdf.line(margin, yPos + 2, margin + 40, yPos + 2);
  
  return yPos + 12;
}

async function addHeaderLogo(
  pdf: jsPDF,
  agent: AgentInfo | undefined,
  margin: number,
  yPos: number
) {
  if (agent?.watermark_logo) {
    try {
      const logo = await loadImage(agent.watermark_logo);
      const logoHeight = 12;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      pdf.addImage(logo, 'PNG', margin, yPos, logoWidth, logoHeight);
    } catch (err) {
      // Si falla, usar texto
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
      pdf.text('Flow Estate AI', margin, yPos + 8);
    }
  } else {
    // Texto por defecto
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
    pdf.text('Flow Estate AI', margin, yPos + 8);
  }
}

async function addFooter(
  pdf: jsPDF,
  agent: AgentInfo | undefined,
  pageWidth: number,
  pageHeight: number
) {
  const footerY = pageHeight - 15;
  
  // Línea superior
  pdf.setDrawColor(hexToRgb(COLORS.border).r, hexToRgb(COLORS.border).g, hexToRgb(COLORS.border).b);
  pdf.setLineWidth(0.3);
  pdf.line(20, footerY - 5, pageWidth - 20, footerY - 5);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);

  if (agent) {
    const agentName = agent.full_name || agent.name || '';
    const contactInfo = [agentName, agent.phone, agent.email].filter(Boolean).join(' • ');
    const textWidth = pdf.getTextWidth(contactInfo);
    pdf.text(contactInfo, pageWidth / 2 - textWidth / 2, footerY);
  } else {
    const text = 'Generado por Flow Estate AI';
    const textWidth = pdf.getTextWidth(text);
    pdf.text(text, pageWidth / 2 - textWidth / 2, footerY);
  }
}

async function addAgentInfo(
  pdf: jsPDF,
  agent: AgentInfo | undefined,
  margin: number,
  yPos: number,
  pageWidth: number
) {
  if (!agent) return;

  // Caja con fondo semi-transparente
  pdf.setFillColor(255, 255, 255);
  pdf.setGState(new pdf.GState({ opacity: 0.95 }));
  pdf.roundedRect(margin, yPos, pageWidth - (margin * 2), 30, 3, 3, 'F');
  pdf.setGState(new pdf.GState({ opacity: 1 }));

  // Información del agente
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
  pdf.text('Agente Inmobiliario', margin + 5, yPos + 8);

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  const agentName = agent.full_name || agent.name || 'Agente';
  pdf.text(agentName, margin + 5, yPos + 16);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);
  
  let contactY = yPos + 22;
  if (agent.phone) {
    pdf.text(`📱 ${agent.phone}`, margin + 5, contactY);
    contactY += 5;
  }
  if (agent.email) {
    pdf.text(`✉️ ${agent.email}`, margin + 5, contactY);
  }
  if (agent.brokerage) {
    pdf.text(agent.brokerage, pageWidth - margin - pdf.getTextWidth(agent.brokerage) - 5, yPos + 16);
  }
}

async function addWatermark(
  pdf: jsPDF,
  agent: AgentInfo | undefined,
  pageWidth: number,
  pageHeight: number
) {
  const wmSize = agent?.watermark_size === 'large' ? 25 : agent?.watermark_size === 'small' ? 12 : 18;
  const wmPadding = 10;
  
  let xPos = wmPadding;
  let yPos = pageHeight - wmSize - wmPadding;

  // Posición según configuración
  const position = agent?.watermark_position || 'bottom-left';
  switch (position) {
    case 'top-left':
      xPos = wmPadding;
      yPos = wmPadding;
      break;
    case 'top-right':
      xPos = pageWidth - wmSize - wmPadding;
      yPos = wmPadding;
      break;
    case 'bottom-right':
      xPos = pageWidth - wmSize - wmPadding;
      yPos = pageHeight - wmSize - wmPadding;
      break;
    case 'bottom-left':
    default:
      xPos = wmPadding;
      yPos = pageHeight - wmSize - wmPadding;
      break;
  }

  pdf.setGState(new pdf.GState({ opacity: 0.3 }));

  if (agent?.watermark_logo) {
    try {
      const logo = await loadImage(agent.watermark_logo);
      const logoWidth = wmSize;
      const logoHeight = (logo.height / logo.width) * wmSize;
      pdf.addImage(logo, 'PNG', xPos, yPos, logoWidth, logoHeight);
    } catch (err) {
      // Si falla, usar texto
      pdf.setFontSize(wmSize / 2);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
      pdf.text('Flow Estate AI', xPos, yPos + wmSize / 2);
    }
  } else {
    // Texto por defecto
    pdf.setFontSize(wmSize / 2.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
    pdf.text('Flow Estate AI', xPos, yPos + wmSize / 2);
  }

  pdf.setGState(new pdf.GState({ opacity: 1 }));
}

// ============================================
// UTILIDADES
// ============================================

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}