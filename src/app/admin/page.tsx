"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminPanel() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchAgents();
  }, [session, status]);

  async function fetchAgents() {
    try {
      const res = await fetch('/api/admin/agents');
      const data = await res.json();
      if (data.agents) setAgents(data.agents);
    } finally {
      setLoading(false);
    }
  }

  const formatLastActive = (dateString: string) => {
    if (!dateString) return { text: 'Nunca', color: 'text-red-500' };
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / 36e5;
    
    if (diffInHours < 24) return { text: 'Hoy', color: 'text-green-600' };
    if (diffInHours < 72) return { text: 'Hace poco', color: 'text-orange-500' };
    return { text: date.toLocaleDateString(), color: 'text-slate-400' };
  };

  if (loading) return <div className="p-10 text-center font-sans">Cargando métricas...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Control de Agentes</h1>
            <p className="text-slate-500">Métricas de rendimiento y suscripciones</p>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total Global</span>
            <p className="text-2xl font-black text-blue-600">{agents.length} Usuarios</p>
          </div>
        </header>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-5 text-xs font-bold text-slate-400 uppercase">Agente</th>
                <th className="p-5 text-xs font-bold text-slate-400 uppercase">Estado</th>
                <th className="p-5 text-xs font-bold text-slate-400 uppercase text-center">Propiedades</th>
                <th className="p-5 text-xs font-bold text-slate-400 uppercase text-center">Vistas Totales</th>
                <th className="p-5 text-xs font-bold text-slate-400 uppercase">Última Actividad</th>
                <th className="p-5 text-xs font-bold text-slate-400 uppercase text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agents.map((agent) => {
                const activity = formatLastActive(agent.last_active_at);
                const isPro = agent.plan === 'pro' && new Date(agent.expires_at) > new Date();
                
                return (
                  <tr key={agent.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-5">
                      <p className="font-bold text-slate-800">{agent.full_name || 'Agente Nuevo'}</p>
                      <p className="text-xs text-slate-500">{agent.email}</p>
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        isPro ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isPro ? 'Pro Activo' : 'Free / Vencido'}
                      </span>
                    </td>
                    <td className="p-5 text-center font-bold text-slate-700">
                      {agent.totalProperties}
                    </td>
                    <td className="p-5 text-center">
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg font-bold text-sm">
                        {agent.totalViews.toLocaleString()}
                      </span>
                    </td>
                    <td className={`p-5 text-sm font-medium ${activity.color}`}>
                      {activity.text}
                    </td>
                    <td className="p-5 text-right">
                      <button 
                        onClick={() => {/* función activateAgent que ya tenías */}}
                        className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-600 transition-all"
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}