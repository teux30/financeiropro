import { useState, useRef } from 'react'
import {
  Camera, Upload, Sparkles, X, AlertTriangle, Check, Loader2,
  User, Building2, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Flame,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useStore } from '../../store/useStore'
import type { CategoriaFin } from '../../store/bancoTypes'
import { CATEGORIAS, categoriasPorPerfil } from '../../store/bancoTypes'
import { analisarComprovante, isVisionConfigured, type AnaliseTransacao, type Confianca } from '../../services/visionService'

type Etapa = 'escolher' | 'analisando' | 'revisar' | 'erro'

interface Props {
  open: boolean
  onClose: () => void
}

const confCor = (c: Confianca) => c === 'alta' ? '#1d9e75' : c === 'media' ? '#e8a020' : '#ef4444'

export function CapturaIA({ open, onClose }: Props) {
  const {
    perfilAtivo, mapeamentos, registrarMapeamento,
    getBanco, registrarTransacao, fazerTransferencia,
  } = useStore()

  const [etapa, setEtapa] = useState<Etapa>('escolher')
  const [erro, setErro] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [analise, setAnalise] = useState<AnaliseTransacao | null>(null)
  // campos editáveis — contexto é TRAVADO no perfil ativo (isolamento)
  const contexto = perfilAtivo
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('saida')
  const [valor, setValor] = useState('')
  const [data, setData] = useState('')
  const [descricao, setDescricao] = useState('')
  const [estabelecimento, setEstabelecimento] = useState('')
  const [categoria, setCategoria] = useState<CategoriaFin>('outros_saida')
  const [contaId, setContaId] = useState('')

  const fileInput = useRef<HTMLInputElement>(null)
  const cameraInput = useRef<HTMLInputElement>(null)

  const banco = getBanco(contexto)
  const cats = categoriasPorPerfil(contexto, tipo)

  const reset = () => {
    setEtapa('escolher'); setErro(''); setPreview(null); setAnalise(null)
    setValor(''); setData(''); setDescricao(''); setEstabelecimento('')
  }
  const fechar = () => { reset(); onClose() }

  const handleFile = async (file: File) => {
    setPreview(URL.createObjectURL(file))
    setEtapa('analisando'); setErro('')
    try {
      const r = await analisarComprovante(file, perfilAtivo, mapeamentos)
      setAnalise(r)
      // contexto fixo no perfil ativo; categoria validada nesse contexto
      const validas = categoriasPorPerfil(perfilAtivo, r.tipo)
      setTipo(r.tipo)
      setValor(String(r.valor)); setData(r.data)
      setDescricao(r.descricao); setEstabelecimento(r.estabelecimento)
      setCategoria(validas.includes(r.categoria) ? r.categoria : validas[0])
      // conta sugerida: padrão do banco do PERFIL ATIVO
      const b = useStore.getState().getBanco(perfilAtivo)
      const padrao = b.contas.find(c => c.contaPadrao) ?? b.contas[0]
      setContaId(padrao?.id ?? '')
      setEtapa('revisar')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao analisar a imagem.')
      setEtapa('erro')
    }
  }

  const trocarTipo = (t: 'entrada' | 'saida') => {
    setTipo(t)
    const validas = categoriasPorPerfil(contexto, t)
    if (!validas.includes(categoria)) setCategoria(validas[0])
  }

  const confirmar = () => {
    const v = parseFloat(valor) || 0
    if (v <= 0 || !contaId) return

    // caso especial: pró-labore (transferência PJ↔PF) — precisa de 2 contas
    if (analise?.proLabore) {
      const bp = useStore.getState().getBanco('pessoal')
      const be = useStore.getState().getBanco('empresa')
      const origem = be.contas.find(c => c.contaPadrao) ?? be.contas[0]
      const destino = bp.contas.find(c => c.contaPadrao) ?? bp.contas[0]
      if (origem && destino) {
        fazerTransferencia({ contaOrigemId: origem.id, contaDestinoId: destino.id, valor: v, data, descricao: descricao || 'Pró-labore', proLabore: true }, 'empresa')
        finalizar()
        return
      }
    }

    registrarTransacao({
      contaId, tipo, valor: v, descricao: descricao || estabelecimento || CATEGORIAS[categoria].label,
      categoria, data, recorrente: false, origemAuto: 'manual',
    }, contexto)

    // aprendizado
    if (estabelecimento.trim()) registrarMapeamento(estabelecimento, contexto, categoria)
    finalizar()
  }

  const finalizar = () => { reset(); onClose() }

  // ── render por etapa ─────────────────────────────────────────────────────
  const baixaConf = (c?: Confianca) => c === 'baixa'

  return (
    <Modal open={open} onClose={fechar} title="Capturar por foto (IA)" maxWidth="max-w-lg">
      {/* inputs ocultos */}
      <input ref={fileInput} type="file" accept="image/*" className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {/* ESCOLHER */}
      {etapa === 'escolher' && (
        <div className="flex flex-col gap-4">
          {!isVisionConfigured && (
            <div className="rounded-lg p-3 text-xs flex items-start gap-2" style={{ background: '#3a2a0a', color: '#f5c518' }}>
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>IA não configurada. Defina <code>VITE_ANTHROPIC_API_KEY</code> em <code>.env.local</code> para ativar a leitura automática.</span>
            </div>
          )}
          <p className="text-sm text-[#8b949e]">Tire uma foto ou envie a imagem de um comprovante (PIX, cartão, boleto, nota). A IA identifica tipo, valor, contexto e categoria automaticamente.</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => cameraInput.current?.click()} disabled={!isVisionConfigured}
              className="flex flex-col items-center gap-2 py-6 rounded-xl border border-[#30363d] hover:border-[#1d9e75] text-[#e6edf3] disabled:opacity-40 transition-colors">
              <Camera size={26} style={{ color: '#1d9e75' }} /> <span className="text-sm">Tirar foto</span>
            </button>
            <button onClick={() => fileInput.current?.click()} disabled={!isVisionConfigured}
              className="flex flex-col items-center gap-2 py-6 rounded-xl border border-[#30363d] hover:border-[#1d9e75] text-[#e6edf3] disabled:opacity-40 transition-colors">
              <Upload size={26} style={{ color: '#1d9e75' }} /> <span className="text-sm">Enviar imagem</span>
            </button>
          </div>
        </div>
      )}

      {/* ANALISANDO */}
      {etapa === 'analisando' && (
        <div className="flex flex-col items-center gap-4 py-8">
          {preview && <img src={preview} alt="comprovante" className="max-h-48 rounded-xl border border-[#30363d]" />}
          <div className="flex items-center gap-2 text-[#1d9e75]">
            <Loader2 size={18} className="animate-spin" />
            <Sparkles size={16} /> Lendo o comprovante com IA...
          </div>
        </div>
      )}

      {/* ERRO */}
      {etapa === 'erro' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg p-3 text-sm flex items-start gap-2" style={{ background: '#3a1212', color: '#f87171' }}>
            <AlertTriangle size={15} className="shrink-0 mt-0.5" /> {erro}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={fechar} className="flex-1">Fechar</Button>
            <Button onClick={reset} className="flex-1 text-white" style={{ background: '#1d9e75' } as React.CSSProperties}>Tentar de novo</Button>
          </div>
        </div>
      )}

      {/* REVISAR */}
      {etapa === 'revisar' && analise && (
        <div className="flex flex-col gap-4">
          {preview && <img src={preview} alt="comprovante" className="max-h-32 rounded-lg border border-[#30363d] self-center" />}

          {/* contexto travado no perfil ativo (isolamento) */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ background: contexto === 'pessoal' ? '#1d9e7515' : '#e8a02015', color: contexto === 'pessoal' ? '#1d9e75' : '#e8a020', border: `1px solid ${contexto === 'pessoal' ? '#1d9e7544' : '#e8a02044'}` }}>
            {contexto === 'pessoal' ? <User size={15} /> : <Building2 size={15} />}
            Lançando no perfil {contexto === 'pessoal' ? 'Pessoal' : 'Empresa'}
            {analise.contexto !== contexto && (
              <span className="text-[11px] text-[#8b949e] ml-auto">IA sugeriu {analise.contexto}; troque de perfil para lançar lá</span>
            )}
          </div>

          {/* tipo */}
          <div>
            <label className="text-xs font-medium text-[#8b949e] block mb-1.5 flex items-center gap-1">
              Tipo {baixaConf(analise.confianca.tipo) && <span className="text-[#ef4444]">• confira</span>}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => trocarTipo('entrada')}
                className="flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors border"
                style={{ background: tipo === 'entrada' ? '#10b98122' : 'transparent', color: tipo === 'entrada' ? '#10b981' : '#8b949e', borderColor: tipo === 'entrada' ? '#10b981' : '#30363d' }}>
                <ArrowDownLeft size={15} /> Entrada
              </button>
              <button onClick={() => trocarTipo('saida')}
                className="flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-colors border"
                style={{ background: tipo === 'saida' ? '#ef444422' : 'transparent', color: tipo === 'saida' ? '#ef4444' : '#8b949e', borderColor: tipo === 'saida' ? '#ef4444' : '#30363d' }}>
                <ArrowUpRight size={15} /> Saída
              </button>
            </div>
          </div>

          {/* pró-labore detectado */}
          {analise.proLabore && (
            <div className="rounded-lg p-3 text-xs flex items-center gap-2" style={{ background: '#0d2b28', color: '#14b8a6' }}>
              <ArrowLeftRight size={14} /> Detectado como <strong>pró-labore</strong> (transferência empresa → pessoal). Será lançado como movimentação entre contas.
            </div>
          )}

          {/* valor + data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input label="Valor (R$)" type="number" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value)} />
              {baixaConf(analise.confianca.valor) && <p className="text-[11px] mt-1" style={{ color: confCor('baixa') }}>⚠ confira o valor</p>}
            </div>
            <Input label="Data" type="date" value={data} onChange={e => setData(e.target.value)} />
          </div>

          <Input label="Estabelecimento" value={estabelecimento} onChange={e => setEstabelecimento(e.target.value)} />
          <Input label="Descrição" value={descricao} onChange={e => setDescricao(e.target.value)} />

          {/* categoria + conta */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#8b949e] block mb-1.5 flex items-center gap-1">
                Categoria {baixaConf(analise.confianca.categoria) && <span className="text-[#ef4444]">• confira</span>}
              </label>
              <select value={categoria} onChange={e => setCategoria(e.target.value as CategoriaFin)}
                className="w-full bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#1d9e75]">
                {cats.map(c => <option key={c} value={c}>{CATEGORIAS[c].label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#8b949e] block mb-1.5">Conta ({contexto === 'empresa' ? 'PJ' : 'PF'})</label>
              <select value={contaId} onChange={e => setContaId(e.target.value)}
                className="w-full bg-[#0a0f0a] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#e6edf3] focus:outline-none focus:border-[#1d9e75]">
                {banco.contas.length === 0 && <option value="">Nenhuma conta {contexto === 'empresa' ? 'PJ' : 'PF'}</option>}
                {banco.contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          {/* CMV */}
          {contexto === 'empresa' && categoria === 'insumos' && (
            <div className="rounded-lg p-2.5 text-xs flex items-center gap-2" style={{ background: '#e8a02011', color: '#e8a020' }}>
              <Flame size={13} /> Entra no cálculo de CMV do restaurante
            </div>
          )}

          {banco.contas.length === 0 && (
            <p className="text-xs text-[#ef4444]">Cadastre uma conta {contexto === 'empresa' ? 'PJ (no perfil Empresa)' : 'PF (no perfil Pessoal)'} antes de salvar.</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" onClick={reset} className="flex-1"><X size={15} /> Refazer</Button>
            <Button onClick={confirmar} disabled={banco.contas.length === 0 || !valor}
              className="flex-1 text-white" style={{ background: '#1d9e75' } as React.CSSProperties}>
              <Check size={15} /> Confirmar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
