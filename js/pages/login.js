import auth from '../auth.js';
import { actualizarNavbar } from '../components/navbar.js';

const STYLE_ID = 'auth-page-styles';
const KEY_RUTA_DESTINO = 'rutaDestino';

/**
 * Escapa HTML para render seguro de texto dinámico.
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
 * Divide nombre completo en nombre y apellido para backend.
 */
function splitNombreCompleto(nombreCompleto) {
	const partes = String(nombreCompleto || '').trim().split(/\s+/).filter(Boolean);

	if (partes.length < 2) {
		return { nombre: '', apellido: '' };
	}

	return {
		nombre: partes[0],
		apellido: partes.slice(1).join(' '),
	};
}

/**
 * Lee query param tab desde hash actual.
 */
function getTabFromHash() {
	const rawHash = window.location.hash || '#/login';
	const hashWithoutSign = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
	const queryString = hashWithoutSign.includes('?') ? hashWithoutSign.split('?')[1] : '';
	const params = new URLSearchParams(queryString);
	return String(params.get('tab') || '').toLowerCase();
}

/**
 * Define vista inicial tomando params.tab y query hash.
 */
function getInitialView(params) {
	const fromParams = String(params?.tab || '').toLowerCase();
	if (fromParams === 'registro') {
		return 'registro';
	}

	return getTabFromHash() === 'registro' ? 'registro' : 'login';
}

/**
 * Inyecta estilos de la vista auth una sola vez.
 */
function ensureStyles() {
	if (document.getElementById(STYLE_ID)) {
		return;
	}

	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = `
		.auth-page {
			max-width: var(--content-max-width);
			margin: 0 auto;
			padding: 24px var(--page-padding-x) 48px;
		}

		.auth-card {
			max-width: 920px;
			margin: 0 auto;
			background: #FFFFFF;
			border-radius: 20px;
			overflow: hidden;
			box-shadow: var(--shadow-modal);
			display: grid;
			grid-template-columns: 1fr 1fr;
			min-height: 560px;
		}

		.auth-panel {
			padding: 36px 42px;
			transition: opacity 0.25s ease, transform 0.25s ease;
		}

		.auth-card.switching .auth-panel {
			opacity: 0;
			transform: translateY(10px);
		}

		.auth-panel-form {
			background: #FFFFFF;
			display: flex;
			flex-direction: column;
			justify-content: center;
		}

		.auth-panel-gradient {
			background: linear-gradient(135deg, #2C6BF1 0%, #A21FE6 100%);
			color: #FFFFFF;
			display: flex;
			flex-direction: column;
			justify-content: center;
		}

		.auth-icon-circle {
			width: 64px;
			height: 64px;
			border-radius: 9999px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			font-size: 30px;
			margin: 0 auto 16px;
		}

		.auth-icon-circle--login {
			background: #EEF2FF;
			color: #6B7280;
		}

		.auth-icon-circle--registro {
			background: #F1E8FF;
			color: #9333EA;
		}

		.auth-form-title {
			margin: 0 0 24px;
			font-size: 46px;
			font-weight: 700;
			color: #111827;
			text-align: center;
		}

		.auth-label {
			margin: 0 0 8px;
			font-size: 14px;
			font-weight: 600;
			color: #111827;
		}

		.auth-field {
			position: relative;
			margin-bottom: 14px;
		}

		.auth-input-icon {
			position: absolute;
			left: 12px;
			top: 50%;
			transform: translateY(-50%);
			color: #9CA3AF;
			font-size: 14px;
			pointer-events: none;
		}

		.auth-input {
			width: 100%;
			border: 1px solid #E5E7EB;
			border-radius: 10px;
			background: #F3F4F6;
			color: #111827;
			font-size: 14px;
			padding: 11px 14px;
		}

		.auth-input.with-left-icon {
			padding-left: 34px;
		}

		.auth-input.with-right-icon {
			padding-right: 40px;
		}

		.auth-input:focus {
			outline: none;
			border-color: #5B6AF5;
			box-shadow: 0 0 0 3px rgba(91, 106, 245, 0.15);
			background: #FFFFFF;
		}

		.auth-toggle-password {
			position: absolute;
			right: 10px;
			top: 50%;
			transform: translateY(-50%);
			border: 0;
			background: transparent;
			color: #9CA3AF;
			padding: 4px;
			font-size: 16px;
		}

		.auth-inline-error {
			margin-top: 5px;
			font-size: 12px;
			color: #DC2626;
			min-height: 16px;
		}

		.auth-forgot {
			display: block;
			margin: -3px 0 14px;
			text-align: right;
			font-size: 14px;
			color: #3B82F6;
			text-decoration: none;
		}

		.auth-forgot:hover {
			text-decoration: underline;
		}

		.auth-submit {
			width: 100%;
			border: 0;
			border-radius: 12px;
			padding: 11px 16px;
			font-size: 16px;
			font-weight: 700;
			background: linear-gradient(135deg, #2C6BF1 0%, #A21FE6 100%);
			color: #FFFFFF;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
		}

		.auth-submit:disabled {
			opacity: 0.85;
			cursor: not-allowed;
		}

		.auth-side-title {
			margin: 0;
			font-size: 48px;
			font-weight: 700;
			line-height: 1.2;
			color: #FFFFFF;
		}

		.auth-side-subtitle {
			margin: 14px 0 0;
			font-size: 16px;
			color: rgba(255, 255, 255, 0.9);
		}

		.auth-side-action {
			margin-top: 18px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			border: 1px solid rgba(255, 255, 255, 0.7);
			background: #FFFFFF;
			color: #5B6AF5;
			border-radius: 9999px;
			padding: 10px 22px;
			font-size: 18px;
			font-weight: 700;
			width: fit-content;
		}

		.auth-side-media {
			margin-top: 26px;
			border-radius: 14px;
			background: rgba(17, 24, 39, 0.8);
			height: 190px;
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.auth-side-media i {
			font-size: 84px;
			color: rgba(255, 255, 255, 0.92);
		}

		.auth-benefits {
			margin: 0;
			padding: 0;
			list-style: none;
			display: grid;
			gap: 18px;
		}

		.auth-benefit-title {
			margin: 0;
			font-size: 18px;
			font-weight: 700;
			color: #FFFFFF;
		}

		.auth-benefit-text {
			margin: 4px 0 0;
			font-size: 16px;
			color: rgba(255, 255, 255, 0.86);
		}

		.auth-side-footer {
			margin-top: 24px;
			font-size: 16px;
			color: rgba(255, 255, 255, 0.92);
		}

		@media (max-width: 991.98px) {
			.auth-page {
				padding: 18px 16px 36px;
			}

			.auth-card {
				grid-template-columns: 1fr;
			}

			.auth-panel {
				padding: 28px 20px;
			}

			.auth-form-title {
				font-size: 34px;
			}

			.auth-side-title {
				font-size: 36px;
			}
		}
	`;

	document.head.appendChild(style);
}

