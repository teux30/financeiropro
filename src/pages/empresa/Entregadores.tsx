import { useState, useMemo } from 'react'
import {
  Bike, Plus, Pencil, Trash2, Minus, Check, Search, ChevronLeft, ChevronRight,
  Truck, DollarSign, Package, BarChart3, Settings, CalendarRange, PiggyBank,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { Entregador, ConfigEntregadores } from '../../store/empresaTypes'
import {
  inicioSemana, fimSemana, resumoTodos, totalSemanaTodos, custoPorEntrega, entregasSemana,
  getConfigEntregadores, custoEntregadoresMes, folhaMensal, custoMaoObraMes, semanasDoMes,
} from '../../store/entregadorSelectors'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { fmtBRL, maskSaldo } from '../../lib/format'

type Aba = 'lista' | 'lancar' | 'fechar' | 'mensal' | 'relatorio'
const hoje = () => new Date().toISOString().slice(0, 10)
const fmtDM = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MES_NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const mesDe = (iso: string) => MES_NOMES[Number(iso.slice(5, 7)) - 1]
const cruzaMes = (ini: string, fim: string) => ini.slice(0, 7) !== fim.slice(0, 7)

export function EntregadoresPage() {
  const {
    getEmpresaAtiva, getBanco, ocultarSaldos,
    adicionarEntregador, atualizarEntregador, excluirEntregador,
    registrarEntrega, pagarEntregador, setConfigEntregadores,
  } = useStore()
  const emp = getEmpresaAtiva()
  const cfg = emp ? getConfigEntregadores(emp) : null
  const [aba, setAba] = useState<Aba>('lista')
  const [semana, setSemana] = useState(inicioSemana(hoje(), cfg?.inicioSemanaDia ?? 1))
  const [showConfig, setShowConfig] = useState(false)

  if (!emp || !cfg) return <div className="flex-1 flex items-center justify-center text-[#8b949e]">Nenhuma empresa ativa.</div>

  const mudarSemana = (delta: number) => {
    const d = new Date(semana + 'T00:00:00'); d.setDate(d.getDate() + delta * 7)
    setSemana(inicioSemana(d.toISOString().slice(0, 10), cfg.inicioSemanaDia))
  }
  const semFim = fimSemana(semana, cfg.inicioSemanaDia)

  const ABAS: { id: Aba; label: string; icon: React.ElementType }[] = [
    { id: 'lista', label: 'Entregadores', icon: Truck },
    { id: 'lancar', label: 'Lançar entregas', icon: Package },
    { id: 'fechar', label: 'Fechamento', icon: DollarSign },
    { id: 'mensal', label: 'Mensal', icon: CalendarRange },
    { id: 'relatorio', label: 'Relatórios', icon: BarChart3 },
  ]

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0f0a]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#e8a02022' }}>
            <Bike size={18} style={{ color: '#e8a020' }} />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-[#e6edf3]">Entregadores</h1>
            <p className="text-xs text-[#8b949e]">Ciclo {DIAS_SEMANA[cfg.inicioSemanaDia]}→{DIAS_SEMANA[(cfg.inicioSemanaDia + 6) % 7]} · pgto {DIAS_SEMANA[cfg.diaPagamento]} · {cfg.competencia === 'simples' ? 'competência simples' : 'rateio mensal'}</p>
          </div>
          <button onClick={() => setShowConfig(true)} className="p-2 rounded-lg bg-[#161b22] border border-[#21262d] text-[#8b949e] hover:text-[#e6edf3]" title="Configurar ciclo">
            <Settings size={16} />
          </button>
        </div>

        {/* Abas */}
        <div className="flex gap-1 bg-[#161b22] border border-[#21262d] rounded-xl p-1 overflow-x-auto">
          {ABAS.map(a => {
            const Icon = a.icon; const on = aba === a.id
            return (
              <button key={a.id} onClick={() => setAba(a.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                style={{ background: on ? '#e8a02022' : 'transparent', color: on ? '#e8a020' : '#8b949e' }}>
                <Icon size={15} /> {a.label}
              </button>
            )
          })}
        </div>

        {/* Seletor de semana (lançar/fechar/relatório) */}
        {aba !== 'lista' && aba !== 'mensal' && (
          <div className="flex flex-col items-center gap-1 bg-[#161b22] border border-[#21262d] rounded-xl py-2">
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => mudarSemana(-1)} className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#e6edf3]"><ChevronLeft size={18} /></button>
              <span className="text-sm font-medium text-[#e6edf3]">{fmtDM(semana)} — {fmtDM(semFim)}</span>
              <button onClick={() => mudarSemana(1)} className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#e6edf3]"><ChevronRight size={18} /></button>
            </div>
            {cruzaMes(semana, semFim) && (
              <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: '#3b82f622', color: '#3b82f6' }}>
                Semana cruza {mesDe(semana)}/{mesDe(semFim)} · {cfg.competencia === 'simples' ? 'lança no mês do pagamento' : 'rateio proporcional'}
              </span>
            )}
          </div>
        )}

        {aba === 'lista' && <ListaEntregadores emp={emp} semana={semana} ocultar={ocultarSaldos}
          onAdd={(d) => adicionarEntregador(emp.id, d)} onEdit={(id, d) => atualizarEntregador(emp.id, id, d)} onDel={(id) => excluirEntregador(emp.id, id)} />}

        {aba === 'lancar' && <LancarEntregas emp={emp} semana={semana} semFim={semFim} onReg={(r) => registrarEntrega(emp.id, r)} />}

        {aba === 'fechar' && <Fechamento emp={emp} semana={semana} semFim={semFim} ocultar={ocultarSaldos}
          contas={getBanco('empresa').contas} onPagar={(p) => pagarEntregador(emp.id, p)} />}

        {aba === 'mensal' && <VisaoMensal emp={emp} ocultar={ocultarSaldos} />}

        {aba === 'relatorio' && <Relatorios emp={emp} semana={semana} ocultar={ocultarSaldos} />}
      </div>

      <ConfigModal open={showConfig} onClose={() => setShowConfig(false)} cfg={cfg}
        onSave={(c) => { setConfigEntregadores(emp.id, c); setSemana(inicioSemana(hoje(), c.inicioSemanaDia ?? cfg.inicioSemanaDia)) }} />
    </div>
  )
}

