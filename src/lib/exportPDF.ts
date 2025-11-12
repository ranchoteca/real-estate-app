import jsPDF from 'jspdf';

// Paleta de colores profesional - Azul oscuro y Amarillo/Dorado
const COLORS = {
  primary: '#0f172a',        // Azul muy oscuro (slate-900)
  secondary: '#1e3a8a',      // Azul oscuro (blue-900)
  accent: '#1e40af',         // Azul medio (blue-800)
  gold: '#eab308',           // Amarillo dorado (yellow-500)
  goldDark: '#ca8a04',       // Amarillo oscuro (yellow-600)
  text: '#0f172a',           // Texto oscuro
  textLight: '#64748b',      // Gris medio
  textMuted: '#94a3b8',      // Gris claro
  border: '#e2e8f0',         // Borde claro
  background: '#f8fafc',     // Fondo muy claro
  white: '#ffffff',
};

interface AgentInfo {
  id?: string;
  full_name?: string;
  name?: string;
  username?: string;
  phone?: string;
  email?: string;
  brokerage?: string;
  watermark_logo?: string;
  watermark_position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  watermark_size?: 'small' | 'medium' | 'large';
}

export async function exportPropertyToPDF(property: any, agentParam?: AgentInfo) {
  console.log('🚀 Iniciando exportación de PDF...');
  console.log('📦 Propiedad:', property.title);
  console.log('👤 Agente (parámetro):', agentParam);

  // Cargar información del agente desde la API
  let agent: AgentInfo | undefined = agentParam;
  
  if (!agent || !agent.full_name) {
    console.log('⚠️ Información de agente incompleta, cargando desde API...');
    try {
      const response = await fetch('/api/agent/profile');
      if (response.ok) {
        const data = await response.json();
        agent = data.agent;
        console.log('✅ Agente cargado desde API:', agent);
      } else {
        console.warn('⚠️ No se pudo cargar la información del agente');
      }
    } catch (error) {
      console.error('❌ Error cargando información del agente:', error);
    }
  }

  console.log('📋 Agente final a usar:', {
    nombre: agent?.full_name || agent?.name || 'NO DISPONIBLE',
    email: agent?.email || 'NO DISPONIBLE',
    phone: agent?.phone || 'NO DISPONIBLE',
    brokerage: agent?.brokerage || 'NO DISPONIBLE',
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;

  // PÁGINA 1: PORTADA CON INFO PRINCIPAL
  await createCompactCoverPage(pdf, property, agent, pageWidth, pageHeight, margin);

  // PÁGINA 2: DETALLES, AMENIDADES Y DESCRIPCIÓN (TODO EN UNA)
  pdf.addPage();
  await createCompactDetailsPage(pdf, property, agent, pageWidth, pageHeight, margin);

  // PÁGINA 3: GALERÍA DE FOTOS (Solo si hay fotos)
  if (property.photos && property.photos.length > 1) {
    pdf.addPage();
    await createCompactGalleryPage(pdf, property, agent, pageWidth, pageHeight, margin);
  }

  // Guardar PDF
  const fileName = `${property.title.replace(/[^a-z0-9]/gi, '_')}_Brochure.pdf`;
  pdf.save(fileName);
  
  console.log('✅ PDF generado exitosamente:', fileName);
}

// ============================================
// PÁGINA 1: PORTADA COMPACTA
// ============================================
async function createCompactCoverPage(
  pdf: jsPDF,
  property: any,
  agent: AgentInfo | undefined,
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  // Imagen principal (2/3 superior de la página)
  const imageHeight = pageHeight * 0.65;
  
  if (property.photos && property.photos.length > 0) {
    try {
      const img = await loadImage(property.photos[0]);
      pdf.addImage(img, 'JPEG', 0, 0, pageWidth, imageHeight);
      
      // Overlay oscuro degradado
      pdf.setFillColor(15, 23, 42); // primary color
      pdf.setGState(new pdf.GState({ opacity: 0.5 }));
      pdf.rect(0, imageHeight - 80, pageWidth, 80, 'F');
      pdf.setGState(new pdf.GState({ opacity: 1 }));
    } catch (err) {
      console.error('Error loading cover image:', err);
      // Fondo azul oscuro de respaldo
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pageWidth, imageHeight, 'F');
    }
  }

  // Logo del agente (esquina superior izquierda)
  if (agent?.watermark_logo) {
    try {
      const logo = await loadImage(agent.watermark_logo);
      const logoHeight = 15;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      
      // Fondo blanco para el logo
      pdf.setFillColor(255, 255, 255);
      pdf.setGState(new pdf.GState({ opacity: 0.95 }));
      pdf.roundedRect(margin - 2, margin - 2, logoWidth + 4, logoHeight + 4, 2, 2, 'F');
      pdf.setGState(new pdf.GState({ opacity: 1 }));
      
      pdf.addImage(logo, 'PNG', margin, margin, logoWidth, logoHeight);
    } catch (err) {
      console.error('Error cargando logo:', err);
    }
  } else {
    // Texto "Flow Estate AI" como logo
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    
    // Fondo semi-transparente
    const textWidth = pdf.getTextWidth('FLOW ESTATE AI');
    pdf.setFillColor(15, 23, 42);
    pdf.setGState(new pdf.GState({ opacity: 0.8 }));
    pdf.roundedRect(margin - 2, margin - 2, textWidth + 4, 10, 2, 2, 'F');
    pdf.setGState(new pdf.GState({ opacity: 1 }));
    
    pdf.text('FLOW ESTATE AI', margin, margin + 6);
  }

  // Badge de estado (arriba derecha)
  if (property.listing_type) {
    const badgeText = property.listing_type === 'sale' ? 'FOR SALE' : 'FOR RENT';
    const badgeColor = property.listing_type === 'sale' ? COLORS.gold : COLORS.accent;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    const textWidth = pdf.getTextWidth(badgeText);
    
    pdf.setFillColor(hexToRgb(badgeColor).r, hexToRgb(badgeColor).g, hexToRgb(badgeColor).b);
    pdf.roundedRect(pageWidth - textWidth - 20, margin, textWidth + 10, 8, 2, 2, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.text(badgeText, pageWidth - textWidth - 15, margin + 5.5);
  }

  // Información sobre la imagen (parte inferior)
  let overlayY = imageHeight - 60;

  // Título
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  const title = property.title.toUpperCase();
  const splitTitle = pdf.splitTextToSize(title, pageWidth - (margin * 2));
  
  for (let i = 0; i < Math.min(splitTitle.length, 2); i++) {
    pdf.text(splitTitle[i], margin, overlayY);
    overlayY += 10;
  }

  // Ubicación
  const locationParts = [property.city, property.state].filter(Boolean);
  if (locationParts.length > 0) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(234, 179, 8); // gold
    pdf.text(locationParts.join(', '), margin, overlayY + 5);
    overlayY += 12;
  }

  // Precio (grande y destacado)
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(234, 179, 8); // gold
  const price = property.price 
    ? `$${property.price.toLocaleString()}`
    : 'Price Upon Request';
  pdf.text(price, margin, overlayY + 8);

  // Features principales (iconos con texto)
  const features = [
    { value: property.bedrooms, label: 'Beds', show: property.bedrooms > 0 },
    { value: property.bathrooms, label: 'Baths', show: property.bathrooms > 0 },
    { value: property.sqft ? `${property.sqft.toLocaleString()}` : null, label: 'sqft', show: property.sqft > 0 },
  ].filter(f => f.show);

  if (features.length > 0) {
    let featureX = margin;
    const featureY = imageHeight - 18;
    
    features.forEach((feature, index) => {
      if (index > 0) {
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(12);
        pdf.text('|', featureX, featureY);
        featureX += 8;
      }
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text(String(feature.value), featureX, featureY);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(feature.label, featureX + pdf.getTextWidth(String(feature.value)) + 2, featureY);
      
      featureX += pdf.getTextWidth(String(feature.value)) + pdf.getTextWidth(feature.label) + 10;
    });
  }

  // Sección inferior blanca con información del agente
  let bottomY = imageHeight + 10;

  // Línea decorativa dorada
  pdf.setDrawColor(hexToRgb(COLORS.gold).r, hexToRgb(COLORS.gold).g, hexToRgb(COLORS.gold).b);
  pdf.setLineWidth(2);
  pdf.line(margin, bottomY, margin + 40, bottomY);
  bottomY += 12;

  // Tipo de propiedad
  if (property.property_type) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
    pdf.text('PROPERTY TYPE:', margin, bottomY);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);
    const propertyTypeName = getPropertyTypeName(property.property_type);
    pdf.text(propertyTypeName, margin + 42, bottomY);
    
    bottomY += 10;
  }

  // Información del AGENTE (destacada)
  if (agent && (agent.full_name || agent.name || agent.email || agent.phone)) {
    console.log('📝 Renderizando información del agente en portada...');
    
    // Caja de agente con borde dorado
    const agentBoxHeight = 32;
    pdf.setFillColor(hexToRgb(COLORS.background).r, hexToRgb(COLORS.background).g, hexToRgb(COLORS.background).b);
    pdf.setDrawColor(hexToRgb(COLORS.gold).r, hexToRgb(COLORS.gold).g, hexToRgb(COLORS.gold).b);
    pdf.setLineWidth(1);
    pdf.roundedRect(margin, bottomY, pageWidth - (margin * 2), agentBoxHeight, 3, 3, 'FD');

    bottomY += 7;

    // Label "LISTING AGENT" en dorado
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(hexToRgb(COLORS.gold).r, hexToRgb(COLORS.gold).g, hexToRgb(COLORS.gold).b);
    pdf.text('LISTING AGENT', margin + 5, bottomY);
    
    bottomY += 6;

    // Nombre del agente
    const agentName = agent.full_name || agent.name || 'Real Estate Agent';
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
    pdf.text(agentName, margin + 5, bottomY);
    
    bottomY += 6;

    // Información de contacto en una línea
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);
    
    const contactParts = [];
    if (agent.phone) contactParts.push(`Phone: ${agent.phone}`);
    if (agent.email) contactParts.push(`Email: ${agent.email}`);
    
    if (contactParts.length > 0) {
      const contactText = contactParts.join('  |  ');
      pdf.text(contactText, margin + 5, bottomY);
      bottomY += 5;
    }

    // Brokerage en cursiva
    if (agent.brokerage) {
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(hexToRgb(COLORS.textMuted).r, hexToRgb(COLORS.textMuted).g, hexToRgb(COLORS.textMuted).b);
      pdf.text(agent.brokerage, margin + 5, bottomY);
    }
  } else {
    console.warn('⚠️ NO hay información completa del agente para mostrar');
    
    // Mensaje de respaldo
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(hexToRgb(COLORS.textMuted).r, hexToRgb(COLORS.textMuted).g, hexToRgb(COLORS.textMuted).b);
    pdf.text('Powered by Flow Estate AI', margin, bottomY);
  }
}

