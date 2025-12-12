import jsPDF from 'jspdf';

// Paleta de colores - Dorado y neutros
const COLORS = {
  gold: '#eab308',           // Amarillo dorado principal
  goldDark: '#ca8a04',       // Amarillo oscuro
  text: '#1f2937',           // Texto principal (gris oscuro)
  textLight: '#6b7280',      // Gris medio
  textMuted: '#9ca3af',      // Gris claro
  border: '#e5e7eb',         // Borde claro
  background: '#f9fafb',     // Fondo muy claro
  white: '#ffffff',
  black: '#000000',
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

export async function exportPropertyToPDF(property: any, agentParam?: AgentInfo, customFieldsDefinitions?: any[], propertyLanguage?: 'es' | 'en') {
  console.log('🚀 Iniciando exportación de PDF...');
  console.log('📦 Propiedad:', property.title);
  console.log('👤 Agente (parámetro):', agentParam);

  // Cargar información del agente desde la API
  let agent: AgentInfo | undefined = agentParam || property.agent;

  // Detectar idioma de la propiedad
  const lang = propertyLanguage || property.language || 'es';
  console.log('🌐 Idioma del PDF:', lang);

  console.log('✅ Usando agente desde parámetros/propiedad');

  console.log('📋 Agente final a usar:', {
    nombre: agent?.full_name || agent?.name || 'NO DISPONIBLE',
    email: agent?.email || 'NO DISPONIBLE',
    phone: agent?.phone || 'NO DISPONIBLE',
    brokerage: agent?.brokerage || 'NO DISPONIBLE',
  });

  // Traducciones
  const translations = {
    es: {
      forSale: 'EN VENTA',
      forRent: 'EN ALQUILER',
      priceOnRequest: 'Precio a consultar',
      bedrooms: 'Habitaciones',
      bathrooms: 'Baños',
      sqft: 'pies²',
      propertyType: 'TIPO DE PROPIEDAD:',
      realEstateAgent: 'AGENTE INMOBILIARIO',
      poweredBy: 'Powered by Flow Estate AI',
      propertyFeatures: 'CARACTERÍSTICAS DE LA PROPIEDAD',
      description: 'DESCRIPCIÓN',
      location: 'UBICACIÓN',
      scanToView: 'Escanear para ver',
      photoGallery: 'GALERÍA DE FOTOS',
      tel: 'Tel',
      email: 'Email',
    },
    en: {
      forSale: 'FOR SALE',
      forRent: 'FOR RENT',
      priceOnRequest: 'Price upon request',
      bedrooms: 'Bedrooms',
      bathrooms: 'Bathrooms',
      sqft: 'sqft',
      propertyType: 'PROPERTY TYPE:',
      realEstateAgent: 'REAL ESTATE AGENT',
      poweredBy: 'Powered by Flow Estate AI',
      propertyFeatures: 'PROPERTY FEATURES',
      description: 'DESCRIPTION',
      location: 'LOCATION',
      scanToView: 'Scan to view',
      photoGallery: 'PHOTO GALLERY',
      tel: 'Tel',
      email: 'Email',
    }
  };

  const t = translations[lang as keyof typeof translations];

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;

  // PÁGINA 1: PORTADA
  await createCompactCoverPage(pdf, property, agent, pageWidth, pageHeight, margin, t, lang);

  // PÁGINA 2: DETALLES Y DESCRIPCIÓN
  pdf.addPage();
  await createCompactDetailsPage(pdf, property, agent, pageWidth, pageHeight, margin, customFieldsDefinitions, t);

  // PÁGINA 3: GALERÍA DE FOTOS (1 portada + 6 galería = 7 total)
  if (property.photos && property.photos.length > 1) {
    pdf.addPage();
    await createCompactGalleryPage(pdf, property, agent, pageWidth, pageHeight, margin, t);
  }

  // Guardar PDF
  const fileName = `${property.title.replace(/[^a-z0-9]/gi, '_')}_Detalles.pdf`;

  // Detectar si está en navegador in-app
  const isInAppBrowser = () => {
    const ua = navigator.userAgent || navigator.vendor;
    return (
      ua.indexOf('FBAN') > -1 || 
      ua.indexOf('FBAV') > -1 || 
      ua.indexOf('Instagram') > -1 || 
      ua.indexOf('WhatsApp') > -1 ||
      ua.indexOf('FB_IAB') > -1 ||
      ua.indexOf('FBIOS') > -1
    );
  };

  // Manejo especial para navegadores in-app
  if (isInAppBrowser()) {
    console.log('⚠️ Detectado navegador in-app, mostrando instrucciones');
    
    // Mostrar modal con instrucciones
    const modal = document.createElement('div');
    modal.innerHTML = `
      <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div style="background:white;border-radius:16px;padding:32px;max-width:420px;text-align:center;">
          <div style="font-size:48px;margin-bottom:16px;">📱</div>
          <h2 style="margin:0 0 12px;font-size:22px;color:#1f2937;font-weight:700;">Para descargar el PDF</h2>
          
          <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:20px 0;text-align:left;">
            <p style="margin:0 0 12px;font-size:15px;color:#1f2937;font-weight:600;">Sigue estos pasos:</p>
            <ol style="margin:0;padding-left:20px;color:#6b7280;font-size:14px;line-height:1.8;">
              <li>Toca el menú (⋯) en la parte superior</li>
              <li>Selecciona <strong style="color:#1f2937;">"Abrir en navegador externo"</strong></li>
              <li>Elige el navegador que prefieras usar</li>
              <li>La página se cargará nuevamente en ese navegador</li>
              <li>Ve al botón <strong style="color:#1f2937;">"Descargar PDF"</strong> y da clic</li>
              <li>¡La descarga iniciará exitosamente! ✅</li>
            </ol>
          </div>

          <button onclick="this.parentElement.parentElement.remove()" style="background:#eab308;color:white;border:none;border-radius:8px;padding:14px 28px;font-size:16px;font-weight:600;width:100%;cursor:pointer;">
            Entendido
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    return; // Detener ejecución
  }

  // Descarga normal para navegadores estándar
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
  margin: number,
  t: any,
  lang: 'es' | 'en'
) {
  // Imagen principal (2/3 superior de la página)
  const imageHeight = pageHeight * 0.65;
  
  if (property.photos && property.photos.length > 0) {
    try {
      const img = await loadImage(property.photos[0]);
      pdf.addImage(img, 'JPEG', 0, 0, pageWidth, imageHeight);
      
      // Overlay oscuro degradado
      pdf.setFillColor(0, 0, 0);
      pdf.setGState(new (pdf as any).GState({ opacity: 0.5 }));
      pdf.rect(0, imageHeight - 80, pageWidth, 80, 'F');
      pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
    } catch (err) {
      console.error('Error loading cover image:', err);
      // Fondo oscuro de respaldo
      pdf.setFillColor(31, 41, 55);
      pdf.rect(0, 0, pageWidth, imageHeight, 'F');
    }
  }

  const hasCustomLogo = agent?.watermark_logo && agent.watermark_logo.trim() !== '';

  if (!hasCustomLogo) {
    console.log('📝 Mostrando "Flow Estate AI" porque NO hay watermark_logo personalizado');
    console.log('📝 watermark_logo value:', agent?.watermark_logo);
    
    // Texto "Flow Estate AI" como logo
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    
    const textWidth = pdf.getTextWidth('FLOW ESTATE AI');
    pdf.setFillColor(31, 41, 55);
    pdf.setGState(new (pdf as any).GState({ opacity: 0.8 }));
    pdf.roundedRect(margin - 2, margin - 2, textWidth + 4, 10, 2, 2, 'F');
    pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
    
    pdf.text('FLOW ESTATE AI', margin, margin + 6);
  } else {
    console.log('✅ Agente tiene logo personalizado, NO se muestra nada en la esquina');
    console.log('✅ Logo URL:', agent.watermark_logo);
    console.log('✅ La foto de portada ya tiene la marca de agua aplicada');
  }

  // Badge de estado (arriba derecha)
  if (property.listing_type) {
    const badgeText = property.listing_type === 'sale' ? t.forSale : t.forRent;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    const textWidth = pdf.getTextWidth(badgeText);
    
    pdf.setFillColor(hexToRgb(COLORS.gold).r, hexToRgb(COLORS.gold).g, hexToRgb(COLORS.gold).b);
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
    : t.priceOnRequest;
  pdf.text(price, margin, overlayY + 8);

  // Features principales
  const features = [
    { value: property.bedrooms, label: t.bedrooms, show: property.bedrooms > 0 },
    { value: property.bathrooms, label: t.bathrooms, show: property.bathrooms > 0 },
    { value: property.sqft ? `${property.sqft.toLocaleString()}` : null, label: t.sqft, show: property.sqft > 0 },
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
    pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
    pdf.text(t.propertyType, margin, bottomY);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);
    const propertyTypeName = getPropertyTypeName(property.property_type, lang);
    pdf.text(propertyTypeName, margin + 48, bottomY);
    
    bottomY += 10;
  }

  console.log('🔍 Verificando información del agente para mostrar:');
  console.log('- full_name:', agent?.full_name);
  console.log('- name:', agent?.name);
  console.log('- email:', agent?.email);
  console.log('- phone:', agent?.phone);
  console.log('- brokerage:', agent?.brokerage);

  // Información del AGENTE (MÁS GRANDE)
  if (agent && (agent.full_name || agent.name || agent.email || agent.phone)) {
    console.log('📝 Renderizando información del agente en portada...');
    
    // Caja de agente con borde dorado
    const agentBoxHeight = 35;
    pdf.setFillColor(hexToRgb(COLORS.background).r, hexToRgb(COLORS.background).g, hexToRgb(COLORS.background).b);
    pdf.setDrawColor(hexToRgb(COLORS.gold).r, hexToRgb(COLORS.gold).g, hexToRgb(COLORS.gold).b);
    pdf.setLineWidth(1);
    pdf.roundedRect(margin, bottomY, pageWidth - (margin * 2), agentBoxHeight, 3, 3, 'FD');

    bottomY += 8;

    // Label "AGENTE INMOBILIARIO" en dorado
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(hexToRgb(COLORS.gold).r, hexToRgb(COLORS.gold).g, hexToRgb(COLORS.gold).b);
    pdf.text(t.realEstateAgent, margin + 5, bottomY);
    
    bottomY += 7;

    // Nombre del agente (MÁS GRANDE)
    const agentName = agent.full_name || agent.name || 'Agente Inmobiliario';
    pdf.setFontSize(15);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
    pdf.text(agentName, margin + 5, bottomY);
    
    bottomY += 7;

    // Información de contacto (MÁS GRANDE)
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);
    
    const contactParts = [];
    if (agent.phone) contactParts.push(`${t.tel}: ${agent.phone}`);
    if (agent.email) contactParts.push(`${t.email}: ${agent.email}`);
    
    if (contactParts.length > 0) {
      const contactText = contactParts.join('  |  ');
      pdf.text(contactText, margin + 5, bottomY);
      bottomY += 6;
    }

    // Brokerage
    if (agent.brokerage) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(hexToRgb(COLORS.textMuted).r, hexToRgb(COLORS.textMuted).g, hexToRgb(COLORS.textMuted).b);
      pdf.text(agent.brokerage, margin + 5, bottomY);
    }
  } else {
    console.warn('⚠️ NO hay información completa del agente para mostrar');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(hexToRgb(COLORS.textMuted).r, hexToRgb(COLORS.textMuted).g, hexToRgb(COLORS.textMuted).b);
    pdf.text(t.poweredBy, margin, bottomY);
  }
}

// ============================================
// PÁGINA 2: DETALLES COMPACTOS
// ============================================
async function createCompactDetailsPage(
  pdf: jsPDF,
  property: any,
  agent: AgentInfo | undefined,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  customFieldsDefinitions?: any[],
  t?: any
) {
  await addCompactHeader(pdf, agent, margin, pageWidth);

  let yPos = 35;
  const contentWidth = pageWidth - (margin * 2);
  const columnWidth = (contentWidth - 8) / 2;

  // TÍTULO: CARACTERÍSTICAS DE LA PROPIEDAD
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
  pdf.text(t.propertyFeatures, margin, yPos);
  
  // Línea dorada
  pdf.setDrawColor(hexToRgb(COLORS.gold).r, hexToRgb(COLORS.gold).g, hexToRgb(COLORS.gold).b);
  pdf.setLineWidth(1.5);
  pdf.line(margin, yPos + 2, margin + 80, yPos + 2);
  
  yPos += 12;

  // Campos personalizados en 2 columnas (CON ESPACIADO Y MÁS GRANDES)
  if (property.custom_fields_data && Object.keys(property.custom_fields_data).length > 0) {
    // Usar campos personalizados pasados como parámetro
    const fieldsToUse = customFieldsDefinitions || [];
    console.log('📋 Campos personalizados disponibles:', fieldsToUse.length);

    const entries = Object.entries(property.custom_fields_data).filter(([_, value]) => value);
    
    for (let i = 0; i < entries.length; i++) {
      const [key, value] = entries[i];
      const fieldDef = fieldsToUse.find((f: any) => f.field_key === key);
      const fieldName = fieldDef?.field_name || key;

      console.log(`🔍 Campo: ${key} -> Nombre: ${fieldName} (def encontrada: ${!!fieldDef})`);

      const isLeftColumn = i % 2 === 0;
      const xPos = isLeftColumn ? margin : margin + columnWidth + 4;

      // Fondo sutil
      pdf.setFillColor(hexToRgb(COLORS.background).r, hexToRgb(COLORS.background).g, hexToRgb(COLORS.background).b);
      pdf.roundedRect(xPos, yPos - 3, columnWidth, 11, 1, 1, 'F');

      // Nombre del campo (MÁS GRANDE Y BOLD)
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
      const fieldLabel = fieldName + ':';
      pdf.text(fieldLabel, xPos + 3, yPos + 3);

      // Valor (CON ESPACIADO ADECUADO)
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);
      const valueText = String(value);
      const labelWidth = pdf.getTextWidth(fieldLabel);
      const maxWidth = columnWidth - labelWidth - 10; // Más espacio
      const splitValue = pdf.splitTextToSize(valueText, maxWidth);
      const valueX = xPos + labelWidth + 5; // +5 para separación
      pdf.text(splitValue[0], valueX, yPos + 3);

      if (!isLeftColumn || i === entries.length - 1) {
        yPos += 13;
      }
    }

    yPos += 5;
  }

  // DESCRIPCIÓN (TEXTO MÁS GRANDE)
  if (property.description && yPos < pageHeight - 80) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
    pdf.text(t.description, margin, yPos);
    
    pdf.setDrawColor(hexToRgb(COLORS.gold).r, hexToRgb(COLORS.gold).g, hexToRgb(COLORS.gold).b);
    pdf.setLineWidth(1.5);
    pdf.line(margin, yPos + 2, margin + 40, yPos + 2);
    
    yPos += 10;

    // Descripción con texto más grande
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);
    
    const maxLines = Math.floor((pageHeight - yPos - 60) / 6);
    const splitDescription = pdf.splitTextToSize(property.description, contentWidth);
    
    for (let i = 0; i < Math.min(splitDescription.length, maxLines); i++) {
      pdf.text(splitDescription[i], margin, yPos);
      yPos += 6;
    }

    yPos += 8;
  }

  // UBICACIÓN (TEXTO MÁS GRANDE) + QR CODE
  if (yPos < pageHeight - 60) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
    pdf.text(t.location, margin, yPos);
    
    pdf.setDrawColor(hexToRgb(COLORS.gold).r, hexToRgb(COLORS.gold).g, hexToRgb(COLORS.gold).b);
    pdf.setLineWidth(1.5);
    pdf.line(margin, yPos + 2, margin + 32, yPos + 2);
    
    yPos += 10;

    // Dirección con texto más grande
    const locationParts = [
      property.address,
      property.city,
      property.state,
      property.zip_code
    ].filter(Boolean);

    if (locationParts.length > 0) {
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(hexToRgb(COLORS.textLight).r, hexToRgb(COLORS.textLight).g, hexToRgb(COLORS.textLight).b);
      
      const location = locationParts.join(', ');
      const splitLocation = pdf.splitTextToSize(location, contentWidth - 50);
      
      let locY = yPos;
      splitLocation.forEach((line: string) => {
        pdf.text(line, margin, locY);
        locY += 6;
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
      
      // Texto debajo del QR (MÁS GRANDE Y OSCURO)
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
      const qrText = t.scanToView;
      const qrTextWidth = pdf.getTextWidth(qrText);
      pdf.text(qrText, qrX + (qrSize - qrTextWidth) / 2, yPos + qrSize + 5);
    } catch (err) {
      console.error('Error generando QR:', err);
    }
  }

  // Footer con texto más grande
  await addCompactFooter(pdf, agent, pageWidth, pageHeight, t);
}

// ============================================
// PÁGINA 3: GALERÍA (6 FOTOS + 1 PORTADA = 7 TOTAL)
// ============================================
async function createCompactGalleryPage(
  pdf: jsPDF,
  property: any,
  agent: AgentInfo | undefined,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  t: any
) {
  await addCompactHeader(pdf, agent, margin, pageWidth);

  let yPos = 35;

  // TÍTULO
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
  pdf.text(t.photoGallery, margin, yPos);
  
  pdf.setDrawColor(hexToRgb(COLORS.gold).r, hexToRgb(COLORS.gold).g, hexToRgb(COLORS.gold).b);
  pdf.setLineWidth(1.5);
  pdf.line(margin, yPos + 2, margin + 52, yPos + 2);
  
  yPos += 12;

  // Grid de fotos 2x3 (6 fotos de la galería)
  // Si hay 10 fotos total: [0]=portada, [1,2,3,4,5,6]=galería
  const totalPhotos = property.photos.length;
  console.log(`📸 Total de fotos disponibles: ${totalPhotos}`);
  
  // Tomar hasta 6 fotos para la galería (índices 1 al 6)
  const photos = property.photos.slice(1, 7);
  console.log(`📸 Fotos en galería: ${photos.length}`, photos);
  
  const spacing = 4;
  const contentHeight = pageHeight - yPos - 30; // Espacio disponible
  const imageSize = Math.min(
    (pageWidth - (margin * 2) - spacing) / 2, // Ancho: 2 columnas
    (contentHeight - (spacing * 2)) / 3 // Alto: 3 filas
  );
  
  let xPos = margin;
  let count = 0;

  for (const photoUrl of photos) {
    if (count >= 6) {
      console.log('⚠️ Límite de 6 fotos alcanzado en galería');
      break;
    }

    try {
      console.log(`🖼️ Cargando foto ${count + 1}:`, photoUrl);
      const img = await loadImage(photoUrl);
      
      if (count > 0 && count % 2 === 0) {
        xPos = margin;
        yPos += imageSize + spacing;
      }

      if (yPos + imageSize > pageHeight - 30) {
        console.log('⚠️ No hay más espacio en la página');
        break;
      }

      // Imagen con borde
      pdf.addImage(img, 'JPEG', xPos, yPos, imageSize, imageSize);
      pdf.setDrawColor(hexToRgb(COLORS.border).r, hexToRgb(COLORS.border).g, hexToRgb(COLORS.border).b);
      pdf.setLineWidth(0.5);
      pdf.rect(xPos, yPos, imageSize, imageSize);

      xPos += imageSize + spacing;
      count++;
      console.log(`✅ Foto ${count} cargada exitosamente`);
    } catch (err) {
      console.error(`❌ Error loading gallery image ${count + 1}:`, err, photoUrl);
    }
  }
  
  console.log(`✅ Total de fotos cargadas en galería: ${count}`);

  await addCompactFooter(pdf, agent, pageWidth, pageHeight, t);
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
      pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
      pdf.text('FLOW ESTATE AI', margin, 18);
    }
  } else {
    // Texto por defecto
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(hexToRgb(COLORS.text).r, hexToRgb(COLORS.text).g, hexToRgb(COLORS.text).b);
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
  pageHeight: number,
  t?: any
) {
  const footerY = pageHeight - 10;
  
  pdf.setDrawColor(hexToRgb(COLORS.border).r, hexToRgb(COLORS.border).g, hexToRgb(COLORS.border).b);
  pdf.setLineWidth(0.3);
  pdf.line(15, footerY - 4, pageWidth - 15, footerY - 4);

  // Footer con texto más grande
  pdf.setFontSize(9);
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
    const text = t?.poweredBy || 'Powered by Flow Estate AI';
    const textWidth = pdf.getTextWidth(text);
    pdf.text(text, pageWidth / 2 - textWidth / 2, footerY);
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

function getPropertyTypeName(type: string, lang: 'es' | 'en' = 'es'): string {
  const types: { [key: string]: { es: string; en: string } } = {
    'house': { es: 'Casa', en: 'House' },
    'condo': { es: 'Condominio', en: 'Condo' },
    'apartment': { es: 'Apartamento', en: 'Apartment' },
    'land': { es: 'Terreno', en: 'Land' },
    'commercial': { es: 'Comercial', en: 'Commercial' },
  };
  return types[type]?.[lang] || type.charAt(0).toUpperCase() + type.slice(1);
}