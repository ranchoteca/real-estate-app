import jsPDF from 'jspdf';

// Colores de Flow Estate AI
const COLORS = {
  primary: '#2563eb',
  secondary: '#1e40af',
  accent: '#3b82f6',
  success: '#22c55e',
  text: '#1f2937',
  textLight: '#6b7280',
  border: '#e5e7eb',
  background: '#f9fafb',
  sectionBg: '#eff6ff', // Fondo azul claro para secciones
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

  // Log para debug
  console.log('🔍 Exportando PDF con agente:', agent);
  console.log('🔍 Campos personalizados:', property.custom_fields_data);

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
      pdf.setGState(new pdf.GState({ opacity: 0.5 }));
      pdf.rect(0, 0, imgWidth, imgHeight, 'F');
      pdf.setGState(new pdf.GState({ opacity: 1 }));
    } catch (err) {
      console.error('Error loading cover image:', err);
    }
  }

  // Logo en el encabezado
  await addHeaderLogo(pdf, agent, margin, 10);

  // Badge de estado (Venta/Alquiler)
  const badgeY = pageHeight * 0.48;
  if (property.listing_type) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    
    const badgeText = property.listing_type === 'sale' ? '💰 EN VENTA' : '🏠 EN ALQUILER';
    const badgeColor = property.listing_type === 'sale' ? COLORS.success : COLORS.accent;
    
    // Fondo del badge con sombra
    pdf.setFillColor(hexToRgb(badgeColor).r, hexToRgb(badgeColor).g, hexToRgb(badgeColor).b);
    pdf.roundedRect(margin, badgeY - 6, 50, 9, 2, 2, 'F');
    
    // Texto del badge
    pdf.setTextColor(255, 255, 255);
    pdf.text(badgeText, margin + 3, badgeY);
  }

  // Título (en blanco sobre la imagen)
  const titleY = pageHeight * 0.53;
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  const title = property.title.toUpperCase();
  const splitTitle = pdf.splitTextToSize(title, pageWidth - (margin * 2));
  let currentY = titleY;
  for (let index = 0; index < Math.min(splitTitle.length, 2); index++) {
    pdf.text(splitTitle[index], margin, currentY);
    currentY += 9;
  }

  // Precio (grande y destacado)
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  const price = property.price 
    ? `$${property.price.toLocaleString()}`
    : 'Precio a consultar';
  pdf.text(price, margin, currentY + 12);

  // Información del agente (parte inferior con fondo elegante)
  const footerY = pageHeight - 45;
  await addAgentInfoBox(pdf, agent, margin, footerY, pageWidth);

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

  // Título de la sección con fondo
  addSectionTitle(pdf, '📸 GALERÍA DE IMÁGENES', margin, 28, contentWidth(pageWidth, margin));

  // Grid 2x3 de imágenes
  const imageSize = (pageWidth - (margin * 3)) / 2;
  const spacing = 5;
  let xPos = margin;
  let yPos = 45;
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

      // Dibujar imagen con borde elegante
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

  let yPos = 33;

  // Tipo de Propiedad con fondo
  if (property.property_type) {
    yPos = addSectionTitle(pdf, '🏠 TIPO DE PROPIEDAD', margin, yPos, contentWidth);
    
    const propertyTypes: { [key: string]: string } = {
      'house': 'Casa',
      'condo': 'Condominio',
      'apartment': 'Apartamento',
      'land': 'Terreno',
      'commercial': 'Comercial'
    };

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
    const propertyTypeText = propertyTypes[property.property_type] || property.property_type;
    pdf.text(propertyTypeText, margin + 5, yPos);
    yPos += 18;
  }

  // Características principales con fondo
  yPos = addSectionTitle(pdf, '✨ CARACTERÍSTICAS PRINCIPALES', margin, yPos, contentWidth);
  
  const mainFeatures = [
    { value: property.bedrooms, label: 'Habitaciones', icon: '🛏️' },
    { value: property.bathrooms, label: 'Baños', icon: '🚿' },
    { value: property.sqft, label: 'ft²', icon: '📐' },
  ].filter(f => f.value > 0);

  if (mainFeatures.length > 0) {
    const boxWidth = (contentWidth - 10) / mainFeatures.length;
    let xPos = margin;

    mainFeatures.forEach(feature => {
      // Caja con borde y fondo
      pdf.setDrawColor(hexToRgb(COLORS.border).r, hexToRgb(COLORS.border).g, hexToRgb(COLORS.border).b);
      pdf.setFillColor(hexToRgb(COLORS.background).r, hexToRgb(COLORS.background).g, hexToRgb(COLORS.background).b);
      pdf.roundedRect(xPos, yPos, boxWidth - 5, 28, 3, 3, 'FD');

      // Icono
      pdf.setFontSize(18);
      const iconWidth = pdf.getTextWidth(feature.icon);
      pdf.text(feature.icon, xPos + (boxWidth - 5) / 2 - iconWidth / 2, yPos + 10);

      // Valor
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
      const valueText = feature.value.toLocaleString();
      const valueWidth = pdf.getTextWidth(valueText);
      pdf.text(valueText, xPos + (boxWidth - 5) / 2 - valueWidth / 2, yPos + 17);

      // Label
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);
      const labelWidth = pdf.getTextWidth(feature.label);
      pdf.text(feature.label, xPos + (boxWidth - 5) / 2 - labelWidth / 2, yPos + 23);

      xPos += boxWidth;
    });

    yPos += 38;
  }

  // Campos personalizados (SIN título "Detalles adicionales")
  if (property.custom_fields_data && Object.keys(property.custom_fields_data).length > 0) {
    // Agregar separador visual
    pdf.setDrawColor(hexToRgb(COLORS.border).r, hexToRgb(COLORS.border).g, hexToRgb(COLORS.border).b);
    pdf.setLineWidth(0.3);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;

    // Cargar los campos personalizados del agente para obtener los nombres reales
    const customFieldsDefinitions = await loadCustomFieldsDefinitions(
      property.agent_id,
      property.property_type,
      property.listing_type
    );

    console.log('📋 Definiciones de campos:', customFieldsDefinitions);

    // Renderizar campos personalizados en grid de 2 columnas
    const entries = Object.entries(property.custom_fields_data);
    const columnWidth = (contentWidth - 10) / 2;
    
    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i];
      
      if (!value) continue;

      // Buscar la definición del campo
      const fieldDef = customFieldsDefinitions.find((f: any) => f.field_key === key);
      const fieldName = fieldDef?.field_name || key;
      const fieldIcon = fieldDef?.icon || '📌';

      // Verificar si necesitamos nueva página
      if (yPos > pageHeight - 50) {
        pdf.addPage();
        await addHeaderLogo(pdf, agent, margin, 10);
        yPos = 35;
      }

      // Posición en columna (izquierda o derecha)
      const isLeftColumn = i % 2 === 0;
      const xPos = isLeftColumn ? margin : margin + columnWidth + 5;

      // Caja del campo con fondo
      pdf.setFillColor(hexToRgb(COLORS.sectionBg).r, hexToRgb(COLORS.sectionBg).g, hexToRgb(COLORS.sectionBg).b);
      pdf.setDrawColor(hexToRgb(COLORS.border).r, hexToRgb(COLORS.border).g, hexToRgb(COLORS.border).b);
      pdf.roundedRect(xPos, yPos - 4, columnWidth - 2, 12, 2, 2, 'FD');

      // Icono más grande y visible
      pdf.setFontSize(12);
      pdf.text(fieldIcon, xPos + 3, yPos + 3);

      // Nombre del campo
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
      const displayText = `${fieldName}:`;
      pdf.text(displayText, xPos + 10, yPos + 3);

      // Valor del campo
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);
      const valueText = String(value);
      const maxValueWidth = columnWidth - 15;
      const splitValue = pdf.splitTextToSize(valueText, maxValueWidth);
      
      // Solo mostrar la primera línea del valor para mantener el diseño compacto
      if (splitValue.length > 0) {
        const valueX = xPos + 10 + pdf.getTextWidth(displayText) + 2;
        pdf.text(splitValue[0], valueX, yPos + 3);
      }

      // Avanzar a la siguiente fila después de 2 columnas
      if (!isLeftColumn || i === entries.length - 1) {
        yPos += 15;
      }
    }

    yPos += 5;
  }

  // Ubicación con icono
  const locationParts = [
    property.address,
    property.city,
    property.state,
    property.zip_code
  ].filter(Boolean);

  if (locationParts.length > 0) {
    if (yPos > pageHeight - 60) {
      pdf.addPage();
      await addHeaderLogo(pdf, agent, margin, 10);
      yPos = 35;
    }

    yPos = addSectionTitle(pdf, '📍 UBICACIÓN', margin, yPos, contentWidth);
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
    const location = locationParts.join(', ');
    const splitLocation = pdf.splitTextToSize(location, contentWidth - 5);
    splitLocation.forEach((line: string) => {
      pdf.text(line, margin + 5, yPos);
      yPos += 6;
    });
    yPos += 12;
  }

  // QR Code con diseño mejorado
  if (yPos < pageHeight - 70) {
    yPos = addSectionTitle(pdf, '📱 VER EN LÍNEA', margin, yPos, contentWidth);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);
    pdf.text('Escanea este código QR para ver más información:', margin + 5, yPos);
    yPos += 8;

    const propertyUrl = `${window.location.origin}/p/${property.slug}`;
    const qrSize = 45;
    
    try {
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(propertyUrl)}`;
      const qrImg = await loadImage(qrCodeUrl);
      
      // Fondo blanco con borde para el QR
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(hexToRgb(COLORS.border).r, hexToRgb(COLORS.border).g, hexToRgb(COLORS.border).b);
      pdf.roundedRect(margin + 3, yPos - 2, qrSize + 4, qrSize + 4, 2, 2, 'FD');
      
      pdf.addImage(qrImg, 'PNG', margin + 5, yPos, qrSize, qrSize);
    } catch (err) {
      console.error('Error generando QR:', err);
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

  let yPos = 33;

  // Título de sección con fondo
  yPos = addSectionTitle(pdf, '📝 DESCRIPCIÓN DE LA PROPIEDAD', margin, yPos, contentWidth);

  // Descripción con formato mejorado
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
  
  const splitDescription = pdf.splitTextToSize(property.description, contentWidth - 5);
  for (const line of splitDescription) {
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      await addHeaderLogo(pdf, agent, margin, 10);
      yPos = 35;
    }
    pdf.text(line, margin + 5, yPos);
    yPos += 6;
  }

  await addFooter(pdf, agent, pageWidth, pageHeight);
  await addWatermark(pdf, agent, pageWidth, pageHeight);
}

// ============================================
// COMPONENTES REUTILIZABLES
// ============================================

function addSectionTitle(pdf: jsPDF, title: string, margin: number, yPos: number, contentWidth: number): number {
  // Fondo de la sección
  pdf.setFillColor(hexToRgb(COLORS.sectionBg).r, hexToRgb(COLORS.sectionBg).g, hexToRgb(COLORS.sectionBg).b);
  pdf.roundedRect(margin, yPos - 6, contentWidth, 12, 2, 2, 'F');
  
  // Texto del título
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
  pdf.text(title, margin + 5, yPos + 2);
  
  return yPos + 16;
}

function contentWidth(pageWidth: number, margin: number): number {
  return pageWidth - (margin * 2);
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
      const logoHeight = 15;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      pdf.addImage(logo, 'PNG', margin, yPos, logoWidth, logoHeight);
    } catch (err) {
      console.error('Error cargando logo:', err);
      // Si falla, usar texto
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
      pdf.text('Flow Estate AI', margin, yPos + 10);
    }
  } else {
    // Texto por defecto
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
    pdf.text('Flow Estate AI', margin, yPos + 10);
  }
}

async function addFooter(
  pdf: jsPDF,
  agent: AgentInfo | undefined,
  pageWidth: number,
  pageHeight: number
) {
  const footerY = pageHeight - 15;
  
  // Línea superior decorativa
  pdf.setDrawColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
  pdf.setLineWidth(0.5);
  pdf.line(20, footerY - 5, pageWidth - 20, footerY - 5);

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);

  if (agent) {
    const agentName = agent.full_name || agent.name || '';
    const parts = [];
    
    if (agentName) parts.push(agentName);
    if (agent.phone) parts.push(`📱 ${agent.phone}`);
    if (agent.email) parts.push(`✉️ ${agent.email}`);
    
    const contactInfo = parts.join('  •  ');
    const textWidth = pdf.getTextWidth(contactInfo);
    pdf.text(contactInfo, pageWidth / 2 - textWidth / 2, footerY);
    
    // Brokerage en segunda línea si existe
    if (agent.brokerage) {
      pdf.setFontSize(7);
      const brokerageText = agent.brokerage;
      const brokerageWidth = pdf.getTextWidth(brokerageText);
      pdf.text(brokerageText, pageWidth / 2 - brokerageWidth / 2, footerY + 4);
    }
  } else {
    const text = 'Generado por Flow Estate AI';
    const textWidth = pdf.getTextWidth(text);
    pdf.text(text, pageWidth / 2 - textWidth / 2, footerY);
  }
}

async function addAgentInfoBox(
  pdf: jsPDF,
  agent: AgentInfo | undefined,
  margin: number,
  yPos: number,
  pageWidth: number
) {
  if (!agent) return;

  const boxHeight = 35;
  const boxWidth = pageWidth - (margin * 2);

  // Caja con fondo blanco semi-transparente y borde elegante
  pdf.setFillColor(255, 255, 255);
  pdf.setGState(new pdf.GState({ opacity: 0.95 }));
  pdf.roundedRect(margin, yPos, boxWidth, boxHeight, 4, 4, 'F');
  pdf.setGState(new pdf.GState({ opacity: 1 }));
  
  // Borde decorativo
  pdf.setDrawColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
  pdf.setLineWidth(0.8);
  pdf.roundedRect(margin, yPos, boxWidth, boxHeight, 4, 4, 'D');

  // Badge "Agente Inmobiliario"
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(hexToRgb(COLORS.primary).r, hexToRgb(COLORS.primary).g, hexToRgb(COLORS.primary).b);
  pdf.text('👤 AGENTE INMOBILIARIO', margin + 6, yPos + 8);

  // Nombre del agente (más grande y destacado)
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
  const agentName = agent.full_name || agent.name || 'Agente';
  pdf.text(agentName, margin + 6, yPos + 17);

  // Información de contacto con iconos
  let contactY = yPos + 24;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);
  
  const contactInfo = [];
  if (agent.phone) contactInfo.push(`📱 ${agent.phone}`);
  if (agent.email) contactInfo.push(`✉️ ${agent.email}`);
  
  if (contactInfo.length > 0) {
    pdf.text(contactInfo.join('  •  '), margin + 6, contactY);
  }

  // Brokerage (si existe)
  if (agent.brokerage) {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.text(agent.brokerage, margin + 6, yPos + 30);
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
      console.error('Error cargando watermark:', err);
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
// CARGAR DEFINICIONES DE CAMPOS PERSONALIZADOS
// ============================================

async function loadCustomFieldsDefinitions(
  agentId: string,
  propertyType: string,
  listingType: string
): Promise<any[]> {
  try {
    // Construir la URL con los parámetros necesarios
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