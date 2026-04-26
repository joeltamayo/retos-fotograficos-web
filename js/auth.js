import api, { BASE_URL } from './api.js';

const FORCE_LOGOUT_EVENT = 'photochallenge:auth-force-logout';

/**
 * Estado de sesión en memoria del navegador.
 * No se persiste en localStorage para evitar almacenar datos sensibles en cliente.
 */
let _usuario = null;

/**
 * Limpia sesión local en memoria.
 */
function limpiarSesionLocal() {
	_usuario = null;
}

window.addEventListener(FORCE_LOGOUT_EVENT, limpiarSesionLocal);

/**
 * Construye una URL absoluta para endpoints de autenticación.
 */
function buildAuthUrl(endpoint) {
	const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
	return `${BASE_URL}${normalizedEndpoint}`;
}

/**
 * Normaliza respuestas de backend que pueden venir como { usuario } o como objeto usuario directo.
 */
function normalizeUsuario(payload) {
	if (!payload || typeof payload !== 'object') {
		return null;
	}

	if (payload.usuario && typeof payload.usuario === 'object') {
		return payload.usuario;
	}

	return payload;
}

/**
 * Inicia sesión con correo y contraseña.
 * Si el login es exitoso, actualiza el estado de sesión en memoria.
 */
async function iniciarSesion(correo, contrasena) {
	const response = await api.post('/auth/login', { correo, contrasena });
	const usuario = normalizeUsuario(response);

	_usuario = usuario;
	return usuario;
}

/**
 * Registra una cuenta nueva y guarda el usuario autenticado en memoria.
 */
async function registro(datos) {
	const response = await api.post('/auth/registro', datos);
	const usuario = normalizeUsuario(response);

	_usuario = usuario;
	return usuario;
}

/**
 * Cierra sesión en backend y limpia el estado local.
 * Se usa fetch directo para evitar ciclos con api.js cuando la sesión expira.
 */
async function logout() {
	try {
		await fetch(buildAuthUrl('/auth/logout'), {
			method: 'POST',
			credentials: 'include',
		});
	} catch {
		// Aunque falle la red, limpiamos estado local para dejar al cliente en modo anónimo.
	} finally {
		limpiarSesionLocal();
		window.location.hash = '#/home';
	}
}

/**
 * Verifica sesión activa usando refresh token en cookie httpOnly.
 * Si refresh es válido, consulta /usuarios/me para obtener datos actuales.
 * Si falla, deja al cliente como anónimo sin lanzar error.
 */
async function verificarSesion() {
	try {
		const refreshResponse = await fetch(buildAuthUrl('/auth/refresh'), {
			method: 'POST',
			credentials: 'include',
		});

		if (!refreshResponse.ok) {
			limpiarSesionLocal();
			return null;
		}

		const perfilActual = await api.get('/usuarios/me');
		_usuario = normalizeUsuario(perfilActual);
		return _usuario;
	} catch {
		limpiarSesionLocal();
		return null;
	}
}

/**
 * Devuelve el usuario actual en memoria (o null si no hay sesión).
 */
function getUsuario() {
	return _usuario;
}

/**
 * Indica si hay sesión autenticada en memoria.
 */
function estaAutenticado() {
	return _usuario !== null;
}

/**
 * Evalúa si el usuario actual tiene rol de administrador.
 */
function esAdmin() {
	return _usuario?.rol === 'administrador';
}

const auth = {
	iniciarSesion,
	registro,
	logout,
	verificarSesion,
	getUsuario,
	estaAutenticado,
	esAdmin,
};

export {
	iniciarSesion,
	registro,
	logout,
	verificarSesion,
	getUsuario,
	estaAutenticado,
	esAdmin,
};

export default auth;
