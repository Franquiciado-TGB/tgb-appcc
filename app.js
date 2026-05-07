/* TGB APPCC - Frontend Tanda 1 (R04, R05, R07) */

const API_URL = 'https://script.google.com/macros/s/AKfycbxYS3T8NpXq2FYSmoA_6RouqTczhTSVPJwwj1IK0mkbpb5Vwzfh5nyQd3FzUJ-N7r37Iw/exec';

const state = { local: null, encargado: null, estadoDia: {}, configEquipos: [], registroActual: null };
const REGISTROS_DEFINIDOS = ['R04','R05','R07'];
const TODOS_REGISTROS = [
  { cod:'R01', nombre:'Formación de personal', frec:'Eventual' },
  { cod:'R02', nombre:'Limpieza y desinfección', frec:'Diaria' },
  { cod:'R03', nombre:'Recepción de materias primas', frec:'Por entrega' },
  { cod:'R04', nombre:'Tª equipos de frío', frec:'Diaria' },
  { cod:'R05', nombre:'Tª equipos calor y lavado', frec:'Diaria' },
  { cod:'R06', nombre:'Verificación equipos de frío', frec:'Semanal' },
  { cod:'R07', nombre:'Tª elaboración / regeneración', frec:'Diaria' },
  { cod:'R08', nombre:'Higienización vegetales y frutas', frec:'Diaria' },
  { cod:'R09', nombre:'Mantenimiento e incidencias', frec:'Eventual' },
  { cod:'R10', nombre:'Cloro y pH del agua', frec:'Semanal' },
  { cod:'R11', nombre:'Control aceite y freidoras', frec:'Por uso' }
];

const MAPEO_R04 = {
  'Cámara Congelación':'Cámara_Cong','Cámara Refrigeración':'Cám_Refrig','Refrigerador de Carnes':'Refrig_Carnes',
  'Eq. Congelación 1':'Eq_Cong_1','Eq. Congelación 2':'Eq_Cong_2',
  'Mesa Fría 1':'Mesa_Fria_1','Mesa Fría 2':'Mesa_Fria_2','Mesa Fría 3':'Mesa_Fria_3',
  'Eq. Refrigerador Barra':'Eq_Refrig_Barra','Eq. Congelador Barra':'Eq_Cong_Barra'
};
const MAPEO_R05 = {
  'Horno-Salamandra':'Horno_Salamandra','Baño María 1':'Bano_Maria_1','Baño María 2':'Bano_Maria_2',
  'Calienta Biberones':'Calienta_Biberones',
  'Lavavajillas 1 Lavado':'LV1_Lavado','Lavavajillas 1 Aclarado':'LV1_Aclarado',
  'Lavavajillas 2 Lavado':'LV2_Lavado','Lavavajillas 2 Aclarado':'LV2_Aclarado'
};

function validarTemperatura(referencia, valor) {
  if (valor === '' || valor === null || valor === undefined || isNaN(valor)) return { ok: false, mensaje: 'Valor no numérico' };
  const v = parseFloat(valor);
  const ref = String(referencia).trim();
  let m = ref.match(/^≤\s*(-?\d+([.,]\d+)?)/);
  if (m) { const lim = parseFloat(m[1].replace(',', '.')); return v <= lim ? { ok: true } : { ok: false, mensaje: 'Debe ser ≤ ' + lim + '°C' }; }
  m = ref.match(/^≥\s*(-?\d+([.,]\d+)?)/);
  if (m) { const lim = parseFloat(m[1].replace(',', '.')); return v >= lim ? { ok: true } : { ok: false, mensaje: 'Debe ser ≥ ' + lim + '°C' }; }
  m = ref.match(/^<\s*(-?\d+([.,]\d+)?)/);
  if (m) { const lim = parseFloat(m[1].replace(',', '.')); return v < lim ? { ok: true } : { ok: false, mensaje: 'Debe ser < ' + lim + '°C' }; }
  m = ref.match(/^(-?\d+([.,]\d+)?)\s*-\s*(-?\d+([.,]\d+)?)/);
  if (m) { const min = parseFloat(m[1].replace(',', '.')), max = parseFloat(m[3].replace(',', '.')); return (v >= min && v <= max) ? { ok: true } : { ok: false, mensaje: 'Debe estar entre ' + min + ' y ' + max + '°C' }; }
  m = ref.match(/^(-?\d+([.,]\d+)?)$/);
  if (m) { const obj = parseFloat(m[1].replace(',', '.')); return Math.abs(v - obj) <= 2 ? { ok: true } : { ok: false, mensaje: 'Debe estar cerca de ' + obj + '°C (±2°C)' }; }
  return { ok: true };
}

