import React, { useState } from 'react'
import { Users, Plus, Calculator, Edit2, Trash2, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { Funcionario } from '../../store/empresaTypes'
import { Modal } from '../../components/ui/Modal'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

// ── empty form state ───────────────────────────────────────────────────────────
interface FuncForm {
  nome: string
  cargo: string
  admissao: string
  salarioBase: string
  status: 'ativo' | 'inativo' | 'ferias'
}

const emptyForm: FuncForm = {
  nome: '',
  cargo: '',
  admissao: '',
  salarioBase: '',
  status: 'ativo',
}

function fromFuncionario(f: Funcionario): FuncForm {
  return {
    nome: f.nome,
    cargo: f.cargo,
    admissao: f.admissao,
    salarioBase: String(f.salarioBase),
    status: f.status,
  }
}

// ── status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Funcionario['status'] }) {
  const map: Record<Funcionario['status'], { label: string; color: string; bg: string }> = {
    ativo: { label: 'Ativo', color: '#10b981', bg: '#10b98115' },
    inativo: { label: 'Inativo', color: '#8b949e', bg: '#8b949e15' },
    ferias: { label: 'Férias', color: '#f59e0b', bg: '#f59e0b15' },
  }
  const s = map[status]
  return (
    <span
      style={{
        fontSize: 12, fontWeight: 600, padding: '3px 10px',
        borderRadius: 20, color: s.color, background: s.bg,
        border: `1px solid ${s.color}40`,
      }}
    >
      {s.label}
    </span>
  )
}

