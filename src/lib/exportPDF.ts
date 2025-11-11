import jsPDF from 'jspdf';

// Paleta de colores profesional
const COLORS = {
  primary: '#1a365d',      // Azul marino profundo
  secondary: '#2c5282',    // Azul medio
  accent: '#3182ce',       // Azul brillante
  gold: '#d69e2e',         // Dorado elegante
  success: '#38a169',      // Verde
  text: '#1a202c',         // Negro suave
  textLight: '#4a5568',    // Gris medio
  textMuted: '#718096',    // Gris claro
  border: '#e2e8f0',       // Borde suave
  background: '#f7fafc',   // Fondo muy claro
  white: '#ffffff',
  overlay: 'rgba(0, 0, 0, 0.4)',
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
  const margin = 15;

  console.log('🏠 Generando PDF profesional para:', property.title);

  // PÁGINA 1: PORTADA IMPACTANTE
  await createPremiumCoverPage(pdf, property, agent, pageWidth, pageHeight);

  // PÁGINA 2: OVERVIEW CON FEATURES
  pdf.addPage();
  await createOverviewPage(pdf, property, agent, pageWidth, pageHeight, margin);

  // PÁGINA 3: GALERÍA DE FOTOS
  if (property.photos && property.photos.length > 1) {
    pdf.addPage();
    await createPhotoGalleryPage(pdf, property, agent, pageWidth, pageHeight, margin);
  }

  // PÁGINA 4: DETALLES Y AMENIDADES
  pdf.addPage();
  await createDetailsAmenitiesPage(pdf, property, agent, pageWidth, pageHeight, margin);

  // PÁGINA 5: DESCRIPCIÓN Y UBICACIÓN
  pdf.addPage();
  await createDescriptionLocationPage(pdf, property, agent, pageWidth, pageHeight, margin);

  // PÁGINA 6: CONTACTO Y CTA
  pdf.addPage();
  await createContactCTAPage(pdf, property, agent, pageWidth, pageHeight);

  // Guardar con nombre profesional
  const fileName = `${property.title.replace(/[^a-z0-9]/gi, '_')}_Brochure.pdf`;
  pdf.save(fileName);
  
  console.log('✅ PDF generado exitosamente:', fileName);
}