function fechaHoy() { const d = new Date(); return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear(); }
function horaAhora() { const d = new Date(); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0'); }
function diaSemana() { return ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][new Date().getDay()]; }

function mostrarPantalla(id) {
  document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  window.scrollTo(0, 0);
}
function toast(msg, err) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (err ? ' error' : '');
  setTimeout(() => t.classList.add('hidden'), 2800);
}

const LS = {
  encargado: () => localStorage.getItem('tgb_encargado') || '',
  setEncargado: v => localStorage.setItem('tgb_encargado', v),
  local: () => localStorage.getItem('tgb_local') || '',
  setLocal: v => localStorage.setItem('tgb_local', v),
  estadoLocal: () => {
    const r = localStorage.getItem('tgb_estado_dia');
    if (!r) return null;
    try { const o = JSON.parse(r); if (o.fecha !== fechaHoy()) return null; return o; } catch (e) { return null; }
  },
  setEstadoLocal: (local, estado) => localStorage.setItem('tgb_estado_dia', JSON.stringify({ fecha: fechaHoy(), local: local, estado: estado })),
  marcarHecho: (cod, enc) => {
    const a = LS.estadoLocal() || { fecha: fechaHoy(), local: state.local, estado: {} };
    a.estado[cod] = { hecho: true, encargado: enc };
    localStorage.setItem('tgb_estado_dia', JSON.stringify(a));
  },
  cola: () => { try { return JSON.parse(localStorage.getItem('tgb_cola') || '[]'); } catch (e) { return []; } },
  encolar: p => {
    const c = LS.cola();
    c.push({ id: Date.now() + '-' + Math.random().toString(36).slice(2,8), payload: p, ts: new Date().toISOString() });
    localStorage.setItem('tgb_cola', JSON.stringify(c));
  },
  setCola: c => localStorage.setItem('tgb_cola', JSON.stringify(c)),
  config: local => { const r = localStorage.getItem('tgb_config_'+local); return r ? JSON.parse(r) : null; },
  setConfig: (local, e) => localStorage.setItem('tgb_config_'+local, JSON.stringify(e))
};

async function apiGet(params) {
  const url = API_URL + '?' + new URLSearchParams(params).toString();
  const r = await fetch(url, { method: 'GET', redirect: 'follow' });
  return r.json();
}
async function apiPost(payload) {
  const r = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload), redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
  return r.json();
}

const barraRed = document.getElementById('barra-red');
function actualizarBarra() {
  const c = LS.cola();
  if (!navigator.onLine) { barraRed.className = 'barra-red offline'; barraRed.textContent = 'Sin conexión · ' + c.length + ' pendientes'; }
  else if (c.length > 0) { barraRed.className = 'barra-red pendientes'; barraRed.textContent = 'Sincronizando ' + c.length + ' pendientes…'; }
  else { barraRed.className = 'barra-red online'; barraRed.textContent = 'Conectado'; }
}
window.addEventListener('online', () => { actualizarBarra(); sincronizarCola(); });
window.addEventListener('offline', actualizarBarra);

