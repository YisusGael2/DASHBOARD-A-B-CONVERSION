import { useEffect, useId, useRef, useState } from 'react';

const ROLE = { SUPER_ADMIN: 'Super Admin', ADMIN: 'Administrador', CLIENT: 'Cliente' };
const PROVIDERS = {
  shopify: { name: 'Shopify', letter: 'S', color: '#77a33b', description: 'Ventas, pedidos y rendimiento de tu tienda.', account: 'Dominio de Shopify', placeholder: 'mi-tienda.myshopify.com', secret: 'Token de acceso' },
  clarity: { name: 'Microsoft Clarity', letter: 'C', color: '#645de3', description: 'Sesiones y señales de comportamiento.', account: 'ID del proyecto', placeholder: 'ID de tu proyecto', secret: 'Token de la API de Clarity' },
  intelligems: { name: 'Intelligems', letter: 'i', color: '#ec7850', description: 'Experimentos, variantes y resultados A/B.', account: 'ID de la tienda / cuenta', placeholder: 'Identificador de la cuenta', secret: 'Clave de la API' },
};
const demoUsers = [
  { email: 'super@demo.local', title: 'Super Admin', detail: 'Gestiona la agencia' },
  { email: 'admin@demo.local', title: 'Administrador', detail: 'Consulta todas las tiendas' },
  { email: 'cliente@demo.local', title: 'Cliente', detail: 'Solo su propia tienda' },
  { email: 'otro@demo.local', title: 'Otro cliente', detail: 'Comprueba el aislamiento' },
];

function Icon({ name, size = 20, ...props }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    flask: <><path d="M9 3h6M10 3v6l-6 10a2 2 0 0 0 1.7 2h12.6a2 2 0 0 0 1.7-2L14 9V3M7 15h10" /></>,
    plug: <><path d="m8 3 4 4M15 2l4 4M5 8l7-7M3 10l7-7 7 7-7 7a5 5 0 0 1-7-7ZM10 17l-1 1a5 5 0 0 1-7 0" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    chevron: <path d="m9 5 7 7-7 7" />,
    down: <path d="m6 9 6 6 6-6" />,
    bag: <><path d="M5 7h14l2 14H3L5 7Z" /><path d="M9 7V6a3 3 0 0 1 6 0v1" /></>,
    chart: <><path d="M3 3v18h18M7 14l4-4 4 3 5-7" /></>,
    cursor: <path d="m4 3 7 18 3-7 7-3L4 3Z" />,
    eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    shield: <><path d="M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Z" /><path d="m8 12 3 3 5-6" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 12-2l2 2M4 17l2 2a7 7 0 0 0 12-2" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7h.01" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 5 9 7 9-7" /></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    dollar: <><path d="M12 2v20M17 5H9a4 4 0 0 0 0 8h6a3 3 0 0 1 0 6H6" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.grid}</svg>;
}

function Brand({ light = false }) {
  return <div className={`brand ${light ? 'brand-light' : ''}`}><span className="brand-mark"><i /><i /><i /></span><span>centraliza<span className="brand-dot">.</span></span></div>;
}

