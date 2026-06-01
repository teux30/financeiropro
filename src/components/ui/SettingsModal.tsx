import { useState } from 'react'
import { Trash2, Plus, Check } from 'lucide-react'
import { Modal } from './Modal'
import { Input } from './Input'
import { Button } from './Button'
import { useStore } from '../../store/useStore'

interface Props {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: Props) {
  const {
    usuario, setUsuario,
    simParams, setSimParams,
    empresas, empresaAtivaId, setEmpresaAtiva,
    adicionarEmpresa, atualizarEmpresa, excluirEmpresa,
  } = useStore()

  const [tab, setTab] = useState<'pessoal' | 'empresa'>('pessoal')
  const [nome, setNome] = useState(usuario.nome)
  const [metaInput, setMetaInput] = useState(String(simParams.meta))
  const [aporteInput, setAporteInput] = useState(String(simParams.mensal))
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [showAddEmpresa, setShowAddEmpresa] = useState(false)
  const [newNome, setNewNome] = useState('')
  const [newSetor, setNewSetor] = useState('')

  const empresaId = empresaAtivaId ?? empresas[0]?.id
  const empresa = empresas.find(e => e.id === empresaId)

  const savePessoal = () => {
    setUsuario({ nome })
    setSimParams({ meta: Number(metaInput) || 0, mensal: Number(aporteInput) || 0 })
  }

  const saveEmpresa = (field: string, value: string | number) => {
    if (!empresaId) return
    if (field === 'nome') atualizarEmpresa(empresaId, { nome: String(value) })
    if (field === 'setor') atualizarEmpresa(empresaId, { setor: String(value) })
    if (field === 'cnpj') atualizarEmpresa(empresaId, { cnpj: String(value) })
    if (field === 'faturamento') atualizarEmpresa(empresaId, { metas: { ...empresa!.metas, faturamento: Number(value) } })
    if (field === 'lucro') atualizarEmpresa(empresaId, { metas: { ...empresa!.metas, lucro: Number(value) } })
    if (field === 'cmvMax') atualizarEmpresa(empresaId, { metas: { ...empresa!.metas, cmvMax: Number(value) } })
    if (field === 'custosRHMax') atualizarEmpresa(empresaId, { metas: { ...empresa!.metas, custosRHMax: Number(value) } })
  }

  const handleAddEmpresa = () => {
    if (!newNome.trim()) return
    adicionarEmpresa({ nome: newNome.trim(), setor: newSetor.trim() || 'Geral' })
    setNewNome('')
    setNewSetor('')
    setShowAddEmpresa(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Configurações" maxWidth="max-w-lg">
      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#0d1117] p-1 rounded-lg">
        {(['pessoal', 'empresa'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{
              background: tab === t ? (t === 'pessoal' ? '#1d9e7522' : '#e8a02022') : 'transparent',
              color: tab === t ? (t === 'pessoal' ? '#1d9e75' : '#e8a020') : '#8b949e',
            }}
          >
            {t === 'pessoal' ? '👤 Pessoal' : '🏢 Empresa'}
          </button>
        ))}
      </div>

      {tab === 'pessoal' && (
        <div className="flex flex-col gap-4">
          <Input label="Seu nome" value={nome} onChange={e => setNome(e.target.value)} />
          <Input
            label="Meta de renda passiva (R$)"
            type="number"
            value={metaInput}
            onChange={e => setMetaInput(e.target.value)}
          />
          <Input
            label="Aporte mensal planejado (R$)"
            type="number"
            value={aporteInput}
            onChange={e => setAporteInput(e.target.value)}
          />
          <Button variant="primary" onClick={savePessoal} style={{ background: '#1d9e75' } as React.CSSProperties}>
            <Check size={15} /> Salvar configurações
          </Button>
        </div>
      )}

      {tab === 'empresa' && (
        <div className="flex flex-col gap-4">
          {/* Empresa selector */}
          {empresas.length > 1 && (
            <div>
              <label className="text-sm font-medium text-[#8b949e] block mb-1.5">Empresa ativa</label>
              <select
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#e8a020]"
                value={empresaId}
                onChange={e => setEmpresaAtiva(e.target.value)}
              >
                {empresas.map(e => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>
          )}

          {empresa && (
            <>
              <Input label="Nome da empresa" defaultValue={empresa.nome} onBlur={e => saveEmpresa('nome', e.target.value)} />
              <Input label="Setor / Ramo" defaultValue={empresa.setor} onBlur={e => saveEmpresa('setor', e.target.value)} />
              <Input label="CNPJ (opcional)" defaultValue={empresa.cnpj ?? ''} onBlur={e => saveEmpresa('cnpj', e.target.value)} />

              <p className="text-xs font-medium text-[#8b949e] uppercase tracking-wider mt-1">Metas mensais</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Faturamento (R$)" type="number" defaultValue={String(empresa.metas.faturamento)} onBlur={e => saveEmpresa('faturamento', e.target.value)} />
                <Input label="Lucro (R$)" type="number" defaultValue={String(empresa.metas.lucro)} onBlur={e => saveEmpresa('lucro', e.target.value)} />
                <Input label="CMV máx (%)" type="number" defaultValue={String(empresa.metas.cmvMax)} onBlur={e => saveEmpresa('cmvMax', e.target.value)} />
                <Input label="Custo RH máx (%)" type="number" defaultValue={String(empresa.metas.custosRHMax)} onBlur={e => saveEmpresa('custosRHMax', e.target.value)} />
              </div>

              {empresas.length > 1 && (
                confirmDelete === empresa.id ? (
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => setConfirmDelete(null)} className="flex-1">Cancelar</Button>
                    <Button variant="danger" onClick={() => { excluirEmpresa(empresa.id); setConfirmDelete(null) }} className="flex-1">
                      Confirmar exclusão
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(empresa.id)}
                    className="flex items-center gap-2 text-xs text-[#ef4444] hover:text-[#f85149] transition-colors"
                  >
                    <Trash2 size={13} /> Excluir esta empresa
                  </button>
                )
              )}
            </>
          )}

          {/* Add empresa */}
          {!showAddEmpresa ? (
            <button
              onClick={() => setShowAddEmpresa(true)}
              className="flex items-center gap-1.5 text-sm text-[#8b949e] hover:text-[#e6edf3] transition-colors"
            >
              <Plus size={14} /> Adicionar nova empresa
            </button>
          ) : (
            <div className="flex flex-col gap-3 p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
              <Input label="Nome da empresa" value={newNome} onChange={e => setNewNome(e.target.value)} autoFocus />
              <Input label="Setor" value={newSetor} onChange={e => setNewSetor(e.target.value)} />
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setShowAddEmpresa(false)} className="flex-1">Cancelar</Button>
                <Button onClick={handleAddEmpresa} className="flex-1 text-white" style={{ background: '#e8a020' } as React.CSSProperties}>
                  <Check size={14} /> Criar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
