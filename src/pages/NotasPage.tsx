import { useState, useMemo } from 'react'
import {
  StickyNote, Plus, Search, Pin, Trash2, Pencil, Check, X, Archive,
  Bell, Calendar, ListChecks, FileText, DollarSign, Sparkles, ArchiveRestore, Brain,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import type { Nota, NotaTipo, ChecklistItemNota } from '../store/notasTypes'
import { NOTA_CORES } from '../store/notasTypes'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { DatePicker } from '../components/ui/DatePicker'
import { sugerirDaNota } from '../services/notasIA'

const nano = () => Math.random().toString(36).slice(2, 9)
const hoje = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

type Aba = 'mural' | 'agenda' | 'arquivadas'
type Ordenar = 'recente' | 'lembrete' | 'cor' | 'alfabetico'

const TIPO_ICON: Record<NotaTipo, React.ElementType> = {
  simples: FileText, checklist: ListChecks, lembrete: Bell, financeira: DollarSign,
}

export function NotasPage() {
  const { perfilAtivo, getNotas, criarNota, atualizarNota, excluirNota, getBanco, converterNotaEmProjeto, setActiveView } = useStore()
  const accent = perfilAtivo === 'pessoal' ? '#1d9e75' : '#e8a020'
  const notas = getNotas()
  const contas = getBanco().contas

  const [aba, setAba] = useState<Aba>('mural')
  const [busca, setBusca] = useState('')
  const [filtroTag, setFiltroTag] = useState('')
  const [ordenar, setOrdenar] = useState<Ordenar>('recente')
  const [quick, setQuick] = useState('')
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState<Nota | null>(null)

  const tags = useMemo(() => {
    const s = new Set<string>(); notas.forEach(n => n.tags.forEach(t => s.add(t))); return [...s]
  }, [notas])

  const filtradas = useMemo(() => {
    let l = notas.filter(n => aba === 'arquivadas' ? n.arquivada : !n.arquivada)
    if (aba === 'agenda') l = l.filter(n => n.tipo === 'lembrete' && n.dataLembrete && !n.lembreteResolvido)
    if (busca) l = l.filter(n => (n.titulo + ' ' + n.texto).toLowerCase().includes(busca.toLowerCase()))
    if (filtroTag) l = l.filter(n => n.tags.includes(filtroTag))
    l = [...l].sort((a, b) => {
      if (aba === 'agenda' || ordenar === 'lembrete') return (a.dataLembrete ?? '9').localeCompare(b.dataLembrete ?? '9')
      if (ordenar === 'cor') return a.cor.localeCompare(b.cor)
      if (ordenar === 'alfabetico') return (a.titulo || a.texto).localeCompare(b.titulo || b.texto)
      return b.criadaEm.localeCompare(a.criadaEm)
    })
    // fixadas primeiro (exceto agenda)
    if (aba === 'mural') l = [...l.filter(n => n.fixada), ...l.filter(n => !n.fixada)]
    return l
  }, [notas, aba, busca, filtroTag, ordenar])

  const capturaRapida = () => {
    if (!quick.trim()) return
    criarNota({ tipo: 'simples', titulo: '', texto: quick.trim(), cor: NOTA_CORES[0], tags: [], fixada: false, arquivada: false })
    setQuick('')
  }

  const ABAS: { id: Aba; label: string; icon: React.ElementType }[] = [
    { id: 'mural', label: 'Mural', icon: StickyNote },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'arquivadas', label: 'Arquivadas', icon: Archive },
  ]

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0f0a]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}22` }}>
              <StickyNote size={18} style={{ color: accent }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#e6edf3]">Bloco de Notas</h1>
              <p className="text-xs text-[#8b949e]">{perfilAtivo === 'pessoal' ? 'Pessoal' : 'Empresa'} · {notas.filter(n => !n.arquivada).length} notas</p>
            </div>
          </div>
          <Button onClick={() => { setEdit(null); setModal(true) }} className="text-white" style={{ background: accent } as React.CSSProperties}>
            <Plus size={15} /> <span className="hidden sm:inline">Nova nota</span>
          </Button>
        </div>

        {/* Captura rápida */}
        <div className="flex gap-2">
          <input value={quick} onChange={e => setQuick(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') capturaRapida() }}
            placeholder="Anote algo..." className="flex-1 bg-[#141a14] border border-[#30363d] rounded-lg px-3 py-2.5 text-sm text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-current" style={{ color: '#e6edf3' }} />
          <Button onClick={capturaRapida} disabled={!quick.trim()} className="text-white" style={{ background: accent } as React.CSSProperties}><Check size={16} /></Button>
        </div>

        {/* Abas */}
        <div className="flex gap-1 bg-[#161b22] border border-[#21262d] rounded-xl p-1 self-start">
          {ABAS.map(a => { const Icon = a.icon; const on = aba === a.id; return (
            <button key={a.id} onClick={() => setAba(a.id)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: on ? `${accent}22` : 'transparent', color: on ? accent : '#8b949e' }}>
              <Icon size={15} /> {a.label}
            </button>
          )})}
        </div>

        {/* Filtros */}
        {aba !== 'agenda' && (
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[140px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#484f58]" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..."
                className="w-full bg-[#141a14] border border-[#30363d] rounded-lg pl-9 pr-3 py-2 text-sm text-[#e6edf3] focus:outline-none" />
            </div>
            {tags.length > 0 && (
              <select value={filtroTag} onChange={e => setFiltroTag(e.target.value)} className="bg-[#141a14] border border-[#30363d] rounded-lg px-2.5 py-2 text-sm text-[#8b949e] focus:outline-none">
                <option value="">Todas tags</option>
                {tags.map(t => <option key={t} value={t}>#{t}</option>)}
              </select>
            )}
            <select value={ordenar} onChange={e => setOrdenar(e.target.value as Ordenar)} className="bg-[#141a14] border border-[#30363d] rounded-lg px-2.5 py-2 text-sm text-[#8b949e] focus:outline-none">
              <option value="recente">Recente</option><option value="lembrete">Lembrete</option><option value="cor">Cor</option><option value="alfabetico">A-Z</option>
            </select>
          </div>
        )}

        {/* Mural */}
        {filtradas.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center gap-2">
            <StickyNote size={32} className="text-[#30363d]" />
            <p className="text-sm text-[#8b949e]">{aba === 'agenda' ? 'Nenhum lembrete futuro.' : aba === 'arquivadas' ? 'Nada arquivado.' : 'Nenhuma nota ainda. Anote algo!'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtradas.map(n => (
              <NotaCard key={n.id} nota={n} accent={accent} contas={contas}
                onEdit={() => { setEdit(n); setModal(true) }}
                onPin={() => atualizarNota(n.id, { fixada: !n.fixada })}
                onArchive={() => atualizarNota(n.id, { arquivada: !n.arquivada })}
                onDelete={() => excluirNota(n.id)}
                onToggleItem={(itemId) => {
                  const itens = (n.itensChecklist ?? []).map(i => i.id === itemId ? { ...i, feito: !i.feito } : i)
                  atualizarNota(n.id, { itensChecklist: itens })
                }}
                onResolver={() => atualizarNota(n.id, { lembreteResolvido: true })}
                onConverter={() => { if (converterNotaEmProjeto(n.id)) setActiveView('projects') }}
              />
            ))}
          </div>
        )}
      </div>

      <NotaEditor open={modal} onClose={() => setModal(false)} accent={accent} initial={edit} contas={contas}
        onSave={(d) => { if (edit) atualizarNota(edit.id, d); else criarNota(d) }} />
    </div>
  )
}

// ── Card post-it ──────────────────────────────────────────────────────────────
function NotaCard({ nota: n, accent, contas, onEdit, onPin, onArchive, onDelete, onToggleItem, onResolver, onConverter }: {
  nota: Nota; accent: string; contas: { id: string; nome: string }[]
  onEdit: () => void; onPin: () => void; onArchive: () => void; onDelete: () => void
  onToggleItem: (id: string) => void; onResolver: () => void; onConverter: () => void
}) {
  const Icon = TIPO_ICON[n.tipo]
  const lembreteVenc = n.dataLembrete ? new Date(n.dataLembrete).getTime() < Date.now() : false
  const vincLabel = n.vinculo?.tipo === 'conta'
    ? (contas.find(c => c.id === n.vinculo!.id)?.nome ?? 'Conta')
    : n.vinculo?.label
  return (
    <div className="rounded-2xl p-4 border group relative flex flex-col gap-2" style={{ background: `${n.cor}14`, borderColor: `${n.cor}44` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon size={14} style={{ color: n.cor }} className="shrink-0" />
          {n.titulo && <p className="text-sm font-semibold text-[#e6edf3] truncate">{n.titulo}</p>}
        </div>
        <div className="flex gap-0.5 shrink-0">
          <button onClick={onPin} className="p-1" style={{ color: n.fixada ? accent : '#484f58' }}><Pin size={13} fill={n.fixada ? accent : 'none'} /></button>
          <button onClick={onEdit} className="p-1 text-[#8b949e] hover:text-[#e6edf3] opacity-0 group-hover:opacity-100"><Pencil size={13} /></button>
        </div>
      </div>

      {n.tipo === 'checklist' && n.itensChecklist ? (
        <div className="flex flex-col gap-1">
          {n.itensChecklist.map(it => (
            <button key={it.id} onClick={() => onToggleItem(it.id)} className="flex items-center gap-2 text-left">
              <span className="w-4 h-4 rounded border flex items-center justify-center shrink-0" style={{ borderColor: n.cor, background: it.feito ? n.cor : 'transparent' }}>
                {it.feito && <Check size={11} className="text-white" />}
              </span>
              <span className={`text-sm ${it.feito ? 'line-through text-[#484f58]' : 'text-[#e6edf3]'}`}>{it.texto}</span>
            </button>
          ))}
        </div>
      ) : (
        n.texto && <p className="text-sm text-[#e6edf3] whitespace-pre-wrap line-clamp-6">{n.texto}</p>
      )}

      {n.dataLembrete && (
        <div className="flex items-center gap-1.5 text-xs" style={{ color: lembreteVenc ? '#ef4444' : accent }}>
          <Bell size={12} /> {new Date(n.dataLembrete).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          {n.lembreteResolvido && <Check size={12} className="text-[#1d9e75]" />}
        </div>
      )}

      {vincLabel && (
        <div className="flex items-center gap-1.5 text-xs text-[#8b949e]">
          {n.vinculo?.tipo === 'modulo' ? <Brain size={12} /> : <DollarSign size={12} />}
          <span className="truncate">{vincLabel}</span>
        </div>
      )}

      {n.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {n.tags.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${n.cor}22`, color: n.cor }}>#{t}</span>)}
        </div>
      )}

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end mt-1">
        {n.tipo === 'lembrete' && !n.lembreteResolvido && <button onClick={onResolver} className="text-[11px] px-2 py-1 rounded-md text-[#1d9e75]">Resolver</button>}
        <button onClick={onConverter} title="Converter em Mapa Mental" className="p-1 text-[#8b949e] hover:text-[#8b5cf6]"><Brain size={13} /></button>
        <button onClick={onArchive} className="p-1 text-[#8b949e] hover:text-[#e6edf3]">{n.arquivada ? <ArchiveRestore size={13} /> : <Archive size={13} />}</button>
        <button onClick={onDelete} className="p-1 text-[#8b949e] hover:text-[#ef4444]"><Trash2 size={13} /></button>
      </div>
    </div>
  )
}

