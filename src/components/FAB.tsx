import { useState, useRef, useEffect } from 'react'
import { Plus, X, Sparkles, Tag } from 'lucide-react'
import { useStore } from '../store/useStore'

export function FAB() {
  const { addQuickIdea } = useStore()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [tag, setTag] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const submit = () => {
    if (!text.trim()) return
    addQuickIdea(text.trim(), tags)
    setText('')
    setTags([])
    setTag('')
    setOpen(false)
  }

  const addTag = () => {
    if (tag.trim() && !tags.includes(tag.trim())) {
      setTags(t => [...t, tag.trim()])
      setTag('')
    }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* FAB area */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Capture panel */}
        {open && (
          <div className="glass rounded-2xl shadow-2xl w-80 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#30363d]">
              <Sparkles size={16} className="text-[#eab308]" />
              <span className="text-sm font-semibold text-[#e6edf3]">Capturar Ideia</span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <textarea
                ref={inputRef}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-2.5 text-sm text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#eab308] transition-colors resize-none"
                placeholder="O que está na sua cabeça?"
                rows={3}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
                  if (e.key === 'Escape') setOpen(false)
                }}
              />

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(t => (
                    <span
                      key={t}
                      className="px-2 py-0.5 bg-[#eab30822] text-[#fde68a] text-xs rounded-full flex items-center gap-1 cursor-pointer hover:bg-[#ef444422]"
                      onClick={() => setTags(ts => ts.filter(x => x !== t))}
                    >
                      <Tag size={9} />{t} ×
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  className="flex-1 bg-[#0d1117] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-[#e6edf3] placeholder-[#484f58] focus:outline-none focus:border-[#eab308]"
                  placeholder="Tag (Enter)"
                  value={tag}
                  onChange={e => setTag(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2 rounded-xl text-sm text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={submit}
                  disabled={!text.trim()}
                  className="flex-1 py-2 rounded-xl text-sm font-medium bg-[#eab308] hover:bg-[#ca8a04] text-[#0d1117] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Salvar (↵)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main button */}
        <button
          onClick={() => setOpen(v => !v)}
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: open
              ? 'linear-gradient(135deg, #30363d, #21262d)'
              : 'linear-gradient(135deg, #eab308, #ca8a04)',
            boxShadow: open ? 'none' : '0 4px 20px rgba(234,179,8,0.4)',
          }}
          title="Capturar ideia rápida"
        >
          {open
            ? <X size={22} className="text-[#8b949e]" />
            : <Plus size={24} className="text-[#0d1117]" strokeWidth={2.5} />}
        </button>
      </div>
    </>
  )
}
