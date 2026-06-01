import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useStore } from '../../store/useStore';
import type { FluxoLancamento } from '../../store/useStore';
import type { FluxoCategoria } from '../../store/empresaTypes';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const CATEGORY_LABELS: Record<string, string> = {
  vendas_balcao: 'Vendas Balcão',
  delivery: 'Delivery',
  eventos: 'Eventos',
  outros_entrada: 'Outros',
  fornecedores: 'Fornecedores',
  folha: 'Folha',
  aluguel: 'Aluguel',
  utilidades: 'Utilidades',
  manutencao: 'Manutenção',
  marketing: 'Marketing',
  impostos: 'Impostos',
  outros_saida: 'Outros',
};

const ENTRADA_CATS: FluxoCategoria[] = ['vendas_balcao', 'delivery', 'eventos', 'outros_entrada'];
const SAIDA_CATS: FluxoCategoria[] = [
  'fornecedores', 'folha', 'aluguel', 'utilidades', 'manutencao', 'marketing', 'impostos', 'outros_saida',
];

type FilterTipo = 'todos' | 'entrada' | 'saida';

interface FormState {
  data: string;
  tipo: 'entrada' | 'saida';
  descricao: string;
  valor: string;
  categoria: FluxoCategoria;
  liquidado: boolean;
}

const defaultForm = (): FormState => ({
  data: new Date().toISOString().slice(0, 10),
  tipo: 'entrada',
  descricao: '',
  valor: '',
  categoria: 'vendas_balcao',
  liquidado: false,
});

function getISOWeek(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `W${String(week).padStart(2, '0')}`;
}

