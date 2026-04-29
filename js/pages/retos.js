import api from '../api.js';
import auth from '../auth.js';
import { gridRetos } from '../components/cardReto.js';
import { renderPaginacion } from '../components/paginacion.js';
import { manejarErrorDePagina, mostrarToast, skeletonCard } from '../utils.js';

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
 * Construye el layout base de la vista y devuelve referencias DOM.
 */
function renderLayout(contenedor, esAdmin) {
	contenedor.innerHTML = `
		<section class="rt-page page-enter">
			<header class="rt-header">
				<div>
					<h1 class="rt-title">Todos los Retos</h1>
					<p class="rt-description">Participa en retos y demuestra tu talento</p>
				</div>

				${esAdmin
					? `
						<button type="button" class="rt-create-btn" id="retos-crear-btn">
							<i class="bi bi-plus"></i>
							<span>Crear Reto</span>
						</button>
					`
					: ''}
			</header>

			<section class="rt-section" aria-label="Retos activos">
				<h2 class="rt-section-title">Activos</h2>
				<div id="retos-activos-contenido"></div>
			</section>

			<section class="rt-section" aria-label="Retos finalizados">
				<h2 class="rt-section-title">Finalizados</h2>
				<div id="retos-finalizados-contenido"></div>
				<div class="rt-footer" id="retos-finalizados-paginacion"></div>
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
		<div class="rt-skeleton-grid">
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

	contenedor.innerHTML = `<p class="rt-error">${escapeHtml(mensaje)}</p>`;
}

/**
 * Renderiza estado vacío dentro de una sección.
 */
function showEmpty(contenedor, mensaje) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	contenedor.innerHTML = `<p class="rt-empty">${escapeHtml(mensaje)}</p>`;
}

/**
 * Intenta abrir el modal de admin para crear reto.
 * Si aún no existe el componente, muestra un toast informativo.
 */
async function abrirModalCrearRetoAdmin() {
	try {
		const module = await import('../admin/adminRetos.js');
		const abrir = module?.abrirModalCrearRetoAdmin;
		if (typeof abrir === 'function') {
			await abrir();
			return;
		}
	} catch {
		// ignore and show fallback
	}

	mostrarToast('El modal para crear reto aún no está disponible.', 'warning');
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

			// Auto-refresh when a reto is created or edited
			window.addEventListener('reto-creado-o-editado', async () => {
				try {
					const activosResp = await api.get('/retos/activos');
					const activosList = Array.isArray(activosResp?.retos) ? activosResp.retos.slice(0, LIMITE_ACTIVOS) : [];
					if (activosList.length === 0) {
						showEmpty(state.refs.activos, 'No hay retos activos en este momento.');
					} else {
						gridRetos(activosList, state.refs.activos);
					}

					const finalizadosResp = await api.get('/retos/finalizados', { pagina: 1, limite: LIMITE_FINALIZADOS });
					state.finalizados.items = Array.isArray(finalizadosResp?.retos) ? finalizadosResp.retos : [];
					state.finalizados.total = toSafeNumber(finalizadosResp?.total, 0);
					state.finalizados.paginaActual = 1;
					renderFinalizadosSection(state);
				} catch {
					// ignore errors during background refresh
				}
			});
		} catch (error) {
			manejarErrorDePagina(state.refs.finalizados, error, {
				notFoundMessage: 'No encontramos los retos finalizados solicitados.',
				forbiddenMessage: 'No tienes permisos para ver los retos finalizados.',
				fallbackMessage: 'No se pudieron cargar los retos finalizados.',
			});
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

	if (activosResult.status === 'rejected') {
		manejarErrorDePagina(contenedor, activosResult.reason, {
			notFoundMessage: 'No encontramos la lista de retos activos.',
			forbiddenMessage: 'No tienes permisos para consultar los retos activos.',
			fallbackMessage: 'No se pudieron cargar los retos activos.',
		});
		return;
	}

	const activos = Array.isArray(activosResult.value?.retos) ? activosResult.value.retos.slice(0, LIMITE_ACTIVOS) : [];

	if (activos.length === 0) {
		showEmpty(refs.activos, 'No hay retos activos en este momento.');
	} else {
		gridRetos(activos, refs.activos);
	}

	if (finalizadosResult.status === 'rejected') {
		manejarErrorDePagina(contenedor, finalizadosResult.reason, {
			notFoundMessage: 'No encontramos la lista de retos finalizados.',
			forbiddenMessage: 'No tienes permisos para consultar los retos finalizados.',
			fallbackMessage: 'No se pudieron cargar los retos finalizados.',
		});
		return;
	}

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


}

export { render };

export default {
	render,
};
