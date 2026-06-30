//api/pdf-generator/route.tsx

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

const COLORS = {
  gold: '#eab308',
  goldDark: '#ca8a04',
  text: '#1f2937',
  textLight: '#6b7280',
  textMuted: '#9ca3af',
  border: '#e5e7eb',
  background: '#f9fafb',
  white: '#ffffff',
  black: '#000000',
};

const CURRENCY_MAP: Record<string, { symbol: string; code: string }> = {
  'ec8528a3-d504-47fa-97db-2c07716d8b47': { symbol: '₡', code: 'CRC' },
  '839f44d5-bee2-4bc1-b5da-50364f14c681': { symbol: '$', code: 'USD' }
};

const PROPERTY_TYPE_NAMES: Record<string, { es: string; en: string }> = {
  house: { es: 'Casa', en: 'House' },
  condo: { es: 'Condominio', en: 'Condo' },
  apartment: { es: 'Apartamento', en: 'Apartment' },
  land: { es: 'Terreno', en: 'Land' },
  commercial: { es: 'Comercial', en: 'Commercial' },
  hotel: { es: 'Hotel', en: 'Hotel' },
  finca: { es: 'Finca', en: 'Farm' },
  ranch: { es: 'Quinta', en: 'Ranch' },
  other: { es: 'Otros', en: 'Other' },
};

const TRANSLATIONS = {
  es: {
    forSale: 'EN VENTA',
    forRent: 'EN ALQUILER',
    priceOnRequest: 'Precio a consultar',
    bedrooms: 'Habitaciones',
    bathrooms: 'Baños',
    sqft: 'm²',
    propertyType: 'TIPO DE PROPIEDAD:',
    realEstateAgent: 'AGENTE INMOBILIARIO',
    poweredBy: 'Powered by FlowEstateAI',
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
    poweredBy: 'Powered by FlowEstateAI',
    propertyFeatures: 'PROPERTY FEATURES',
    description: 'DESCRIPTION',
    location: 'LOCATION',
    scanToView: 'Scan to view',
    photoGallery: 'PHOTO GALLERY',
    tel: 'Tel',
    email: 'Email',
  }
};

// Verifica que una URL de imagen responda correctamente antes de pasarla a
// @react-pdf/renderer. Si una imagen falla (404, dominio caído, timeout), el
// render completo del PDF se rompe -- por eso filtramos las URLs rotas de
// antemano en vez de dejar que <Image> intente cargarlas y falle a mitad de render.
async function filterValidImageUrls(urls: (string | null | undefined)[]): Promise<string[]> {
  const checks = await Promise.all(
    urls.filter(Boolean).map(async (url) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(url as string, { method: 'GET', signal: controller.signal });
        clearTimeout(timeout);
        return res.ok ? (url as string) : null;
      } catch {
        return null;
      }
    })
  );
  return checks.filter((url): url is string => !!url);
}

function getPropertyTypeName(type: string | null | undefined, lang: 'es' | 'en'): string {
  if (!type) return '';
  return PROPERTY_TYPE_NAMES[type]?.[lang] || type.charAt(0).toUpperCase() + type.slice(1);
}

function getCurrency(property: any) {
  const fromMap = CURRENCY_MAP[property.currency_id];
  if (fromMap) {
    // jsPDF usa ¢ para colones por compatibilidad de fuente; en react-pdf con
    // fuente estándar Helvetica el símbolo ₡ tampoco renderiza, así que mantenemos
    // la misma compatibilidad que la versión de la PWA.
    return fromMap.code === 'CRC' ? { symbol: '¢', code: 'CRC' } : fromMap;
  }
  return { symbol: '$', code: 'USD' };
}

