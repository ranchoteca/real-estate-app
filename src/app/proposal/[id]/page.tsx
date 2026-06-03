// app/proposal/[id]/page.tsx
// Server Component wrapper — requerido por Next.js App Router en Vercel

import ProposalPublicPage from './ProposalPublicPage';

export default function Page() {
  return <ProposalPublicPage />;
}