import api from '../api.js';
import auth from '../auth.js';
import { formatearFechaHora, mostrarToast } from '../utils.js';

const MODAL_ID = 'modal-foto';
const STYLE_ID = 'modal-foto-styles';

/**
 * Escapa texto para render seguro dentro de HTML inyectado.
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
 * Normaliza valores numericos para visualizacion.
 */
function toFixedOrZero(value, digits = 1) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed.toFixed(digits) : Number(0).toFixed(digits);
}

/**
 * Inyecta estilos del modal una sola vez.
 */
function ensureStyles() {
	if (document.getElementById(STYLE_ID)) {
		return;
	}

	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = `
		#${MODAL_ID} .modal-content {
			border: 0;
			border-radius: 20px;
			overflow: hidden;
			box-shadow: var(--shadow-modal);
		}

		.pc-modal-layout {
			display: flex;
			min-height: 560px;
		}

		.pc-modal-left {
			flex: 0 0 55%;
			max-width: 55%;
			background: #000000;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 8px;
		}

		.pc-modal-image {
			width: 100%;
			height: 100%;
			max-height: 540px;
			object-fit: contain;
			display: block;
		}

		.pc-modal-right {
			flex: 0 0 45%;
			max-width: 45%;
			background: #FFFFFF;
			display: flex;
			flex-direction: column;
		}

		.pc-modal-panel {
			padding: 18px 20px;
		}

		.pc-divider {
			height: 1px;
			background: #E5E7EB;
			margin: 0;
		}

		.pc-user-row {
			display: flex;
			align-items: center;
			gap: 10px;
		}

		.pc-user-avatar {
			width: 40px;
			height: 40px;
			border-radius: 50%;
			object-fit: cover;
			background: #F3F4F6;
		}

		.pc-user-name {
			color: #111827;
			font-size: 24px;
			font-weight: 700;
			text-decoration: none;
		}

		.pc-user-date {
			color: #9CA3AF;
			font-size: 20px;
			line-height: 1.2;
		}

		.pc-close {
			margin-left: auto;
			border: 0;
			background: transparent;
			color: #6B7280;
			font-size: 26px;
			line-height: 1;
		}

		.pc-title {
			margin: 14px 0 8px;
			font-size: 34px;
			line-height: 1.15;
			font-weight: 600;
			color: #111827;
		}

		.pc-description {
			margin: 0;
			font-size: 30px;
			line-height: 1.25;
			color: #6B7280;
		}

		.pc-rating-head {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 12px;
			margin-bottom: 12px;
		}

		.pc-rating-score {
			display: inline-flex;
			align-items: center;
			gap: 8px;
			font-size: 18px;
			font-weight: 700;
			color: #111827;
		}

		.pc-rating-score i {
			color: #F59E0B;
		}

		.pc-evaluar-btn {
			border: 1px solid #E5E7EB;
			background: #FFFFFF;
			border-radius: 10px;
			padding: 6px 12px;
			font-weight: 600;
			font-size: 14px;
			color: #111827;
		}

		.pc-stars-row {
			display: flex;
			align-items: center;
			gap: 8px;
			margin-bottom: 10px;
		}

		.pc-star-btn {
			border: 0;
			background: transparent;
			padding: 0;
			font-size: 28px;
			line-height: 1;
			color: #D1D5DB;
			cursor: pointer;
		}

		.pc-star-btn.is-active {
			color: #F59E0B;
		}

		.pc-star-btn:disabled {
			cursor: not-allowed;
			opacity: 0.6;
		}

		.pc-rating-note {
			margin: 0 0 10px;
			font-size: 13px;
			color: #6B7280;
		}

		.pc-breakdown {
			display: grid;
			gap: 6px;
			font-size: 14px;
		}

		.pc-breakdown-item {
			display: flex;
			align-items: center;
			gap: 8px;
			color: #6B7280;
		}

		.pc-breakdown-item strong {
			font-weight: 600;
		}

		.pc-breakdown-item.creatividad strong { color: #8B5CF6; }
		.pc-breakdown-item.composicion strong { color: #3B82F6; }
		.pc-breakdown-item.tema strong { color: #22C55E; }

		.pc-comments-head {
			display: inline-flex;
			align-items: center;
			gap: 8px;
			margin-bottom: 12px;
			font-size: 18px;
			font-weight: 600;
			color: #111827;
		}

		.pc-comments-list {
			max-height: 180px;
			overflow: auto;
			display: grid;
			gap: 12px;
			padding-right: 4px;
		}

		.pc-comment {
			display: grid;
			grid-template-columns: 34px 1fr;
			gap: 10px;
		}

		.pc-comment-avatar {
			width: 34px;
			height: 34px;
			border-radius: 50%;
			object-fit: cover;
			background: #F3F4F6;
		}

		.pc-comment-top {
			display: flex;
			align-items: baseline;
			gap: 8px;
		}

		.pc-comment-name {
			font-weight: 600;
			font-size: 14px;
			color: #111827;
		}

		.pc-comment-date {
			font-size: 12px;
			color: #9CA3AF;
		}

		.pc-comment-text {
			margin: 2px 0 0;
			font-size: 14px;
			line-height: 1.35;
			color: #374151;
			word-break: break-word;
		}

		.pc-comment-form {
			display: flex;
			align-items: center;
			gap: 8px;
			margin-top: 12px;
		}

		.pc-comment-input {
			flex: 1;
			border: 1px solid #E5E7EB;
			background: #F9FAFB;
			border-radius: 10px;
			padding: 10px 12px;
			font-size: 14px;
			color: #111827;
		}

		.pc-comment-input:focus {
			outline: none;
			border-color: #111827;
		}

		.pc-send-btn {
			width: 40px;
			height: 40px;
			border: 0;
			border-radius: 10px;
			background: #111827;
			color: #FFFFFF;
		}

		.pc-login-hint {
			margin: 12px 0 0;
			font-size: 14px;
			color: #6B7280;
		}

		.pc-login-hint a {
			color: #111827;
			font-weight: 600;
			text-decoration: none;
		}

		.pc-comments-empty {
			margin: 4px 0 0;
			font-size: 14px;
			color: #9CA3AF;
		}

		@media (max-width: 991.98px) {
			.pc-modal-layout {
				flex-direction: column;
				min-height: auto;
			}

			.pc-modal-left,
			.pc-modal-right {
				flex: 0 0 100%;
				max-width: 100%;
			}

			.pc-modal-left {
				min-height: 320px;
			}
		}
	`;

	document.head.appendChild(style);
}

