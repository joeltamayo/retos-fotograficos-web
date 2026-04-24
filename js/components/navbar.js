import auth from '../auth.js';
import { mostrarToast } from '../utils.js';

/**
 * Definicion de links centrales del navbar.
 */
const NAV_LINKS = [
	{ label: 'Inicio', hash: '#/home', icon: 'bi-house' },
	{ label: 'Retos', hash: '#/retos', icon: 'bi-grid' },
	{ label: 'Ranking', hash: '#/ranking', icon: 'bi-graph-up-arrow' },
	{ label: 'Galeria', hash: '#/galeria', icon: 'bi-stars' },
	{ label: 'Destacados', hash: '#/destacados', icon: 'bi-trophy' },
	{ label: 'Perfil', hash: '#/perfil', icon: 'bi-person' },
];

const NAVBAR_ID = 'photochallenge-navbar';
const COLLAPSE_ID = 'photochallenge-navbar-collapse';

let hashListenerRegistrado = false;

/**
 * Normaliza hash a ruta para comparar links activos.
 */
function getCurrentPathFromHash() {
	const rawHash = window.location.hash || '#/home';
	const hashNoSigno = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
	const [pathPart = '/home'] = hashNoSigno.split('?');
	const normalized = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
	return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
}

/**
 * Define si un link central debe mostrarse como activo.
 */
function isLinkActive(linkHash) {
	const currentPath = getCurrentPathFromHash();
	const linkPath = linkHash.replace('#', '');

	if (linkPath === '/perfil') {
		return currentPath.startsWith('/perfil');
	}

	if (linkPath === '/retos') {
		return currentPath === '/retos' || currentPath.startsWith('/retos/');
	}

	return currentPath === linkPath;
}

/**
 * Escapa texto para renderizar de forma segura en innerHTML.
 */