// ============================================
// PÁGINA 1: PORTADA PREMIUM
// ============================================
async function createPremiumCoverPage(
  pdf: jsPDF,
  property: any,
  agent: AgentInfo | undefined,
  pageWidth: number,
  pageHeight: number
) {
  // Imagen de fondo a pantalla completa con overlay
  if (property.photos && property.photos.length > 0) {
    try {
      const img = await loadImage(property.photos[0]);
      pdf.addImage(img, 'JPEG', 0, 0, pageWidth, pageHeight);
      
      // Overlay gradiente oscuro (de arriba hacia abajo)
      pdf.setFillColor(0, 0, 0);
      pdf.setGState(new pdf.GState({ opacity: 0.6 }));
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.setGState(new pdf.GState({ opacity: 1 }));
    } catch (err) {
      console.error('Error loading cover image:', err);
      // Fondo de respaldo elegante
      pdf.setFillColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    }
  }

  // Logo del agente en la esquina superior
  if (agent?.watermark_logo) {
    try {
      const logo = await loadImage(agent.watermark_logo);
      const logoHeight = 18;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      
      // Fondo blanco semi-transparente para el logo
      pdf.setFillColor(255, 255, 255);
      pdf.setGState(new pdf.GState({ opacity: 0.95 }));
      pdf.roundedRect(15, 15, logoWidth + 8, logoHeight + 8, 3, 3, 'F');
      pdf.setGState(new pdf.GState({ opacity: 1 }));
      
      pdf.addImage(logo, 'PNG', 19, 19, logoWidth, logoHeight);
    } catch (err) {
      console.error('Error cargando logo:', err);
    }
  }

  // Badge de estado (arriba a la derecha)
  const badgeY = 25;
  if (property.listing_type) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    
    const badgeText = property.listing_type === 'sale' ? 'FOR SALE' : 'FOR RENT';
    const badgeColor = property.listing_type === 'sale' ? COLORS.gold : COLORS.accent;
    const textWidth = pdf.getTextWidth(badgeText);
    
    pdf.setFillColor(hexToRgb(badgeColor).r, hexToRgb(badgeColor).g, hexToRgb(badgeColor).b);
    pdf.roundedRect(pageWidth - textWidth - 25, badgeY - 5, textWidth + 10, 8, 2, 2, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.text(badgeText, pageWidth - textWidth - 20, badgeY);
  }

  // Título principal (centro-inferior de la página)
  const titleY = pageHeight * 0.7;
  
  // Línea decorativa dorada arriba del título
  pdf.setDrawColor(hexToRgb(COLORS.gold).r, hexToRgb(COLORS.gold).g, hexToRgb(COLORS.gold).b);
  pdf.setLineWidth(1.5);
  pdf.line(20, titleY - 15, 70, titleY - 15);
  
  // Título
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  const title = property.title.toUpperCase();
  const splitTitle = pdf.splitTextToSize(title, pageWidth - 40);
  let currentY = titleY;
  
  for (let i = 0; i < Math.min(splitTitle.length, 3); i++) {
    pdf.text(splitTitle[i], 20, currentY);
    currentY += 10;
  }

  // Subtítulo de ubicación
  const locationParts = [property.city, property.state].filter(Boolean);
  if (locationParts.length > 0) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(240, 240, 240);
    pdf.text(locationParts.join(', '), 20, currentY + 8);
    currentY += 15;
  }

  // Precio en grande y destacado
  pdf.setFontSize(36);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(hexToRgb(COLORS.gold).r, hexToRgb(COLORS.gold).g, hexToRgb(COLORS.gold).b);
  const price = property.price 
    ? `$${property.price.toLocaleString()}`
    : 'Price Upon Request';
  pdf.text(price, 20, currentY + 8);

  // Features rápidos en la portada
  const quickFeatures = [
    { icon: '🛏️', value: property.bedrooms, label: 'Beds' },
    { icon: '🚿', value: property.bathrooms, label: 'Baths' },
    { icon: '📐', value: property.sqft, label: 'sqft' },
  ].filter(f => f.value > 0);

  if (quickFeatures.length > 0) {
    let featureX = 20;
    const featureY = pageHeight - 35;
    
    quickFeatures.forEach(feature => {
      // Fondo semi-transparente
      pdf.setFillColor(255, 255, 255);
      pdf.setGState(new pdf.GState({ opacity: 0.2 }));
      pdf.roundedRect(featureX - 2, featureY - 8, 35, 12, 2, 2, 'F');
      pdf.setGState(new pdf.GState({ opacity: 1 }));
      
      // Contenido
      pdf.setFontSize(16);
      pdf.setTextColor(255, 255, 255);
      pdf.text(feature.icon, featureX, featureY);
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(String(feature.value), featureX + 8, featureY);
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(feature.label, featureX + 8, featureY + 5);
      
      featureX += 40;
    });
  }
}