// ============================================
// PÁGINA 2: DETALLES COMPACTOS (TODO EN UNO)
// ============================================
async function createCompactDetailsPage(
  pdf: jsPDF,
  property: any,
  agent: AgentInfo | undefined,
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  // Header simple
  await addCompactHeader(pdf, agent, margin, pageWidth);

  let yPos = 35;
  const contentWidth = pageWidth - (margin * 2);
  const columnWidth = (contentWidth - 8) / 2;

  // TÍTULO: PROPERTY DETAILS
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
  pdf.text('PROPERTY DETAILS', margin, yPos);
  
  // Línea dorada
  pdf.setDrawColor(hexToRgb(COLORS.gold).r, hexToRgb(COLORS.gold).g, hexToRgb(COLORS.gold).b);
  pdf.setLineWidth(1.5);
  pdf.line(margin, yPos + 2, margin + 50, yPos + 2);
  
  yPos += 12;

  // Campos personalizados en 2 columnas (COMPACTO)
  if (property.custom_fields_data && Object.keys(property.custom_fields_data).length > 0) {
    const customFieldsDefinitions = await loadCustomFieldsDefinitions(
      property.agent_id,
      property.property_type,
      property.listing_type
    );

    const entries = Object.entries(property.custom_fields_data).filter(([_, value]) => value);
    
    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i];
      const fieldDef = customFieldsDefinitions.find((f: any) => f.field_key === key);
      const fieldName = fieldDef?.field_name || key;

      const isLeftColumn = i % 2 === 0;
      const xPos = isLeftColumn ? margin : margin + columnWidth + 4;

      // Fondo sutil
      pdf.setFillColor(hexToRgb(COLORS.background).r, hexToRgb(COLORS.background).g, hexToRgb(COLORS.background).b);
      pdf.roundedRect(xPos, yPos - 3, columnWidth, 10, 1, 1, 'F');

      // Nombre del campo (bold)
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
      pdf.text(fieldName + ':', xPos + 3, yPos + 3);

      // Valor
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);
      const valueText = String(value);
      const maxWidth = columnWidth - pdf.getTextWidth(fieldName + ':') - 8;
      const splitValue = pdf.splitTextToSize(valueText, maxWidth);
      const valueX = xPos + pdf.getTextWidth(fieldName + ':') + 5;
      pdf.text(splitValue[0], valueX, yPos + 3);

      if (!isLeftColumn || i === entries.length - 1) {
        yPos += 12;
      }
    }

    yPos += 5;
  }

  // DESCRIPCIÓN
  if (property.description && yPos < pageHeight - 80) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
    pdf.text('DESCRIPTION', margin, yPos);
    
    pdf.setDrawColor(hexToRgb(COLORS.gold).r, hexToRgb(COLORS.gold).g, hexToRgb(COLORS.gold).b);
    pdf.setLineWidth(1.5);
    pdf.line(margin, yPos + 2, margin + 40, yPos + 2);
    
    yPos += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);
    
    const maxLines = Math.floor((pageHeight - yPos - 60) / 5.5);
    const splitDescription = pdf.splitTextToSize(property.description, contentWidth);
    
    for (let i = 0; i < Math.min(splitDescription.length, maxLines); i++) {
      pdf.text(splitDescription[i], margin, yPos);
      yPos += 5.5;
    }

    yPos += 8;
  }

  // UBICACIÓN + QR CODE (lado a lado)
  if (yPos < pageHeight - 60) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
    pdf.text('LOCATION', margin, yPos);
    
    pdf.setDrawColor(hexToRgb(COLORS.gold).r, hexToRgb(COLORS.gold).g, hexToRgb(COLORS.gold).b);
    pdf.setLineWidth(1.5);
    pdf.line(margin, yPos + 2, margin + 30, yPos + 2);
    
    yPos += 10;

    // Dirección (lado izquierdo)
    const locationParts = [
      property.address,
      property.city,
      property.state,
      property.zip_code
    ].filter(Boolean);

    if (locationParts.length > 0) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);
      
      const location = locationParts.join(', ');
      const splitLocation = pdf.splitTextToSize(location, contentWidth - 50);
      
      let locY = yPos;
      splitLocation.forEach((line: string) => {
        pdf.text(line, margin, locY);
        locY += 5;
      });
    }

    // QR Code (lado derecho)
    const qrSize = 40;
    const qrX = pageWidth - margin - qrSize;
    
    try {
      const propertyUrl = `${window.location.origin}/p/${property.slug}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(propertyUrl)}`;
      const qrImg = await loadImage(qrCodeUrl);
      
      // Fondo blanco con borde
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(hexToRgb(COLORS.border).r, hexToRgb(COLORS.border).g, hexToRgb(COLORS.border).b);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(qrX - 2, yPos - 2, qrSize + 4, qrSize + 4, 2, 2, 'FD');
      
      pdf.addImage(qrImg, 'PNG', qrX, yPos, qrSize, qrSize);
      
      // Texto debajo del QR
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(hexToRgb(COLORS.textMuted).r, hexToRgb(COLORS.textMuted).g, hexToRgb(COLORS.textMuted).b);
      const qrTextWidth = pdf.getTextWidth('Scan to view online');
      pdf.text('Scan to view online', qrX + (qrSize - qrTextWidth) / 2, yPos + qrSize + 5);
    } catch (err) {
      console.error('Error generando QR:', err);
    }
  }

  // Footer
  await addCompactFooter(pdf, agent, pageWidth, pageHeight);
}

