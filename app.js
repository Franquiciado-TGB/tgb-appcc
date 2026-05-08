/* TGB APPCC - Frontend Tanda 1+2 (R04, R05, R07, R02, R08, R10) - v1.2 */

const API_URL = 'https://script.google.com/macros/s/AKfycbxYS3T8NpXq2FYSmoA_6RouqTczhTSVPJwwj1IK0mkbpb5Vwzfh5nyQd3FzUJ-N7r37Iw/exec';

const state = { local: null, encargado: null, estadoDia: {}, configEquipos: [], registroActual: null };
const REGISTROS_DEFINIDOS = ['R02','R04','R05','R07','R08','R10'];
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

const ZONAS_R02 = [
{ zona:'Cocina', equipo:'Plancha y parrilla' },
{ zona:'Cocina', equipo:'Freidoras (exterior)' },
{ zona:'Cocina', equipo:'Mesas de trabajo' },
{ zona:'Cocina', equipo:'Mesas frías' },
{ zona:'Cocina', equipo:'Suelos cocina' },
{ zona:'Cocina', equipo:'Campana extractora (filtros)' },
{ zona:'Frío', equipo:'Cámara refrigeración (interior)' },
{ zona:'Frío', equipo:'Cámara congelación (interior)' },
{ zona:'Barra', equipo:'Barra y mostrador' },
{ zona:'Barra', equipo:'Equipos refrigeración barra' },
{ zona:'Sala', equipo:'Mesas y sillas' },
{ zona:'Sala', equipo:'Suelos sala' },
{ zona:'Baños', equipo:'Baño clientes' },
{ zona:'Baños', equipo:'Baño personal / vestuario' },
{ zona:'Almacén', equipo:'Almacén seco' },
{ zona:'Residuos', equipo:'Cubos basura y zona residuos' }
];

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
function semanaIso() { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+3-(d.getDay()+6)%7); const w1 = new Date(d.getFullYear(),0,4); return d.getFullYear()+'-W'+String(1+Math.round(((d-w1)/86400000-3+(w1.getDay()+6)%7)/7)).padStart(2,'0'); }

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

function mostrarExito(codigo, nombre, hora, resumenLineas) {
document.getElementById('p5-codigo').textContent = codigo + ' · ' + state.local;
document.getElementById('p5-titulo').textContent = nombre;
document.getElementById('p5-hora').textContent = fechaHoy() + ' · ' + hora + ' · ' + state.encargado;
const ul = document.getElementById('p5-resumen');
ul.innerHTML = '';
resumenLineas.forEach(l => { const li = document.createElement('li'); li.textContent = l; ul.appendChild(li); });
mostrarPantalla('p5');
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
if (cod === 'R02') pintarFormR02(cont);
else if (cod === 'R04') pintarFormR04(cont);
else if (cod === 'R05') pintarFormR05(cont);
else if (cod === 'R07') pintarFormR07(cont);
else if (cod === 'R08') pintarFormR08(cont);
else if (cod === 'R10') pintarFormR10(cont);
mostrarPantalla('p4');
}

function htmlInputTemp(eq, ref) {
return '<div class="temp-wrap">'
+ '<button type="button" class="btn-signo">+/-</button>'
+ '<input type="text" inputmode="decimal" pattern="-?[0-9]*[.,]?[0-9]*" data-equipo="' + eq + '" data-ref="' + ref + '" placeholder="°C">'
+ '</div>';
}

