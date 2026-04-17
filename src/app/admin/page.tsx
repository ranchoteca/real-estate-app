"use client";
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminPanel() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null); // Estado para el modal de gestión
  
  const { data: session, status } = useSession();
  const router = useRouter();

  // 1. Validación de seguridad (Admin Check)
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchAgents();
  }, [session, status, router]);

  // 2. Obtención de datos desde la API
  async function fetchAgents() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/agents');
      const data = await res.json();
      if (data.agents) setAgents(data.agents);
    } catch (error) {
      console.error("Error al cargar agentes:", error);
    } finally {
      setLoading(false);
    }
  }

  // 3. Lógica para activar Plan Pro (SINPE)
  async function activateAgent(agentId: string, email: string) {
    const reference = prompt(`Ingresa el número de comprobante SINPE para ${email}:`);
    if (!reference) return;

    try {
      const res = await fetch('/api/activate-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, reference }),
      });

      if (res.ok) {
        alert(`✅ Plan Pro activado para ${email}`);
        setSelectedAgent(null); // Cerrar modal tras éxito
        fetchAgents(); // Refrescar lista
      } else {
        alert('❌ Error al procesar la activación.');
      }
    } catch (err) {
      alert('❌ Error de conexión al servidor.');
    }
  }

  // 4. Formateo visual de actividad
  const formatLastActive = (dateString: string) => {
    if (!dateString) return { text: 'Inactivo', color: 'text-red-400' };
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / 36e5;
    
    if (diffInHours < 24) return { text: 'Hoy', color: 'text-green-600' };
    if (diffInHours < 72) return { text: 'Reciente', color: 'text-orange-500' };
    return { text: date.toLocaleDateString(), color: 'text-slate-400' };
  };

  if (loading && agents.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="font-bold text-slate-500 animate-pulse text-lg">Cargando métricas de administración...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        
        {/* Encabezado con Estadísticas */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight">Admin Console</h1>
            <p className="text-slate-500 font-medium">Panel de control de agentes y suscripciones</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white px-6 py-4 rounded-[24px] shadow-sm border border-slate-200 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Usuarios</p>
              <p className="text-3xl font-black text-blue-600">{agents.length}</p>
            </div>
            <button 
              onClick={fetchAgents}
              className="bg-white border border-slate-200 p-4 rounded-[20px] hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              🔄
            </button>
          </div>
        </header>

        {/* Tabla de Gestión */}
        <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Agente</th>
                  <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Suscripción</th>
                  <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Propiedades</th>
                  <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Vistas Totales</th>
                  <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Última Actividad</th>
                  <th className="p-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {agents.map((agent) => {
                  const activity = formatLastActive(agent.last_active_at);
                  const isPro = agent.plan === 'pro' && agent.expires_at && new Date(agent.expires_at) > new Date();
                  
                  return (
                    <tr key={agent.id} className="hover:bg-blue-50/20 transition-all">
                      <td className="p-6">
                        <p className="font-bold text-slate-800 leading-tight mb-1">{agent.full_name || 'Sin nombre'}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{agent.email}</p>
                      </td>
                      <td className="p-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                          isPro ? 'bg-green-50 text-green-700 border-green-100' : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {isPro ? 'Pro Activo' : 'Free / Vencido'}
                        </span>
                      </td>
                      <td className="p-6 text-center font-bold text-slate-700">{agent.totalProperties}</td>
                      <td className="p-6 text-center">
                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-bold">
                          {agent.totalViews?.toLocaleString() || 0}
                        </span>
                      </td>
                      <td className={`p-6 font-semibold ${activity.color}`}>{activity.text}</td>
                      <td className="p-6 text-right">
                        <button 
                          onClick={() => setSelectedAgent(agent)}
                          className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-xs font-bold hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 active:scale-95"
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

      {/* MODAL DE GESTIÓN (Aparece al tocar Gestionar) */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[40px] max-w-md w-full p-10 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight">Gestión Maestra</h2>
                <p className="text-sm text-slate-500 font-medium">{selectedAgent.email}</p>
              </div>
              <button 
                onClick={() => setSelectedAgent(null)} 
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-all text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Información de Suscripción */}
              <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Plan actual</p>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-slate-700 uppercase">{selectedAgent.plan}</span>
                  <span className="text-xs font-bold text-slate-400">
                    Vence: {selectedAgent.expires_at ? new Date(selectedAgent.expires_at).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>

              {/* Botones de Acción Crítica */}
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => activateAgent(selectedAgent.id, selectedAgent.email)}
                  className="w-full bg-blue-600 text-white py-5 rounded-[20px] font-black text-sm flex items-center justify-center gap-3 hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
                >
                  💳 REGISTRAR PAGO SINPE
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => alert('Próximamente: Visualización de inventario')}
                    className="bg-white border border-slate-200 text-slate-600 py-4 rounded-[20px] font-bold text-xs hover:bg-slate-50 transition-all"
                  >
                    📂 PROPIEDADES
                  </button>
                  <button 
                    onClick={() => alert('Próximamente: Suspensión de cuenta')}
                    className="bg-red-50 text-red-600 py-4 rounded-[20px] font-bold text-xs hover:bg-red-100 transition-all"
                  >
                    🚫 SUSPENDER
                  </button>
                </div>
              </div>
              
              <p className="text-center text-[10px] text-slate-300 font-black uppercase tracking-tight">
                Flow Estate AI Admin Panel
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}