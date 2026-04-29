import auth from '../auth.js';
import { actualizarNavbar } from '../components/navbar.js';

const KEY_RUTA_DESTINO = 'rutaDestino';

function escapeHtml(value) {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

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

function getTabFromHash() {
	const rawHash = window.location.hash || '#/login';
	const hashWithoutSign = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
	const queryString = hashWithoutSign.includes('?') ? hashWithoutSign.split('?')[1] : '';
	const params = new URLSearchParams(queryString);
	return String(params.get('tab') || '').toLowerCase();
}

function getInitialView(params) {
	const fromParams = String(params?.tab || '').toLowerCase();
	if (fromParams === 'registro') {
		return 'registro';
	}

	return getTabFromHash() === 'registro' ? 'registro' : 'login';
}

function redirectAfterAuth() {
	const rutaDestino = sessionStorage.getItem(KEY_RUTA_DESTINO) || '#/home';
	sessionStorage.removeItem(KEY_RUTA_DESTINO);
	window.location.hash = rutaDestino;
}

function renderLoginForm() {
	return `
		<h1 class="lg-title">Iniciar Sesión</h1>

		<form id="login-form" novalidate>
			<label class="lg-label" for="login-correo">Usuario</label>
			<input id="login-correo" name="correo" type="email" class="lg-input" placeholder="tu@email.com" autocomplete="email">
			<p class="lg-error" data-error="correo"></p>

			<label class="lg-label" for="login-contrasena">Contraseña</label>
			<input id="login-contrasena" name="contrasena" type="password" class="lg-input" placeholder="••••••••" autocomplete="current-password">
			<p class="lg-error" data-error="contrasena"></p>

			<button type="submit" class="lg-btn-primary" id="login-submit-btn">
				<span>Iniciar Sesión</span>
			</button>
		</form>
	`;
}

function renderLoginPromo() {
	return `
		<h2 class="lg-right-title">¡Bienvenido a PhotoChallenge!</h2>
		<p>¿No tienes una cuenta?</p>
		<button type="button" class="lg-btn-outline" data-switch-view="registro">Regístrate</button>
	`;
}

function renderRegistroForm() {
	return `
		<h1 class="lg-title">Crear Cuenta</h1>

		<form id="registro-form" novalidate>
			<label class="lg-label" for="registro-nombre-completo">Nombre Completo</label>
			<input id="registro-nombre-completo" name="nombreCompleto" type="text" class="lg-input" placeholder="Juan Pérez" autocomplete="name">
			<p class="lg-error" data-error="nombreCompleto"></p>

			<label class="lg-label" for="registro-nombre-usuario">Nombre de Usuario</label>
			<input id="registro-nombre-usuario" name="nombreUsuario" type="text" class="lg-input" placeholder="juanperez" autocomplete="username">
			<p class="lg-error" data-error="nombreUsuario"></p>

			<label class="lg-label" for="registro-correo">Email</label>
			<input id="registro-correo" name="correo" type="email" class="lg-input" placeholder="tu@email.com" autocomplete="email">
			<p class="lg-error" data-error="correo"></p>

			<label class="lg-label" for="registro-contrasena">Contraseña</label>
			<input id="registro-contrasena" name="contrasena" type="password" class="lg-input" placeholder="••••••••" autocomplete="new-password">
			<p class="lg-error" data-error="contrasena"></p>

			<label class="lg-label" for="registro-confirmar">Confirmar Contraseña</label>
			<input id="registro-confirmar" name="confirmar" type="password" class="lg-input" placeholder="••••••••" autocomplete="new-password">
			<p class="lg-error" data-error="confirmar"></p>

			<button type="submit" class="lg-btn-primary" id="registro-submit-btn">
				<span>Registrarse</span>
			</button>
		</form>
	`;
}

function renderRegistroPromo() {
	return `
		<h2 class="lg-right-title">Únete a la comunidad</h2>
		<div class="lg-benefit">
			<i class="bi bi-bullseye lg-benefit__icon"></i>
			<div>
				<p class="lg-benefit__title">Participa en retos</p>
				<p class="lg-benefit__desc">Desafíos semanales y mensuales.</p>
			</div>
		</div>
		<div class="lg-benefit">
			<i class="bi bi-star lg-benefit__icon"></i>
			<div>
				<p class="lg-benefit__title">Gana reconocimiento</p>
				<p class="lg-benefit__desc">Recibe valoraciones e insignias.</p>
			</div>
		</div>
		<div class="lg-benefit">
			<i class="bi bi-camera lg-benefit__icon"></i>
			<div>
				<p class="lg-benefit__title">Mejora tus habilidades</p>
				<p class="lg-benefit__desc">Comparte y aprende de otros fotógrafos.</p>
			</div>
		</div>
		<button type="button" class="lg-btn-outline" data-switch-view="login">Inicia Sesión</button>
	`;
}

function renderLayout(contenedor, view) {
	const isRegistro = view === 'registro';
	const leftHtml = isRegistro ? renderRegistroForm() : renderLoginForm();
	const rightHtml = isRegistro ? renderRegistroPromo() : renderLoginPromo();

	contenedor.innerHTML = `
		<section class="lg-page">
			<div class="lg-card">
				<div class="lg-left">${leftHtml}</div>
				<div class="lg-right">${rightHtml}</div>
			</div>
		</section>
	`;
}

function clearInlineErrors(form) {
	form.querySelectorAll('[data-error]').forEach((node) => {
		node.textContent = '';
	});
}

function setInlineError(form, field, message) {
	const errorNode = form.querySelector(`[data-error="${field}"]`);
	if (errorNode) {
		errorNode.textContent = message;
	}
}

function setSubmittingState(button, isSubmitting) {
	if (!button) {
		return;
	}

	button.disabled = isSubmitting;
	if (isSubmitting) {
		button.dataset.originalLabel = button.textContent?.trim() || 'Continuar';
		button.innerHTML = '<span>Cargando...</span>';
		return;
	}

	button.innerHTML = `<span>${escapeHtml(button.dataset.originalLabel || 'Continuar')}</span>`;
}

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

function bindCommonEvents(contenedor, state, rerender) {
	contenedor.querySelectorAll('[data-switch-view]').forEach((button) => {
		button.addEventListener('click', () => {
			const target = String(button.dataset.switchView || 'login');
			if (target === state.view) {
				return;
			}

			state.view = target === 'registro' ? 'registro' : 'login';
			rerender();
		});
	});
}

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

async function render(contenedor, params = {}) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	if (auth.estaAutenticado()) {
		redirectAfterAuth();
		return;
	}

	const state = {
		view: getInitialView(params),
	};

	const rerender = () => {
		renderLayout(contenedor, state.view);
		bindCommonEvents(contenedor, state, rerender);
		bindLoginSubmit(contenedor, state);
		bindRegistroSubmit(contenedor, state);
	};

	rerender();
}

export { render };

export default {
	render,
};
