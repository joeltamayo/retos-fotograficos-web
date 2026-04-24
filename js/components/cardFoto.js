import { abrirModalFoto } from './modalFoto.js';

/**
 * Estilos del componente. Se inyectan una sola vez desde el modulo para mantener
 * el hover del prototipo sin depender de un archivo CSS adicional.
 */
const STYLE_ID = 'card-foto-styles';

/**
 * Escapa contenido para renderizar HTML seguro desde datos dinamicos.
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
 * Convierte valor numerico a una representacion estable con un decimal.
 */
function formatNumber(value) {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return '0.0';
	}

	return parsed.toFixed(1);
}

/**
 * Redondea un valor para mostrar conteos de forma consistente.
 */
function formatCount(value) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? String(Math.max(0, Math.round(parsed))) : '0';
}

/**
 * Obtiene el avatar disponible en la foto o un placeholder neutro.
 */
function getAvatarUrl(foto) {
	return foto?.foto_perfil_url || foto?.avatar_url || foto?.avatar || '';
}

/**
 * Inyecta los estilos del componente una sola vez.
 */
function ensureStyles() {
	if (document.getElementById(STYLE_ID)) {
		return;
	}

	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = `
		.card-foto {
			background: #FFFFFF;
			border: 0;
			border-radius: 14px;
			box-shadow: var(--shadow-card);
			overflow: hidden;
			cursor: pointer;
			transition: transform 0.2s ease, box-shadow 0.2s ease;
			position: relative;
			height: 100%;
		}

		.card-foto:hover,
		.card-foto.is-hovering {
			transform: translateY(-3px);
			box-shadow: var(--shadow-card-hover);
		}

		.card-foto__media {
			position: relative;
			width: 100%;
			aspect-ratio: 1 / 1;
			overflow: hidden;
			background: #F3F4F6;
		}

		.card-foto__image {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}

		.card-foto__placeholder {
			width: 100%;
			height: 100%;
			display: flex;
			align-items: center;
			justify-content: center;
			color: #9CA3AF;
		}

		.card-foto__position {
			position: absolute;
			top: 8px;
			left: 8px;
			z-index: 2;
			min-width: 30px;
			height: 30px;
			padding: 0 8px;
			border-radius: 8px;
			background: #F59E0B;
			color: #FFFFFF;
			font-size: 14px;
			font-weight: 700;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
		}

		.card-foto__overlay {
			position: absolute;
			inset: auto 0 0 0;
			padding: 18px 12px 10px;
			background: linear-gradient(to top, rgba(0, 0, 0, 0.78), rgba(0, 0, 0, 0.28), rgba(0, 0, 0, 0));
			display: flex;
			justify-content: center;
			opacity: 0;
			transform: translateY(8px);
			transition: opacity 0.2s ease, transform 0.2s ease;
			pointer-events: none;
		}

		.card-foto:hover .card-foto__overlay,
		.card-foto.is-hovering .card-foto__overlay {
			opacity: 1;
			transform: translateY(0);
		}

		.card-foto__criteria {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 4px;
			padding: 5px 10px;
			border-radius: 9999px;
			color: #FFFFFF;
			font-size: 12px;
			font-weight: 700;
			line-height: 1;
			min-width: 72px;
			text-align: center;
		}

		.card-foto__criteria--creatividad { background: #8B5CF6; }
		.card-foto__criteria--composicion { background: #3B82F6; }
		.card-foto__criteria--tema { background: #22C55E; }

		.card-foto__body {
			padding: 12px 14px;
		}

		.card-foto__header {
			display: flex;
			align-items: center;
			gap: 8px;
			margin-bottom: 8px;
			min-width: 0;
		}

		.card-foto__avatar {
			width: 28px;
			height: 28px;
			border-radius: 9999px;
			object-fit: cover;
			flex: 0 0 auto;
			background: #F3F4F6;
		}

		.card-foto__avatar-placeholder {
			width: 28px;
			height: 28px;
			border-radius: 9999px;
			flex: 0 0 auto;
			background: #E5E7EB;
			color: #9CA3AF;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			font-size: 14px;
		}

		.card-foto__usuario {
			font-size: 13px;
			color: #6B7280;
			font-weight: 500;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.card-foto__reto {
			margin: -2px 0 6px;
			font-size: 12px;
			color: #9CA3AF;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.card-foto__titulo {
			margin: 0 0 8px;
			font-size: 14px;
			font-weight: 500;
			color: #111827;
			line-height: 1.35;
			overflow: hidden;
			display: -webkit-box;
			-webkit-line-clamp: 2;
			-webkit-box-orient: vertical;
		}

		.card-foto__meta {
			display: flex;
			align-items: center;
			gap: 10px;
			font-size: 13px;
			color: #6B7280;
			line-height: 1;
		}

		.card-foto__meta-item {
			display: inline-flex;
			align-items: center;
			gap: 4px;
		}

		.card-foto__meta-item--comentarios {
			color: #9CA3AF;
		}

		.card-foto__star {
			color: #F59E0B;
		}
	`;

	document.head.appendChild(style);
}

