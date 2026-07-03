'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

// ─── BRAND ───────────────────────────────────────────────────────────────────
const C = {
  negro: '#0D0D0D', hueso: '#F5F2EC', hueso2: '#E8E3DA',
  oliva: '#8C8C5A', arena: '#C4B49A', topo: '#A8A49A',
  verde: '#5A8C5A', rojo: '#C45A5A', azul: '#5A6E8C',
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const MEDIOS = [
  { id: 'efectivo',      label: 'Efectivo',      emoji: '💵', color: C.verde },
  { id: 'transferencia', label: 'Transferencia',  emoji: '🏦', color: C.azul  },
  { id: 'nave',          label: 'Tarjeta Nave',   emoji: '💳', color: C.oliva },
  { id: 'mp',            label: 'Mercado Pago',   emoji: '📱', color: C.arena },
]

const CAT_INGRESO = ['Venta', 'Seña / Anticipo', 'Devolución de proveedor', 'Otro ingreso']
const CAT_EGRESO  = [
  'Proveedor / Mercadería', 'Alquiler', 'Servicios (luz, gas, etc.)',
  'Sueldo / Retiro', 'Gastos del local', 'Marketing / Publicidad', 'Otro egreso',
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = n => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', minimumFractionDigits: 0,
}).format(n || 0)

const isoToday = () => new Date().toISOString().split('T')[0]

const fmtDate = iso =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })

const fmtDateFull = iso =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

// ─── STORAGE ─────────────────────────────────────────────────────────────────
const load = (key, fallback) => {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}
const save = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
    syncToSupabase(key, val)
}

let hydrated = false

async function syncToSupabase(key, val) {
  if (!supabase || !hydrated) return
  try {
    if (key === 'movements') {
      await supabase.from('movements').delete().neq('id', '')
      if (Array.isArray(val) && val.length) {
        const rows = val.map(m => ({
          id: m.id,
          type: m.type,
          date: m.date,
          cat: m.cat,
          medio: m.medio,
          amount: m.amount,
          descripcion: m.desc || '',
          tags: m.tags || [],
          vuelto: m.vuelto || 0,
          medio_secundario: m.medioSecundario || null,
          monto_secundario: m.montoSecundario || 0,
        }))
        await supabase.from('movements').insert(rows)
      }
    } else if (key === 'fondoInicial') {
      await supabase.from('caja_fondo').upsert({ id: 1, fondo_inicial: val })
    } else if (key === 'lastFondoDate') {
      await supabase.from('caja_fondo').upsert({ id: 1, last_fondo_date: val })
    }
  } catch (e) {
    console.error('Error sincronizando con Supabase', e)
  }
}