/**
 * Retorna el contenedor de modales global o lo crea si no existe.
 */
function getModalContainer() {
	let container = document.getElementById('modal-container');

	if (!container) {
		container = document.createElement('div');
		container.id = 'modal-container';
		document.body.appendChild(container);
	}

	return container;
}

/**
 * Construye el esqueleto del modal para mostrar spinner durante la carga.
 */
function getLoadingModalHtml() {
	return `
		<div class="modal fade" id="${MODAL_ID}" tabindex="-1" aria-hidden="true">
			<div class="modal-dialog modal-xl modal-dialog-centered">
				<div class="modal-content">
					<div class="d-flex justify-content-center align-items-center" style="min-height:420px">
						<div class="spinner-border" style="color:var(--color-primary)"></div>
					</div>
				</div>
			</div>
		</div>
	`;
}

/**
 * Renderiza la lista de comentarios.
 */
function renderComentarios(comentarios) {
	if (!comentarios.length) {
		return '<p class="pc-comments-empty">Aun no hay comentarios.</p>';
	}

	return `
		<div class="pc-comments-list">
			${comentarios
				.map((comentario) => {
					const nombre = escapeHtml(comentario?.nombre_usuario || 'usuario');
					const fecha = escapeHtml(formatearFechaHora(comentario?.created_at || ''));
					const texto = escapeHtml(comentario?.contenido || '');
					const avatar = comentario?.foto_perfil_url ? escapeHtml(comentario.foto_perfil_url) : '';

					return `
						<article class="pc-comment">
							${avatar
								? `<img class="pc-comment-avatar" src="${avatar}" alt="Avatar de ${nombre}">`
								: '<span class="pc-comment-avatar d-inline-flex align-items-center justify-content-center" style="color:#9CA3AF"><i class="bi bi-person"></i></span>'}

							<div>
								<div class="pc-comment-top">
									<span class="pc-comment-name">${nombre}</span>
									<span class="pc-comment-date">${fecha}</span>
								</div>
								<p class="pc-comment-text">${texto}</p>
							</div>
						</article>
					`;
				})
				.join('')}
		</div>
	`;
}

