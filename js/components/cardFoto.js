import { abrirModalFoto } from './modalFoto.js';
import { cloudinaryUrl } from '../utils.js';

function escapeHtml(value) {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function formatNumber(value) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return '0.0';
	}

	return parsed.toFixed(1);
}

function formatCount(value) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? String(Math.max(0, Math.round(parsed))) : '0';
}

function getAvatarUrl(foto) {
	return foto?.foto_perfil_url || foto?.avatar_url || foto?.avatar || '';
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

function renderMedia(foto, posicionHtml) {
	const imagenUrl = foto?.imagen_url ? escapeHtml(foto.imagen_url) : '';
	const alt = escapeHtml(foto?.titulo || 'Fotografia');
	const src = foto?.imagen_public_id
		? cloudinaryUrl(foto.imagen_public_id, { width: 400, height: 400, crop: 'fill' })
		: imagenUrl;

	if (src) {
		return `
			<div class="cf-img-wrapper">
				${posicionHtml}
				<img class="cf-img" src="${src}" alt="${alt}" loading="lazy" decoding="async" width="400" height="400">
				<div class="cf-overlay" aria-hidden="true">
					<span class="cf-pill cf-pill--creatividad">
						<i class="bi bi-lightbulb"></i>
						${formatNumber(foto?.prom_creatividad ?? foto?.creatividad ?? 0)}
					</span>
					<span class="cf-pill cf-pill--composicion">
						<i class="bi bi-grid-3x3"></i>
						${formatNumber(foto?.prom_composicion ?? foto?.composicion ?? 0)}
					</span>
					<span class="cf-pill cf-pill--tema">
						<i class="bi bi-bullseye"></i>
						${formatNumber(foto?.prom_tema ?? foto?.tema ?? 0)}
					</span>
				</div>
			</div>
		`;
	}

	return `
		<div class="cf-img-wrapper">
			${posicionHtml}
			<div class="cf-img cf-img-placeholder" aria-label="Sin imagen">
				<i class="bi bi-image"></i>
			</div>
		</div>
	`;
}

function cardFoto(foto = {}, opciones = {}) {
	const avatarUrl = getAvatarUrl(foto);
	const usuario = escapeHtml(foto?.nombre_usuario || 'usuario');
	const titulo = escapeHtml(foto?.titulo || 'Fotografia sin titulo');
	const retoHtml = opciones.mostrarReto && foto?.reto_titulo
		? `<div class="cf-reto">${escapeHtml(foto.reto_titulo)}</div>`
		: '';

	const posicionHtml = foto?.posicion
		? `<span class="cf-badge-pos">#${escapeHtml(foto.posicion)}</span>`
		: '';

	return `
		<article class="cf-card" data-foto-id="${escapeHtml(foto?.id || '')}" tabindex="0" role="button">
			${renderMedia(foto, posicionHtml)}
			<div class="cf-body">
				<div class="cf-user">
					${avatarUrl
						? `<img class="avatar avatar--sm" src="${escapeHtml(avatarUrl)}" alt="Avatar de ${usuario}">`
						: `<span class="avatar avatar--sm"><i class="bi bi-person-square"></i></span>`}
					<span class="cf-username">@${usuario}</span>
				</div>
				${retoHtml}
				<h3 class="cf-titulo">${titulo}</h3>
				<div class="cf-stats">
					<span class="cf-stat cf-stat--stars">
						<i class="bi bi-star-fill"></i>
						<span>${formatNumber(foto?.puntuacion_promedio ?? foto?.promedio ?? 0)}</span>
					</span>
					<span class="cf-stat">
						<i class="bi bi-chat-square-dots"></i>
						<span>${formatCount(foto?.total_comentarios)}</span>
					</span>
				</div>
			</div>
		</article>
	`;
}

function gridFotos(fotos = [], contenedor, opciones = {}) {
	const container = resolveContainer(contenedor);
	if (!container) {
		return;
	}

	if (!Array.isArray(fotos) || fotos.length === 0) {
		container.innerHTML = '<p>No hay fotografias aun</p>';
		return;
	}

	container.innerHTML = `
		<div class="cf-grid">
			${fotos.map((foto) => cardFoto(foto, opciones)).join('')}
		</div>
	`;

	container.querySelectorAll('.cf-card').forEach((card, index) => {
		const foto = fotos[index];

		card.addEventListener('click', async () => {
			if (typeof opciones.onClickExtra === 'function') {
				opciones.onClickExtra(foto, card);
				return;
			}

			if (foto?.id) {
				await abrirModalFoto(foto.id);
			}
		});

		card.addEventListener('keydown', async (event) => {
			if (event.key !== 'Enter' && event.key !== ' ') {
				return;
			}

			event.preventDefault();
			if (typeof opciones.onClickExtra === 'function') {
				opciones.onClickExtra(foto, card);
				return;
			}

			if (foto?.id) {
				await abrirModalFoto(foto.id);
			}
		});
	});
}

export { cardFoto, gridFotos };

export default {
	cardFoto,
	gridFotos,
};
