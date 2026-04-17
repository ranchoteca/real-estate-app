"use client";
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminPanel() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
    fetchAgents();
  }, [session, status, router]);

  async function fetchAgents() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/agents');
      const data = await res.json();
      if (data.agents) setAgents(data.agents);
    } catch (error) {
      console.error("Error cargando agentes:", error);
    } finally {
      setLoading(false);
    }
  }

  async function activateAgent(agentId: string, email: string) {
    const reference = prompt(`Introduce el número de comprobante SINPE para ${email}:`);
    
    // VALIDACIÓN: Evita que se procese si está vacío o solo tiene espacios
    if (!reference || reference.trim() === "") {
      alert("❌ Debes ingresar un número de referencia válido.");
      return;
    }

    try {
      const res = await fetch('/api/activate-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          agentId, 
          reference: reference.trim(),
          months: 1 
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        alert(`✅ ¡Pro activado! Se envió el correo de confirmación a ${email}`);
        setSelectedAgent(null);
        fetchAgents();
      } else {
        alert(`❌ Error: ${result.error || 'No se pudo activar'}`);
      }
    } catch (err) {
      alert('❌ Error de conexión con la API');
    }
  }

  const formatLastActive = (dateString: string) => {
    if (!dateString) return { text: 'Nunca', color: 'text-red-400' };
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / 36e5;
    if (diffInHours < 24) return { text: 'Hoy', color: 'text-green-600' };
    if (diffInHours < 168) return { text: 'Esta semana', color: 'text-orange-400' };
    return { text: date.toLocaleDateString(), color: 'text-slate-400' };
  };

  if (loading && agents.length === 0) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="font-bold text-slate-400 animate-pulse font-sans">Sincronizando base de datos...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        
        {/* Cabecera */}
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter">Panel Maestro</h1>
            <p className="text-slate-500 font-medium text-sm">Flow Estate AI — Control Central</p>
          </div>
          
          <div className="flex gap-3">
            {/* Botón Refrescar Moderno */}
            <button 
              onClick={fetchAgents}
              disabled={loading}
              className="group bg-white border border-slate-200 p-4 rounded-[20px] hover:bg-slate-50 hover:border-blue-200 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              title="Refrescar datos"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className={`text-slate-500 group-hover:text-blue-600 transition-colors ${loading ? 'animate-spin' : ''}`}
              >
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
              </svg>
            </button>

            <button 
              onClick={() => signOut({ callbackUrl: '/' })}
              className="bg-red-50 text-red-600 px-6 py-4 rounded-[20px] font-bold text-xs hover:bg-red-100 transition-all active:scale-95"
            >
              Cerrar Sesión
            </button>
          </div>
        </header>

        {/* Tabla Principal */}
        <div className="bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 font-bold text-[10px] text-slate-400 uppercase tracking-widest">
                  <th className="p-6">Perfil Agente</th>
                  <th className="p-6">Plan y Estado</th>
                  <th className="p-6 text-center">Propiedades</th>
                  <th className="p-6 text-center">Vistas</th>
                  <th className="p-6">Actividad</th>
                  <th className="p-6 text-right">Mando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {agents.map((agent) => {
                  const activity = formatLastActive(agent.last_active_at);
                  
                  // Lógica de Badge Solicitada
                  const expirationDate = agent.expires_at ? new Date(agent.expires_at) : null;
                  const isExpired = agent.plan === 'pro' && expirationDate && expirationDate < new Date();
                  const isPro = agent.plan === 'pro' && expirationDate && expirationDate > new Date();
                  
                  return (
                    <tr key={agent.id} className="hover:bg-blue-50/10 transition-colors">
                      <td className="p-6">
                        <p className="font-bold text-slate-800 leading-tight mb-1">{agent.full_name || 'Agente Nuevo'}</p>
                        <p className="text-[11px] text-slate-400 font-medium">{agent.email}</p>
                      </td>
                      <td className="p-6">
                        {isPro ? (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-green-50 text-green-700 border border-green-100">
                            Pro Activo
                          </span>
                        ) : isExpired ? (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-red-50 text-red-600 border border-red-100">
                            Vencido
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-500 border border-slate-200">
                            Free
                          </span>
                        )}
                      </td>
                      <td className="p-6 text-center font-bold text-slate-700">{agent.totalProperties}</td>
                      <td className="p-6 text-center font-bold text-blue-600">{agent.totalViews?.toLocaleString() || 0}</td>
                      <td className={`p-6 text-sm font-semibold ${activity.color}`}>{activity.text}</td>
                      <td className="p-6 text-right">
                        <button 
                          onClick={() => setSelectedAgent(agent)}
                          className="bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-xs font-bold hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-slate-200"
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

      {/* MODAL DE GESTIÓN */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[40px] max-w-md w-full p-10 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight">Acciones</h2>
                <p className="text-sm text-slate-500 font-medium">{selectedAgent.email}</p>
              </div>
              <button onClick={() => setSelectedAgent(null)} className="text-slate-300 hover:text-slate-600 text-xl transition-colors">✕</button>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Detalle de Suscripción</p>
                <div className="flex justify-between items-center mb-2 text-sm font-bold">
                  <span className="text-slate-600">Último SINPE:</span>
                  <span className="text-slate-800">{selectedAgent.last_payment_reference || 'Ninguno'}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-600">Vencimiento:</span>
                  <span className="text-blue-600">{selectedAgent.expires_at ? new Date(selectedAgent.expires_at).toLocaleDateString() : 'Nunca'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => activateAgent(selectedAgent.id, selectedAgent.email)}
                  className="w-full bg-blue-600 text-white py-5 rounded-[20px] font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
                >
                  💳 REGISTRAR PAGO SINPE
                </button>
                
                <button 
                  onClick={() => setSelectedAgent(null)}
                  className="w-full bg-slate-100 text-slate-500 py-4 rounded-[20px] font-bold text-xs hover:bg-slate-200 transition-all"
                >
                  Cerrar Ventana
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}