/**
 * Redirige después de auth usando ruta destino o home.
 */
function redirectAfterAuth() {
	const rutaDestino = sessionStorage.getItem(KEY_RUTA_DESTINO) || '#/home';
	sessionStorage.removeItem(KEY_RUTA_DESTINO);
	window.location.hash = rutaDestino;
}

/**
 * Renderiza formulario login.
 */
function renderLoginForm() {
	return `
		<div class="auth-icon-circle auth-icon-circle--login"><i class="bi bi-person"></i></div>
		<h1 class="auth-form-title">Iniciar Sesión</h1>

		<form id="login-form" novalidate>
			<label class="auth-label" for="login-correo">Usuario</label>
			<div class="auth-field">
				<i class="bi bi-person auth-input-icon"></i>
				<input id="login-correo" name="correo" type="email" class="auth-input with-left-icon" placeholder="tu@email.com" autocomplete="email">
				<p class="auth-inline-error" data-error="correo"></p>
			</div>

			<label class="auth-label" for="login-contrasena">Contraseña</label>
			<div class="auth-field">
				<input id="login-contrasena" name="contrasena" type="password" class="auth-input with-right-icon" placeholder="••••••••" autocomplete="current-password">
				<button type="button" class="auth-toggle-password" data-toggle-password="login-contrasena" aria-label="Mostrar u ocultar contraseña">
					<i class="bi bi-eye"></i>
				</button>
				<p class="auth-inline-error" data-error="contrasena"></p>
			</div>

			<a class="auth-forgot" href="#" role="button">¿Olvidaste tu contraseña?</a>

			<button type="submit" class="auth-submit" id="login-submit-btn">
				<span>Iniciar Sesión</span>
			</button>
		</form>
	`;
}

