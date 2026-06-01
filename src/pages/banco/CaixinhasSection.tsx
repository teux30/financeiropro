import { useState } from 'react'
import {
  Plus, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Pencil, Trash2,
  ChevronDown, TrendingUp,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { Caixinha } from '../../store/bancoTypes'
import { CaixinhaIcon } from '../../lib/caixinha-icons'
import { fmtBRL, maskSaldo, fmtData } from '../../lib/format'
import { CaixinhaForm } from './CaixinhaForm'
import { CaixinhaMovModal } from './CaixinhaMovModal'

interface Props {
  contaId: string
  accent: string
}

export function CaixinhasSection({ contaId, accent }: Props) {
  const {
    getBanco, getSaldoCaixinha, getSaldoLivreConta, getSaldoReservado,
    getProgressoCaixinha, getExtratoCaixinha,
    criarCaixinha, editarCaixinha, excluirCaixinha, ocultarSaldos,
  } = useStore()

  const banco = getBanco()
  const caixinhas = banco.caixinhas.filter(c => c.contaId === contaId)
  const livre = getSaldoLivreConta(contaId)
  const reservado = getSaldoReservado(contaId)

  const [formOpen, setFormOpen] = useState(false)
  const [editCx, setEditCx] = useState<Caixinha | null>(null)
  const [movCx, setMovCx] = useState<Caixinha | null>(null)
  const [movAcao, setMovAcao] = useState<'deposito' | 'retirada' | 'transferencia'>('deposito')
  const [extratoId, setExtratoId] = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const openMov = (cx: Caixinha, acao: typeof movAcao) => { setMovCx(cx); setMovAcao(acao); }

  return (
    <div className="flex flex-col gap-3">
      {/* Saldo livre / reservado */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-3 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-[11px] text-[#8b949e]">Saldo livre</p>
          <p className="text-lg font-bold" style={{ color: accent }}>{maskSaldo(fmtBRL(livre), ocultarSaldos)}</p>
        </div>
        <div className="rounded-xl p-3 border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-[11px] text-[#8b949e]">Em caixinhas</p>
          <p className="text-lg font-bold text-[#e6edf3]">{maskSaldo(fmtBRL(reservado), ocultarSaldos)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#e6edf3]">Caixinhas</h3>
        <button onClick={() => { setEditCx(null); setFormOpen(true) }}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg" style={{ background: `${accent}22`, color: accent }}>
          <Plus size={14} /> Nova caixinha
        </button>
      </div>

      {caixinhas.length === 0 ? (
        <div className="rounded-xl p-6 text-center border" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-sm text-[#8b949e]">Crie caixinhas para separar dinheiro por objetivo 🐷</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {caixinhas.map(cx => {
            const saldo = getSaldoCaixinha(cx.id)
            const prog = getProgressoCaixinha(cx.id)
            const falta = cx.meta ? Math.max(0, cx.meta - saldo) : 0
            const extratoAberto = extratoId === cx.id
            const extrato = extratoAberto ? getExtratoCaixinha(cx.id) : []
            return (
              <div key={cx.id} className="rounded-2xl border overflow-hidden" style={{ background: '#141a14', borderColor: `${cx.cor}33` }}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${cx.cor}22` }}>
                        <CaixinhaIcon icone={cx.icone} size={20} color={cx.cor} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#e6edf3] truncate">{cx.nome}</p>
                        <p className="text-xl font-black" style={{ color: cx.cor }}>{maskSaldo(fmtBRL(saldo), ocultarSaldos)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {cx.rende && <span className="text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{ background: '#1d9e7522', color: '#1d9e75' }}><TrendingUp size={9} />{cx.rendimentoAnual}%</span>}
                      <button onClick={() => { setEditCx(cx); setFormOpen(true) }} className="p-1 text-[#8b949e] hover:text-[#e6edf3]"><Pencil size={13} /></button>
                      <button onClick={() => setConfirmDel(cx.id)} className="p-1 text-[#8b949e] hover:text-[#ef4444]"><Trash2 size={13} /></button>
                    </div>
                  </div>

                  {/* meta */}
                  {cx.meta && cx.meta > 0 && (
                    <div className="mt-3">
                      <div className="h-2 rounded-full bg-[#21262d] overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${prog}%`, background: cx.cor }} />
                      </div>
                      <div className="flex justify-between text-[11px] mt-1">
                        <span style={{ color: cx.cor }}>{prog.toFixed(0)}% de {fmtBRL(cx.meta)}</span>
                        <span className="text-[#8b949e]">faltam {maskSaldo(fmtBRL(falta), ocultarSaldos)}</span>
                      </div>
                    </div>
                  )}

                  {/* ações */}
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <button onClick={() => openMov(cx, 'deposito')} className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium text-white" style={{ background: cx.cor }}>
                      <ArrowDownToLine size={13} /> Guardar
                    </button>
                    <button onClick={() => openMov(cx, 'retirada')} className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium" style={{ background: '#21262d', color: '#e6edf3' }}>
                      <ArrowUpFromLine size={13} /> Resgatar
                    </button>
                    <button onClick={() => openMov(cx, 'transferencia')} className="flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-medium" style={{ background: '#21262d', color: '#e6edf3' }}>
                      <ArrowLeftRight size={13} /> Mover
                    </button>
                  </div>

                  {/* extrato toggle */}
                  <button onClick={() => setExtratoId(extratoAberto ? null : cx.id)}
                    className="flex items-center gap-1 text-xs text-[#8b949e] mt-3 hover:text-[#e6edf3]">
                    <ChevronDown size={13} className={extratoAberto ? 'rotate-180 transition-transform' : 'transition-transform'} />
                    Extrato da caixinha
                  </button>
                </div>

                {/* extrato */}
                {extratoAberto && (
                  <div className="border-t border-[#21262d] px-4 py-2">
                    {extrato.length === 0 ? (
                      <p className="text-xs text-[#484f58] py-2">Sem movimentos ainda.</p>
                    ) : (
                      <div className="flex flex-col">
                        {extrato.map(m => {
                          const entra = (m.tipo === 'deposito') || (m.tipo === 'transferencia' && m.caixinhaDestinoId === cx.id)
                          const label = m.tipo === 'deposito' ? 'Depósito' : m.tipo === 'retirada' ? 'Resgate' : (m.caixinhaDestinoId === cx.id ? 'Recebido' : 'Enviado')
                          return (
                            <div key={m.id} className="flex items-center justify-between py-2 border-b border-[#21262d] last:border-0">
                              <div>
                                <p className="text-xs text-[#e6edf3]">{label}{m.observacao ? ` · ${m.observacao}` : ''}</p>
                                <p className="text-[10px] text-[#484f58]">{fmtData(m.data)}</p>
                              </div>
                              <span className="text-xs font-semibold" style={{ color: entra ? '#1d9e75' : '#ef4444' }}>
                                {entra ? '+' : '-'}{maskSaldo(fmtBRL(m.valor), ocultarSaldos)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* form criar/editar */}
      <CaixinhaForm
        open={formOpen} onClose={() => setFormOpen(false)} contaId={contaId} accent={accent}
        initial={editCx ?? undefined}
        onSave={(data, dep) => { if (editCx) editarCaixinha(editCx.id, data); else criarCaixinha(data, dep) }}
      />

      {/* movimentação */}
      {movCx && (
        <CaixinhaMovModal open={!!movCx} onClose={() => setMovCx(null)} acao={movAcao} caixinha={movCx} accent={accent} />
      )}

      {/* confirmar exclusão */}
      {confirmDel && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setConfirmDel(null)}>
          <div className="glass rounded-xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <p className="text-sm text-[#e6edf3] mb-1">Excluir caixinha?</p>
            <p className="text-xs text-[#8b949e] mb-4">O saldo dela volta para o saldo livre da conta.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(null)} className="flex-1 py-2 rounded-lg text-sm bg-[#21262d] text-[#8b949e]">Cancelar</button>
              <button onClick={() => { excluirCaixinha(confirmDel); setConfirmDel(null); setExtratoId(null) }} className="flex-1 py-2 rounded-lg text-sm bg-[#da3633] text-white">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