function escapeHtml(value) {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

/**
 * Retorna HTML para un link del menu central.
 */
function renderNavLink(link) {
	const activo = isLinkActive(link.hash);
	const activeStyles = activo
		? 'background:#111827;color:#FFFFFF;border-radius:9999px;'
		: 'background:transparent;color:#111827;';

	return `
		<a
			class="nav-link d-inline-flex align-items-center gap-2 px-3 py-2 fw-semibold"
			href="${link.hash}"
			data-nav-link="${link.hash}"
			style="font-size:14px;line-height:1;${activeStyles}"
		>
			<i class="bi ${link.icon}" style="font-size:14px"></i>
			<span>${escapeHtml(link.label)}</span>
		</a>
	`;
}

/**
 * Boton icono redondeado base para acciones a la derecha.
 */
function iconButton({ icon, filled = false, action = '', ariaLabel = '' }) {
	const baseStyle = filled
		? 'background:#111827;color:#FFFFFF;border:1px solid #111827;'
		: 'background:#FFFFFF;color:#111827;border:1px solid #E5E7EB;';

	return `
		<button
			type="button"
			class="btn d-inline-flex align-items-center justify-content-center"
			data-accion="${action}"
			aria-label="${escapeHtml(ariaLabel)}"
			style="width:36px;height:36px;border-radius:10px;${baseStyle}"
		>
			<i class="bi ${icon}" style="font-size:16px"></i>
		</button>
	`;
}

/**
 * Avatar del usuario autenticado con fallback a icono de perfil.
 */
function renderAvatar(usuario) {
	if (usuario?.foto_perfil_url) {
		return `
			<button
				type="button"
				class="btn p-0 border-0 bg-transparent"
				data-accion="ir-perfil"
				aria-label="Ir al perfil"
			>
				<img
					src="${escapeHtml(usuario.foto_perfil_url)}"
					alt="Avatar de ${escapeHtml(usuario.nombre_usuario || 'usuario')}"
					class="rounded-circle"
					style="width:36px;height:36px;object-fit:cover"
				>
			</button>
		`;
	}

	return iconButton({
		icon: 'bi-person',
		action: 'ir-perfil',
		ariaLabel: 'Ir al perfil',
	});
}

/**
 * Construye el bloque derecho segun sesion/rol actual.
 */
function renderRightActions(usuario) {
	if (!usuario) {
		return `
			${iconButton({ icon: 'bi-plus', action: 'anon-plus', ariaLabel: 'Accion principal' })}
			${iconButton({ icon: 'bi-person', action: 'ir-login', ariaLabel: 'Iniciar sesion' })}
		`;
	}

	const acciones = [];

	if (usuario.rol === 'administrador') {
		acciones.push(iconButton({ icon: 'bi-gear-fill', filled: true, action: 'ir-admin', ariaLabel: 'Panel de administracion' }));
	}

	acciones.push(iconButton({ icon: 'bi-plus', action: 'subir-foto', ariaLabel: 'Subir fotografia' }));
	acciones.push(renderAvatar(usuario));

	return acciones.join('');
}

/**
 * Marca visualmente el link activo cuando cambia el hash.
 */
function actualizarEstadoActivoLinks() {
	const links = document.querySelectorAll('[data-nav-link]');

	links.forEach((linkElement) => {
		const hash = linkElement.getAttribute('data-nav-link') || '#/home';
		const activo = isLinkActive(hash);

		if (activo) {
			linkElement.style.background = '#111827';
			linkElement.style.color = '#FFFFFF';
			linkElement.style.borderRadius = '9999px';
			return;
		}

		linkElement.style.background = 'transparent';
		linkElement.style.color = '#111827';
		linkElement.style.borderRadius = '9999px';
	});
}

/**
 * Cierra el menu colapsado en mobile luego de una accion de navegacion.
 */
function cerrarCollapseSiAbierto() {
	const collapseElement = document.getElementById(COLLAPSE_ID);
	if (!collapseElement || !window.bootstrap?.Collapse) {
		return;
	}

	const instancia = window.bootstrap.Collapse.getOrCreateInstance(collapseElement, {
		toggle: false,
	});

	if (collapseElement.classList.contains('show')) {
		instancia.hide();
	}
}

/**
 * Intenta abrir el modal de subir fotografia cuando el usuario pulsa "+".
 * Si no hay reto activo o no existe el modulo del modal, muestra un toast informativo.
 */
async function abrirModalSubirFoto() {
	const retoActivoId = sessionStorage.getItem('retoActivoId');

	if (!retoActivoId) {
		mostrarToast('No hay un reto activo disponible para subir foto.', 'warning');
		return;
	}

	try {
		const modalModule = await import('./modalSubirFoto.js');
		const abrir =
			modalModule.abrirModalSubirFoto
			|| modalModule.default?.abrirModalSubirFoto
			|| modalModule.default;

		if (typeof abrir === 'function') {
			abrir({ retoId: retoActivoId });
			return;
		}

		mostrarToast('El modal de subida aun no esta disponible.', 'info');
	} catch {
		mostrarToast('El modulo de subida aun no esta implementado.', 'info');
	}
}

/**
 * Asigna eventos a las acciones del lado derecho del navbar.
 */
function registrarEventosAcciones(usuario) {
	const navbar = document.getElementById(NAVBAR_ID);
	if (!navbar) {
		return;
	}

	navbar.addEventListener('click', async (event) => {
		const boton = event.target.closest('[data-accion]');
		if (!boton) {
			return;
		}

		const accion = boton.getAttribute('data-accion');

		if (accion === 'anon-plus' || accion === 'ir-login') {
			window.location.hash = '#/login';
			cerrarCollapseSiAbierto();
			return;
		}

		if (accion === 'ir-admin') {
			window.location.hash = '#/admin';
			cerrarCollapseSiAbierto();
			return;
		}

		if (accion === 'ir-perfil') {
			const nombreUsuario = usuario?.nombre_usuario;
			window.location.hash = nombreUsuario ? `#/perfil/${encodeURIComponent(nombreUsuario)}` : '#/login';
			cerrarCollapseSiAbierto();
			return;
		}

		if (accion === 'subir-foto') {
			await abrirModalSubirFoto();
			cerrarCollapseSiAbierto();
		}
	});
}

/**
 * Inyecta la barra de navegacion en #navbar-container.
 */
function renderNavbar() {
	const container = document.getElementById('navbar-container');
	if (!container) {
		return;
	}

	const usuario = auth.getUsuario();

	container.innerHTML = `
		<nav id="${NAVBAR_ID}" class="navbar navbar-expand-lg sticky-top bg-white" style="min-height:64px;border-bottom:1px solid #E5E7EB">
			<div class="container-fluid" style="width:min(100%,1280px);padding-inline:32px">
				<a class="navbar-brand d-inline-flex align-items-center gap-2 fw-bold m-0" href="#/home" style="font-size:1.35rem;color:#111827">
					<i class="bi bi-camera" style="font-size:1.1rem"></i>
					<span style="font-size:1.75rem">PhotoChallenge</span>
				</a>

				<button
					class="navbar-toggler border-0 p-1"
					type="button"
					data-bs-toggle="collapse"
					data-bs-target="#${COLLAPSE_ID}"
					aria-controls="${COLLAPSE_ID}"
					aria-expanded="false"
					aria-label="Toggle navigation"
				>
					<span class="navbar-toggler-icon"></span>
				</button>

				<div class="collapse navbar-collapse" id="${COLLAPSE_ID}">
					<div class="navbar-nav mx-auto align-items-lg-center gap-2 py-3 py-lg-0">
						${NAV_LINKS.map((link) => renderNavLink(link)).join('')}
					</div>

					<div class="d-flex align-items-center gap-2 ms-lg-auto pb-3 pb-lg-0">
						${renderRightActions(usuario)}
					</div>
				</div>
			</div>
		</nav>
	`;

	actualizarEstadoActivoLinks();
	registrarEventosAcciones(usuario);

	if (!hashListenerRegistrado) {
		window.addEventListener('hashchange', actualizarEstadoActivoLinks);
		hashListenerRegistrado = true;
	}
}

/**
 * Re-render del navbar para reflejar cambios de sesion o rol.
 */
function actualizarNavbar() {
	renderNavbar();
}

export { renderNavbar, actualizarNavbar };

export default {
	renderNavbar,
	actualizarNavbar,
};

