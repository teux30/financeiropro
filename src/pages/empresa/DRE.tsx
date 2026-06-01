import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Save, Download, ChevronDown } from 'lucide-react';
import { useStore } from '../../store/useStore';

// ─── Types (inline to avoid import issues if types not yet exported) ──────────
type DRECategoria =
  | 'receita'
  | 'deducao'
  | 'cmv'
  | 'despesa_op'
  | 'depreciacao'
  | 'imposto';

interface DRELinha {
  id: string;
  descricao: string;
  valor: number;
  categoria: DRECategoria;
  editavel: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const nanoid = () => Math.random().toString(36).slice(2, 9);

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const defaultTemplate = (): DRELinha[] => [
  { id: nanoid(), descricao: 'Vendas', valor: 0, categoria: 'receita', editavel: true },
  { id: nanoid(), descricao: 'Impostos e Deduções', valor: 0, categoria: 'deducao', editavel: true },
  { id: nanoid(), descricao: 'Custo das Mercadorias (CMV)', valor: 0, categoria: 'cmv', editavel: true },
  { id: nanoid(), descricao: 'Folha de Pagamento', valor: 0, categoria: 'despesa_op', editavel: true },
  { id: nanoid(), descricao: 'Aluguel', valor: 0, categoria: 'despesa_op', editavel: true },
  { id: nanoid(), descricao: 'Energia e Utilidades', valor: 0, categoria: 'despesa_op', editavel: true },
  { id: nanoid(), descricao: 'Marketing', valor: 0, categoria: 'despesa_op', editavel: true },
  { id: nanoid(), descricao: 'Depreciação', valor: 0, categoria: 'depreciacao', editavel: true },
  { id: nanoid(), descricao: 'IRPJ / CSLL', valor: 0, categoria: 'imposto', editavel: true },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
interface EditableCellProps {
  value: string | number;
  isEditing: boolean;
  type?: 'text' | 'number';
  onStartEdit: () => void;
  onChange: (val: string) => void;
  onBlur: () => void;
  style?: React.CSSProperties;
}

const EditableCell: React.FC<EditableCellProps> = ({
  value,
  isEditing,
  type = 'text',
  onStartEdit,
  onChange,
  onBlur,
  style,
}) => {
  if (isEditing) {
    return (
      <input
        autoFocus
        type={type}
        defaultValue={String(value)}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={(e) => e.key === 'Enter' && onBlur()}
        style={{
          background: '#0d1117',
          border: '1px solid #e8a020',
          borderRadius: 4,
          color: '#e6edf3',
          padding: '4px 8px',
          fontSize: 13,
          outline: 'none',
          width: type === 'number' ? 120 : '100%',
          ...style,
        }}
      />
    );
  }
  return (
    <span
      onClick={onStartEdit}
      style={{
        cursor: 'pointer',
        padding: '4px 6px',
        borderRadius: 4,
        display: 'inline-block',
        transition: 'background 0.15s',
        ...style,
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.background = 'rgba(232,160,32,0.08)')
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.background = 'transparent')
      }
    >
      {type === 'number' ? fmtBRL(Number(value)) : String(value)}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DRE() {
  const now = new Date();
  const getEmpresaAtiva = useStore((s: any) => s.getEmpresaAtiva);
  const salvarDREPeriodo = useStore((s: any) => s.salvarDREPeriodo);
  const empresa = getEmpresaAtiva();

  const [selectedMes, setSelectedMes] = useState<number>(now.getMonth() + 1);
  const [selectedAno, setSelectedAno] = useState<number>(now.getFullYear());
  const [linhas, setLinhas] = useState<DRELinha[]>(() => {
    if (!empresa) return defaultTemplate();
    const periodo = (empresa.dre ?? []).find(
      (p: any) => p.mes === now.getMonth() + 1 && p.ano === now.getFullYear()
    );
    return periodo ? periodo.linhas : defaultTemplate();
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<'descricao' | 'valor' | null>(null);
  const [editBuffer, setEditBuffer] = useState<string>('');

  // ── Load period when selector changes ───────────────────────────────────────
  const loadPeriodo = useCallback(
    (mes: number, ano: number) => {
      if (!empresa) { setLinhas(defaultTemplate()); return; }
      const periodo = (empresa.dre ?? []).find(
        (p: any) => p.mes === mes && p.ano === ano
      );
      setLinhas(periodo ? [...periodo.linhas] : defaultTemplate());
      setEditingId(null);
      setEditingField(null);
    },
    [empresa]
  );

  const handleMesChange = (mes: number) => {
    setSelectedMes(mes);
    loadPeriodo(mes, selectedAno);
  };

  const handleAnoChange = (ano: number) => {
    setSelectedAno(ano);
    loadPeriodo(selectedMes, ano);
  };

  // ── Totals ───────────────────────────────────────────────────────────────────
  const sum = (cat: DRECategoria) =>
    linhas.filter((l) => l.categoria === cat).reduce((a, l) => a + l.valor, 0);

  const receitaBruta = sum('receita');
  const deducoes = sum('deducao');
  const receitaLiquida = receitaBruta - deducoes;
  const cmv = sum('cmv');
  const lucroBruto = receitaLiquida - cmv;
  const despesasOp = sum('despesa_op');
  const ebitda = lucroBruto - despesasOp;
  const depreciacao = sum('depreciacao');
  const impostos = sum('imposto');
  const lucroLiquido = ebitda - depreciacao - impostos;

  // ── Editing helpers ──────────────────────────────────────────────────────────
  const startEdit = (id: string, field: 'descricao' | 'valor', current: string | number) => {
    setEditingId(id);
    setEditingField(field);
    setEditBuffer(String(current));
  };

  const commitEdit = () => {
    if (!editingId || !editingField) return;
    setLinhas((prev) =>
      prev.map((l) => {
        if (l.id !== editingId) return l;
        if (editingField === 'valor') {
          return { ...l, valor: parseFloat(editBuffer) || 0 };
        }
        return { ...l, descricao: editBuffer };
      })
    );
    setEditingId(null);
    setEditingField(null);
    setEditBuffer('');
  };

  const addLinha = (categoria: DRECategoria) => {
    const labels: Record<DRECategoria, string> = {
      receita: 'Nova Receita',
      deducao: 'Nova Dedução',
      cmv: 'Novo CMV',
      despesa_op: 'Nova Despesa',
      depreciacao: 'Nova Depreciação',
      imposto: 'Novo Imposto',
    };
    setLinhas((prev) => [
      ...prev,
      { id: nanoid(), descricao: labels[categoria], valor: 0, categoria, editavel: true },
    ]);
  };

  const removeLinha = (id: string) => {
    setLinhas((prev) => prev.filter((l) => l.id !== id));
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!empresa || !salvarDREPeriodo) return;
    salvarDREPeriodo(empresa.id, {
      id: nanoid(),
      mes: selectedMes,
      ano: selectedAno,
      linhas,
      observacao: '',
    });
  };

  // ── Export CSV ───────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows: string[][] = [
      ['Categoria', 'Descrição', 'Valor'],
      ...linhas.map((l) => [l.categoria, l.descricao, String(l.valor)]),
      [],
      ['', 'RECEITA BRUTA', String(receitaBruta)],
      ['', 'Deduções', String(deducoes)],
      ['', 'RECEITA LÍQUIDA', String(receitaLiquida)],
      ['', 'CMV', String(cmv)],
      ['', 'LUCRO BRUTO', String(lucroBruto)],
      ['', 'Despesas Operacionais', String(despesasOp)],
      ['', 'EBITDA', String(ebitda)],
      ['', 'Depreciação', String(depreciacao)],
      ['', 'Impostos sobre Lucro', String(impostos)],
      ['', 'LUCRO LÍQUIDO', String(lucroLiquido)],
    ];
    const csv = rows.map((r) => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DRE_${MONTH_NAMES[selectedMes - 1]}_${selectedAno}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Row renderer ─────────────────────────────────────────────────────────────
  const renderLinhas = (cat: DRECategoria) =>
    linhas
      .filter((l) => l.categoria === cat)
      .map((linha) => (
        <tr
          key={linha.id}
          style={{ borderBottom: '1px solid #21262d' }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)')
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.background = 'transparent')
          }
        >
          <td style={{ padding: '8px 16px', width: 24 }} />
          <td style={{ padding: '8px 16px', color: '#c9d1d9', fontSize: 13 }}>
            {linha.editavel ? (
              <EditableCell
                value={linha.descricao}
                isEditing={editingId === linha.id && editingField === 'descricao'}
                type="text"
                onStartEdit={() => startEdit(linha.id, 'descricao', linha.descricao)}
                onChange={setEditBuffer}
                onBlur={commitEdit}
              />
            ) : (
              <span style={{ padding: '4px 6px' }}>{linha.descricao}</span>
            )}
          </td>
          <td style={{ padding: '8px 16px', textAlign: 'right', color: '#c9d1d9', fontSize: 13 }}>
            <EditableCell
              value={linha.valor}
              isEditing={editingId === linha.id && editingField === 'valor'}
              type="number"
              onStartEdit={() => startEdit(linha.id, 'valor', linha.valor)}
              onChange={setEditBuffer}
              onBlur={commitEdit}
            />
          </td>
          <td style={{ padding: '8px 16px', textAlign: 'right', width: 50 }}>
            <button
              onClick={() => removeLinha(linha.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#484f58',
                padding: 4,
                borderRadius: 4,
                display: 'inline-flex',
                alignItems: 'center',
              }}
              title="Remover linha"
            >
              <Trash2 size={14} />
            </button>
          </td>
        </tr>
      ));

  const renderSummaryRow = (
    label: string,
    value: number,
    opts: {
      color?: string;
      bgHighlight?: boolean;
      large?: boolean;
    } = {}
  ) => {
    const color =
      opts.color ??
      (value > 0 ? '#3fb950' : value < 0 ? '#ef4444' : '#e6edf3');
    return (
      <tr
        style={{
          background: opts.bgHighlight ? '#161b22' : 'transparent',
          borderBottom: '1px solid #21262d',
        }}
      >
        <td style={{ padding: '10px 16px', width: 24 }} />
        <td
          style={{
            padding: '10px 16px',
            fontWeight: 700,
            fontSize: opts.large ? 16 : 13,
            color: color,
            letterSpacing: opts.large ? '-0.01em' : undefined,
          }}
        >
          {label}
        </td>
        <td
          style={{
            padding: '10px 16px',
            textAlign: 'right',
            fontWeight: 700,
            fontSize: opts.large ? 16 : 13,
            color: color,
          }}
        >
          {fmtBRL(value)}
        </td>
        <td style={{ padding: '10px 16px', width: 50 }} />
      </tr>
    );
  };

  const renderDivider = (label: string) => (
    <tr>
      <td
        colSpan={4}
        style={{
          padding: '6px 16px',
          background: '#0d1117',
          color: '#8b949e',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          borderBottom: '1px solid #21262d',
        }}
      >
        {label}
      </td>
    </tr>
  );

  const renderAddButton = (cat: DRECategoria, label: string) => (
    <tr>
      <td colSpan={4} style={{ padding: '4px 16px' }}>
        <button
          onClick={() => addLinha(cat)}
          style={{
            background: 'none',
            border: '1px dashed #21262d',
            borderRadius: 6,
            color: '#8b949e',
            cursor: 'pointer',
            fontSize: 12,
            padding: '5px 12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 2,
            marginBottom: 2,
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = '#e8a020';
            (e.currentTarget as HTMLElement).style.color = '#e8a020';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = '#21262d';
            (e.currentTarget as HTMLElement).style.color = '#8b949e';
          }}
        >
          <Plus size={12} />
          {label}
        </button>
      </td>
    </tr>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  if (!empresa) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0d1117',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p style={{ color: '#8b949e' }}>Nenhuma empresa configurada.</p>
      </div>
    );
  }

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0d1117',
        color: '#e6edf3',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '28px 32px',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#e6edf3' }}>
            DRE — Demonstrativo de Resultado
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8b949e' }}>
            {empresa.nome} · {MONTH_NAMES[selectedMes - 1]} {selectedAno}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Month selector */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedMes}
              onChange={(e) => handleMesChange(Number(e.target.value))}
              style={selectStyle}
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              color="#8b949e"
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
          </div>

