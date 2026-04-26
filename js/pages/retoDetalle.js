import api from '../api.js';
import auth from '../auth.js';
import { cardFoto } from '../components/cardFoto.js';
import { abrirModalFoto } from '../components/modalFoto.js';
import { abrirModalSubirFoto } from '../components/modalSubirFoto.js';
import { renderPaginacion } from '../components/paginacion.js';
import {
	formatearFechaCorta,
	manejarErrorDePagina,
	mostrarErrorPagina,
	mostrarToast,
	skeletonCard,
} from '../utils.js';

const STYLE_ID = 'reto-detalle-page-styles';
const LIMITE_FOTOS = 9;

/**
 * Escapa texto para renderizar de forma segura en HTML.
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
 * Convierte un valor a número seguro.
 */
function toSafeNumber(value, fallback = 0) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Devuelve etiqueta de estado con formato amigable.
 */
function formatEstado(estado) {
	const normalized = String(estado ?? '').trim().toLowerCase();

	if (normalized === 'activo') {
		return 'Activo';
	}

	if (normalized === 'finalizado') {
		return 'Finalizado';
	}

	if (normalized === 'programado') {
		return 'Programado';
	}

	return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : 'Reto';
}

/**
 * Determina el estilo visual del badge por estado.
 */
function getEstadoBadgeStyle(estado) {
	const normalized = String(estado ?? '').trim().toLowerCase();

	if (normalized === 'activo') {
		return 'background:#22C55E;color:#FFFFFF;';
	}

	if (normalized === 'finalizado') {
		return 'background:#6B7280;color:#FFFFFF;';
	}

	return 'background:#3B82F6;color:#FFFFFF;';
}

/**
 * Inyecta estilos específicos de la página una sola vez.
 */
function ensureStyles() {
	if (document.getElementById(STYLE_ID)) {
		return;
	}

	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = `
		.reto-detalle-page {
			max-width: var(--content-max-width);
			margin: 0 auto;
			padding: 26px var(--page-padding-x) 50px;
		}

		.reto-detalle-breadcrumb {
			display: inline-flex;
			align-items: center;
			gap: 8px;
			font-size: 15px;
			font-weight: 600;
			color: #111827;
			text-decoration: none;
			margin-bottom: 16px;
		}

		.reto-banner {
			position: relative;
			height: 280px;
			border-radius: 14px;
			overflow: hidden;
			background: #111827;
		}

		.reto-banner__image {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}

		.reto-banner__overlay {
			position: absolute;
			inset: 0;
			background: linear-gradient(to top, rgba(0,0,0,0.76) 8%, rgba(0,0,0,0.38) 45%, rgba(0,0,0,0.05) 100%);
			display: flex;
			flex-direction: column;
			justify-content: flex-end;
			padding: 18px 20px;
		}

		.reto-banner__badges {
			display: inline-flex;
			gap: 8px;
			margin-bottom: 10px;
			flex-wrap: wrap;
		}

		.reto-banner__badge {
			padding: 4px 10px;
			border-radius: 9999px;
			font-size: 12px;
			font-weight: 600;
		}

		.reto-banner__badge--categoria {
			background: rgba(255, 255, 255, 0.16);
			border: 1px solid rgba(255, 255, 255, 0.55);
			color: #FFFFFF;
		}

		.reto-banner__title {
			margin: 0;
			font-size: 24px;
			line-height: 1.2;
			font-weight: 700;
			color: #FFFFFF;
		}

		.reto-banner__description {
			margin: 6px 0 0;
			font-size: 14px;
			line-height: 1.4;
			color: rgba(255,255,255,0.94);
			max-width: 720px;
		}

		.reto-stats-row {
			margin-top: 14px;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 16px;
			flex-wrap: wrap;
		}

		.reto-stats-items {
			display: flex;
			align-items: center;
			gap: 30px;
			flex-wrap: wrap;
		}

		.reto-stat-item {
			display: inline-flex;
			align-items: center;
			gap: 8px;
			color: #6B7280;
			font-size: 16px;
		}

		.reto-stat-item i {
			font-size: 18px;
		}

		.reto-cta-btn {
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

		.reto-section {
			margin-top: 26px;
		}

		.reto-section-title {
			margin: 0 0 14px;
			font-size: 34px;
			font-weight: 600;
			color: #111827;
		}

		.reto-top5-grid {
			display: grid;
			grid-template-columns: repeat(5, minmax(0, 1fr));
			gap: 16px;
		}

		.reto-fotos-grid {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 18px;
		}

		.reto-pagination-wrap {
			margin-top: 18px;
		}

		.reto-skeleton-grid {
			display: grid;
			gap: 16px;
		}

		.reto-skeleton-grid.top5 {
			grid-template-columns: repeat(5, minmax(0, 1fr));
		}

		.reto-skeleton-grid.fotos {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		@media (max-width: 1199.98px) {
			.reto-top5-grid {
				grid-template-columns: repeat(3, minmax(0, 1fr));
			}

			.reto-fotos-grid,
			.reto-skeleton-grid.fotos {
				grid-template-columns: repeat(2, minmax(0, 1fr));
			}

			.reto-skeleton-grid.top5 {
				grid-template-columns: repeat(3, minmax(0, 1fr));
			}
		}

		@media (max-width: 767.98px) {
			.reto-detalle-page {
				padding: 20px 16px 40px;
			}

			.reto-banner {
				height: 240px;
			}

			.reto-section-title {
				font-size: 28px;
			}

			.reto-top5-grid,
			.reto-fotos-grid,
			.reto-skeleton-grid.top5,
			.reto-skeleton-grid.fotos {
				grid-template-columns: repeat(1, minmax(0, 1fr));
			}
		}
	`;

	document.head.appendChild(style);
}