// Divide un array en parejas para forzar SIEMPRE una grilla de 2 columnas,
// sin depender de que flexWrap calcule bien los porcentajes (en @react-pdf/renderer
// el wrap con anchos en % puede comportarse de forma inconsistente).
function chunkPairs<T>(items: T[]): T[][] {
  const pairs: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    pairs.push(items.slice(i, i + 2));
  }
  return pairs;
}

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', backgroundColor: COLORS.white },

  // ---- Portada ----
  coverImageWrap: { position: 'relative', width: '100%', height: 580 },
  coverImage: { width: '100%', height: 580, objectFit: 'cover' },
  coverOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 160,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  logoBadge: {
    position: 'absolute', top: 15, left: 15,
    backgroundColor: 'rgba(31,41,55,0.85)', borderRadius: 4,
    paddingVertical: 6, paddingHorizontal: 9,
  },
  logoBadgeText: { color: COLORS.white, fontSize: 12, fontFamily: 'Helvetica-Bold' },
  statusBadge: {
    position: 'absolute', top: 15, right: 15,
    backgroundColor: COLORS.gold, borderRadius: 4,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  statusBadgeText: { color: COLORS.white, fontSize: 11, fontFamily: 'Helvetica-Bold' },

  coverTextBlock: { position: 'absolute', bottom: 14, left: 15, right: 15 },
  coverTitle: { color: COLORS.white, fontSize: 25, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  coverLocation: { color: COLORS.gold, fontSize: 14, marginBottom: 6 },
  coverPrice: { color: COLORS.gold, fontSize: 30, fontFamily: 'Helvetica-Bold', marginBottom: 6 },
  coverFeaturesRow: { flexDirection: 'row', alignItems: 'center' },
  coverFeatureValue: { color: COLORS.white, fontSize: 15, fontFamily: 'Helvetica-Bold', marginRight: 3 },
  coverFeatureLabel: { color: COLORS.white, fontSize: 11, marginRight: 10 },

  goldDivider: { width: 40, height: 3, backgroundColor: COLORS.gold, marginTop: 14, marginBottom: 10, marginLeft: 15 },

  propertyTypeRow: { flexDirection: 'row', marginLeft: 15, marginBottom: 10 },
  propertyTypeLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: COLORS.text, marginRight: 6 },
  propertyTypeValue: { fontSize: 12, color: COLORS.textLight },

  agentBox: {
    marginHorizontal: 15, borderWidth: 1.5, borderColor: COLORS.gold, borderRadius: 4,
    backgroundColor: COLORS.background, padding: 10,
  },
  agentLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.gold, marginBottom: 4 },
  agentName: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: COLORS.text, marginBottom: 4 },
  agentContact: { fontSize: 12, color: COLORS.textLight, marginBottom: 2 },
  agentBrokerage: { fontSize: 11, fontFamily: 'Helvetica-Oblique', color: COLORS.textMuted },
  poweredByText: { fontSize: 12, color: COLORS.textMuted, marginLeft: 15 },

  // ---- Header compartido (páginas 2 y 3) ----
  header: { paddingHorizontal: 15, paddingTop: 14, marginBottom: 10 },
  headerLogoText: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: COLORS.text },
  headerDivider: { height: 1.5, backgroundColor: COLORS.gold, marginTop: 6 },

  // ---- Página de detalles ----
  body: { paddingHorizontal: 15 },
  sectionTitle: { fontSize: 17, fontFamily: 'Helvetica-Bold', color: COLORS.text, marginBottom: 4 },
  sectionDivider: { width: 60, height: 2.5, backgroundColor: COLORS.gold, marginBottom: 10 },

  fieldsGrid: { marginBottom: 6 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  fieldBox: {
    width: '48%', backgroundColor: COLORS.background, borderRadius: 2,
    paddingVertical: 6, paddingHorizontal: 7,
    flexDirection: 'row',
  },
  fieldBoxSpacer: { width: '48%' },
  fieldLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.text, marginRight: 4 },
  fieldValue: { fontSize: 11, color: COLORS.textLight, flexShrink: 1 },

  description: { fontSize: 12, color: COLORS.textLight, lineHeight: 1.5, marginBottom: 10 },

  locationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  locationText: { fontSize: 12, color: COLORS.textLight, lineHeight: 1.5, maxWidth: '62%' },
  qrBoxWrap: { width: 95, alignItems: 'center' },
  qrBox: {
    width: 95, height: 95, borderWidth: 0.5, borderColor: COLORS.border, borderRadius: 2,
    alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white,
  },
  qrImage: { width: 85, height: 85 },
  qrCaption: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.text, marginTop: 4, textAlign: 'center' },

  // ---- Footer compartido ----
  footer: {
    position: 'absolute', bottom: 18, left: 15, right: 15,
    borderTopWidth: 0.5, borderTopColor: COLORS.border, paddingTop: 6,
    alignItems: 'center',
  },
  footerText: { fontSize: 10, color: COLORS.textMuted },

  // ---- Galería ----
  galleryGrid: { paddingHorizontal: 15 },
  galleryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  galleryImageWrap: {
    width: '48.5%', height: 150,
    borderWidth: 0.5, borderColor: COLORS.border,
  },
  galleryImageWrapSpacer: { width: '48.5%' },
  galleryImage: { width: '100%', height: '100%', objectFit: 'cover' },
});

function CompactHeader({ validLogoUrl }: { validLogoUrl?: string | null }) {
  return (
    <View style={styles.header}>
      {validLogoUrl ? (
        <Image src={validLogoUrl} style={{ height: 18, objectFit: 'contain' }} />
      ) : (
        <Text style={styles.headerLogoText}>FLOW ESTATE AI</Text>
      )}
      <View style={styles.headerDivider} />
    </View>
  );
}

function CompactFooter({ agent, t }: { agent: any; t: any }) {
  const agentName = agent?.full_name || agent?.name;
  const parts = [agentName, agent?.phone, agent?.email].filter(Boolean);
  const text = parts.length > 0 ? parts.join('   |   ') : t.poweredBy;

  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>{text}</Text>
    </View>
  );
}

