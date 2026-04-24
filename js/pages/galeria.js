import api from '../api.js';
import { cardFoto } from '../components/cardFoto.js';
import { abrirModalFoto } from '../components/modalFoto.js';
import { renderPaginacion } from '../components/paginacion.js';
import { formatearFechaCorta, skeletonCard } from '../utils.js';

const STYLE_ID = 'galeria-page-styles';
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
 * Inyecta estilos específicos de la página de galería.
 */
function ensureStyles() {
	if (document.getElementById(STYLE_ID)) {
		return;
	}

	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = `
		.galeria-page {
			max-width: var(--content-max-width);
			margin: 0 auto;
			padding: 28px var(--page-padding-x) 48px;
		}

		.galeria-header {
			text-align: center;
			margin-bottom: 18px;
		}

		.galeria-title {
			margin: 0;
			font-size: 34px;
			font-weight: 700;
			color: #111827;
			display: inline-flex;
			align-items: center;
			gap: 8px;
		}

		.galeria-title i {
			color: #EAB308;
		}

		.galeria-subtitle {
			margin: 8px 0 0;
			font-size: 16px;
			color: #6B7280;
		}

		.galeria-order-row {
			display: flex;
			justify-content: center;
			align-items: center;
			gap: 10px;
			margin-bottom: 20px;
		}

		.galeria-order-label {
			font-size: 16px;
			color: #6B7280;
		}

		.galeria-order-select {
			border: 1px solid #E5E7EB;
			border-radius: 10px;
			background: #F9FAFB;
			padding: 10px 14px;
			font-size: 15px;
			color: #111827;
			min-width: 180px;
		}

		.galeria-grid {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 22px;
		}

		.galeria-card-slot .card-foto {
			height: 100%;
		}

		.galeria-pagination {
			margin-top: 20px;
		}

		.galeria-empty {
			margin: 8px 0 0;
			padding: 16px;
			border-radius: 10px;
			background: #F8FAFC;
			color: #6B7280;
			font-size: 14px;
			text-align: center;
		}

		.galeria-skeleton-grid {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 22px;
		}

		.galeria-skeleton-square {
			height: auto;
			aspect-ratio: 1/1;
			border-radius: 14px;
		}

		@media (max-width: 1199.98px) {
			.galeria-grid,
			.galeria-skeleton-grid {
				grid-template-columns: repeat(2, minmax(0, 1fr));
			}
		}

		@media (max-width: 767.98px) {
			.galeria-page {
				padding: 22px 16px 40px;
			}

			.galeria-title {
				font-size: 28px;
			}

			.galeria-grid,
			.galeria-skeleton-grid {
				grid-template-columns: repeat(1, minmax(0, 1fr));
			}

			.galeria-order-row {
				flex-direction: column;
				gap: 8px;
			}
		}
	`;

	document.head.appendChild(style);
}

/**
 * Renderiza la estructura base y devuelve referencias de secciones dinámicas.
 */
function renderLayout(contenedor, ordenActual) {
	const { inicio, fin } = getCurrentWeekRange();

	contenedor.innerHTML = `
		<section class="galeria-page page-enter">
			<header class="galeria-header">
				<h1 class="galeria-title"><i class="bi bi-stars"></i>Galería de la Semana</h1>
				<p class="galeria-subtitle">Semana del ${escapeHtml(inicio)} al ${escapeHtml(fin)}</p>
			</header>

			<div class="galeria-order-row">
				<span class="galeria-order-label">Ordenar por:</span>
				<select class="galeria-order-select" id="galeria-order-select">
					${Object.entries(ORDENES)
						.map(([value, label]) => `<option value="${value}" ${value === ordenActual ? 'selected' : ''}>${escapeHtml(label)}</option>`)
						.join('')}
				</select>
			</div>

			<div id="galeria-grid-area"></div>
			<div class="galeria-pagination" id="galeria-pagination-area"></div>
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
		<div class="galeria-skeleton-grid">
			${Array.from({ length: 9 }, () => `<div class="galeria-skeleton-square skeleton">${skeletonCard('100%')}</div>`).join('')}
		</div>
	`;
}

/**
 * Renderiza las cards de foto y conecta interacción de hover/click.
 */
function renderFotosGrid(contenedor, fotos = []) {
	if (!Array.isArray(fotos) || fotos.length === 0) {
		contenedor.innerHTML = '<p class="galeria-empty">No hay fotografías para mostrar.</p>';
		return;
	}

	contenedor.innerHTML = `
		<div class="galeria-grid">
			${fotos.map((foto) => `<div class="galeria-card-slot">${cardFoto(foto)}</div>`).join('')}
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
 * Render principal de la página de galería.
 */
async function render(contenedor, params = {}) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	void params;
	ensureStyles();

	const state = getStateFromHash();
	const refs = renderLayout(contenedor, state.orden);
	renderSkeletonGrid(refs.grid);
	refs.pagination.innerHTML = '';

	refs.select?.addEventListener('change', (event) => {
		const newOrden = String(event.target.value || 'mejores').toLowerCase();
		updateHashState(newOrden, 1);
	});

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
}

export { render };

export default {
	render,
};
