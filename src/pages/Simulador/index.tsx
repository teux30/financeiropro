import { useEffect, useRef, useState } from 'react'
import { Share2, FileDown, Calculator, Save, BarChart2 } from 'lucide-react'
import { useStore } from '../../store/useStore'
import {
  toYieldMensal, calcPatrimonio, calcRenda, calcCapitalNecessario,
  calcPrazoMeses, formatPrazo, fmtBRL, fmtK,
} from './math'
import { KpiCard }        from './KpiCard'
import { SliderInput }    from './SliderInput'
import { ResultCard }     from './ResultCard'
import { PatrimonioChart } from './PatrimonioChart'
import { AlocacaoEditor } from './AlocacaoEditor'
import { ProjecaoTable }  from './ProjecaoTable'
import { MetaDestaque }   from './MetaDestaque'
import { SaveModal }      from './SaveModal'
import { SimulacoesGrid } from './SimulacoesGrid'
import { EditableLabel }  from './EditableLabel'

// ─── URL helpers ─────────────────────────────────────────────────────────────
function readURLParams() {
  const sp = new URLSearchParams(window.location.search)
  const out: Record<string, number> = {}
  if (sp.get('i')) out.inicial = Number(sp.get('i'))
  if (sp.get('m')) out.mensal  = Number(sp.get('m'))
  if (sp.get('y')) out.yieldAnual = Number(sp.get('y'))
  if (sp.get('g')) out.meta    = Number(sp.get('g'))
  return out
}

const fmtMoeda = (v: number) => `R$ ${v.toLocaleString('pt-BR')}`
const parseMoeda = (s: string) => Number(s.replace(/\D/g, ''))
const fmtPct   = (v: number) => `${v}%`
const parsePct = (s: string) => Number(s.replace('%', '').trim())