export function FluxoCaixaPage() {
  const now = new Date();
  const [selectedMes, setSelectedMes] = useState(now.getMonth() + 1);
  const [selectedAno, setSelectedAno] = useState(now.getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [editLancamento, setEditLancamento] = useState<FluxoLancamento | null>(null);
  const [filterTipo, setFilterTipo] = useState<FilterTipo>('todos');
  const [form, setForm] = useState<FormState>(defaultForm());

  const { adicionarLancamento, atualizarLancamento, excluirLancamento, getEmpresaAtiva } = useStore();
  const empresa = getEmpresaAtiva();

  const monthPrefix = `${selectedAno}-${String(selectedMes).padStart(2, '0')}`;

  const allLancamentos: FluxoLancamento[] = useMemo(
    () => (empresa?.fluxoCaixa ?? []).filter((l) => l.data.startsWith(monthPrefix)),
    [empresa, monthPrefix],
  );

  const filteredLancamentos = useMemo(() => {
    const list =
      filterTipo === 'todos'
        ? allLancamentos
        : allLancamentos.filter((l) => l.tipo === filterTipo);
    return [...list].sort((a, b) => b.data.localeCompare(a.data));
  }, [allLancamentos, filterTipo]);

  const totalEntradas = useMemo(
    () => allLancamentos.filter((l) => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0),
    [allLancamentos],
  );
  const totalSaidas = useMemo(
    () => allLancamentos.filter((l) => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0),
    [allLancamentos],
  );
  const saldo = totalEntradas - totalSaidas;

  const weeklyData = useMemo(() => {
    const map: Record<string, { semana: string; entradas: number; saidas: number }> = {};
    allLancamentos.forEach((l) => {
      const w = getISOWeek(l.data);
      if (!map[w]) map[w] = { semana: w, entradas: 0, saidas: 0 };
      if (l.tipo === 'entrada') map[w].entradas += l.valor;
      else map[w].saidas += l.valor;
    });
    return Object.values(map).sort((a, b) => a.semana.localeCompare(b.semana));
  }, [allLancamentos]);

  const openAdd = () => {
    setEditLancamento(null);
    setForm(defaultForm());
    setShowModal(true);
  };

  const openEdit = (l: FluxoLancamento) => {
    setEditLancamento(l);
    setForm({
      data: l.data,
      tipo: l.tipo,
      descricao: l.descricao,
      valor: String(l.valor),
      categoria: l.categoria,
      liquidado: l.liquidado,
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!empresa) return;
    const payload = {
      data: form.data,
      tipo: form.tipo,
      descricao: form.descricao,
      valor: parseFloat(form.valor) || 0,
      categoria: form.categoria,
      liquidado: form.liquidado,
    };
    if (editLancamento) {
      atualizarLancamento(empresa.id, editLancamento.id, payload);
    } else {
      adicionarLancamento(empresa.id, payload);
    }
    setShowModal(false);
  };

  const toggleLiquidado = (l: FluxoLancamento) => {
    if (!empresa) return;
    atualizarLancamento(empresa.id, l.id, { liquidado: !l.liquidado });
  };

  const cats = form.tipo === 'entrada' ? ENTRADA_CATS : SAIDA_CATS;

  const MES_NOMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ];

  return (
    <div style={{ background: '#0d1117', minHeight: '100vh', padding: '24px', color: '#e6edf3' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e6edf3', margin: 0 }}>Fluxo de Caixa</h1>
            <p style={{ color: '#8b949e', margin: '4px 0 0', fontSize: 14 }}>Controle de entradas e saídas</p>
          </div>
          <Button onClick={openAdd} style={{ background: '#e8a020', color: '#0d1117', fontWeight: 700, border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Novo Lançamento
          </Button>
        </div>

        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Entradas', value: totalEntradas, color: '#10b981' },
            { label: 'Saídas', value: totalSaidas, color: '#ef4444' },
            { label: 'Saldo', value: saldo, color: saldo >= 0 ? '#10b981' : '#ef4444' },
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
          {(['todos', 'entrada', 'saida'] as FilterTipo[]).map((t) => (
            <button
              key={t}
              onClick={() => setFilterTipo(t)}
              style={{
                background: filterTipo === t ? '#e8a020' : '#21262d',
                color: filterTipo === t ? '#0d1117' : '#e6edf3',
                border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              }}
            >
              {t === 'todos' ? 'Todos' : t === 'entrada' ? 'Entradas' : 'Saídas'}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#0d1117' }}>
                {['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Liquidado', 'Ações'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#8b949e', fontWeight: 600, fontSize: 12, borderBottom: '1px solid #21262d' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLancamentos.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#8b949e' }}>Nenhum lançamento neste período</td>
                </tr>
              )}
              {filteredLancamentos.map((l) => {
                const borderColor = l.tipo === 'entrada' ? '#10b981' : '#ef4444';
                const [y, m, d] = l.data.split('-');
                const dataFmt = `${d}/${m}/${y}`;
                return (
                  <tr key={l.id} style={{ borderLeft: `3px solid ${borderColor}`, borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '10px 14px', color: '#e6edf3' }}>{dataFmt}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        background: l.tipo === 'entrada' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: l.tipo === 'entrada' ? '#10b981' : '#ef4444',
                        padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                      }}>
                        {l.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#e6edf3' }}>{l.descricao}</td>
                    <td style={{ padding: '10px 14px', color: '#8b949e' }}>{CATEGORY_LABELS[l.categoria] ?? l.categoria}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: l.tipo === 'entrada' ? '#10b981' : '#ef4444' }}>{fmtBRL(l.valor)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <input type="checkbox" checked={l.liquidado} onChange={() => toggleLiquidado(l)} style={{ cursor: 'pointer', accentColor: '#e8a020' }} />
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => openEdit(l)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e', padding: 4 }}>
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => { if (empresa) excluirLancamento(empresa.id, l.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
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

        {/* Weekly Chart */}
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, padding: '16px 20px' }}>
          <p style={{ margin: '0 0 12px', fontWeight: 600, fontSize: 14, color: '#8b949e' }}>Entradas vs Saídas por Semana</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="semana" tick={{ fill: '#8b949e', fontSize: 12 }} />
              <YAxis tick={{ fill: '#8b949e', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#161b22', border: '1px solid #21262d', color: '#e6edf3', borderRadius: 6 }}
                formatter={(value) => [fmtBRL(Number(value)), '']}
              />
              <Bar dataKey="entradas" name="Entradas" fill="#e8a020" radius={[3, 3, 0, 0]} />
              <Bar dataKey="saidas" name="Saídas" fill="#ef8070" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editLancamento ? 'Editar Lançamento' : 'Novo Lançamento'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Data"
            type="date"
            value={form.data}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, data: e.target.value })}
          />
          <div>
            <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>Tipo</label>
            <select
              value={form.tipo}
              onChange={(e) => {
                const tipo = e.target.value as 'entrada' | 'saida';
                setForm({ ...form, tipo, categoria: tipo === 'entrada' ? 'vendas_balcao' : 'fornecedores' });
              }}
              style={{ width: '100%', background: '#0d1117', border: '1px solid #21262d', color: '#e6edf3', borderRadius: 6, padding: '8px 10px', fontSize: 14 }}
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
          </div>
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
          <div>
            <label style={{ fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 }}>Categoria</label>
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value as FluxoCategoria })}
              style={{ width: '100%', background: '#0d1117', border: '1px solid #21262d', color: '#e6edf3', borderRadius: 6, padding: '8px 10px', fontSize: 14 }}
            >
              {cats.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#e6edf3', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.liquidado}
              onChange={(e) => setForm({ ...form, liquidado: e.target.checked })}
              style={{ accentColor: '#e8a020' }}
            />
            Liquidado
          </label>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Button onClick={() => setShowModal(false)} style={{ background: '#21262d', color: '#e6edf3', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} style={{ background: '#e8a020', color: '#0d1117', fontWeight: 700, border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>
              {editLancamento ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
