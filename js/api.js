/**
 * URL base del backend Express para todos los endpoints del SPA.
 */
const BASE_URL = 'http://localhost:3000/api';

/**
 * Hash de ruta usado para enviar al usuario al login cuando su sesión expira.
 */
const LOGIN_HASH = '#/login';

/**
 * Construye una URL absoluta combinando BASE_URL con un endpoint relativo.
 * Si ya se recibe una URL absoluta, la devuelve tal cual para no romper llamados externos.
 */
function buildUrl(endpoint) {
	if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
		return endpoint;
	}

	const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
	return `${BASE_URL}${normalizedEndpoint}`;
}

/**
 * Determina si un valor es un objeto plano para serializarlo como JSON.
 */
function isPlainObject(value) {
	return Object.prototype.toString.call(value) === '[object Object]';
}

/**
 * Intenta parsear JSON de una respuesta sin romper flujo cuando no hay body JSON válido.
 */
async function safeParseJson(response) {
	try {
		return await response.json();
	} catch {
		return {};
	}
}

/**
 * Ejecuta el refresh de tokens mediante cookie httpOnly.
 * Devuelve true si el backend renovó exitosamente el access token.
 */
async function refreshAccessToken() {
	try {
		const refreshResponse = await fetch(buildUrl('/auth/refresh'), {
			method: 'POST',
			credentials: 'include',
		});

		return refreshResponse.ok;
	} catch {
		return false;
	}
}

/**
 * Cierra sesión usando el módulo auth y redirige al login del SPA.
 * El import dinámico evita dependencias circulares entre auth.js y api.js.
 */
async function logoutAndRedirectToLogin() {
	try {
		const authModule = await import('./auth.js');
		const auth = authModule?.default;

		if (auth && typeof auth.logout === 'function') {
			await auth.logout();
		}
	} catch {
		// Si auth.js aún no está implementado o falla, mantenemos la redirección.
	}

	window.location.hash = LOGIN_HASH;
}

/**
 * Normaliza las opciones de fetch:
 * - Fuerza credentials: 'include' para enviar cookies httpOnly.
 * - Si body es objeto plano, aplica JSON.stringify y Content-Type JSON.
 * - Si body es FormData, evita forzar Content-Type para que el browser lo gestione.
 */
function normalizeRequestOptions(options = {}) {
	const { body, headers, ...restOptions } = options;
	const normalizedHeaders = new Headers(headers || {});
	const requestOptions = {
		...restOptions,
		credentials: 'include',
		headers: normalizedHeaders,
	};

	if (body === undefined || body === null) {
		return requestOptions;
	}

	if (body instanceof FormData) {
		requestOptions.body = body;
		return requestOptions;
	}

	if (isPlainObject(body)) {
		if (!normalizedHeaders.has('Content-Type')) {
			normalizedHeaders.set('Content-Type', 'application/json');
		}

		requestOptions.body = JSON.stringify(body);
		return requestOptions;
	}

	requestOptions.body = body;
	return requestOptions;
}

/**
 * Wrapper principal de fetch para el SPA.
 * Maneja refresh automático al recibir TOKEN_EXPIRADO y reintenta una sola vez.
 */
async function apiFetch(endpoint, options = {}, hasRetried = false) {
	const requestOptions = normalizeRequestOptions(options);
	const response = await fetch(buildUrl(endpoint), requestOptions);

	if (response.status === 401) {
		const errorBody = await safeParseJson(response);
		const tokenExpirado = errorBody?.error === 'TOKEN_EXPIRADO';

		if (tokenExpirado && !hasRetried) {
			const refreshed = await refreshAccessToken();

			if (refreshed) {
				return apiFetch(endpoint, options, true);
			}

			await logoutAndRedirectToLogin();
			throw { status: 401, ...errorBody };
		}

		if (tokenExpirado && hasRetried) {
			await logoutAndRedirectToLogin();
		}

		throw { status: 401, ...errorBody };
	}

	if (!response.ok) {
		const errorBody = await safeParseJson(response);
		throw { status: response.status, ...errorBody };
	}

	return response.json();
}

/**
 * Construye query string a partir de un objeto de parámetros.
 * Ignora null/undefined y soporta arrays (repite la misma clave).
 */
function buildQueryString(params = {}) {
	const searchParams = new URLSearchParams();

	Object.entries(params).forEach(([key, value]) => {
		if (value === undefined || value === null) {
			return;
		}

		if (Array.isArray(value)) {
			value.forEach((item) => {
				if (item !== undefined && item !== null) {
					searchParams.append(key, String(item));
				}
			});
			return;
		}

		searchParams.append(key, String(value));
	});

	const queryString = searchParams.toString();
	return queryString ? `?${queryString}` : '';
}

/**
 * Cliente HTTP público del frontend.
 * Cada método delega en apiFetch para centralizar autenticación y errores.
 */
const api = {
	get(endpoint, params = {}) {
		const queryString = buildQueryString(params);
		return apiFetch(`${endpoint}${queryString}`, { method: 'GET' });
	},

	post(endpoint, body) {
		return apiFetch(endpoint, { method: 'POST', body });
	},

	put(endpoint, body) {
		return apiFetch(endpoint, { method: 'PUT', body });
	},

	patch(endpoint, body) {
		return apiFetch(endpoint, { method: 'PATCH', body });
	},

	delete(endpoint) {
		return apiFetch(endpoint, { method: 'DELETE' });
	},

	upload(endpoint, formData, method = 'POST') {
		return apiFetch(endpoint, { method, body: formData });
	},
};

export { BASE_URL, apiFetch };
export default api;
