import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, CheckCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Conta } from '../../store/useStore';
import type { ContaStatus } from '../../store/empresaTypes';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const STATUS_LABELS: Record<string, string> = {
  aguardando: 'Aguardando',
  recebido: 'Recebido',
  em_atraso: 'Em Atraso',
};

const ENTRADA_CATS = [
  { value: 'vendas_balcao', label: 'Vendas Balcão' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'eventos', label: 'Eventos' },
  { value: 'outros_entrada', label: 'Outros' },
];

const MES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function daysUntil(dateStr: string): number {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function getStatusColor(conta: Conta): string {
  if (conta.status === 'em_atraso' || (conta.status === 'aguardando' && daysUntil(conta.vencimento) < 0))
    return '#ef4444';
  if (conta.status === 'aguardando' && daysUntil(conta.vencimento) <= 3) return '#f59e0b';
  if (conta.status === 'recebido') return '#10b981';
  return '#8b949e';
}

function getEffectiveStatus(conta: Conta): string {
  if (conta.status === 'aguardando' && daysUntil(conta.vencimento) < 0) return 'em_atraso';
  return conta.status;
}

interface FormState {
  cliente: string;
  descricao: string;
  valor: string;
  vencimento: string;
  categoria: string;
  recorrente: boolean;
}

const defaultForm = (): FormState => ({
  cliente: '',
  descricao: '',
  valor: '',
  vencimento: new Date().toISOString().slice(0, 10),
  categoria: 'vendas_balcao',
  recorrente: false,
});

type FilterStatus = 'todos' | ContaStatus;

export default function ContasReceber() {
  const now = new Date();
  const [showModal, setShowModal] = useState(false);
  const [editConta, setEditConta] = useState<Conta | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('todos');
  const [searchCliente, setSearchCliente] = useState('');
  const [selectedMes, setSelectedMes] = useState(now.getMonth() + 1);
  const [selectedAno, setSelectedAno] = useState(now.getFullYear());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());

  const { adicionarContaReceber, atualizarContaReceber, excluirContaReceber, adicionarLancamento, getEmpresaAtiva, getBanco, registrarTransacao } = useStore();
  const empresa = getEmpresaAtiva();
  const bancoEmp = getBanco('empresa');

  const monthPrefix = `${selectedAno}-${String(selectedMes).padStart(2, '0')}`;

  const contas: Conta[] = useMemo(() => empresa?.contasReceber ?? [], [empresa]);

  const filteredContas = useMemo(() => {
    let list = contas.filter((c) => c.vencimento.startsWith(monthPrefix));
    if (filterStatus !== 'todos') {
      list = list.filter((c) => c.status === filterStatus);
    }
    if (searchCliente.trim()) {
      const q = searchCliente.toLowerCase();
      list = list.filter((c) => (c.fornecedor ?? '').toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  }, [contas, monthPrefix, filterStatus, searchCliente]);

  const totalAguardando = useMemo(
    () => contas.filter((c) => c.status === 'aguardando').reduce((s, c) => s + c.valor, 0),
    [contas],
  );
  const totalEmAtraso = useMemo(
    () =>
      contas
        .filter(
          (c) =>
            c.status === 'em_atraso' || (c.status === 'aguardando' && daysUntil(c.vencimento) < 0),
        )
        .reduce((s, c) => s + c.valor, 0),
    [contas],
  );
  const totalRecebidoMes = useMemo(
    () =>
      contas
        .filter((c) => c.status === 'recebido' && c.vencimento.startsWith(monthPrefix))
        .reduce((s, c) => s + c.valor, 0),
    [contas, monthPrefix],
  );

  const openAdd = () => {
    setEditConta(null);
    setForm(defaultForm());
    setShowModal(true);
  };

  const openEdit = (c: Conta) => {
    setEditConta(c);
    setForm({
      cliente: c.fornecedor ?? '',
      descricao: c.descricao,
      valor: String(c.valor),
      vencimento: c.vencimento,
      categoria: c.categoria,
      recorrente: c.recorrente ?? false,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!empresa) return;
    const payload = {
      fornecedor: form.cliente,
      descricao: form.descricao,
      valor: parseFloat(form.valor) || 0,
      vencimento: form.vencimento,
      categoria: form.categoria as import('../../store/empresaTypes').FluxoCategoria,
      recorrente: form.recorrente,
      status: 'aguardando' as ContaStatus,
    };
    if (editConta) {
      atualizarContaReceber(empresa.id, editConta.id, payload);
    } else {
      adicionarContaReceber(empresa.id, payload);
    }
    setShowModal(false);
  };

  const marcarRecebido = (c: Conta) => {
    if (!empresa) return;
    atualizarContaReceber(empresa.id, c.id, { status: 'recebido' as ContaStatus });
    adicionarLancamento(empresa.id, {
      tipo: 'entrada',
      valor: c.valor,
      data: new Date().toISOString().slice(0, 10),
      categoria: c.categoria,
      descricao: c.descricao,
      liquidado: true,
    });
    // Integração bancária: entrada na conta padrão da empresa
    const contaPadrao = bancoEmp.contas.find(x => x.contaPadrao) ?? bancoEmp.contas[0];
    if (contaPadrao) {
      const catMap: Record<string, import('../../store/bancoTypes').CategoriaFin> = {
        vendas_balcao: 'vendas_balcao', delivery: 'delivery', eventos: 'eventos', outros_entrada: 'outros_entrada',
      };
      registrarTransacao({
        contaId: contaPadrao.id, tipo: 'entrada', valor: c.valor,
        descricao: c.descricao, categoria: catMap[c.categoria] ?? 'outros_entrada',
        data: new Date().toISOString().slice(0, 10), recorrente: false,
        origemAuto: 'conta_receber',
      }, 'empresa');
    }
  };

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      excluirContaReceber(empresa!.id, id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  };

  return (
    <div style={{ background: '#0d1117', minHeight: '100vh', padding: '24px', color: '#e6edf3' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e6edf3', margin: 0 }}>Contas a Receber</h1>
            <p style={{ color: '#8b949e', margin: '4px 0 0', fontSize: 14 }}>Gestão de recebíveis</p>
          </div>
          <Button onClick={openAdd} style={{ background: '#e8a020', color: '#0d1117', fontWeight: 700, border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Nova Conta
          </Button>
        </div>

        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Aguardando', value: totalAguardando, color: '#f59e0b' },
            { label: 'Total Em Atraso', value: totalEmAtraso, color: '#ef4444' },
            { label: 'Recebido este Mês', value: totalRecebidoMes, color: '#10b981' },
          ].map((k) => (
            <div key={k.label} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, padding: '14px 18px' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#8b949e' }}>{k.label}</p>
              <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: k.color }}>{fmtBRL(k.value)}</p>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            style={{ background: '#161b22', border: '1px solid #21262d', color: '#e6edf3', borderRadius: 6, padding: '6px 10px', fontSize: 14 }}
          >
            <option value="todos">Todos</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input
            placeholder="Buscar cliente..."
            value={searchCliente}
            onChange={(e) => setSearchCliente(e.target.value)}
            style={{ background: '#161b22', border: '1px solid #21262d', color: '#e6edf3', borderRadius: 6, padding: '6px 10px', fontSize: 14, minWidth: 180 }}
          />
          <select
            value={selectedMes}
            onChange={(e) => setSelectedMes(Number(e.target.value))}
            style={{ background: '#161b22', border: '1px solid #21262d', color: '#e6edf3', borderRadius: 6, padding: '6px 10px', fontSize: 14 }}
          >
            {MES_NOMES.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            value={selectedAno}
            onChange={(e) => setSelectedAno(Number(e.target.value))}
            style={{ background: '#161b22', border: '1px solid #21262d', color: '#e6edf3', borderRadius: 6, padding: '6px 10px', fontSize: 14, width: 90 }}
          />
        </div>

        {/* Table */}
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#0d1117' }}>
                {['Cliente', 'Descrição', 'Valor', 'Vencimento', 'Status', 'Ações'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#8b949e', fontWeight: 600, fontSize: 12, borderBottom: '1px solid #21262d' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredContas.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#8b949e' }}>Nenhuma conta encontrada</td>
                </tr>
              )}
              {filteredContas.map((c) => {
                const color = getStatusColor(c);
                const effStatus = getEffectiveStatus(c);
                const [y, m, d] = c.vencimento.split('-');
                const vencFmt = `${d}/${m}/${y}`;
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '10px 14px', color: '#e6edf3', fontWeight: 600 }}>{c.fornecedor}</td>
                    <td style={{ padding: '10px 14px', color: '#8b949e' }}>{c.descricao}</td>
                    <td style={{ padding: '10px 14px', color: '#10b981', fontWeight: 600 }}>{fmtBRL(c.valor)}</td>
                    <td style={{ padding: '10px 14px', color: '#e6edf3' }}>{vencFmt}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        background: `${color}22`,
                        color,
                        padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                      }}>
                        {STATUS_LABELS[effStatus] ?? effStatus}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {c.status !== 'recebido' && (
                          <button
                            onClick={() => marcarRecebido(c)}
                            title="Marcar como recebido"
                            style={{ background: 'rgba(16,185,129,0.15)', border: 'none', cursor: 'pointer', color: '#10b981', padding: '4px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}
                          >
                            <CheckCircle size={14} /> Recebido
                          </button>
                        )}
                        <button onClick={() => openEdit(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e', padding: 4 }}>
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          style={{ background: confirmDelete === c.id ? 'rgba(239,68,68,0.15)' : 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, borderRadius: 4 }}
                          title={confirmDelete === c.id ? 'Clique novamente para confirmar' : 'Excluir'}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editConta ? 'Editar Conta' : 'Nova Conta a Receber'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Cliente"
            value={form.cliente}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, cliente: e.target.value })}
          />
          <Input
            label="Descrição"
            value={form.descricao}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, descricao: e.target.value })}
          />
          <Input
            label="Valor R$"
            type="number"
            value={form.valor}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, valor: e.target.value })}
          />
          <Input
            label="Vencimento"
            type="date"
            value={form.vencimento}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, vencimento: e.target.value })}
          />
          <div>
            <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>Categoria</label>
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              style={{ width: '100%', background: '#0d1117', border: '1px solid #21262d', color: '#e6edf3', borderRadius: 6, padding: '8px 10px', fontSize: 14 }}
            >
              {ENTRADA_CATS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#e6edf3', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.recorrente}
              onChange={(e) => setForm({ ...form, recorrente: e.target.checked })}
              style={{ accentColor: '#e8a020' }}
            />
            Recorrente
          </label>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Button onClick={() => setShowModal(false)} style={{ background: '#21262d', color: '#e6edf3', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} style={{ background: '#e8a020', color: '#0d1117', fontWeight: 700, border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>
              {editConta ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
