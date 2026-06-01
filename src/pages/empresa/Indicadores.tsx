import React, { useState } from 'react'
import { useStore } from '../../store/useStore'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

// ── helpers ───────────────────────────────────────────────────────────────────
const now = new Date()

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}

// ── KPI gauge bar ─────────────────────────────────────────────────────────────
interface GaugeProps {
  pct: number
  color: string
}
function GaugeBar({ pct, color }: GaugeProps) {
  const width = clamp(pct, 0, 100)
  return (
    <div style={{ background: '#21262d', borderRadius: 6, height: 10, width: '100%', overflow: 'hidden' }}>
      <div
        style={{
          width: `${width}%`,
          height: '100%',
          background: color,
          borderRadius: 6,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────
interface KpiCardProps {
  title: string
  children: React.ReactNode
}
function KpiCard({ title, children }: KpiCardProps) {
  return (
    <div
      style={{
        background: '#161b22',
        border: '1px solid #30363d',
        borderRadius: 12,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 1 }}>
        {title}
      </p>
      {children}
    </div>
  )
}

// ── status helpers ─────────────────────────────────────────────────────────────
function costStatusColor(value: number, meta: number): string {
  if (value < meta) return '#10b981'
  if (value <= meta + 5) return '#f59e0b'
  return '#ef4444'
}

function costStatusLabel(value: number, meta: number): string {
  if (value < meta) return 'Verde'
  if (value <= meta + 5) return 'Atenção'
  return 'Crítico'
}

// ── main component ─────────────────────────────────────────────────────────────
export default function Indicadores() {
  const [selectedMes, setSelectedMes] = useState<number>(now.getMonth() + 1)
  const [selectedAno, setSelectedAno] = useState<number>(now.getFullYear())
  const [clientesAtendidos, setClientesAtendidos] = useState<number>(0)

  const getEmpresaAtiva = useStore(s => s.getEmpresaAtiva)
  const empresa = getEmpresaAtiva()

  if (!empresa) {
    return (
      <div style={{ color: '#8b949e', padding: 40, textAlign: 'center' }}>
        Nenhuma empresa ativa selecionada.
      </div>
    )
  }

  const mesStr = String(selectedMes).padStart(2, '0')
  const prefix = `${selectedAno}-${mesStr}`

  const lancamentosMes = empresa.fluxoCaixa.filter(l => l.data.startsWith(prefix))
  const entradas = lancamentosMes.filter(l => l.tipo === 'entrada').reduce((s, l) => s + l.valor, 0)
  const saidas = lancamentosMes.filter(l => l.tipo === 'saida').reduce((s, l) => s + l.valor, 0)

  const faturamento = entradas

  const cmvValor = lancamentosMes
    .filter(l => l.tipo === 'saida' && l.categoria === 'fornecedores')
    .reduce((s, l) => s + l.valor, 0)

  const cmvPct = faturamento > 0 ? (cmvValor / faturamento) * 100 : 0

  const folhaTotal = lancamentosMes
    .filter(l => l.tipo === 'saida' && l.categoria === 'folha')
    .reduce((s, l) => s + l.valor, 0)

  const rhPct = faturamento > 0 ? (folhaTotal / faturamento) * 100 : 0

  const fixedCosts = lancamentosMes
    .filter(l => l.tipo === 'saida' && ['aluguel', 'utilidades', 'manutencao'].includes(l.categoria))
    .reduce((s, l) => s + l.valor, 0)

  const varMargin = faturamento > 0 ? (faturamento - cmvValor) / faturamento : 0
  const pontoEquilibrio = varMargin > 0 ? fixedCosts / varMargin : 0

  const margemLiquida = faturamento > 0 ? ((faturamento - saidas) / faturamento) * 100 : 0
  const ticketMedio = clientesAtendidos > 0 ? faturamento / clientesAtendidos : 0

  const cmvMeta = empresa.metas.cmvMax
  const cmvColor = costStatusColor(cmvPct, cmvMeta)
  const cmvLabel = costStatusLabel(cmvPct, cmvMeta)

  const rhMeta = 35
  const rhColor = costStatusColor(rhPct, rhMeta)
  const rhLabel = costStatusLabel(rhPct, rhMeta)

  const margemColor = margemLiquida >= 0 ? '#10b981' : '#ef4444'

  const peProgress = pontoEquilibrio > 0 ? clamp((faturamento / pontoEquilibrio) * 100, 0, 100) : 0
  const peColor = faturamento >= pontoEquilibrio && pontoEquilibrio > 0 ? '#10b981' : '#e8a020'
  const peGap = Math.max(0, pontoEquilibrio - faturamento)

  const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]

  return (
    <div style={{ background: '#0d1117', minHeight: '100vh', padding: '32px 24px', color: '#e6edf3' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#e8a020' }}>KPIs do Negócio</h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: '#8b949e' }}>
          Indicadores de performance da sua operação
        </p>
      </div>

      {/* Period selector + clients input */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          marginBottom: 28,
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: 10,
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, color: '#8b949e' }}>Mês</label>
          <select
            value={selectedMes}
            onChange={e => setSelectedMes(Number(e.target.value))}
            style={{
              background: '#21262d', border: '1px solid #30363d', borderRadius: 6,
              color: '#e6edf3', padding: '6px 10px', fontSize: 14,
            }}
          >
            {MESES.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, color: '#8b949e' }}>Ano</label>
          <select
            value={selectedAno}
            onChange={e => setSelectedAno(Number(e.target.value))}
            style={{
              background: '#21262d', border: '1px solid #30363d', borderRadius: 6,
              color: '#e6edf3', padding: '6px 10px', fontSize: 14,
            }}
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 'auto' }}>
          <label style={{ fontSize: 12, color: '#8b949e' }}>Clientes atendidos este mês</label>
          <input
            type="number"
            min={0}
            value={clientesAtendidos}
            onChange={e => setClientesAtendidos(Math.max(0, Number(e.target.value)))}
            style={{
              background: '#21262d', border: '1px solid #30363d', borderRadius: 6,
              color: '#e6edf3', padding: '6px 10px', fontSize: 14, width: 120,
            }}
          />
        </div>
      </div>

      {/* Faturamento summary strip */}
      <div
        style={{
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: 10,
          padding: '14px 20px',
          marginBottom: 24,
          display: 'flex',
          gap: 40,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 12, color: '#8b949e' }}>Faturamento</p>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#10b981' }}>{fmtBRL(faturamento)}</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: '#8b949e' }}>Saídas totais</p>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#ef4444' }}>{fmtBRL(saidas)}</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 12, color: '#8b949e' }}>Resultado</p>
          <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: faturamento - saidas >= 0 ? '#10b981' : '#ef4444' }}>
            {fmtBRL(faturamento - saidas)}
          </p>
        </div>
      </div>

      {/* 2×2 KPI grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* A — CMV */}
        <KpiCard title="CMV — Custo da Mercadoria Vendida">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: cmvColor, lineHeight: 1 }}>
              {cmvPct.toFixed(1)}%
            </span>
            <span
              style={{
                fontSize: 12, fontWeight: 600, padding: '2px 8px',
                borderRadius: 20, background: cmvColor + '22', color: cmvColor,
              }}
            >
              {cmvLabel}
            </span>
          </div>
          <GaugeBar pct={cmvPct} color={cmvColor} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8b949e' }}>
            <span>Meta: &lt; {cmvMeta}%</span>
            <span>{fmtBRL(cmvValor)} em compras</span>
          </div>
        </KpiCard>

        {/* B — Ticket Médio */}
        <KpiCard title="Ticket Médio">
          {clientesAtendidos > 0 ? (
            <>
              <span style={{ fontSize: 40, fontWeight: 800, color: '#e8a020', lineHeight: 1 }}>
                {fmtBRL(ticketMedio)}
              </span>
              <p style={{ margin: 0, fontSize: 13, color: '#8b949e' }}>por cliente atendido</p>
              <p style={{ margin: 0, fontSize: 12, color: '#8b949e' }}>
                {clientesAtendidos} clientes · {fmtBRL(faturamento)} faturamento
              </p>
            </>
          ) : (
            <>
              <span style={{ fontSize: 32, fontWeight: 800, color: '#30363d', lineHeight: 1 }}>—</span>
              <p style={{ margin: 0, fontSize: 13, color: '#8b949e' }}>
                Informe clientes atendidos acima para calcular
              </p>
            </>
          )}
        </KpiCard>

        {/* C — Custo de Mão de Obra */}
        <KpiCard title="Custo de Mão de Obra (RH)">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: rhColor, lineHeight: 1 }}>
              {rhPct.toFixed(1)}%
            </span>
            <span
              style={{
                fontSize: 12, fontWeight: 600, padding: '2px 8px',
                borderRadius: 20, background: rhColor + '22', color: rhColor,
              }}
            >
              {rhLabel}
            </span>
          </div>
          <GaugeBar pct={rhPct} color={rhColor} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8b949e' }}>
            <span>Meta: &lt; {rhMeta}%</span>
            <span>{fmtBRL(folhaTotal)} em folha</span>
          </div>
        </KpiCard>

        {/* D — Margem Líquida */}
        <KpiCard title="Margem Líquida">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 40, fontWeight: 800, color: margemColor, lineHeight: 1 }}>
              {margemLiquida.toFixed(1)}%
            </span>
          </div>
          <GaugeBar pct={Math.abs(margemLiquida)} color={margemColor} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8b949e' }}>
            <span>Resultado líquido</span>
            <span style={{ color: margemColor }}>{fmtBRL(faturamento - saidas)}</span>
          </div>
        </KpiCard>
      </div>

      {/* Ponto de Equilíbrio */}
      <div
        style={{
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: 12,
          padding: '24px',
        }}
      >
        <p style={{ margin: '0 0 4px', fontSize: 13, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 1 }}>
          Ponto de Equilíbrio
        </p>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 36, fontWeight: 800, color: '#e8a020' }}>
            {fmtBRL(pontoEquilibrio)}
          </span>
          <span style={{ fontSize: 14, color: '#8b949e' }}>
            Faturamento atual: <strong style={{ color: '#e6edf3' }}>{fmtBRL(faturamento)}</strong>
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ background: '#21262d', borderRadius: 8, height: 14, width: '100%', overflow: 'hidden', marginBottom: 10 }}>
          <div
            style={{
              width: `${peProgress}%`,
              height: '100%',
              background: peColor,
              borderRadius: 8,
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#8b949e', marginBottom: 12 }}>
          <span>{peProgress.toFixed(0)}% do ponto de equilíbrio atingido</span>
          {pontoEquilibrio > 0 && (
            <span style={{ color: peColor }}>{faturamento >= pontoEquilibrio ? 'Coberto!' : `${(100 - peProgress).toFixed(0)}% restante`}</span>
          )}
        </div>

        {peGap > 0 ? (
          <div
            style={{
              background: '#ef444415',
              border: '1px solid #ef444440',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              color: '#ef4444',
            }}
          >
            Você precisa de <strong>{fmtBRL(peGap)}</strong> adicionais para cobrir os custos fixos
          </div>
        ) : pontoEquilibrio > 0 ? (
          <div
            style={{
              background: '#10b98115',
              border: '1px solid #10b98140',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 13,
              color: '#10b981',
            }}
          >
            Ponto de equilíbrio atingido! Excedente de <strong>{fmtBRL(faturamento - pontoEquilibrio)}</strong>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: '#8b949e' }}>
            Lance os custos fixos no fluxo de caixa para calcular o ponto de equilíbrio.
          </p>
        )}

        {varMargin > 0 && (
          <div style={{ marginTop: 12, display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12, color: '#8b949e' }}>
            <span>Margem de contribuição: <strong style={{ color: '#e6edf3' }}>{(varMargin * 100).toFixed(1)}%</strong></span>
            <span>Custos fixos: <strong style={{ color: '#e6edf3' }}>{fmtBRL(fixedCosts)}</strong></span>
          </div>
        )}
      </div>
    </div>
  )
}
