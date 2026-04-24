import api from '../api.js';
import auth from '../auth.js';
import { mostrarToast } from '../utils.js';
import { actualizarNavbar } from './navbar.js';

const MODAL_ID = 'modal-editar-perfil';
const STYLE_ID = 'modal-editar-perfil-styles';
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
 * Inyecta estilos específicos del modal solo una vez.
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
			box-shadow: var(--shadow-modal);
			overflow: hidden;
		}

		.pc-edit-title {
			margin: 0;
			font-size: 24px;
			font-weight: 700;
			color: #111827;
		}

		.pc-edit-subtitle {
			margin: 6px 0 0;
			font-size: 15px;
			color: #6B7280;
		}

		.pc-edit-photo-wrap {
			display: flex;
			flex-direction: column;
			align-items: center;
			gap: 14px;
			padding-top: 8px;
			padding-bottom: 8px;
		}

		.pc-edit-photo-button {
			position: relative;
			width: 122px;
			height: 122px;
			border-radius: 50%;
			border: 3px solid #E5E7EB;
			background: #F3F4F6;
			overflow: hidden;
			padding: 0;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			flex: none;
		}

		.pc-edit-photo-button img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}

		.pc-edit-photo-placeholder {
			width: 100%;
			height: 100%;
			display: flex;
			align-items: center;
			justify-content: center;
			color: #9CA3AF;
			font-size: 42px;
		}

		.pc-edit-camera-btn {
			position: absolute;
			right: -2px;
			bottom: -2px;
			width: 36px;
			height: 36px;
			border: 0;
			border-radius: 9999px;
			background: #111827;
			color: #FFFFFF;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			box-shadow: 0 8px 18px rgba(17, 24, 39, 0.28);
		}

		.pc-edit-photo-action {
			border: 1px solid #E5E7EB;
			background: #FFFFFF;
			border-radius: 10px;
			padding: 8px 14px;
			font-size: 14px;
			font-weight: 600;
			color: #111827;
			display: inline-flex;
			align-items: center;
			gap: 8px;
		}

		.pc-edit-label {
			font-size: 14px;
			font-weight: 700;
			color: #111827;
			margin-bottom: 8px;
		}

		.pc-edit-input,
		.pc-edit-textarea {
			width: 100%;
			border: 1px solid #E5E7EB;
			background: #F9FAFB;
			border-radius: 10px;
			padding: 11px 14px;
			font-size: 14px;
			color: #111827;
			transition: border-color 0.2s ease, box-shadow 0.2s ease;
		}

		.pc-edit-textarea {
			min-height: 88px;
			resize: vertical;
		}

		.pc-edit-input::placeholder,
		.pc-edit-textarea::placeholder {
			color: #9CA3AF;
		}

		.pc-edit-input:focus,
		.pc-edit-textarea:focus {
			outline: none;
			border-color: #111827;
			box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.08);
		}

		.pc-edit-hint {
			margin-top: 7px;
			font-size: 13px;
			color: #6B7280;
		}

		.pc-edit-error {
			margin-top: 6px;
			font-size: 12px;
			color: #DC2626;
			min-height: 16px;
		}

		.pc-edit-counter {
			margin-top: 7px;
			font-size: 12px;
			color: #6B7280;
			text-align: right;
		}

		.pc-edit-modal-error {
			margin-top: 10px;
			font-size: 13px;
			color: #DC2626;
			min-height: 18px;
		}

		.pc-edit-outline {
			background: #FFFFFF;
			border: 1px solid #E5E7EB;
			border-radius: 10px;
			padding: 10px 16px;
			font-weight: 600;
			color: #111827;
		}

		.pc-edit-primary {
			background: #111827;
			border: 0;
			border-radius: 10px;
			padding: 10px 16px;
			font-weight: 600;
			color: #FFFFFF;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
		}

		.pc-edit-primary:disabled,
		.pc-edit-outline:disabled,
		.pc-edit-photo-action:disabled {
			opacity: 0.7;
			cursor: not-allowed;
		}
	`;

	document.head.appendChild(style);
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
					<div class="d-flex align-items-center justify-content-center" style="min-height:520px">
						<div class="spinner-border" style="color:var(--color-primary)" role="status" aria-label="Cargando"></div>
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
		: `<div class="pc-edit-photo-placeholder"><i class="bi bi-person"></i></div>`;

	state.modalElement.querySelector('.modal-content').innerHTML = `
		<div class="modal-header border-0 pb-0 px-4 px-md-5 pt-4 pt-md-5">
			<div>
				<h3 class="pc-edit-title">Editar Perfil</h3>
				<p class="pc-edit-subtitle">Actualiza tu información personal y foto de perfil</p>
			</div>
			<button type="button" class="btn-close" data-accion="cerrar-modal" aria-label="Cerrar"></button>
		</div>

		<div class="modal-body px-4 px-md-5 pb-4 pb-md-5 pt-4">
			<form id="pc-edit-form" novalidate>
				<input type="file" id="pc-edit-file" accept="image/jpeg,image/png,image/webp" hidden>

				<div class="pc-edit-photo-wrap mb-4">
					<button type="button" class="pc-edit-photo-button" data-accion="seleccionar-foto" aria-label="Cambiar foto de perfil">
						${fotoMarkup}
						<span class="pc-edit-camera-btn" aria-hidden="true">
							<i class="bi bi-camera-fill"></i>
						</span>
					</button>
					<button type="button" class="pc-edit-photo-action" data-accion="seleccionar-foto">
						<i class="bi bi-upload"></i>
						<span>Cambiar foto de perfil</span>
					</button>
					<div class="pc-edit-error text-center" data-error-for="foto_perfil"></div>
				</div>

				<div class="mb-3">
					<div class="pc-edit-label">Nombre Completo *</div>
					<input
						type="text"
						class="pc-edit-input"
						id="pc-edit-name"
						placeholder="Ej: María García"
						value="${escapeHtml(state.usuario.nombreCompleto)}"
					>
					<div class="pc-edit-error" data-error-for="nombre_completo"></div>
				</div>

				<div class="mb-1">
					<div class="pc-edit-label">Nombre de Usuario *</div>
					<input
						type="text"
						class="pc-edit-input"
						id="pc-edit-username"
						placeholder="Ej: maria_photo"
						value="${escapeHtml(state.usuario.nombreUsuario)}"
					>
					<div class="pc-edit-hint">Tu nombre de usuario es único y visible para todos</div>
					<div class="pc-edit-error" data-error-for="nombre_usuario"></div>
				</div>

				<div class="mb-3">
					<div class="pc-edit-label">Email</div>
					<input
						type="email"
						class="pc-edit-input"
						id="pc-edit-email"
						placeholder="tu@email.com"
						value="${escapeHtml(state.usuario.email)}"
					>
					<div class="pc-edit-hint">Tu email es privado y no se mostrará públicamente</div>
					<div class="pc-edit-error" data-error-for="correo"></div>
				</div>

				<div class="mb-2">
					<div class="pc-edit-label">Biografía</div>
					<textarea
						class="pc-edit-textarea"
						id="pc-edit-bio"
						placeholder="Cuéntanos sobre ti y tu pasión por la fotografía..."
						maxlength="${MAX_BIO_LENGTH}"
					>${escapeHtml(state.usuario.biografia)}</textarea>
					<div class="pc-edit-counter" id="pc-edit-counter">0/${MAX_BIO_LENGTH} caracteres</div>
				</div>

				<div class="pc-edit-modal-error" id="pc-edit-modal-error"></div>

				<div class="d-flex justify-content-end gap-2 mt-4">
					<button type="button" class="pc-edit-outline" data-accion="cancelar">Cancelar</button>
					<button type="submit" class="pc-edit-primary" id="pc-edit-submit">
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
	state.modalElement.querySelectorAll('.pc-edit-error').forEach((node) => {
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
			<span class="pc-edit-camera-btn" aria-hidden="true">
				<i class="bi bi-camera-fill"></i>
			</span>
		`
		: `
			<div class="pc-edit-photo-placeholder" aria-hidden="true">
				<i class="bi bi-person"></i>
			</div>
			<span class="pc-edit-camera-btn" aria-hidden="true">
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
		? '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span><span>Guardando...</span>'
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
	ensureStyles();

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