/**
 * Crea la estructura principal de la vista y devuelve referencias.
 */
function renderLayout(contenedor) {
	contenedor.innerHTML = `
		<section class="reto-detalle-page page-enter">
			<a class="reto-detalle-breadcrumb" href="#/retos">&larr; Volver a Retos</a>

			<div id="reto-banner-area"></div>
			<div id="reto-stats-area"></div>

			<section class="reto-section" aria-label="Top 5 del reto">
				<h2 class="reto-section-title">🏅 Top 5 del Reto</h2>
				<div id="reto-top5-area"></div>
			</section>

			<section class="reto-section" aria-label="Todas las fotografías">
				<h2 class="reto-section-title">Todas las Fotografías</h2>
				<div id="reto-fotos-area"></div>
				<div class="reto-pagination-wrap" id="reto-fotos-pagination"></div>
			</section>
		</section>
	`;

	return {
		banner: contenedor.querySelector('#reto-banner-area'),
		stats: contenedor.querySelector('#reto-stats-area'),
		top5: contenedor.querySelector('#reto-top5-area'),
		fotos: contenedor.querySelector('#reto-fotos-area'),
		pagination: contenedor.querySelector('#reto-fotos-pagination'),
	};
}

/**
 * Muestra placeholders de carga por sección.
 */
function renderSkeletons(refs) {
	refs.banner.innerHTML = skeletonCard('280px');
	refs.stats.innerHTML = skeletonCard('66px');
	refs.top5.innerHTML = `
		<div class="reto-skeleton-grid top5">
			${Array.from({ length: 5 }, () => skeletonCard('260px')).join('')}
		</div>
	`;
	refs.fotos.innerHTML = `
		<div class="reto-skeleton-grid fotos">
			${Array.from({ length: 6 }, () => skeletonCard('300px')).join('')}
		</div>
	`;
	refs.pagination.innerHTML = '';
}

/**
 * Verifica si el usuario autenticado participa en el reto actual.
 */
async function isParticipatingInReto(retoId) {
	if (!auth.estaAutenticado()) {
		return false;
	}

	try {
		const response = await api.get('/usuarios/me/participaciones', {
			pagina: 1,
			limite: 100,
		});

		const participaciones = Array.isArray(response?.participaciones) ? response.participaciones : [];
		return participaciones.some((item) => item?.reto_id === retoId);
	} catch {
		return false;
	}
}

/**
 * Renderiza el banner principal del reto.
 */