/**
 * Renderiza botones de estrellas para calificar.
 */
function renderStarButtons(selectedStars, disabled) {
	return Array.from({ length: 5 }, (_, index) => {
		const starValue = index + 1;
		const activeClass = starValue <= selectedStars ? 'is-active' : '';
		const disabledAttr = disabled ? 'disabled' : '';

		return `
			<button
				type="button"
				class="pc-star-btn ${activeClass}"
				data-star-value="${starValue}"
				${disabledAttr}
				aria-label="Calificar con ${starValue} estrella(s)"
			>
				<i class="bi bi-star-fill"></i>
			</button>
		`;
	}).join('');
}

/**
 * Renderiza el cuerpo completo del modal con la foto y su informacion.
 */
function renderModalContent(state) {
	const foto = state.foto;
	const usuarioSesion = state.usuario;
	const nombreUsuario = escapeHtml(foto?.nombre_usuario || 'usuario');
	const titulo = escapeHtml(foto?.titulo || 'Fotografia');
	const descripcion = escapeHtml(foto?.descripcion || 'Sin descripcion');
	const fecha = escapeHtml(formatearFechaHora(foto?.fecha_publicacion || foto?.created_at || ''));
	const perfilHash = `#/perfil/${encodeURIComponent(foto?.nombre_usuario || '')}`;
	const avatar = foto?.foto_perfil_url ? escapeHtml(foto.foto_perfil_url) : '';
	const imagen = foto?.imagen_url ? escapeHtml(foto.imagen_url) : '';
	const totalCalificaciones = Number(foto?.total_calificaciones || 0);
	const scoreGeneral = toFixedOrZero(foto?.puntuacion_total ?? foto?.puntuacion_promedio ?? 0, 2);
	const selectedStars = state.miCalificacion ? Math.round((state.miCalificacion.total || 0) / 3) : 0;
	const esAutor = Boolean(usuarioSesion && foto?.usuario_id && usuarioSesion.id === foto.usuario_id);
	const disabledStars = esAutor;

	state.modalElement.querySelector('.modal-content').innerHTML = `
		<div class="pc-modal-layout">
			<section class="pc-modal-left">
				${imagen
					? `<img class="pc-modal-image" src="${imagen}" alt="${titulo}">`
					: '<div class="d-flex align-items-center justify-content-center w-100 h-100" style="color:#9CA3AF"><i class="bi bi-image" style="font-size:3rem"></i></div>'}
			</section>

			<section class="pc-modal-right">
				<div class="pc-modal-panel">
					<div class="pc-user-row">
						${avatar
							? `<img class="pc-user-avatar" src="${avatar}" alt="Avatar de ${nombreUsuario}">`
							: '<span class="pc-user-avatar d-inline-flex align-items-center justify-content-center" style="color:#9CA3AF"><i class="bi bi-person"></i></span>'}
						<div>
							<a class="pc-user-name" href="${perfilHash}">@${nombreUsuario}</a>
							<div class="pc-user-date">${fecha}</div>
						</div>
						<button type="button" class="pc-close" data-bs-dismiss="modal" aria-label="Cerrar">&times;</button>
					</div>

					<h2 class="pc-title">${titulo}</h2>
					<p class="pc-description">${descripcion}</p>
				</div>

				<hr class="pc-divider">

				<div class="pc-modal-panel" id="pc-rating-section">
					<div class="pc-rating-head">
						<div class="pc-rating-score">
							<i class="bi bi-star-fill"></i>
							<span>${scoreGeneral}</span>
							<span style="font-size:14px;font-weight:500;color:#6B7280">(${totalCalificaciones} calificaciones)</span>
						</div>
						<button type="button" class="pc-evaluar-btn" data-accion="evaluar">Evaluar</button>
					</div>

					<div class="pc-stars-row" data-stars-row>
						${renderStarButtons(selectedStars, disabledStars)}
					</div>

					${esAutor ? '<p class="pc-rating-note">No puedes calificar tu propia foto.</p>' : ''}

					<div class="pc-breakdown" id="pc-breakdown">
						<div class="pc-breakdown-item creatividad"><span>💡</span><strong>Creatividad:</strong> <span>${toFixedOrZero(foto?.prom_creatividad, 1)}</span></div>
						<div class="pc-breakdown-item composicion"><span>🎨</span><strong>Composicion:</strong> <span>${toFixedOrZero(foto?.prom_composicion, 1)}</span></div>
						<div class="pc-breakdown-item tema"><span>🎯</span><strong>Tema:</strong> <span>${toFixedOrZero(foto?.prom_tema, 1)}</span></div>
					</div>
				</div>

				<hr class="pc-divider">

				<div class="pc-modal-panel">
					<div class="pc-comments-head">
						<i class="bi bi-chat-left"></i>
						<span>${state.comentarios.length} Comentario(s)</span>
					</div>

					<div id="pc-comments-wrapper">
						${renderComentarios(state.comentarios)}
					</div>

					${state.autenticado
						? `
							<form class="pc-comment-form" id="pc-comment-form">
								<input class="pc-comment-input" id="pc-comment-input" type="text" placeholder="Escribe un comentario..." maxlength="280">
								<button class="pc-send-btn" type="submit" aria-label="Enviar comentario">
									<i class="bi bi-send"></i>
								</button>
							</form>
						`
						: '<p class="pc-login-hint">Inicia sesion para comentar. <a href="#/login">Ir a login</a></p>'}
				</div>
			</section>
		</div>
	`;
}