/**
 * Renderiza panel promocional de login (lado gradiente).
 */
function renderLoginPromo() {
	return `
		<h2 class="auth-side-title">¡Bienvenido a los Retos Fotográficos!</h2>
		<p class="auth-side-subtitle">¿No tienes una Cuenta?</p>
		<button type="button" class="auth-side-action" data-switch-view="registro">Regístrate</button>

		<div class="auth-side-media" aria-hidden="true">
			<i class="bi bi-camera"></i>
		</div>
	`;
}

/**
 * Renderiza formulario registro.
 */
function renderRegistroForm() {
	return `
		<div class="auth-icon-circle auth-icon-circle--registro"><i class="bi bi-camera"></i></div>
		<h1 class="auth-form-title">Crear Cuenta</h1>

		<form id="registro-form" novalidate>
			<label class="auth-label" for="registro-nombre-completo">Nombre Completo</label>
			<div class="auth-field">
				<input id="registro-nombre-completo" name="nombreCompleto" type="text" class="auth-input" placeholder="Juan Pérez" autocomplete="name">
				<p class="auth-inline-error" data-error="nombreCompleto"></p>
			</div>

			<label class="auth-label" for="registro-nombre-usuario">Nombre de Usuario</label>
			<div class="auth-field">
				<input id="registro-nombre-usuario" name="nombreUsuario" type="text" class="auth-input" placeholder="juanperez" autocomplete="username">
				<p class="auth-inline-error" data-error="nombreUsuario"></p>
			</div>

			<label class="auth-label" for="registro-correo">Email</label>
			<div class="auth-field">
				<input id="registro-correo" name="correo" type="email" class="auth-input" placeholder="tu@email.com" autocomplete="email">
				<p class="auth-inline-error" data-error="correo"></p>
			</div>

			<label class="auth-label" for="registro-contrasena">Contraseña</label>
			<div class="auth-field">
				<input id="registro-contrasena" name="contrasena" type="password" class="auth-input with-right-icon" placeholder="••••••••" autocomplete="new-password">
				<button type="button" class="auth-toggle-password" data-toggle-password="registro-contrasena" aria-label="Mostrar u ocultar contraseña">
					<i class="bi bi-eye"></i>
				</button>
				<p class="auth-inline-error" data-error="contrasena"></p>
			</div>

			<label class="auth-label" for="registro-confirmar">Confirmar Contraseña</label>
			<div class="auth-field">
				<input id="registro-confirmar" name="confirmar" type="password" class="auth-input" placeholder="••••••••" autocomplete="new-password">
				<p class="auth-inline-error" data-error="confirmar"></p>
			</div>

			<button type="submit" class="auth-submit" id="registro-submit-btn">
				<span>Registrarse</span>
			</button>
		</form>
	`;
}

/**
 * Renderiza panel de beneficios de registro (lado gradiente).
 */
function renderRegistroPromo() {
	return `
		<ul class="auth-benefits">
			<li>
				<p class="auth-benefit-title">🎯 Participa en Retos</p>
				<p class="auth-benefit-text">Desafíate con retos diarios, semanales y mensuales</p>
			</li>
			<li>
				<p class="auth-benefit-title">⭐ Gana Reconocimiento</p>
				<p class="auth-benefit-text">Recibe valoraciones de la comunidad y gana insignias</p>
			</li>
			<li>
				<p class="auth-benefit-title">📷 Mejora tus Habilidades</p>
				<p class="auth-benefit-text">Aprende de fotógrafos talentosos y comparte tu trabajo</p>
			</li>
		</ul>

		<p class="auth-side-footer">¿Ya tienes una cuenta?</p>
		<button type="button" class="auth-side-action" data-switch-view="login">Inicia Sesión</button>
	`;
}

/**
 * Renderiza layout principal según la vista actual.
 */
function renderLayout(contenedor, view) {
	const isRegistro = view === 'registro';
	const formPanelHtml = `
		<div class="auth-panel auth-panel-form" id="auth-form-panel">
			${isRegistro ? renderRegistroForm() : renderLoginForm()}
		</div>
	`;
	const promoPanelHtml = `
		<div class="auth-panel auth-panel-gradient" id="auth-promo-panel">
			${isRegistro ? renderRegistroPromo() : renderLoginPromo()}
		</div>
	`;

	contenedor.innerHTML = `
		<section class="auth-page page-enter">
			<div class="auth-card" id="auth-card">
				${isRegistro ? formPanelHtml : promoPanelHtml}
				${isRegistro ? promoPanelHtml : formPanelHtml}
			</div>
		</section>
	`;

	return {
		card: contenedor.querySelector('#auth-card'),
	};
}