function renderBanner(refs, reto) {
	const imagen = reto?.imagen_url ? escapeHtml(reto.imagen_url) : '';
	const estadoTexto = formatEstado(reto?.estado);
	const categoria = escapeHtml(reto?.categoria_nombre || 'Sin categoría');

	refs.banner.innerHTML = `
		<article class="reto-banner">
			${imagen
				? `<img class="reto-banner__image" src="${imagen}" alt="${escapeHtml(reto?.titulo || 'Reto')}">`
				: '<div class="d-flex align-items-center justify-content-center w-100 h-100" style="color:#9CA3AF"><i class="bi bi-image" style="font-size:3rem"></i></div>'}

			<div class="reto-banner__overlay">
				<div class="reto-banner__badges">
					<span class="reto-banner__badge" style="${getEstadoBadgeStyle(reto?.estado)}">${escapeHtml(estadoTexto)}</span>
					<span class="reto-banner__badge reto-banner__badge--categoria">${categoria}</span>
				</div>

				<h1 class="reto-banner__title">${escapeHtml(reto?.titulo || 'Reto')}</h1>
				<p class="reto-banner__description">${escapeHtml(reto?.descripcion || 'Sin descripción')}</p>
			</div>
		</article>
	`;
}

/**
 * Resuelve la acción CTA según estado del reto y autenticación.
 */
function resolveCtaAction(reto, participating) {
	const estado = String(reto?.estado ?? '').toLowerCase();

	if (estado === 'finalizado') {
		return null;
	}

	if (!auth.estaAutenticado()) {
		return {
			label: 'Participar',
			icon: 'bi-box-arrow-in-right',
			action: async () => {
				window.location.hash = '#/login';
			},
		};
	}

	if (participating) {
		return {
			label: 'Subir Fotografía',
			icon: 'bi-upload',
			action: async () => {
				abrirModalSubirFoto(reto.id, reto.titulo, reto.descripcion || '');
			},
		};
	}

	return {
		label: 'Participar',
		icon: 'bi-person-plus',
		action: async () => {
			try {
				await api.post(`/retos/${encodeURIComponent(reto.id)}/participar`, {});
				mostrarToast('Te uniste al reto correctamente.', 'success');
			} catch (error) {
				const status = Number(error?.status);

				if (status === 401) {
					window.location.hash = '#/login';
					return;
				}

				if (status === 403) {
					mostrarToast('Acceso denegado para participar en este reto.', 'warning');
					return;
				}

				if (!status && (error instanceof TypeError || String(error?.message || '').toLowerCase().includes('fetch'))) {
					mostrarToast('Sin conexión. Revisa tu internet e intenta de nuevo.', 'warning');
					return;
				}

				mostrarToast(error?.error || error?.message || 'No se pudo completar la participación.', 'warning');
			}
		},
	};
}

/**
 * Renderiza la fila de estadísticas y conecta el CTA.
 */
function renderStats(refs, reto, participating) {
	const fechaInicio = formatearFechaCorta(reto?.fecha_inicio || '');
	const fechaFin = formatearFechaCorta(reto?.fecha_fin || '');
	const rangoFechas = [fechaInicio, fechaFin].filter(Boolean).join(' - ') || 'Sin fecha';
	const participantes = toSafeNumber(reto?.total_participantes, 0);
	const fotografias = toSafeNumber(reto?.total_fotografias, 0);
	const cta = resolveCtaAction(reto, participating);

	refs.stats.innerHTML = `
		<div class="reto-stats-row">
			<div class="reto-stats-items">
				<span class="reto-stat-item">
					<i class="bi bi-calendar3"></i>
					<span>${escapeHtml(rangoFechas)}</span>
				</span>

				<span class="reto-stat-item">
					<i class="bi bi-people"></i>
					<span>${participantes} Participantes</span>
				</span>

				<span class="reto-stat-item">
					<i class="bi bi-image"></i>
					<span>${fotografias} Fotografías</span>
				</span>
			</div>

			${cta
				? `
					<button type="button" class="reto-cta-btn" id="reto-cta-btn">
						<i class="bi ${cta.icon}"></i>
						<span>${escapeHtml(cta.label)}</span>
					</button>
				`
				: ''}
		</div>
	`;

	if (cta) {
		const btn = refs.stats.querySelector('#reto-cta-btn');
		btn?.addEventListener('click', async () => {
			await cta.action();
		});
	}
}

/**
 * Renderiza un conjunto de cards de foto en un grid controlado por la vista.
 */
