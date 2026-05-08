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

							<div class="mf-comment-body">
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
	const buttons = Array.from({ length: 5 }, (_, index) => {
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

	return `${buttons}<span class="mf-stars-value" aria-hidden="true">${selectedStars}</span>`;
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
	const imagenAlta = foto?.imagen_public_id
		? cloudinaryUrl(foto.imagen_public_id, { width: 2000, quality: 'auto', crop: 'limit' })
		: (foto?.imagen_url ? escapeHtml(foto.imagen_url) : '');
	const totalCalificaciones = Number(foto?.total_calificaciones || 0);
	const scoreGeneral = toFixedOrZero(foto?.puntuacion_total ?? foto?.puntuacion_promedio ?? 0, 2);
	const currentRatings = state.currentRatings || {
		creatividad: Number(state.miCalificacion?.creatividad || 0),
		composicion: Number(state.miCalificacion?.composicion || 0),
		tema: Number(state.miCalificacion?.tema || 0),
	};

	const showControls = Boolean(state.showRatingControls);
	const evaluarLabel = state.miCalificacion ? 'Modificar calificación' : 'Evaluar';
	const totalCurrent = Number(currentRatings.creatividad || 0) + Number(currentRatings.composicion || 0) + Number(currentRatings.tema || 0);
	const promedioActual = (totalCurrent / 3) || 0;
	const esAutor = Boolean(usuarioSesion && foto?.usuario_id && usuarioSesion.id === foto.usuario_id);
	const disabledStars = esAutor;

	state.modalElement.querySelector('.modal-content').innerHTML = `
		<div class="mf-modal-layout">
<section class="mf-img-col">
				${imagen
			? `<img class="mf-modal-image" src="${imagen}" alt="${titulo}">`
			: '<div class="u-center-content u-w-full u-h-full u-text-muted"><i class="bi bi-image u-icon-3xl"></i></div>'}
				${imagen
			? `
					<button
						type="button"
						class="mf-img-action"
						data-accion="ver-imagen"
						data-imagen-hi="${imagenAlta}"
						data-imagen-alt="${titulo}"
						aria-label="Ver imagen en grande"
					>
						<i class="bi bi-arrows-fullscreen"></i>
					</button>
				`
			: ''}
			</section>

			<section class="mf-modal-right">
				${foto?.estado === 'revision' ? `
					<div class="mf-pending-notice mf-pending-notice--revision" role="status" aria-live="polite">
						<i class="bi bi-clock-history" aria-hidden="true"></i>
						<div>
							<strong>Foto en revisión</strong>
							<p>Solo tú puedes ver esta imagen. Los demás usuarios no la verán hasta que un administrador la apruebe.</p>
						</div>
					</div>
				` : ''}
				${foto?.estado === 'desaprobada' ? `
					<div class="mf-pending-notice mf-pending-notice--rechazada" role="alert" aria-live="polite">
						<i class="bi bi-x-circle" aria-hidden="true"></i>
						<div>
							<strong>Foto rechazada</strong>
							<p>Esta foto fue rechazada por un administrador y no es visible para otros usuarios.</p>
						</div>
					</div>
				` : ''}

				<div class="mf-modal-panel">
					<div class="mf-user-row">
						${avatar
			? `<img class="mf-user-avatar" src="${avatar}" alt="Avatar de ${nombreUsuario}">`
			: '<span class="mf-user-avatar u-center-content u-text-muted"><i class="bi bi-person"></i></span>'}
							<a class="mf-user-name" href="${perfilHash}">@${nombreUsuario}</a>
							<div class="mf-user-date">${fecha}</div>
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
							<span>${scoreGeneral} <span class="mf-span-15">/ 15</span>
							<span class="u-fs-14 u-fw-500 u-text-secondary"> - (${totalCalificaciones} calificaciones)</span>
							<button type="button" class="mf-breakdown-toggle" data-toggle-breakdown aria-expanded="false" aria-label="Mostrar promedio de calificaciones">
								<i class="bi bi-chevron-down"></i>
							</button>
						</div>
						<button type="button" class="mf-evaluar-btn" data-accion="evaluar">${escapeHtml(evaluarLabel)}</button>
					</div>

					<div class="mf-breakdown ${state.showBreakdown ? '' : 'mf-breakdown--collapsed'}" id="pc-breakdown">
						
						<p class="mf-subtitulo">Promedio de calificaciones: </p> 
							<div class="mf-breakdown-item mf-breakdown-item--creatividad">
								<i class="bi bi-lightbulb-fill"></i>
								<strong>Creatividad</strong>
								<div class="mf-breakdown-bar" style="--bar-width: ${Math.min(100, (Number(foto?.prom_creatividad || 0) / 5) * 100)}%;">
									<div class="mf-breakdown-bar-fill"></div>
								</div>
								<span>${toFixedOrZero(foto?.prom_creatividad, 1)}</span>
							</div>
							<div class="mf-breakdown-item mf-breakdown-item--composicion">
								<i class="bi bi-palette-fill"></i>
								<strong>Composicion</strong>
								<div class="mf-breakdown-bar" style="--bar-width: ${Math.min(100, (Number(foto?.prom_composicion || 0) / 5) * 100)}%;">
									<div class="mf-breakdown-bar-fill"></div>
								</div>
								<span>${toFixedOrZero(foto?.prom_composicion, 1)}</span>
							</div>
							<div class="mf-breakdown-item mf-breakdown-item--tema">
								<i class="bi bi-ui-checks"></i>
								<strong>Tema</strong>
								<div class="mf-breakdown-bar" style="--bar-width: ${Math.min(100, (Number(foto?.prom_tema || 0) / 5) * 100)}%;">
									<div class="mf-breakdown-bar-fill"></div>
								</div>
								<span>${toFixedOrZero(foto?.prom_tema, 1)}</span>
							</div>
					</div>

					<div class="mf-stars-group ${showControls ? '' : 'collapsed'}">
							<p class="mf-subtitulo">Tu calificacion: </p> 

						<div class="mf-stars-line">
							<span class="mf-stars-label mf-stars-label--creatividad">Creatividad</span>
							<div class="mf-stars-row" data-stars-row="creatividad">
								${renderStarButtons(currentRatings.creatividad, disabledStars, 'creatividad')}
							</div>
						</div>
						<div class="mf-stars-line">
							<span class="mf-stars-label mf-stars-label--composicion">Composición</span>
							<div class="mf-stars-row" data-stars-row="composicion">
								${renderStarButtons(currentRatings.composicion, disabledStars, 'composicion')}
							</div>
						</div>
						<div class="mf-stars-line">
							<span class="mf-stars-label mf-stars-label--tema">Tema</span>
							<div class="mf-stars-row" data-stars-row="tema">
								${renderStarButtons(currentRatings.tema, disabledStars, 'tema')}
							</div>
						</div>
						<div class="mf-rating-footer">
							<p class="mf-rating-note">Tu selección actual: ${totalCurrent}/15 (${promedioActual.toFixed(1)})</p>
							<div class="mf-stars-actions">
								${state.autenticado && !esAutor ? '<button type="button" class="mf-save-rating-btn" data-accion="guardar-calificacion">Guardar calificación</button>' : ''}
							</div>
						</div>
					</div>

					${esAutor ? '<p class="mf-rating-note">No puedes calificar tu propia foto.</p>' : ''}

					
				</div>

				<hr class="mf-divider">

				<div class="mf-modal-panel mf-modal-panel--comments">
					<div class="mf-comments-head">
						<i class="bi bi-chat-dots"></i>
						<span>${state.comentarios.length} Comentarios</span>
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
 * Crea el visor de imagen a pantalla completa si no existe.
 */
function getOrCreateImageViewer() {
	let viewer = document.getElementById('mf-image-viewer');
	if (viewer) {
		return viewer;
	}

	viewer = document.createElement('div');
	viewer.id = 'mf-image-viewer';
	viewer.className = 'mf-image-viewer';
	viewer.innerHTML = `
		<div class="mf-viewer-backdrop" data-accion="cerrar-visor"></div>
		<div class="mf-viewer-panel" role="dialog" aria-modal="true" aria-label="Vista ampliada de imagen">
			<div class="mf-viewer-toolbar">
				<div class="mf-viewer-zoom">
					<button type="button" class="mf-viewer-btn" data-zoom="out" aria-label="Alejar">
						<i class="bi bi-zoom-out"></i>
					</button>
					<span class="mf-viewer-zoom-value" data-zoom-value>100%</span>
					<button type="button" class="mf-viewer-btn" data-zoom="in" aria-label="Acercar">
						<i class="bi bi-zoom-in"></i>
					</button>
					<button type="button" class="mf-viewer-btn" data-zoom="reset" aria-label="Restablecer zoom">
						<i class="bi bi-arrow-counterclockwise"></i>
					</button>
				</div>
				<button type="button" class="mf-viewer-btn" data-accion="cerrar-visor" aria-label="Cerrar visor">
					<i class="bi bi-x-lg"></i>
				</button>
			</div>
			<div class="mf-viewer-stage">
				<img class="mf-viewer-image" src="" alt="">
			</div>
		</div>
	`;

	document.body.appendChild(viewer);

	const stage = viewer.querySelector('.mf-viewer-stage');
	const img = viewer.querySelector('.mf-viewer-image');
	const zoomValue = viewer.querySelector('[data-zoom-value]');
	if (img) {
		img.setAttribute('draggable', 'false');
		img.addEventListener('dragstart', (event) => event.preventDefault());
	}
	const pan = { x: 0, y: 0 };
	viewer._pan = pan;
	let isPanning = false;
	let lastPointerX = 0;
	let lastPointerY = 0;
	let baseWidth = 0;
	let baseHeight = 0;
	const panSpeed = 1.6;
	const minVisibleRatio = 0.2;

	const updateBaseSize = () => {
		if (!stage || !img) {
			return;
		}
		const rect = img.getBoundingClientRect();
		baseWidth = rect.width;
		baseHeight = rect.height;
	};

	const clampPan = () => {
		const scale = Number(img.dataset.scale || 1);
		if (!stage || !baseWidth || !baseHeight) {
			pan.x = 0;
			pan.y = 0;
			return;
		}
		if (scale <= 1) {
			pan.x = 0;
			pan.y = 0;
			return;
		}
		const stageHalfW = stage.clientWidth / 2;
		const stageHalfH = stage.clientHeight / 2;
		const imgHalfW = (baseWidth * scale) / 2;
		const imgHalfH = (baseHeight * scale) / 2;
		const minVisibleX = Math.min(stage.clientWidth, baseWidth * scale) * minVisibleRatio;
		const minVisibleY = Math.min(stage.clientHeight, baseHeight * scale) * minVisibleRatio;
		const maxPanX = Math.max(0, imgHalfW + stageHalfW - minVisibleX);
		const maxPanY = Math.max(0, imgHalfH + stageHalfH - minVisibleY);
		pan.x = Math.max(-maxPanX, Math.min(maxPanX, pan.x));
		pan.y = Math.max(-maxPanY, Math.min(maxPanY, pan.y));
	};

	const applyTransform = () => {
		const scale = Number(img.dataset.scale || 1);
		clampPan();
		img.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;
	};

	viewer._updateBaseSize = updateBaseSize;
	viewer._applyTransform = applyTransform;
	const updateScale = (nextScale) => {
		const scale = Math.min(4, Math.max(1, nextScale));
		img.dataset.scale = String(scale);
		clampPan();
		applyTransform();
		if (zoomValue) {
			zoomValue.textContent = `${Math.round(scale * 100)}%`;
		}
	};

	viewer.addEventListener('click', (event) => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) {
			return;
		}
		if (target.closest('[data-accion="cerrar-visor"]')) {
			viewer.classList.remove('is-open');
			document.body.classList.remove('mf-viewer-open');
		}
		if (target.closest('[data-zoom="in"]')) {
			updateScale(Number(img.dataset.scale || 1) + 0.25);
		}
		if (target.closest('[data-zoom="out"]')) {
			updateScale(Number(img.dataset.scale || 1) - 0.25);
		}
		if (target.closest('[data-zoom="reset"]')) {
			updateScale(1);
		}
	});

	stage.addEventListener('wheel', (event) => {
		event.preventDefault();
		const delta = event.deltaY > 0 ? -0.15 : 0.15;
		updateScale(Number(img.dataset.scale || 1) + delta);
	}, { passive: false });

	stage.addEventListener('pointerdown', (event) => {
		if (Number(img.dataset.scale || 1) <= 1) {
			return;
		}
		event.preventDefault();
		if (!baseWidth || !baseHeight) {
			updateBaseSize();
		}
		isPanning = true;
		lastPointerX = event.clientX;
		lastPointerY = event.clientY;
		stage.classList.add('is-panning');
		stage.setPointerCapture(event.pointerId);
	});

	stage.addEventListener('pointermove', (event) => {
		if (!isPanning) {
			return;
		}
		const deltaX = event.clientX - lastPointerX;
		const deltaY = event.clientY - lastPointerY;
		pan.x += deltaX * panSpeed;
		pan.y += deltaY * panSpeed;
		lastPointerX = event.clientX;
		lastPointerY = event.clientY;
		applyTransform();
	});

	const stopPanning = (event) => {
		if (!isPanning) {
			return;
		}
		isPanning = false;
		stage.classList.remove('is-panning');
		if (event && stage.hasPointerCapture(event.pointerId)) {
			stage.releasePointerCapture(event.pointerId);
		}
	};

	stage.addEventListener('pointerup', stopPanning);
	stage.addEventListener('pointerleave', stopPanning);
	stage.addEventListener('pointercancel', stopPanning);

	window.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && viewer.classList.contains('is-open')) {
			viewer.classList.remove('is-open');
			document.body.classList.remove('mf-viewer-open');
		}
	});

	window.addEventListener('resize', () => {
		if (!viewer.classList.contains('is-open')) {
			return;
		}
		updateBaseSize();
		applyTransform();
	});

	return viewer;
}

/**
 * Abre el visor a pantalla completa con zoom.
 */
function openImageViewer(url, altText) {
	if (!url) {
		return;
	}
	const viewer = getOrCreateImageViewer();
	const img = viewer.querySelector('.mf-viewer-image');
	if (img) {
		img.src = url;
		img.alt = altText || 'Imagen ampliada';
		img.dataset.scale = '1';
		img.style.transform = 'translate(0px, 0px) scale(1)';
		const panState = viewer._pan;
		if (panState) {
			panState.x = 0;
			panState.y = 0;
		}
		img.addEventListener('load', () => {
			if (viewer._updateBaseSize) {
				viewer._updateBaseSize();
			}
			if (viewer._applyTransform) {
				viewer._applyTransform();
			}
		}, { once: true });
	}
	const zoomValue = viewer.querySelector('[data-zoom-value]');
	if (zoomValue) {
		zoomValue.textContent = '100%';
	}
	viewer.classList.add('is-open');
	document.body.classList.add('mf-viewer-open');
	requestAnimationFrame(() => {
		if (viewer._updateBaseSize) {
			viewer._updateBaseSize();
		}
		if (viewer._applyTransform) {
			viewer._applyTransform();
		}
	});
}

/**
 * Setea la variable CSS del blur de fondo después de renderizar.
 */
function setBlurBackground(state) {
	const imagenUrl = state.foto?.imagen_public_id
		? cloudinaryUrl(state.foto.imagen_public_id, { width: 900, quality: 'auto', crop: 'limit' })
		: (state.foto?.imagen_url ? state.foto.imagen_url : '');
	if (imagenUrl) {
		const imgCol = state.modalElement.querySelector('.mf-img-col');
		if (imgCol) {
			imgCol.style.setProperty('--mf-blur-src', `url("${imagenUrl}")`);
		}
	}
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
	const guardarBtn = state.modalElement.querySelector('[data-accion="guardar-calificacion"]');
	const form = state.modalElement.querySelector('#pc-comment-form');
	const input = state.modalElement.querySelector('#pc-comment-input');
	const viewImageBtn = state.modalElement.querySelector('[data-accion="ver-imagen"]');

	if (viewImageBtn) {
		viewImageBtn.addEventListener('click', () => {
			const url = viewImageBtn.getAttribute('data-imagen-hi') || '';
			const altText = viewImageBtn.getAttribute('data-imagen-alt') || '';
			openImageViewer(url, altText);
		});
	}

	const breakdownToggle = state.modalElement.querySelector('[data-toggle-breakdown]');
	if (breakdownToggle) {
		breakdownToggle.addEventListener('click', () => {
			state.showBreakdown = !state.showBreakdown;
			const breakdown = state.modalElement.querySelector('#pc-breakdown');
			if (breakdown) {
				breakdown.classList.toggle('mf-breakdown--collapsed');
				breakdownToggle.setAttribute('aria-expanded', state.showBreakdown ? 'true' : 'false');
			}
		});
	}

	if (evaluarBtn && ratingSection) {
		evaluarBtn.addEventListener('click', async () => {
			const starsGroup = state.modalElement.querySelector('.mf-stars-group');
			const isAuthor = Boolean(state.usuario?.id && state.foto?.usuario_id && state.usuario.id === state.foto.usuario_id);
			const isCollapsed = starsGroup && starsGroup.classList.contains('collapsed');

			if (!state.autenticado) {
				mostrarToast('Inicia sesión para calificar.', 'warning');
				return;
			}

			// El botón solo actúa como switch de despliegue/ocultado.
			if (isCollapsed) {
				if (isAuthor) {
					mostrarToast('No puedes calificar tu propia foto.', 'warning');
					return;
				}

				if (starsGroup) starsGroup.classList.remove('collapsed');
				state.showRatingControls = true;
				ratingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
				return;
			}

			if (starsGroup) starsGroup.classList.add('collapsed');
			state.showRatingControls = false;
			ratingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
		});
	}

	if (guardarBtn && ratingSection) {
		guardarBtn.addEventListener('click', async () => {
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
				renderModalContent(state);			setBlurBackground(state);				bindModalEvents(state);
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
			setBlurBackground(state);
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
				renderModalContent(state);			setBlurBackground(state);				bindModalEvents(state);
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

	// esPropiaNoAprobada: la foto es del usuario autenticado y está en revision
	// o desaprobada. Se usa el endpoint /mia para que el backend devuelva la foto
	// aunque no esté aprobada, sin exponer fotos ajenas no aprobadas.
	const esPropiaNoAprobada = Boolean(options?.esPropiaNoAprobada && auth.estaAutenticado());

	let detailEndpoint;
	if (useAdminEndpoint) {
		detailEndpoint = `/admin/fotografias/${encodeURIComponent(fotografiaId)}`;
	} else if (esPropiaNoAprobada) {
		detailEndpoint = `/fotografias/${encodeURIComponent(fotografiaId)}/mia`;
	} else {
		detailEndpoint = `/fotografias/${encodeURIComponent(fotografiaId)}`;
	}
	const state = {
		fotografiaId,
		detailEndpoint,
		usuario: auth.getUsuario(),
		autenticado: auth.estaAutenticado(),
		foto: null,
		comentarios: [],
		miCalificacion: null,
		currentRatings: null,
		showRatingControls: false,
		showBreakdown: false,
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

		// Setear la imagen para el blur de fondo
		const imagenUrl = state.foto?.imagen_public_id
			? cloudinaryUrl(state.foto.imagen_public_id, { width: 900, quality: 'auto', crop: 'limit' })
			: (state.foto?.imagen_url ? state.foto.imagen_url : '');
		if (imagenUrl) {
			const imgCol = state.modalElement.querySelector('.mf-img-col');
			if (imgCol) {
				imgCol.style.setProperty('--mf-blur-src', `url("${imagenUrl}")`);
			}
		}

		bindModalEvents(state);
	} catch (error) {
		renderLoadError(state.modalElement, error?.error || 'No fue posible obtener el detalle de la foto.');
	}
}

export { abrirModalFoto };

export default {
	abrirModalFoto,
};