// ─── EXPORT CSV ──────────────────────────────────────────────────────────────
function exportCSV(movements) {
  const header = 'Fecha,Tipo,Categoria,Medio,Monto,Descripcion,Etiquetas'
  const rows = movements.map(m =>
    [m.date, m.type, m.cat, m.medio, m.amount,
     (m.desc || '').replace(/,/g, ';'),
     (m.tags || []).join(';')
    ].join(',')
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `caja_${isoToday()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── UI PRIMITIVES ───────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'white', borderRadius: 8, padding: '16px 18px',
      border: `1px solid ${C.hueso2}`, ...style,
    }}>
      {children}
    </div>
  )
}

function Badge({ label, color = C.topo }) {
  return (
    <span style={{
      background: color + '22', color, fontSize: 11, fontWeight: 700,
      padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

function Btn({ children, onClick, color = C.negro, bg = C.hueso, full, sm, style = {} }) {
  return (
    <button onClick={onClick} style={{
      background: bg, color, border: 'none', borderRadius: 6, cursor: 'pointer',
      fontWeight: 600, fontSize: sm ? 12 : 14,
      padding: sm ? '6px 12px' : '11px 18px',
      width: full ? '100%' : 'auto', transition: 'opacity .15s', ...style,
    }}
      onMouseOver={e => (e.currentTarget.style.opacity = '.85')}
      onMouseOut={e => (e.currentTarget.style.opacity = '1')}
    >
      {children}
    </button>
  )
}

function FieldLabel({ children, required }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: 1, color: C.oliva, marginBottom: 5,
    }}>
      {children}{required && ' *'}
    </div>
  )
}

function Input({ label, type = 'text', value, onChange, placeholder, prefix, required, inputMode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <div style={{
        display: 'flex', alignItems: 'center',
        border: `1.5px solid ${C.hueso2}`, borderRadius: 6, overflow: 'hidden', background: 'white',
      }}>
        {prefix && (
          <span style={{
            padding: '0 10px', color: C.topo, fontSize: 14,
            borderRight: `1px solid ${C.hueso2}`, background: C.hueso, alignSelf: 'stretch',
            display: 'flex', alignItems: 'center',
          }}>
            {prefix}
          </span>
        )}
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          inputMode={inputMode}
          style={{
            flex: 1, border: 'none', outline: 'none', padding: '10px 12px',
            fontSize: 15, background: 'transparent', color: C.negro,
          }}
        />
      </div>
    </div>
  )
}

function Select({ label, value, onChange, options, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <select value={value} onChange={onChange} style={{
        width: '100%', padding: '10px 12px', borderRadius: 6,
        border: `1.5px solid ${C.hueso2}`, fontSize: 15, background: 'white',
        color: value ? C.negro : C.topo, outline: 'none',
      }}>
        <option value=''>— Elegí una opción —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function Toast({ msg, type = 'ok', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2800)
    return () => clearTimeout(t)
  }, [onClose])
  const bg = type === 'ok' ? C.verde : type === 'error' ? C.rojo : C.azul
  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      background: bg, color: 'white', padding: '12px 22px', borderRadius: 30,
      fontWeight: 700, fontSize: 14, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,.18)',
      display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap',
    }}>
      {type === 'ok' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} {msg}
    </div>
  )
}

// ─── CONFIRM MODAL ───────────────────────────────────────────────────────────
function ConfirmModal({ msg, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 9000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'white', borderRadius: 12, padding: '24px 28px',
        maxWidth: 340, width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🗑️</div>
        <p style={{ fontSize: 15, color: C.negro, marginBottom: 22, lineHeight: 1.5 }}>{msg}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={onCancel} full bg={C.hueso2}>Cancelar</Btn>
          <Btn onClick={onConfirm} full bg={C.rojo} color='white'>Eliminar</Btn>
        </div>
      </div>
    </div>
  )
}

// ─── EDIT MODAL ──────────────────────────────────────────────────────────────
function EditModal({ mov, onSave, onClose }) {
  const [amount, setAmount]   = useState(String(mov.amount))
  const [cat, setCat]         = useState(mov.cat)
  const [medio, setMedio]     = useState(mov.medio)
  const [desc, setDesc]       = useState(mov.desc || '')
  const [tags, setTags]       = useState((mov.tags || []).join(', '))

  const cats = mov.type === 'ingreso' ? CAT_INGRESO : CAT_EGRESO

  const handleSave = () => {
    const n = parseFloat(amount)
    if (!n || n <= 0 || !cat || !medio) return
    onSave({ ...mov, amount: n, cat, medio, desc, tags: tags.split(',').map(t => t.trim()).filter(Boolean) })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 9000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      overflowY: 'auto',
    }}>
      <div style={{
        background: 'white', borderRadius: 12, padding: '24px 22px',
        maxWidth: 420, width: '100%',
      }}>
        <h3 style={{ marginBottom: 18, color: C.negro }}>✏️ Editar movimiento</h3>

        <Input label='Monto' type='number' value={amount}
          onChange={e => setAmount(e.target.value)} prefix='$' required inputMode='numeric' />

        <Select label='Categoría' value={cat}
          onChange={e => setCat(e.target.value)} options={cats} required />

        <FieldLabel>Medio de pago *</FieldLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {MEDIOS.map(m => (
            <button key={m.id} onClick={() => setMedio(m.id)} style={{
              padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
              border: medio === m.id ? `2px solid ${m.color}` : `1px solid ${C.hueso2}`,
              background: medio === m.id ? m.color + '18' : 'white',
              color: medio === m.id ? m.color : C.topo,
            }}>
              {m.emoji} {m.label}
            </button>
          ))}
        </div>

        <Input label='Descripción (opcional)' value={desc}
          onChange={e => setDesc(e.target.value)} placeholder='Ej: Mesa García' />

        <Input label='Etiquetas (separadas por coma)' value={tags}
          onChange={e => setTags(e.target.value)} placeholder='Ej: VIP, urgente' />

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <Btn onClick={onClose} full bg={C.hueso2}>Cancelar</Btn>
          <Btn onClick={handleSave} full bg={C.negro} color='white'>Guardar cambios</Btn>
        </div>
      </div>
    </div>
  )
}

// ─── MINI BAR CHART ──────────────────────────────────────────────────────────
function MiniBarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 60, marginTop: 10 }}>
      {data.map(d => (
        <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: '100%', background: d.color + 'AA',
            borderRadius: '4px 4px 0 0',
            height: `${Math.max((d.value / max) * 52, d.value > 0 ? 4 : 0)}px`,
            transition: 'height .3s',
          }} />
          <span style={{ fontSize: 9, color: C.topo, textAlign: 'center', lineHeight: 1.2 }}>{d.label}</span>
        </div>
      ))}
    </div>
  )
}
// ─── NAV TAB ─────────────────────────────────────────────────────────────────
function NavTab({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, background: 'none', border: 'none', cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
      padding: '10px 0', color: active ? C.oliva : C.topo,
      borderTop: active ? `2px solid ${C.oliva}` : '2px solid transparent',
      transition: 'color .15s',
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
    </button>
  )
}

// ─── MOVEMENT CARD ───────────────────────────────────────────────────────────
function MovCard({ mov, onEdit, onDelete }) {
  const medio = MEDIOS.find(m => m.id === mov.medio) || MEDIOS[0]
  const isIng = mov.type === 'ingreso'
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 0', borderBottom: `1px solid ${C.hueso2}`,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: (isIng ? C.verde : C.rojo) + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
      }}>
        {medio.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 14, color: C.negro }}>{mov.cat}</span>
            {mov.desc && (
              <div style={{ fontSize: 12, color: C.topo, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                {mov.desc}
              </div>
            )}
            {mov.tags && mov.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                {mov.tags.map(t => (
                  <span key={t} style={{
                    background: C.arena + '33', color: C.oliva, fontSize: 10,
                    fontWeight: 700, padding: '1px 7px', borderRadius: 20,
                  }}>{t}</span>
                ))}
              </div>
            )}
            {mov.vuelto > 0 && (
              <div style={{ fontSize: 11, color: C.topo, marginTop: 2 }}>
                Vuelto: {fmt(mov.vuelto)}
              </div>
            )}
            {mov.medioSecundario && (
              <div style={{ fontSize: 11, color: C.azul, marginTop: 2 }}>
                + {MEDIOS.find(m => m.id === mov.medioSecundario)?.label}: {fmt(mov.montoSecundario)}
              </div>
            )}
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, color: isIng ? C.verde : C.rojo, whiteSpace: 'nowrap', marginLeft: 8 }}>
            {isIng ? '+' : '-'} {fmt(mov.amount)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
          <Badge label={medio.label} color={medio.color} />
          <button onClick={() => onEdit(mov)} style={{
            background: 'none', border: `1px solid ${C.hueso2}`, borderRadius: 5,
            padding: '2px 8px', fontSize: 11, cursor: 'pointer', color: C.azul, fontWeight: 600,
          }}>✏️ Editar</button>
          <button onClick={() => onDelete(mov.id)} style={{
            background: 'none', border: `1px solid ${C.hueso2}`, borderRadius: 5,
            padding: '2px 8px', fontSize: 11, cursor: 'pointer', color: C.rojo, fontWeight: 600,
          }}>🗑️</button>
        </div>
      </div>
    </div>
  )
}

// ─── FORM MOVIMIENTO ─────────────────────────────────────────────────────────
function FormMovimiento({ onSave, showToast }) {
  const [type, setType]                   = useState('ingreso')
  const [date, setDate]                   = useState(isoToday())
  const [cat, setCat]                     = useState('')
  const [medio, setMedio]                 = useState('')
  const [amount, setAmount]               = useState('')
  const [desc, setDesc]                   = useState('')
  const [tags, setTags]                   = useState('')
  const [recibe, setRecibe]               = useState('')
  const [splitEnabled, setSplitEnabled]   = useState(false)
  const [medioSec, setMedioSec]           = useState('')
  const [montoSec, setMontoSec]           = useState('')

  const cats = type === 'ingreso' ? CAT_INGRESO : CAT_EGRESO

  const vuelto = useMemo(() => {
    const r = parseFloat(recibe)
    const a = parseFloat(amount)
    if (type === 'ingreso' && medio === 'efectivo' && r > 0 && a > 0 && r >= a) {
      return r - a
    }
    return 0
  }, [recibe, amount, type, medio])

  const reset = () => {
    setCat(''); setMedio(''); setAmount(''); setDesc(''); setTags('')
    setRecibe(''); setSplitEnabled(false); setMedioSec(''); setMontoSec('')
    setDate(isoToday())
  }

  const handleSubmit = () => {
    const n = parseFloat(amount)
    if (!n || n <= 0 || !cat || !medio) {
      showToast('Completá todos los campos requeridos', 'error')
      return
    }
    const mov = {
      id: uid(), type, date, cat, medio, amount: n, desc,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      vuelto,
      medioSecundario: splitEnabled && medioSec ? medioSec : null,
      montoSecundario: splitEnabled && medioSec ? parseFloat(montoSec) || 0 : 0,
    }
    onSave(mov)
    showToast(type === 'ingreso' ? '✅ Ingreso guardado' : '✅ Egreso guardado', 'ok')
    reset()
  }

  return (
    <div style={{ padding: '0 0 20px' }}>
      <h2 style={{ marginBottom: 18, color: C.negro }}>Nuevo movimiento</h2>

      {/* Tipo */}
      <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', marginBottom: 20, border: `1px solid ${C.hueso2}` }}>
        {['ingreso', 'egreso'].map(t => (
          <button key={t} onClick={() => { setType(t); setCat('') }} style={{
            flex: 1, padding: '12px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14,
            background: type === t ? (t === 'ingreso' ? C.verde : C.rojo) : 'white',
            color: type === t ? 'white' : C.topo, transition: 'all .15s',
          }}>
            {t === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}
          </button>
        ))}
      </div>

      {/* Fecha */}
      <Input label='Fecha' type='date' value={date} onChange={e => setDate(e.target.value)} />

      {/* Categoría */}
      <Select label='Categoría' value={cat} onChange={e => setCat(e.target.value)} options={cats} required />

      {/* Medio de pago */}
      <FieldLabel required>Medio de pago</FieldLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {MEDIOS.map(m => (
          <button key={m.id} onClick={() => setMedio(m.id)} style={{
            padding: '10px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
            border: medio === m.id ? `2px solid ${m.color}` : `1px solid ${C.hueso2}`,
            background: medio === m.id ? m.color + '18' : 'white',
            color: medio === m.id ? m.color : C.topo,
          }}>
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      {/* Monto */}
      <Input label='Monto' type='number' value={amount}
        onChange={e => setAmount(e.target.value)} prefix='$' required inputMode='numeric' />

      {/* Vuelto (solo efectivo ingreso) */}
      {type === 'ingreso' && medio === 'efectivo' && (
        <Input label='Recibe con (para calcular vuelto)' type='number' value={recibe}
          onChange={e => setRecibe(e.target.value)} prefix='$' inputMode='numeric'
          placeholder='Ej: 5000' />
      )}
      {vuelto > 0 && (
        <div style={{
          background: C.verde + '15', borderRadius: 8, padding: '10px 14px',
          marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontWeight: 700, color: C.verde }}>💰 Vuelto a entregar:</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: C.verde }}>{fmt(vuelto)}</span>
        </div>
      )}

      {/* Pago mixto */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: C.topo, fontWeight: 600 }}>
          <input type='checkbox' checked={splitEnabled} onChange={e => setSplitEnabled(e.target.checked)}
            style={{ width: 16, height: 16 }} />
          Pago mixto (dividir entre dos medios)
        </label>
      </div>
      {splitEnabled && (
        <Card style={{ marginBottom: 14, background: C.hueso }}>
          <FieldLabel>Segundo medio de pago</FieldLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
            {MEDIOS.filter(m => m.id !== medio).map(m => (
              <button key={m.id} onClick={() => setMedioSec(m.id)} style={{
                padding: '8px', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 12,
                border: medioSec === m.id ? `2px solid ${m.color}` : `1px solid ${C.hueso2}`,
                background: medioSec === m.id ? m.color + '18' : 'white',
                color: medioSec === m.id ? m.color : C.topo,
              }}>
                {m.emoji} {m.label}
              </button>
            ))}
          </div>
          <Input label='Monto del segundo medio' type='number' value={montoSec}
            onChange={e => setMontoSec(e.target.value)} prefix='$' inputMode='numeric' />
        </Card>
      )}

      {/* Descripción */}
      <Input label='Descripción (opcional)' value={desc}
        onChange={e => setDesc(e.target.value)} placeholder='Ej: Mesa comedor cliente García' />

      {/* Etiquetas */}
      <Input label='Etiquetas (separadas por coma)' value={tags}
        onChange={e => setTags(e.target.value)} placeholder='Ej: VIP, mayorista, urgente' />

      <Btn onClick={handleSubmit} full bg={type === 'ingreso' ? C.verde : C.rojo} color='white' style={{ marginTop: 4 }}>
        Guardar {type}
      </Btn>
    </div>
  )
}
// ─── VISTA INICIO ────────────────────────────────────────────────────────────
function VistaInicio({ movements, fondoInicial, setFondoInicial, showToast }) {
  const [editingFondo, setEditingFondo] = useState(false)
  const [fondoInput, setFondoInput]     = useState(String(fondoInicial))
  const today = isoToday()

  const todayMovs = useMemo(() =>
    movements.filter(m => m.date === today), [movements, today])

  const ingresos = useMemo(() =>
    todayMovs.filter(m => m.type === 'ingreso').reduce((s, m) => s + m.amount, 0), [todayMovs])

  const egresos = useMemo(() =>
    todayMovs.filter(m => m.type === 'egreso').reduce((s, m) => s + m.amount, 0), [todayMovs])

  const saldoDia = ingresos - egresos

  const byMedio = useMemo(() =>
    MEDIOS.map(m => ({
      ...m,
      total: todayMovs
        .filter(mv => mv.medio === m.id)
        .reduce((s, mv) => s + (mv.type === 'ingreso' ? mv.amount : -mv.amount), 0),
    })), [todayMovs])

  const efectivoEsperado = useMemo(() => {
    const ingEfectivo = todayMovs.filter(m => m.type === 'ingreso' && m.medio === 'efectivo').reduce((s, m) => s + m.amount, 0)
    const egEfectivo  = todayMovs.filter(m => m.type === 'egreso'  && m.medio === 'efectivo').reduce((s, m) => s + m.amount, 0)
    const vueltos     = todayMovs.reduce((s, m) => s + (m.vuelto || 0), 0)
    return fondoInicial + ingEfectivo - egEfectivo - vueltos
  }, [todayMovs, fondoInicial])

  const saveFondo = () => {
    const n = parseFloat(fondoInput)
    if (isNaN(n) || n < 0) return
    setFondoInicial(n)
    setEditingFondo(false)
    showToast('Fondo actualizado', 'ok')
  }

  // Chart data
  const chartData = MEDIOS.map(m => ({
    label: m.label.split(' ')[0],
    value: Math.max(todayMovs.filter(mv => mv.medio === m.id && mv.type === 'ingreso').reduce((s, mv) => s + mv.amount, 0), 0),
    color: m.color,
  }))

  return (
    <div>
      {/* Header fecha */}
      <Card style={{ marginBottom: 14, background: C.negro, border: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: C.topo, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>HOY</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'white', marginTop: 2 }}>
              {fmtDateFull(today)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: C.topo }}>Saldo del día</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: saldoDia >= 0 ? C.verde : C.rojo }}>
              {fmt(saldoDia)}
            </div>
          </div>
        </div>
      </Card>

      {/* Fondo inicial */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.topo, textTransform: 'uppercase', letterSpacing: 1 }}>
              💰 Fondo de caja inicial
            </div>
            {editingFondo ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                <input type='number' value={fondoInput} onChange={e => setFondoInput(e.target.value)}
                  inputMode='numeric'
                  style={{ width: 120, padding: '6px 10px', borderRadius: 6, border: `1.5px solid ${C.oliva}`, fontSize: 16, fontWeight: 700 }} />
                <Btn sm onClick={saveFondo} bg={C.verde} color='white'>OK</Btn>
                <Btn sm onClick={() => setEditingFondo(false)} bg={C.hueso2}>✕</Btn>
              </div>
            ) : (
              <div style={{ fontSize: 22, fontWeight: 800, color: C.negro, marginTop: 4 }}>{fmt(fondoInicial)}</div>
            )}
          </div>
          {!editingFondo && (
            <Btn sm onClick={() => { setFondoInput(String(fondoInicial)); setEditingFondo(true) }} bg={C.hueso2}>
              ✏️ Editar
            </Btn>
          )}
        </div>
      </Card>

      {/* Ingresos / Egresos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <Card style={{ borderLeft: `3px solid ${C.verde}` }}>
          <div style={{ fontSize: 11, color: C.verde, fontWeight: 700, textTransform: 'uppercase' }}>↑ Ingresos</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.verde, marginTop: 4 }}>{fmt(ingresos)}</div>
          <div style={{ fontSize: 12, color: C.topo }}>{todayMovs.filter(m => m.type === 'ingreso').length} mov.</div>
        </Card>
        <Card style={{ borderLeft: `3px solid ${C.rojo}` }}>
          <div style={{ fontSize: 11, color: C.rojo, fontWeight: 700, textTransform: 'uppercase' }}>↓ Egresos</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.rojo, marginTop: 4 }}>{fmt(egresos)}</div>
          <div style={{ fontSize: 12, color: C.topo }}>{todayMovs.filter(m => m.type === 'egreso').length} mov.</div>
        </Card>
      </div>

      {/* Por medio de pago */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: C.topo, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Por medio de pago
        </div>
        {byMedio.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px dashed ${C.hueso2}` }}>
            <span style={{ fontSize: 14, color: C.negro }}>{m.emoji} {m.label}</span>
            <span style={{ fontWeight: 700, color: m.total >= 0 ? C.verde : C.rojo }}>{fmt(m.total)}</span>
          </div>
        ))}
        {/* Mini gráfico de ingresos */}
        {ingresos > 0 && (
          <>
            <div style={{ fontSize: 11, color: C.topo, marginTop: 12, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>
              Ingresos por canal
            </div>
            <MiniBarChart data={chartData} />
          </>
        )}
      </Card>

      {/* Efectivo en caja esperado */}
      <Card style={{ marginBottom: 14, background: C.hueso, border: `1px solid ${C.arena}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.oliva, textTransform: 'uppercase', letterSpacing: 1 }}>
              💵 Efectivo en caja (esperado)
            </div>
            <div style={{ fontSize: 12, color: C.topo, marginTop: 2 }}>
              {fmt(fondoInicial)} inicial + ingresos - egresos - vueltos
            </div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: C.negro }}>{fmt(efectivoEsperado)}</div>
        </div>
      </Card>

      {/* Movimientos de hoy */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ color: C.negro }}>Movimientos de hoy ({todayMovs.length})</h3>
        {todayMovs.length > 0 && (
          <Btn sm onClick={() => exportCSV(todayMovs)} bg={C.hueso2} color={C.negro}>
            📥 CSV
          </Btn>
        )}
      </div>
      {todayMovs.length === 0 && (
        <div style={{ textAlign: 'center', color: C.topo, padding: '32px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div>Sin movimientos todavía.</div>
          <div style={{ fontSize: 13 }}>Tocá + para agregar el primero.</div>
        </div>
      )}
    </div>
  )
}
// ─── VISTA HISTORIAL ─────────────────────────────────────────────────────────
function VistaHistorial({ movements, onEdit, onDelete }) {
  const [filterDate, setFilterDate]   = useState('')
  const [filterType, setFilterType]   = useState('')
  const [filterMedio, setFilterMedio] = useState('')
  const [filterRange, setFilterRange] = useState('day') // 'day' | 'week' | 'month'
  const [search, setSearch]           = useState('')

  const filtered = useMemo(() => {
    const today = new Date(isoToday())
    return movements.filter(m => {
      // Range filter
      if (!filterDate) {
        const mDate = new Date(m.date)
        if (filterRange === 'week') {
          const diff = (today - mDate) / (1000 * 60 * 60 * 24)
          if (diff > 6 || diff < 0) return false
        } else if (filterRange === 'month') {
          if (mDate.getFullYear() !== today.getFullYear() || mDate.getMonth() !== today.getMonth()) return false
        } else {
          if (m.date !== isoToday()) return false
        }
      } else {
        if (m.date !== filterDate) return false
      }
      if (filterType  && m.type  !== filterType)  return false
      if (filterMedio && m.medio !== filterMedio)  return false
      if (search && !((m.desc || '').toLowerCase().includes(search.toLowerCase()) ||
                      m.cat.toLowerCase().includes(search.toLowerCase()) ||
                      (m.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase())))) return false
      return true
    })
  }, [movements, filterDate, filterType, filterMedio, filterRange, search])

  const totalIng  = useMemo(() => filtered.filter(m => m.type === 'ingreso').reduce((s, m) => s + m.amount, 0), [filtered])
  const totalEgr  = useMemo(() => filtered.filter(m => m.type === 'egreso').reduce((s, m) => s + m.amount, 0), [filtered])

  // Group by date for multi-day view
  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(m => {
      if (!groups[m.date]) groups[m.date] = []
      groups[m.date].push(m)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const showGrouped = filterRange !== 'day' && !filterDate

  return (
    <div>
      <h2 style={{ marginBottom: 14, color: C.negro }}>Historial</h2>

      {/* Range selector */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[['day', 'Hoy'], ['week', 'Semana'], ['month', 'Mes']].map(([v, l]) => (
          <button key={v} onClick={() => { setFilterRange(v); setFilterDate('') }} style={{
            flex: 1, padding: '8px 4px', border: 'none', borderRadius: 7, cursor: 'pointer',
            fontWeight: 700, fontSize: 12,
            background: filterRange === v && !filterDate ? C.oliva : C.hueso2,
            color: filterRange === v && !filterDate ? 'white' : C.topo,
          }}>{l}</button>
        ))}
      </div>

      <Card style={{ marginBottom: 14 }}>
        {/* Search */}
        <Input label='Buscar' value={search} onChange={e => setSearch(e.target.value)}
          placeholder='Descripción, categoría, etiqueta...' prefix='🔍' />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <FieldLabel>Fecha específica</FieldLabel>
            <input type='date' value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 6,
                border: `1.5px solid ${C.hueso2}`, fontSize: 14, boxSizing: 'border-box',
              }} />
          </div>
          <div>
            <FieldLabel>Tipo</FieldLabel>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: `1.5px solid ${C.hueso2}`, fontSize: 14 }}>
              <option value=''>Todos</option>
              <option value='ingreso'>Ingresos</option>
              <option value='egreso'>Egresos</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <FieldLabel>Medio de pago</FieldLabel>
          <select value={filterMedio} onChange={e => setFilterMedio(e.target.value)}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: `1.5px solid ${C.hueso2}`, fontSize: 14 }}>
            <option value=''>Todos los medios</option>
            {MEDIOS.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.label}</option>)}
          </select>
        </div>
      </Card>

      {/* Totales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        <Card style={{ borderLeft: `3px solid ${C.verde}`, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: C.verde, fontWeight: 700, textTransform: 'uppercase' }}>↑ Ingresos</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.verde }}>{fmt(totalIng)}</div>
        </Card>
        <Card style={{ borderLeft: `3px solid ${C.rojo}`, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: C.rojo, fontWeight: 700, textTransform: 'uppercase' }}>↓ Egresos</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.rojo }}>{fmt(totalEgr)}</div>
        </Card>
        <Card style={{ borderLeft: `3px solid ${C.azul}`, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: C.azul, fontWeight: 700, textTransform: 'uppercase' }}> = Saldo</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: totalIng - totalEgr >= 0 ? C.verde : C.rojo }}>
            {fmt(totalIng - totalEgr)}
          </div>
        </Card>
      </div>

      {/* Export */}
      {filtered.length > 0 && (
        <div style={{ textAlign: 'right', marginBottom: 10 }}>
          <Btn sm onClick={() => exportCSV(filtered)} bg={C.hueso2} color={C.negro}>
            📥 Exportar CSV ({filtered.length} mov.)
          </Btn>
        </div>
      )}

      {/* Movimientos */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.topo, padding: '32px 0' }}>
          <div style={{ fontSize: 32 }}>🔍</div>
          <div>No hay movimientos con esos filtros.</div>
        </div>
      ) : showGrouped ? (
        grouped.map(([date, movs]) => {
          const dayIng = movs.filter(m => m.type === 'ingreso').reduce((s, m) => s + m.amount, 0)
          const dayEgr = movs.filter(m => m.type === 'egreso').reduce((s, m) => s + m.amount, 0)
          return (
            <div key={date}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: `2px solid ${C.hueso2}`, marginBottom: 4, marginTop: 12,
              }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: C.oliva }}>{fmtDate(date)}</span>
                <span style={{ fontSize: 12, color: C.topo }}>
                  +{fmt(dayIng)} / -{fmt(dayEgr)} = <strong style={{ color: dayIng - dayEgr >= 0 ? C.verde : C.rojo }}>{fmt(dayIng - dayEgr)}</strong>
                </span>
              </div>
              {movs.map(m => <MovCard key={m.id} mov={m} onEdit={onEdit} onDelete={onDelete} />)}
            </div>
          )
        })
      ) : (
        filtered.map(m => <MovCard key={m.id} mov={m} onEdit={onEdit} onDelete={onDelete} />)
      )}
    </div>
  )
}
// ─── VISTA ARQUEO ────────────────────────────────────────────────────────────
function VistaArqueo({ movements, fondoInicial, showToast }) {
  const [conteoFisico, setConteoFisico] = useState('')
  const today = isoToday()

  const todayMovs = useMemo(() =>
    movements.filter(m => m.date === today), [movements, today])

  const ingEfectivo = useMemo(() =>
    todayMovs.filter(m => m.type === 'ingreso' && m.medio === 'efectivo').reduce((s, m) => s + m.amount, 0),
    [todayMovs])

  const egEfectivo = useMemo(() =>
    todayMovs.filter(m => m.type === 'egreso' && m.medio === 'efectivo').reduce((s, m) => s + m.amount, 0),
    [todayMovs])

  const vueltos = useMemo(() =>
    todayMovs.reduce((s, m) => s + (m.vuelto || 0), 0), [todayMovs])

  const efectivoEsperado = fondoInicial + ingEfectivo - egEfectivo - vueltos

  const conteoN = parseFloat(conteoFisico) || 0
  const diferencia = conteoN - efectivoEsperado

  const ingresosDig = useMemo(() =>
    MEDIOS.filter(m => m.id !== 'efectivo').map(med => ({
      ...med,
      total: todayMovs.filter(m => m.medio === med.id).reduce((s, m) =>
        s + (m.type === 'ingreso' ? m.amount : -m.amount), 0),
    })), [todayMovs])

  const handleCerrar = () => {
    showToast('Caja cerrada correctamente 🔒', 'ok')
  }

  return (
    <div>
      <h2 style={{ marginBottom: 4, color: C.negro }}>Arqueo de caja</h2>
      <div style={{ fontSize: 14, color: C.topo, marginBottom: 18 }}>{fmtDateFull(today)}</div>

      {/* Resumen efectivo */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: C.topo, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Resumen del día — Efectivo
        </div>
        {[
          ['Fondo inicial (efectivo)', fondoInicial],
          ['+ Ventas en efectivo',     ingEfectivo],
          ['- Pagos en efectivo',      egEfectivo],
          ['- Vueltos entregados',     vueltos],
        ].map(([label, val]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px dashed ${C.hueso2}`, fontSize: 14, color: C.negro }}>
            <span>{label}</span>
            <span style={{ fontWeight: 600 }}>{fmt(val)}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontWeight: 800, fontSize: 16, color: C.negro }}>
          <span>= Efectivo esperado</span>
          <span>{fmt(efectivoEsperado)}</span>
        </div>
      </Card>

      {/* Digitales */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: C.topo, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Ingresos digitales del día
        </div>
        {ingresosDig.map(m => (
          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px dashed ${C.hueso2}`, fontSize: 14, color: C.negro }}>
            <span>{m.emoji} {m.label}</span>
            <span style={{ fontWeight: 600, color: m.total >= 0 ? C.verde : C.rojo }}>{fmt(m.total)}</span>
          </div>
        ))}
      </Card>

      {/* Conteo físico */}
      <Card style={{ marginBottom: 14, background: C.hueso, border: `1px solid ${C.arena}` }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: C.oliva, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Conteo físico de caja
        </div>
        <div style={{ fontSize: 13, color: C.topo, marginBottom: 12 }}>¿Cuánto efectivo hay ahora?</div>
        <Input type='number' value={conteoFisico}
          onChange={e => setConteoFisico(e.target.value)} prefix='$' inputMode='numeric'
          placeholder='Contá el dinero...' />
        {conteoFisico !== '' && (
          <div style={{
            marginTop: 8, padding: '12px 14px', borderRadius: 8,
            background: Math.abs(diferencia) < 1 ? C.verde + '15' : diferencia > 0 ? C.azul + '15' : C.rojo + '15',
            border: `1px solid ${Math.abs(diferencia) < 1 ? C.verde : diferencia > 0 ? C.azul : C.rojo}44`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: C.negro }}>
                {Math.abs(diferencia) < 1 ? '✅ Sin diferencia' : diferencia > 0 ? '⬆️ Sobrante' : '⬇️ Faltante'}
              </span>
              <span style={{ fontWeight: 800, fontSize: 20, color: Math.abs(diferencia) < 1 ? C.verde : diferencia > 0 ? C.azul : C.rojo }}>
                {diferencia > 0 ? '+' : ''}{fmt(diferencia)}
              </span>
            </div>
          </div>
        )}
      </Card>

      <Btn onClick={handleCerrar} full bg={C.negro} color='white'>
        🔒 Cerrar caja del día
      </Btn>
    </div>
  )
}

// ─── APP PRINCIPAL ───────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]             = useState('inicio')
  const [movements, setMovements] = useState(() => load('movements', []))
  const [fondoInicial, setFondoInicial] = useState(() => {
    // Cargar fondo del día anterior si existe
    const savedFondo = load('fondoInicial', 0)
    const lastFondoDate = load('lastFondoDate', '')
    const today = isoToday()
    // Si el fondo fue guardado antes de hoy, arrastrar el saldo de efectivo del día anterior
    if (lastFondoDate && lastFondoDate !== today) {
      const yesterday = lastFondoDate
      const yesterdayMovs = (load('movements', [])).filter(m => m.date === yesterday)
      const ingEfec = yesterdayMovs.filter(m => m.type === 'ingreso' && m.medio === 'efectivo').reduce((s, m) => s + m.amount, 0)
      const egEfec  = yesterdayMovs.filter(m => m.type === 'egreso'  && m.medio === 'efectivo').reduce((s, m) => s + m.amount, 0)
      const vueltos = yesterdayMovs.reduce((s, m) => s + (m.vuelto || 0), 0)
      return savedFondo + ingEfec - egEfec - vueltos
    }
    return savedFondo
  })
  const [toast, setToast]         = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const [editMov, setEditMov]     = useState(null)

  // Persist
  // Registrar Service Worker para PWA offline
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  // Cargar datos desde Supabase (sincronización entre dispositivos)
  useEffect(() => {
    if (!supabase) return
    async function hydrate() {
      try {
        const { data: movs, error } = await supabase
        .from('movements')
        .select('*')
        .order('created_at', { ascending: false })
        if (!error && movs) {
          setMovements(movs.map(m => ({
            id: m.id,
            type: m.type,
            date: m.date,
            cat: m.cat,
            medio: m.medio,
            amount: Number(m.amount),
            desc: m.descripcion || '',
            tags: m.tags || [],
            vuelto: Number(m.vuelto) || 0,
            medioSecundario: m.medio_secundario || null,
            montoSecundario: Number(m.monto_secundario) || 0,
          })))
        }
        const { data: fondo } = await supabase
        .from('caja_fondo')
        .select('*')
        .eq('id', 1)
        .single()
        if (fondo) {
          if (fondo.fondo_inicial != null) setFondoInicial(Number(fondo.fondo_inicial))
          if (fondo.last_fondo_date) save('lastFondoDate', fondo.last_fondo_date)
        }
      } catch (e) {
        console.error('Error cargando datos de Supabase', e)
      } finally {
        hydrated = true
      }
    }
    hydrate()
  }, [])

  useEffect(() => { save('movements', movements) }, [movements])
  useEffect(() => {
    save('fondoInicial', fondoInicial)
    save('lastFondoDate', isoToday())
  }, [fondoInicial])

  const showToast = useCallback((msg, type = 'ok') => {
    setToast({ msg, type, id: uid() })
  }, [])

  const handleSave = useCallback((mov) => {
    setMovements(prev => [mov, ...prev])
    setTab('inicio')
  }, [])

  const handleDelete = useCallback((id) => {
    setConfirmId(id)
  }, [])

  const confirmDelete = useCallback(() => {
    setMovements(prev => prev.filter(m => m.id !== confirmId))
    setConfirmId(null)
    showToast('Movimiento eliminado', 'error')
  }, [confirmId, showToast])

  const handleEdit = useCallback((mov) => {
    setEditMov(mov)
  }, [])

  const handleEditSave = useCallback((updated) => {
    setMovements(prev => prev.map(m => m.id === updated.id ? updated : m))
    setEditMov(null)
    showToast('Movimiento actualizado ✅', 'ok')
  }, [showToast])

  const todayCount = useMemo(() =>
    movements.filter(m => m.date === isoToday()).length, [movements])

  return (
    <div style={{
      minHeight: '100dvh', background: C.hueso, fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        background: C.negro, padding: '12px 18px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div>
          <div style={{ fontSize: 11, color: C.topo, fontWeight: 700, letterSpacing: 1 }}>DABIEN'S & CO.</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>Sistema de Caja</div>
        </div>
        <Badge label={`${todayCount} mov. hoy`} color={C.arena} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '16px 16px 100px', maxWidth: 480, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {tab === 'inicio' && (
          <VistaInicio
            movements={movements}
            fondoInicial={fondoInicial}
            setFondoInicial={setFondoInicial}
            showToast={showToast}
          />
        )}
        {tab === 'nuevo' && (
          <FormMovimiento onSave={handleSave} showToast={showToast} />
        )}
        {tab === 'historial' && (
          <VistaHistorial movements={movements} onEdit={handleEdit} onDelete={handleDelete} />
        )}
        {tab === 'arqueo' && (
          <VistaArqueo movements={movements} fondoInicial={fondoInicial} showToast={showToast} />
        )}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderTop: `1px solid ${C.hueso2}`,
        display: 'flex', zIndex: 100,
        maxWidth: 480, margin: '0 auto',
      }}>
        <NavTab icon='🏠' label='Inicio'    active={tab === 'inicio'}    onClick={() => setTab('inicio')} />
        <NavTab icon='➕' label='Nuevo'     active={tab === 'nuevo'}     onClick={() => setTab('nuevo')} />
        <NavTab icon='📋' label='Historial' active={tab === 'historial'} onClick={() => setTab('historial')} />
        <NavTab icon='🗂️' label='Arqueo'   active={tab === 'arqueo'}    onClick={() => setTab('arqueo')} />
      </div>

      {/* Modals & toasts */}
      {toast && <Toast key={toast.id} msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {confirmId && (
        <ConfirmModal
          msg='¿Eliminar este movimiento? Esta acción no se puede deshacer.'
          onConfirm={confirmDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
      {editMov && (
        <EditModal mov={editMov} onSave={handleEditSave} onClose={() => setEditMov(null)} />
      )}
    </div>
  )
}