// ============================================
// PÁGINA 2: OVERVIEW Y HIGHLIGHTS
// ============================================
async function createOverviewPage(
  pdf: jsPDF,
  property: any,
  agent: AgentInfo | undefined,
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  await addPageHeader(pdf, agent, 'PROPERTY OVERVIEW', pageWidth, margin);

  let yPos = 45;
  const contentWidth = pageWidth - (margin * 2);

  // Features principales en tarjetas grandes
  const mainFeatures = [
    { icon: '🛏️', value: property.bedrooms, label: 'Bedrooms', color: COLORS.primary },
    { icon: '🚿', value: property.bathrooms, label: 'Bathrooms', color: COLORS.secondary },
    { icon: '📐', value: property.sqft ? `${property.sqft.toLocaleString()}` : 'N/A', label: 'Square Feet', color: COLORS.accent },
    { icon: '🏠', value: getPropertyTypeName(property.property_type), label: 'Property Type', color: COLORS.gold, isText: true },
  ].filter(f => f.value && f.value !== 'N/A' && f.value !== 0);

  if (mainFeatures.length > 0) {
    const cardWidth = (contentWidth - 15) / 2;
    const cardHeight = 35;
    let xPos = margin;
    let row = 0;

    mainFeatures.forEach((feature, index) => {
      if (index > 0 && index % 2 === 0) {
        row++;
        xPos = margin;
        yPos += cardHeight + 8;
      }

      // Tarjeta con sombra
      pdf.setFillColor(hexToRgb(COLORS.white).r, hexToRgb(COLORS.white).g, hexToRgb(COLORS.white).b);
      pdf.setDrawColor(hexToRgb(COLORS.border).r, hexToRgb(COLORS.border).g, hexToRgb(COLORS.border).b);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(xPos, yPos, cardWidth, cardHeight, 4, 4, 'FD');

      // Barra de color superior
      pdf.setFillColor(hexToRgb(feature.color).r, hexToRgb(feature.color).g, hexToRgb(feature.color).b);
      pdf.roundedRect(xPos, yPos, cardWidth, 3, 4, 4, 'F');

      // Icono
      pdf.setFontSize(24);
      pdf.text(feature.icon, xPos + 8, yPos + 18);

      // Valor
      pdf.setFontSize(feature.isText ? 13 : 22);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
      const valueText = String(feature.value);
      pdf.text(valueText, xPos + 25, yPos + 18);

      // Label
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(hexToRgb(COLORS.textMuted).r, hexToRgb(COLORS.textMuted).g, hexToRgb(COLORS.textMuted).b);
      pdf.text(feature.label, xPos + 25, yPos + 26);

      xPos += cardWidth + 5;
    });

    yPos += cardHeight + 20;
  }

  // Sección de highlights
  if (property.description) {
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
    pdf.text('PROPERTY HIGHLIGHTS', margin, yPos);
    
    yPos += 10;
    
    // Extracto de la descripción
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);
    
    const excerpt = property.description.substring(0, 400) + (property.description.length > 400 ? '...' : '');
    const splitExcerpt = pdf.splitTextToSize(excerpt, contentWidth);
    
    splitExcerpt.slice(0, 8).forEach((line: string) => {
      pdf.text(line, margin, yPos);
      yPos += 5.5;
    });
  }

  await addPageFooter(pdf, agent, pageWidth, pageHeight);
}

// ============================================
// PÁGINA 3: GALERÍA DE FOTOS
// ============================================
async function createPhotoGalleryPage(
  pdf: jsPDF,
  property: any,
  agent: AgentInfo | undefined,
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  await addPageHeader(pdf, agent, 'PHOTO GALLERY', pageWidth, margin);

  const photos = property.photos.slice(1, 7); // Hasta 6 fotos adicionales
  const spacing = 4;
  const availableHeight = pageHeight - 60;
  const imageSize = (pageWidth - (margin * 2) - spacing) / 2;
  
  let xPos = margin;
  let yPos = 45;
  let count = 0;

  for (const photoUrl of photos) {
    try {
      const img = await loadImage(photoUrl);
      
      if (count > 0 && count % 2 === 0) {
        xPos = margin;
        yPos += imageSize + spacing;
      }

      if (yPos + imageSize > pageHeight - 30) break;

      // Sombra
      pdf.setFillColor(0, 0, 0);
      pdf.setGState(new pdf.GState({ opacity: 0.1 }));
      pdf.roundedRect(xPos + 1, yPos + 1, imageSize, imageSize, 3, 3, 'F');
      pdf.setGState(new pdf.GState({ opacity: 1 }));

      // Imagen con borde redondeado
      pdf.addImage(img, 'JPEG', xPos, yPos, imageSize, imageSize);
      pdf.setDrawColor(hexToRgb(COLORS.border).r, hexToRgb(COLORS.border).g, hexToRgb(COLORS.border).b);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(xPos, yPos, imageSize, imageSize, 3, 3, 'D');

      xPos += imageSize + spacing;
      count++;
    } catch (err) {
      console.error('Error loading gallery image:', err);
    }
  }

  await addPageFooter(pdf, agent, pageWidth, pageHeight);
}

