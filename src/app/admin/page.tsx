"use client";
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function AdminPanel() {
  const [agents, setAgents] = useState<any[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchAgents();
  }, []);

  async function fetchAgents() {
    const { data } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setAgents(data);
  }

  async function activateAgent(agentId: string, email: string) {
    const reference = prompt("Ingresa el número de comprobante SINPE:");
    if (!reference) return;

    const res = await fetch('/api/activate-agent', {
      method: 'POST',
      body: JSON.stringify({ agentId, reference }),
    });

    if (res.ok) {
      alert(`Plan activado para ${email}`);
      fetchAgents();
    }
  }

  return (
    <div className="p-8 font-sans">
      <h1 className="text-2xl font-bold mb-6">Gestión de Agentes (MVP)</h1>
      <table className="w-full border-collapse bg-white shadow-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 text-left">Nombre</th>
            <th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">Plan Actual</th>
            <th className="p-3 text-left">Expiración</th>
            <th className="p-3 text-left">Acción</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr key={agent.id} className="border-t">
              <td className="p-3">{agent.full_name}</td>
              <td className="p-3 text-sm">{agent.email}</td>
              <td className="p-3 capitalize">
                <span className={`px-2 py-1 rounded text-xs ${agent.plan === 'pro' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                  {agent.plan}
                </span>
              </td>
              <td className="p-3 text-sm">
                {agent.expires_at ? new Date(agent.expires_at).toLocaleDateString() : '-'}
              </td>
              <td className="p-3">
                <button 
                  onClick={() => activateAgent(agent.id, agent.email)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  Activar Pro
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}