function activarBotonesSigno(cont) {
cont.querySelectorAll('.btn-signo').forEach(btn => {
btn.addEventListener('click', () => {
const inp = btn.parentElement.querySelector('input');
const v = inp.value.trim();
if (v === '' || v === '-') { inp.value = v.startsWith('-') ? '' : '-'; }
else if (v.startsWith('-')) { inp.value = v.substring(1); }
else { inp.value = '-' + v; }
inp.dispatchEvent(new Event('input', { bubbles: true }));
inp.focus();
});
});
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
+ htmlInputTemp(eq.equipo, eq.referencia);
cont.appendChild(f);
});
cont.insertAdjacentHTML('beforeend', '<label>Incidencia (si la hay)</label><textarea id="r04-incidencia" rows="2" placeholder="Ej. cámara descongelando, alarma sonando..."></textarea>');
cont.insertAdjacentHTML('beforeend', '<div id="r04-correctiva-wrap" class="hidden"><label>Acción correctiva (obligatoria)</label><textarea id="r04-correctiva" rows="3"></textarea></div>');
activarBotonesSigno(cont);
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
+ htmlInputTemp(eq.equipo, eq.referencia);
cont.appendChild(f);
});
cont.insertAdjacentHTML('beforeend', '<label>Incidencia (si la hay)</label><textarea id="r05-incidencia" rows="2" placeholder="Ej. lavavajillas no llega a 82°C..."></textarea>');
activarBotonesSigno(cont);
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
+ '<label>Temperatura (°C)</label><input type="text" inputmode="decimal" pattern="-?[0-9]*[.,]?[0-9]*" class="r07-temp" placeholder="°C">';
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
if (v === '' || v === '-') { inp.classList.remove('alerta'); return; }
const r = validarTemperatura(inp.dataset.ref, v);
inp.classList.toggle('alerta', !r.ok);
});
});
}

function pintarFormR02(cont) {
cont.innerHTML = '<p style="color:#aaa;font-size:13px;margin-bottom:14px">Marca cada zona/equipo limpiado hoy. Las que no marques quedan pendientes.</p>';
let zonaActual = '';
ZONAS_R02.forEach((z, i) => {
if (z.zona !== zonaActual) {
zonaActual = z.zona;
const sec = document.createElement('div');
sec.className = 'seccion-titulo';
sec.textContent = z.zona;
cont.appendChild(sec);
}
const fila = document.createElement('label');
fila.className = 'check-fila';
fila.innerHTML = '<input type="checkbox" class="r02-check" data-zona="' + z.zona + '" data-equipo="' + z.equipo + '" data-idx="' + i + '">'
+ '<span class="check-nombre">' + z.equipo + '</span>';
cont.appendChild(fila);
});
const acciones = document.createElement('div');
acciones.className = 'r02-acciones';
acciones.innerHTML = '<button type="button" class="btn secundario" id="r02-todo" style="padding:12px;font-size:14px">Marcar TODO</button>';
cont.appendChild(acciones);
cont.insertAdjacentHTML('beforeend', '<label>Observaciones (opcional)</label><textarea id="r02-obs" rows="2" placeholder="Ej. campana muy sucia, falta producto..."></textarea>');
document.getElementById('r02-todo').addEventListener('click', () => {
const cks = cont.querySelectorAll('.r02-check');
const todasMarcadas = Array.from(cks).every(c => c.checked);
cks.forEach(c => c.checked = !todasMarcadas);
});
}

function pintarFormR08(cont) {
cont.innerHTML = '<p style="color:#aaa;font-size:13px;margin-bottom:14px">Una fila por lavado de vegetales/frutas. Dosis recomendada: 70 mg/L (50–100 mg/L).</p>';
const wrap = document.createElement('div'); wrap.id = 'r08-lavados';
cont.appendChild(wrap);
const btn = document.createElement('button');
btn.className = 'btn secundario'; btn.style.padding = '14px'; btn.style.fontSize = '15px';
btn.textContent = '+ Añadir lavado'; btn.type = 'button';
btn.addEventListener('click', () => anadirLavadoR08(wrap));
cont.appendChild(btn);
anadirLavadoR08(wrap);
}

