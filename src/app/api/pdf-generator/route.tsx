import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { marginBottom: 20, borderBottom: '2px solid #ea580c', paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 5 },
  location: { fontSize: 12, color: '#6b7280', marginBottom: 15 },
  price: { fontSize: 18, color: '#16a34a', marginBottom: 15 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  description: { fontSize: 11, lineHeight: 1.5, color: '#374151' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 10, color: '#9ca3af' }
});

const CURRENCY_MAP: Record<string, string> = {
  'ec8528a3-d504-47fa-97db-2c07716d8b47': '₡',
  '839f44d5-bee2-4bc1-b5da-50364f14c681': '$'
};

const PropertyDocument = ({ property }: { property: any }) => {
  const symbol = CURRENCY_MAP[property.currency_id] || '₡';
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{property.title}</Text>
          <Text style={styles.location}>{property.city}, {property.state} • {property.address}</Text>
          <Text style={styles.price}>Precio: {symbol}{property.price?.toLocaleString()}</Text> 
        </View>

        <View>
          <Text style={styles.sectionTitle}>Descripción de la Propiedad</Text>
          <Text style={styles.description}>{property.description}</Text>
        </View>

        <Text style={styles.footer}>Generado por FlowEstateAI - El copiloto inmobiliario</Text>
      </Page>
    </Document>
  );
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ error: 'Se requiere el slug' }, { status: 400 });
    }

    const { data: property, error: dbError } = await supabaseAdmin
      .from('properties')
      .select('*')
      .eq('slug', slug)
      .single();

    if (dbError || !property) {
      return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 });
    }

    const pdfBuffer = await renderToBuffer(<PropertyDocument property={property} />);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Ficha-${slug}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generando PDF al vuelo:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}