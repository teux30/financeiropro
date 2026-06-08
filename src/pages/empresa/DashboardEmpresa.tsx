import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle,
  Target,
  ShoppingCart,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { PainelDestaque } from '../../components/dashboard/PainelDestaque';
import { custoMaoObraMes, folhaMensal, custoEntregadoresMes } from '../../store/entregadorSelectors';

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

const fmtK = (v: number) =>
  v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v.toFixed(0)}`;

const daysUntil = (dateStr: string): number =>
  Math.floor((new Date(dateStr).getTime() - Date.now()) / 86400000);

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: '#161b22',
          border: '1px solid #21262d',
          borderRadius: 8,
          padding: '10px 14px',
        }}
      >
        <p style={{ color: '#8b949e', marginBottom: 6, fontSize: 13 }}>{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} style={{ color: entry.color, margin: '2px 0', fontSize: 13 }}>
            {entry.name === 'entradas' ? 'Entradas' : 'Saídas'}: {fmtBRL(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardEmpresa() {
  const getEmpresaAtiva = useStore((s: any) => s.getEmpresaAtiva);
  const getBanco = useStore((s: any) => s.getBanco);
  const getSaldoTotal = useStore((s: any) => s.getSaldoTotal);
  const empresa = getEmpresaAtiva();

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
        <p style={{ color: '#8b949e', fontSize: 16 }}>Nenhuma empresa configurada.</p>
      </div>
    );
  }

  // Fonte única: transações efetivadas (exclui transferências internas)
  const fluxoCaixa = (getBanco('empresa').transacoes ?? [])
    .filter((t: any) => t.categoria !== 'transferencia' && !t.transferenciaId);
  const contasPagar = empresa.contasPagar ?? [];
  const metas = empresa.metas ?? { faturamento: 0, lucro: 0, cmvMax: 30 };

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

  const lancamentosMes = fluxoCaixa.filter((l: any) =>
    (l.data ?? '').startsWith(monthKey)
  );

  const entradas = lancamentosMes
    .filter((l: any) => l.tipo === 'entrada')
    .reduce((acc: number, l: any) => acc + (l.valor ?? 0), 0);

  const saidas = lancamentosMes
    .filter((l: any) => l.tipo === 'saida')
    .reduce((acc: number, l: any) => acc + (l.valor ?? 0), 0);

  const lucroMes = entradas - saidas;

  const saidasFornecedores = lancamentosMes
    .filter((l: any) => l.tipo === 'saida' && (l.categoria === 'insumos' || l.categoria === 'fornecedores'))
    .reduce((acc: number, l: any) => acc + (l.valor ?? 0), 0);

  const cmvPct = entradas > 0 ? (saidasFornecedores / entradas) * 100 : 0;
  const margemPct = entradas > 0 ? (lucroMes / entradas) * 100 : 0;

  const contasVencendo7dias = contasPagar.filter((c: any) => {
    if (c.status !== 'pendente') return false;
    const d = daysUntil(c.vencimento);
    return d >= 0 && d <= 7;
  }).length;

  const progressoMeta =
    metas.faturamento > 0
      ? Math.min(100, (entradas / metas.faturamento) * 100)
      : 0;

  // Last 6 months chart data
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, month - 5 + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    const items = fluxoCaixa.filter((l: any) => (l.data ?? '').startsWith(key));
    return {
      name: MONTH_NAMES[m],
      entradas: items
        .filter((l: any) => l.tipo === 'entrada')
        .reduce((acc: number, l: any) => acc + (l.valor ?? 0), 0),
      saidas: items
        .filter((l: any) => l.tipo === 'saida')
        .reduce((acc: number, l: any) => acc + (l.valor ?? 0), 0),
    };
  });

  const isEmpty = fluxoCaixa.length === 0;

  const alerts: Array<{
    key: string;
    color: string;
    icon: React.ReactNode;
    title: string;
    desc: string;
  }> = [];

  if (cmvPct > 35) {
    alerts.push({
      key: 'cmv',
      color: '#ef4444',
      icon: <AlertTriangle size={16} />,
      title: 'CMV Elevado',
      desc: `CMV em ${cmvPct.toFixed(1)}% — acima do limite recomendado de 35%.`,
    });
  }
  if (contasVencendo7dias > 0) {
    alerts.push({
      key: 'contas',
      color: '#e8a020',
      icon: <Clock size={16} />,
      title: 'Contas a Vencer',
      desc: `${contasVencendo7dias} conta(s) vencem nos próximos 7 dias.`,
    });
  }
  if (lucroMes < 0) {
    alerts.push({
      key: 'saldo',
      color: '#ef4444',
      icon: <TrendingDown size={16} />,
      title: 'Saldo Negativo',
      desc: `Resultado do mês: ${fmtBRL(lucroMes)}.`,
    });
  }

  const dateLabel = now.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#e6edf3' }}>
            Dashboard Empresa
          </h1>
          <span
            style={{
              background: 'rgba(232,160,32,0.15)',
              color: '#e8a020',
              border: '1px solid rgba(232,160,32,0.3)',
              borderRadius: 6,
              padding: '3px 10px',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {empresa.nome}
          </span>
        </div>
        <span style={{ color: '#8b949e', fontSize: 13, textTransform: 'capitalize' }}>
          {dateLabel}
        </span>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <div
          style={{
            background: '#161b22',
            border: '1px solid #21262d',
            borderRadius: 10,
            padding: '32px',
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          <DollarSign size={36} color="#8b949e" style={{ marginBottom: 12 }} />
          <p style={{ color: '#8b949e', fontSize: 15, margin: 0 }}>
            Nenhum lançamento encontrado. Comece registrando no{' '}
            <strong style={{ color: '#e8a020' }}>Fluxo de Caixa</strong>.
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Faturamento */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={cardLabelStyle}>Faturamento do Mês</span>
            <TrendingUp size={18} color="#e8a020" />
          </div>
          <p style={{ ...cardValueStyle, color: '#e6edf3' }}>{fmtBRL(entradas)}</p>
          <p style={cardSubStyle}>{progressoMeta.toFixed(0)}% da meta</p>
        </div>

        {/* Lucro Líquido */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={cardLabelStyle}>Lucro Líquido</span>
            {lucroMes >= 0 ? (
              <TrendingUp size={18} color="#3fb950" />
            ) : (
              <TrendingDown size={18} color="#ef4444" />
            )}
          </div>
          <p
            style={{
              ...cardValueStyle,
              color: lucroMes >= 0 ? '#3fb950' : '#ef4444',
            }}
          >
            {fmtBRL(lucroMes)}
          </p>
          <p style={cardSubStyle}>
            Margem: {margemPct.toFixed(1)}%
          </p>
        </div>

        {/* CMV */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={cardLabelStyle}>CMV (% Receita)</span>
            <ShoppingCart
              size={18}
              color={cmvPct > 35 ? '#ef4444' : cmvPct >= 30 ? '#e8a020' : '#3fb950'}
            />
          </div>
          <p
            style={{
              ...cardValueStyle,
              color: cmvPct > 35 ? '#ef4444' : cmvPct >= 30 ? '#e8a020' : '#3fb950',
            }}
          >
            {cmvPct.toFixed(1)}%
          </p>
          <p style={cardSubStyle}>
            {cmvPct > 35 ? 'Acima do limite' : cmvPct >= 30 ? 'Atenção' : 'Dentro do limite'}
          </p>
        </div>

        {/* Contas Vencendo */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={cardLabelStyle}>Contas Vencendo (7d)</span>
            <Clock
              size={18}
              color={contasVencendo7dias > 0 ? '#e8a020' : '#8b949e'}
            />
          </div>
          <p
            style={{
              ...cardValueStyle,
              color: contasVencendo7dias > 0 ? '#e8a020' : '#e6edf3',
            }}
          >
            {contasVencendo7dias}
          </p>
          <p style={cardSubStyle}>
            {contasVencendo7dias === 0
              ? 'Nenhuma pendente'
              : contasVencendo7dias === 1
              ? '1 conta próxima'
              : `${contasVencendo7dias} contas próximas`}
          </p>
        </div>
      </div>

      {/* Segunda linha: Saldo PJ + Mão de obra */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
        <div style={cardStyle}>
          <div style={cardHeaderStyle}><span style={cardLabelStyle}>Saldo em contas (PJ)</span></div>
          <p style={{ ...cardValueStyle, color: '#e6edf3' }}>{fmtBRL(getSaldoTotal('empresa'))}</p>
          <p style={cardSubStyle}>{(getBanco('empresa').contas ?? []).length} conta(s)</p>
        </div>
        <div style={cardStyle}>
          <div style={cardHeaderStyle}><span style={cardLabelStyle}>Mão de obra (mês)</span></div>
          <p style={{ ...cardValueStyle, color: '#e8a020' }}>{fmtBRL(custoMaoObraMes(empresa, year, month + 1))}</p>
          <p style={cardSubStyle}>Folha {fmtBRL(folhaMensal(empresa))} + entreg. {fmtBRL(custoEntregadoresMes(empresa, year, month + 1))}</p>
        </div>
      </div>

      {/* Alertas/Lembretes + Notas (empresa) */}
      <div style={{ marginBottom: 24 }}>
        <PainelDestaque visao="empresa" />
      </div>

      {/* Chart + Alerts */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '3fr 2fr',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Bar Chart */}
        <div style={cardStyle}>
          <p
            style={{
              margin: '0 0 20px 0',
              fontSize: 14,
              fontWeight: 600,
              color: '#e6edf3',
            }}
          >
            Entradas vs Saídas — Últimos 6 Meses
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={4} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: '#8b949e', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmtK}
                tick={{ fill: '#8b949e', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Bar dataKey="entradas" fill="#e8a020" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 20, marginTop: 12, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: '#e8a020',
                  display: 'inline-block',
                }}
              />
              <span style={{ color: '#8b949e', fontSize: 12 }}>Entradas</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: '#ef4444',
                  display: 'inline-block',
                }}
              />
              <span style={{ color: '#8b949e', fontSize: 12 }}>Saídas</span>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div style={cardStyle}>
          <p
            style={{
              margin: '0 0 16px 0',
              fontSize: 14,
              fontWeight: 600,
              color: '#e6edf3',
            }}
          >
            Alertas
          </p>
          {alerts.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: 160,
                gap: 10,
              }}
            >
              <CheckCircle size={32} color="#3fb950" />
              <p style={{ color: '#3fb950', fontSize: 14, margin: 0, fontWeight: 500 }}>
                Tudo em ordem!
              </p>
              <p style={{ color: '#8b949e', fontSize: 12, margin: 0, textAlign: 'center' }}>
                Nenhum alerta para este período.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {alerts.map((alert) => (
                <div
                  key={alert.key}
                  style={{
                    background: `${alert.color}10`,
                    border: `1px solid ${alert.color}40`,
                    borderRadius: 8,
                    padding: '12px 14px',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                  }}
                >
                  <span style={{ color: alert.color, marginTop: 1 }}>{alert.icon}</span>
                  <div>
                    <p
                      style={{
                        margin: '0 0 3px 0',
                        fontSize: 13,
                        fontWeight: 600,
                        color: alert.color,
                      }}
                    >
                      {alert.title}
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: '#8b949e', lineHeight: 1.4 }}>
                      {alert.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Meta Progress */}
      <div style={cardStyle}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={16} color="#e8a020" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#e6edf3' }}>
              Meta de Faturamento
            </span>
          </div>
          <span style={{ fontSize: 13, color: '#8b949e' }}>
            {fmtBRL(entradas)}{' '}
            <span style={{ color: '#484f58' }}>/</span>{' '}
            {fmtBRL(metas.faturamento)}
          </span>
        </div>
        <div
          style={{
            background: '#21262d',
            borderRadius: 99,
            height: 10,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progressoMeta}%`,
              background:
                progressoMeta >= 100
                  ? '#3fb950'
                  : progressoMeta >= 70
                  ? '#e8a020'
                  : '#e8a020',
              borderRadius: 99,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 12, color: '#8b949e' }}>0%</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: progressoMeta >= 100 ? '#3fb950' : '#e8a020',
            }}
          >
            {progressoMeta.toFixed(0)}% atingido
          </span>
          <span style={{ fontSize: 12, color: '#8b949e' }}>100%</span>
        </div>
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#161b22',
  border: '1px solid #21262d',
  borderRadius: 10,
  padding: '20px',
};

const cardHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 10,
};

const cardLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#8b949e',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: 500,
};

const cardValueStyle: React.CSSProperties = {
  margin: '0 0 4px 0',
  fontSize: 24,
  fontWeight: 700,
  letterSpacing: '-0.02em',
};

const cardSubStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 12,
  color: '#8b949e',
};
