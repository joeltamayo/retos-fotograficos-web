import api from '../api.js';
import { cardFoto } from '../components/cardFoto.js';
import { abrirModalFoto } from '../components/modalFoto.js';
import { renderPaginacion } from '../components/paginacion.js';
import { formatearFechaCorta, manejarErrorDePagina, skeletonCard } from '../utils.js';

const LIMITE_FOTOS = 9;

const ORDENES = {
	mejores: 'Mejores',
	recientes: 'Recientes',
	votadas: 'Más votadas',
	tendencia: 'Tendencia',
};

/**
 * Convierte valores a número entero seguro.
 */
function toSafeInt(value, fallback = 1) {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Escapa HTML para render seguro en texto dinámico.
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
 * Obtiene orden y página desde el hash actual de la galería.
 */
function getStateFromHash() {
	const rawHash = window.location.hash || '#/galeria';
	const hashWithoutSymbol = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
	const queryString = hashWithoutSymbol.includes('?') ? hashWithoutSymbol.split('?')[1] : '';
	const params = new URLSearchParams(queryString);

	const ordenRaw = String(params.get('orden') || 'mejores').toLowerCase();
	const orden = Object.prototype.hasOwnProperty.call(ORDENES, ordenRaw) ? ordenRaw : 'mejores';
	const pagina = Math.max(1, toSafeInt(params.get('pagina'), 1));

	return { orden, pagina };
}

/**
 * Actualiza el hash con el estado de galería para sincronizar URL y UI.
 */
function updateHashState(orden, pagina) {
	const safeOrden = Object.prototype.hasOwnProperty.call(ORDENES, orden) ? orden : 'mejores';
	const safePagina = Math.max(1, toSafeInt(pagina, 1));
	const newHash = `#/galeria?orden=${encodeURIComponent(safeOrden)}&pagina=${safePagina}`;

	if (window.location.hash !== newHash) {
		window.location.hash = newHash;
	}
}

/**
 * Calcula el rango de semana (lunes-domingo) para mostrar el subtítulo.
 */
function getCurrentWeekRange() {
	const now = new Date();
	const day = now.getDay();
	const mondayOffset = day === 0 ? -6 : 1 - day;
	const monday = new Date(now);
	monday.setDate(now.getDate() + mondayOffset);

	const sunday = new Date(monday);
	sunday.setDate(monday.getDate() + 6);

	return {
		inicio: formatearFechaCorta(monday.toISOString()),
		fin: formatearFechaCorta(sunday.toISOString()),
	};
}

/**
 * Renderiza la estructura base y devuelve referencias de secciones dinámicas.
 */
function renderLayout(contenedor, ordenActual) {
	const { inicio, fin } = getCurrentWeekRange();

	contenedor.innerHTML = `
		<section class="gl-page page-enter">
			<header class="gl-header">
				<h1 class="gl-title"><i class="bi bi-stars"></i>Galería de la Semana</h1>
				<p class="gl-subtitle">Semana del ${escapeHtml(inicio)} al ${escapeHtml(fin)}</p>
			</header>

			<div class="gl-order-row">
				<span class="gl-order-label">Ordenar por:</span>
				<select class="gl-order-select" id="galeria-order-select">
					${Object.entries(ORDENES)
						.map(([value, label]) => `<option value="${value}" ${value === ordenActual ? 'selected' : ''}>${escapeHtml(label)}</option>`)
						.join('')}
				</select>
			</div>

			<div id="galeria-grid-area"></div>
			<div class="gl-pagination" id="galeria-pagination-area"></div>
		</section>
	`;

	return {
		select: contenedor.querySelector('#galeria-order-select'),
		grid: contenedor.querySelector('#galeria-grid-area'),
		pagination: contenedor.querySelector('#galeria-pagination-area'),
	};
}

/**
 * Muestra 9 skeletons cuadrados durante la carga.
 */
function renderSkeletonGrid(contenedor) {
	contenedor.innerHTML = `
		<div class="gl-skeleton-grid">
			${Array.from({ length: 9 }, () => `<div class="gl-skeleton-square skeleton">${skeletonCard('100%')}</div>`).join('')}
		</div>
	`;
}

/**
 * Renderiza las cards de foto y conecta interacción de hover/click.
 */
function renderFotosGrid(contenedor, fotos = []) {
	if (!Array.isArray(fotos) || fotos.length === 0) {
		contenedor.innerHTML = '<p class="gl-empty">No hay fotografías para mostrar.</p>';
		return;
	}

	contenedor.innerHTML = `
		<div class="gl-grid">
			${fotos.map((foto) => `<div class="gl-card-slot">${cardFoto(foto)}</div>`).join('')}
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
				await abrirModalFoto(foto.id);
			}
		});
	});
}

/**
 * Render principal de la página de galería.
 */
async function render(contenedor, params = {}) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	void params;

	const state = getStateFromHash();
	const refs = renderLayout(contenedor, state.orden);
	renderSkeletonGrid(refs.grid);
	refs.pagination.innerHTML = '';

	refs.select?.addEventListener('change', (event) => {
		const newOrden = String(event.target.value || 'mejores').toLowerCase();
		updateHashState(newOrden, 1);
	});

	try {
		const response = await api.get('/galeria', {
			orden: state.orden,
			pagina: state.pagina,
			limite: LIMITE_FOTOS,
		});

		const fotosRaw = Array.isArray(response?.fotos) ? response.fotos : [];
		const fotos = state.orden === 'mejores'
			? fotosRaw.map((foto, index) => ({ ...foto, posicion: index < 3 ? index + 1 : undefined }))
			: fotosRaw;

		renderFotosGrid(refs.grid, fotos);

		const total = Math.max(0, toSafeInt(response?.total, fotos.length));
		const totalPaginas = Math.max(1, Math.ceil(total / LIMITE_FOTOS));

		renderPaginacion(refs.pagination, state.pagina, totalPaginas, (nuevaPagina) => {
			updateHashState(state.orden, nuevaPagina);
		});

		// Auto-refresh handlers: when a photo is uploaded/updated elsewhere, refresh current view
		const refreshGallery = async () => {
			try {
				const resp = await api.get('/galeria', {
					orden: state.orden,
					pagina: state.pagina,
					limite: LIMITE_FOTOS,
				});

				const raw = Array.isArray(resp?.fotos) ? resp.fotos : [];
				const mapped = state.orden === 'mejores'
					? raw.map((foto, index) => ({ ...foto, posicion: index < 3 ? index + 1 : undefined }))
					: raw;

				renderFotosGrid(refs.grid, mapped);

				const tot = Math.max(0, toSafeInt(resp?.total, mapped.length));
				const pages = Math.max(1, Math.ceil(tot / LIMITE_FOTOS));
				renderPaginacion(refs.pagination, state.pagina, pages, (nuevaPagina) => {
					updateHashState(state.orden, nuevaPagina);
				});
			} catch {
				// ignore background refresh errors
			}
		};

		window.addEventListener('fotografia-subida', refreshGallery);
		window.addEventListener('fotografia-actualizada', refreshGallery);
		window.addEventListener('reto-creado-o-editado', refreshGallery);
	} catch (error) {
		manejarErrorDePagina(contenedor, error, {
			notFoundMessage: 'No encontramos la galeria solicitada.',
			forbiddenMessage: 'No tienes permisos para acceder a esta galeria.',
			fallbackMessage: 'No se pudo cargar la galeria.',
		});
	}
}

export { render };

export default {
	render,
};