async function sincronizarCola() {
  if (!navigator.onLine) return;
  const cola = LS.cola();
  if (cola.length === 0) return;
  const restantes = [];
  for (const it of cola) {
    try { const r = await apiPost(it.payload); if (!r.ok) restantes.push(it); } catch (e) { restantes.push(it); }
  }
  LS.setCola(restantes);
  actualizarBarra();
  if (restantes.length === 0 && cola.length > 0) toast('Sincronizados ' + cola.length);
}

document.querySelectorAll('#p1 .btn').forEach(b => {
  b.addEventListener('click', () => { state.local = b.dataset.local; LS.setLocal(state.local); irP2(); });
});
document.querySelectorAll('[data-volver]').forEach(b => {
  b.addEventListener('click', () => {
    const dest = b.dataset.volver;
    if (dest === 'p1') mostrarPantalla('p1');
    else if (dest === 'p2') irP2();
    else if (dest === 'p3') irP3();
  });
});

function irP2() {
  document.getElementById('p2-local').textContent = state.local;
  document.getElementById('inp-encargado').value = LS.encargado();
  mostrarPantalla('p2');
  setTimeout(() => document.getElementById('inp-encargado').focus(), 200);
}
document.getElementById('btn-continuar').addEventListener('click', () => {
  const v = document.getElementById('inp-encargado').value.trim();
  if (v.length < 2) { toast('Escribe tu nombre', true); return; }
  state.encargado = v; LS.setEncargado(v); irP3();
});
document.getElementById('inp-encargado').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-continuar').click();
});

async function irP3() {
  document.getElementById('p3-tag').textContent = state.local + ' · ' + state.encargado;
  document.getElementById('p3-fecha').textContent = fechaHoy() + ' · ' + diaSemana();
  const ls = LS.estadoLocal();
  state.estadoDia = (ls && ls.local === state.local) ? ls.estado : {};
  const cacheCfg = LS.config(state.local);
  if (cacheCfg) state.configEquipos = cacheCfg;
  pintarLista();
  mostrarPantalla('p3');
  if (navigator.onLine) {
    try {
      const r = await apiGet({ accion: 'estado_dia', local: state.local });
      if (r.ok) {
        Object.keys(r.estado).forEach(cod => { if (r.estado[cod].hecho) state.estadoDia[cod] = r.estado[cod]; });
        LS.setEstadoLocal(state.local, state.estadoDia);
        pintarLista();
      }
    } catch (e) {}
    try {
      const c = await apiGet({ accion: 'config', local: state.local });
      if (c.ok) { state.configEquipos = c.equipos; LS.setConfig(state.local, c.equipos); }
    } catch (e) {}
    sincronizarCola();
  }
}

function pintarLista() {
  const ul = document.getElementById('lista-reg');
  ul.innerHTML = '';
  TODOS_REGISTROS.forEach(r => {
    const activo = REGISTROS_DEFINIDOS.includes(r.cod);
    const hecho = state.estadoDia[r.cod] && state.estadoDia[r.cod].hecho;
    const li = document.createElement('li');
    li.className = 'item-reg' + (hecho ? ' hecho' : '') + (!activo ? ' bloq' : '');
    li.innerHTML = '<div class="item-num">' + r.cod.replace('R','') + '</div>'
      + '<div class="item-cuerpo">'
      + '<div class="titulo-reg">' + r.nombre + '</div>'
      + '<div class="meta-reg">' + r.frec + (hecho && state.estadoDia[r.cod].encargado ? ' · ✓ ' + state.estadoDia[r.cod].encargado : '') + (!activo ? ' · próximamente' : '') + '</div>'
      + '</div>'
      + '<div class="item-estado">' + (hecho ? '✓' : (activo ? '⏰' : '🔒')) + '</div>';
    if (activo) li.addEventListener('click', () => abrirRegistro(r.cod));
    ul.appendChild(li);
  });
}

