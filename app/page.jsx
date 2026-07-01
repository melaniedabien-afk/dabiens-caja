'use client'
import { useState, useEffect } from 'react'

// ─── BRAND ────────────────────────────────────────────────────────────────────
const C = {
  negro:  '#0D0D0D', hueso:  '#F5F2EC', hueso2: '#E8E3DA',
  oliva:  '#8C8C5A', arena:  '#C4B49A', topo:   '#A8A49A',
  verde:  '#5A8C5A', rojo:   '#C45A5A', azul:   '#5A6E8C',
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MEDIOS = [
  { id: 'efectivo',      label: 'Efectivo',     emoji: '💵', color: C.verde },
  { id: 'transferencia', label: 'Transferencia', emoji: '🏦', color: C.azul  },
  { id: 'nave',          label: 'Tarjeta Nave',  emoji: '💳', color: C.oliva },
  { id: 'mp',            label: 'Mercado Pago',  emoji: '📱', color: C.arena },
]

const CAT_INGRESO = ['Venta', 'Seña / Anticipo', 'Devolución de proveedor', 'Otro ingreso']
const CAT_EGRESO  = [
  'Proveedor / Mercadería', 'Alquiler', 'Servicios (luz, gas, etc.)',
  'Sueldo / Retiro', 'Gastos del local', 'Marketing / Publicidad', 'Otro egreso',
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = n => new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', minimumFractionDigits: 0,
}).format(n || 0)

const isoToday = () => new Date().toISOString().split('T')[0]

const fmtDate = iso =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2)

// ─── STORAGE (localStorage) ───────────────────────────────────────────────────
const load = (key, fallback) => {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch { return fallback }
}
const save = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
}

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
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

function Input({ label, type = 'text', value, onChange, placeholder, prefix, note, required }) {
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
          style={{
            flex: 1, border: 'none', outline: 'none', padding: '10px 12px',
            fontSize: 14, background: 'transparent', color: C.negro,
          }}
        />
      </div>
      {note && <div style={{ fontSize: 11, color: C.topo, marginTop: 4 }}>{note}</div>}
    </div>
  )
}

function Select({ label, value, onChange, options, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <select value={value} onChange={onChange} style={{
        width: '100%', border: `1.5px solid ${C.hueso2}`, borderRadius: 6,
        padding: '10px 12px', fontSize: 14, color: C.negro,
        background: 'white', outline: 'none', cursor: 'pointer',
      }}>
        <option value="">— Elegí una opción —</option>
        {options.map(o => (
          <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
        ))}
      </select>
    </div>
  )
}