function anadirLavadoR08(wrap) {
const idx = wrap.children.length;
const div = document.createElement('div');
div.className = 'r07-medicion';
div.innerHTML = '<div class="r07-cab"><strong>LAVADO ' + (idx+1) + '</strong>'
+ (idx > 0 ? '<button type="button" class="btn-quitar">Quitar</button>' : '') + '</div>'
+ '<label>Tipo</label><select class="r08-tipo"><option>Vegetales</option><option>Frutas</option><option>Mixto</option></select>'
+ '<label>Producto</label><input type="text" class="r08-producto" placeholder="Ej. lechuga, tomate...">'
+ '<div style="display:flex;gap:10px">'
+ '<div style="flex:1"><label>Hora inicio</label><input type="time" class="r08-ini" value="' + horaAhora() + '"></div>'
+ '<div style="flex:1"><label>Hora fin</label><input type="time" class="r08-fin"></div>'
+ '</div>'
+ '<label>Cantidad de agua (L)</label><input type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" class="r08-agua" placeholder="Ej. 5">'
+ '<label>Dosis lejía (mg/L) — Ref: 50–100</label><input type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" class="r08-dosis" placeholder="Ej. 70">'
+ '<label>¿Aclarado correcto con agua potable?</label>'
+ '<div style="display:flex;gap:10px">'
+ '<label class="radio-opcion"><input type="radio" name="r08-acl-' + idx + '" value="Sí" checked> Sí</label>'
+ '<label class="radio-opcion"><input type="radio" name="r08-acl-' + idx + '" value="No"> No</label>'
+ '</div>';
wrap.appendChild(div);
const inpDosis = div.querySelector('.r08-dosis');
inpDosis.addEventListener('input', () => {
const v = parseFloat(inpDosis.value.replace(',', '.'));
inpDosis.classList.toggle('alerta', !isNaN(v) && (v < 50 || v > 100));
});
const quitar = div.querySelector('.btn-quitar');
if (quitar) quitar.addEventListener('click', () => { div.remove(); renumerarR08(wrap); });
}
function renumerarR08(wrap) {
Array.from(wrap.children).forEach((d, i) => { d.querySelector('strong').textContent = 'LAVADO ' + (i+1); });
}

function pintarFormR10(cont) {
cont.innerHTML = '<p style="color:#aaa;font-size:13px;margin-bottom:14px">Control semanal del agua de red. Toma muestra del grifo de cocina tras dejar correr 30 s.</p>';
const sec = document.createElement('div');
sec.className = 'seccion-titulo'; sec.textContent = 'Cloro y pH';
cont.appendChild(sec);
const filas = [
{ id:'r10-libre', label:'Cloro libre (mg/L)', ref:'0,2 - 1,0', placeholder:'Ej. 0,5' },
{ id:'r10-comb', label:'Cloro combinado (mg/L)', ref:'≤ 0,4', placeholder:'Ej. 0,2' },
{ id:'r10-ph', label:'pH', ref:'6,5 - 9,5', placeholder:'Ej. 7,4' }
];
filas.forEach(f => {
cont.insertAdjacentHTML('beforeend',
'<div class="equipo-fila">'
+ '<div class="nombre">' + f.label + '<span class="ref">Ref: ' + f.ref + '</span></div>'
+ '<div class="temp-wrap"><input type="text" inputmode="decimal" pattern="[0-9]*[.,]?[0-9]*" id="' + f.id + '" data-ref="' + f.ref + '" placeholder="' + f.placeholder + '" style="width:100%;text-align:center;font-weight:700;font-size:18px;padding:14px 8px"></div>'
+ '</div>');
});
const sec2 = document.createElement('div');
sec2.className = 'seccion-titulo'; sec2.textContent = 'Análisis organoléptico';
cont.appendChild(sec2);
['Olor','Color','Sabor'].forEach(c => {
cont.insertAdjacentHTML('beforeend',
'<label>' + c + '</label>'
+ '<select id="r10-' + c.toLowerCase() + '"><option>Normal</option><option>Anormal</option></select>');
});
cont.insertAdjacentHTML('beforeend', '<label>Incidencia (si la hay)</label><textarea id="r10-incidencia" rows="2" placeholder="Ej. cloro bajo, sabor a tierra..."></textarea>');
validarEnVivo(cont);
}