function CoverPage({ property, agent, t, lang, currency, baseDomain, coverPhoto, validLogoUrl }: any) {
  const hasCustomLogo = !!validLogoUrl;
  const badgeText = property.listing_type === 'sale' ? t.forSale : t.forRent;

  const features = [
    { value: property.bedrooms, label: t.bedrooms, show: property.bedrooms > 0 },
    { value: property.bathrooms, label: t.bathrooms, show: property.bathrooms > 0 },
    { value: property.sqft ? Number(property.sqft).toLocaleString() : null, label: t.sqft, show: property.sqft > 0 },
  ].filter(f => f.show);

  const price = property.price
    ? `${currency.symbol}${Number(property.price).toLocaleString()}`
    : t.priceOnRequest;

  const locationParts = [property.city, property.state].filter(Boolean);
  const propertyTypeName = getPropertyTypeName(property.property_type, lang);
  const hasAgentInfo = !!(agent && (agent.full_name || agent.name || agent.email || agent.phone));

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.coverImageWrap}>
        {coverPhoto ? (
          <Image src={coverPhoto} style={styles.coverImage} />
        ) : (
          <View style={{ width: '100%', height: '100%', backgroundColor: COLORS.text }} />
        )}

        <View style={styles.coverOverlay} />

        {!hasCustomLogo && (
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>FLOW ESTATE AI</Text>
          </View>
        )}

        {property.listing_type && (
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>{badgeText}</Text>
          </View>
        )}

        <View style={styles.coverTextBlock}>
          <Text style={styles.coverTitle}>{property.title?.toUpperCase()}</Text>
          {locationParts.length > 0 && (
            <Text style={styles.coverLocation}>{locationParts.join(', ')}</Text>
          )}
          <Text style={styles.coverPrice}>{price}</Text>
          {features.length > 0 && (
            <View style={styles.coverFeaturesRow}>
              {features.map((f, i) => (
                <Text key={i} style={styles.coverFeatureLabel}>
                  <Text style={styles.coverFeatureValue}>{String(f.value)}</Text>
                  {' ' + f.label}
                  {i < features.length - 1 ? '   |  ' : ''}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.goldDivider} />

      {property.property_type && (
        <View style={styles.propertyTypeRow}>
          <Text style={styles.propertyTypeLabel}>{t.propertyType}</Text>
          <Text style={styles.propertyTypeValue}>{propertyTypeName}</Text>
        </View>
      )}

      {hasAgentInfo ? (
        <View style={styles.agentBox}>
          <Text style={styles.agentLabel}>{t.realEstateAgent}</Text>
          <Text style={styles.agentName}>{agent.full_name || agent.name}</Text>
          {(agent.phone || agent.email) && (
            <Text style={styles.agentContact}>
              {[agent.phone ? `${t.tel}: ${agent.phone}` : null, agent.email ? `${t.email}: ${agent.email}` : null]
                .filter(Boolean)
                .join('   |   ')}
            </Text>
          )}
          {agent.brokerage && <Text style={styles.agentBrokerage}>{agent.brokerage}</Text>}
        </View>
      ) : (
        <Text style={styles.poweredByText}>{t.poweredBy}</Text>
      )}
    </Page>
  );
}

function DetailsPage({ property, agent, t, lang, customFieldsDefinitions, baseDomain, validLogoUrl, validQrUrl }: any) {
  const locationParts = [property.address, property.city, property.state, property.zip_code].filter(Boolean);

  const entries = property.custom_fields_data
    ? Object.entries(property.custom_fields_data).filter(([_, value]) => value !== null && value !== undefined && value !== '')
    : [];

  return (
    <Page size="A4" style={styles.page}>
      <CompactHeader validLogoUrl={validLogoUrl} />

      <View style={styles.body}>
        {entries.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{t.propertyFeatures}</Text>
            <View style={styles.sectionDivider} />
            <View style={styles.fieldsGrid}>
              {chunkPairs(entries as [string, any][]).map((pair, rowIndex) => (
                <View key={rowIndex} style={styles.fieldRow}>
                  {pair.map(([key, value]) => {
                    const fieldDef = (customFieldsDefinitions || []).find((f: any) => f.field_key === key);
                    const fieldName = (lang === 'en' && fieldDef?.field_name_en)
                      ? fieldDef.field_name_en
                      : (fieldDef?.field_name || key);
                    return (
                      <View key={key} style={styles.fieldBox}>
                        <Text style={styles.fieldLabel}>{fieldName}:</Text>
                        <Text style={styles.fieldValue}>{String(value)}</Text>
                      </View>
                    );
                  })}
                  {pair.length === 1 && <View style={styles.fieldBoxSpacer} />}
                </View>
              ))}
            </View>
          </>
        )}

        {property.description && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 8 }]}>{t.description}</Text>
            <View style={styles.sectionDivider} />
            <Text style={styles.description}>{property.description}</Text>
          </>
        )}

        <Text style={styles.sectionTitle}>{t.location}</Text>
        <View style={styles.sectionDivider} />
        <View style={styles.locationRow}>
          <Text style={styles.locationText}>{locationParts.join(', ')}</Text>
          {validQrUrl && (
            <View style={styles.qrBoxWrap}>
              <View style={styles.qrBox}>
                <Image src={validQrUrl} style={styles.qrImage} />
              </View>
              <Text style={styles.qrCaption}>{t.scanToView}</Text>
            </View>
          )}
        </View>
      </View>

      <CompactFooter agent={agent} t={t} />
    </Page>
  );
}