function abrirRegistro(cod) {
  state.registroActual = cod;
  const r = TODOS_REGISTROS.find(x => x.cod === cod);
  document.getElementById('p4-tag').textContent = cod + ' · ' + state.local;
  document.getElementById('p4-titulo').textContent = r.nombre;
  document.getElementById('p4-subtitulo').textContent = fechaHoy() + ' · ' + state.encargado;
  document.getElementById('p4-alerta').classList.add('hidden');
  const cont = document.getElementById('p4-formulario');
  cont.innerHTML = '';
  if (cod === 'R04') pintarFormR04(cont);
  else if (cod === 'R05') pintarFormR05(cont);
  else if (cod === 'R07') pintarFormR07(cont);
  mostrarPantalla('p4');
}

function pintarFormR04(cont) {
  const equipos = state.configEquipos.filter(e => e.tipo === 'R04');
  cont.innerHTML = '<label>Hora de la medición</label><input type="time" id="r04-hora" value="' + horaAhora() + '">';
  const sec = document.createElement('div');
  sec.className = 'seccion-titulo'; sec.textContent = 'Equipos de frío';
  cont.appendChild(sec);
  equipos.forEach(eq => {
    const f = document.createElement('div');
    f.className = 'equipo-fila';
    f.innerHTML = '<div class="nombre">' + eq.equipo + '<span class="ref">Ref: ' + eq.referencia + '°C</span></div>'
      + '<input type="text" inputmode="decimal" data-equipo="' + eq.equipo + '" data-ref="' + eq.referencia + '" placeholder="°C">';
    cont.appendChild(f);
  });
  cont.insertAdjacentHTML('beforeend', '<label>Incidencia (si la hay)</label><textarea id="r04-incidencia" rows="2" placeholder="Ej. cámara descongelando, alarma sonando..."></textarea>');
  cont.insertAdjacentHTML('beforeend', '<div id="r04-correctiva-wrap" class="hidden"><label>Acción correctiva (obligatoria)</label><textarea id="r04-correctiva" rows="3"></textarea></div>');
  validarEnVivo(cont);
}

function pintarFormR05(cont) {
  const equipos = state.configEquipos.filter(e => e.tipo === 'R05');
  const sec = document.createElement('div');
  sec.className = 'seccion-titulo'; sec.textContent = 'Equipos de calor y lavado';
  cont.appendChild(sec);
  equipos.forEach(eq => {
    const f = document.createElement('div');
    f.className = 'equipo-fila';
    f.innerHTML = '<div class="nombre">' + eq.equipo + '<span class="ref">Ref: ' + eq.referencia + '°C</span></div>'
      + '<input type="text" inputmode="decimal" data-equipo="' + eq.equipo + '" data-ref="' + eq.referencia + '" placeholder="°C">';
    cont.appendChild(f);
  });
  cont.insertAdjacentHTML('beforeend', '<label>Incidencia (si la hay)</label><textarea id="r05-incidencia" rows="2" placeholder="Ej. lavavajillas no llega a 82°C..."></textarea>');
  validarEnVivo(cont);
}

function pintarFormR07(cont) {
  cont.innerHTML = '<p style="color:#aaa;font-size:13px;margin-bottom:14px">Añade tantas mediciones como necesites. Cada una se guarda como una fila.</p>';
  const wrap = document.createElement('div'); wrap.id = 'r07-mediciones';
  cont.appendChild(wrap);
  const btn = document.createElement('button');
  btn.className = 'btn secundario'; btn.style.padding = '14px'; btn.style.fontSize = '15px';
  btn.textContent = '+ Añadir medición'; btn.type = 'button';
  btn.addEventListener('click', () => anadirMedicionR07(wrap));
  cont.appendChild(btn);
  anadirMedicionR07(wrap);
}

