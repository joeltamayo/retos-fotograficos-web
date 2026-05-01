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
import { cloudinaryUrl } from '../utils.js';

const LIMITE_FOTOS = 9;
const KEY_RUTA_DESTINO = 'rutaDestino';

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
		return 'rd-banner__badge--activo';
	}

	if (normalized === 'finalizado') {
		return 'rd-banner__badge--finalizado';
	}

	return 'rd-banner__badge--programado';
}

/**
 * Redirige a login guardando la ruta actual para volver despues de autenticar.
 */
function redirectToLoginKeepingRoute() {
	const rutaActual = window.location.hash || '#/home';
	sessionStorage.setItem(KEY_RUTA_DESTINO, rutaActual);
	window.location.hash = '#/login';
}

/**
 * Crea la estructura principal de la vista y devuelve referencias.
 */
function renderLayout(contenedor) {
	contenedor.innerHTML = `
		<section class="rd-page page-enter">
			<a class="rd-breadcrumb" href="#/retos">&larr; Volver a Retos</a>

			<div id="reto-banner-area"></div>
			<div id="reto-stats-area"></div>

			<div id="reto-mi-participacion-area"></div>

			<section class="rd-section" aria-label="Top 5 del reto">
				<h2 class="rd-section-title">🏅 Top 5 del Reto</h2>
				<div id="reto-top5-area"></div>
			</section>

			<section class="rd-section" aria-label="Todas las fotografías">
				<h2 class="rd-section-title">Todas las Fotografías</h2>
				<div id="reto-fotos-area"></div>
				<div class="rd-pagination" id="reto-fotos-pagination"></div>
			</section>
		</section>
	`;

	return {
		banner: contenedor.querySelector('#reto-banner-area'),
		stats: contenedor.querySelector('#reto-stats-area'),
		miParticipacion: contenedor.querySelector('#reto-mi-participacion-area'),
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
	refs.miParticipacion.innerHTML = '';
	refs.top5.innerHTML = `
		<div class="rd-skeleton-grid rd-skeleton-grid--top5">
			${Array.from({ length: 5 }, () => skeletonCard('260px')).join('')}
		</div>
	`;
	refs.fotos.innerHTML = `
		<div class="rd-skeleton-grid rd-skeleton-grid--fotos">
			${Array.from({ length: 6 }, () => skeletonCard('300px')).join('')}
		</div>
	`;
	refs.pagination.innerHTML = '';
}

/**
 * Verifica si el usuario autenticado participa en el reto actual.
 * Devuelve el objeto de participación completo o false.
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
		const participacion = participaciones.find((item) => item?.reto_id === retoId);
		return participacion || false;
	} catch {
		return false;
	}
}

/**
 * Renderiza la sección "Mi participación" solo para el dueño de la foto.
 * Muestra su foto con badge de estado (pendiente/rechazada/aprobada)
 * y permite abrirla en el modal aunque no esté aprobada.
 */
function renderMiParticipacion(refs, participacion) {
	if (!participacion || !participacion.fotografia_id) {
		refs.miParticipacion.innerHTML = '';
		return;
	}

	const usuario = auth.getUsuario();
	const fotoEstado = participacion.foto_estado || 'revision';
	const esPropiaNoAprobada = fotoEstado !== 'aprobada';

	const fotoObj = {
		id: participacion.fotografia_id,
		imagen_url: participacion.foto_url || participacion.foto_imagen_url || '',
		imagen_public_id: participacion.foto_public_id || '',
		titulo: participacion.foto_titulo || 'Mi fotografía',
		nombre_usuario: usuario?.nombre_usuario || '',
		foto_perfil_url: usuario?.foto_perfil_url || '',
		total_comentarios: 0,
		puntuacion_promedio: 0,
		prom_creatividad: 0,
		prom_composicion: 0,
		prom_tema: 0,
		foto_estado: fotoEstado,
		es_propia: true,
	};

	refs.miParticipacion.innerHTML = `
		<section class="rd-section rd-mi-participacion" aria-label="Mi participación">
			<h2 class="rd-section-title">📷 Mi Fotografía</h2>
			<div class="rd-mi-participacion-grid" id="rd-mi-foto-grid"></div>
		</section>
	`;

	const gridEl = refs.miParticipacion.querySelector('#rd-mi-foto-grid');
	if (!gridEl) return;

	gridEl.innerHTML = `<div class="rd-mi-foto-wrap">${cardFoto(fotoObj)}</div>`;

	const card = gridEl.querySelector('.cf-card');
	if (card) {
		card.addEventListener('click', async () => {
			await abrirModalFoto(participacion.fotografia_id, { esPropiaNoAprobada });
		});
	}
}

/**
 * Renderiza el banner principal del reto.
 */
function renderBanner(refs, reto) {
	const imagen = reto?.imagen_public_id
		? cloudinaryUrl(reto.imagen_public_id, { width: 1200, quality: 'auto', crop: 'limit' })
		: (reto?.imagen_url ? escapeHtml(reto.imagen_url) : '');
	const estadoTexto = formatEstado(reto?.estado);
	const categoria = escapeHtml(reto?.categoria_nombre || 'Sin categoría');

	refs.banner.innerHTML = `
		<article class="rd-banner">
			${imagen
			? `<img class="rd-banner__image" src="${imagen}" alt="${escapeHtml(reto?.titulo || 'Reto')}">`
			: '<div class="u-center-content u-w-full u-h-full u-text-muted"><i class="bi bi-image u-icon-3xl"></i></div>'}

			<div class="rd-banner__overlay">
				<div class="rd-banner__badges">
					<span class="rd-banner__badge ${getEstadoBadgeStyle(reto?.estado)}">${escapeHtml(estadoTexto)}</span>
					<span class="rd-banner__badge rd-banner__badge--categoria">${categoria}</span>
				</div>

				<h1 class="rd-banner__title">${escapeHtml(reto?.titulo || 'Reto')}</h1>
				<p class="rd-banner__description">${escapeHtml(reto?.descripcion || 'Sin descripción')}</p>
			</div>
		</article>
	`;
}

/**
 * Resuelve la acción CTA según estado del reto y autenticación.
 */
function resolveCtaAction(reto, participating) {
	const estado = String(reto?.estado ?? '').toLowerCase();

	if (estado === 'finalizado') return null;

	if (!auth.estaAutenticado()) {
		return {
			label: 'Participar',
			icon: 'bi-box-arrow-in-right',
			action: async () => redirectToLoginKeepingRoute(),
		};
	}

	if (participating) {
		return {
			label: 'Ya estás participando',
			icon: 'bi-person-check',
			disabled: true,
			tooltip: 'Ya estás participando en este reto',
			action: async () => { },
		};
	}

	return {
		label: 'Participar',
		icon: 'bi-person-plus',
		action: async () => {
			try {
				await api.post(`/retos/${encodeURIComponent(reto.id)}/participar`, {});
				abrirModalSubirFoto(reto.id, reto.titulo, reto.descripcion || '');
			} catch (error) {
				const status = Number(error?.status);

				if (status === 401) {
					redirectToLoginKeepingRoute();
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

	const disabledAttr = cta?.disabled ? ' disabled aria-disabled="true"' : '';
	const titleAttr = cta?.tooltip ? ` title="${escapeHtml(cta.tooltip)}"` : '';

	refs.stats.innerHTML = `
		<div class="rd-stats-row">
			<div class="rd-stats-items">
				<span class="rd-stat-item">
					<i class="bi bi-calendar3"></i>
					<span>${escapeHtml(rangoFechas)}</span>
				</span>

				<span class="rd-stat-item">
					<i class="bi bi-people"></i>
					<span>${participantes} Participantes</span>
				</span>

				<span class="rd-stat-item">
					<i class="bi bi-image"></i>
					<span>${fotografias} Fotografías</span>
				</span>
			</div>

			${cta
			? `
					<button type="button" class="rd-cta-btn" id="reto-cta-btn"${disabledAttr}${titleAttr}>
						<i class="bi ${cta.icon}"></i>
						<span>${escapeHtml(cta.label)}</span>
					</button>
				`
			: ''}
		</div>
	`;

	if (cta && !cta.disabled) {
		const btn = refs.stats.querySelector('#reto-cta-btn');
		btn?.addEventListener('click', async () => {
			await cta.action();
		});
	}
}

/**
 * Renderiza un conjunto de cards de foto en un grid controlado por la vista.
 */
function renderFotosGrid(contenedor, fotos = [], columnsClass = 'rd-fotos-grid') {
	if (!Array.isArray(fotos) || fotos.length === 0) {
		contenedor.innerHTML = '<p class="rd-empty">No hay fotografías para mostrar.</p>';
		return;
	}

	contenedor.innerHTML = `
		<div class="${columnsClass}">
			${fotos.map((foto) => cardFoto(foto)).join('')}
		</div>
	`;

	contenedor.querySelectorAll('.cf-card').forEach((card, index) => {
		const foto = fotos[index];

		card.addEventListener('mouseenter', () => {
			card.classList.add('is-hovering');
		});

		card.addEventListener('mouseleave', () => {
			card.classList.remove('is-hovering');
		});

		card.addEventListener('click', async () => {
			if (foto?.id) {
				const esPropiaNoAprobada = Boolean(
					foto.es_propia
					&& (foto.foto_estado === 'revision' || foto.foto_estado === 'desaprobada'),
				);
				await abrirModalFoto(foto.id, { esPropiaNoAprobada });
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
		refs.top5.innerHTML = '<p class="rd-empty">Aún no hay fotos destacadas en este reto.</p>';
		return;
	}

	renderFotosGrid(refs.top5, normalizedTop, 'rd-top5-grid');
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
	renderFotosGrid(refs.fotos, items, 'rd-fotos-grid');

	renderPaginacion(refs.pagination, paginaActual, totalPaginas, async (nuevaPagina) => {
		if (nuevaPagina === state.paginaActual || state.loadingFotos) {
			return;
		}

		state.loadingFotos = true;
		refs.fotos.innerHTML = `
			<div class="rd-skeleton-grid rd-skeleton-grid--fotos">
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

	const retoId = params?.id;
	if (!retoId) {
		mostrarErrorPagina(contenedor, '404', 'Reto no encontrado');
		return;
	}

	const refs = renderLayout(contenedor);
	renderSkeletons(refs);

	try {
		const [detalle, participacion] = await Promise.all([
			fetchDetalleReto(retoId, 1),
			isParticipatingInReto(retoId),
		]);

		// participacion es el objeto completo o false
		const participating = Boolean(participacion);

		renderBanner(refs, detalle?.reto || {});
		renderStats(refs, detalle?.reto || {}, participating);
		renderMiParticipacion(refs, participacion || null);
		renderTop5(refs, detalle?.top5 || []);

		const state = {
			retoId,
			detalle,
			paginaActual: 1,
			loadingFotos: false,
			participating,
			refs,
		};

		renderAllFotosSection(refs, state);

		const handleFotoSubida = async (event) => {
			if (event.detail?.retoId === retoId) {
				state.participating = true;
				renderStats(refs, detalle?.reto || {}, true);
				// Recargar participación para mostrar la foto recién subida
				const nuevaParticipacion = await isParticipatingInReto(retoId);
				renderMiParticipacion(refs, nuevaParticipacion || null);
			}
		};

		window.addEventListener('fotografia-subida', handleFotoSubida);
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