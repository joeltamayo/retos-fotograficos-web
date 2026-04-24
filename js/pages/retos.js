import api from '../api.js';
import auth from '../auth.js';
import { gridRetos } from '../components/cardReto.js';
import { renderPaginacion } from '../components/paginacion.js';
import { mostrarToast, skeletonCard } from '../utils.js';

const STYLE_ID = 'retos-page-styles';
const LIMITE_ACTIVOS = 6;
const LIMITE_FINALIZADOS = 6;

/**
 * Escapa texto para inyeccion segura en HTML.
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
 * Convierte valores a numero seguro.
 */
function toSafeNumber(value, fallback = 0) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Inyecta estilos de la vista una sola vez.
 */
function ensureStyles() {
	if (document.getElementById(STYLE_ID)) {
		return;
	}

	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = `
		.retos-page {
			max-width: var(--content-max-width);
			margin: 0 auto;
			padding: 34px var(--page-padding-x) 50px;
		}

		.retos-header {
			display: flex;
			justify-content: space-between;
			align-items: flex-start;
			gap: 16px;
			margin-bottom: 28px;
		}

		.retos-title {
			margin: 0;
			font-size: 36px;
			font-weight: 700;
			color: #111827;
		}

		.retos-description {
			margin: 6px 0 0;
			font-size: 16px;
			color: #6B7280;
		}

		.retos-create-btn {
			margin-top: 2px;
			border: 0;
			border-radius: 10px;
			background: #111827;
			color: #FFFFFF;
			padding: 10px 16px;
			font-weight: 600;
			font-size: 14px;
			display: inline-flex;
			align-items: center;
			gap: 8px;
		}

		.retos-section {
			margin-top: 18px;
		}

		.retos-section + .retos-section {
			margin-top: 34px;
		}

		.retos-section-title {
			margin: 0 0 14px;
			font-size: 30px;
			font-weight: 600;
			color: #111827;
		}

		.retos-skeleton-grid {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 24px;
		}

		.retos-footer {
			margin-top: 22px;
		}

		.retos-empty,
		.retos-error {
			margin: 0;
			padding: 16px;
			border-radius: 10px;
			font-size: 14px;
		}

		.retos-empty {
			background: #F8FAFC;
			color: #6B7280;
		}

		.retos-error {
			background: #FEE2E2;
			color: #991B1B;
		}

		@media (max-width: 1199.98px) {
			.retos-skeleton-grid {
				grid-template-columns: repeat(2, minmax(0, 1fr));
			}
		}

		@media (max-width: 991.98px) {
			.retos-page {
				padding: 24px 16px 40px;
			}

			.retos-title {
				font-size: 30px;
			}

			.retos-section-title {
				font-size: 24px;
			}

			.retos-header {
				flex-direction: column;
				align-items: flex-start;
			}
		}

		@media (max-width: 767.98px) {
			.retos-skeleton-grid {
				grid-template-columns: repeat(1, minmax(0, 1fr));
			}
		}
	`;

	document.head.appendChild(style);
}

/**
 * Construye el layout base de la vista y devuelve referencias DOM.
 */
function renderLayout(contenedor, esAdmin) {
	contenedor.innerHTML = `
		<section class="retos-page page-enter">
			<header class="retos-header">
				<div>
					<h1 class="retos-title">Todos los Retos</h1>
					<p class="retos-description">Participa en retos y demuestra tu talento</p>
				</div>

				${esAdmin
					? `
						<button type="button" class="retos-create-btn" id="retos-crear-btn">
							<i class="bi bi-plus"></i>
							<span>Crear Reto</span>
						</button>
					`
					: ''}
			</header>

			<section class="retos-section" aria-label="Retos activos">
				<h2 class="retos-section-title">Activos</h2>
				<div id="retos-activos-contenido"></div>
			</section>

			<section class="retos-section" aria-label="Retos finalizados">
				<h2 class="retos-section-title">Finalizados</h2>
				<div id="retos-finalizados-contenido"></div>
				<div class="retos-footer" id="retos-finalizados-paginacion"></div>
			</section>
		</section>
	`;

	return {
		crearBtn: contenedor.querySelector('#retos-crear-btn'),
		activos: contenedor.querySelector('#retos-activos-contenido'),
		finalizados: contenedor.querySelector('#retos-finalizados-contenido'),
		paginacion: contenedor.querySelector('#retos-finalizados-paginacion'),
	};
}

/**
 * Muestra skeletons en forma de grid de 3 columnas.
 */
function showSectionSkeleton(contenedor, cantidad = 3) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	contenedor.innerHTML = `
		<div class="retos-skeleton-grid">
			${Array.from({ length: cantidad }, () => skeletonCard('290px')).join('')}
		</div>
	`;
}

/**
 * Renderiza estado de error dentro de una sección.
 */