// ── Config do ciclo semanal ────────────────────────────────────────────────────
function ConfigModal({ open, onClose, cfg, onSave }: {
  open: boolean; onClose: () => void; cfg: ConfigEntregadores
  onSave: (c: Partial<ConfigEntregadores>) => void
}) {
  const [inicio, setInicio] = useState(cfg.inicioSemanaDia)
  const [pgto, setPgto] = useState(cfg.diaPagamento)
  const [comp, setComp] = useState<ConfigEntregadores['competencia']>(cfg.competencia)
  return (
    <Modal open={open} onClose={onClose} title="Configurar ciclo semanal">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#8b949e]">Semana começa em</label>
          <select value={inicio} onChange={e => setInicio(Number(e.target.value))} className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none">
            {DIAS_SEMANA.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
          <p className="text-[11px] text-[#484f58]">Define o período: {DIAS_SEMANA[inicio]} a {DIAS_SEMANA[(inicio + 6) % 7]}.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#8b949e]">Dia de fechamento/pagamento</label>
          <select value={pgto} onChange={e => setPgto(Number(e.target.value))} className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none">
            {DIAS_SEMANA.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[#8b949e]">Semana que cruza o mês (competência)</label>
          <select value={comp} onChange={e => setComp(e.target.value as ConfigEntregadores['competencia'])} className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none">
            <option value="simples">Simples — tudo no mês do pagamento</option>
            <option value="rateio">Rateio — divide proporcional entre os meses</option>
          </select>
          <p className="text-[11px] text-[#484f58]">O pagamento sempre entra no fluxo de caixa pela data real (regime de caixa). Isto afeta só a visão mensal/competência.</p>
        </div>
        <div className="flex gap-3 pt-1">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button onClick={() => { onSave({ inicioSemanaDia: inicio, diaPagamento: pgto, competencia: comp }); onClose() }}
            className="flex-1 text-white" style={{ background: '#e8a020' } as React.CSSProperties}>Salvar</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Visão mensal consolidada ────────────────────────────────────────────────────
function VisaoMensal({ emp, ocultar }: { emp: import('../../store/empresaTypes').Empresa; ocultar: boolean }) {
  const now = new Date()
  const [ano, setAno] = useState(now.getFullYear())
  const [mes, setMes] = useState(now.getMonth() + 1)
  const { criarCaixinha, getBanco } = useStore()

  const custoEntreg = custoEntregadoresMes(emp, ano, mes)
  const folha = folhaMensal(emp)
  const maoObra = custoMaoObraMes(emp, ano, mes)
  const semanas = semanasDoMes(emp, ano, mes)
  const cfg = getConfigEntregadores(emp)

  const mudarMes = (delta: number) => {
    let m = mes + delta, a = ano
    if (m < 1) { m = 12; a-- } else if (m > 12) { m = 1; a++ }
    setMes(m); setAno(a)
  }

  const provisionar = () => {
    const contas = getBanco('empresa').contas
    const conta = contas.find(c => c.contaPadrao) ?? contas[0]
    if (!conta) return
    const estSemana = semanas.length ? custoEntreg / semanas.length : 0
    criarCaixinha({
      contaId: conta.id, nome: 'Entregadores (provisão)', icone: 'Bike', cor: '#e8a020',
      meta: Math.round(estSemana), rende: false,
    }, 0, 'empresa')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center gap-3 bg-[#161b22] border border-[#21262d] rounded-xl py-2">
        <button onClick={() => mudarMes(-1)} className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#e6edf3]"><ChevronLeft size={18} /></button>
        <span className="text-sm font-medium text-[#e6edf3]">{MES_NOMES[mes - 1]} / {ano}</span>
        <button onClick={() => mudarMes(1)} className="p-1.5 rounded-lg text-[#8b949e] hover:text-[#e6edf3]"><ChevronRight size={18} /></button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-[11px] text-[#8b949e]">Entregadores (mês)</p><p className="text-lg font-bold" style={{ color: '#e8a020' }}>{maskSaldo(fmtBRL(custoEntreg), ocultar)}</p>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-[11px] text-[#8b949e]">Folha funcionários</p><p className="text-lg font-bold text-[#e6edf3]">{maskSaldo(fmtBRL(folha), ocultar)}</p>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: '#141a14', borderColor: '#e8a02033' }}>
          <p className="text-[11px] text-[#8b949e]">Mão de obra total</p><p className="text-lg font-bold" style={{ color: '#e8a020' }}>{maskSaldo(fmtBRL(maoObra), ocultar)}</p>
        </div>
      </div>

      <p className="text-[11px] text-[#8b949e]">Competência: {cfg.competencia === 'simples' ? 'simples (mês do pagamento)' : 'rateio proporcional entre meses'}.</p>

      {/* semanas do mês */}
      <div>
        <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">Semanas do mês</p>
        <div className="rounded-xl border overflow-hidden" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          {semanas.map(semIni => {
            const semFim = fimSemana(semIni, cfg.inicioSemanaDia)
            const total = totalSemanaTodos(emp, semIni)
            const pagos = (emp.pagamentosEntregador ?? []).filter(p => p.semanaInicio === semIni && p.status === 'pago')
            const pago = pagos.reduce((s, p) => s + p.totalPago, 0)
            return (
              <div key={semIni} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#21262d] last:border-0">
                <span className="flex-1 text-sm text-[#e6edf3]">{fmtDM(semIni)}–{fmtDM(semFim)} {cruzaMes(semIni, semFim) && <span className="text-[10px] text-[#3b82f6]">(cruza mês)</span>}</span>
                <span className="text-xs text-[#8b949e]">prev. {maskSaldo(fmtBRL(total), ocultar)}</span>
                <span className="text-sm font-semibold" style={{ color: pago > 0 ? '#1d9e75' : '#484f58' }}>{maskSaldo(fmtBRL(pago), ocultar)} pago</span>
              </div>
            )
          })}
        </div>
      </div>

      <Button onClick={provisionar} variant="ghost" className="self-start">
        <PiggyBank size={15} /> Criar caixinha de provisão semanal
      </Button>
    </div>
  )
}

// ── Lista + cadastro ──────────────────────────────────────────────────────────
function ListaEntregadores({ emp, semana, ocultar, onAdd, onEdit, onDel }: {
  emp: import('../../store/empresaTypes').Empresa; semana: string; ocultar: boolean
  onAdd: (d: Omit<Entregador, 'id' | 'criadoEm'>) => void
  onEdit: (id: string, d: Partial<Entregador>) => void
  onDel: (id: string) => void
}) {
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState<Entregador | null>(null)
  const [filtro, setFiltro] = useState<'ativos' | 'inativos' | 'todos'>('ativos')
  const [busca, setBusca] = useState('')
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const lista = (emp.entregadores ?? [])
    .filter(e => filtro === 'todos' || (filtro === 'ativos' ? e.status === 'ativo' : e.status === 'inativo'))
    .filter(e => !busca || e.nome.toLowerCase().includes(busca.toLowerCase()))
  const fixos = lista.filter(e => e.tipo === 'fixo')
  const eventuais = lista.filter(e => e.tipo === 'eventual')

  const Card = ({ e }: { e: Entregador }) => {
    const sem = entregasSemana(emp, e.id, semana)
    const aReceber = e.valorFixoSemanal + sem * e.valorPorEntrega
    return (
      <div className="rounded-xl border p-4 group" style={{ background: '#141a14', borderColor: e.status === 'ativo' ? '#e8a02033' : 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#e6edf3] truncate">{e.nome}</p>
            <p className="text-[11px] text-[#8b949e]">{e.tipo === 'fixo' ? 'Fixo' : 'Eventual'}{e.veiculo ? ` · ${e.veiculo}` : ''}{e.status === 'inativo' ? ' · inativo' : ''}</p>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => { setEdit(e); setModal(true) }} className="p-1 text-[#8b949e] hover:text-[#e6edf3]"><Pencil size={13} /></button>
            <button onClick={() => setConfirmDel(e.id)} className="p-1 text-[#8b949e] hover:text-[#ef4444]"><Trash2 size={13} /></button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div><p className="text-[10px] text-[#8b949e]">Fixo/sem</p><p className="text-xs font-semibold text-[#e6edf3]">{fmtBRL(e.valorFixoSemanal)}</p></div>
          <div><p className="text-[10px] text-[#8b949e]">Por entrega</p><p className="text-xs font-semibold text-[#e6edf3]">{fmtBRL(e.valorPorEntrega)}</p></div>
          <div><p className="text-[10px] text-[#8b949e]">Semana</p><p className="text-xs font-bold" style={{ color: '#e8a020' }}>{maskSaldo(fmtBRL(aReceber), ocultar)}</p></div>
        </div>
        {confirmDel === e.id && (
          <div className="flex gap-2 mt-3">
            <button onClick={() => setConfirmDel(null)} className="flex-1 py-1.5 text-xs rounded-lg bg-[#21262d] text-[#8b949e]">Cancelar</button>
            <button onClick={() => { onDel(e.id); setConfirmDel(null) }} className="flex-1 py-1.5 text-xs rounded-lg bg-[#da3633] text-white">Excluir</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[140px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#484f58]" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..."
            className="w-full bg-[#141a14] border border-[#30363d] rounded-lg pl-9 pr-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#e8a020]" />
        </div>
        <select value={filtro} onChange={e => setFiltro(e.target.value as typeof filtro)}
          className="bg-[#141a14] border border-[#30363d] rounded-lg px-2.5 py-2 text-sm text-[#8b949e] focus:outline-none">
          <option value="ativos">Ativos</option><option value="inativos">Inativos</option><option value="todos">Todos</option>
        </select>
        <Button onClick={() => { setEdit(null); setModal(true) }} className="text-white" style={{ background: '#e8a020' } as React.CSSProperties}>
          <Plus size={15} /> Novo
        </Button>
      </div>

      {lista.length === 0 && <p className="text-sm text-[#8b949e] text-center py-8">Nenhum entregador. Cadastre o primeiro!</p>}

      {fixos.length > 0 && <>
        <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wider">Fixos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{fixos.map(e => <Card key={e.id} e={e} />)}</div>
      </>}
      {eventuais.length > 0 && <>
        <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wider mt-2">Eventuais</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{eventuais.map(e => <Card key={e.id} e={e} />)}</div>
      </>}

      <EntregadorForm open={modal} onClose={() => setModal(false)} initial={edit}
        onSave={(d) => { if (edit) onEdit(edit.id, d); else onAdd(d) }} />
    </div>
  )
}

function EntregadorForm({ open, onClose, initial, onSave }: {
  open: boolean; onClose: () => void; initial: Entregador | null
  onSave: (d: Omit<Entregador, 'id' | 'criadoEm'>) => void
}) {
  const [f, setF] = useState(() => ({
    nome: initial?.nome ?? '', tipo: initial?.tipo ?? 'fixo' as 'fixo' | 'eventual',
    contato: initial?.contato ?? '', pix: initial?.pix ?? '', cpf: initial?.cpf ?? '',
    veiculo: initial?.veiculo ?? 'moto' as 'moto' | 'bike' | 'carro' | 'outro',
    valorFixoSemanal: String(initial?.valorFixoSemanal ?? ''), valorPorEntrega: String(initial?.valorPorEntrega ?? ''),
    observacoes: initial?.observacoes ?? '', status: initial?.status ?? 'ativo' as 'ativo' | 'inativo',
  }))
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!f.nome.trim()) return
    onSave({
      nome: f.nome.trim(), tipo: f.tipo, contato: f.contato || undefined, pix: f.pix || undefined,
      cpf: f.cpf || undefined, veiculo: f.veiculo, valorFixoSemanal: parseFloat(f.valorFixoSemanal) || 0,
      valorPorEntrega: parseFloat(f.valorPorEntrega) || 0, observacoes: f.observacoes || undefined, status: f.status,
    })
    onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar entregador' : 'Novo entregador'}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Nome" value={f.nome} onChange={e => setF(s => ({ ...s, nome: e.target.value }))} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#8b949e]">Tipo</label>
            <select value={f.tipo} onChange={e => setF(s => ({ ...s, tipo: e.target.value as 'fixo' | 'eventual' }))}
              className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none">
              <option value="fixo">Fixo</option><option value="eventual">Eventual</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#8b949e]">Veículo</label>
            <select value={f.veiculo} onChange={e => setF(s => ({ ...s, veiculo: e.target.value as typeof f.veiculo }))}
              className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none">
              <option value="moto">Moto</option><option value="bike">Bike</option><option value="carro">Carro</option><option value="outro">Outro</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Valor fixo semanal (R$)" type="number" inputMode="decimal" value={f.valorFixoSemanal} onChange={e => setF(s => ({ ...s, valorFixoSemanal: e.target.value }))} placeholder="0,00" />
          <Input label="Valor por entrega (R$)" type="number" inputMode="decimal" value={f.valorPorEntrega} onChange={e => setF(s => ({ ...s, valorPorEntrega: e.target.value }))} placeholder="0,00" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Contato/WhatsApp" value={f.contato} onChange={e => setF(s => ({ ...s, contato: e.target.value }))} />
          <Input label="Chave PIX" value={f.pix} onChange={e => setF(s => ({ ...s, pix: e.target.value }))} />
        </div>
        <Input label="CPF (opcional)" value={f.cpf} onChange={e => setF(s => ({ ...s, cpf: e.target.value }))} />
        <Input label="Observações" value={f.observacoes} onChange={e => setF(s => ({ ...s, observacoes: e.target.value }))} placeholder="ajuda combustível, bônus..." />
        <label className="flex items-center gap-2 text-sm text-[#e6edf3] cursor-pointer">
          <input type="checkbox" checked={f.status === 'ativo'} onChange={e => setF(s => ({ ...s, status: e.target.checked ? 'ativo' : 'inativo' }))} className="accent-[#e8a020] w-4 h-4" /> Ativo
        </label>
        <div className="flex gap-3"><Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" className="flex-1 text-white" style={{ background: '#e8a020' } as React.CSSProperties}>Salvar</Button></div>
      </form>
    </Modal>
  )
}

// ── Lançar entregas (rápido em lote por dia) ─────────────────────────────────
function LancarEntregas({ emp, semana, semFim, onReg }: {
  emp: import('../../store/empresaTypes').Empresa; semana: string; semFim: string
  onReg: (r: Omit<import('../../store/empresaTypes').RegistroEntrega, 'id'>) => void
}) {
  const [data, setData] = useState(hoje())
  const [qtd, setQtd] = useState<Record<string, number>>({})
  const ativos = (emp.entregadores ?? []).filter(e => e.status === 'ativo')

  const setQ = (id: string, v: number) => setQtd(s => ({ ...s, [id]: Math.max(0, v) }))
  const lancarTodos = () => {
    ativos.forEach(e => { const q = qtd[e.id] ?? 0; if (q > 0) onReg({ entregadorId: e.id, data, quantidade: q }) })
    setQtd({})
  }
  const totalLancar = Object.values(qtd).reduce((s, v) => s + (v || 0), 0)

  // entregas já lançadas no dia
  const jaLancado = (id: string) => (emp.registrosEntrega ?? []).filter(r => r.entregadorId === id && r.data.slice(0, 10) === data).reduce((s, r) => s + r.quantidade, 0)

  return (
    <div className="flex flex-col gap-4">
      <Input label="Data" type="date" value={data} min={semana} max={semFim} onChange={e => setData(e.target.value)} />
      {ativos.length === 0 ? <p className="text-sm text-[#8b949e] text-center py-8">Cadastre entregadores ativos primeiro.</p> : (
        <div className="flex flex-col gap-2">
          {ativos.map(e => (
            <div key={e.id} className="flex items-center gap-3 rounded-xl p-3 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#e6edf3] truncate">{e.nome}</p>
                <p className="text-[11px] text-[#8b949e]">{e.tipo} · já hoje: {jaLancado(e.id)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setQ(e.id, (qtd[e.id] ?? 0) - 1)} className="w-9 h-9 rounded-lg bg-[#21262d] text-[#e6edf3] flex items-center justify-center"><Minus size={16} /></button>
                <input value={qtd[e.id] ?? 0} onChange={ev => setQ(e.id, parseInt(ev.target.value) || 0)} inputMode="numeric"
                  className="w-12 text-center bg-[#0a0f0a] border border-[#30363d] rounded-lg py-1.5 text-sm text-[#e6edf3] focus:outline-none" />
                <button onClick={() => setQ(e.id, (qtd[e.id] ?? 0) + 1)} className="w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{ background: '#e8a020' }}><Plus size={16} /></button>
              </div>
            </div>
          ))}
          <Button onClick={lancarTodos} disabled={totalLancar === 0} className="text-white mt-2" style={{ background: '#e8a020' } as React.CSSProperties}>
            <Check size={16} /> Lançar {totalLancar} entrega(s) em {fmtDM(data)}
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Fechamento + pagamento ────────────────────────────────────────────────────
function Fechamento({ emp, semana, semFim, ocultar, contas, onPagar }: {
  emp: import('../../store/empresaTypes').Empresa; semana: string; semFim: string; ocultar: boolean
  contas: import('../../store/bancoTypes').ContaBancaria[]
  onPagar: (p: Omit<import('../../store/empresaTypes').PagamentoEntregador, 'id' | 'status' | 'dataPagamento' | 'transacaoId'>) => void
}) {
  const resumos = useMemo(() => resumoTodos(emp, semana), [emp, semana])
  const total = totalSemanaTodos(emp, semana)
  const [contaId, setContaId] = useState(contas.find(c => c.contaPadrao)?.id ?? contas[0]?.id ?? '')

  const pagar = (r: typeof resumos[number]) => {
    onPagar({
      entregadorId: r.entregador.id, semanaInicio: semana, semanaFim: semFim,
      valorFixo: r.valorFixo, totalEntregas: r.totalEntregas, valorEntregas: r.valorEntregas,
      bonus: r.bonus, desconto: r.desconto, totalPago: r.total, contaId,
    })
  }
  const pagarTodos = () => resumos.filter(r => !r.pago && r.total > 0).forEach(pagar)

  if (resumos.length === 0) return <p className="text-sm text-[#8b949e] text-center py-8">Sem entregadores/entregas nesta semana.</p>

  return (
    <div className="flex flex-col gap-4">
      {/* conta de origem */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[#8b949e]">Pagar da conta (PJ)</label>
        <select value={contaId} onChange={e => setContaId(e.target.value)}
          className="bg-[#141a14] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#e8a020]">
          {contas.length === 0 && <option value="">Nenhuma conta PJ — cadastre em Contas</option>}
          {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
        {resumos.map(r => (
          <div key={r.entregador.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#21262d] last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#e6edf3] truncate">{r.entregador.nome} <span className="text-[11px] text-[#8b949e]">({r.entregador.tipo})</span></p>
              <p className="text-[11px] text-[#8b949e]">
                fixo {fmtBRL(r.valorFixo)} + {r.totalEntregas}×{fmtBRL(r.entregador.valorPorEntrega)}
                {r.bonus > 0 ? ` + bônus ${fmtBRL(r.bonus)}` : ''}{r.desconto > 0 ? ` - ${fmtBRL(r.desconto)}` : ''}
              </p>
            </div>
            <span className="text-sm font-bold" style={{ color: '#e8a020' }}>{maskSaldo(fmtBRL(r.total), ocultar)}</span>
            {r.pago ? (
              <span className="text-xs px-2 py-1 rounded-md flex items-center gap-1" style={{ background: '#1d9e7522', color: '#1d9e75' }}><Check size={11} /> Pago</span>
            ) : (
              <button onClick={() => pagar(r)} disabled={!contaId || r.total <= 0}
                className="text-xs px-3 py-1.5 rounded-md text-white disabled:opacity-40" style={{ background: '#1d9e75' }}>Pagar</button>
            )}
          </div>
        ))}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0a0f0a]">
          <span className="text-sm text-[#8b949e]">Total da semana</span>
          <span className="text-lg font-black" style={{ color: '#e8a020' }}>{maskSaldo(fmtBRL(total), ocultar)}</span>
        </div>
      </div>

      <Button onClick={pagarTodos} disabled={!contaId || resumos.every(r => r.pago || r.total <= 0)}
        className="text-white" style={{ background: '#1d9e75' } as React.CSSProperties}>
        <DollarSign size={16} /> Pagar todos os pendentes
      </Button>
    </div>
  )
}

// ── Relatórios ────────────────────────────────────────────────────────────────
function Relatorios({ emp, semana, ocultar }: { emp: import('../../store/empresaTypes').Empresa; semana: string; ocultar: boolean }) {
  const resumos = useMemo(() => resumoTodos(emp, semana), [emp, semana])
  const totalEntregas = resumos.reduce((s, r) => s + r.totalEntregas, 0)
  const totalCusto = resumos.reduce((s, r) => s + r.total, 0)
  const inicio30 = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) })()
  const cpe = custoPorEntrega(emp, inicio30)
  const ranking = [...resumos].sort((a, b) => b.totalEntregas - a.totalEntregas).filter(r => r.totalEntregas > 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-[11px] text-[#8b949e]">Entregas (semana)</p><p className="text-lg font-bold text-[#e6edf3]">{totalEntregas}</p>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-[11px] text-[#8b949e]">Custo (semana)</p><p className="text-lg font-bold" style={{ color: '#e8a020' }}>{maskSaldo(fmtBRL(totalCusto), ocultar)}</p>
        </div>
        <div className="rounded-xl p-4 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-[11px] text-[#8b949e]">Custo/entrega (30d)</p><p className="text-lg font-bold text-[#e6edf3]">{maskSaldo(fmtBRL(cpe), ocultar)}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">Ranking de entregas (semana)</p>
        {ranking.length === 0 ? <p className="text-sm text-[#8b949e]">Sem entregas registradas.</p> : (
          <div className="rounded-xl border overflow-hidden" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
            {ranking.map((r, i) => (
              <div key={r.entregador.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#21262d] last:border-0">
                <span className="text-sm font-bold text-[#484f58] w-5">{i + 1}º</span>
                <span className="flex-1 text-sm text-[#e6edf3] truncate">{r.entregador.nome}</span>
                <span className="text-sm font-semibold" style={{ color: '#e8a020' }}>{r.totalEntregas} entregas</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