// ============================================
// PÁGINA 4: DETALLES Y AMENIDADES
// ============================================
async function createDetailsAmenitiesPage(
  pdf: jsPDF,
  property: any,
  agent: AgentInfo | undefined,
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  await addPageHeader(pdf, agent, 'DETAILS & AMENITIES', pageWidth, margin);

  let yPos = 45;
  const contentWidth = pageWidth - (margin * 2);

  // Campos personalizados en diseño de dos columnas
  if (property.custom_fields_data && Object.keys(property.custom_fields_data).length > 0) {
    const customFieldsDefinitions = await loadCustomFieldsDefinitions(
      property.agent_id,
      property.property_type,
      property.listing_type
    );

    const entries = Object.entries(property.custom_fields_data).filter(([_, value]) => value);
    const columnWidth = (contentWidth - 8) / 2;
    
    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i];
      const fieldDef = customFieldsDefinitions.find((f: any) => f.field_key === key);
      const fieldName = fieldDef?.field_name || key;
      const fieldIcon = fieldDef?.icon || '📌';

      if (yPos > pageHeight - 50) {
        pdf.addPage();
        await addPageHeader(pdf, agent, 'DETAILS & AMENITIES (cont.)', pageWidth, margin);
        yPos = 45;
      }

      const isLeftColumn = i % 2 === 0;
      const xPos = isLeftColumn ? margin : margin + columnWidth + 4;

      // Fondo de la tarjeta
      pdf.setFillColor(hexToRgb(COLORS.background).r, hexToRgb(COLORS.background).g, hexToRgb(COLORS.background).b);
      pdf.roundedRect(xPos, yPos - 3, columnWidth, 14, 2, 2, 'F');

      // Icono
      pdf.setFontSize(11);
      pdf.text(fieldIcon, xPos + 4, yPos + 5);

      // Nombre del campo
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
      pdf.text(fieldName, xPos + 12, yPos + 3);

      // Valor
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);
      const valueText = String(value);
      const splitValue = pdf.splitTextToSize(valueText, columnWidth - 15);
      pdf.text(splitValue[0], xPos + 12, yPos + 8);

      if (!isLeftColumn || i === entries.length - 1) {
        yPos += 17;
      }
    }
  }

  await addPageFooter(pdf, agent, pageWidth, pageHeight);
}

