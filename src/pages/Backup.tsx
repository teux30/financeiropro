import { useRef, useState } from 'react'
import { Download, Upload, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Button } from '../components/ui/Button'

const STORE_KEY = 'finance_pro_state'

export function BackupPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const exportar = () => {
    const raw = localStorage.getItem(STORE_KEY) ?? '{}'
    const blob = new Blob([raw], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const d = new Date()
    const data = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    a.href = url
    a.download = `finance-pro-backup-${data}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg({ tipo: 'ok', texto: 'Backup exportado. Guarde o arquivo .json em local seguro.' })
  }

  const importar = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const texto = String(reader.result)
        const obj = JSON.parse(texto)
        // valida minimamente o formato do persist do Zustand
        if (!obj || typeof obj !== 'object' || !('state' in obj)) {
          setMsg({ tipo: 'erro', texto: 'Arquivo inválido — não parece um backup do Finance Pro.' })
          return
        }
        localStorage.setItem(STORE_KEY, texto)
        setMsg({ tipo: 'ok', texto: 'Backup restaurado! Recarregando o app...' })
        setTimeout(() => window.location.reload(), 1200)
      } catch {
        setMsg({ tipo: 'erro', texto: 'Não foi possível ler o arquivo (JSON inválido).' })
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0f0a]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-28 sm:pb-8 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#3b82f622' }}><Shield size={18} style={{ color: '#3b82f6' }} /></div>
          <div>
            <h1 className="text-xl font-bold text-[#e6edf3]">Backup</h1>
            <p className="text-xs text-[#8b949e]">Exporte e restaure todos os seus dados</p>
          </div>
        </div>

        {msg && (
          <div className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg"
            style={{ background: msg.tipo === 'ok' ? '#1d9e7515' : '#ef444415', color: msg.tipo === 'ok' ? '#1d9e75' : '#ef4444' }}>
            {msg.tipo === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} {msg.texto}
          </div>
        )}

        {/* Exportar */}
        <div className="rounded-2xl p-5 border flex flex-col gap-3" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2"><Download size={16} style={{ color: '#1d9e75' }} /><span className="text-sm font-semibold text-[#e6edf3]">Exportar dados</span></div>
          <p className="text-sm text-[#8b949e]">Baixa um arquivo <code className="text-[#e6edf3]">.json</code> com tudo: contas, transações, cartões, empresa, cardápio, notas, etc.</p>
          <Button onClick={exportar} className="text-white self-start" style={{ background: '#1d9e75' } as React.CSSProperties}><Download size={15} /> Exportar backup</Button>
        </div>

        {/* Importar */}
        <div className="rounded-2xl p-5 border flex flex-col gap-3" style={{ background: '#141a14', borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2"><Upload size={16} style={{ color: '#e8a020' }} /><span className="text-sm font-semibold text-[#e6edf3]">Restaurar backup</span></div>
          <p className="text-sm text-[#8b949e]">Selecione um arquivo de backup. <strong className="text-[#e8a020]">Substitui todos os dados atuais</strong> e recarrega o app.</p>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = '' }} />
          <Button onClick={() => fileRef.current?.click()} variant="ghost" className="self-start"><Upload size={15} /> Escolher arquivo</Button>
        </div>

        <div className="flex items-start gap-2 text-[11px] text-[#484f58]">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span>Dica: exporte um backup periodicamente. A restauração sobrescreve os dados deste dispositivo — faça um export antes, por segurança.</span>
        </div>
      </div>
    </div>
  )
}