// ─── MOV ROW ─────────────────────────────────────────────────────────────────
function MovRow({ mov, onDelete }) {
  const medio = MEDIOS.find(m => m.id === mov.paymentMethod) || MEDIOS[0]
  const isIng = mov.type === 'ingreso'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 0', borderBottom: `1px solid ${C.hueso2}`,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: isIng ? C.verde + '22' : C.rojo + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 700, color: isIng ? C.verde : C.rojo,
      }}>
        {isIng ? '↑' : '↓'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: C.negro }}>{mov.category}</span>
          <Badge label={`${medio.emoji} ${medio.label}`} color={medio.color} />
        </div>
        {mov.description && (
          <div style={{
            fontSize: 12, color: C.topo, marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {mov.description}
          </div>
        )}
        <div style={{ fontSize: 11, color: C.topo, marginTop: 1 }}>
          {fmtDate(mov.date)} · {mov.time}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: isIng ? C.verde : C.rojo }}>
          {isIng ? '+' : '-'}{fmt(mov.amount)}
        </div>
        {mov.vuelto > 0 && (
          <div style={{ fontSize: 11, color: C.topo }}>vuelto {fmt(mov.vuelto)}</div>
        )}
        <button onClick={() => onDelete(mov.id)} style={{
          background: 'none', border: 'none', color: C.topo,
          cursor: 'pointer', fontSize: 11, padding: '2px 0', marginTop: 2,
        }}>
          ✕ borrar
        </button>
      </div>
    </div>
  )
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ movements, cajaInicial, todayDate, onSetCajaInicial }) {
  const todayMovs = movements.filter(m => m.date === todayDate)
  const cajaHoy = cajaInicial[todayDate] || 0

  const totalIngresos = todayMovs.filter(m => m.type === 'ingreso').reduce((s, m) => s + m.amount, 0)
  const totalEgresos  = todayMovs.filter(m => m.type === 'egreso').reduce((s, m) => s + m.amount, 0)
  const totalVueltos  = todayMovs
    .filter(m => m.type === 'ingreso' && m.paymentMethod === 'efectivo')
    .reduce((s, m) => s + (m.vuelto || 0), 0)

  const byMedio = {}
  MEDIOS.forEach(md => {
    const ing = todayMovs.filter(m => m.type === 'ingreso' && m.paymentMethod === md.id).reduce((s, m) => s + m.amount, 0)
    const eg  = todayMovs.filter(m => m.type === 'egreso'  && m.paymentMethod === md.id).reduce((s, m) => s + m.amount, 0)
    byMedio[md.id] = { ing, eg, neto: ing - eg }
  })

  const efectivoEsperado = cajaHoy + byMedio.efectivo.ing - byMedio.efectivo.eg - totalVueltos

  const [editCaja, setEditCaja]   = useState(false)
  const [nuevaCaja, setNuevaCaja] = useState(cajaHoy.toString())

  return (
    <div>
      {/* Header del día */}
      <div style={{
        background: C.negro, borderRadius: 10, padding: '16px 20px', marginBottom: 16,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ color: C.arena, fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            Hoy
          </div>
          <div style={{ color: 'white', fontSize: 18, fontWeight: 700, marginTop: 2 }}>
            {new Date(todayDate + 'T12:00').toLocaleDateString('es-AR', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: C.topo, fontSize: 11 }}>Saldo del día</div>
          <div style={{
            fontSize: 22, fontWeight: 700,
            color: totalIngresos - totalEgresos >= 0 ? C.arena : C.rojo,
          }}>
            {fmt(totalIngresos - totalEgresos)}
          </div>
        </div>
      </div>

      {/* Fondo de caja */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.topo, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
              💵 Fondo de caja inicial
            </div>
            {editCaja ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                <input
                  type="number" value={nuevaCaja} onChange={e => setNuevaCaja(e.target.value)}
                  style={{
                    border: `1.5px solid ${C.arena}`, borderRadius: 6, padding: '6px 10px',
                    fontSize: 14, width: 130, outline: 'none',
                  }}
                />
                <Btn sm bg={C.oliva} color="white" onClick={() => {
                  onSetCajaInicial(todayDate, parseFloat(nuevaCaja) || 0)
                  setEditCaja(false)
                }}>
                  Guardar
                </Btn>
              </div>
            ) : (
              <div style={{ fontSize: 20, fontWeight: 700, color: C.negro, marginTop: 4 }}>
                {fmt(cajaHoy)}
              </div>
            )}
          </div>
          {!editCaja && (
            <Btn sm bg={C.hueso} onClick={() => { setEditCaja(true); setNuevaCaja(cajaHoy.toString()) }}>
              ✏️ Editar
            </Btn>
          )}
        </div>
      </Card>

      {/* Ingresos / Egresos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <Card style={{ borderTop: `3px solid ${C.verde}` }}>
          <div style={{ fontSize: 11, color: C.topo, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
            ↑ Ingresos
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.verde, marginTop: 4 }}>
            {fmt(totalIngresos)}
          </div>
          <div style={{ fontSize: 11, color: C.topo }}>
            {todayMovs.filter(m => m.type === 'ingreso').length} mov.
          </div>
        </Card>
        <Card style={{ borderTop: `3px solid ${C.rojo}` }}>
          <div style={{ fontSize: 11, color: C.topo, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
            ↓ Egresos
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.rojo, marginTop: 4 }}>
            {fmt(totalEgresos)}
          </div>
          <div style={{ fontSize: 11, color: C.topo }}>
            {todayMovs.filter(m => m.type === 'egreso').length} mov.
          </div>
        </Card>
      </div>

      {/* Por medio de pago */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.oliva, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Por medio de pago
        </div>
        {MEDIOS.map(md => (
          <div key={md.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 0', borderBottom: `1px dashed ${C.hueso2}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{md.emoji}</span>
              <span style={{ fontSize: 13, color: C.negro }}>{md.label}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: byMedio[md.id].neto >= 0 ? C.verde : C.rojo,
              }}>
                {fmt(byMedio[md.id].neto)}
              </span>
              {byMedio[md.id].ing > 0 && (
                <span style={{ fontSize: 11, color: C.topo, marginLeft: 6 }}>+{fmt(byMedio[md.id].ing)}</span>
              )}
              {byMedio[md.id].eg > 0 && (
                <span style={{ fontSize: 11, color: C.topo }}> -{fmt(byMedio[md.id].eg)}</span>
              )}
            </div>
          </div>
        ))}
      </Card>

      {/* Efectivo en caja */}
      <Card style={{ marginBottom: 12, borderLeft: `4px solid ${C.oliva}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: C.topo, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
              💵 Efectivo en caja (esperado)
            </div>
            <div style={{ fontSize: 11, color: C.topo, marginTop: 4, lineHeight: 1.5 }}>
              {fmt(cajaHoy)} inicial + {fmt(byMedio.efectivo.ing)} ing − {fmt(byMedio.efectivo.eg)} eg − {fmt(totalVueltos)} vueltos
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.negro, flexShrink: 0 }}>
            {fmt(efectivoEsperado)}
          </div>
        </div>
      </Card>

      {/* Movimientos de hoy */}
      <div style={{ fontSize: 13, fontWeight: 700, color: C.negro, marginBottom: 8 }}>
        Movimientos de hoy ({todayMovs.length})
      </div>
      {todayMovs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: C.topo, fontSize: 13 }}>
          Sin movimientos todavía.<br />
          <span style={{ fontSize: 12 }}>Tocá + para agregar el primero.</span>
        </div>
      ) : (
        [...todayMovs].reverse().map(m => (
          <MovRow key={m.id} mov={m} onDelete={() => {}} />
        ))
      )}
    </div>
  )
}

// ─── NUEVO MOVIMIENTO ─────────────────────────────────────────────────────────
function NuevoMovimiento({ onSave, todayDate }) {
  const [tipo, setTipo]       = useState('ingreso')
  const [categoria, setCat]   = useState('')
  const [medio, setMedio]     = useState('')
  const [monto, setMonto]     = useState('')
  const [desc, setDesc]       = useState('')
  const [entrego, setEntrego] = useState('')
  const [fecha, setFecha]     = useState(todayDate)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  const vuelto =
    medio === 'efectivo' && parseFloat(entrego) > 0
      ? Math.max(0, parseFloat(entrego) - (parseFloat(monto) || 0))
      : 0

  const submit = () => {
    if (!monto || isNaN(parseFloat(monto)) || parseFloat(monto) <= 0) {
      setError('El monto es obligatorio y debe ser mayor a 0.'); return
    }
    if (!categoria) { setError('Elegí una categoría.'); return }
    if (!medio)     { setError('Elegí el medio de pago.'); return }
    setError('')

    onSave({
      id: uid(),
      type: tipo,
      category: categoria,
      paymentMethod: medio,
      amount: parseFloat(monto),
      description: desc,
      vuelto,
      date: fecha,
      time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    })

    setCat(''); setMedio(''); setMonto(''); setDesc(''); setEntrego('')
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.negro, marginBottom: 16 }}>
        Nuevo movimiento
      </div>

      {/* Toggle ingreso / egreso */}
      <div style={{
        display: 'flex', borderRadius: 8, overflow: 'hidden',
        border: `1.5px solid ${C.hueso2}`, marginBottom: 20,
      }}>
        {['ingreso', 'egreso'].map(t => (
          <button key={t} onClick={() => { setTipo(t); setCat('') }}
            style={{
              flex: 1, padding: 12, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 14, transition: 'all .15s',
              background: tipo === t ? (t === 'ingreso' ? C.verde : C.rojo) : 'white',
              color: tipo === t ? 'white' : C.topo,
            }}>
            {t === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}
          </button>
        ))}
      </div>

      <Input label="Fecha" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />

      <Select
        label="Categoría" required value={categoria}
        onChange={e => setCat(e.target.value)}
        options={tipo === 'ingreso' ? CAT_INGRESO : CAT_EGRESO}
      />

      {/* Medio de pago */}
      <div style={{ marginBottom: 14 }}>
        <FieldLabel required>Medio de pago</FieldLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {MEDIOS.map(md => (
            <button key={md.id} onClick={() => { setMedio(md.id); setEntrego('') }}
              style={{
                padding: '10px 8px', borderRadius: 6,
                border: `2px solid ${medio === md.id ? md.color : C.hueso2}`,
                background: medio === md.id ? md.color + '18' : 'white',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                color: medio === md.id ? md.color : C.topo,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <span style={{ fontSize: 18 }}>{md.emoji}</span> {md.label}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Monto" type="number" required prefix="$"
        value={monto} onChange={e => setMonto(e.target.value)} placeholder="0"
      />

      {/* Calculadora de vuelto */}
      {tipo === 'ingreso' && medio === 'efectivo' && (
        <div style={{ background: C.hueso, borderRadius: 8, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.oliva, marginBottom: 10 }}>
            💵 Calculadora de vuelto
          </div>
          <Input
            label="El cliente entregó" type="number" prefix="$"
            value={entrego} onChange={e => setEntrego(e.target.value)} placeholder="0"
          />
          {parseFloat(entrego) > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: vuelto >= 0 ? C.verde + '22' : C.rojo + '22',
              borderRadius: 6, padding: '10px 14px',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.negro }}>
                {vuelto >= 0 ? '✓ Vuelto a dar:' : '⚠ Falta:'}
              </span>
              <span style={{ fontSize: 22, fontWeight: 700, color: vuelto >= 0 ? C.verde : C.rojo }}>
                {fmt(Math.abs(vuelto))}
              </span>
            </div>
          )}
        </div>
      )}

      <Input
        label="Descripción (opcional)"
        value={desc} onChange={e => setDesc(e.target.value)}
        placeholder="Ej: Mesa comedor cliente García"
      />

      {error && (
        <div style={{ background: C.rojo + '22', color: C.rojo, borderRadius: 6, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
          ⚠ {error}
        </div>
      )}
      {saved && (
        <div style={{ background: C.verde + '22', color: C.verde, borderRadius: 6, padding: '10px 14px', fontSize: 13, marginBottom: 14 }}>
          ✓ Movimiento guardado
        </div>
      )}

      <Btn full bg={tipo === 'ingreso' ? C.verde : C.rojo} color="white" onClick={submit}>
        Guardar {tipo === 'ingreso' ? 'ingreso' : 'egreso'}
      </Btn>
    </div>
  )
}

// ─── HISTORIAL ────────────────────────────────────────────────────────────────
function Historial({ movements, onDelete }) {
  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtroTipo, setFiltroTipo]   = useState('')
  const [filtroMedio, setFiltroMedio] = useState('')

  let filtered = [...movements].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
  if (filtroFecha) filtered = filtered.filter(m => m.date === filtroFecha)
  if (filtroTipo)  filtered = filtered.filter(m => m.type === filtroTipo)
  if (filtroMedio) filtered = filtered.filter(m => m.paymentMethod === filtroMedio)

  const totalIng = filtered.filter(m => m.type === 'ingreso').reduce((s, m) => s + m.amount, 0)
  const totalEg  = filtered.filter(m => m.type === 'egreso').reduce((s, m) => s + m.amount, 0)

  const byDate = {}
  filtered.forEach(m => { if (!byDate[m.date]) byDate[m.date] = []; byDate[m.date].push(m) })
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.negro, marginBottom: 14 }}>Historial</div>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.oliva, marginBottom: 10 }}>
          Filtros
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 11, color: C.topo, marginBottom: 4 }}>Fecha</div>
            <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)}
              style={{ width: '100%', border: `1.5px solid ${C.hueso2}`, borderRadius: 6, padding: 8, fontSize: 13, outline: 'none' }} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.topo, marginBottom: 4 }}>Tipo</div>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
              style={{ width: '100%', border: `1.5px solid ${C.hueso2}`, borderRadius: 6, padding: 8, fontSize: 13, outline: 'none', background: 'white' }}>
              <option value="">Todos</option>
              <option value="ingreso">Ingresos</option>
              <option value="egreso">Egresos</option>
            </select>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: C.topo, marginBottom: 4 }}>Medio de pago</div>
          <select value={filtroMedio} onChange={e => setFiltroMedio(e.target.value)}
            style={{ width: '100%', border: `1.5px solid ${C.hueso2}`, borderRadius: 6, padding: 8, fontSize: 13, outline: 'none', background: 'white' }}>
            <option value="">Todos los medios</option>
            {MEDIOS.map(md => <option key={md.id} value={md.id}>{md.emoji} {md.label}</option>)}
          </select>
        </div>
        {(filtroFecha || filtroTipo || filtroMedio) && (
          <button onClick={() => { setFiltroFecha(''); setFiltroTipo(''); setFiltroMedio('') }}
            style={{ marginTop: 8, background: 'none', border: 'none', color: C.oliva, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            ✕ Limpiar filtros
          </button>
        )}
      </Card>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        {[
          { label: '↑ Ingresos', val: totalIng, color: C.verde },
          { label: '↓ Egresos',  val: totalEg,  color: C.rojo  },
          { label: '= Saldo',    val: totalIng - totalEg, color: totalIng - totalEg >= 0 ? C.negro : C.rojo },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ flex: 1, background: color + '18', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, color, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color }}>{fmt(val)}</div>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: C.topo, fontSize: 13 }}>
          No hay movimientos con esos filtros.
        </div>
      ) : (
        dates.map(d => (
          <div key={d} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.topo, textTransform: 'uppercase', letterSpacing: 1, padding: '6px 0', borderBottom: `2px solid ${C.negro}`, marginBottom: 4 }}>
              {fmtDate(d)}
              <span style={{ fontWeight: 400, marginLeft: 8 }}>
                +{fmt(byDate[d].filter(m => m.type === 'ingreso').reduce((s, m) => s + m.amount, 0))} / -{fmt(byDate[d].filter(m => m.type === 'egreso').reduce((s, m) => s + m.amount, 0))}
              </span>
            </div>
            {byDate[d].map(m => <MovRow key={m.id} mov={m} onDelete={onDelete} />)}
          </div>
        ))
      )}
    </div>
  )
}

// ─── ARQUEO ───────────────────────────────────────────────────────────────────
function Arqueo({ movements, cajaInicial, todayDate }) {
  const [contado, setContado] = useState('')
  const [cerrado, setCerrado] = useState(false)

  const todayMovs    = movements.filter(m => m.date === todayDate)
  const cajaHoy      = cajaInicial[todayDate] || 0
  const ingEfectivo  = todayMovs.filter(m => m.type === 'ingreso' && m.paymentMethod === 'efectivo').reduce((s, m) => s + m.amount, 0)
  const egEfectivo   = todayMovs.filter(m => m.type === 'egreso'  && m.paymentMethod === 'efectivo').reduce((s, m) => s + m.amount, 0)
  const totalVueltos = todayMovs.filter(m => m.type === 'ingreso' && m.paymentMethod === 'efectivo').reduce((s, m) => s + (m.vuelto || 0), 0)
  const efectivoEsperado = cajaHoy + ingEfectivo - egEfectivo - totalVueltos

  const ing = (mp) => todayMovs.filter(m => m.type === 'ingreso' && m.paymentMethod === mp).reduce((s, m) => s + m.amount, 0)

  const diferencia = contado !== '' ? parseFloat(contado) - efectivoEsperado : null

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.negro, marginBottom: 4 }}>Arqueo de caja</div>
      <div style={{ fontSize: 13, color: C.topo, marginBottom: 16 }}>
        {new Date(todayDate + 'T12:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.oliva, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Resumen del día
        </div>
        {[
          ['Fondo inicial (efectivo)', fmt(cajaHoy)],
          ['+ Ventas en efectivo',     fmt(ingEfectivo)],
          ['− Pagos en efectivo',      fmt(egEfectivo)],
          ['− Vueltos entregados',     fmt(totalVueltos)],
        ].map(([label, val]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px dashed ${C.hueso2}`, fontSize: 13 }}>
            <span style={{ color: C.topo }}>{label}</span>
            <span style={{ fontWeight: 600 }}>{val}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 15, fontWeight: 700 }}>
          <span>= Efectivo esperado</span>
          <span>{fmt(efectivoEsperado)}</span>
        </div>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.oliva, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Ingresos digitales del día
        </div>
        {[
          ['🏦 Transferencias', ing('transferencia')],
          ['💳 Tarjeta Nave',   ing('nave')],
          ['📱 Mercado Pago',   ing('mp')],
        ].map(([label, val]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px dashed ${C.hueso2}`, fontSize: 13 }}>
            <span style={{ color: C.topo }}>{label}</span>
            <span style={{ fontWeight: 600, color: val > 0 ? C.verde : C.negro }}>{fmt(val)}</span>
          </div>
        ))}
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.oliva, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Conteo físico de caja
        </div>
        <Input
          label="¿Cuánto efectivo hay ahora?" type="number" prefix="$"
          value={contado} onChange={e => { setContado(e.target.value); setCerrado(false) }} placeholder="0"
        />
        {diferencia !== null && (
          <div style={{
            borderRadius: 8, padding: '12px 16px', textAlign: 'center',
            background: Math.abs(diferencia) < 100 ? C.verde + '22' : diferencia > 0 ? C.azul + '22' : C.rojo + '22',
          }}>
            <div style={{ fontSize: 12, color: C.topo, marginBottom: 4 }}>Diferencia</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: Math.abs(diferencia) < 100 ? C.verde : diferencia > 0 ? C.azul : C.rojo }}>
              {diferencia > 0 ? '+' : ''}{fmt(diferencia)}
            </div>
            <div style={{ fontSize: 12, marginTop: 4, color: C.topo }}>
              {Math.abs(diferencia) < 100
                ? '✓ La caja cierra bien'
                : diferencia > 0 ? '↑ Hay más efectivo del esperado'
                : '↓ Falta efectivo en la caja'}
            </div>
          </div>
        )}
      </Card>

      <Btn full bg={cerrado ? C.oliva : C.negro} color="white" onClick={() => { if (contado) setCerrado(true) }}>
        {cerrado ? '✓ Cierre registrado' : 'Cerrar caja del día'}
      </Btn>
      {cerrado && (
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 12, color: C.topo }}>
          Efectivo contado: {fmt(parseFloat(contado))} · Diferencia: {fmt(diferencia)}
        </div>
      )}
    </div>
  )
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function CajaApp() {
  const [movements,   setMovements]   = useState([])
  const [cajaInicial, setCajaInicial] = useState({})
  const [ready,       setReady]       = useState(false)
  const [view,        setView]        = useState('dashboard')

  const todayDate = isoToday()

  useEffect(() => {
    setMovements(load('dabiens_caja_movs', []))
    setCajaInicial(load('dabiens_caja_inicial', {}))
    setReady(true)
  }, [])

  const addMovement = (mov) => {
    const updated = [...movements, mov]
    setMovements(updated)
    save('dabiens_caja_movs', updated)
    setView('dashboard')
  }

  const deleteMovement = (id) => {
    const updated = movements.filter(m => m.id !== id)
    setMovements(updated)
    save('dabiens_caja_movs', updated)
  }

  const setFondoInicial = (date, monto) => {
    const updated = { ...cajaInicial, [date]: monto }
    setCajaInicial(updated)
    save('dabiens_caja_inicial', updated)
  }

  const NAV = [
    { id: 'dashboard', label: 'Inicio',    emoji: '🏠' },
    { id: 'nuevo',     label: 'Nuevo',     emoji: '＋' },
    { id: 'historial', label: 'Historial', emoji: '📋' },
    { id: 'arqueo',    label: 'Arqueo',    emoji: '🧾' },
  ]

  if (!ready) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.hueso, color: C.topo, fontSize: 14 }}>
      Cargando...
    </div>
  )

  return (
    <div style={{ fontFamily: 'var(--font-poppins), system-ui, sans-serif', background: C.hueso, minHeight: '100vh', maxWidth: 480, margin: '0 auto', position: 'relative' }}>
      {/* Top bar */}
      <div style={{ background: C.negro, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ color: C.arena, fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' }}>
            Dabien's & Co.
          </div>
          <div style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>Sistema de Caja</div>
        </div>
        <div style={{ color: C.topo, fontSize: 11 }}>
          {movements.filter(m => m.date === todayDate).length} mov. hoy
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 16px 90px' }}>
        {view === 'dashboard' && (
          <Dashboard movements={movements} cajaInicial={cajaInicial} todayDate={todayDate} onSetCajaInicial={setFondoInicial} />
        )}
        {view === 'nuevo' && (
          <NuevoMovimiento onSave={addMovement} todayDate={todayDate} />
        )}
        {view === 'historial' && (
          <Historial movements={movements} onDelete={deleteMovement} />
        )}
        {view === 'arqueo' && (
          <Arqueo movements={movements} cajaInicial={cajaInicial} todayDate={todayDate} />
        )}
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: 'white', borderTop: `1px solid ${C.hueso2}`, display: 'flex', zIndex: 20 }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setView(n.id)}
            style={{
              flex: 1, padding: '10px 4px 14px', border: 'none', cursor: 'pointer',
              background: 'transparent', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              borderTop: view === n.id ? `3px solid ${C.oliva}` : '3px solid transparent',
            }}>
            <span style={{
              fontSize: n.id === 'nuevo' ? 20 : 18,
              background: n.id === 'nuevo' ? C.negro : 'transparent',
              color: n.id === 'nuevo' ? 'white' : view === n.id ? C.oliva : C.topo,
              width: n.id === 'nuevo' ? 34 : 'auto', height: n.id === 'nuevo' ? 34 : 'auto',
              borderRadius: n.id === 'nuevo' ? '50%' : 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {n.emoji}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: view === n.id ? C.oliva : C.topo }}>
              {n.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