function renderFotosGrid(contenedor, fotos = [], columnsClass = 'reto-fotos-grid') {
	if (!Array.isArray(fotos) || fotos.length === 0) {
		contenedor.innerHTML = '<p class="retos-empty">No hay fotografías para mostrar.</p>';
		return;
	}

	contenedor.innerHTML = `
		<div class="${columnsClass}">
			${fotos.map((foto) => cardFoto(foto)).join('')}
		</div>
	`;

	contenedor.querySelectorAll('.card-foto').forEach((card, index) => {
		const foto = fotos[index];

		card.addEventListener('mouseenter', () => {
			card.classList.add('is-hovering');
		});

		card.addEventListener('mouseleave', () => {
			card.classList.remove('is-hovering');
		});

		card.addEventListener('click', async () => {
			if (foto?.id) {
				await abrirModalFoto(foto.id);
			}
		});
	});
}

/**
 * Renderiza sección Top 5 con badges de posición en ámbar.
 */
function renderTop5(refs, top5 = []) {
	const normalizedTop = Array.isArray(top5)
		? [...top5]
			.sort((a, b) => toSafeNumber(b?.puntuacion_promedio, 0) - toSafeNumber(a?.puntuacion_promedio, 0))
			.slice(0, 5)
			.map((foto, index) => ({ ...foto, posicion: index + 1 }))
		: [];

	if (normalizedTop.length === 0) {
		refs.top5.innerHTML = '<p class="retos-empty">Aún no hay fotos destacadas en este reto.</p>';
		return;
	}

	renderFotosGrid(refs.top5, normalizedTop, 'reto-top5-grid');
}

/**
 * Carga el detalle de reto y una página de fotografías para mantener paginación reactiva.
 */
async function fetchDetalleReto(retoId, pagina) {
	return api.get(`/retos/${encodeURIComponent(retoId)}`, {
		pagina,
		limite: LIMITE_FOTOS,
	});
}

/**
 * Renderiza la sección paginada de todas las fotografías.
 */
function renderAllFotosSection(refs, state) {
	const fotosPayload = state.detalle?.fotografias || {};
	const items = Array.isArray(fotosPayload.items) ? fotosPayload.items : [];
	const total = Math.max(0, toSafeNumber(fotosPayload.total, items.length));
	const paginaActual = Math.max(1, toSafeNumber(fotosPayload.pagina, state.paginaActual));
	const totalPaginas = Math.max(1, Math.ceil(total / LIMITE_FOTOS));

	state.paginaActual = paginaActual;
	renderFotosGrid(refs.fotos, items, 'reto-fotos-grid');

	renderPaginacion(refs.pagination, paginaActual, totalPaginas, async (nuevaPagina) => {
		if (nuevaPagina === state.paginaActual || state.loadingFotos) {
			return;
		}

		state.loadingFotos = true;
		refs.fotos.innerHTML = `
			<div class="reto-skeleton-grid fotos">
				${Array.from({ length: 6 }, () => skeletonCard('300px')).join('')}
			</div>
		`;

		try {
			const response = await fetchDetalleReto(state.retoId, nuevaPagina);
			state.detalle = response;
			renderAllFotosSection(refs, state);
		} catch (error) {
			manejarErrorDePagina(refs.fotos, error, {
				notFoundMessage: 'No encontramos mas fotografias para este reto.',
				forbiddenMessage: 'No tienes permisos para ver estas fotografias.',
				fallbackMessage: 'No se pudieron cargar mas fotografias.',
			});
		} finally {
			state.loadingFotos = false;
		}
	});
}

/**
 * Render principal de la página detalle de reto.
 */
async function render(contenedor, params = {}) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	ensureStyles();

	const retoId = params?.id;
	if (!retoId) {
		mostrarErrorPagina(contenedor, '404', 'Reto no encontrado');
		return;
	}

	const refs = renderLayout(contenedor);
	renderSkeletons(refs);

	try {
		const [detalle, participating] = await Promise.all([
			fetchDetalleReto(retoId, 1),
			isParticipatingInReto(retoId),
		]);

		renderBanner(refs, detalle?.reto || {});
		renderStats(refs, detalle?.reto || {}, participating);
		renderTop5(refs, detalle?.top5 || []);

		const state = {
			retoId,
			detalle,
			paginaActual: 1,
			loadingFotos: false,
		};

		renderAllFotosSection(refs, state);
	} catch (error) {
		manejarErrorDePagina(contenedor, error, {
			notFoundMessage: 'Reto no encontrado',
			forbiddenMessage: 'No tienes permisos para ver este reto.',
			fallbackMessage: 'No se pudo cargar el detalle del reto.',
		});
	}
}

export { render };

export default {
	render,
};