// ============================================
// PÁGINA 5: DESCRIPCIÓN Y UBICACIÓN
// ============================================
async function createDescriptionLocationPage(
  pdf: jsPDF,
  property: any,
  agent: AgentInfo | undefined,
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  await addPageHeader(pdf, agent, 'DESCRIPTION', pageWidth, margin);

  let yPos = 45;
  const contentWidth = pageWidth - (margin * 2);

  // Descripción completa
  if (property.description) {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);
    pdf.setLineHeightFactor(1.6);
    
    const splitDescription = pdf.splitTextToSize(property.description, contentWidth);
    
    for (const line of splitDescription) {
      if (yPos > pageHeight - 50) {
        pdf.addPage();
        await addPageHeader(pdf, agent, 'DESCRIPTION (cont.)', pageWidth, margin);
        yPos = 45;
      }
      pdf.text(line, margin, yPos);
      yPos += 6;
    }

    yPos += 15;
  }

  // Ubicación
  const locationParts = [
    property.address,
    property.city,
    property.state,
    property.zip_code
  ].filter(Boolean);

  if (locationParts.length > 0 && yPos < pageHeight - 50) {
    // Título de sección
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
    pdf.text('📍 LOCATION', margin, yPos);
    
    yPos += 12;

    // Caja de ubicación
    const boxHeight = 25;
    pdf.setFillColor(hexToRgb(COLORS.background).r, hexToRgb(COLORS.background).g, hexToRgb(COLORS.background).b);
    pdf.setDrawColor(hexToRgb(COLORS.border).r, hexToRgb(COLORS.border).g, hexToRgb(COLORS.border).b);
    pdf.roundedRect(margin, yPos - 5, contentWidth, boxHeight, 3, 3, 'FD');

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
    const location = locationParts.join(', ');
    const splitLocation = pdf.splitTextToSize(location, contentWidth - 10);
    
    let locY = yPos + 3;
    splitLocation.forEach((line: string) => {
      pdf.text(line, margin + 5, locY);
      locY += 6;
    });
  }

  await addPageFooter(pdf, agent, pageWidth, pageHeight);
}

// ============================================
// PÁGINA 6: CONTACTO Y CALL TO ACTION
// ============================================
async function createContactCTAPage(
  pdf: jsPDF,
  property: any,
  agent: AgentInfo | undefined,
  pageWidth: number,
  pageHeight: number
) {
  // Fondo elegante
  pdf.setFillColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Logo grande arriba
  if (agent?.watermark_logo) {
    try {
      const logo = await loadImage(agent.watermark_logo);
      const logoHeight = 30;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      const xPos = (pageWidth - logoWidth) / 2;
      pdf.addImage(logo, 'PNG', xPos, 40, logoWidth, logoHeight);
    } catch (err) {
      console.error('Error loading logo:', err);
    }
  }

  let yPos = 85;

  // Título CTA
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  const ctaText = 'Schedule Your Private Showing';
  const ctaWidth = pdf.getTextWidth(ctaText);
  pdf.text(ctaText, (pageWidth - ctaWidth) / 2, yPos);

  yPos += 15;

  // Subtítulo
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(220, 220, 220);
  const subtitle = 'Contact us today to learn more about this exceptional property';
  const subWidth = pdf.getTextWidth(subtitle);
  pdf.text(subtitle, (pageWidth - subWidth) / 2, yPos);

  yPos += 30;

  // Información del agente en caja blanca
  if (agent) {
    const boxWidth = 140;
    const boxHeight = 70;
    const boxX = (pageWidth - boxWidth) / 2;

    // Caja principal
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(boxX, yPos, boxWidth, boxHeight, 5, 5, 'F');

    // Nombre del agente
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
    const agentName = agent.full_name || agent.name || 'Real Estate Agent';
    const nameWidth = pdf.getTextWidth(agentName);
    pdf.text(agentName, boxX + (boxWidth - nameWidth) / 2, yPos + 18);

    // Brokerage
    if (agent.brokerage) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(hexToRgb(COLORS.textMuted).r, hexToRgb(COLORS.textMuted).g, hexToRgb(COLORS.textMuted).b);
      const brokerWidth = pdf.getTextWidth(agent.brokerage);
      pdf.text(agent.brokerage, boxX + (boxWidth - brokerWidth) / 2, yPos + 26);
    }

    // Línea divisoria
    pdf.setDrawColor(hexToRgb(COLORS.border).r, hexToRgb(COLORS.border).g, hexToRgb(COLORS.border).b);
    pdf.setLineWidth(0.5);
    pdf.line(boxX + 15, yPos + 33, boxX + boxWidth - 15, yPos + 33);

    // Contacto
    let contactY = yPos + 43;
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);

    if (agent.phone) {
      const phoneText = `📱 ${agent.phone}`;
      const phoneWidth = pdf.getTextWidth(phoneText);
      pdf.text(phoneText, boxX + (boxWidth - phoneWidth) / 2, contactY);
      contactY += 8;
    }

    if (agent.email) {
      const emailText = `✉️ ${agent.email}`;
      const emailWidth = pdf.getTextWidth(emailText);
      pdf.text(emailText, boxX + (boxWidth - emailWidth) / 2, contactY);
    }
  }

  // QR Code abajo
  yPos += 95;
  const qrSize = 50;
  const qrX = (pageWidth - qrSize) / 2;
  
  try {
    const propertyUrl = `${window.location.origin}/p/${property.slug}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(propertyUrl)}`;
    const qrImg = await loadImage(qrCodeUrl);
    
    // Fondo blanco para el QR
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(qrX - 3, yPos - 3, qrSize + 6, qrSize + 6, 3, 3, 'F');
    
    pdf.addImage(qrImg, 'PNG', qrX, yPos, qrSize, qrSize);
  } catch (err) {
    console.error('Error generando QR:', err);
  }

  // Texto del QR
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(220, 220, 220);
  const qrText = 'Scan to view online';
  const qrTextWidth = pdf.getTextWidth(qrText);
  pdf.text(qrText, (pageWidth - qrTextWidth) / 2, yPos + qrSize + 8);
}

