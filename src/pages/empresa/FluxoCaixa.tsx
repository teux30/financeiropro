import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Pencil, Trash2, TrendingUp, Info } from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { useStore } from '../../store/useStore';
import type { Transacao, CategoriaFin } from '../../store/bancoTypes';
import { CATEGORIAS, categoriasPorPerfil } from '../../store/bancoTypes';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

type FilterTipo = 'todos' | 'entrada' | 'saida';

interface FormState {
  data: string;
  tipo: 'entrada' | 'saida';
  descricao: string;
  valor: string;
  categoria: CategoriaFin;
  contaId: string;
}

const PERFIL = 'empresa' as const;

const defaultForm = (contaId: string): FormState => ({
  data: new Date().toISOString().slice(0, 10),
  tipo: 'entrada',
  descricao: '',
  valor: '',
  categoria: 'vendas_balcao',
  contaId,
});

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export function FluxoCaixaPage() {
  const now = new Date();
  const [selectedMes, setSelectedMes] = useState(now.getMonth() + 1);
  const [selectedAno, setSelectedAno] = useState(now.getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterTipo, setFilterTipo] = useState<FilterTipo>('todos');
  const [filterConta, setFilterConta] = useState<string>('todas');
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');
  const [form, setForm] = useState<FormState>(defaultForm(''));

  const {
    getBanco, registrarTransacao, editarTransacao, excluirTransacao,
    getEmpresaAtiva, migrarFluxoParaTransacoes,
  } = useStore();

  const empresa = getEmpresaAtiva();
  const banco = getBanco(PERFIL);
  const contas = banco.contas;
  const contaPadraoId = useMemo(
    () => (contas.find(c => c.contaPadrao) ?? contas[0])?.id ?? '',
    [contas],
  );

  // ── Migração automática de lançamentos órfãos (uma vez) ───────────────────
  const [migradas, setMigradas] = useState(0);
  useEffect(() => {
    if (empresa && (empresa.fluxoCaixa?.length ?? 0) > 0 && contaPadraoId) {
      const n = migrarFluxoParaTransacoes(empresa.id);
      if (n > 0) setMigradas(n);
    }
  }, [empresa, contaPadraoId, migrarFluxoParaTransacoes]);

  const monthPrefix = `${selectedAno}-${String(selectedMes).padStart(2, '0')}`;

  // ── FONTE ÚNICA: transações do perfil empresa (exclui transferências) ─────
  const txDoMes = useMemo(() => {
    return banco.transacoes
      .filter(t => t.categoria !== 'transferencia' && !t.transferenciaId)
      .filter(t => t.data.startsWith(monthPrefix))
      .filter(t => filterConta === 'todas' || t.contaId === filterConta);
  }, [banco.transacoes, monthPrefix, filterConta]);

  const filtered = useMemo(() => {
    let list = txDoMes;
    if (filterTipo !== 'todos') list = list.filter(t => t.tipo === filterTipo);
    if (filterCategoria !== 'todas') list = list.filter(t => t.categoria === filterCategoria);
    return [...list].sort((a, b) => b.data.localeCompare(a.data));
  }, [txDoMes, filterTipo, filterCategoria]);

  const totalEntradas = useMemo(() => txDoMes.filter(t => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0), [txDoMes]);
  const totalSaidas = useMemo(() => txDoMes.filter(t => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0), [txDoMes]);
  const saldo = totalEntradas - totalSaidas;

  // ── Saldo acumulado dia a dia (gráfico) ───────────────────────────────────
  const chartData = useMemo(() => {
    const porDia: Record<string, { entradas: number; saidas: number }> = {};
    txDoMes.forEach(t => {
      const dia = t.data.slice(8, 10);
      if (!porDia[dia]) porDia[dia] = { entradas: 0, saidas: 0 };
      if (t.tipo === 'entrada') porDia[dia].entradas += t.valor;
      else porDia[dia].saidas += t.valor;
    });
    let acumulado = 0;
    return Object.keys(porDia).sort().map(dia => {
      acumulado += porDia[dia].entradas - porDia[dia].saidas;
      return { dia, entradas: porDia[dia].entradas, saidas: porDia[dia].saidas, acumulado };
    });
  }, [txDoMes]);

  // ── Projeção dos próximos 30 dias ─────────────────────────────────────────
  const projecao = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const limite = addDays(hoje, 30);
    let entradas = 0, saidas = 0;
    // recorrentes ativos (empresa)
    banco.recorrentes.filter(r => r.ativo).forEach(r => {
      let cursor = r.proximaData.slice(0, 10);
      const passo = r.frequencia === 'diaria' ? 1 : r.frequencia === 'semanal' ? 7 : r.frequencia === 'mensal' ? 30 : 365;
      let guard = 0;
      while (cursor <= limite && guard < 60) {
        if (cursor > hoje) { if (r.tipo === 'entrada') entradas += r.valor; else saidas += r.valor; }
        cursor = addDays(cursor, passo);
        guard++;
      }
    });
    // contas a pagar agendadas
    (empresa?.contasPagar ?? []).filter(c => c.status === 'pendente').forEach(c => {
      const v = c.vencimento.slice(0, 10);
      if (v > hoje && v <= limite) saidas += c.valor;
    });
    // contas a receber agendadas
    (empresa?.contasReceber ?? []).filter(c => c.status !== 'recebido').forEach(c => {
      const v = c.vencimento.slice(0, 10);
      if (v > hoje && v <= limite) entradas += c.valor;
    });
    return { entradas, saidas, saldo: entradas - saidas };
  }, [banco.recorrentes, empresa]);

  // ── Form / CRUD (cria TRANSAÇÃO real) ─────────────────────────────────────
  const openAdd = () => {
    setEditId(null);
    setForm(defaultForm(contaPadraoId));
    setShowModal(true);
  };

  const openEdit = (t: Transacao) => {
    setEditId(t.id);
    setForm({ data: t.data.slice(0, 10), tipo: t.tipo, descricao: t.descricao, valor: String(t.valor), categoria: t.categoria, contaId: t.contaId });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!form.contaId) return;
    const payload = {
      contaId: form.contaId,
      tipo: form.tipo,
      valor: parseFloat(form.valor) || 0,
      descricao: form.descricao,
      categoria: form.categoria,
      data: form.data,
      recorrente: false,
      origemAuto: 'manual' as const,
    };
    if (editId) editarTransacao(editId, payload, PERFIL);
    else registrarTransacao(payload, PERFIL);
    setShowModal(false);
  };

  const cats = categoriasPorPerfil(PERFIL, form.tipo);
  const todasCats = useMemo(() => {
    const set = new Set(txDoMes.map(t => t.categoria));
    return [...set];
  }, [txDoMes]);

  const MES_NOMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const semContas = contas.length === 0;

  return (
    <div style={{ background: '#0d1117', minHeight: '100vh', padding: '24px', color: '#e6edf3' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e6edf3', margin: 0 }}>Fluxo de Caixa</h1>
            <p style={{ color: '#8b949e', margin: '4px 0 0', fontSize: 14 }}>Derivado automaticamente das suas transações</p>
          </div>
          <Button onClick={openAdd} disabled={semContas} style={{ background: semContas ? '#3a2e10' : '#e8a020', color: '#0d1117', fontWeight: 700, border: 'none', padding: '8px 16px', borderRadius: 6, cursor: semContas ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: semContas ? 0.6 : 1 }}>
            <Plus size={16} /> Novo Lançamento
          </Button>
        </div>

        {migradas > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(29,158,117,0.12)', border: '1px solid #1d9e7544', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1d9e75' }}>
            <Info size={15} /> {migradas} lançamento(s) antigo(s) foram migrados para Transações.
          </div>
        )}

        {semContas && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(232,160,32,0.12)', border: '1px solid #e8a02044', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#e8a020' }}>
            <Info size={15} /> Cadastre uma conta bancária (perfil Empresa → Minhas Contas) para lançar movimentações.
          </div>
        )}

        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Entradas (mês)', value: totalEntradas, color: '#10b981' },
            { label: 'Saídas (mês)', value: totalSaidas, color: '#ef4444' },
            { label: 'Saldo do período', value: saldo, color: saldo >= 0 ? '#10b981' : '#ef4444' },
            { label: 'Projeção 30d', value: projecao.saldo, color: projecao.saldo >= 0 ? '#3b82f6' : '#e8a020' },
          ].map((k) => (
            <div key={k.label} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, padding: '14px 18px' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#8b949e' }}>{k.label}</p>
              <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: k.color }}>{fmtBRL(k.value)}</p>
            </div>
          ))}
        </div>

        {/* Projeção detalhe */}
        {(projecao.entradas > 0 || projecao.saidas > 0) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#161b22', border: '1px solid #21262d', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#8b949e', flexWrap: 'wrap' }}>
            <TrendingUp size={15} style={{ color: '#3b82f6' }} />
            Próximos 30 dias (recorrentes + contas agendadas):
            <strong style={{ color: '#10b981' }}>+{fmtBRL(projecao.entradas)}</strong> previstas,
            <strong style={{ color: '#ef4444' }}>−{fmtBRL(projecao.saidas)}</strong> a pagar/receber.
          </div>
        )}

        {/* Filter Bar */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <select value={selectedMes} onChange={(e) => setSelectedMes(Number(e.target.value))} style={selStyle}>
            {MES_NOMES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <input type="number" value={selectedAno} onChange={(e) => setSelectedAno(Number(e.target.value))} style={{ ...selStyle, width: 90 }} />
          <select value={filterConta} onChange={(e) => setFilterConta(e.target.value)} style={selStyle}>
            <option value="todas">Todas as contas</option>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select value={filterCategoria} onChange={(e) => setFilterCategoria(e.target.value)} style={selStyle}>
            <option value="todas">Todas categorias</option>
            {todasCats.map(c => <option key={c} value={c}>{CATEGORIAS[c]?.label ?? c}</option>)}
          </select>
          {(['todos', 'entrada', 'saida'] as FilterTipo[]).map((t) => (
            <button key={t} onClick={() => setFilterTipo(t)} style={{ background: filterTipo === t ? '#e8a020' : '#21262d', color: filterTipo === t ? '#0d1117' : '#e6edf3', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              {t === 'todos' ? 'Todos' : t === 'entrada' ? 'Entradas' : 'Saídas'}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, overflow: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#0d1117' }}>
                {['Data', 'Tipo', 'Descrição', 'Conta', 'Categoria', 'Valor', 'Ações'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#8b949e', fontWeight: 600, fontSize: 12, borderBottom: '1px solid #21262d', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#8b949e' }}>Nenhuma movimentação neste período. Registre uma transação para vê-la aqui.</td></tr>
              )}
              {filtered.map((t) => {
                const borderColor = t.tipo === 'entrada' ? '#10b981' : '#ef4444';
                const [y, m, d] = t.data.slice(0, 10).split('-');
                const conta = contas.find(c => c.id === t.contaId);
                return (
                  <tr key={t.id} style={{ borderLeft: `3px solid ${borderColor}`, borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '10px 14px', color: '#e6edf3', whiteSpace: 'nowrap' }}>{`${d}/${m}/${y}`}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: t.tipo === 'entrada' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: t.tipo === 'entrada' ? '#10b981' : '#ef4444', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                        {t.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#e6edf3' }}>{t.descricao}</td>
                    <td style={{ padding: '10px 14px', color: '#8b949e', whiteSpace: 'nowrap' }}>{conta?.nome ?? '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#8b949e' }}>{CATEGORIAS[t.categoria]?.label ?? t.categoria}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: t.tipo === 'entrada' ? '#10b981' : '#ef4444', whiteSpace: 'nowrap' }}>{fmtBRL(t.valor)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => openEdit(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e', padding: 4 }}><Pencil size={15} /></button>
                        <button onClick={() => excluirTransacao(t.id, PERFIL)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Chart: entradas/saídas + saldo acumulado */}
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, padding: '16px 20px' }}>
          <p style={{ margin: '0 0 12px', fontWeight: 600, fontSize: 14, color: '#8b949e' }}>Entradas vs Saídas e saldo acumulado (dia)</p>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="dia" tick={{ fill: '#8b949e', fontSize: 12 }} />
              <YAxis tick={{ fill: '#8b949e', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #21262d', color: '#e6edf3', borderRadius: 6 }} formatter={(value, name) => [fmtBRL(Number(value)), name === 'entradas' ? 'Entradas' : name === 'saidas' ? 'Saídas' : 'Acumulado']} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke="#e8a020" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? 'Editar Lançamento' : 'Novo Lançamento'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Data" type="date" value={form.data} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, data: e.target.value })} />
          <div>
            <label style={lblStyle}>Tipo</label>
            <select value={form.tipo} onChange={(e) => { const tipo = e.target.value as 'entrada' | 'saida'; setForm({ ...form, tipo, categoria: categoriasPorPerfil(PERFIL, tipo)[0] }); }} style={inputStyle}>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </select>
          </div>
          <div>
            <label style={lblStyle}>Conta bancária</label>
            <select value={form.contaId} onChange={(e) => setForm({ ...form, contaId: e.target.value })} style={inputStyle}>
              {contas.length === 0 && <option value="">Nenhuma conta cadastrada</option>}
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <Input label="Descrição" value={form.descricao} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, descricao: e.target.value })} />
          <Input label="Valor R$" type="number" value={form.valor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, valor: e.target.value })} />
          <div>
            <label style={lblStyle}>Categoria</label>
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaFin })} style={inputStyle}>
              {cats.map((c) => <option key={c} value={c}>{CATEGORIAS[c]?.label ?? c}</option>)}
            </select>
          </div>
          <p style={{ fontSize: 12, color: '#8b949e', margin: 0 }}>Este lançamento será gravado como uma transação real e aparece também em Transações e no saldo da conta.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Button onClick={() => setShowModal(false)} style={{ background: '#21262d', color: '#e6edf3', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!form.contaId} style={{ background: '#e8a020', color: '#0d1117', fontWeight: 700, border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', opacity: form.contaId ? 1 : 0.5 }}>{editId ? 'Salvar' : 'Adicionar'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const selStyle: React.CSSProperties = { background: '#161b22', border: '1px solid #21262d', color: '#e6edf3', borderRadius: 6, padding: '6px 10px', fontSize: 14 };
const inputStyle: React.CSSProperties = { width: '100%', background: '#0d1117', border: '1px solid #21262d', color: '#e6edf3', borderRadius: 6, padding: '8px 10px', fontSize: 14 };
const lblStyle: React.CSSProperties = { fontSize: 13, color: '#8b949e', display: 'block', marginBottom: 6 };