document.getElementById('btn-guardar').addEventListener('click', async () => {
const cod = state.registroActual;
if (cod === 'R02') return guardarR02();
if (cod === 'R04') return guardarR04();
if (cod === 'R05') return guardarR05();
if (cod === 'R07') return guardarR07();
if (cod === 'R08') return guardarR08();
if (cod === 'R10') return guardarR10();
});

function recolectarTemperaturas(mapeo) {
const datos = {}; const fueraRango = []; const medidos = [];
document.querySelectorAll('#p4-formulario input[data-equipo]').forEach(inp => {
const eq = inp.dataset.equipo;
const col = mapeo[eq];
const valOriginal = inp.value.trim();
const val = valOriginal.replace(',', '.');
if (!col) return;
if (val === '' || val === '-') { datos[col] = ''; return; }
datos[col] = parseFloat(val);
medidos.push(eq);
const r = validarTemperatura(inp.dataset.ref, val);
if (!r.ok) fueraRango.push({ equipo: eq, valor: valOriginal, motivo: r.mensaje });
});
return { datos: datos, fueraRango: fueraRango, medidos: medidos };
}

function mostrarAlerta(fueraRango, requiereCorrectiva) {
const al = document.getElementById('p4-alerta');
al.className = 'alerta-banner';
let h = '<strong>⚠ ' + fueraRango.length + ' valor(es) fuera de rango</strong><ul>';
fueraRango.forEach(f => { h += '<li>' + f.equipo + ': ' + f.valor + ' — ' + f.motivo + '</li>'; });
h += '</ul>';
if (requiereCorrectiva) h += '<p style="margin-top:10px">Escribe una acción correctiva abajo para poder guardar.</p>';
al.innerHTML = h;
}

async function enviar(payload, codigo, nombreReg, hora, resumen) {
const exito = () => {
LS.marcarHecho(codigo, state.encargado);
mostrarExito(codigo, nombreReg, hora, resumen);
};
const offline = () => {
LS.encolar(payload); LS.marcarHecho(codigo, state.encargado);
actualizarBarra();
const resumenOff = resumen.slice();
resumenOff.push('— Pendiente de subir cuando vuelva la conexión —');
mostrarExito(codigo, nombreReg, hora, resumenOff);
};
if (!navigator.onLine) { offline(); return; }
try {
const r = await apiPost(payload);
if (r && r.ok) { exito(); }
else { offline(); }
} catch (err) { offline(); }
}

function guardarR04() {
const res = recolectarTemperaturas(MAPEO_R04);
const incidencia = document.getElementById('r04-incidencia').value.trim();
const correctivaWrap = document.getElementById('r04-correctiva-wrap');
const correctivaInp = document.getElementById('r04-correctiva');
const hora = document.getElementById('r04-hora').value;
if (res.medidos.length === 0) { toast('Mide al menos un equipo', true); return; }
if (res.fueraRango.length > 0) {
correctivaWrap.classList.remove('hidden');
mostrarAlerta(res.fueraRango, true);
document.getElementById('p4-alerta').classList.remove('hidden');
if (correctivaInp.value.trim().length < 5) { toast('Escribe la acción correctiva', true); correctivaInp.focus(); return; }
}
const datosCompletos = Object.assign({}, res.datos, {
'Día': fechaHoy(), 'Hora': hora,
'Incidencia': incidencia || (res.fueraRango.length > 0 ? res.fueraRango.map(f => f.equipo + ': ' + f.valor + '°C').join(' | ') : ''),
'Accion_Correctiva': correctivaInp.value.trim()
});
const resumen = [];
resumen.push(res.medidos.length + ' equipos medidos a las ' + hora);
if (res.fueraRango.length > 0) resumen.push('⚠ ' + res.fueraRango.length + ' fuera de rango (con acción correctiva)');
else resumen.push('✓ Todos los valores dentro de rango');
enviar({ accion:'guardar', codigo:'R04', local: state.local, encargado: state.encargado, datos: datosCompletos }, 'R04', 'Tª equipos de frío', hora, resumen);
}