function showError(contenedor, mensaje) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	contenedor.innerHTML = `<p class="retos-error">${escapeHtml(mensaje)}</p>`;
}

/**
 * Renderiza estado vacío dentro de una sección.
 */
function showEmpty(contenedor, mensaje) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	contenedor.innerHTML = `<p class="retos-empty">${escapeHtml(mensaje)}</p>`;
}

/**
 * Intenta abrir el modal de admin para crear reto.
 * Si aún no existe el componente, muestra un toast informativo.
 */
async function abrirModalCrearRetoAdmin() {
	const rutas = [
		'../admin/modalCrearReto.js',
		'../components/admin/modalCrearReto.js',
		'../components/modalCrearReto.js',
		'../admin/retos/modalCrearReto.js',
	];

	for (const ruta of rutas) {
		try {
			const module = await import(ruta);
			const abrir = module?.abrirModalCrearReto || module?.default?.abrirModalCrearReto || module?.default;
			if (typeof abrir === 'function') {
				await abrir();
				return;
			}
		} catch {
			// Continuamos con la siguiente ruta posible.
		}
	}

	mostrarToast('El modal para crear reto aún no está disponible.', 'info');
}

/**
 * Renderiza el bloque de retos finalizados y su paginación.
 */
function renderFinalizadosSection(state) {
	const items = Array.isArray(state.finalizados.items) ? state.finalizados.items : [];

	if (items.length === 0) {
		showEmpty(state.refs.finalizados, 'No hay retos finalizados por ahora.');
		state.refs.paginacion.innerHTML = '';
		return;
	}

	gridRetos(items, state.refs.finalizados);

	const totalItems = toSafeNumber(state.finalizados.total, items.length);
	const totalPaginas = Math.max(1, Math.ceil(totalItems / LIMITE_FINALIZADOS));

	renderPaginacion(state.refs.paginacion, state.finalizados.paginaActual, totalPaginas, async (nuevaPagina) => {
		if (nuevaPagina === state.finalizados.paginaActual || state.finalizados.loading) {
			return;
		}

		state.finalizados.loading = true;
		showSectionSkeleton(state.refs.finalizados, 3);

		try {
			const response = await api.get('/retos/finalizados', {
				pagina: nuevaPagina,
				limite: LIMITE_FINALIZADOS,
			});

			state.finalizados.items = response?.retos || [];
			state.finalizados.total = toSafeNumber(response?.total, 0);
			state.finalizados.paginaActual = nuevaPagina;
			renderFinalizadosSection(state);
		} catch (error) {
			showError(state.refs.finalizados, error?.error || 'No se pudieron cargar los retos finalizados.');
		} finally {
			state.finalizados.loading = false;
		}
	});
}

/**
 * Render principal de la página de retos.
 */
async function render(contenedor, params = {}) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	void params;
	ensureStyles();

	const usuario = auth.getUsuario();
	const esAdmin = auth.esAdmin();
	const refs = renderLayout(contenedor, esAdmin);

	showSectionSkeleton(refs.activos, 3);
	showSectionSkeleton(refs.finalizados, 3);
	refs.paginacion.innerHTML = '';

	if (refs.crearBtn) {
		refs.crearBtn.addEventListener('click', () => {
			if (!usuario || !esAdmin) {
				mostrarToast('Solo administradores pueden crear retos.', 'warning');
				return;
			}

			void abrirModalCrearRetoAdmin();
		});
	}

	const activosPromise = api.get('/retos/activos');
	const finalizadosPromise = api.get('/retos/finalizados', {
		pagina: 1,
		limite: LIMITE_FINALIZADOS,
	});

	const [activosResult, finalizadosResult] = await Promise.allSettled([activosPromise, finalizadosPromise]);

	if (activosResult.status === 'fulfilled') {
		const activos = Array.isArray(activosResult.value?.retos) ? activosResult.value.retos.slice(0, LIMITE_ACTIVOS) : [];

		if (activos.length === 0) {
			showEmpty(refs.activos, 'No hay retos activos en este momento.');
		} else {
			gridRetos(activos, refs.activos);
		}
	} else {
		showError(refs.activos, activosResult.reason?.error || 'No se pudieron cargar los retos activos.');
	}

	if (finalizadosResult.status === 'fulfilled') {
		const state = {
			refs,
			finalizados: {
				items: Array.isArray(finalizadosResult.value?.retos) ? finalizadosResult.value.retos : [],
				total: toSafeNumber(finalizadosResult.value?.total, 0),
				paginaActual: 1,
				loading: false,
			},
		};

		renderFinalizadosSection(state);
	} else {
		showError(refs.finalizados, finalizadosResult.reason?.error || 'No se pudieron cargar los retos finalizados.');
		refs.paginacion.innerHTML = '';
	}
}

export { render };

export default {
	render,
};