function GalleryPage({ agent, t, validGalleryPhotos, validLogoUrl }: any) {
  return (
    <Page size="A4" style={styles.page}>
      <CompactHeader validLogoUrl={validLogoUrl} />

      <View style={styles.body}>
        <Text style={styles.sectionTitle}>{t.photoGallery}</Text>
        <View style={styles.sectionDivider} />
      </View>

      <View style={styles.galleryGrid}>
        {chunkPairs(validGalleryPhotos as string[]).map((pair, rowIndex) => (
          <View key={rowIndex} style={styles.galleryRow}>
            {pair.map((url, i) => (
              <View key={i} style={styles.galleryImageWrap}>
                <Image src={url} style={styles.galleryImage} />
              </View>
            ))}
            {pair.length === 1 && <View style={styles.galleryImageWrapSpacer} />}
          </View>
        ))}
      </View>

      <CompactFooter agent={agent} t={t} />
    </Page>
  );
}

const PropertyDocument = async ({ property, agent, customFieldsDefinitions, lang, baseDomain }: any) => {
  const currency = getCurrency(property);
  const t = TRANSLATIONS[lang as 'es' | 'en'];

  const propertyUrl = `${baseDomain}/p/${property.slug}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(propertyUrl)}`;

  const [validCoverPhotos, validLogoUrls, validQrUrls, validGalleryPhotos] = await Promise.all([
    filterValidImageUrls([property.photos?.[0]]),
    filterValidImageUrls([agent?.watermark_logo]),
    filterValidImageUrls([qrCodeUrl]),
    filterValidImageUrls((property.photos || []).slice(1, 7)),
  ]);

  const coverPhoto = validCoverPhotos[0] || null;
  const validLogoUrl = validLogoUrls[0] || null;
  const validQrUrl = validQrUrls[0] || null;
  const hasGallery = validGalleryPhotos.length > 0;

  return (
    <Document>
      <CoverPage
        property={property}
        agent={agent}
        t={t}
        lang={lang}
        currency={currency}
        baseDomain={baseDomain}
        coverPhoto={coverPhoto}
        validLogoUrl={validLogoUrl}
      />
      <DetailsPage
        property={property}
        agent={agent}
        t={t}
        lang={lang}
        customFieldsDefinitions={customFieldsDefinitions}
        baseDomain={baseDomain}
        validLogoUrl={validLogoUrl}
        validQrUrl={validQrUrl}
      />
      {hasGallery && (
        <GalleryPage agent={agent} t={t} validGalleryPhotos={validGalleryPhotos} validLogoUrl={validLogoUrl} />
      )}
    </Document>
  );
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const agentId = searchParams.get('agent_id');
    const lang = (searchParams.get('lang') === 'en' ? 'en' : 'es') as 'es' | 'en';
    const baseDomain = 'https://www.flowestateai.com';

    if (!slug || !agentId) {
      return NextResponse.json({ error: 'Se requiere el slug y agent_id' }, { status: 400 });
    }

    const { data: property, error: dbError } = await supabaseAdmin
      .from('properties')
      .select('*')
      .eq('slug', slug)
      .eq('agent_id', agentId)
      .single();

    if (dbError || !property) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 });
    }

    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('full_name, username, phone, email, brokerage, watermark_logo')
      .eq('id', agentId)
      .single();

    const { data: customFieldsDefinitions, error: customFieldsError } = await supabaseAdmin
      .from('custom_fields')
      .select('field_key, field_name, field_name_en');

    if (customFieldsError) {
      console.error('Error obteniendo custom_fields:', customFieldsError);
    }

    const documentElement = await PropertyDocument({
      property,
      agent,
      customFieldsDefinitions: customFieldsDefinitions || [],
      lang,
      baseDomain,
    });

    const pdfBuffer = await renderToBuffer(documentElement);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Ficha-${slug}.pdf"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

  } catch (error) {
    console.error('Error generando PDF al vuelo:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}