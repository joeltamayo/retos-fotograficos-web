import auth from '../auth.js';
import { mostrarErrorPagina, skeletonCard } from '../utils.js';

const ADMIN_TABS = [
	{ key: 'retos', label: 'Retos', icon: 'bi-grid', hashes: ['#/admin', '#/admin/retos'], modulePath: './adminRetos.js' },
	{ key: 'fotos', label: 'Fotos', icon: 'bi-image', hashes: ['#/admin/fotos'], modulePath: './adminFotos.js' },
	{ key: 'usuarios', label: 'Usuarios', icon: 'bi-people', hashes: ['#/admin/usuarios'], modulePath: './adminUsuarios.js' },
	/*{ key: 'comentarios', label: 'Comentarios', icon: 'bi-chat', hashes: ['#/admin/comentarios'] },
	  { key: 'notificaciones', label: 'Notificaciones', icon: 'bi-bell', hashes: ['#/admin/notificaciones'] },
	  { key: 'estadisticas', label: 'Estadísticas', icon: 'bi-bar-chart-line', hashes: ['#/admin/estadisticas'] },
	  { key: 'multimedia', label: 'Multimedia', icon: 'bi-collection-play', hashes: ['#/admin/multimedia'] }, */
];

/**
 * Escapa HTML para render seguro.
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
 * Obtiene la función render de un módulo cargado dinámicamente.
 */
function resolveRenderFunction(moduleExports) {
	if (typeof moduleExports?.render === 'function') {
		return moduleExports.render;
	}

	if (typeof moduleExports?.default === 'function') {
		return moduleExports.default;
	}

	if (typeof moduleExports?.default?.render === 'function') {
		return moduleExports.default.render;
	}

	return null;
}

/**
 * Devuelve hash limpio sin query para comparaciones del sub-router.
 */
function getCurrentHashPath() {
	const rawHash = window.location.hash || '#/admin';
	const hashWithoutSign = rawHash.startsWith('#') ? rawHash : `#${rawHash}`;
	const [path = '#/admin'] = hashWithoutSign.split('?');

	if (!path || path === '#') {
		return '#/admin';
	}

	return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

/**
 * Resuelve qué tab corresponde al hash actual.
 */
function resolveActiveTab() {
	const hashPath = getCurrentHashPath();

	for (const tab of ADMIN_TABS) {
		if (tab.hashes.includes(hashPath)) {
			return tab;
		}
	}

	if (hashPath.startsWith('#/admin')) {
		return ADMIN_TABS[0];
	}

	return ADMIN_TABS[0];
}


/**
 * Construye estructura base y devuelve referencias útiles.
 */
function renderLayout(contenedor, activeTabKey) {
	contenedor.innerHTML = `
		<section class="admin-page page-enter">
			<header class="admin-head">
				<h1 class="admin-title"><i class="bi bi-gear"></i>Panel de Administración</h1>
				<p class="admin-subtitle">Gestiona todos los aspectos de la plataforma desde un solo lugar</p>
			</header>

			<div class="admin-tabs-wrap" aria-label="Secciones del panel admin">
				<div class="admin-tabs" role="tablist">
					${ADMIN_TABS.map((tab) => `
						<button
							type="button"
							class="admin-tab-btn ${tab.key === activeTabKey ? 'is-active' : ''}"
							data-tab="${tab.key}"
							role="tab"
							aria-selected="${tab.key === activeTabKey ? 'true' : 'false'}"
						>
							<i class="bi ${tab.icon}"></i>
							<span>${escapeHtml(tab.label)}</span>
						</button>
					`).join('')}
				</div>
			</div>

			<div id="admin-content" class="admin-content"></div>
		</section>
	`;

	return {
		content: contenedor.querySelector('#admin-content'),
		tabs: Array.from(contenedor.querySelectorAll('.admin-tab-btn')),
	};
}

/**
 * Muestra placeholder de próxima sección para tabs no implementados.
 */
function renderUpcoming(contenedor, tab) {
	contenedor.innerHTML = `
		<section class="admin-upcoming" aria-label="Próximamente">
			<i class="bi ${escapeHtml(tab.icon)}"></i>
			<h3>${escapeHtml(tab.label)} - Próximamente</h3>
			<p>Esta sección estará disponible en una próxima iteración del panel.</p>
		</section>
	`;
}

/**
 * Muestra skeleton ligero mientras carga submódulo de admin.
 */
function renderContentSkeleton(contenedor) {
	contenedor.innerHTML = `
		<div class="admin-skeleton">
			${skeletonCard('74px')}
			${skeletonCard('220px')}
			${skeletonCard('220px')}
		</div>
	`;
}

/**
 * Carga y renderiza el submódulo de tab admin activo.
 */
async function renderTabContent(contenedor, tab) {
	renderContentSkeleton(contenedor);

	if (!tab.modulePath) {
		renderUpcoming(contenedor, tab);
		return;
	}

	try {
		const moduleExports = await import(tab.modulePath);
		const render = resolveRenderFunction(moduleExports);

		if (typeof render !== 'function') {
			renderUpcoming(contenedor, tab);
			return;
		}

		await render(contenedor, {
			section: tab.key,
		});
	} catch {
		renderUpcoming(contenedor, tab);
	}
}

/**
 * Actualiza hash al tab seleccionado sin recargar la página.
 */
function navigateToTab(tab) {
	const targetHash = tab.hashes[0] || '#/admin';
	if (window.location.hash !== targetHash) {
		window.location.hash = targetHash;
	}
}

/**
 * Render principal del shell de administración.
 */
async function render(contenedor, params = {}) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	void params;

	if (!auth.esAdmin()) {
		window.location.hash = '#/home';
		return;
	}

	const activeTab = resolveActiveTab();
	const refs = renderLayout(contenedor, activeTab.key);

	refs.tabs.forEach((button) => {
		button.addEventListener('click', () => {
			const key = String(button.dataset.tab || 'retos');
			const tab = ADMIN_TABS.find((item) => item.key === key) || ADMIN_TABS[0];
			navigateToTab(tab);
		});
	});

	await renderTabContent(refs.content, activeTab);
}

export { render };

export default {
	render,
};
