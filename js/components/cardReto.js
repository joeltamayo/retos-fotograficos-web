import { cloudinaryUrl } from '../utils.js';

const ESTADO_BADGE = {
	activo: { label: 'Activo', className: 'bd-badge--activo' },
	finalizado: { label: 'Finalizado', className: 'bd-badge--finalizado' },
	programado: { label: 'Programado', className: 'bd-badge--programado' },
};

function escapeHtml(value) {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function toSafeNumber(value) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function formatearFechaDiaMes(iso) {
	if (!iso) {
		return '';
	}

	const fecha = new Date(iso);
	if (Number.isNaN(fecha.getTime())) {
		return '';
	}

	const parts = new Intl.DateTimeFormat('es-MX', {
		day: 'numeric',
		month: 'short',
	}).formatToParts(fecha);

	const dia = parts.find((part) => part.type === 'day')?.value ?? '';
	const mes = (parts.find((part) => part.type === 'month')?.value ?? '').replace('.', '');
	return `${dia} ${mes}`.trim();
}

function construirRangoFechas(reto) {
	const inicio = formatearFechaDiaMes(reto?.fecha_inicio);
	const fin = formatearFechaDiaMes(reto?.fecha_fin);

	if (inicio && fin) {
		return `${inicio} - ${fin}`;
	}

	return inicio || fin || 'Sin fecha';
}

function getEstadoBadge(estadoRaw) {
	const key = String(estadoRaw ?? '').trim().toLowerCase();
	return ESTADO_BADGE[key] ?? ESTADO_BADGE.programado;
}

function renderMedia(reto) {
	const imagenUrl = reto?.imagen_url ? escapeHtml(reto.imagen_url) : '';
	const alt = escapeHtml(reto?.titulo || 'Reto fotografico');
	const src = reto?.imagen_public_id
		? cloudinaryUrl(reto.imagen_public_id, { width: 600, height: 338, crop: 'fill' })
		: imagenUrl;

	if (src) {
		return `
			<div class="cr-img-wrapper">
				<img src="${src}" alt="${alt}" class="cr-img" loading="lazy" decoding="async" width="600" height="338">
			</div>
		`;
	}

	return `
		<div class="cr-img-wrapper">
			<div class="cr-img-placeholder" aria-label="Sin imagen">
				<i class="bi bi-image"></i>
			</div>
		</div>
	`;
}

function cardReto(reto = {}) {
	const badge = getEstadoBadge(reto.estado);
	const titulo = escapeHtml(reto.titulo || 'Reto sin titulo');
	const descripcion = escapeHtml(reto.descripcion || 'Sin descripcion disponible.');
	const rangoFechas = escapeHtml(construirRangoFechas(reto));
	const participantes = toSafeNumber(reto.total_participantes);
	const fotos = toSafeNumber(reto.total_fotografias);
	const id = escapeHtml(reto.id || '');

	return `
		<article class="cr-card" data-reto-id="${id}" role="button" tabindex="0">
			${renderMedia(reto)}
			<div class="cr-body">
				<div class="bd-badge ${badge.className}">${escapeHtml(badge.label)}</div>
				<h3 class="cr-titulo">${titulo}</h3>
				<p class="cr-descripcion">${descripcion}</p>
				<div class="cr-meta">
					<span class="cr-meta__item">
						<i class="bi bi-calendar3"></i>
						${rangoFechas}
					</span>
					<span class="cr-meta__item">
						<i class="bi bi-people"></i>
						${participantes}
					</span>
					<span class="cr-meta__item">
						<i class="bi bi-image"></i>
						${fotos}
					</span>
				</div>
			</div>
		</article>
	`;
}

function resolveContainer(contenedor) {
	if (typeof contenedor === 'string') {
		return document.querySelector(contenedor);
	}

	if (contenedor instanceof HTMLElement) {
		return contenedor;
	}

	return null;
}

function gridRetos(retos = [], contenedor) {
	const container = resolveContainer(contenedor);
	if (!container) {
		return;
	}

	if (!Array.isArray(retos) || retos.length === 0) {
		container.innerHTML = `
			<div class="cr-empty">
				<p>No hay retos disponibles</p>
			</div>
		`;
		return;
	}

	container.innerHTML = `
		<div class="cr-grid">
			${retos.map((reto) => cardReto(reto)).join('')}
		</div>
	`;

	container.querySelectorAll('[data-reto-id]').forEach((card) => {
		const retoId = card.getAttribute('data-reto-id');

		card.addEventListener('click', () => {
			if (retoId) {
				window.location.hash = `#/retos/${retoId}`;
			}
		});

		card.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter' && event.key !== ' ') {
				return;
			}

			event.preventDefault();

			if (retoId) {
				window.location.hash = `#/retos/${retoId}`;
			}
		});
	});
}

export { cardReto, gridRetos };

export default {
	cardReto,
	gridRetos,
};