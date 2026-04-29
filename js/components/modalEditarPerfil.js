import api from '../api.js';
import auth from '../auth.js';
import { mostrarToast } from '../utils.js';
import { actualizarNavbar } from './navbar.js';

const MODAL_ID = 'modal-editar-perfil';
const MAX_BIO_LENGTH = 200;

/**
 * Escapa texto para renderizarlo de forma segura dentro de HTML inyectado.
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
 * Normaliza texto eliminando espacios repetidos para comparar valores.
 */
function normalizeText(value) {
	return String(value ?? '').trim().replace(/\s+/g, ' ');
}

/**
 * Divide un nombre completo en nombre y apellido para enviar al backend.
 */
function splitNombreCompleto(nombreCompleto) {
	const partes = normalizeText(nombreCompleto).split(' ').filter(Boolean);

	if (partes.length <= 1) {
		return {
			nombre: partes[0] || '',
			apellido: '',
		};
	}

	return {
		nombre: partes[0],
		apellido: partes.slice(1).join(' '),
	};
}

/**
 * Convierte el nombre y apellido actuales a una sola cadena visible en el formulario.
 */
function buildNombreCompleto(usuario) {
	return normalizeText([usuario?.nombre, usuario?.apellido].filter(Boolean).join(' '));
}


/**
 * Obtiene el contenedor global donde se monta el modal.
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
 * Crea el HTML base del modal mientras se prepara la vista.
 */
function getLoadingHtml() {
	return `
		<div class="modal fade" id="${MODAL_ID}" tabindex="-1" aria-hidden="true">
			<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
				<div class="modal-content">
					<div class="u-center-content u-min-h-520">
						<div class="app-spinner" role="status" aria-label="Cargando"></div>
					</div>
				</div>
			</div>
		</div>
	`;
}

/**
 * Normaliza el usuario actual para usarlo como fuente de datos del formulario.
 */
function normalizeUsuario(usuario) {
	if (!usuario || typeof usuario !== 'object') {
		return null;
	}

	return {
		...usuario,
		nombreCompleto: buildNombreCompleto(usuario),
		nombreUsuario: normalizeText(usuario.nombre_usuario),
		email: normalizeText(usuario.correo),
		biografia: String(usuario.biografia ?? ''),
		fotoPerfilUrl: usuario.foto_perfil_url || usuario.foto_perfil || '',
	};
}

/**
 * Renderiza el modal con los datos actuales del perfil.
 */
function renderModalContent(state) {
	const fotoMarkup = state.previewUrl || state.usuario.fotoPerfilUrl
		? `<img src="${escapeHtml(state.previewUrl || state.usuario.fotoPerfilUrl)}" alt="Foto de perfil actual">`
		: `<div class="me-photo-placeholder"><i class="bi bi-person"></i></div>`;

	state.modalElement.querySelector('.modal-content').innerHTML = `
		<div class="me-header">
			<div>
				<h3 class="me-title">Editar Perfil</h3>
				<p class="me-subtitle">Actualiza tu información personal y foto de perfil</p>
			</div>
			<button type="button" class="me-close" data-accion="cerrar-modal" aria-label="Cerrar">&times;</button>
		</div>

		<div class="me-body">
			<form id="pc-edit-form" novalidate>
				<input type="file" id="pc-edit-file" accept="image/jpeg,image/png,image/webp" hidden>

				<div class="me-photo-wrap">
					<button type="button" class="me-photo-button" data-accion="seleccionar-foto" aria-label="Cambiar foto de perfil">
						${fotoMarkup}
						<span class="me-camera-btn" aria-hidden="true">
							<i class="bi bi-camera-fill"></i>
						</span>
					</button>
					<button type="button" class="me-photo-action" data-accion="seleccionar-foto">
						<i class="bi bi-upload"></i>
						<span>Cambiar foto de perfil</span>
					</button>
					<div class="me-error u-text-center" data-error-for="foto_perfil"></div>
				</div>

				<div class="me-section">
					<div class="me-label">Nombre Completo *</div>
					<input
						type="text"
						class="me-input"
						id="pc-edit-name"
						placeholder="Ej: María García"
						value="${escapeHtml(state.usuario.nombreCompleto)}"
					>
					<div class="me-error" data-error-for="nombre_completo"></div>
				</div>

				<div class="me-section me-section--tight">
					<div class="me-label">Nombre de Usuario *</div>
					<input
						type="text"
						class="me-input"
						id="pc-edit-username"
						placeholder="Ej: maria_photo"
						value="${escapeHtml(state.usuario.nombreUsuario)}"
					>
					<div class="me-hint">Tu nombre de usuario es único y visible para todos</div>
					<div class="me-error" data-error-for="nombre_usuario"></div>
				</div>

				<div class="me-section">
					<div class="me-label">Email</div>
					<input
						type="email"
						class="me-input"
						id="pc-edit-email"
						placeholder="tu@email.com"
						value="${escapeHtml(state.usuario.email)}"
					>
					<div class="me-hint">Tu email es privado y no se mostrará públicamente</div>
					<div class="me-error" data-error-for="correo"></div>
				</div>

				<div class="me-section">
					<div class="me-label">Biografía</div>
					<textarea
						class="me-textarea"
						id="pc-edit-bio"
						placeholder="Cuéntanos sobre ti y tu pasión por la fotografía..."
						maxlength="${MAX_BIO_LENGTH}"
					>${escapeHtml(state.usuario.biografia)}</textarea>
					<div class="me-counter" id="pc-edit-counter">0/${MAX_BIO_LENGTH} caracteres</div>
				</div>

				<div class="me-modal-error" id="pc-edit-modal-error"></div>

				<div class="me-actions">
					<button type="button" class="me-outline" data-accion="cancelar">Cancelar</button>
					<button type="submit" class="me-primary" id="pc-edit-submit">
						<i class="bi bi-check2"></i>
						<span>Guardar Cambios</span>
					</button>
				</div>
			</form>
		</div>
	`;
}