          {/* Year selector */}
          <div style={{ position: 'relative' }}>
            <select
              value={selectedAno}
              onChange={(e) => handleAnoChange(Number(e.target.value))}
              style={selectStyle}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              color="#8b949e"
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
          </div>

          <button onClick={exportCSV} style={btnSecondaryStyle}>
            <Download size={14} />
            Exportar CSV
          </button>

          <button onClick={handleSave} style={btnPrimaryStyle}>
            <Save size={14} />
            Salvar
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: '#161b22',
          border: '1px solid #21262d',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0d1117', borderBottom: '1px solid #21262d' }}>
              <th style={{ padding: '10px 16px', width: 24 }} />
              <th
                style={{
                  padding: '10px 16px',
                  textAlign: 'left',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#8b949e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Descrição
              </th>
              <th
                style={{
                  padding: '10px 16px',
                  textAlign: 'right',
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#8b949e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Valor
              </th>
              <th style={{ padding: '10px 16px', width: 50 }} />
            </tr>
          </thead>
          <tbody>
            {/* ── RECEITA ── */}
            {renderDivider('(+) Receita')}
            {renderLinhas('receita')}
            {renderAddButton('receita', 'Adicionar receita')}
            {renderSummaryRow('RECEITA BRUTA', receitaBruta, {
              color: receitaBruta >= 0 ? '#3fb950' : '#ef4444',
              bgHighlight: true,
            })}

            {/* ── DEDUÇÕES ── */}
            {renderDivider('(-) Deduções e Impostos sobre Receita')}
            {renderLinhas('deducao')}
            {renderAddButton('deducao', 'Adicionar dedução')}
            {renderSummaryRow('RECEITA LÍQUIDA', receitaLiquida, {
              bgHighlight: true,
            })}

            {/* ── CMV ── */}
            {renderDivider('(-) Custo das Mercadorias Vendidas')}
            {renderLinhas('cmv')}
            {renderAddButton('cmv', 'Adicionar CMV')}
            {renderSummaryRow('LUCRO BRUTO', lucroBruto, { bgHighlight: true })}

            {/* ── DESPESAS OPERACIONAIS ── */}
            {renderDivider('(-) Despesas Operacionais')}
            {renderLinhas('despesa_op')}
            {renderAddButton('despesa_op', 'Adicionar despesa operacional')}
            {renderSummaryRow('EBITDA', ebitda, {
              color: ebitda >= 0 ? '#e8a020' : '#ef4444',
              bgHighlight: true,
            })}

            {/* ── DEPRECIAÇÃO ── */}
            {renderDivider('(-) Depreciação e Amortização')}
            {renderLinhas('depreciacao')}
            {renderAddButton('depreciacao', 'Adicionar depreciação')}

            {/* ── IMPOSTOS SOBRE LUCRO ── */}
            {renderDivider('(-) Impostos sobre Lucro')}
            {renderLinhas('imposto')}
            {renderAddButton('imposto', 'Adicionar imposto')}

            {/* ── LUCRO LÍQUIDO ── */}
            <tr style={{ background: '#0d1117', borderTop: '2px solid #21262d' }}>
              <td style={{ padding: '16px' }} />
              <td
                style={{
                  padding: '16px',
                  fontWeight: 800,
                  fontSize: 18,
                  color: lucroLiquido >= 0 ? '#3fb950' : '#ef4444',
                  letterSpacing: '-0.02em',
                }}
              >
                LUCRO LÍQUIDO
              </td>
              <td
                style={{
                  padding: '16px',
                  textAlign: 'right',
                  fontWeight: 800,
                  fontSize: 18,
                  color: lucroLiquido >= 0 ? '#3fb950' : '#ef4444',
                  letterSpacing: '-0.02em',
                }}
              >
                {fmtBRL(lucroLiquido)}
              </td>
              <td style={{ padding: '16px' }} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginTop: 20,
        }}
      >
        {[
          { label: 'Receita Bruta', value: receitaBruta, color: '#3fb950' },
          { label: 'Lucro Bruto', value: lucroBruto, color: lucroBruto >= 0 ? '#3fb950' : '#ef4444' },
          { label: 'EBITDA', value: ebitda, color: ebitda >= 0 ? '#e8a020' : '#ef4444' },
          { label: 'Lucro Líquido', value: lucroLiquido, color: lucroLiquido >= 0 ? '#3fb950' : '#ef4444' },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              background: '#161b22',
              border: '1px solid #21262d',
              borderRadius: 8,
              padding: '14px 16px',
            }}
          >
            <p
              style={{
                margin: '0 0 6px',
                fontSize: 11,
                color: '#8b949e',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 600,
              }}
            >
              {card.label}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: card.color,
                letterSpacing: '-0.02em',
              }}
            >
              {fmtBRL(card.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const selectStyle: React.CSSProperties = {
  appearance: 'none',
  background: '#161b22',
  border: '1px solid #21262d',
  borderRadius: 6,
  color: '#e6edf3',
  cursor: 'pointer',
  fontSize: 13,
  padding: '7px 32px 7px 12px',
  outline: 'none',
};

const btnPrimaryStyle: React.CSSProperties = {
  background: '#e8a020',
  border: 'none',
  borderRadius: 6,
  color: '#0d1117',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  padding: '7px 14px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const btnSecondaryStyle: React.CSSProperties = {
  background: '#21262d',
  border: '1px solid #30363d',
  borderRadius: 6,
  color: '#e6edf3',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  padding: '7px 14px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};
