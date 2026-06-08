import React, { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, TrendingUp, Info } from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { useStore } from '../../store/useStore';
import type { Transacao, CategoriaFin } from '../../store/bancoTypes';
import { CATEGORIAS, categoriasPorPerfil } from '../../store/bancoTypes';
import { projecaoEntregadores } from '../../store/entregadorSelectors';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const labelCat = (c: string) => CATEGORIAS[c as CategoriaFin]?.label
  ?? ({ fornecedores: 'Fornecedores' } as Record<string, string>)[c]
  ?? c;

type FilterTipo = 'todos' | 'entrada' | 'saida';
type FilterOrigem = 'tudo' | 'realizado' | 'previsto';

interface FluxoItem {
  id: string;
  data: string;            // YYYY-MM-DD
  tipo: 'entrada' | 'saida';
  valor: number;
  descricao: string;
  categoria: string;
  contaId?: string;
  contaNome?: string;
  origem: 'realizado' | 'previsto';
  fonte: 'transacao' | 'pagar' | 'receber' | 'recorrente';
}

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
  tipo: 'entrada', descricao: '', valor: '', categoria: 'vendas_balcao', contaId,
});

const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export function FluxoCaixaPage() {
  const now = new Date();
  const hoje = now.toISOString().slice(0, 10);
  const [selectedMes, setSelectedMes] = useState(now.getMonth() + 1);
  const [selectedAno, setSelectedAno] = useState(now.getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterTipo, setFilterTipo] = useState<FilterTipo>('todos');
  const [filterOrigem, setFilterOrigem] = useState<FilterOrigem>('tudo');
  const [filterConta, setFilterConta] = useState<string>('todas');
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');
  const [form, setForm] = useState<FormState>(defaultForm(''));

  const {
    getBanco, registrarTransacao, editarTransacao, excluirTransacao,
    getEmpresaAtiva, contarDuplicatasMigracao, removerDuplicatasMigracao,
  } = useStore();

  const empresa = getEmpresaAtiva();
  const banco = getBanco(PERFIL);
  const contas = banco.contas;
  const contaPadraoId = useMemo(() => (contas.find(c => c.contaPadrao) ?? contas[0])?.id ?? '', [contas]);
  const contaNome = (id?: string) => contas.find(c => c.id === id)?.nome;

  // ── Limpeza de duplicatas (resíduo da migração antiga) ────────────────────
  const [removidas, setRemovidas] = useState(-1);
  const dupCount = useMemo(() => contarDuplicatasMigracao(PERFIL), [banco.transacoes, contarDuplicatasMigracao]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthPrefix = `${selectedAno}-${String(selectedMes).padStart(2, '0')}`;
  const monthEnd = `${monthPrefix}-${String(new Date(selectedAno, selectedMes, 0).getDate()).padStart(2, '0')}`;

  // ── REALIZADO: transações efetivadas (exclui transferências internas) ─────
  const realizado = useMemo<FluxoItem[]>(() => {
    return banco.transacoes
      .filter(t => t.categoria !== 'transferencia' && !t.transferenciaId)
      .filter(t => t.data.startsWith(monthPrefix))
      .map(t => ({
        id: t.id, data: t.data.slice(0, 10), tipo: t.tipo, valor: t.valor,
        descricao: t.descricao, categoria: t.categoria, contaId: t.contaId,
        contaNome: contaNome(t.contaId), origem: 'realizado' as const, fonte: 'transacao' as const,
      }));
  }, [banco.transacoes, monthPrefix]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── PREVISTO: contas em aberto + recorrentes futuros (no mês) ─────────────
  const previsto = useMemo<FluxoItem[]>(() => {
    const out: FluxoItem[] = [];
    // contas a pagar em aberto (status != pago)
    (empresa?.contasPagar ?? []).filter(c => c.status !== 'pago').forEach(c => {
      const v = c.vencimento.slice(0, 10);
      if (v.startsWith(monthPrefix)) out.push({
        id: 'pg-' + c.id, data: v, tipo: 'saida', valor: c.valor, descricao: c.descricao,
        categoria: c.categoria, origem: 'previsto', fonte: 'pagar',
      });
    });
    // contas a receber em aberto (status != recebido)
    (empresa?.contasReceber ?? []).filter(c => c.status !== 'recebido').forEach(c => {
      const v = c.vencimento.slice(0, 10);
      if (v.startsWith(monthPrefix)) out.push({
        id: 'rc-' + c.id, data: v, tipo: 'entrada', valor: c.valor, descricao: c.descricao,
        categoria: c.categoria, origem: 'previsto', fonte: 'receber',
      });
    });
    // recorrentes ativos — ocorrências futuras dentro do mês (evita duplicar com realizado)
    banco.recorrentes.filter(r => r.ativo).forEach(r => {
      const passo = r.frequencia === 'diaria' ? 1 : r.frequencia === 'semanal' ? 7 : r.frequencia === 'mensal' ? 30 : 365;
      let cursor = r.proximaData.slice(0, 10);
      let guard = 0;
      while (cursor <= monthEnd && guard < 120) {
        if (cursor.startsWith(monthPrefix) && cursor > hoje) {
          out.push({
            id: `rec-${r.id}-${cursor}`, data: cursor, tipo: r.tipo, valor: r.valor,
            descricao: r.descricao + ' (recorrente)', categoria: r.categoria, contaId: r.contaId,
            contaNome: contaNome(r.contaId), origem: 'previsto', fonte: 'recorrente',
          });
        }
        cursor = addDays(cursor, passo);
        guard++;
      }
    });
    // pagamentos semanais futuros de entregadores (estimado), dentro do mês e após hoje
    if (empresa) {
      const monthStart = `${monthPrefix}-01`;
      const desde = monthStart > hoje ? monthStart : hoje;
      projecaoEntregadores(empresa, desde, monthEnd).forEach(p => {
        out.push({
          id: `entreg-${p.semIni}`, data: p.data, tipo: 'saida', valor: p.valor,
          descricao: 'Entregadores (estimado)', categoria: 'folha', origem: 'previsto', fonte: 'recorrente',
        });
      });
    }
    return out;
  }, [empresa, banco.recorrentes, monthPrefix, monthEnd, hoje]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Combinado + filtros ───────────────────────────────────────────────────
  const itens = useMemo(() => {
    let list = [...realizado, ...previsto];
    if (filterOrigem !== 'tudo') list = list.filter(i => i.origem === filterOrigem);
    if (filterTipo !== 'todos') list = list.filter(i => i.tipo === filterTipo);
    if (filterConta !== 'todas') list = list.filter(i => i.contaId === filterConta);
    if (filterCategoria !== 'todas') list = list.filter(i => i.categoria === filterCategoria);
    return list.sort((a, b) => b.data.localeCompare(a.data));
  }, [realizado, previsto, filterOrigem, filterTipo, filterConta, filterCategoria]);

  // ── Totais ────────────────────────────────────────────────────────────────
  const sum = (arr: FluxoItem[], tipo: 'entrada' | 'saida') => arr.filter(i => i.tipo === tipo).reduce((s, i) => s + i.valor, 0);
  const entradasReal = sum(realizado, 'entrada');
  const saidasReal = sum(realizado, 'saida');
  const entradasPrev = sum(previsto, 'entrada');
  const saidasPrev = sum(previsto, 'saida');
  const saldoRealizado = entradasReal - saidasReal;
  const saldoProjetado = saldoRealizado + (entradasPrev - saidasPrev);

  // ── Projeção dos próximos 30 dias (independente do mês) ───────────────────
  const projecao30 = useMemo(() => {
    const limite = addDays(hoje, 30);
    let entradas = 0, saidas = 0;
    banco.recorrentes.filter(r => r.ativo).forEach(r => {
      const passo = r.frequencia === 'diaria' ? 1 : r.frequencia === 'semanal' ? 7 : r.frequencia === 'mensal' ? 30 : 365;
      let cursor = r.proximaData.slice(0, 10); let guard = 0;
      while (cursor <= limite && guard < 60) {
        if (cursor > hoje) { if (r.tipo === 'entrada') entradas += r.valor; else saidas += r.valor; }
        cursor = addDays(cursor, passo); guard++;
      }
    });
    (empresa?.contasPagar ?? []).filter(c => c.status !== 'pago').forEach(c => {
      const v = c.vencimento.slice(0, 10); if (v > hoje && v <= limite) saidas += c.valor;
    });
    (empresa?.contasReceber ?? []).filter(c => c.status !== 'recebido').forEach(c => {
      const v = c.vencimento.slice(0, 10); if (v > hoje && v <= limite) entradas += c.valor;
    });
    // entregadores (estimativa semanal)
    if (empresa) projecaoEntregadores(empresa, hoje, limite).forEach(p => { saidas += p.valor; });
    return { entradas, saidas, saldo: entradas - saidas };
  }, [banco.recorrentes, empresa, hoje]);

  // ── Gráfico: realizado x previsto por dia + saldo acumulado ───────────────
  const chartData = useMemo(() => {
    const dias: Record<string, { eR: number; sR: number; eP: number; sP: number }> = {};
    const get = (d: string) => (dias[d] ??= { eR: 0, sR: 0, eP: 0, sP: 0 });
    realizado.forEach(i => { const x = get(i.data.slice(8, 10)); if (i.tipo === 'entrada') x.eR += i.valor; else x.sR += i.valor; });
    previsto.forEach(i => { const x = get(i.data.slice(8, 10)); if (i.tipo === 'entrada') x.eP += i.valor; else x.sP += i.valor; });
    let acc = 0;
    return Object.keys(dias).sort().map(dia => {
      const x = dias[dia];
      acc += x.eR - x.sR + x.eP - x.sP;
      return { dia, entradasReal: x.eR, saidasReal: x.sR, entradasPrev: x.eP, saidasPrev: x.sP, acumulado: acc };
    });
  }, [realizado, previsto]);

  // ── CRUD (cria/edita TRANSAÇÃO real) ──────────────────────────────────────
  const openAdd = () => { setEditId(null); setForm(defaultForm(contaPadraoId)); setShowModal(true); };
  const openEdit = (i: FluxoItem) => {
    if (i.fonte !== 'transacao') return; // só realizado é editável aqui
    const t = banco.transacoes.find(x => x.id === i.id); if (!t) return;
    setEditId(t.id);
    setForm({ data: t.data.slice(0, 10), tipo: t.tipo, descricao: t.descricao, valor: String(t.valor), categoria: t.categoria, contaId: t.contaId });
    setShowModal(true);
  };
  const handleSubmit = () => {
    if (!form.contaId) return;
    const payload: Omit<Transacao, 'id'> = {
      contaId: form.contaId, tipo: form.tipo, valor: parseFloat(form.valor) || 0,
      descricao: form.descricao, categoria: form.categoria, data: form.data,
      recorrente: false, origemAuto: 'manual',
    };
    if (editId) editarTransacao(editId, payload, PERFIL);
    else registrarTransacao(payload, PERFIL);
    setShowModal(false);
  };

  const cats = categoriasPorPerfil(PERFIL, form.tipo);
  const todasCats = useMemo(() => [...new Set([...realizado, ...previsto].map(i => i.categoria))], [realizado, previsto]);
  const MES_NOMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const semContas = contas.length === 0;

  return (
    <div style={{ background: '#0d1117', minHeight: '100vh', padding: '24px', color: '#e6edf3' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e6edf3', margin: 0 }}>Fluxo de Caixa</h1>
            <p style={{ color: '#8b949e', margin: '4px 0 0', fontSize: 14 }}>Realizado (transações) + previsto (contas e recorrentes)</p>
          </div>
          <Button onClick={openAdd} disabled={semContas} style={{ background: semContas ? '#3a2e10' : '#e8a020', color: '#0d1117', fontWeight: 700, border: 'none', padding: '8px 16px', borderRadius: 6, cursor: semContas ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: semContas ? 0.6 : 1 }}>
            <Plus size={16} /> Novo Lançamento
          </Button>
        </div>

        {dupCount > 0 && removidas < 0 && (
          <div style={{ ...bannerStyle('#ef4444'), justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Info size={15} /> {dupCount} lançamento(s) duplicado(s) detectado(s) (resíduo de migração) inflando o saldo.
            </span>
            <button onClick={() => setRemovidas(removerDuplicatasMigracao(PERFIL))}
              style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
              Remover duplicados
            </button>
          </div>
        )}
        {removidas > 0 && (
          <div style={bannerStyle('#1d9e75')}><Info size={15} /> {removidas} duplicado(s) removido(s). O saldo das contas foi corrigido.</div>
        )}
        {semContas && (
          <div style={bannerStyle('#e8a020')}><Info size={15} /> Cadastre uma conta bancária (Empresa → Minhas Contas) para lançar movimentações.</div>
        )}

        {/* KPI Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Entradas realizadas', value: entradasReal, color: '#10b981' },
            { label: 'Saídas realizadas', value: saidasReal, color: '#ef4444' },
            { label: 'Saldo realizado', value: saldoRealizado, color: saldoRealizado >= 0 ? '#10b981' : '#ef4444' },
            { label: 'Saldo projetado (mês)', value: saldoProjetado, color: saldoProjetado >= 0 ? '#3b82f6' : '#e8a020' },
          ].map((k) => (
            <div key={k.label} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, padding: '14px 18px' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#8b949e' }}>{k.label}</p>
              <p style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: k.color }}>{fmtBRL(k.value)}</p>
            </div>
          ))}
        </div>

        {/* Previsto detalhe + projeção 30d */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#161b22', border: '1px solid #21262d', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#8b949e', flexWrap: 'wrap' }}>
          <TrendingUp size={15} style={{ color: '#3b82f6' }} />
          Previsto no mês: <strong style={{ color: '#10b981' }}>+{fmtBRL(entradasPrev)}</strong> / <strong style={{ color: '#ef4444' }}>−{fmtBRL(saidasPrev)}</strong>
          <span style={{ color: '#30363d' }}>|</span>
          Próximos 30 dias: <strong style={{ color: '#10b981' }}>+{fmtBRL(projecao30.entradas)}</strong> / <strong style={{ color: '#ef4444' }}>−{fmtBRL(projecao30.saidas)}</strong> (líquido {fmtBRL(projecao30.saldo)})
        </div>

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
            {todasCats.map(c => <option key={c} value={c}>{labelCat(c)}</option>)}
          </select>
          {(['todos', 'entrada', 'saida'] as FilterTipo[]).map((t) => (
            <button key={t} onClick={() => setFilterTipo(t)} style={pillStyle(filterTipo === t)}>
              {t === 'todos' ? 'Todos' : t === 'entrada' ? 'Entradas' : 'Saídas'}
            </button>
          ))}
          <span style={{ color: '#30363d' }}>|</span>
          {(['tudo', 'realizado', 'previsto'] as FilterOrigem[]).map((o) => (
            <button key={o} onClick={() => setFilterOrigem(o)} style={pillStyle(filterOrigem === o)}>
              {o === 'tudo' ? 'Tudo' : o === 'realizado' ? 'Só realizado' : 'Só previsto'}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, overflow: 'auto', marginBottom: 24 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#0d1117' }}>
                {['Data', 'Situação', 'Tipo', 'Descrição', 'Conta', 'Categoria', 'Valor', 'Ações'].map((h) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#8b949e', fontWeight: 600, fontSize: 12, borderBottom: '1px solid #21262d', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itens.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: '#8b949e' }}>Nenhuma movimentação neste período.</td></tr>
              )}
              {itens.map((i) => {
                const cor = i.tipo === 'entrada' ? '#10b981' : '#ef4444';
                const prev = i.origem === 'previsto';
                const [y, m, d] = i.data.split('-');
                return (
                  <tr key={i.id} style={{ borderLeft: `3px ${prev ? 'dashed' : 'solid'} ${cor}`, borderBottom: '1px solid #21262d', opacity: prev ? 0.72 : 1 }}>
                    <td style={{ padding: '10px 14px', color: '#e6edf3', whiteSpace: 'nowrap' }}>{`${d}/${m}/${y}`}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: prev ? 'rgba(59,130,246,0.12)' : 'rgba(139,148,158,0.12)', color: prev ? '#3b82f6' : '#8b949e', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                        {prev ? 'Previsto' : 'Realizado'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: i.tipo === 'entrada' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: cor, padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                        {i.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#e6edf3' }}>{i.descricao}</td>
                    <td style={{ padding: '10px 14px', color: '#8b949e', whiteSpace: 'nowrap' }}>{i.contaNome ?? '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#8b949e' }}>{labelCat(i.categoria)}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: cor, whiteSpace: 'nowrap' }}>{fmtBRL(i.valor)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {i.fonte === 'transacao' ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => openEdit(i)} style={iconBtn('#8b949e')}><Pencil size={15} /></button>
                          <button onClick={() => excluirTransacao(i.id, PERFIL)} style={iconBtn('#ef4444')}><Trash2 size={15} /></button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: '#484f58' }}>{i.fonte === 'pagar' ? 'a pagar' : i.fonte === 'receber' ? 'a receber' : 'recorrente'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Chart */}
        <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 8, padding: '16px 20px' }}>
          <p style={{ margin: '0 0 12px', fontWeight: 600, fontSize: 14, color: '#8b949e' }}>Realizado vs previsto e saldo acumulado (dia)</p>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
              <XAxis dataKey="dia" tick={{ fill: '#8b949e', fontSize: 12 }} />
              <YAxis tick={{ fill: '#8b949e', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #21262d', color: '#e6edf3', borderRadius: 6 }} formatter={(v, n) => [fmtBRL(Number(v)), String(n)]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="entradasReal" name="Entradas (real)" stackId="e" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="entradasPrev" name="Entradas (prev)" stackId="e" fill="#10b98155" radius={[3, 3, 0, 0]} />
              <Bar dataKey="saidasReal" name="Saídas (real)" stackId="s" fill="#ef4444" radius={[3, 3, 0, 0]} />
              <Bar dataKey="saidasPrev" name="Saídas (prev)" stackId="s" fill="#ef444455" radius={[3, 3, 0, 0]} />
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
              {cats.map((c) => <option key={c} value={c}>{labelCat(c)}</option>)}
            </select>
          </div>
          <p style={{ fontSize: 12, color: '#8b949e', margin: 0 }}>Gravado como transação real (realizado) — aparece também em Transações e no saldo da conta.</p>
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
const pillStyle = (active: boolean): React.CSSProperties => ({ background: active ? '#e8a020' : '#21262d', color: active ? '#0d1117' : '#e6edf3', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13 });
const iconBtn = (color: string): React.CSSProperties => ({ background: 'none', border: 'none', cursor: 'pointer', color, padding: 4 });
const bannerStyle = (color: string): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 8, background: `${color}1f`, border: `1px solid ${color}44`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color });
