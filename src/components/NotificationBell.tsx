import { useState, useMemo, useRef, useEffect } from 'react'
import { Bell, Check, Clock } from 'lucide-react'
import { useStore } from '../store/useStore'
import { calcularAvisos, corUrgencia, textoUrgencia } from '../lib/avisos'
import { fmtBRL } from '../lib/format'

export function NotificationBell() {
  const {
    empresas, avisosLidos, marcarAvisoLido,
    atualizarContaPagar, adicionarLancamento, getBanco, registrarTransacao,
    notifPrefs,
  } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const janela = Math.max(...(notifPrefs.antecedencias.length ? notifPrefs.antecedencias : [7]))
  const avisos = useMemo(() => calcularAvisos(empresas, janela), [empresas, janela])
  const visiveis = avisos.filter(a => !avisosLidos.includes(a.id))
  const count = visiveis.length

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    if (open) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const marcarPago = (aviso: typeof avisos[number]) => {
    const emp = empresas.find(e => e.id === aviso.empresaId)
    const conta = emp?.contasPagar.find(c => c.id === aviso.id)
    if (!emp || !conta) return
    atualizarContaPagar(emp.id, conta.id, { status: 'pago' })
    adicionarLancamento(emp.id, {
      tipo: 'saida', valor: conta.valor, data: new Date().toISOString().slice(0, 10),
      categoria: conta.categoria, descricao: conta.descricao, liquidado: true,
    })
    // integração bancária: debita conta padrão PJ
    const bancoEmp = getBanco('empresa')
    const padrao = bancoEmp.contas.find(c => c.contaPadrao) ?? bancoEmp.contas[0]
    if (padrao) {
      const catMap: Record<string, import('../store/bancoTypes').CategoriaFin> = {
        fornecedores: 'insumos', folha: 'folha', aluguel: 'aluguel', utilidades: 'utilidades',
        marketing: 'marketing', impostos: 'impostos', manutencao: 'manutencao', outros_saida: 'outros_saida',
      }
      registrarTransacao({
        contaId: padrao.id, tipo: 'saida', valor: conta.valor, descricao: conta.descricao,
        categoria: catMap[conta.categoria] ?? 'outros_saida', data: new Date().toISOString().slice(0, 10),
        recorrente: false, origemAuto: 'conta_pagar',
      }, 'empresa')
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)} className="relative p-1.5 rounded-lg transition-colors text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]" title="Avisos">
        <Bell size={15} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ background: '#ef4444' }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-xl border shadow-2xl z-[55] overflow-hidden"
          style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.1)' }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#21262d]">
            <span className="text-sm font-semibold text-[#e6edf3]">Avisos</span>
            <span className="text-xs text-[#8b949e]">{count} pendente{count !== 1 ? 's' : ''}</span>
          </div>
          <div className="max-h-80 overflow-y-auto scroll-area">
            {visiveis.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Check size={24} className="mx-auto mb-2 text-[#1d9e75]" />
                <p className="text-sm text-[#8b949e]">Nenhuma conta a vencer 🎉</p>
              </div>
            ) : (
              visiveis.map(a => {
                const cor = corUrgencia(a.urgencia)
                return (
                  <div key={a.id} className="flex items-start gap-3 px-4 py-3 border-b border-[#21262d] last:border-0" style={{ borderLeft: `2px solid ${cor}` }}>
                    <Clock size={15} style={{ color: cor }} className="shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#e6edf3] truncate">{a.descricao}</p>
                      <p className="text-xs" style={{ color: cor }}>{fmtBRL(a.valor)} · {textoUrgencia(a)}</p>
                      <p className="text-[11px] text-[#484f58]">{a.empresaNome}</p>
                      <div className="flex gap-2 mt-1.5">
                        <button onClick={() => marcarPago(a)} className="text-[11px] px-2 py-1 rounded-md text-white" style={{ background: '#1d9e75' }}>Marcar pago</button>
                        <button onClick={() => marcarAvisoLido(a.id)} className="text-[11px] px-2 py-1 rounded-md text-[#8b949e] hover:text-[#e6edf3]">Dispensar</button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