// ============================================
// COMPONENTES COMPARTIDOS
// ============================================

async function addPageHeader(
  pdf: jsPDF,
  agent: AgentInfo | undefined,
  title: string,
  pageWidth: number,
  margin: number
) {
  // Logo pequeño
  if (agent?.watermark_logo) {
    try {
      const logo = await loadImage(agent.watermark_logo);
      const logoHeight = 12;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      pdf.addImage(logo, 'PNG', margin, 12, logoWidth, logoHeight);
    } catch (err) {
      console.error('Error loading header logo:', err);
    }
  }

  // Título de la página
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
  const titleWidth = pdf.getTextWidth(title);
  pdf.text(title, pageWidth - margin - titleWidth, 18);

  // Línea decorativa
  pdf.setDrawColor(hexToRgb(COLORS.gold).r, hexToRgb(COLORS.gold).g, hexToRgb(COLORS.gold).b);
  pdf.setLineWidth(1);
  pdf.line(margin, 28, pageWidth - margin, 28);
}

async function addPageFooter(
  pdf: jsPDF,
  agent: AgentInfo | undefined,
  pageWidth: number,
  pageHeight: number
) {
  const footerY = pageHeight - 12;
  
  // Línea superior
  pdf.setDrawColor(hexToRgb(COLORS.border).r, hexToRgb(COLORS.border).g, hexToRgb(COLORS.border).b);
  pdf.setLineWidth(0.3);
  pdf.line(20, footerY - 5, pageWidth - 20, footerY - 5);

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(hexToRgb(COLORS.textMuted).r, hexToRgb(COLORS.textMuted).g, hexToRgb(COLORS.textMuted).b);

  if (agent) {
    const agentName = agent.full_name || agent.name || '';
    const contactParts = [];
    
    if (agentName) contactParts.push(agentName);
    if (agent.phone) contactParts.push(`${agent.phone}`);
    if (agent.email) contactParts.push(agent.email);
    
    const contactInfo = contactParts.join('  •  ');
    const textWidth = pdf.getTextWidth(contactInfo);
    pdf.text(contactInfo, pageWidth / 2 - textWidth / 2, footerY);
  } else {
    const text = 'Powered by Flow Estate AI';
    const textWidth = pdf.getTextWidth(text);
    pdf.text(text, pageWidth / 2 - textWidth / 2, footerY);
  }
}

// ============================================
// FUNCIONES DE CARGA DE DATOS
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
    console.log('✅ Definiciones de campos personalizados cargadas:', data.fields);
    return data.fields || [];
  } catch (error) {
    console.error('Error al cargar definiciones de campos:', error);
    return [];
  }
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