function guardarR05() {
const res = recolectarTemperaturas(MAPEO_R05);
const incidencia = document.getElementById('r05-incidencia').value.trim();
const hora = horaAhora();
if (res.medidos.length === 0) { toast('Mide al menos un equipo', true); return; }
if (res.fueraRango.length > 0) {
mostrarAlerta(res.fueraRango, false);
document.getElementById('p4-alerta').classList.remove('hidden');
}
const datosCompletos = Object.assign({}, res.datos, {
'Día': fechaHoy(),
'Incidencia': incidencia || (res.fueraRango.length > 0 ? res.fueraRango.map(f => f.equipo + ': ' + f.valor + '°C').join(' | ') : '')
});
const resumen = [];
resumen.push(res.medidos.length + ' equipos medidos');
if (res.fueraRango.length > 0) resumen.push('⚠ ' + res.fueraRango.length + ' fuera de rango');
else resumen.push('✓ Todos los valores dentro de rango');
enviar({ accion:'guardar', codigo:'R05', local: state.local, encargado: state.encargado, datos: datosCompletos }, 'R05', 'Tª equipos calor y lavado', hora, resumen);
}

async function guardarR07() {
const meds = document.querySelectorAll('#r07-mediciones .r07-medicion');
if (meds.length === 0) { toast('Añade al menos una medición', true); return; }
const errores = []; const payloads = []; const resumenLineas = [];
meds.forEach((d, i) => {
const eq = d.querySelector('.r07-equipo').value;
const tipo = d.querySelector('.r07-tipo').value;
const prod = d.querySelector('.r07-producto').value.trim();
const temp = d.querySelector('.r07-temp').value.replace(',', '.').trim();
if (!prod) errores.push('Medición ' + (i+1) + ': falta producto');
if (!temp || isNaN(parseFloat(temp))) errores.push('Medición ' + (i+1) + ': temperatura no válida');
payloads.push({ accion:'guardar', codigo:'R07', local: state.local, encargado: state.encargado,
datos: { 'Día': fechaHoy(), 'Equipo': eq, 'Producto': prod, 'Temperatura': parseFloat(temp), 'Tipo': tipo } });
resumenLineas.push(eq + ' · ' + prod + ' · ' + temp + '°C (' + tipo + ')');
});
if (errores.length) { toast(errores[0], true); return; }
document.getElementById('btn-guardar').disabled = true;
let okCount = 0; let pendientes = 0;
for (const p of payloads) {
if (!navigator.onLine) { LS.encolar(p); pendientes++; continue; }
try { const r = await apiPost(p); if (r && r.ok) okCount++; else { LS.encolar(p); pendientes++; } } catch (e) { LS.encolar(p); pendientes++; }
}
LS.marcarHecho('R07', state.encargado);
actualizarBarra();
document.getElementById('btn-guardar').disabled = false;
const resumen = ['Guardadas ' + (okCount + pendientes) + ' mediciones'];
if (pendientes > 0) resumen.push('— ' + pendientes + ' pendientes de subir cuando vuelva la conexión —');
resumen.push.apply(resumen, resumenLineas);
mostrarExito('R07', 'Tª elaboración / regeneración', horaAhora(), resumen);
}

