import { generatePropertyMetadata } from './metadata';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  return generatePropertyMetadata(params.slug);
}

export default function PropertyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}