/**
 * Cambia visibilidad de contraseña para el input objetivo.
 */
function togglePasswordVisibility(button, input) {
	if (!button || !input) {
		return;
	}

	const currentType = input.getAttribute('type') || 'password';
	const nextType = currentType === 'password' ? 'text' : 'password';
	input.setAttribute('type', nextType);

	const icon = button.querySelector('i');
	if (icon) {
		icon.className = nextType === 'password' ? 'bi bi-eye' : 'bi bi-eye-slash';
	}
}

/**
 * Limpia errores inline del formulario.
 */
function clearInlineErrors(form) {
	form.querySelectorAll('[data-error]').forEach((node) => {
		node.textContent = '';
	});
}

/**
 * Pinta error inline para un campo.
 */
function setInlineError(form, field, message) {
	const errorNode = form.querySelector(`[data-error="${field}"]`);
	if (errorNode) {
		errorNode.textContent = message;
	}
}

/**
 * Activa/desactiva spinner y bloqueo de botón submit.
 */
function setSubmittingState(button, isSubmitting) {
	if (!button) {
		return;
	}

	button.disabled = isSubmitting;

	if (isSubmitting) {
		const label = button.textContent?.trim() || '';
		button.dataset.originalLabel = label;
		button.innerHTML = `
			<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
			<span>Cargando...</span>
		`;
		return;
	}

	button.innerHTML = `<span>${escapeHtml(button.dataset.originalLabel || 'Continuar')}</span>`;
}

/**
 * Valida datos de login y retorna objeto de errores.
 */
function validateLogin(values) {
	const errors = {};

	if (!values.correo) {
		errors.correo = 'Ingresa tu correo.';
	}

	if (!values.contrasena) {
		errors.contrasena = 'Ingresa tu contraseña.';
	}

	return errors;
}

/**
 * Valida datos de registro y retorna objeto de errores.
 */
function validateRegistro(values) {
	const errors = {};

	if (!values.nombreCompleto) {
		errors.nombreCompleto = 'Ingresa tu nombre completo.';
	} else if (values.nombreCompleto.trim().split(/\s+/).length < 2) {
		errors.nombreCompleto = 'Ingresa nombre y apellido.';
	}

	if (!values.nombreUsuario) {
		errors.nombreUsuario = 'Ingresa un nombre de usuario.';
	}

	if (!values.correo) {
		errors.correo = 'Ingresa tu email.';
	}

	if (!values.contrasena) {
		errors.contrasena = 'Ingresa una contraseña.';
	} else if (values.contrasena.length < 8) {
		errors.contrasena = 'Usa al menos 8 caracteres.';
	}

	if (!values.confirmar) {
		errors.confirmar = 'Confirma tu contraseña.';
	} else if (values.confirmar !== values.contrasena) {
		errors.confirmar = 'Las contraseñas no coinciden.';
	}

	return errors;
}

/**
 * Vincula interacciones comunes de vista auth.
 */
function bindCommonEvents(contenedor, state, rerender) {
	contenedor.querySelectorAll('[data-switch-view]').forEach((button) => {
		button.addEventListener('click', () => {
			const target = String(button.dataset.switchView || 'login');
			if (target === state.view) {
				return;
			}

			state.view = target === 'registro' ? 'registro' : 'login';
			rerender(true);
		});
	});

	contenedor.querySelectorAll('[data-toggle-password]').forEach((button) => {
		button.addEventListener('click', () => {
			const inputId = String(button.dataset.togglePassword || '');
			const input = contenedor.querySelector(`#${inputId}`);
			togglePasswordVisibility(button, input);
		});
	});
}

/**
 * Vincula submit de login.
 */