// ============================================
// PÁGINA 3: GALERÍA COMPACTA
// ============================================
async function createCompactGalleryPage(
  pdf: jsPDF,
  property: any,
  agent: AgentInfo | undefined,
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  await addCompactHeader(pdf, agent, margin, pageWidth);

  let yPos = 35;

  // TÍTULO
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
  pdf.text('PHOTO GALLERY', margin, yPos);
  
  pdf.setDrawColor(hexToRgb(COLORS.gold).r, hexToRgb(COLORS.gold).g, hexToRgb(COLORS.gold).b);
  pdf.setLineWidth(1.5);
  pdf.line(margin, yPos + 2, margin + 45, yPos + 2);
  
  yPos += 12;

  // Grid de fotos 2x3
  const photos = property.photos.slice(1, 7);
  const spacing = 4;
  const imageSize = (pageWidth - (margin * 2) - spacing) / 2;
  
  let xPos = margin;
  let count = 0;

  for (const photoUrl of photos) {
    try {
      const img = await loadImage(photoUrl);
      
      if (count > 0 && count % 2 === 0) {
        xPos = margin;
        yPos += imageSize + spacing;
      }

      if (yPos + imageSize > pageHeight - 30) break;

      // Imagen con borde
      pdf.addImage(img, 'JPEG', xPos, yPos, imageSize, imageSize);
      pdf.setDrawColor(hexToRgb(COLORS.border).r, hexToRgb(COLORS.border).g, hexToRgb(COLORS.border).b);
      pdf.setLineWidth(0.5);
      pdf.rect(xPos, yPos, imageSize, imageSize);

      xPos += imageSize + spacing;
      count++;
    } catch (err) {
      console.error('Error loading gallery image:', err);
    }
  }

  await addCompactFooter(pdf, agent, pageWidth, pageHeight);
}