/**
 * Limpia los mensajes de error inline.
 */
function clearErrors(state) {
	state.modalElement.querySelectorAll('.me-error').forEach((node) => {
		node.textContent = '';
	});

	const modalError = state.modalElement.querySelector('#pc-edit-modal-error');
	if (modalError) {
		modalError.textContent = '';
	}
}

/**
 * Asigna un error a un campo específico.
 */
function setFieldError(state, field, message) {
	const errorNode = state.modalElement.querySelector(`[data-error-for="${field}"]`);
	if (errorNode) {
		errorNode.textContent = message;
	}
}

/**
 * Asigna un error general del modal.
 */
function setModalError(state, message) {
	const modalError = state.modalElement.querySelector('#pc-edit-modal-error');
	if (modalError) {
		modalError.textContent = message;
	}
}

/**
 * Actualiza el contador de biografía en tiempo real.
 */
function updateBioCounter(state) {
	const bioInput = state.modalElement.querySelector('#pc-edit-bio');
	const counter = state.modalElement.querySelector('#pc-edit-counter');

	if (!bioInput || !counter) {
		return;
	}

	counter.textContent = `${bioInput.value.length}/${MAX_BIO_LENGTH} caracteres`;
}

/**
 * Abre el selector de archivo de foto de perfil.
 */
function openFilePicker(state) {
	const fileInput = state.modalElement.querySelector('#pc-edit-file');
	fileInput?.click();
}

/**
 * Lee un archivo de imagen y lo deja listo como preview inmediato.
 */
function previewSelectedFile(state, file) {
	if (state.previewObjectUrl) {
		URL.revokeObjectURL(state.previewObjectUrl);
		state.previewObjectUrl = '';
	}

	state.file = file || null;

	if (!file) {
		state.previewDataUrl = '';
		renderPhotoPreview(state);
		return;
	}

	const reader = new FileReader();
	reader.onload = () => {
		state.previewDataUrl = String(reader.result || '');
		renderPhotoPreview(state);
	};
	reader.readAsDataURL(file);
}

/**
 * Renderiza la zona de foto con placeholder o preview actual.
 */
function renderPhotoPreview(state) {
	const button = state.modalElement.querySelector('[data-accion="seleccionar-foto"]');
	if (!button) {
		return;
	}

	const previewSrc = state.previewDataUrl || state.usuario.fotoPerfilUrl;
	button.innerHTML = previewSrc
		? `
			<img src="${escapeHtml(previewSrc)}" alt="Vista previa de foto de perfil">
			<span class="me-camera-btn" aria-hidden="true">
				<i class="bi bi-camera-fill"></i>
			</span>
		`
		: `
			<div class="me-photo-placeholder" aria-hidden="true">
				<i class="bi bi-person"></i>
			</div>
			<span class="me-camera-btn" aria-hidden="true">
				<i class="bi bi-camera-fill"></i>
			</span>
		`;
}