// ── Editor ────────────────────────────────────────────────────────────────────
function NotaEditor({ open, onClose, accent, initial, contas, onSave }: {
  open: boolean; onClose: () => void; accent: string; initial: Nota | null
  contas: { id: string; nome: string }[]
  onSave: (d: Omit<Nota, 'id' | 'criadaEm' | 'atualizadaEm'>) => void
}) {
  const [tipo, setTipo] = useState<NotaTipo>(initial?.tipo ?? 'simples')
  const [vinculoConta, setVinculoConta] = useState(initial?.vinculo?.tipo === 'conta' ? initial.vinculo.id : '')
  const [titulo, setTitulo] = useState(initial?.titulo ?? '')
  const [texto, setTexto] = useState(initial?.texto ?? '')
  const [cor, setCor] = useState(initial?.cor ?? NOTA_CORES[0])
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [novaTag, setNovaTag] = useState('')
  const [itens, setItens] = useState<ChecklistItemNota[]>(initial?.itensChecklist ?? [])
  const [novoItem, setNovoItem] = useState('')
  const [dataLembrete, setDataLembrete] = useState(initial?.dataLembrete?.slice(0, 16) ?? '')
  const [recorrencia, setRecorrencia] = useState(initial?.recorrencia ?? 'nenhuma')
  const [iaLoading, setIaLoading] = useState(false)
  const [iaMsg, setIaMsg] = useState('')

  const addTag = () => { const t = novaTag.trim().replace('#', ''); if (t && !tags.includes(t)) { setTags([...tags, t]); setNovaTag('') } }
  const addItem = () => { if (novoItem.trim()) { setItens([...itens, { id: nano(), texto: novoItem.trim(), feito: false }]); setNovoItem('') } }

  const rodarIA = async () => {
    setIaLoading(true); setIaMsg('')
    const r = await sugerirDaNota(texto || titulo)
    setIaLoading(false)
    if (!r.ok) { setIaMsg(r.error ?? 'IA indisponível.'); return }
    if (r.tags?.length) setTags(prev => [...new Set([...prev, ...r.tags!])])
    if (r.dataLembrete) { setDataLembrete(r.dataLembrete.slice(0, 16)); if (tipo === 'simples') setTipo('lembrete') }
    if (r.checklist?.length && tipo === 'simples') {
      setTipo('checklist'); setItens(r.checklist.map(t => ({ id: nano(), texto: t, feito: false })))
    }
    setIaMsg('Sugestões aplicadas ✓')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!texto.trim() && !titulo.trim() && itens.length === 0) return
    onSave({
      tipo, titulo: titulo.trim(), texto: texto.trim(), cor, tags,
      itensChecklist: tipo === 'checklist' ? itens : undefined,
      fixada: initial?.fixada ?? false, arquivada: initial?.arquivada ?? false,
      dataLembrete: tipo === 'lembrete' && dataLembrete ? dataLembrete : undefined,
      recorrencia: tipo === 'lembrete' ? recorrencia : undefined,
      lembreteResolvido: initial?.lembreteResolvido,
      vinculo: tipo === 'financeira' && vinculoConta
        ? { tipo: 'conta', id: vinculoConta, label: contas.find(c => c.id === vinculoConta)?.nome }
        : initial?.vinculo?.tipo === 'modulo' ? initial.vinculo : undefined,
    })
    onClose()
  }

  const TIPOS: { id: NotaTipo; label: string; icon: React.ElementType }[] = [
    { id: 'simples', label: 'Nota', icon: FileText },
    { id: 'checklist', label: 'Checklist', icon: ListChecks },
    { id: 'lembrete', label: 'Lembrete', icon: Bell },
    { id: 'financeira', label: 'Financeira', icon: DollarSign },
  ]

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar nota' : 'Nova nota'}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {/* tipo */}
        <div className="grid grid-cols-2 gap-2">
          {TIPOS.map(t => { const Icon = t.icon; const on = tipo === t.id; return (
            <button key={t.id} type="button" onClick={() => setTipo(t.id)} className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm border transition-colors"
              style={{ background: on ? `${accent}22` : 'transparent', color: on ? accent : '#8b949e', borderColor: on ? accent : '#30363d' }}>
              <Icon size={14} /> {t.label}
            </button>
          )})}
        </div>

        <Input label="Título (opcional)" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Título" />

        {tipo === 'checklist' ? (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#8b949e]">Itens</label>
            {itens.map(it => (
              <div key={it.id} className="flex items-center gap-2">
                <button type="button" onClick={() => setItens(itens.map(x => x.id === it.id ? { ...x, feito: !x.feito } : x))}
                  className="w-5 h-5 rounded border flex items-center justify-center" style={{ borderColor: cor, background: it.feito ? cor : 'transparent' }}>
                  {it.feito && <Check size={12} className="text-white" />}
                </button>
                <span className={`flex-1 text-sm ${it.feito ? 'line-through text-[#484f58]' : 'text-[#e6edf3]'}`}>{it.texto}</span>
                <button type="button" onClick={() => setItens(itens.filter(x => x.id !== it.id))} className="text-[#484f58] hover:text-[#ef4444]"><X size={14} /></button>
              </div>
            ))}
            <div className="flex gap-2">
              <input value={novoItem} onChange={e => setNovoItem(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
                placeholder="Novo item..." className="flex-1 bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none" />
              <Button type="button" size="sm" onClick={addItem}><Plus size={14} /></Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#8b949e]">Texto</label>
            <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={4} placeholder="Escreva sua nota..."
              className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-current resize-none" />
          </div>
        )}

        {/* IA opcional */}
        <button type="button" onClick={rodarIA} disabled={iaLoading || (!texto && !titulo)}
          className="flex items-center justify-center gap-2 py-2 rounded-lg text-sm border border-dashed disabled:opacity-40"
          style={{ borderColor: `${accent}66`, color: accent }}>
          <Sparkles size={14} /> {iaLoading ? 'Analisando...' : 'IA: detectar data, tags e tarefas'}
        </button>
        {iaMsg && <p className="text-xs" style={{ color: iaMsg.includes('✓') ? '#1d9e75' : '#e8a020' }}>{iaMsg}</p>}

        {tipo === 'lembrete' && (() => {
          const base = dataLembrete || hoje()
          const dataParte = base.slice(0, 10)
          const horaParte = base.slice(11, 16) || '09:00'
          return (
            <div className="grid grid-cols-2 gap-3">
              <DatePicker label="Data" accent={accent} value={dataParte} onChange={d => setDataLembrete(`${d}T${horaParte}`)} />
              <Input label="Hora" type="time" value={horaParte} onChange={e => setDataLembrete(`${dataParte}T${e.target.value || '09:00'}`)} />
              <div className="flex flex-col gap-1.5 col-span-2">
                <label className="text-sm font-medium text-[#8b949e]">Repetir</label>
                <select value={recorrencia} onChange={e => setRecorrencia(e.target.value as typeof recorrencia)}
                  className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none">
                  <option value="nenhuma">Não repetir</option><option value="semanal">Semanal</option><option value="mensal">Mensal</option>
                </select>
              </div>
            </div>
          )
        })()}

        {tipo === 'financeira' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#8b949e]">Vincular à conta</label>
            <select value={vinculoConta} onChange={e => setVinculoConta(e.target.value)}
              className="bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none">
              <option value="">Nenhuma</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <p className="text-xs text-[#484f58]">A nota aparecerá como ícone na conta vinculada.</p>
          </div>
        )}

        {/* cor */}
        <div>
          <label className="text-sm font-medium text-[#8b949e] block mb-2">Cor</label>
          <div className="flex gap-2 flex-wrap">
            {NOTA_CORES.map(c => <button key={c} type="button" onClick={() => setCor(c)} className="w-7 h-7 rounded-full transition-transform hover:scale-110" style={{ background: c, outline: cor === c ? '2px solid #fff' : 'none', outlineOffset: 2 }} />)}
          </div>
        </div>

        {/* tags */}
        <div>
          <label className="text-sm font-medium text-[#8b949e] block mb-1.5">Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map(t => <span key={t} onClick={() => setTags(tags.filter(x => x !== t))} className="text-xs px-2 py-0.5 rounded-full cursor-pointer" style={{ background: `${cor}22`, color: cor }}>#{t} ×</span>)}
          </div>
          <div className="flex gap-2">
            <input value={novaTag} onChange={e => setNovaTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
              placeholder="nova tag" className="flex-1 bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-1.5 text-sm text-[#e6edf3] focus:outline-none" />
            <Button type="button" size="sm" onClick={addTag}><Plus size={14} /></Button>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button type="submit" className="flex-1 text-white" style={{ background: accent } as React.CSSProperties}>Salvar</Button>
        </div>
      </form>
    </Modal>
  )
}