async function guardarR02() {
const cks = document.querySelectorAll('.r02-check');
const marcadas = Array.from(cks).filter(c => c.checked);
const obs = document.getElementById('r02-obs').value.trim();
const hora = horaAhora();
if (marcadas.length === 0) { toast('Marca al menos una zona limpiada', true); return; }
const payloads = [];
const resumenLineas = [];
marcadas.forEach(c => {
payloads.push({ accion:'guardar', codigo:'R02', local: state.local, encargado: state.encargado,
datos: { 'Día': fechaHoy(), 'Zona': c.dataset.zona, 'Equipo': c.dataset.equipo, 'Realizado': 'Sí', 'Observaciones': obs } });
});
ZONAS_R02.forEach((z, i) => {
const ck = document.querySelector('.r02-check[data-idx="' + i + '"]');
if (ck && !ck.checked) {
payloads.push({ accion:'guardar', codigo:'R02', local: state.local, encargado: state.encargado,
datos: { 'Día': fechaHoy(), 'Zona': z.zona, 'Equipo': z.equipo, 'Realizado': 'No', 'Observaciones': obs } });
}
});
resumenLineas.push(marcadas.length + ' de ' + ZONAS_R02.length + ' zonas marcadas como limpiadas');
const noLimpiadas = ZONAS_R02.length - marcadas.length;
if (noLimpiadas > 0) resumenLineas.push('⚠ ' + noLimpiadas + ' zonas sin limpiar (registradas como No)');
else resumenLineas.push('✓ Todas las zonas limpiadas');
document.getElementById('btn-guardar').disabled = true;
let okCount = 0; let pendientes = 0;
for (const p of payloads) {
if (!navigator.onLine) { LS.encolar(p); pendientes++; continue; }
try { const r = await apiPost(p); if (r && r.ok) okCount++; else { LS.encolar(p); pendientes++; } } catch (e) { LS.encolar(p); pendientes++; }
}
LS.marcarHecho('R02', state.encargado);
actualizarBarra();
document.getElementById('btn-guardar').disabled = false;
if (pendientes > 0) resumenLineas.push('— ' + pendientes + ' filas pendientes de subir —');
mostrarExito('R02', 'Limpieza y desinfección', hora, resumenLineas);
}

async function guardarR08() {
const lavs = document.querySelectorAll('#r08-lavados .r07-medicion');
if (lavs.length === 0) { toast('Añade al menos un lavado', true); return; }
const errores = []; const payloads = []; const resumenLineas = []; const fueraRango = [];
lavs.forEach((d, i) => {
const tipo = d.querySelector('.r08-tipo').value;
const prod = d.querySelector('.r08-producto').value.trim();
const ini = d.querySelector('.r08-ini').value;
const fin = d.querySelector('.r08-fin').value;
const aguaT = d.querySelector('.r08-agua').value.replace(',', '.').trim();
const dosisT = d.querySelector('.r08-dosis').value.replace(',', '.').trim();
const acl = d.querySelector('input[name="r08-acl-' + i + '"]:checked').value;
if (!prod) errores.push('Lavado ' + (i+1) + ': falta producto');
if (!aguaT || isNaN(parseFloat(aguaT))) errores.push('Lavado ' + (i+1) + ': cantidad de agua no válida');
if (!dosisT || isNaN(parseFloat(dosisT))) errores.push('Lavado ' + (i+1) + ': dosis no válida');
const dosis = parseFloat(dosisT);
if (!isNaN(dosis) && (dosis < 50 || dosis > 100)) fueraRango.push('Lavado ' + (i+1) + ': dosis ' + dosisT + ' mg/L fuera de 50–100');
if (acl === 'No') fueraRango.push('Lavado ' + (i+1) + ': aclarado NO realizado');
payloads.push({ accion:'guardar', codigo:'R08', local: state.local, encargado: state.encargado,
datos: { 'Día': fechaHoy(), 'Tipo': tipo, 'Hora_Inicio': ini, 'Hora_Fin': fin, 'Producto': prod,
'Cantidad_Agua_L': parseFloat(aguaT), 'Dosis_mgL': dosis, 'Aclarado_OK': acl } });
resumenLineas.push(tipo + ' · ' + prod + ' · ' + dosisT + ' mg/L · aclarado ' + acl);
});
if (errores.length) { toast(errores[0], true); return; }
document.getElementById('btn-guardar').disabled = true;
let okCount = 0; let pendientes = 0;
for (const p of payloads) {
if (!navigator.onLine) { LS.encolar(p); pendientes++; continue; }
try { const r = await apiPost(p); if (r && r.ok) okCount++; else { LS.encolar(p); pendientes++; } } catch (e) { LS.encolar(p); pendientes++; }
}
LS.marcarHecho('R08', state.encargado);
actualizarBarra();
document.getElementById('btn-guardar').disabled = false;
const resumen = [(okCount + pendientes) + ' lavados registrados'];
if (fueraRango.length > 0) { resumen.push('⚠ ' + fueraRango.length + ' incidencias:'); resumen.push.apply(resumen, fueraRango); }
else resumen.push('✓ Todos dentro de rango y aclarados');
if (pendientes > 0) resumen.push('— ' + pendientes + ' pendientes de subir —');
resumen.push.apply(resumen, resumenLineas);
mostrarExito('R08', 'Higienización vegetales y frutas', horaAhora(), resumen);
}

