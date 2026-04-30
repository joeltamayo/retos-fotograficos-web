import api from '../api.js';
import auth from '../auth.js';
import { formatearFechaHora, mostrarToast } from '../utils.js';
import { cloudinaryUrl } from '../utils.js';

const MODAL_ID = 'modal-foto';

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
					<div class="u-center-content u-min-h-420">
						<div class="app-spinner"></div>
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
		return '<p class="mf-comments-empty">Aun no hay comentarios.</p>';
	}

	return `
		<div class="mf-comments-list">
			${comentarios
				.map((comentario) => {
					const nombre = escapeHtml(comentario?.nombre_usuario || 'usuario');
					const fecha = escapeHtml(formatearFechaHora(comentario?.created_at || ''));
					const texto = escapeHtml(comentario?.contenido || '');
					const avatar = comentario?.foto_perfil_url ? escapeHtml(comentario.foto_perfil_url) : '';

					return `
						<article class="mf-comment">
							${avatar
								? `<img class="mf-comment-avatar" src="${avatar}" alt="Avatar de ${nombre}">`
								: '<span class="mf-comment-avatar u-center-content u-text-muted"><i class="bi bi-person"></i></span>'}

							<div>
								<div class="mf-comment-top">
									<span class="mf-comment-name">${nombre}</span>
									<span class="mf-comment-date">${fecha}</span>
								</div>
								<p class="mf-comment-text">${texto}</p>
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
function renderStarButtons(selectedStars, disabled, criterion) {
	return Array.from({ length: 5 }, (_, index) => {
		const starValue = index + 1;
		const activeClass = starValue <= selectedStars ? 'is-active' : '';
		const disabledAttr = disabled ? 'disabled' : '';

		return `
			<button
				type="button"
				class="mf-star-btn ${activeClass}"
				data-criterion="${criterion}"
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
	const avatar = foto?.foto_perfil_public_id
		? cloudinaryUrl(foto.foto_perfil_public_id, { width: 64, height: 64, crop: 'fill' })
		: (foto?.foto_perfil_url ? escapeHtml(foto.foto_perfil_url) : '');
	const imagen = foto?.imagen_public_id
		? cloudinaryUrl(foto.imagen_public_id, { width: 900, quality: 'auto', crop: 'limit' })
		: (foto?.imagen_url ? escapeHtml(foto.imagen_url) : '');
	const totalCalificaciones = Number(foto?.total_calificaciones || 0);
	const scoreGeneral = toFixedOrZero(foto?.puntuacion_total ?? foto?.puntuacion_promedio ?? 0, 2);
	const currentRatings = state.currentRatings || {
		creatividad: Number(state.miCalificacion?.creatividad || 0),
		composicion: Number(state.miCalificacion?.composicion || 0),
		tema: Number(state.miCalificacion?.tema || 0),
	};
	const totalCurrent = Number(currentRatings.creatividad || 0) + Number(currentRatings.composicion || 0) + Number(currentRatings.tema || 0);
	const promedioActual = (totalCurrent / 3) || 0;
	const esAutor = Boolean(usuarioSesion && foto?.usuario_id && usuarioSesion.id === foto.usuario_id);
	const disabledStars = esAutor;

	state.modalElement.querySelector('.modal-content').innerHTML = `
		<div class="mf-modal-layout">
			<section class="mf-modal-left">
				${imagen
					? `<img class="mf-modal-image" src="${imagen}" alt="${titulo}">`
					: '<div class="u-center-content u-w-full u-h-full u-text-muted"><i class="bi bi-image u-icon-3xl"></i></div>'}
			</section>

			<section class="mf-modal-right">
				<div class="mf-modal-panel">
					<div class="mf-user-row">
						${avatar
							? `<img class="mf-user-avatar" src="${avatar}" alt="Avatar de ${nombreUsuario}">`
							: '<span class="mf-user-avatar u-center-content u-text-muted"><i class="bi bi-person"></i></span>'}
						<div>
							<a class="mf-user-name" href="${perfilHash}">@${nombreUsuario}</a>
							<div class="mf-user-date">${fecha}</div>
						</div>
						<button type="button" class="mf-close" data-bs-dismiss="modal" aria-label="Cerrar">&times;</button>
					</div>

					<h2 class="mf-title">${titulo}</h2>
					<p class="mf-description">${descripcion}</p>
				</div>

				<hr class="mf-divider">

				<div class="mf-modal-panel" id="pc-rating-section">
					<div class="mf-rating-head">
						<div class="mf-rating-score">
							<i class="bi bi-star-fill"></i>
							<span>${scoreGeneral}</span>
							<span class="u-fs-14 u-fw-500 u-text-secondary">(${totalCalificaciones} calificaciones)</span>
						</div>
						<button type="button" class="mf-evaluar-btn" data-accion="evaluar">Evaluar</button>
					</div>

					<div class="mf-stars-group">
						<div class="mf-stars-line">
							<span class="mf-stars-label">Creatividad</span>
							<div class="mf-stars-row" data-stars-row="creatividad">
								${renderStarButtons(currentRatings.creatividad, disabledStars, 'creatividad')}
							</div>
						</div>
						<div class="mf-stars-line">
							<span class="mf-stars-label">Composición</span>
							<div class="mf-stars-row" data-stars-row="composicion">
								${renderStarButtons(currentRatings.composicion, disabledStars, 'composicion')}
							</div>
						</div>
						<div class="mf-stars-line">
							<span class="mf-stars-label">Tema</span>
							<div class="mf-stars-row" data-stars-row="tema">
								${renderStarButtons(currentRatings.tema, disabledStars, 'tema')}
							</div>
						</div>
						<p class="mf-rating-note">Tu selección actual: ${totalCurrent}/15 (${promedioActual.toFixed(1)})</p>
					</div>

					${esAutor ? '<p class="mf-rating-note">No puedes calificar tu propia foto.</p>' : ''}

					<div class="mf-breakdown" id="pc-breakdown">
						<div class="mf-breakdown-item mf-breakdown-item--creatividad"><span>💡</span><strong>Creatividad:</strong> <span>${toFixedOrZero(foto?.prom_creatividad, 1)}</span></div>
						<div class="mf-breakdown-item mf-breakdown-item--composicion"><span>🎨</span><strong>Composicion:</strong> <span>${toFixedOrZero(foto?.prom_composicion, 1)}</span></div>
						<div class="mf-breakdown-item mf-breakdown-item--tema"><span>🎯</span><strong>Tema:</strong> <span>${toFixedOrZero(foto?.prom_tema, 1)}</span></div>
					</div>
				</div>

				<hr class="mf-divider">

				<div class="mf-modal-panel">
					<div class="mf-comments-head">
						<i class="bi bi-chat-left"></i>
						<span>${state.comentarios.length} Comentario(s)</span>
					</div>

					<div id="pc-comments-wrapper">
						${renderComentarios(state.comentarios)}
					</div>

					${state.autenticado
						? `
							<form class="mf-comment-form" id="pc-comment-form">
								<input class="mf-comment-input" id="pc-comment-input" type="text" placeholder="Escribe un comentario..." maxlength="280">
								<button class="mf-send-btn" type="submit" aria-label="Enviar comentario">
									<i class="bi bi-send"></i>
								</button>
							</form>
						`
						: '<p class="mf-login-hint">Inicia sesion para comentar. <a href="#/login">Ir a login</a></p>'}
				</div>
			</section>
		</div>
	`;
}

/**
 * Carga detalle de foto, comentarios y calificacion propia (si aplica).
 */
async function loadModalData(state) {
	const detailPromise = api.get(state.detailEndpoint);
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
	const form = state.modalElement.querySelector('#pc-comment-form');
	const input = state.modalElement.querySelector('#pc-comment-input');

	if (evaluarBtn && ratingSection) {
		evaluarBtn.addEventListener('click', async () => {
			ratingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

			if (!state.autenticado) {
				mostrarToast('Inicia sesión para calificar.', 'warning');
				return;
			}

			if (state.usuario?.id && state.foto?.usuario_id && state.usuario.id === state.foto.usuario_id) {
				mostrarToast('No puedes calificar tu propia foto.', 'warning');
				return;
			}

			const payload = {
				creatividad: Number(state.currentRatings?.creatividad || 0),
				composicion: Number(state.currentRatings?.composicion || 0),
				tema: Number(state.currentRatings?.tema || 0),
			};

			if (payload.creatividad < 1 || payload.composicion < 1 || payload.tema < 1) {
				mostrarToast('Debes calificar creatividad, composición y tema.', 'warning');
				return;
			}

			try {
				await api.post(`/fotografias/${encodeURIComponent(state.fotografiaId)}/calificaciones`, payload);
				mostrarToast('Evaluado correctamente.', 'success');

				state.miCalificacion = {
					...payload,
					total: payload.creatividad + payload.composicion + payload.tema,
				};
				state.foto = await api.get(`/fotografias/${encodeURIComponent(state.fotografiaId)}`);
				renderModalContent(state);
				bindModalEvents(state);
				window.dispatchEvent(new CustomEvent('fotografia-actualizada', {
					detail: { fotografiaId: state.fotografiaId, foto: state.foto },
				}));
			} catch (error) {
				mostrarToast(error?.error || 'No se pudo guardar la evaluación.', 'danger');
			}
		});
	}

	state.modalElement.querySelectorAll('.mf-star-btn[data-criterion][data-star-value]').forEach((starButton) => {
		starButton.addEventListener('click', () => {
			if (state.usuario?.id && state.foto?.usuario_id && state.usuario.id === state.foto.usuario_id) {
				return;
			}

			const criterion = String(starButton.getAttribute('data-criterion') || '');
			const starValue = Number(starButton.getAttribute('data-star-value') || 0);
			if (!criterion || starValue < 1) {
				return;
			}

			state.currentRatings = state.currentRatings || { creatividad: 0, composicion: 0, tema: 0 };
			state.currentRatings[criterion] = starValue;
			renderModalContent(state);
			bindModalEvents(state);
		});
	});

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
				window.dispatchEvent(new CustomEvent('fotografia-actualizada', {
					detail: { fotografiaId: state.fotografiaId, foto: state.foto },
				}));
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
		<div class="mf-error u-text-center">
			<h3 class="u-mb-2 u-fs-20 u-fw-700">No se pudo cargar la fotografia</h3>
			<p class="u-text-secondary">${escapeHtml(message || 'Intenta nuevamente en unos segundos.')}</p>
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
async function abrirModalFoto(fotografiaId, options = {}) {
	if (!fotografiaId) {
		mostrarToast('No se pudo abrir la fotografia.', 'warning');
		return;
	}

	const useAdminEndpoint = Boolean(options?.useAdminEndpoint && auth.esAdmin());
	const detailEndpoint = useAdminEndpoint
		? `/admin/fotografias/${encodeURIComponent(fotografiaId)}`
		: `/fotografias/${encodeURIComponent(fotografiaId)}`;

	const state = {
		fotografiaId,
		detailEndpoint,
		usuario: auth.getUsuario(),
		autenticado: auth.estaAutenticado(),
		foto: null,
		comentarios: [],
		miCalificacion: null,
		currentRatings: null,
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
		state.currentRatings = {
			creatividad: Number(state.miCalificacion?.creatividad || 0),
			composicion: Number(state.miCalificacion?.composicion || 0),
			tema: Number(state.miCalificacion?.tema || 0),
		};
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

