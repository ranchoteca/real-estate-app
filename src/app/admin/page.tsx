"use client";
import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminPanel() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    reference: '',
    paymentMethod: 'sinpe',
    amount: '',
    months: '1',
    invoiceNumber: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

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

  async function handleRegisterPayment() {
    if (!paymentForm.reference.trim()) {
      alert('❌ El número de referencia es obligatorio.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/activate-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          reference: paymentForm.reference.trim(),
          paymentMethod: paymentForm.paymentMethod,
          amount: paymentForm.amount ? parseFloat(paymentForm.amount) : null,
          months: parseInt(paymentForm.months),
          invoiceNumber: paymentForm.invoiceNumber.trim() || null,
          notes: paymentForm.notes.trim() || null,
          createdBy: session?.user?.email || null,
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        alert(`✅ Pago registrado y Pro activado para ${selectedAgent.email}`);
        setShowPaymentForm(false);
        setPaymentForm({
          reference: '',
          paymentMethod: 'sinpe',
          amount: '',
          months: '1',
          invoiceNumber: '',
          notes: '',
        });
        setSelectedAgent(null);
        fetchAgents();
      } else {
        alert(`❌ Error: ${result.error || 'No se pudo activar'}`);
      }
    } catch (err) {
      alert('❌ Error de conexión con la API');
    } finally {
      setSubmitting(false);
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

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      sinpe: 'SINPE',
      card: 'Tarjeta',
      other: 'Otro',
    };
    return methods[method] || method;
  };

  const formatPaymentMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      sinpe: 'bg-green-50 text-green-700 border-green-100',
      card: 'bg-blue-50 text-blue-700 border-blue-100',
      other: 'bg-slate-50 text-slate-600 border-slate-200',
    };
    return colors[method] || colors.other;
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
            <button
              onClick={fetchAgents}
              disabled={loading}
              className="group bg-white border border-slate-200 p-4 rounded-[20px] hover:bg-slate-50 hover:border-blue-200 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              title="Refrescar datos"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20" height="20" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
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
                  <th className="p-6 text-center">Pagos</th>
                  <th className="p-6">Actividad</th>
                  <th className="p-6 text-right">Mando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {agents.map((agent) => {
                  const activity = formatLastActive(agent.last_active_at);
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
                          <div>
                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-green-50 text-green-700 border border-green-100">
                              Pro Activo
                            </span>
                            <p className="text-[10px] text-slate-400 mt-1">
                              Vence: {expirationDate?.toLocaleDateString()}
                            </p>
                          </div>
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
                      <td className="p-6 text-center">
                        <span className="font-bold text-slate-700">{agent.totalPayments || 0}</span>
                      </td>
                      <td className={`p-6 text-sm font-semibold ${activity.color}`}>{activity.text}</td>
                      <td className="p-6 text-right">
                        <button
                          onClick={() => {
                            setSelectedAgent(agent);
                            setShowPaymentForm(false);
                          }}
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
          <div className="bg-white rounded-[40px] max-w-lg w-full p-10 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            {/* Header del modal */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight">Gestionar Agente</h2>
                <p className="text-sm text-slate-500 font-medium">{selectedAgent.email}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedAgent(null);
                  setShowPaymentForm(false);
                }}
                className="text-slate-300 hover:text-slate-600 text-xl transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Estado actual */}
            <div className="bg-slate-50 p-5 rounded-[20px] border border-slate-100 mb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Estado Actual</p>
              <div className="flex justify-between items-center mb-2 text-sm font-bold">
                <span className="text-slate-500">Plan:</span>
                <span className="text-slate-800 uppercase">{selectedAgent.plan}</span>
              </div>
              <div className="flex justify-between items-center mb-2 text-sm font-bold">
                <span className="text-slate-500">Último pago:</span>
                <span className="text-slate-800">{selectedAgent.last_payment_reference || 'Ninguno'}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-500">Vencimiento:</span>
                <span className="text-blue-600">
                  {selectedAgent.expires_at ? new Date(selectedAgent.expires_at).toLocaleDateString() : 'Nunca'}
                </span>
              </div>
            </div>

            {/* Historial de pagos */}
            <div className="mb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Historial de Pagos ({selectedAgent.paymentHistory?.length || 0})
              </p>

              {selectedAgent.paymentHistory?.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedAgent.paymentHistory.map((payment: any) => (
                    <div
                      key={payment.id}
                      className="bg-slate-50 rounded-2xl p-4 border border-slate-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${formatPaymentMethodColor(payment.payment_method)}`}>
                          {formatPaymentMethod(payment.payment_method)}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                        <span>Ref: {payment.reference}</span>
                        {payment.amount && (
                          <span className="text-green-600">₡{Number(payment.amount).toLocaleString()}</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Vence: {new Date(payment.expires_at).toLocaleDateString()}
                        {payment.invoice_number && (
                          <span className="ml-2 text-blue-500">· FAC: {payment.invoice_number}</span>
                        )}
                      </div>
                      {payment.notes && (
                        <p className="text-[10px] text-slate-500 mt-1 italic">{payment.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-slate-400 bg-slate-50 rounded-2xl">
                  Sin pagos registrados
                </div>
              )}
            </div>

            {/* Formulario de nuevo pago */}
            {showPaymentForm ? (
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nuevo Pago</p>

                {/* Método de pago */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Método de Pago</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-400"
                  >
                    <option value="sinpe">SINPE Móvil</option>
                    <option value="card">Tarjeta</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                {/* Referencia */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Número de Referencia <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    placeholder="Ej: 88234521"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-400"
                  />
                </div>

                {/* Monto y Meses */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Monto (₡)</label>
                    <input
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      placeholder="14125"
                      className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Meses</label>
                    <select
                      value={paymentForm.months}
                      onChange={(e) => setPaymentForm({ ...paymentForm, months: e.target.value })}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-400"
                    >
                      <option value="1">1 mes</option>
                      <option value="3">3 meses</option>
                      <option value="6">6 meses</option>
                      <option value="12">12 meses</option>
                    </select>
                  </div>
                </div>

                {/* Número de Factura */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Número de Factura <span className="text-slate-400">(opcional)</span></label>
                  <input
                    type="text"
                    value={paymentForm.invoiceNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, invoiceNumber: e.target.value })}
                    placeholder="Ej: FAC-2026-0042"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-400"
                  />
                </div>

                {/* Notas */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Notas <span className="text-slate-400">(opcional)</span></label>
                  <input
                    type="text"
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    placeholder="Ej: Pago Abril 2026"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-400"
                  />
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowPaymentForm(false)}
                    className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-[20px] font-bold text-xs hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRegisterPayment}
                    disabled={submitting}
                    className="flex-1 bg-blue-600 text-white py-4 rounded-[20px] font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? 'Registrando...' : '✅ Confirmar Pago'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-6">
                <button
                  onClick={() => setShowPaymentForm(true)}
                  className="w-full bg-blue-600 text-white py-5 rounded-[20px] font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
                >
                  💳 REGISTRAR NUEVO PAGO
                </button>
                <button
                  onClick={() => {
                    setSelectedAgent(null);
                    setShowPaymentForm(false);
                  }}
                  className="w-full bg-slate-100 text-slate-500 py-4 rounded-[20px] font-bold text-xs hover:bg-slate-200 transition-all"
                >
                  Cerrar Ventana
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}