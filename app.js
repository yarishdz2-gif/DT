function formatPrecio(n) {
  return '$' + n.toLocaleString('en-US');
}
function tipoLabel(t) {
  return { casa:'Casa', departamento:'Departamento', terreno:'Terreno', local:'Local' }[t] || t;
}
function crearCard(p) {
  return `<article class="prop-card" onclick="abrirDetalle(${p.id})">
    <div class="prop-img">
      <img src="${p.img}" alt="${p.nombre}" loading="lazy">
      <span class="prop-tag">${p.tag}</span>
      <span class="prop-type">${tipoLabel(p.tipo)}</span>
      <div class="prop-price">${formatPrecio(p.precio)}</div>
    </div>
    <div class="prop-body">
      <h3>${p.nombre}</h3>
      <div class="prop-loc">📍 ${p.ubicacion}</div>
      <div class="prop-meta">
        ${p.hab ? `<span>🛏 ${p.hab} Hab</span>` : ''}
        ${p.banos ? `<span>🛁 ${p.banos} Baños</span>` : ''}
        <span>📐 ${p.m2} m²</span>
      </div>
    </div>
  </article>`;
}
function renderFeatured() {
  const el = document.getElementById('featured-grid');
  if (!el) return;
  el.innerHTML = propiedades.slice(0,6).map(crearCard).join('');
}
function aplicarFiltros() {
  const tipo = document.getElementById('filter-tipo')?.value || '';
  const precio = document.getElementById('filter-precio')?.value || '';
  const hab = parseInt(document.getElementById('filter-hab')?.value || '0');
  const texto = (document.getElementById('filter-texto')?.value || '').toLowerCase();
  let lista = propiedades.filter(p => {
    if (tipo && p.tipo !== tipo) return false;
    if (hab && p.hab < hab) return false;
    if (texto && !(`${p.nombre} ${p.ubicacion}`.toLowerCase().includes(texto))) return false;
    if (precio) {
      const [min, max] = precio.split('-').map(Number);
      if (p.precio < min || p.precio > max) return false;
    }
    return true;
  });
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;
  grid.innerHTML = lista.length ? lista.map(crearCard).join('') :
    '<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px 0">No se encontraron propiedades.</p>';
  const count = document.getElementById('result-count');
  if (count) count.textContent = lista.length + ' propiedad' + (lista.length !== 1 ? 'es' : '');
}
function abrirDetalle(id) {
  const p = propiedades.find(x => x.id === id);
  if (!p) return;
  const extras = p.extras.map(e => `<div>✓ ${e}</div>`).join('');
  document.getElementById('modal-content').innerHTML = `
    <button class="modal-close" onclick="cerrarModal()">×</button>
    <div class="modal-gallery"><img src="${p.img}" alt="${p.nombre}"></div>
    <div class="modal-body">
      <div class="modal-tags">
        <span>${tipoLabel(p.tipo)}</span>
        <span>${p.tag}</span>
        <span>📍 ${p.ubicacion}</span>
      </div>
      <div class="modal-header">
        <h2>${p.nombre}</h2>
        <div class="modal-price">${formatPrecio(p.precio)}</div>
      </div>
      <p class="modal-desc">${p.desc}</p>
      <div class="modal-features">
        ${p.hab ? `<div>🛏 ${p.hab} Habitaciones</div>` : ''}
        ${p.banos ? `<div>🛁 ${p.banos} Baños</div>` : ''}
        <div>📐 ${p.m2} m²</div>
        ${extras}
      </div>
      <div class="modal-actions">
        <button class="btn btn-gold" onclick="interesCompra(${p.id})">Quiero comprar / Agendar visita</button>
        <a href="contacto.html" class="btn btn-outline">Contactar asesor</a>
      </div>
    </div>`;
  document.getElementById('modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function cerrarModal(e) {
  if (e && e.target !== document.getElementById('modal') && !e.target.classList.contains('modal-close')) return;
  document.getElementById('modal')?.classList.remove('open');
  document.body.style.overflow = '';
}
function interesCompra(id) {
  const p = propiedades.find(x => x.id === id);
  if (!p) return;
  cerrarModal();
  try {
    const leads = JSON.parse(localStorage.getItem('inmo_leads') || '[]');
    leads.push({
      id: 'lead-' + Date.now(),
      nombre: 'Interesado en propiedad',
      email: '',
      tel: '',
      interes: 'Comprar: ' + p.nombre,
      mensaje: 'El usuario hizo clic en "Quiero comprar" para: ' + p.nombre + ' (' + p.ubicacion + ') - ' + p.precio,
      fecha: new Date().toLocaleString('es-MX'),
      status: 'nuevo'
    });
    localStorage.setItem('inmo_leads', JSON.stringify(leads));
  } catch(err) {}
  mostrarToast('¡Excelente elección! Un asesor te contactará sobre "' + p.nombre + '" en breve.');
}
function enviarFormulario(e) {
  e.preventDefault();
  const form = e.target;
  const inputs = form.querySelectorAll('input, select, textarea');
  let nombre = '', email = '', tel = '', interes = '', mensaje = '';
  inputs.forEach(el => {
    const ph = (el.placeholder || '').toLowerCase();
    const label = (el.previousElementSibling?.textContent || '').toLowerCase();
    const val = el.value || '';
    if (el.type === 'email' || ph.includes('email') || label.includes('correo') || label.includes('email')) email = val;
    else if (el.type === 'tel' || ph.includes('tel') || label.includes('teléfono') || label.includes('telefono')) tel = val;
    else if (el.tagName === 'SELECT' || label.includes('intere')) interes = val;
    else if (el.tagName === 'TEXTAREA' || label.includes('mensaje')) mensaje = val;
    else if (el.type === 'text' || label.includes('nombre')) nombre = val || nombre;
  });
  // fallback order for text inputs
  const texts = form.querySelectorAll('input[type="text"]');
  if (!nombre && texts[0]) nombre = texts[0].value;
  const lead = {
    id: 'lead-' + Date.now(),
    nombre: nombre || 'Sin nombre',
    email: email || '',
    tel: tel || '',
    interes: interes || '',
    mensaje: mensaje || '',
    fecha: new Date().toLocaleString('es-MX'),
    status: 'nuevo'
  };
  try {
    const leads = JSON.parse(localStorage.getItem('inmo_leads') || '[]');
    leads.push(lead);
    localStorage.setItem('inmo_leads', JSON.stringify(leads));
  } catch(err) {}
  mostrarToast('Mensaje enviado correctamente. Te contactaremos pronto.');
  form.reset();
}
function mostrarToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 4000);
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarModal(); });


// Header shrink on scroll
window.addEventListener('scroll', () => {
  const header = document.querySelector('header');
  if (header) header.classList.toggle('scrolled', window.scrollY > 40);
});
