import auth from '../auth.js';
import { mostrarErrorPagina, skeletonCard } from '../utils.js';

const STYLE_ID = 'admin-shell-styles';

const ADMIN_TABS = [
	{ key: 'retos', label: 'Retos', icon: 'bi-grid', hashes: ['#/admin', '#/admin/retos'], modulePath: './adminRetos.js' },
	{ key: 'fotos', label: 'Fotos', icon: 'bi-image', hashes: ['#/admin/fotos'], modulePath: './adminFotos.js' },
	{ key: 'usuarios', label: 'Usuarios', icon: 'bi-people', hashes: ['#/admin/usuarios'], modulePath: './adminUsuarios.js' },
	{ key: 'comentarios', label: 'Comentarios', icon: 'bi-chat', hashes: ['#/admin/comentarios'] },
	{ key: 'notificaciones', label: 'Notificaciones', icon: 'bi-bell', hashes: ['#/admin/notificaciones'] },
	{ key: 'estadisticas', label: 'Estadísticas', icon: 'bi-bar-chart-line', hashes: ['#/admin/estadisticas'] },
	{ key: 'multimedia', label: 'Multimedia', icon: 'bi-collection-play', hashes: ['#/admin/multimedia'] },
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
 * Inyecta estilos del shell admin una sola vez.
 */
function ensureStyles() {
	if (document.getElementById(STYLE_ID)) {
		return;
	}

	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = `
		.admin-page {
			max-width: var(--content-max-width);
			margin: 0 auto;
			padding: 24px var(--page-padding-x) 42px;
		}

		.admin-head {
			margin-bottom: 14px;
		}

		.admin-title {
			margin: 0;
			font-size: 30px;
			font-weight: 700;
			color: #111827;
			display: inline-flex;
			align-items: center;
			gap: 8px;
		}

		.admin-subtitle {
			margin: 6px 0 0;
			font-size: 16px;
			color: #6B7280;
		}

		.admin-tabs-wrap {
			margin-top: 18px;
			overflow-x: auto;
			padding-bottom: 4px;
		}

		.admin-tabs {
			display: inline-flex;
			align-items: center;
			gap: 6px;
			min-width: 100%;
			background: #F3F4F6;
			border-radius: 14px;
			padding: 4px;
		}

		.admin-tab-btn {
			border: 0;
			background: transparent;
			border-radius: 10px;
			padding: 8px 12px;
			font-size: 14px;
			font-weight: 600;
			color: #111827;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
			white-space: nowrap;
		}

		.admin-tab-btn.is-active {
			background: #FFFFFF;
			box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		}

		.admin-content {
			margin-top: 14px;
		}

		.admin-upcoming {
			background: #FFFFFF;
			border-radius: 14px;
			box-shadow: var(--shadow-card);
			padding: 36px 20px;
			text-align: center;
		}

		.admin-upcoming i {
			font-size: 44px;
			color: #9CA3AF;
		}

		.admin-upcoming h3 {
			margin: 10px 0 6px;
			font-size: 22px;
			font-weight: 700;
			color: #111827;
		}

		.admin-upcoming p {
			margin: 0;
			font-size: 14px;
			color: #6B7280;
		}

		.admin-skeleton {
			display: grid;
			gap: 12px;
		}

		@media (max-width: 991.98px) {
			.admin-page {
				padding: 18px 16px 36px;
			}

			.admin-title {
				font-size: 24px;
			}

			.admin-tabs {
				min-width: max-content;
			}
		}
	`;

	document.head.appendChild(style);
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

	ensureStyles();

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