function guardarR10() {
const libreT = document.getElementById('r10-libre').value.replace(',', '.').trim();
const combT = document.getElementById('r10-comb').value.replace(',', '.').trim();
const phT = document.getElementById('r10-ph').value.replace(',', '.').trim();
if (!libreT || !combT || !phT) { toast('Rellena cloro libre, combinado y pH', true); return; }
const libre = parseFloat(libreT), comb = parseFloat(combT), ph = parseFloat(phT);
const fueraRango = [];
if (isNaN(libre) || libre < 0.2 || libre > 1.0) fueraRango.push('Cloro libre ' + libreT + ' mg/L fuera de 0,2–1,0');
if (isNaN(comb) || comb > 0.4) fueraRango.push('Cloro combinado ' + combT + ' mg/L > 0,4');
if (isNaN(ph) || ph < 6.5 || ph > 9.5) fueraRango.push('pH ' + phT + ' fuera de 6,5–9,5');
const olor = document.getElementById('r10-olor').value;
const color = document.getElementById('r10-color').value;
const sabor = document.getElementById('r10-sabor').value;
const incidencia = document.getElementById('r10-incidencia').value.trim();
[['olor',olor],['color',color],['sabor',sabor]].forEach(([k,v]) => { if (v === 'Anormal') fueraRango.push(k.charAt(0).toUpperCase()+k.slice(1) + ' anormal'); });
if (fueraRango.length > 0) {
const al = document.getElementById('p4-alerta');
al.className = 'alerta-banner';
al.innerHTML = '<strong>⚠ Avisar al jefe / cambiar filtro</strong><ul>' + fueraRango.map(f => '<li>' + f + '</li>').join('') + '</ul>';
al.classList.remove('hidden');
}
const datos = { 'Semana': semanaIso(), 'Día': fechaHoy(), 'Cloro_Libre': libre, 'Cloro_Combinado': comb, 'pH': ph, 'Olor': olor, 'Color': color, 'Sabor': sabor, 'Incidencia': incidencia };
const resumen = ['Cloro libre: ' + libreT + ' mg/L', 'Cloro combinado: ' + combT + ' mg/L', 'pH: ' + phT, 'Olor/Color/Sabor: ' + olor + ' / ' + color + ' / ' + sabor];
if (fueraRango.length > 0) { resumen.push('⚠ ' + fueraRango.length + ' fuera de rango'); }
else resumen.push('✓ Todos los valores dentro de rango');
enviar({ accion:'guardar', codigo:'R10', local: state.local, encargado: state.encargado, datos: datos }, 'R10', 'Cloro y pH del agua', horaAhora(), resumen);
}

document.addEventListener('click', e => {
const t = e.target;
if (t && (t.id === 'p5-btn-volver' || t.id === 'p5-btn-otro')) { irP3(); }
});

(function init() {
actualizarBarra();
if (navigator.onLine) sincronizarCola();
const lastLocal = LS.local();
const lastEnc = LS.encargado();
if (lastLocal && lastEnc) { state.local = lastLocal; state.encargado = lastEnc; irP3(); }
else if (lastLocal) { state.local = lastLocal; irP2(); }
})();