/**
 * Carga detalle de foto, comentarios y calificacion propia (si aplica).
 */
async function loadModalData(state) {
	const detailPromise = api.get(`/fotografias/${encodeURIComponent(state.fotografiaId)}`);
	const commentsPromise = api.get(`/fotografias/${encodeURIComponent(state.fotografiaId)}/comentarios`, {
		pagina: 1,
		limite: 20,
	});

	const myRatingPromise = state.autenticado
		? api.get(`/fotografias/${encodeURIComponent(state.fotografiaId)}/calificaciones/mia`)
		: Promise.resolve({ calificacion: null });

	const [detailResult, commentsResult, myRatingResult] = await Promise.allSettled([
		detailPromise,
		commentsPromise,
		myRatingPromise,
	]);

	if (detailResult.status !== 'fulfilled') {
		throw detailResult.reason;
	}

	state.foto = detailResult.value;
	state.comentarios = commentsResult.status === 'fulfilled'
		? commentsResult.value?.comentarios || []
		: [];

	state.miCalificacion = myRatingResult.status === 'fulfilled'
		? myRatingResult.value?.calificacion || null
		: null;
}

/**
 * Conecta eventos del modal (calificar, comentar y acciones auxiliares).
 */
function bindModalEvents(state) {
	const ratingSection = state.modalElement.querySelector('#pc-rating-section');
	const evaluarBtn = state.modalElement.querySelector('[data-accion="evaluar"]');
	const starsRow = state.modalElement.querySelector('[data-stars-row]');
	const form = state.modalElement.querySelector('#pc-comment-form');
	const input = state.modalElement.querySelector('#pc-comment-input');

	if (evaluarBtn && ratingSection) {
		evaluarBtn.addEventListener('click', () => {
			ratingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
		});
	}

	if (starsRow) {
		starsRow.querySelectorAll('[data-star-value]').forEach((starButton) => {
			starButton.addEventListener('click', async () => {
				const starValue = Number(starButton.getAttribute('data-star-value') || 0);

				if (!state.autenticado) {
					mostrarToast('Inicia sesion para calificar', 'warning');
					return;
				}

				if (state.usuario?.id && state.foto?.usuario_id && state.usuario.id === state.foto.usuario_id) {
					mostrarToast('No puedes calificar tu propia foto', 'warning');
					return;
				}

				try {
					await api.post(`/fotografias/${encodeURIComponent(state.fotografiaId)}/calificaciones`, {
						creatividad: starValue,
						composicion: starValue,
						tema: starValue,
					});

					state.miCalificacion = {
						creatividad: starValue,
						composicion: starValue,
						tema: starValue,
						total: starValue * 3,
					};

					state.foto = await api.get(`/fotografias/${encodeURIComponent(state.fotografiaId)}`);
					renderModalContent(state);
					bindModalEvents(state);
				} catch (error) {
					mostrarToast(error?.error || 'No se pudo guardar la calificacion.', 'danger');
				}
			});
		});
	}

	if (form && input) {
		form.addEventListener('submit', async (event) => {
			event.preventDefault();

			const contenido = input.value.trim();
			if (!contenido) {
				return;
			}

			const submitButton = form.querySelector('button[type="submit"]');
			if (submitButton) {
				submitButton.disabled = true;
			}

			try {
				const nuevoComentario = await api.post(`/fotografias/${encodeURIComponent(state.fotografiaId)}/comentarios`, {
					contenido,
				});

				state.comentarios.unshift(nuevoComentario);
				state.foto.total_comentarios = (Number(state.foto.total_comentarios) || 0) + 1;
				renderModalContent(state);
				bindModalEvents(state);
			} catch (error) {
				mostrarToast(error?.error || 'No se pudo enviar el comentario.', 'danger');
				if (submitButton) {
					submitButton.disabled = false;
				}
			}
		});
	}
}