/**
 * Habilita o deshabilita el boton principal de guardado.
 */
function setSubmittingState(state, isSubmitting) {
	const submitButton = state.modalElement.querySelector('#pc-edit-submit');
	if (!submitButton) {
		return;
	}

	submitButton.disabled = isSubmitting;
	submitButton.innerHTML = isSubmitting
		? '<span class="app-spinner app-spinner--sm" aria-hidden="true"></span><span>Guardando...</span>'
		: '<i class="bi bi-check2"></i><span>Guardar Cambios</span>';
}

/**
 * Determina si un campo cambió respecto al valor original.
 */
function hasChanged(originalValue, nextValue) {
	return normalizeText(originalValue) !== normalizeText(nextValue);
}

/**
 * Construye el FormData solo con los valores modificados.
 */
function buildFormData(state) {
	const formData = new FormData();
	const nameInput = state.modalElement.querySelector('#pc-edit-name');
	const usernameInput = state.modalElement.querySelector('#pc-edit-username');
	const emailInput = state.modalElement.querySelector('#pc-edit-email');
	const bioInput = state.modalElement.querySelector('#pc-edit-bio');
	const nombreCompletoActual = buildNombreCompleto(state.usuario);
	const nombreCompletoNuevo = normalizeText(nameInput?.value);

	if (hasChanged(nombreCompletoActual, nombreCompletoNuevo)) {
		const { nombre, apellido } = splitNombreCompleto(nombreCompletoNuevo);
		if (nombre) {
			formData.append('nombre', nombre);
		}
		if (apellido || nombreCompletoNuevo === '') {
			formData.append('apellido', apellido);
		}
	}

	if (hasChanged(state.usuario.nombreUsuario, usernameInput?.value)) {
		formData.append('nombre_usuario', normalizeText(usernameInput?.value));
	}

	if (hasChanged(state.usuario.email, emailInput?.value)) {
		formData.append('correo', normalizeText(emailInput?.value));
	}

	if (hasChanged(state.usuario.biografia, bioInput?.value)) {
		formData.append('biografia', String(bioInput?.value ?? '').trim());
	}

	if (state.file) {
		formData.append('foto_perfil', state.file);
	}

	return formData;
}

/**
 * Valida campos requeridos antes del guardado.
 */
function validateForm(state) {
	clearErrors(state);

	let isValid = true;
	const nameInput = state.modalElement.querySelector('#pc-edit-name');
	const usernameInput = state.modalElement.querySelector('#pc-edit-username');
	const emailInput = state.modalElement.querySelector('#pc-edit-email');
	const bioInput = state.modalElement.querySelector('#pc-edit-bio');

	if (!normalizeText(nameInput?.value)) {
		setFieldError(state, 'nombre_completo', 'El nombre completo es obligatorio.');
		isValid = false;
	}

	if (!normalizeText(usernameInput?.value)) {
		setFieldError(state, 'nombre_usuario', 'El nombre de usuario es obligatorio.');
		isValid = false;
	}

	if (emailInput && emailInput.value && !emailInput.validity.valid) {
		setFieldError(state, 'correo', 'Ingresa un correo válido.');
		isValid = false;
	}

	if (bioInput && bioInput.value.length > MAX_BIO_LENGTH) {
		setModalError(state, `La biografía no puede superar ${MAX_BIO_LENGTH} caracteres.`);
		isValid = false;
	}

	return isValid;
}

/**
 * Interpreta errores del backend y los muestra en el campo correcto.
 */
function handleConflictError(state, error) {
	const message = String(error?.error || error?.message || '').toLowerCase();

	if (message.includes('correo')) {
		setFieldError(state, 'correo', 'Ese correo ya está en uso.');
		return;
	}

	if (message.includes('usuario') || message.includes('nombre_usuario')) {
		setFieldError(state, 'nombre_usuario', 'Ese nombre de usuario ya está en uso.');
		return;
	}

	setModalError(state, 'No se pudo guardar el perfil. Revisa los datos e intenta de nuevo.');
}

/**
 * Alinea el usuario autenticado en memoria con la respuesta del backend.
 */