// ─── Component ───────────────────────────────────────────────────────────────
export function SimuladorPage() {
  const {
    simParams, setSimParams,
    simAlocacao, setSimAlocacao,
    simLabels, setSimLabel,
    setActiveProject, setActiveView,
  } = useStore()

  const pageRef = useRef<HTMLDivElement>(null)
  const [saveOpen, setSaveOpen] = useState(false)

  // Load URL params once
  useEffect(() => {
    const p = readURLParams()
    if (Object.keys(p).length > 0) setSimParams(p)
  }, []) // eslint-disable-line

  const { inicial, mensal, yieldAnual, meta } = simParams
  const ym = toYieldMensal(yieldAnual)
  const hasData = yieldAnual > 0 && meta > 0

  // ─── Calcs ────────────────────────────────────────────────────────────────
  const capitalNecessario = calcCapitalNecessario(meta, ym)
  const prazoMeses        = calcPrazoMeses(inicial, mensal, ym, meta)

  const aporteSugerido = (() => {
    if (!hasData) return 0
    if (ym === 0)  return (capitalNecessario - inicial) / 36
    const factor = ((1 + ym) ** 36 - 1) / ym
    return Math.max(0, (capitalNecessario - inicial * (1 + ym) ** 36) / factor)
  })()

  const pat1  = calcPatrimonio(inicial, mensal, ym, 12)
  const pat3  = calcPatrimonio(inicial, mensal, ym, 36)
  const pat5  = calcPatrimonio(inicial, mensal, ym, 60)
  const renda1 = calcRenda(pat1,  ym)
  const renda3 = calcRenda(pat3,  ym)
  const renda5 = calcRenda(pat5,  ym)
  const patMeta = calcPatrimonio(inicial, mensal, ym, isFinite(prazoMeses) ? prazoMeses : 0)

  const lbl = (key: string, def: string) => simLabels[key] ?? def

  // ─── Export PDF ───────────────────────────────────────────────────────────
  const exportPDF = async () => {
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'), import('jspdf'),
      ])
      const canvas = await html2canvas(pageRef.current!, { backgroundColor: '#0d1117', scale: 1.5, useCORS: true })
      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
      const w = pdf.internal.pageSize.getWidth()
      const h = (canvas.height * w) / canvas.width
      let y = 0
      while (y < h) {
        if (y > 0) pdf.addPage()
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, -y, w, h)
        y += pdf.internal.pageSize.getHeight()
      }
      pdf.save(`simulacao-renda-passiva-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch { alert('Erro ao gerar PDF.') }
  }

  // ─── Share ────────────────────────────────────────────────────────────────
  const share = () => {
    const sp = new URLSearchParams({
      i: String(inicial), m: String(mensal),
      y: String(yieldAnual), g: String(meta),
    })
    const url = `${window.location.href.split('?')[0]}?${sp}`
    navigator.clipboard.writeText(url).then(
      () => alert('Link copiado!'),
      () => alert(url),
    )
  }

  // ─── Export to mind map ───────────────────────────────────────────────────
  const handleExportMindMap = (projectId: string) => {
    setActiveProject(projectId)
    setActiveView('editor')
  }

  // ─── Empty state (no data) ────────────────────────────────────────────────
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
      <BarChart2 size={40} className="text-[#30363d]" />
      <p className="text-[#484f58] text-sm">Configure os valores acima para visualizar sua projeção</p>
    </div>
  )

  const DASH = '—'

  return (
    <div ref={pageRef} className="flex-1 overflow-y-auto bg-[#0d1117]">
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
              <Calculator size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#e6edf3]">Simulador de Renda Passiva</h1>
              <p className="text-xs text-[#8b949e]">Calcule seu caminho para a liberdade financeira</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={share}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#21262d] hover:bg-[#30363d] text-sm text-[#8b949e] hover:text-[#e6edf3] rounded-lg transition-colors">
              <Share2 size={14} /> Compartilhar
            </button>
            <button onClick={exportPDF}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#21262d] hover:bg-[#30363d] text-sm text-[#8b949e] hover:text-[#e6edf3] rounded-lg transition-colors">
              <FileDown size={14} /> Exportar PDF
            </button>
            <button onClick={() => setSaveOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors"
              style={{ background: '#1d9e75' }}>
              <Save size={14} /> Salvar simulação
            </button>
          </div>
        </div>

        {/* ── 0. Meta Destaque ─────────────────────────────────────────────── */}
        <MetaDestaque
          value={meta}
          onChange={v => setSimParams({ meta: v })}
        />

        {/* ── 1. KPI Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label={<EditableLabel value={lbl('kpi_meta', 'Meta mensal')} onChange={v => setSimLabel('kpi_meta', v)} />}
            value={<span style={{ color: '#1d9e75' }}>{hasData ? fmtBRL(meta) : DASH}</span>}
            sub={<EditableLabel value={lbl('kpi_meta_sub', 'em renda passiva')} onChange={v => setSimLabel('kpi_meta_sub', v)} />}
          />
          <KpiCard
            label={<EditableLabel value={lbl('kpi_capital', 'Capital necessário')} onChange={v => setSimLabel('kpi_capital', v)} />}
            value={hasData ? (isFinite(capitalNecessario) ? fmtK(capitalNecessario) : '∞') : DASH}
            sub={<EditableLabel value={lbl('kpi_capital_sub', `com yield de ${yieldAnual}%`)} onChange={v => setSimLabel('kpi_capital_sub', v)} />}
          />
          <KpiCard
            label={<EditableLabel value={lbl('kpi_prazo', 'Prazo estimado')} onChange={v => setSimLabel('kpi_prazo', v)} />}
            value={hasData ? formatPrazo(prazoMeses) : DASH}
            sub={<EditableLabel value={lbl('kpi_prazo_sub', 'reinvestindo tudo')} onChange={v => setSimLabel('kpi_prazo_sub', v)} />}
          />
          <KpiCard
            label={<EditableLabel value={lbl('kpi_aporte', 'Aporte sugerido/mês')} onChange={v => setSimLabel('kpi_aporte', v)} />}
            value={hasData && isFinite(aporteSugerido) ? fmtBRL(aporteSugerido) : DASH}
            sub={<EditableLabel value={lbl('kpi_aporte_sub', 'para atingir em 3 anos')} onChange={v => setSimLabel('kpi_aporte_sub', v)} />}
          />
        </div>

        {/* ── 2. Sliders ───────────────────────────────────────────────────── */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6">
          <h2 className="text-base font-semibold text-[#e6edf3] mb-5">
            <EditableLabel value={lbl('sec_sliders', 'Simule o seu cenário')} onChange={v => setSimLabel('sec_sliders', v)} as="span" />
          </h2>
          <div className="flex flex-col gap-5">
            <SliderInput label="Aporte inicial (R$)"     value={inicial}    min={0} max={500000} step={500}  format={fmtMoeda} parse={parseMoeda} onChange={v => setSimParams({ inicial: v })} />
            <SliderInput label="Aporte mensal (R$)"      value={mensal}     min={0} max={50000}  step={100}  format={fmtMoeda} parse={parseMoeda} onChange={v => setSimParams({ mensal: v })} />
            <SliderInput label="Yield médio anual (%)"   value={yieldAnual} min={0} max={20}     step={0.5}  format={fmtPct}   parse={parsePct}   onChange={v => setSimParams({ yieldAnual: v })} />
            <SliderInput label="Meta de dividendos (R$)" value={meta}       min={0} max={50000}  step={100}  format={fmtMoeda} parse={parseMoeda} onChange={v => setSimParams({ meta: v })} />
          </div>
        </div>

        {/* ── 3. Result Cards 2×2 ──────────────────────────────────────────── */}
        {hasData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResultCard labelKey="res_1a" defaultLabel="Renda mensal em 1 ano"
              renda={renda1} patrimonio={pat1} labelOverride={simLabels['res_1a']} onLabelChange={setSimLabel} />
            <ResultCard labelKey="res_3a" defaultLabel="Renda mensal em 3 anos"
              renda={renda3} patrimonio={pat3} labelOverride={simLabels['res_3a']} onLabelChange={setSimLabel} />
            <ResultCard labelKey="res_5a" defaultLabel="Renda mensal em 5 anos"
              renda={renda5} patrimonio={pat5} labelOverride={simLabels['res_5a']} onLabelChange={setSimLabel} />
            <ResultCard labelKey="res_meta" defaultLabel={`Meta ${fmtBRL(meta)}/mês atingida em`}
              renda={calcRenda(patMeta, ym)} patrimonio={patMeta}
              labelOverride={simLabels['res_meta']} onLabelChange={setSimLabel}
              isTimeCard prazoText={formatPrazo(prazoMeses)} highlight={isFinite(prazoMeses)} />
          </div>
        ) : (
          <div className="bg-[#161b22] border border-[#21262d] rounded-xl">
            <EmptyState />
          </div>
        )}

        {/* ── 4. Chart ─────────────────────────────────────────────────────── */}
        <div className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
          {hasData ? (
            <PatrimonioChart inicial={inicial} mensal={mensal} yieldMensal={ym} meta={meta} />
          ) : (
            <>
              <div className="px-6 pt-6 pb-3">
                <h2 className="text-base font-semibold text-[#e6edf3]">Crescimento do patrimônio</h2>
              </div>
              <EmptyState />
            </>
          )}
        </div>

        {/* ── 5. Alocação ──────────────────────────────────────────────────── */}
        <AlocacaoEditor alocacao={simAlocacao} onChange={setSimAlocacao} />

        {/* ── 6. Projeção Tabela ────────────────────────────────────────────── */}
        {hasData ? (
          <ProjecaoTable inicial={inicial} mensal={mensal} yieldMensal={ym} meta={meta} />
        ) : (
          <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-6 text-center text-[#484f58] text-sm">
            Configure yield e meta para ver a projeção ano a ano
          </div>
        )}

        {/* ── 7. Simulações salvas ──────────────────────────────────────────── */}
        <SimulacoesGrid onExportMindMap={handleExportMindMap} />

      </div>

      <SaveModal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        onExportMindMap={handleExportMindMap}
      />
    </div>
  )
}