function anadirMedicionR07(wrap) {
  const equipos = state.configEquipos.filter(e => e.tipo === 'R07');
  const idx = wrap.children.length;
  const div = document.createElement('div');
  div.className = 'r07-medicion';
  const opc = equipos.map(e => '<option value="' + e.equipo + '" data-ref="' + e.referencia + '">' + e.equipo + ' (Ref: ' + e.referencia + '°C)</option>').join('');
  div.innerHTML = '<div class="r07-cab"><strong>MEDICIÓN ' + (idx+1) + '</strong>'
    + (idx > 0 ? '<button type="button" class="btn-quitar">Quitar</button>' : '') + '</div>'
    + '<label>Equipo</label><select class="r07-equipo">' + opc + '</select>'
    + '<label>Tipo</label><select class="r07-tipo"><option>Elaboración</option><option>Regeneración</option><option>Mantenimiento caliente</option></select>'
    + '<label>Producto</label><input type="text" class="r07-producto" placeholder="Ej. Hamburguesa, patatas...">'
    + '<label>Temperatura (°C)</label><input type="text" inputmode="decimal" class="r07-temp" placeholder="°C">';
  wrap.appendChild(div);
  const quitar = div.querySelector('.btn-quitar');
  if (quitar) quitar.addEventListener('click', () => { div.remove(); renumerarR07(wrap); });
}
function renumerarR07(wrap) {
  Array.from(wrap.children).forEach((d, i) => { d.querySelector('strong').textContent = 'MEDICIÓN ' + (i+1); });
}

function validarEnVivo(cont) {
  cont.querySelectorAll('input[data-ref]').forEach(inp => {
    inp.addEventListener('input', () => {
      const v = inp.value.replace(',', '.');
      if (v === '') { inp.classList.remove('alerta'); return; }
      const r = validarTemperatura(inp.dataset.ref, v);
      inp.classList.toggle('alerta', !r.ok);
    });
  });
}

document.getElementById('btn-guardar').addEventListener('click', async () => {
  const cod = state.registroActual;
  if (cod === 'R04') return guardarR04();
  if (cod === 'R05') return guardarR05();
  if (cod === 'R07') return guardarR07();
});

function recolectarTemperaturas(mapeo) {
  const datos = {}; const fueraRango = [];
  document.querySelectorAll('#p4-formulario input[data-equipo]').forEach(inp => {
    const eq = inp.dataset.equipo;
    const col = mapeo[eq];
    const valOriginal = inp.value.trim();
    const val = valOriginal.replace(',', '.');
    if (!col) return;
    if (val === '') { datos[col] = ''; return; }
    datos[col] = parseFloat(val);
    const r = validarTemperatura(inp.dataset.ref, val);
    if (!r.ok) fueraRango.push({ equipo: eq, valor: valOriginal, motivo: r.mensaje });
  });
  return { datos: datos, fueraRango: fueraRango };
}

function mostrarAlerta(fueraRango, requiereCorrectiva) {
  const al = document.getElementById('p4-alerta');
  al.className = 'alerta-banner';
  let h = '<strong>⚠ ' + fueraRango.length + ' valor(es) fuera de rango</strong><ul>';
  fueraRango.forEach(f => { h += '<li>' + f.equipo + ': ' + f.valor + '°C — ' + f.motivo + '</li>'; });
  h += '</ul>';
  if (requiereCorrectiva) h += '<p style="margin-top:10px">Escribe una acción correctiva abajo para poder guardar.</p>';
  al.innerHTML = h;
}

async function enviar(payload, codigo) {
  if (!navigator.onLine) {
    LS.encolar(payload); LS.marcarHecho(codigo, state.encargado);
    actualizarBarra(); toast('Guardado offline');
    setTimeout(() => irP3(), 600); return;
  }
  try {
    const r = await apiPost(payload);
    if (r.ok) {
      LS.marcarHecho(codigo, state.encargado);
      toast('Guardado ✓');
      setTimeout(() => irP3(), 600);
    } else {
      LS.encolar(payload); LS.marcarHecho(codigo, state.encargado);
      actualizarBarra(); toast('Error servidor — guardado local', true);
      setTimeout(() => irP3(), 800);
    }
  } catch (err) {
    LS.encolar(payload); LS.marcarHecho(codigo, state.encargado);
    actualizarBarra(); toast('Sin red — guardado offline');
    setTimeout(() => irP3(), 600);
  }
}