function syncAuthUser(updatedUsuario) {
	const usuarioActual = auth.getUsuario();
	if (usuarioActual && updatedUsuario && typeof updatedUsuario === 'object') {
		Object.assign(usuarioActual, updatedUsuario);
	}
}

/**
 * Limpia recursos del modal antes de cerrarlo.
 */
function cleanupState(state) {
	if (state.previewDataUrl && state.previewDataUrl.startsWith('blob:')) {
		URL.revokeObjectURL(state.previewDataUrl);
	}

	if (state.previewObjectUrl) {
		URL.revokeObjectURL(state.previewObjectUrl);
	}
}

/**
 * Conecta listeners de interacción del modal.
 */
function bindEvents(state) {
	const modalElement = state.modalElement;
	const fileInput = modalElement.querySelector('#pc-edit-file');
	const form = modalElement.querySelector('#pc-edit-form');

	modalElement.querySelectorAll('[data-accion="seleccionar-foto"]').forEach((element) => {
		element.addEventListener('click', () => openFilePicker(state));
	});

	modalElement.querySelector('[data-accion="cerrar-modal"]')?.addEventListener('click', () => {
		window.bootstrap?.Modal.getInstance(modalElement)?.hide();
	});

	modalElement.querySelector('[data-accion="cancelar"]')?.addEventListener('click', () => {
		window.bootstrap?.Modal.getInstance(modalElement)?.hide();
	});

	fileInput?.addEventListener('change', () => {
		const file = fileInput.files?.[0];
		if (!file) {
			state.file = null;
			state.previewDataUrl = '';
			renderPhotoPreview(state);
			return;
		}

		if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
			setFieldError(state, 'foto_perfil', 'Solo se permiten imágenes JPG, PNG o WEBP.');
			fileInput.value = '';
			state.file = null;
			state.previewDataUrl = '';
			renderPhotoPreview(state);
			return;
		}

		previewSelectedFile(state, file);
		clearErrors(state);
	});

	modalElement.querySelector('#pc-edit-bio')?.addEventListener('input', () => {
		updateBioCounter(state);
	});

	form?.addEventListener('submit', async (event) => {
		event.preventDefault();

		if (!validateForm(state)) {
			return;
		}

		const formData = buildFormData(state);
		if ([...formData.keys()].length === 0) {
			setModalError(state, 'No detectamos cambios para guardar.');
			return;
		}

		setSubmittingState(state, true);

		try {
			const response = await api.upload('/usuarios/me', formData, 'PUT');
			const updatedUsuario = response?.usuario && typeof response.usuario === 'object' ? response.usuario : response;

			syncAuthUser(updatedUsuario);
			actualizarNavbar();
			mostrarToast('Perfil actualizado correctamente.', 'success');
			window.bootstrap?.Modal.getInstance(modalElement)?.hide();
		} catch (error) {
			setSubmittingState(state, false);

			if (error?.status === 409) {
				handleConflictError(state, error);
				return;
			}

			if (error?.status === 400) {
				setModalError(state, error?.error || 'Hay datos inválidos en el formulario.');
				return;
			}

			setModalError(state, error?.error || 'No se pudo guardar el perfil. Intenta nuevamente.');
		}
	});
}

/**
 * Abre el modal de edición de perfil con los datos actuales.
 */
async function abrirModalEditarPerfil() {
	const usuarioBase = normalizeUsuario(auth.getUsuario() || (await api.get('/usuarios/me').catch(() => null)));

	if (!usuarioBase) {
		mostrarToast('No fue posible cargar tu perfil.', 'warning');
		return;
	}

	const container = getModalContainer();
	container.innerHTML = getLoadingHtml();

	const modalElement = document.getElementById(MODAL_ID);
	if (!modalElement) {
		mostrarToast('No se pudo abrir el editor de perfil.', 'error');
		return;
	}

	const state = {
		usuario: usuarioBase,
		file: null,
		previewDataUrl: '',
		previewObjectUrl: '',
		modalElement,
	};

	renderModalContent(state);
	updateBioCounter(state);
	renderPhotoPreview(state);
	bindEvents(state);

	modalElement.addEventListener(
		'hidden.bs.modal',
		() => {
			cleanupState(state);
			container.innerHTML = '';
		},
		{ once: true },
	);

	const modal = new bootstrap.Modal(modalElement);
	modal.show();
}

export { abrirModalEditarPerfil };

export default {
	abrirModalEditarPerfil,
};