/**
 * Resuelve contenedor desde selector o elemento DOM.
 */
function resolveContainer(contenedor) {
	if (typeof contenedor === 'string') {
		return document.querySelector(contenedor);
	}

	if (contenedor instanceof HTMLElement) {
		return contenedor;
	}

	return null;
}

/**
 * Renderiza el bloque superior de media, con imagen o placeholder.
 */
function renderMedia(foto, posicionHtml) {
	const imagenUrl = foto?.imagen_url ? escapeHtml(foto.imagen_url) : '';
	const alt = escapeHtml(foto?.titulo || 'Fotografia');

	if (imagenUrl) {
		return `
			<div class="card-foto__media">
				${posicionHtml}
				<img class="card-foto__image" src="${imagenUrl}" alt="${alt}">
				<div class="card-foto__overlay" aria-hidden="true">
					<div class="d-flex align-items-center justify-content-center gap-2 flex-wrap">
						<span class="card-foto__criteria card-foto__criteria--creatividad">
							<i class="bi bi-lightbulb"></i>
							${formatNumber(foto?.prom_creatividad ?? foto?.creatividad ?? 0)}
						</span>
						<span class="card-foto__criteria card-foto__criteria--composicion">
							<i class="bi bi-grid-3x3"></i>
							${formatNumber(foto?.prom_composicion ?? foto?.composicion ?? 0)}
						</span>
						<span class="card-foto__criteria card-foto__criteria--tema">
							<i class="bi bi-bullseye"></i>
							${formatNumber(foto?.prom_tema ?? foto?.tema ?? 0)}
						</span>
					</div>
				</div>
			</div>
		`;
	}

	return `
		<div class="card-foto__media">
			${posicionHtml}
			<div class="card-foto__placeholder" aria-label="Sin imagen">
				<i class="bi bi-image" style="font-size:2rem"></i>
			</div>
		</div>
	`;
}

/**
 * Retorna HTML de una card de fotografia.
 * El hover se apoya en las reglas inyectadas por el modulo.
 */
function cardFoto(foto = {}, opciones = {}) {
	ensureStyles();

	const avatarUrl = getAvatarUrl(foto);
	const usuario = escapeHtml(foto?.nombre_usuario || 'usuario');
	const titulo = escapeHtml(foto?.titulo || 'Fotografia sin titulo');
	const retoHtml = opciones.mostrarReto && foto?.reto_titulo
		? `<div class="card-foto__reto">${escapeHtml(foto.reto_titulo)}</div>`
		: '';

	const posicionHtml = foto?.posicion
		? `<span class="card-foto__position">#${escapeHtml(foto.posicion)}</span>`
		: '';

	return `
		<article class="card-foto" data-foto-id="${escapeHtml(foto?.id || '')}">
			${renderMedia(foto, posicionHtml)}

			<div class="card-foto__body">
				<div class="card-foto__header">
					${avatarUrl
						? `<img class="card-foto__avatar" src="${escapeHtml(avatarUrl)}" alt="Avatar de ${usuario}">`
						: `<span class="card-foto__avatar-placeholder"><i class="bi bi-person"></i></span>`}
					<span class="card-foto__usuario">@${usuario}</span>
				</div>

				${retoHtml}

				<h3 class="card-foto__titulo">${titulo}</h3>

				<div class="card-foto__meta">
					<span class="card-foto__meta-item">
						<i class="bi bi-star-fill card-foto__star"></i>
						<span>${formatNumber(foto?.puntuacion_promedio ?? foto?.promedio ?? 0)}</span>
					</span>

					<span class="card-foto__meta-item card-foto__meta-item--comentarios">
						<i class="bi bi-chat-left"></i>
						<span>${formatCount(foto?.total_comentarios)}</span>
					</span>
				</div>
			</div>
		</article>
	`;
}

/**
 * Renderiza un grid de fotos, enlaza hover y click, y maneja el estado vacio.
 */
function gridFotos(fotos = [], contenedor, opciones = {}) {
	ensureStyles();

	const container = resolveContainer(contenedor);
	if (!container) {
		return;
	}

	if (!Array.isArray(fotos) || fotos.length === 0) {
		container.innerHTML = `
			<div class="d-flex flex-column justify-content-center align-items-center text-center p-5" style="min-height:220px;color:#6B7280">
				<i class="bi bi-image" style="font-size:2.25rem;color:#9CA3AF"></i>
				<p class="mt-3 mb-0 fw-medium">No hay fotografias aun</p>
			</div>
		`;
		return;
	}

	container.innerHTML = `
		<div class="row g-4">
			${fotos.map((foto) => `<div class="col-12 col-sm-6 col-xl-3">${cardFoto(foto, opciones)}</div>`).join('')}
		</div>
	`;

	container.querySelectorAll('.card-foto').forEach((card, index) => {
		const foto = fotos[index];

		card.addEventListener('mouseenter', () => {
			card.classList.add('is-hovering');
		});

		card.addEventListener('mouseleave', () => {
			card.classList.remove('is-hovering');
		});

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