function bindLoginSubmit(contenedor, state) {
	const form = contenedor.querySelector('#login-form');
	const submitBtn = contenedor.querySelector('#login-submit-btn');
	if (!form || !submitBtn) {
		return;
	}

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		clearInlineErrors(form);

		const correo = String(form.correo?.value || '').trim();
		const contrasena = String(form.contrasena?.value || '');
		const errors = validateLogin({ correo, contrasena });

		if (Object.keys(errors).length > 0) {
			Object.entries(errors).forEach(([field, message]) => {
				setInlineError(form, field, message);
			});
			return;
		}

		setSubmittingState(submitBtn, true);

		try {
			await auth.iniciarSesion(correo, contrasena);
			await actualizarNavbar();
			redirectAfterAuth();
		} catch (error) {
			if (error?.status === 401 || error?.status === 404) {
				setInlineError(form, 'correo', 'Credenciales incorrectas.');
				setInlineError(form, 'contrasena', 'Credenciales incorrectas.');
			} else if (error?.status === 403) {
				setInlineError(form, 'correo', error?.error || 'Tu cuenta está suspendida.');
			} else {
				setInlineError(form, 'correo', error?.error || 'No se pudo iniciar sesión.');
			}
		} finally {
			if (state.view === 'login') {
				setSubmittingState(submitBtn, false);
			}
		}
	});
}

/**
 * Vincula submit de registro.
 */
function bindRegistroSubmit(contenedor, state) {
	const form = contenedor.querySelector('#registro-form');
	const submitBtn = contenedor.querySelector('#registro-submit-btn');
	if (!form || !submitBtn) {
		return;
	}

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		clearInlineErrors(form);

		const values = {
			nombreCompleto: String(form.nombreCompleto?.value || '').trim(),
			nombreUsuario: String(form.nombreUsuario?.value || '').trim(),
			correo: String(form.correo?.value || '').trim(),
			contrasena: String(form.contrasena?.value || ''),
			confirmar: String(form.confirmar?.value || ''),
		};

		const errors = validateRegistro(values);
		if (Object.keys(errors).length > 0) {
			Object.entries(errors).forEach(([field, message]) => {
				setInlineError(form, field, message);
			});
			return;
		}

		const nombres = splitNombreCompleto(values.nombreCompleto);
		if (!nombres.nombre || !nombres.apellido) {
			setInlineError(form, 'nombreCompleto', 'Ingresa nombre y apellido.');
			return;
		}

		setSubmittingState(submitBtn, true);

		try {
			await auth.registro({
				nombre: nombres.nombre,
				apellido: nombres.apellido,
				nombre_usuario: values.nombreUsuario,
				correo: values.correo,
				contrasena: values.contrasena,
			});

			await actualizarNavbar();
			redirectAfterAuth();
		} catch (error) {
			if (error?.status === 409) {
				const texto = String(error?.error || '').toLowerCase();
				if (texto.includes('correo')) {
					setInlineError(form, 'correo', error.error || 'El correo ya está en uso.');
				} else if (texto.includes('usuario')) {
					setInlineError(form, 'nombreUsuario', error.error || 'El usuario ya está en uso.');
				} else {
					setInlineError(form, 'correo', error.error || 'Ya existe una cuenta con esos datos.');
				}
			} else if (error?.status === 400) {
				setInlineError(form, 'correo', error?.error || 'Hay datos inválidos.');
			} else {
				setInlineError(form, 'correo', error?.error || 'No se pudo crear la cuenta.');
			}
		} finally {
			if (state.view === 'registro') {
				setSubmittingState(submitBtn, false);
			}
		}
	});
}

/**
 * Render principal de login/registro.
 */
async function render(contenedor, params = {}) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	if (auth.estaAutenticado()) {
		redirectAfterAuth();
		return;
	}

	ensureStyles();

	const state = {
		view: getInitialView(params),
	};

	const rerender = (withTransition = false) => {
		if (withTransition) {
			const card = contenedor.querySelector('#auth-card');
			if (card) {
				card.classList.add('switching');
				window.setTimeout(() => {
					renderLayout(contenedor, state.view);
					bindCommonEvents(contenedor, state, rerender);
					bindLoginSubmit(contenedor, state);
					bindRegistroSubmit(contenedor, state);
				}, 180);
				return;
			}
		}

		renderLayout(contenedor, state.view);
		bindCommonEvents(contenedor, state, rerender);
		bindLoginSubmit(contenedor, state);
		bindRegistroSubmit(contenedor, state);
	};

	rerender(false);
}

export { render };

export default {
	render,
};
