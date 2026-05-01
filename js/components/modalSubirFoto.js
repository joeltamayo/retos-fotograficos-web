import api from '../api.js';
import { mostrarToast } from '../utils.js';

const MODAL_ID = 'modal-subir-foto';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Escapa texto para inyectarlo con seguridad dentro de HTML.
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
 * Resuelve el contenedor global de modales.
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
 * Crea el markup base del modal con spinner inicial.
 */
function getLoadingHtml(retoTitulo) {
	return `
		<div class="modal fade" id="${MODAL_ID}" tabindex="-1" aria-hidden="true">
			<div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
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
 * Normaliza el valor recibido para permitir compatibilidad con llamadas antiguas.
 */
function normalizeArgs(retoIdOrObject, retoTitulo, retoDescripcion = '') {
	if (typeof retoIdOrObject === 'object' && retoIdOrObject !== null) {
		return {
			retoId: retoIdOrObject.retoId || retoIdOrObject.id || '',
			retoTitulo: retoIdOrObject.retoTitulo || retoIdOrObject.titulo || '',
			retoDescripcion: retoIdOrObject.retoDescripcion || retoIdOrObject.descripcion || '',
		};
	}

	return {
		retoId: retoIdOrObject,
		retoTitulo,
		retoDescripcion,
	};
}

/**
 * Construye la vista del modal una vez que se tiene la informacion.
 */
function renderModalContent(state) {
	const titulo = escapeHtml(state.retoTitulo || '');
	const descripcion = escapeHtml(state.retoDescripcion || '');

	state.modalElement.querySelector('.modal-content').innerHTML = `
		<div class="ms-header">
			<div>
				<h3 class="ms-title">Subir Fotografía para &quot;${titulo}&quot;</h3>
				<p class="ms-subtitle">Completa el formulario para subir tu fotografía al reto.</p>
			</div>
			<button type="button" class="ms-close" data-bs-dismiss="modal" aria-label="Cerrar">&times;</button>
		</div>

		<div class="ms-body">
			${descripcion ? `<p class="ms-description">${descripcion}</p>` : ''}

			<form id="pc-upload-form" novalidate>
				<input type="file" id="pc-upload-file" accept="image/jpeg,image/png,image/webp" hidden>

				<div class="ms-field">
					<div class="ms-upload-label">Fotografía *</div>
					<div id="pc-upload-zone"></div>
					<div class="ms-field-error" data-error-for="file"></div>
				</div>

				<div class="ms-field">
					<div class="ms-upload-label">Título *</div>
					<input
						type="text"
						class="ms-upload-input"
						id="pc-upload-title"
						placeholder="Dale un título a tu fotografía"
						maxlength="120"
					>
					<div class="ms-field-error" data-error-for="title"></div>
				</div>

				<div class="ms-field">
					<div class="ms-upload-label">Descripción</div>
					<textarea
						class="ms-upload-textarea"
						id="pc-upload-description"
						placeholder="Cuéntanos sobre tu fotografía..."
						maxlength="500"
					></textarea>
				</div>

				<div class="ms-modal-error" id="pc-upload-error"></div>

				<div class="ms-actions">
					<button type="button" class="ms-upload-outline" data-accion="cancelar">Cancelar</button>
					<button type="submit" class="ms-upload-btn" id="pc-upload-submit">
						<i class="bi bi-upload"></i>
						<span>Subir Fotografía</span>
					</button>
				</div>
			</form>
		</div>
	`;
}

/**
 * Renderiza la zona de upload con estado vacio o preview.
 */
function renderUploadZone(state) {
	const zone = state.modalElement.querySelector('#pc-upload-zone');
	if (!zone) {
		return;
	}

	if (!state.previewUrl) {
		zone.innerHTML = `
			<div class="ms-upload-area" data-accion="abrir-file">
				<div>
					<i class="bi bi-image u-icon-3xl u-text-muted"></i>
					<p class="ms-upload-prompt">Click para seleccionar imagen</p>
					<p class="ms-upload-helper">PNG, JPG hasta 10MB</p>
				</div>
			</div>
		`;
		return;
	}

	zone.innerHTML = `
		<div class="ms-upload-preview">
			<img src="${escapeHtml(state.previewUrl)}" alt="Preview de fotografía">
			<button type="button" class="ms-upload-remove" data-accion="quitar-imagen" aria-label="Quitar imagen">
				<i class="bi bi-x"></i>
			</button>
		</div>
	`;
}

/**
 * Limpia errores inline y el mensaje principal.
 */
function clearErrors(state) {
	state.modalElement.querySelectorAll('.ms-field-error').forEach((node) => {
		node.textContent = '';
	});

	const modalError = state.modalElement.querySelector('#pc-upload-error');
	if (modalError) {
		modalError.textContent = '';
	}
}

/**
 * Asigna texto de error a un campo puntual.
 */
function setFieldError(state, field, message) {
	const errorNode = state.modalElement.querySelector(`[data-error-for="${field}"]`);
	if (errorNode) {
		errorNode.textContent = message;
	}
}

/**
 * Asigna error de nivel modal.
 */
function setModalError(state, message) {
	const modalError = state.modalElement.querySelector('#pc-upload-error');
	if (modalError) {
		modalError.textContent = message;
	}
}

/**
 * Actualiza el preview del archivo seleccionado.
 */
function setPreviewFile(state, file) {
	if (state.previewUrl) {
		URL.revokeObjectURL(state.previewUrl);
		state.previewUrl = '';
	}

	state.file = file || null;
	state.previewUrl = file ? URL.createObjectURL(file) : '';
	renderUploadZone(state);
}

/**
 * Valida campos requeridos antes de enviar el formulario.
 */
function validateForm(state) {
	clearErrors(state);

	let isValid = true;

	if (!state.file) {
		setFieldError(state, 'file', 'Selecciona una imagen.');
		isValid = false;
	}

	if (state.file && state.file.size > MAX_FILE_SIZE_BYTES) {
		setFieldError(state, 'file', 'La imagen no puede superar 10MB.');
		isValid = false;
	}

	const titleInput = state.modalElement.querySelector('#pc-upload-title');
	if (!titleInput || !titleInput.value.trim()) {
		setFieldError(state, 'title', 'El título es obligatorio.');
		isValid = false;
	}

	return isValid;
}

/**
 * Cambia el estado visual del boton de envio.
 */
function setSubmittingState(state, isSubmitting) {
	const submitButton = state.modalElement.querySelector('#pc-upload-submit');
	if (!submitButton) {
		return;
	}

	submitButton.disabled = isSubmitting;
	submitButton.innerHTML = isSubmitting
		? '<span class="app-spinner app-spinner--sm ms-submit-spinner" aria-hidden="true"></span><span>Subiendo...</span>'
		: '<i class="bi bi-upload"></i><span>Subir Fotografía</span>';
}

/**
 * Limpia el modal global.
 */
function clearModal() {
	const container = document.getElementById('modal-container');
	if (container) {
		container.innerHTML = '';
	}
}

/**
 * Conecta los eventos de la vista del modal.
 */
function bindEvents(state) {
	const fileInput = state.modalElement.querySelector('#pc-upload-file');
	const form = state.modalElement.querySelector('#pc-upload-form');

	state.modalElement.querySelector('[data-accion="abrir-file"]')?.addEventListener('click', () => {
		fileInput?.click();
	});

	state.modalElement.querySelector('[data-accion="quitar-imagen"]')?.addEventListener('click', (event) => {
		event.preventDefault();
		if (fileInput) {
			fileInput.value = '';
		}
		setPreviewFile(state, null);
		clearErrors(state);
	});

	state.modalElement.querySelector('[data-accion="cancelar"]')?.addEventListener('click', () => {
		const modal = window.bootstrap?.Modal.getInstance(state.modalElement);
		if (modal) {
			modal.hide();
		}
	});

	fileInput?.addEventListener('change', () => {
		const file = fileInput.files?.[0];

		if (!file) {
			setPreviewFile(state, null);
			return;
		}

		if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
			setFieldError(state, 'file', 'Solo se permiten imágenes PNG, JPG o WEBP.');
			fileInput.value = '';
			setPreviewFile(state, null);
			return;
		}

		if (file.size > MAX_FILE_SIZE_BYTES) {
			setFieldError(state, 'file', 'La imagen no puede superar 10MB.');
			fileInput.value = '';
			setPreviewFile(state, null);
			return;
		}

		setPreviewFile(state, file);
		clearErrors(state);
	});

	form?.addEventListener('submit', async (event) => {
		event.preventDefault();

		if (!validateForm(state)) {
			return;
		}

		const titleInput = state.modalElement.querySelector('#pc-upload-title');
		const descriptionInput = state.modalElement.querySelector('#pc-upload-description');
		const formData = new FormData();
		formData.append('reto_id', state.retoId);
		formData.append('titulo', titleInput.value.trim());
		formData.append('descripcion', descriptionInput?.value.trim() || '');
		formData.append('imagen', state.file);

		setSubmittingState(state, true);

		try {
			await api.upload('/fotografias', formData, 'POST');
			mostrarToast('¡Foto subida! Está en revisión', 'success');
			const modal = window.bootstrap?.Modal.getInstance(state.modalElement);
			if (modal) {
				modal.hide();
			}
			window.dispatchEvent(new CustomEvent('fotografia-subida', { detail: { retoId: state.retoId } }));
		} catch (error) {
			setModalError(state, error?.error || 'No se pudo subir la fotografía. Intenta nuevamente.');
			setSubmittingState(state, false);
		}
	});
}

/**
 * Abre el modal para subir una fotografia a un reto.
 * Acepta tanto la firma solicitada como un objeto compatibilidad con llamadas previas.
 */
function abrirModalSubirFoto(retoIdOrObject, retoTitulo, retoDescripcion = '') {
	const { retoId, retoTitulo: tituloResuelto, retoDescripcion: descripcionResuelta } = normalizeArgs(retoIdOrObject, retoTitulo, retoDescripcion);

	if (!retoId) {
		mostrarToast('No se pudo identificar el reto para subir la fotografía.', 'warning');
		return;
	}

	const container = getModalContainer();
	container.innerHTML = getLoadingHtml(tituloResuelto);

	const modalElement = document.getElementById(MODAL_ID);
	const state = {
		retoId,
		retoTitulo: tituloResuelto,
		retoDescripcion: descripcionResuelta,
		file: null,
		previewUrl: '',
		modalElement,
	};

	const modal = new bootstrap.Modal(document.getElementById('modal-subir-foto'));
	modal.show();

	modalElement.addEventListener(
		'hidden.bs.modal',
		() => {
			if (state.previewUrl) {
				URL.revokeObjectURL(state.previewUrl);
			}
			clearModal();
		},
		{ once: true },
	);

	renderModalContent(state);
	renderUploadZone(state);
	bindEvents(state);
}

export { abrirModalSubirFoto };

export default {
	abrirModalSubirFoto,
};
