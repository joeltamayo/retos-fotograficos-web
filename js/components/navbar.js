import auth from '../auth.js';
import { cloudinaryUrl } from '../utils.js';

const NAV_LINKS = [
	{ label: 'Inicio', hash: '#/home', icon: 'bi-house' },
	{ label: 'Retos', hash: '#/retos', icon: 'bi-grid' },
	{ label: 'Ranking', hash: '#/ranking', icon: 'bi-graph-up-arrow' },
	{ label: 'Galeria', hash: '#/galeria', icon: 'bi-stars' },
];

const NAVBAR_ID = 'photochallenge-navbar';
const COLLAPSE_ID = 'photochallenge-navbar-collapse';

let hashListenerRegistrado = false;

function getCurrentPathFromHash() {
	const rawHash = window.location.hash || '#/home';
	const hashNoSigno = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
	const [pathPart = '/home'] = hashNoSigno.split('?');
	const normalized = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
	return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
}

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

function escapeHtml(value) {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function renderNavLink(link, forCollapse = false) {
	const activo = isLinkActive(link.hash);
	const activeClass = activo ? 'nb-link--active' : '';
	const collapseClass = forCollapse ? ' nb-link--collapse' : '';

	return `
		<a class="nb-link ${activeClass}${collapseClass}" href="${link.hash}" data-nav-link="${link.hash}">
			<i class="bi ${link.icon} nb-link__icon"></i>
			<span>${escapeHtml(link.label)}</span>
		</a>
	`;
}

function iconButton({ icon, filled = false, action = '', ariaLabel = '' }) {
	const variantClass = filled ? 'nb-btn--filled' : 'nb-btn--outline';

	return `
		<button
			type="button"
			class="nb-btn ${variantClass}"
			data-accion="${action}"
			aria-label="${escapeHtml(ariaLabel)}"
		>
			<i class="bi ${icon}"></i>
		</button>
	`;
}

function renderAvatar(usuario) {
	const isPerfilActivo = getCurrentPathFromHash().startsWith('/perfil');
	const activeClass = isPerfilActivo ? ' nb-avatar-btn--active' : '';
	const avatarSrc = usuario?.foto_perfil_url
		? escapeHtml(usuario.foto_perfil_url)
		: (usuario?.foto_perfil_public_id
			? cloudinaryUrl(usuario.foto_perfil_public_id, { width: 64, height: 64, crop: 'fill' })
			: '');

	if (avatarSrc) {
		return `
			<button
				type="button"
				class="nb-avatar-btn${activeClass}"
				data-accion="ir-perfil"
				aria-label="Ir al perfil"
			>
				<img src="${avatarSrc}" alt="Avatar de ${escapeHtml(usuario.nombre_usuario || 'usuario')}" class="nb-avatar">
			</button>
		`;
	}

	const variantClass = isPerfilActivo ? 'nb-btn--filled' : 'nb-btn--outline';

	return `
		<button
			type="button"
			class="nb-btn ${variantClass}"
			data-accion="ir-perfil"
			aria-label="Ir al perfil"
		>
			<i class="bi bi-person"></i>
		</button>
	`;
}

function renderRightActions(usuario) {
	if (!usuario) {
		return `
			${iconButton({ icon: 'bi-person', action: 'ir-login', ariaLabel: 'Iniciar sesion' })}
		`;
	}

	const acciones = [];

	if (usuario.rol === 'administrador') {
		acciones.push(iconButton({ icon: 'bi-gear-fill', filled: false, action: 'ir-admin', ariaLabel: 'Panel de administracion' }));
	}

	acciones.push(iconButton({ icon: 'bi-box-arrow-right', action: 'logout', ariaLabel: 'Cerrar sesion' }));
	acciones.push(renderAvatar(usuario));

	return acciones.join('');
}

function actualizarEstadoActivoLinks() {
	const links = document.querySelectorAll('[data-nav-link]');

	links.forEach((linkElement) => {
		const hash = linkElement.getAttribute('data-nav-link') || '#/home';
		const activo = isLinkActive(hash);
		linkElement.classList.toggle('nb-link--active', activo);
	});
}

function cerrarCollapseSiAbierto() {
	const collapseElement = document.getElementById(COLLAPSE_ID);
	if (!collapseElement) {
		return;
	}

	if (window.bootstrap?.Collapse) {
		const instancia = window.bootstrap.Collapse.getOrCreateInstance(collapseElement, { toggle: false });
		if (collapseElement.classList.contains('show')) {
			instancia.hide();
		}
		return;
	}

	collapseElement.classList.remove('show');
}

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

		if (accion === 'ir-login') {
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

		if (accion === 'logout') {
			await auth.logout();
			actualizarNavbar();
			cerrarCollapseSiAbierto();
		}
	});
}

function renderNavbar() {
	const container = document.getElementById('navbar-container');
	if (!container) {
		return;
	}

	const usuario = auth.getUsuario();

	container.innerHTML = `
		<nav id="${NAVBAR_ID}" class="nb-nav">
			<div class="nb-inner">
				<a class="nb-brand" href="#/home">
					<i class="bi bi-camera nb-brand__icon"></i>
					<span class="nb-brand__text">Retos fotográficos</span>
				</a>

				<div class="nb-links">
					${NAV_LINKS.map((link) => renderNavLink(link)).join('')}
				</div>

				<div class="nb-actions">
					${renderRightActions(usuario)}
				</div>

				<button
					type="button"
					class="nb-toggler"
					data-bs-toggle="collapse"
					data-bs-target="#${COLLAPSE_ID}"
					aria-controls="${COLLAPSE_ID}"
					aria-expanded="false"
					aria-label="Abrir menú"
				>
					<i class="bi bi-list"></i>
				</button>
			</div>

			<div id="${COLLAPSE_ID}" class="collapse nb-collapse">
				${NAV_LINKS.map((link) => renderNavLink(link, true)).join('')}
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

function actualizarNavbar() {
	renderNavbar();
}

export { renderNavbar, actualizarNavbar };

export default {
	renderNavbar,
	actualizarNavbar,
};