// ── folha panel ────────────────────────────────────────────────────────────────
interface FolhaPanelProps {
  funcionario: Funcionario
  onClose: () => void
}
function FolhaPanel({ funcionario, onClose }: FolhaPanelProps) {
  const [horasExtras, setHorasExtras] = useState<number>(0)

  const salarioBruto = funcionario.salarioBase
  const inss = salarioBruto * 0.11
  const fgts = salarioBruto * 0.08
  const decimoTerceiro = salarioBruto / 12
  const ferias = (salarioBruto / 12) * 1.333
  const salarioLiquido = salarioBruto - inss + horasExtras

  const row = (label: string, value: number, color?: string) => (
    <div
      key={label}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 0', borderBottom: '1px solid #21262d',
      }}
    >
      <span style={{ fontSize: 14, color: '#8b949e' }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: color ?? '#e6edf3' }}>{fmtBRL(value)}</span>
    </div>
  )

  return (
    <div
      style={{
        background: '#161b22', border: '1px solid #e8a02040',
        borderRadius: 12, padding: '20px', marginTop: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#e8a020' }}>
            Cálculo de Folha — {funcionario.nome}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: '#8b949e' }}>{funcionario.cargo}</p>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8b949e', padding: 4 }}
        >
          <X size={18} />
        </button>
      </div>

      <div>
        {row('Salário Bruto', salarioBruto)}
        {row('INSS (11%)', -inss, '#ef4444')}
        {row('FGTS (8%)', fgts, '#f59e0b')}
        {row('13° Salário (provisionado)', decimoTerceiro, '#8b949e')}
        {row('Férias (provisionado)', ferias, '#8b949e')}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #21262d' }}>
          <span style={{ fontSize: 14, color: '#8b949e' }}>Horas Extras</span>
          <input
            type="number"
            min={0}
            value={horasExtras}
            onChange={e => setHorasExtras(Math.max(0, Number(e.target.value)))}
            style={{
              background: '#21262d', border: '1px solid #30363d', borderRadius: 6,
              color: '#e6edf3', padding: '4px 8px', fontSize: 14, width: 100, textAlign: 'right',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#e6edf3' }}>Salário Líquido</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{fmtBRL(salarioLiquido)}</span>
        </div>

        <div
          style={{
            background: '#21262d', borderRadius: 8, padding: '12px',
            fontSize: 12, color: '#8b949e', marginTop: 4,
          }}
        >
          Custo total empresa (com encargos 28%): <strong style={{ color: '#e6edf3' }}>{fmtBRL(salarioBruto * 1.28)}</strong>
        </div>
      </div>
    </div>
  )
}

// ── main component ─────────────────────────────────────────────────────────────
export function RHPage() {
  const [showModal, setShowModal] = useState(false)
  const [editFuncionario, setEditFuncionario] = useState<Funcionario | null>(null)
  const [showFolhaId, setShowFolhaId] = useState<string | null>(null)
  const [form, setForm] = useState<FuncForm>(emptyForm)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const getEmpresaAtiva = useStore(s => s.getEmpresaAtiva)
  const adicionarFuncionario = useStore(s => s.adicionarFuncionario)
  const atualizarFuncionario = useStore(s => s.atualizarFuncionario)
  const excluirFuncionario = useStore(s => s.excluirFuncionario)

  const empresa = getEmpresaAtiva()
  if (!empresa) {
    return <div style={{ color: '#8b949e', padding: 40, textAlign: 'center' }}>Nenhuma empresa ativa.</div>
  }

  const funcionarios = empresa.funcionarios
  const ativos = funcionarios.filter(f => f.status === 'ativo')
  const totalFolha = ativos.reduce((s, f) => s + f.salarioBase, 0)
  const totalEncargos = ativos.reduce((s, f) => s + f.salarioBase * 0.28, 0)

  function openNew() {
    setEditFuncionario(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(f: Funcionario) {
    setEditFuncionario(f)
    setForm(fromFuncionario(f))
    setShowModal(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data: Omit<Funcionario, 'id'> = {
      nome: form.nome.trim(),
      cargo: form.cargo.trim(),
      admissao: form.admissao,
      salarioBase: Number(form.salarioBase) || 0,
      status: form.status,
    }
    if (editFuncionario) {
      atualizarFuncionario(empresa!.id, editFuncionario.id, data)
    } else {
      adicionarFuncionario(empresa!.id, data)
    }
    setShowModal(false)
  }

  function handleDelete(id: string) {
    excluirFuncionario(empresa!.id, id)
    setConfirmDelete(null)
    if (showFolhaId === id) setShowFolhaId(null)
  }

  const inputStyle: React.CSSProperties = {
    background: '#21262d', border: '1px solid #30363d', borderRadius: 6,
    color: '#e6edf3', padding: '8px 10px', fontSize: 14, width: '100%', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = { fontSize: 12, color: '#8b949e', marginBottom: 4, display: 'block' }

  return (
    <div style={{ background: '#0d1117', minHeight: '100vh', padding: '32px 24px', color: '#e6edf3' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={26} color="#e8a020" />
            Recursos Humanos
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#8b949e' }}>
            Gestão de equipe e cálculo de folha
          </p>
        </div>
        <button
          onClick={openNew}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#e8a020', border: 'none', borderRadius: 8,
            color: '#0d1117', padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          Novo Funcionário
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total Funcionários', value: String(funcionarios.length), sub: `${ativos.length} ativos` },
          { label: 'Folha Estimada', value: fmtBRL(totalFolha), sub: 'salários base ativos' },
          { label: 'Encargos (28%)', value: fmtBRL(totalEncargos), sub: 'custo adicional' },
          { label: 'Custo Total', value: fmtBRL(totalFolha + totalEncargos), sub: 'com encargos' },
        ].map(card => (
          <div
            key={card.label}
            style={{
              background: '#161b22', border: '1px solid #30363d', borderRadius: 10,
              padding: '16px 18px',
            }}
          >
            <p style={{ margin: '0 0 4px', fontSize: 12, color: '#8b949e' }}>{card.label}</p>
            <p style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 700, color: '#e8a020' }}>{card.value}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#8b949e' }}>{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          background: '#161b22', border: '1px solid #30363d',
          borderRadius: 12, overflow: 'hidden', marginBottom: 20,
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#21262d' }}>
                {['Nome', 'Cargo', 'Admissão', 'Salário Base', 'Status', 'Ações'].map(h => (
                  <th
                    key={h}
                    style={{
                      padding: '12px 16px', textAlign: 'left',
                      fontSize: 12, color: '#8b949e', fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {funcionarios.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: '#8b949e', fontSize: 14 }}>
                    Nenhum funcionário cadastrado. Clique em "Novo Funcionário" para começar.
                  </td>
                </tr>
              )}
              {funcionarios.map((f, idx) => (
                <React.Fragment key={f.id}>
                  <tr
                    style={{
                      borderTop: idx > 0 ? '1px solid #21262d' : 'none',
                      background: showFolhaId === f.id ? '#e8a02008' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600 }}>{f.nome}</td>
                    <td style={{ padding: '14px 16px', fontSize: 14, color: '#8b949e' }}>{f.cargo}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#8b949e' }}>
                      {f.admissao ? new Date(f.admissao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#10b981' }}>
                      {fmtBRL(f.salarioBase)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge status={f.status} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setShowFolhaId(showFolhaId === f.id ? null : f.id)}
                          title="Calcular folha"
                          style={{
                            background: showFolhaId === f.id ? '#e8a02020' : '#21262d',
                            border: `1px solid ${showFolhaId === f.id ? '#e8a02060' : '#30363d'}`,
                            borderRadius: 6, cursor: 'pointer', padding: '6px 8px',
                            color: '#e8a020', display: 'flex', alignItems: 'center',
                          }}
                        >
                          <Calculator size={15} />
                        </button>
                        <button
                          onClick={() => openEdit(f)}
                          title="Editar"
                          style={{
                            background: '#21262d', border: '1px solid #30363d',
                            borderRadius: 6, cursor: 'pointer', padding: '6px 8px',
                            color: '#8b949e', display: 'flex', alignItems: 'center',
                          }}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(f.id)}
                          title="Excluir"
                          style={{
                            background: '#21262d', border: '1px solid #30363d',
                            borderRadius: 6, cursor: 'pointer', padding: '6px 8px',
                            color: '#ef4444', display: 'flex', alignItems: 'center',
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {showFolhaId === f.id && (
                    <tr>
                      <td colSpan={6} style={{ padding: '0 16px 16px' }}>
                        <FolhaPanel funcionario={f} onClose={() => setShowFolhaId(null)} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirm delete dialog */}
      {confirmDelete && (
        <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Confirmar exclusão">
          <div style={{ padding: '8px 0' }}>
            <p style={{ margin: '0 0 20px', color: '#8b949e', fontSize: 14 }}>
              Tem certeza que deseja excluir este funcionário? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{
                  background: '#21262d', border: '1px solid #30363d', borderRadius: 6,
                  color: '#e6edf3', padding: '8px 16px', fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                style={{
                  background: '#ef4444', border: 'none', borderRadius: 6,
                  color: '#fff', padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Funcionario modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editFuncionario ? 'Editar Funcionário' : 'Novo Funcionário'}>
        <div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Nome *</label>
                <input
                  required
                  style={inputStyle}
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label style={labelStyle}>Cargo *</label>
                <input
                  required
                  style={inputStyle}
                  value={form.cargo}
                  onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                  placeholder="Ex: Cozinheiro"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={labelStyle}>Data de Admissão</label>
                <input
                  type="date"
                  style={inputStyle}
                  value={form.admissao}
                  onChange={e => setForm(f => ({ ...f, admissao: e.target.value }))}
                />
              </div>
              <div>
                <label style={labelStyle}>Salário Base (R$) *</label>
                <input
                  required
                  type="number"
                  min={0}
                  step={0.01}
                  style={inputStyle}
                  value={form.salarioBase}
                  onChange={e => setForm(f => ({ ...f, salarioBase: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Status</label>
              <select
                style={inputStyle}
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as Funcionario['status'] }))}
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="ferias">Férias</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  background: '#21262d', border: '1px solid #30363d', borderRadius: 6,
                  color: '#e6edf3', padding: '8px 16px', fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  background: '#e8a020', border: 'none', borderRadius: 6,
                  color: '#0d1117', padding: '8px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {editFuncionario ? 'Salvar alterações' : 'Adicionar'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  )
}