function guardarR04() {
  const res = recolectarTemperaturas(MAPEO_R04);
  const incidencia = document.getElementById('r04-incidencia').value.trim();
  const correctivaWrap = document.getElementById('r04-correctiva-wrap');
  const correctivaInp = document.getElementById('r04-correctiva');
  if (res.fueraRango.length > 0) {
    correctivaWrap.classList.remove('hidden');
    mostrarAlerta(res.fueraRango, true);
    document.getElementById('p4-alerta').classList.remove('hidden');
    if (correctivaInp.value.trim().length < 5) {
      toast('Escribe la acción correctiva', true);
      correctivaInp.focus(); return;
    }
  }
  const datosCompletos = Object.assign({}, res.datos, {
    'Día': fechaHoy(),
    'Hora': document.getElementById('r04-hora').value,
    'Incidencia': incidencia || (res.fueraRango.length > 0 ? res.fueraRango.map(f => f.equipo + ': ' + f.valor + '°C').join(' | ') : ''),
    'Accion_Correctiva': correctivaInp.value.trim()
  });
  enviar({ accion:'guardar', codigo:'R04', local: state.local, encargado: state.encargado, datos: datosCompletos }, 'R04');
}

function guardarR05() {
  const res = recolectarTemperaturas(MAPEO_R05);
  const incidencia = document.getElementById('r05-incidencia').value.trim();
  if (res.fueraRango.length > 0) {
    mostrarAlerta(res.fueraRango, false);
    document.getElementById('p4-alerta').classList.remove('hidden');
  }
  const datosCompletos = Object.assign({}, res.datos, {
    'Día': fechaHoy(),
    'Incidencia': incidencia || (res.fueraRango.length > 0 ? res.fueraRango.map(f => f.equipo + ': ' + f.valor + '°C').join(' | ') : '')
  });
  enviar({ accion:'guardar', codigo:'R05', local: state.local, encargado: state.encargado, datos: datosCompletos }, 'R05');
}

async function guardarR07() {
  const meds = document.querySelectorAll('#r07-mediciones .r07-medicion');
  if (meds.length === 0) { toast('Añade al menos una medición', true); return; }
  const errores = [];
  const payloads = [];
  meds.forEach((d, i) => {
    const eq = d.querySelector('.r07-equipo').value;
    const tipo = d.querySelector('.r07-tipo').value;
    const prod = d.querySelector('.r07-producto').value.trim();
    const temp = d.querySelector('.r07-temp').value.replace(',', '.').trim();
    if (!prod) errores.push('Medición ' + (i+1) + ': falta producto');
    if (!temp || isNaN(parseFloat(temp))) errores.push('Medición ' + (i+1) + ': temperatura no válida');
    payloads.push({
      accion:'guardar', codigo:'R07', local: state.local, encargado: state.encargado,
      datos: { 'Día': fechaHoy(), 'Equipo': eq, 'Producto': prod, 'Temperatura': parseFloat(temp), 'Tipo': tipo }
    });
  });
  if (errores.length) { toast(errores[0], true); return; }
  document.getElementById('btn-guardar').disabled = true;
  let okCount = 0;
  for (const p of payloads) {
    if (!navigator.onLine) { LS.encolar(p); okCount++; continue; }
    try {
      const r = await apiPost(p);
      if (r.ok) okCount++;
      else { LS.encolar(p); okCount++; }
    } catch (e) { LS.encolar(p); okCount++; }
  }
  LS.marcarHecho('R07', state.encargado);
  actualizarBarra();
  toast('Guardadas ' + okCount + ' mediciones ✓');
  document.getElementById('btn-guardar').disabled = false;
  setTimeout(() => irP3(), 700);
}

(function init() {
  actualizarBarra();
  if (navigator.onLine) sincronizarCola();
  const lastLocal = LS.local();
  const lastEnc = LS.encargado();
  if (lastLocal && lastEnc) {
    state.local = lastLocal; state.encargado = lastEnc;
    irP3();
  } else if (lastLocal) {
    state.local = lastLocal; irP2();
  }
})();