// ============================================
// COMPONENTES COMPARTIDOS
// ============================================

async function addCompactHeader(
  pdf: jsPDF,
  agent: AgentInfo | undefined,
  margin: number,
  pageWidth: number
) {
  // Logo pequeño
  if (agent?.watermark_logo) {
    try {
      const logo = await loadImage(agent.watermark_logo);
      const logoHeight = 10;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      pdf.addImage(logo, 'PNG', margin, 12, logoWidth, logoHeight);
    } catch (err) {
      console.error('Error loading header logo:', err);
      // Texto alternativo
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
      pdf.text('FLOW ESTATE AI', margin, 18);
    }
  } else {
    // Texto por defecto
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
    pdf.text('FLOW ESTATE AI', margin, 18);
  }

  // Línea decorativa dorada
  pdf.setDrawColor(hexToRgb(COLORS.gold).r, hexToRgb(COLORS.gold).g, hexToRgb(COLORS.gold).b);
  pdf.setLineWidth(0.5);
  pdf.line(margin, 25, pageWidth - margin, 25);
}

async function addCompactFooter(
  pdf: jsPDF,
  agent: AgentInfo | undefined,
  pageWidth: number,
  pageHeight: number
) {
  const footerY = pageHeight - 10;
  
  pdf.setDrawColor(hexToRgb(COLORS.border).r, hexToRgb(COLORS.border).g, hexToRgb(COLORS.border).b);
  pdf.setLineWidth(0.3);
  pdf.line(15, footerY - 4, pageWidth - 15, footerY - 4);

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(hexToRgb(COLORS.textMuted).r, hexToRgb(COLORS.textMuted).g, hexToRgb(COLORS.textMuted).b);

  if (agent && (agent.full_name || agent.name || agent.email || agent.phone)) {
    const agentName = agent.full_name || agent.name || '';
    const parts = [];
    
    if (agentName) parts.push(agentName);
    if (agent.phone) parts.push(agent.phone);
    if (agent.email) parts.push(agent.email);
    
    const text = parts.join('  |  ');
    const textWidth = pdf.getTextWidth(text);
    pdf.text(text, pageWidth / 2 - textWidth / 2, footerY);
  } else {
    const text = 'Powered by Flow Estate AI';
    const textWidth = pdf.getTextWidth(text);
    pdf.text(text, pageWidth / 2 - textWidth / 2, footerY);
  }
}

// ============================================
// UTILIDADES
// ============================================

async function loadCustomFieldsDefinitions(
  agentId: string,
  propertyType: string,
  listingType: string
): Promise<any[]> {
  try {
    const params = new URLSearchParams({
      property_type: propertyType,
      listing_type: listingType,
    });

    const response = await fetch(`/api/custom-fields/list?${params.toString()}`);
    
    if (!response.ok) {
      console.error('Error al cargar definiciones de campos personalizados');
      return [];
    }

    const data = await response.json();
    console.log('✅ Campos personalizados cargados:', data.fields?.length || 0);
    return data.fields || [];
  } catch (error) {
    console.error('Error al cargar definiciones de campos:', error);
    return [];
  }
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

function getPropertyTypeName(type: string): string {
  const types: { [key: string]: string } = {
    'house': 'House',
    'condo': 'Condo',
    'apartment': 'Apartment',
    'land': 'Land',
    'commercial': 'Commercial',
    'townhouse': 'Townhouse',
    'villa': 'Villa',
  };
  return types[type] || type.charAt(0).toUpperCase() + type.slice(1);
}