/**
 * Muestra estado de error dentro del modal si no se pudo cargar el detalle.
 */
function renderLoadError(modalElement, message) {
	const content = modalElement.querySelector('.modal-content');
	if (!content) {
		return;
	}

	content.innerHTML = `
		<div class="p-4 p-md-5 text-center">
			<h3 class="mb-2" style="font-size:20px;font-weight:700;color:#111827">No se pudo cargar la fotografia</h3>
			<p class="m-0" style="color:#6B7280">${escapeHtml(message || 'Intenta nuevamente en unos segundos.')}</p>
		</div>
	`;
}

/**
 * Limpia el contenido del contenedor global de modales.
 */
function limpiarModal() {
	const container = document.getElementById('modal-container');
	if (container) {
		container.innerHTML = '';
	}
}

/**
 * Abre el modal de fotografia en formato de 2 columnas y conecta calificacion/comentarios.
 */
async function abrirModalFoto(fotografiaId) {
	if (!fotografiaId) {
		mostrarToast('No se pudo abrir la fotografia.', 'warning');
		return;
	}

	ensureStyles();

	const state = {
		fotografiaId,
		usuario: auth.getUsuario(),
		autenticado: auth.estaAutenticado(),
		foto: null,
		comentarios: [],
		miCalificacion: null,
		modalElement: null,
	};

	const container = getModalContainer();
	container.innerHTML = getLoadingModalHtml();

	state.modalElement = document.getElementById(MODAL_ID);

	// Requisito solicitado: uso directo de Bootstrap Modal JS.
	const modal = new bootstrap.Modal(document.getElementById('modal-foto'));
	modal.show();

	state.modalElement.addEventListener(
		'hidden.bs.modal',
		() => {
			limpiarModal();
		},
		{ once: true },
	);

	try {
		await loadModalData(state);
		renderModalContent(state);
		bindModalEvents(state);
	} catch (error) {
		renderLoadError(state.modalElement, error?.error || 'No fue posible obtener el detalle de la foto.');
	}
}

export { abrirModalFoto };

export default {
	abrirModalFoto,
};