async function request(path, token, options = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Comprueba que el backend esté en marcha.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(typeof data.error === 'string' ? data.error : data.message || 'No se pudo completar la solicitud.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function number(value, maximumFractionDigits = 0) {
  if (value == null) return 'No disponible';
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits }).format(Number(value) || 0);
}
function money(value, currency = 'MXN', compact = false) {
  if (value == null) return 'No disponible';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0, ...(compact ? { notation: 'compact' } : {}) }).format(Number(value) || 0);
}
function percent(value, decimals = 1) {
  return value == null ? 'No disponible' : `${number(value, decimals)} %`;
}
function shortDate(date) {
  return date ? new Date(date.slice(0, 10) + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—';
}
function timeAgo(date) {
  if (!date) return 'Sin sincronizar';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  return minutes < 1 ? 'Hace un momento' : minutes < 60 ? `Hace ${minutes} min` : minutes < 1440 ? `Hace ${Math.floor(minutes / 60)} h` : shortDate(date);
}

/** Descarga filas UTF-8 sin convertir texto de proveedores en fórmulas de Excel. */
function downloadCsv(filename, headers, rows) {
  const escape = (value) => {
    if (value == null || (typeof value === 'number' && !Number.isFinite(value))) return '""';
    let cell = String(value);
    if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(cell)) cell = `'${cell}`;
    return `"${cell.replace(/"/g, '""')}"`;
  };
  const csv = '\uFEFF' + [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n') + '\r\n';
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link);
  link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function confidenceLabel(source) {
  return source === 'calculated' ? 'Confianza estimada (z)' : ['demo', 'sandbox'].includes(source) ? 'Confianza simulada' : 'Confianza del proveedor';
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [demoAvailable, setDemoAvailable] = useState(false);
  useEffect(() => { let active = true; request('/health', null).then(result => { if (active) setDemoAvailable(result.demoMode === true); }).catch(() => {}); return () => { active = false; }; }, []);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { onLogin(await request('/auth/login', null, { method: 'POST', body: JSON.stringify({ email, password }) })); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="login-page">
    <section className="login-story">
      <Brand light />
      <div className="login-story-body"><div className="eyebrow light-eyebrow"><span className="live-dot" /> TU E-COMMERCE, EN PERSPECTIVA</div><h1>Todos tus datos.<br />Una mejor<br /><span>decisión.</span></h1><p>Ventas, experimentos y comportamiento.<br />El panorama completo de cada tienda, en un solo lugar.</p>
        <div className="login-providers">{Object.values(PROVIDERS).map(provider => <span key={provider.name}><span className="provider-mini" style={{ background: provider.color }}>{provider.letter}</span>{provider.name}</span>)}</div>
        <div className="story-visual" aria-hidden="true"><div className="story-visual-label">UNA VISIÓN CONECTADA <Icon name="arrow" /></div><div className="story-bars">{[30, 48, 40, 67, 55, 74, 65, 83, 76, 92, 82, 100].map((height, i) => <span key={i} style={{ height: `${height}%` }} />)}</div><div className="story-visual-footer"><span>De los datos a la acción.</span><span>↗</span></div></div>
      </div>
      <div className="login-story-footer"><Icon name="shield" size={16} /> Un espacio privado para cada cliente.</div>
    </section>
    <main className="login-main"><div className="login-form-wrap"><span className="pill soft">DASHBOARD DE CENTRALIZACIÓN DE DATOS</span><h2>Qué bueno verte.</h2><p className="muted">Ingresa a tu espacio de trabajo.</p>
      <form onSubmit={submit} className="login-form"><label>Correo electrónico<div className="input-icon"><Icon name="mail" size={18} /><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" autoComplete="username" required /></div></label><label>Contraseña<div className="input-icon"><Icon name="lock" size={18} /><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Tu contraseña" autoComplete="current-password" required /></div></label>{error && <div role="alert" className="alert error"><Icon name="info" size={18} />{error}</div>}<button className="button primary login-submit" disabled={busy}>{busy ? 'Iniciando sesión…' : 'Entrar al dashboard'}<Icon name="chevron" size={18} /></button></form>
      {demoAvailable && <div className="demo-login"><div className="demo-login-title"><span className="pill demo">DEMO LOCAL</span><span>Explora cada nivel de acceso</span></div><div className="demo-users">{demoUsers.map(u => <button key={u.email} type="button" className={email === u.email ? 'selected' : ''} onClick={() => { setEmail(u.email); setPassword('Demo1234!'); setError(''); }}><span>{u.title}</span><small>{u.detail}</small><Icon name="arrow" size={16} /></button>)}</div><p>Datos de ejemplo para explorar los permisos. Contraseña: Demo1234!</p></div>}
      <div className="login-note"><Icon name="lock" size={14} /> Cada cliente accede únicamente a sus propios datos.</div>
    </div></main>
  </div>;
}

function Metric({ label, value, change, icon, description }) {
  return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className="metric-icon"><Icon name={icon} size={18} /></span></div><div className="metric-value">{value}</div><div className="metric-bottom">{change != null ? <span className={`delta ${change >= 0 ? 'positive' : 'negative'}`}><span>{change >= 0 ? '↗' : '↘'}</span> {percent(Math.abs(change))}</span> : <span className="muted">Sin comparación</span>}<span>{description || 'vs. período anterior'}</span></div></article>;
}

function RevenueChart({ daily, currency }) {
  const [hover, setHover] = useState(null);
  const gradientId = useId().replace(/:/g, '');
  if (!daily?.length) return <Empty icon="chart" title="Sin métricas todavía" text="Las métricas aparecerán después de una sincronización satisfactoria." />;
  const w = 820, h = 215, left = 60, right = 12, top = 14, bottom = 26;
  const max = Math.max(...daily.map(d => Number(d.revenue) || 0), 1) * 1.15;
  const x = i => left + i * (w - left - right) / Math.max(daily.length - 1, 1);
  const y = value => top + (1 - value / max) * (h - top - bottom);
  const points = daily.map((d, i) => `${x(i)},${y(d.revenue)}`).join(' ');
  const hovered = hover != null ? daily[hover] : null;
  return <div className="chart-wrap"><div className="chart-hover" aria-live="polite">{hovered ? <><strong>{shortDate(hovered.date)}</strong><span>{money(hovered.revenue, currency)} en ingresos · {number(hovered.orders)} pedidos</span></> : <><span>Ingresos diarios</span><strong className="chart-currency">{currency}</strong></>}</div><svg viewBox={`0 0 ${w} ${h}`} className="revenue-chart" role="img" aria-label={`Ingresos diarios del ${shortDate(daily[0].date)} al ${shortDate(daily.at(-1).date)}`} onMouseLeave={() => setHover(null)}><defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1b9f80" stopOpacity=".18" /><stop offset="100%" stopColor="#1b9f80" stopOpacity="0" /></linearGradient></defs>{[0, 1, 2, 3].map(i => { const value = max * (3 - i) / 3; return <g key={i}><line x1={left} y1={y(value)} x2={w - right} y2={y(value)} stroke="#e8eeec" strokeDasharray="4 5" /><text x={left - 12} y={y(value) + 4} textAnchor="end">{money(value, currency, true)}</text></g>; })}<polygon points={`${left},${h - bottom} ${points} ${x(daily.length - 1)},${h - bottom}`} fill={`url(#${gradientId})`} /><polyline points={points} fill="none" stroke="#148b72" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" />{daily.map((d, i) => <g key={d.date}>{(i === 0 || i === daily.length - 1 || i % Math.ceil(daily.length / 5) === 0) && <text x={x(i)} y={h - 3} textAnchor="middle">{shortDate(d.date)}</text>}<rect x={x(i) - (w - left) / daily.length / 2} y="0" width={(w - left) / daily.length} height={h - bottom} fill="transparent" onMouseEnter={() => setHover(i)} />{hover === i && <><line x1={x(i)} x2={x(i)} y1={top} y2={h - bottom} stroke="#98cbbc" strokeDasharray="4 4" /><circle cx={x(i)} cy={y(d.revenue)} r="5" fill="#148b72" stroke="white" strokeWidth="3" /></>}</g>)}</svg></div>;
}

function Empty({ icon = 'grid', title, text }) {
  return <div className="empty"><span className="empty-icon"><Icon name={icon} size={25} /></span><h3>{title}</h3><p>{text}</p></div>;
}

function Experiment({ experiment, currency, detailed = false }) {
  const done = ['completed', 'ended', 'finished'].includes(experiment.status);
  const maxRate = Math.max(...(experiment.variants || []).map(v => Number(v.conversionRate) || 0), 1);
  return <article className={`experiment ${detailed ? 'experiment-detailed' : ''}`}>
    <div className="experiment-head"><span className="experiment-icon"><Icon name="flask" size={19} /></span><div><h3>{experiment.name}</h3><p>Intelligems{experiment.sandbox ? ' · Sandbox' : ''} · Desde {shortDate(experiment.startedAt)}{experiment.endedAt ? ` hasta ${shortDate(experiment.endedAt)}` : ''}</p></div><span className={`pill ${done || experiment.status === 'draft' ? 'neutral' : 'active'}`}><span className="live-dot" />{done ? 'Finalizada' : experiment.status === 'draft' ? 'Borrador' : 'En curso'}</span></div>
    <div className="variant-list">{(experiment.variants || []).map((v, i) => <div key={v.id || i} className="variant">
      <div className="variant-label"><span><span className={`variant-dot variant-${i % 3}`} />{v.name}{v.isControl && <small>Control</small>}</span><div className="variant-rate"><strong>{percent(v.conversionRate)}</strong>{!v.isControl && v.lift != null && <span className={`variant-lift ${v.lift < 0 ? 'negative' : 'positive'}`}>{v.lift >= 0 ? '+' : ''}{percent(v.lift)} vs control</span>}</div></div>
      <div className="variant-track"><span className={`variant-fill variant-${i % 3}`} style={{ width: `${Math.min(100, Number(v.conversionRate || 0) / maxRate * 85)}%` }} /></div>
      {detailed && <div className="variant-detail"><span>{number(v.visitors)} visitantes</span><span>{number(v.conversions)} conversiones</span><span>{money(v.revenue, currency)} ingresos</span>{!v.isControl && v.calculatedConfidence != null && <span>Confianza estimada (z): {percent(v.calculatedConfidence)}</span>}</div>}
    </div>)}</div>
    <div className="experiment-footer"><span><Icon name="users" size={15} /> {number(experiment.visitors)} visitantes</span><span>{experiment.confidence == null ? 'Confianza no disponible' : `${confidenceLabel(experiment.confidenceSource)}: ${percent(experiment.confidence)}`}</span></div>
    {detailed && <p className="experiment-disclaimer"><Icon name="info" size={14} /> La confianza estimada usa una prueba z bilateral entre proporciones. No representa la probabilidad de ganar ni declara una variante ganadora.</p>}
  </article>;
}

function Overview({ data, navigate }) {
  const { summary = {}, daily = [], experiments = [], behavior = {}, store } = data;
  const currency = store.currency || 'MXN';
  const shopifySandbox = data.integrations?.find(item => item.provider === 'shopify')?.sandbox === true;
  function exportDaily() {
    downloadCsv(`centraliza-metricas-${store.domain}-${data.periodDays || 14}d.csv`,
      ['Fecha', 'Ingresos', 'Pedidos', 'Sesiones', 'Moneda', 'Fuente'],
      daily.map(row => [row.date, row.revenue, row.orders, row.sessions, currency, data.mode === 'demo' ? 'Demo' : shopifySandbox ? 'Sandbox' : 'Shopify']));
  }
  return <><div className="metrics-grid"><Metric label="Ingresos" value={money(summary.revenue, currency)} change={summary.revenueChange} icon="dollar" /><Metric label="Pedidos" value={number(summary.orders)} change={summary.ordersChange} icon="bag" /><Metric label="Tasa de conversión" value={percent(summary.conversionRate)} change={summary.conversionChange} icon="cursor" /><Metric label="Sesiones" value={summary.sessionCount == null ? 'No disponible' : number(summary.sessionCount)} change={summary.sessionChange} icon="eye" /></div>
    <section className="panel revenue-panel"><div className="panel-heading"><div><h2>El pulso de tu tienda</h2><p>Ingresos a lo largo del período</p></div><div className="panel-actions"><span className="source-label"><span className="provider-mini shopify-mini">S</span> Shopify{shopifySandbox ? ' · Sandbox' : data.mode === 'demo' ? ' · Demo' : ''}</span><button type="button" className="button secondary export-button" onClick={exportDaily} disabled={!daily.length}><Icon name="download" size={15} />Exportar CSV</button></div></div><RevenueChart daily={daily} currency={currency} /><p className="revenue-definition">{summary.revenueDefinition || 'Ingresos: total actual de los pedidos, con sus ajustes. No representan utilidad.'}</p></section>
    <div className="overview-bottom"><section className="panel experiments-panel"><div className="panel-heading"><div><h2>Aprende. Prueba. Mejora.</h2><p>Tus experimentos A/B, en perspectiva</p></div><button className="text-button" onClick={() => navigate('experiments')}>Ver pruebas <Icon name="chevron" size={16} /></button></div><div className="experiment-stack">{experiments.length ? experiments.slice(0, 2).map(e => <Experiment key={e.id} experiment={e} currency={currency} />) : <Empty icon="flask" title="Sin experimentos" text="Los experimentos disponibles aparecerán aquí." />}</div></section><section className="panel behavior-panel"><div className="panel-heading"><div><h2>Más allá de los clics</h2><p>{behavior.windowDays ? `Instantánea de ${behavior.windowDays} días${behavior.sandbox ? ' · Sandbox' : ''}` : 'Comportamiento de tus visitantes'}</p></div><span className="provider-mini clarity-mini">C</span></div>{[behavior.sessions, behavior.deadClicks, behavior.rageClicks, behavior.quickBacks, behavior.scrollDepth].every(value => value == null) ? <Empty icon="cursor" title="Sin datos de Clarity" text="Conecta y sincroniza un proyecto para consultar comportamiento." /> : <><div className="behavior-sessions"><span>Sesiones analizadas</span><strong>{number(behavior.sessions)}</strong><div className="behavior-decoration" aria-hidden="true">{[12, 24, 17, 29, 23, 36, 26, 39, 32, 45, 33, 43].map((h, i) => <i key={i} style={{ height: h }} />)}</div></div><div className="behavior-stats">{[{ label: 'Clics muertos', value: behavior.deadClicks, color: 'amber' }, { label: 'Clics de frustración', value: behavior.rageClicks, color: 'rose' }, { label: 'Regresos rápidos', value: behavior.quickBacks, color: 'blue' }, { label: 'Profundidad de scroll', value: behavior.scrollDepth, color: 'green', percentage: true }].map(item => <div key={item.label}><span><i className={`stat-dot ${item.color}`} />{item.label}</span><strong>{item.percentage ? percent(item.value, 1) : number(item.value)}</strong></div>)}</div><p className="behavior-note"><Icon name="info" size={15} /> {behavior.sandbox ? 'Comportamiento simulado en Sandbox. ' : ''}Datos generales de la tienda. No atribuidos a variantes A/B.</p></>}</section></div>
  </>;
}

function ExperimentsPage({ data }) {
  const [filter, setFilter] = useState('all');
  const experiments = data.experiments || [];
  const shown = experiments.filter(e => filter === 'all' || (filter === 'active' ? !['completed', 'ended', 'finished'].includes(e.status) : ['completed', 'ended', 'finished'].includes(e.status)));
  function exportExperiments() {
    downloadCsv(`centraliza-experimentos-${data.store.domain}.csv`,
      ['Experimento', 'Estado', 'Inicio', 'Fin', 'Variante', 'Control', 'Visitantes', 'Conversiones', 'Ingresos', 'Moneda', 'Tasa de conversión (%)', 'Lift vs control (%)', 'Confianza del experimento (%)', 'Origen de confianza', 'Confianza estimada z (%)', 'Fuente'],
      experiments.flatMap(experiment => (experiment.variants || []).map(variant => [experiment.name, experiment.status, experiment.startedAt, experiment.endedAt, variant.name, variant.isControl ? 'Sí' : 'No', variant.visitors, variant.conversions, variant.revenue, data.store.currency, variant.conversionRate, variant.lift, experiment.confidence, experiment.confidence == null ? '' : confidenceLabel(experiment.confidenceSource), variant.calculatedConfidence, experiment.sandbox ? 'Sandbox' : data.mode === 'demo' ? 'Demo' : 'Intelligems'])));
  }
  return <><div className="section-toolbar"><div className="segmented" aria-label="Filtrar experimentos">{[['all', 'Todas'], ['active', 'En curso'], ['completed', 'Finalizadas']].map(([value, label]) => <button key={value} aria-pressed={filter === value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div><div className="section-actions"><span className="muted">{experiments.length} experimento{experiments.length !== 1 ? 's' : ''}</span><button type="button" className="button secondary export-button" disabled={!experiments.some(experiment => experiment.variants?.length)} onClick={exportExperiments}><Icon name="download" size={15} />Exportar CSV</button></div></div>{shown.length ? <div className="experiments-grid">{shown.map(experiment => <Experiment key={experiment.id} experiment={experiment} currency={data.store.currency} detailed />)}</div> : <section className="panel"><Empty icon="flask" title="Sin pruebas en esta vista" text="Selecciona otra vista o sincroniza Intelligems para consultar tus experimentos." /></section>}<div className="explanation-card"><Icon name="info" size={20} /><div><strong>Resultados con contexto</strong><p>Los experimentos muestran su último resultado acumulado y su propio intervalo de medición. El selector de días del resumen se aplica a ventas y a las muestras demo de Clarity. La confianza puede venir del proveedor o de una prueba z bilateral: compara proporciones bajo el supuesto de visitantes independientes y una conversión por visitante. Una tasa mayor no implica un resultado concluyente.</p></div></div></>;
}

function Modal({ title, onClose, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previousFocus = document.activeElement;
    dialog.current?.querySelector('input,select,button')?.focus();
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const controls = [...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')];
        const first = controls[0], last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); if (previousFocus?.isConnected) previousFocus.focus(); };
  }, [onClose]);
  return <div className="modal-backdrop" onClick={onClose}><section ref={dialog} className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" aria-label="Cerrar" onClick={onClose}><Icon name="close" /></button></div>{children}</section></div>;
}

function ConnectForm({ provider, store, token, onDone, onClose }) {
  const spec = PROVIDERS[provider];
  const [account, setAccount] = useState('');
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      await request(`/integrations/${provider}/connect`, token, { method: 'POST', body: JSON.stringify({ storeId: store.id, externalAccountId: account, [provider === 'shopify' ? 'accessToken' : 'apiKey']: secret }) });
      onDone(`${spec.name}: configuración guardada. Consulta el estado de la integración antes de sincronizar.`); onClose();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  function useSandbox() {
    setAccount(provider === 'shopify' ? store.domain : `sandbox-${provider}-${store.id}`);
    setSecret(`mock_${provider}_sandbox_token`); setError('');
  }
  return <Modal title={`Configurar ${spec.name}`} onClose={onClose}><p className="muted modal-copy">Usa una credencial de la cuenta correspondiente a esta tienda o prueba el flujo completo con datos simulados en Sandbox.</p><form className="stack-form" onSubmit={submit}><div className="sandbox-help"><button className="button secondary" type="button" onClick={useSandbox} disabled={busy}>Usar credencial Sandbox (mock_)</button><p>Rellena una credencial de prueba. Al guardar y sincronizar se importan datos simulados sin consultar cuentas externas.</p></div><label>{spec.account}<input value={account} onChange={e => setAccount(e.target.value)} placeholder={spec.placeholder} required autoComplete="off" /></label><label>{spec.secret}<input type="password" value={secret} onChange={e => setSecret(e.target.value)} required autoComplete="off" placeholder="Credencial de la integración" /></label><p className="form-note"><Icon name="lock" size={15} /> Las credenciales no se muestran en el dashboard.</p>{error && <div className="alert error" role="alert">{error}</div>}<div className="modal-actions"><button className="button secondary" type="button" onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar configuración'}</button></div></form></Modal>;
}

function IntegrationsPage({ data, token, user, refresh, notify, syncError, onSyncError }) {
  const [connecting, setConnecting] = useState(null);
  const [syncing, setSyncing] = useState(null);
  const [syncRuns, setSyncRuns] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [historyRevision, setHistoryRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setHistoryLoading(true); setHistoryError(''); setSyncRuns([]);
    request(`/sync-runs?storeId=${encodeURIComponent(data.store.id)}`, token)
      .then(result => { if (active) setSyncRuns(result.syncRuns || []); })
      .catch(err => { if (active) setHistoryError(err.message); })
      .finally(() => { if (active) setHistoryLoading(false); });
    return () => { active = false; };
  }, [token, data.store.id, historyRevision]);
  async function sync(provider) {
    onSyncError(''); setSyncing(provider);
    try { const result = await request(`/integrations/${provider}/sync`, token, { method: 'POST', body: JSON.stringify({ storeId: data.store.id }) }); notify(result.message || 'Sincronización completada.'); }
    catch (err) { onSyncError(err.message); }
    finally { setSyncing(null); setHistoryRevision(previous => previous + 1); refresh(); }
  }
  const canManage = user.role !== 'CLIENT';
  return <>{syncError && <div className="alert error" role="alert"><Icon name="info" size={18} />{syncError}</div>}<div className="integrations-grid">{Object.entries(PROVIDERS).map(([provider, spec]) => {
    const integration = (data.integrations || []).find(i => i.provider.toLowerCase() === provider);
    const status = integration?.status;
    const isDemo = data.mode === 'demo' || status === 'demo';
    const connected = ['connected', 'active'].includes(status);
    const label = isDemo ? 'Datos demo' : status === 'credential_saved' ? 'Credencial guardada' : connected && integration?.lastSyncedAt ? 'Sincronizada' : connected ? 'Lista para sincronizar' : status === 'error' ? 'Requiere atención' : status === 'pending' ? 'Pendiente' : 'Sin conectar';
    const canSync = ['credential_saved', 'connected', 'error'].includes(status);
    return <article className="panel integration-card" key={provider}><div className="integration-top"><span className="provider-logo" style={{ background: `${spec.color}15`, color: spec.color }}>{spec.letter}</span><span className={`pill ${isDemo ? 'demo' : integration?.sandbox ? 'sandbox' : connected ? 'active' : 'neutral'}`}>{integration?.sandbox && !isDemo ? `Sandbox · ${label.toLowerCase()}` : label}</span></div><h2>{spec.name}</h2><p>{spec.description}</p><dl><div><dt>Cuenta</dt><dd>{integration?.externalAccountId || 'Sin configurar'}</dd></div><div><dt>Última sincronización</dt><dd>{isDemo ? 'Datos de ejemplo' : timeAgo(integration?.lastSyncedAt)}</dd></div></dl>{canManage ? <div className="integration-actions"><button className="button secondary" onClick={() => setConnecting(provider)} disabled={syncing !== null}>Configurar</button><button className="button small-icon" disabled={syncing !== null || !canSync} onClick={() => sync(provider)}><Icon name="refresh" size={16} className={syncing === provider ? 'spin' : ''} />{syncing === provider ? 'Sincronizando…' : 'Sincronizar'}</button></div> : <div className="client-integration-note"><Icon name="lock" size={14} /> Tu agencia gestiona esta integración.</div>}</article>;
  })}</div>
    <section className="panel team-panel sync-history"><div className="panel-heading"><div><h2>Historial de sincronizaciones</h2><p>Las últimas 25 ejecuciones de esta tienda.</p></div><button type="button" className="text-button" onClick={() => setHistoryRevision(previous => previous + 1)} disabled={historyLoading}><Icon name="refresh" size={15} />Actualizar</button></div>
      {historyError ? <div className="alert error history-error" role="alert">{historyError}</div> : historyLoading ? <Loading text="Cargando sincronizaciones…" /> : syncRuns.length ? <div className="table-scroll"><table><thead><tr><th>Proveedor</th><th>Estado</th><th>Fecha / hora</th><th>Filas procesadas</th><th>Diagnóstico / error</th></tr></thead><tbody>{syncRuns.map(run => <tr key={run.id}><td>{PROVIDERS[run.provider]?.name || 'Proveedor'}</td><td><span className={`pill ${run.status === 'completed' ? 'active' : run.status === 'running' ? 'soft' : 'failed'}`}>{run.status === 'completed' ? 'Completada' : run.status === 'running' ? 'En curso' : 'Fallida'}</span></td><td title={run.startedAt ? new Date(run.startedAt).toLocaleString('es-MX') : undefined}>{timeAgo(run.startedAt)}</td><td>{number(run.recordsProcessed)}</td><td className="diagnostic-cell">{run.error || (run.status === 'completed' ? 'Sin errores' : run.status === 'running' ? 'Sincronización en proceso' : 'No se pudo completar la sincronización.')}</td></tr>)}</tbody></table></div> : <Empty icon="refresh" title="Sin sincronizaciones todavía" text="Guarda una credencial y sincroniza un proveedor para registrar la primera ejecución." />}
    </section>
    <div className="explanation-card"><Icon name="shield" size={22} /><div><strong>Una conexión independiente para cada tienda</strong><p>Los datos y las credenciales pertenecen a la tienda seleccionada. La disponibilidad de métricas depende de los permisos, el plan y las capacidades de cada proveedor. Sandbox permite probar este mismo flujo con datos simulados.</p></div></div>{connecting && <ConnectForm provider={connecting} store={data.store} token={token} onClose={() => setConnecting(null)} onDone={message => { notify(message); refresh(); }} />}</>;
}

function UserForm({ token, user, stores, onDone, onClose }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CLIENT', storeId: stores[0]?.id || '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await request('/users', token, { method: 'POST', body: JSON.stringify({ ...form, storeId: form.role === 'CLIENT' ? form.storeId : null }) }); onDone(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <Modal title="Invitar a tu espacio" onClose={onClose}><p className="muted modal-copy">Crea un acceso con permisos específicos. Los clientes siempre se asignan a una tienda.</p><form className="stack-form" onSubmit={submit}><label>Nombre completo<input value={form.name} onChange={e => update('name', e.target.value)} required placeholder="Nombre y apellido" /></label><label>Correo electrónico<input type="email" value={form.email} onChange={e => update('email', e.target.value)} required placeholder="persona@correo.com" autoComplete="off" /></label><label>Contraseña inicial<input type="password" value={form.password} onChange={e => update('password', e.target.value)} minLength={10} required placeholder="Mínimo 10 caracteres" autoComplete="new-password" /></label><div className="form-row"><label>Rol<select value={form.role} onChange={e => update('role', e.target.value)}><option value="CLIENT">Cliente</option>{user.role === 'SUPER_ADMIN' && <><option value="ADMIN">Administrador</option><option value="SUPER_ADMIN">Super Admin</option></>}</select></label>{form.role === 'CLIENT' && <label>Tienda<select value={form.storeId} onChange={e => update('storeId', e.target.value)} required><option value="" disabled>Selecciona una tienda</option>{stores.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select></label>}</div>{error && <div role="alert" className="alert error">{error}</div>}<div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{busy ? 'Creando acceso…' : 'Crear acceso'}</button></div></form></Modal>;
}

function TeamPage({ token, user, stores, notify }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [auditEvents, setAuditEvents] = useState([]);
  const [auditError, setAuditError] = useState('');
  const [revision, setRevision] = useState(0);
  const auditActions = { 'user.created': 'Acceso creado', 'store.created': 'Tienda creada', 'integration.connected': 'Credencial guardada', 'integration.synced': 'Integración sincronizada' };
  function load() { setRevision(previous => previous + 1); }
  useEffect(() => {
    if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return;
    let active = true;
    setLoading(true); setError(''); setAuditError('');
    Promise.allSettled([request('/users', token), request('/audit-events', token)]).then(([people, audit]) => {
      if (!active) return;
      if (people.status === 'fulfilled') setUsers(people.value.users || []); else setError(people.reason.message);
      if (audit.status === 'fulfilled') setAuditEvents(audit.value.auditEvents || []); else setAuditError(audit.reason.message);
      setLoading(false);
    });
    return () => { active = false; };
  }, [token, user.role, revision]);
  if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) return null;
  return <><div className="section-toolbar"><p className="muted">{user.role === 'SUPER_ADMIN' ? 'Administra el acceso de empleados y clientes.' : 'Administra los accesos de clientes de la agencia.'}</p><button className="button primary" onClick={() => setShowForm(true)}><Icon name="plus" size={17} /> Crear acceso</button></div>{error && <div className="alert error" role="alert">{error}<button className="text-button" onClick={load}>Reintentar</button></div>}<section className="panel team-panel">{loading ? <Loading text="Cargando accesos…" /> : users.length ? <div className="table-scroll"><table><thead><tr><th>Persona</th><th>Rol</th><th>Tienda / alcance</th><th>Estado</th></tr></thead><tbody>{users.map(member => <tr key={member.id}><td><div className="table-person"><span className="avatar">{initials(member.name)}</span><div><strong>{member.name}</strong><small>{member.email}</small></div></div></td><td><span className={`pill ${member.role === 'SUPER_ADMIN' ? 'purple' : member.role === 'ADMIN' ? 'soft' : 'neutral'}`}>{ROLE[member.role]}</span></td><td>{member.role !== 'CLIENT' ? 'Todas las tiendas' : stores.find(s => s.id === member.storeId)?.name || 'Tienda asignada'}</td><td><span className={`status-text ${member.status === 'disabled' || member.status === 'inactive' ? '' : 'green'}`}><span className="live-dot" />{member.status === 'disabled' || member.status === 'inactive' ? 'Inactivo' : 'Activo'}</span></td></tr>)}</tbody></table></div> : <Empty icon="users" title="Sin accesos para mostrar" text="Crea un acceso para empezar." />}</section>
    <section className="panel team-panel audit-panel"><div className="panel-heading"><div><h2>Registro de auditoría</h2><p>Los últimos 50 eventos de la agencia. Visible para empleados.</p></div><button type="button" className="text-button" onClick={load} disabled={loading}><Icon name="refresh" size={15} />Actualizar</button></div>{auditError ? <div className="alert error history-error" role="alert">{auditError}</div> : loading ? <Loading text="Cargando auditoría…" /> : auditEvents.length ? <div className="table-scroll"><table><thead><tr><th>Acción</th><th>Actor</th><th>Tienda</th><th>Fecha</th></tr></thead><tbody>{auditEvents.map(event => <tr key={event.id}><td><strong className="audit-action">{auditActions[event.action] || 'Evento registrado'}</strong><small className="audit-action-code">{event.action}</small></td><td>{event.actorEmail || 'Usuario no disponible'}</td><td>{event.storeName || (event.storeId ? 'Tienda no disponible' : 'Agencia')}</td><td title={event.createdAt ? new Date(event.createdAt).toLocaleString('es-MX') : undefined}>{timeAgo(event.createdAt)}</td></tr>)}</tbody></table></div> : <Empty icon="shield" title="Sin eventos registrados" text="Las altas de accesos, tiendas y cambios de integraciones aparecerán aquí." />}</section>
    <div className="explanation-card"><Icon name="shield" size={22} /><div><strong>El acceso correcto para cada persona</strong><p>Los clientes consultan exclusivamente su tienda. Los administradores pueden gestionar todas las tiendas. Solo el Super Admin administra los roles del personal.</p></div></div>{showForm && <UserForm token={token} user={user} stores={stores} onClose={() => setShowForm(false)} onDone={() => { setShowForm(false); load(); notify('Acceso creado correctamente.'); }} />}</>;
}

function initials(name) { return (name || 'Usuario').split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase(); }
function Loading({ text = 'Preparando tus datos…' }) { return <div className="loading"><span className="loader" /><span>{text}</span></div>; }

function StoreForm({ token, onDone, onClose }) {
  const [form, setForm] = useState({ name: '', domain: '', currency: 'MXN', timeZone: 'America/Mexico_City' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { const result = await request('/stores', token, { method: 'POST', body: JSON.stringify(form) }); await onDone(result.store); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return <Modal title="Añadir una tienda" onClose={onClose}><p className="muted modal-copy">Crea el espacio de tu cliente. Después podrás configurar sus integraciones y accesos.</p><form className="stack-form" onSubmit={submit}><label>Nombre de la tienda<input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Nombre del e-commerce" required /></label><label>Dominio de Shopify<input value={form.domain} onChange={e => update('domain', e.target.value)} placeholder="mi-tienda.myshopify.com" pattern="[A-Za-z0-9][A-Za-z0-9\-]*\.myshopify\.com" title="Usa el dominio original de Shopify, por ejemplo mi-tienda.myshopify.com" required /></label><div className="form-row"><label>Moneda<select value={form.currency} onChange={e => update('currency', e.target.value)}>{['MXN', 'USD', 'EUR', 'COP', 'ARS', 'CLP', 'PEN', 'CAD', 'GBP'].map(currency => <option key={currency}>{currency}</option>)}</select></label><label>Zona horaria<input value={form.timeZone} onChange={e => update('timeZone', e.target.value)} placeholder="America/Mexico_City" required /></label></div><p className="form-note"><Icon name="info" size={15} /> Usa la moneda y zona horaria configuradas en Shopify.</p>{error && <div className="alert error" role="alert">{error}</div>}<div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button className="button primary" disabled={busy}>{busy ? 'Creando tienda…' : 'Crear tienda'}</button></div></form></Modal>;
}

const pages = {
  overview: { label: 'Resumen', icon: 'grid', title: 'El panorama completo.', subtitle: 'Todo lo que necesitas saber sobre tu tienda, en un solo lugar.' },
  experiments: { label: 'Pruebas A/B', icon: 'flask', title: 'Cada prueba, un aprendizaje.', subtitle: 'Compara variantes y entiende cómo evoluciona cada experimento.' },
  integrations: { label: 'Integraciones', icon: 'plug', title: 'Conecta los puntos.', subtitle: 'Tus herramientas favoritas, trabajando en el mismo lugar.' },
  team: { label: 'Equipo y accesos', icon: 'users', title: 'Un espacio para tu equipo.', subtitle: 'Controla quién entra y qué puede ver en el dashboard.' },
};

function Workspace({ token, user, onLogout }) {
  const [page, setPage] = useState('overview');
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(user.storeId || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [periodDays, setPeriodDays] = useState(14);
  const [notice, setNotice] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [storesReady, setStoresReady] = useState(false);
  const [storesRevision, setStoresRevision] = useState(0);
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [integrationErrors, setIntegrationErrors] = useState({});
  useEffect(() => {
    let cancelled = false;
    request('/stores', token).then(result => { if (!cancelled) { const found = result.stores || []; setStores(found); setStoreId(previous => previous || found[0]?.id || ''); setStoresReady(true); } }).catch(err => { if (!cancelled) { if (err.status === 401) onLogout(); else { setError(err.message); setLoading(false); } } });
    return () => { cancelled = true; };
  }, [token, storesRevision]);
  useEffect(() => {
    if (!storesReady) return;
    if (!storeId) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true); setError(''); setData(null);
    request(`/dashboard?storeId=${encodeURIComponent(storeId)}&days=${periodDays}`, token).then(result => { if (!cancelled) setData(result); }).catch(err => { if (!cancelled) { if (err.status === 401) onLogout(); else setError(err.message); } }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token, storeId, revision, storesReady, periodDays]);
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(id); }, [notice]);
  function navigate(next) { setPage(next); setMobileOpen(false); }
  async function storeCreated(created) {
    const result = await request('/stores', token);
    const available = result.stores || [];
    setStores(available); setStoresReady(true);
    setStoreId(created?.id || available.at(-1)?.id || '');
    setShowStoreForm(false); setNotice('Tienda creada. Configura sus integraciones para empezar.');
  }
  const store = stores.find(s => s.id === storeId) || data?.store;
  const meta = pages[page];
  const visiblePages = Object.entries(pages).filter(([key]) => key !== 'team' || user.role !== 'CLIENT');
  const period = data?.daily?.length ? `${shortDate(data.daily[0].date)} — ${shortDate(data.daily.at(-1).date)}` : 'Período disponible';
  return <div className="workspace">
    {mobileOpen && <button className="sidebar-overlay" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}><Brand light /><div className="workspace-tag"><span className="workspace-symbol">A</span><div><strong>Tu agencia</strong><small>Workspace de e-commerce</small></div></div><div className="nav-label">ESPACIO DE TRABAJO</div><nav aria-label="Navegación principal">{visiblePages.map(([key, item]) => <button key={key} className={`nav-item ${page === key ? 'active' : ''}`} onClick={() => navigate(key)}><Icon name={item.icon} size={19} /><span>{item.label}</span>{page === key && <span className="nav-dot" />}</button>)}</nav>{user.role !== 'CLIENT' && <button className="add-store-button" onClick={() => setShowStoreForm(true)}><Icon name="plus" size={16} /> Añadir tienda</button>}<div className="sidebar-insight"><span className="sidebar-insight-icon"><Icon name="chart" size={24} /></span><strong>Menos pestañas.<br />Más perspectiva.</strong><p>Las herramientas que usas.<br />Los datos que importan.</p><div>{Object.values(PROVIDERS).map(p => <span key={p.name} style={{ background: p.color }}>{p.letter}</span>)}</div></div><div className="sidebar-bottom"><div className="sidebar-private"><Icon name="shield" size={15} /> Acceso seguro por tienda</div><div className="user-profile"><span className="avatar">{initials(user.name)}</span><div><strong>{user.name}</strong><small>{ROLE[user.role]}</small></div></div></div></aside>
    <div className="workspace-body"><header className="topbar"><div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menú"><Icon name="menu" /></button><span className="breadcrumb">Workspace <Icon name="chevron" size={13} /> <strong>{meta.label}</strong></span></div><div className="topbar-right"><span className="role-chip"><Icon name="shield" size={14} />{ROLE[user.role]}</span><button type="button" className="session-button" onClick={onLogout} title="Cerrar sesión" aria-label="Cerrar sesión"><Icon name="logout" size={17} /><span>Cerrar sesión</span></button><span className="avatar topbar-avatar">{initials(user.name)}</span></div></header>
      <main className="main-content">{data?.mode === 'demo' && <div className="demo-banner"><span className="pill demo">DEMO</span><span>Estás explorando datos de ejemplo. Las APIs todavía no están conectadas.</span><Icon name="info" size={16} /></div>}{data?.sandbox && <div className="sandbox-banner"><span className="pill sandbox">SANDBOX</span><span>Hay integraciones con datos simulados. Las tarjetas identifican los proveedores que usan Sandbox.</span><Icon name="info" size={16} /></div>}<div className="page-heading"><div><div className="eyebrow">DASHBOARD DE CENTRALIZACIÓN DE DATOS</div><h1>{meta.title}</h1><p>{meta.subtitle}</p></div>{page !== 'team' && <div className="store-picker"><span className="store-icon"><Icon name="bag" size={20} /></span>{user.role === 'CLIENT' ? <div><small>TU TIENDA</small><strong>{store?.name || 'Tu tienda'}</strong></div> : <label><small>TIENDA SELECCIONADA</small><span className="store-select-control"><select aria-label="Seleccionar tienda" value={storeId} onChange={e => setStoreId(e.target.value)}>{stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}{!stores.length && <option value="">Sin tiendas</option>}</select><Icon name="down" size={16} /></span></label>}</div>}</div>
        {page === 'overview' && <div className="overview-toolbar"><div className="store-domain"><span className="live-dot" /><span>{store?.domain || 'Tu e-commerce'}</span>{store?.currency && <span className="currency-tag">{store.currency}</span>}</div><div className="overview-period"><div className="segmented period-selector" role="group" aria-label="Período del dashboard">{[7, 14, 28].map(days => <button type="button" key={days} className={periodDays === days ? 'selected' : ''} aria-pressed={periodDays === days} onClick={() => setPeriodDays(days)}>{days}D</button>)}</div><div className="date-range"><Icon name="calendar" size={15} />{period}<span className="date-caption">{data?.daily?.length || 0} días disponibles</span></div></div></div>}
        {page === 'team' ? <TeamPage token={token} user={user} stores={stores} notify={setNotice} /> : loading ? <section className="panel"><Loading /></section> : error ? <section className="panel"><Empty icon="info" title="No pudimos cargar estos datos" text={error} /><button className="button primary retry-button" onClick={() => { setRevision(n => n + 1); if (!storesReady) setStoresRevision(n => n + 1); }}>Reintentar</button></section> : !data ? <section className="panel"><Empty icon="bag" title="Tu espacio está listo" text="Todavía no hay una tienda disponible. Pide a tu administrador que configure tu acceso." /></section> : page === 'overview' ? <Overview data={data} navigate={navigate} /> : page === 'experiments' ? <ExperimentsPage data={data} /> : <IntegrationsPage data={data} token={token} user={user} refresh={() => setRevision(n => n + 1)} notify={setNotice} syncError={integrationErrors[data.store.id] || ''} onSyncError={message => setIntegrationErrors(previous => ({ ...previous, [data.store.id]: message }))} />}
        <footer className="content-footer"><span>Una visión conectada de tu e-commerce.</span><span>{data?.mode === 'demo' ? 'Datos de demostración' : data?.sandbox ? 'Incluye datos simulados de Sandbox' : data?.updatedAt ? `Actualizado ${timeAgo(data.updatedAt).toLowerCase()}` : 'Centraliza'}<span className="footer-dot">·</span>{store?.timeZone || 'Acceso privado'}</span></footer>
      </main>
    </div>{showStoreForm && <StoreForm token={token} onDone={storeCreated} onClose={() => setShowStoreForm(false)} />}{notice && <div className="toast" role="status"><span><Icon name="check" size={18} /></span>{notice}<button className="icon-button" aria-label="Cerrar notificación" onClick={() => setNotice('')}><Icon name="close" size={16} /></button></div>}
  </div>;
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('centraliza_token'));
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(!!token);
  const [connectionError, setConnectionError] = useState('');
  function logout() { localStorage.removeItem('centraliza_token'); setToken(null); setUser(null); setConnectionError(''); }
  useEffect(() => {
    if (!token) { setChecking(false); return; }
    let cancelled = false;
    setChecking(true); setConnectionError('');
    request('/auth/me', token).then(result => { if (!cancelled) setUser(result.user); }).catch(err => { if (!cancelled) { if (err.status === 401 || err.status === 403) logout(); else setConnectionError(err.message); } }).finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [token]);
  function login(result) { localStorage.setItem('centraliza_token', result.token); setToken(result.token); setUser(result.user); }
  if (checking) return <div className="app-loading"><Brand /><Loading text="Abriendo tu espacio…" /></div>;
  if (connectionError && token) return <div className="app-loading"><Brand /><div className="alert error" role="alert">{connectionError}</div><button className="button primary" onClick={() => window.location.reload()}>Reintentar</button><button className="text-button" onClick={logout}>Volver al inicio de sesión</button></div>;
  return user && token ? <Workspace token={token} user={user} onLogout={logout} /> : <Login onLogin={login} />;
}
