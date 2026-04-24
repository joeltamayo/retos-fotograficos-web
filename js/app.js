import auth from './auth.js';
import { mostrarErrorPagina, mostrarLoader } from './utils.js';
import * as navbarModule from './components/navbar.js';

/**
 * Definicion de rutas del SPA.
 * Cada ruta apunta al modulo que debe renderizarse y define sus requisitos de acceso.
 */
const ROUTES = [
	{ pattern: '/home', modulePath: './pages/home.js' },
	{ pattern: '/retos', modulePath: './pages/retos.js' },
	{ pattern: '/retos/:id', modulePath: './pages/retoDetalle.js' },
	{ pattern: '/galeria', modulePath: './pages/galeria.js' },
	{ pattern: '/ranking', modulePath: './pages/ranking.js' },
	{ pattern: '/perfil/:usuario', modulePath: './pages/perfil.js' },
	{ pattern: '/login', modulePath: './pages/login.js' },
	{ pattern: '/admin', modulePath: './admin/admin.js', requiresAuth: true, requiresAdmin: true },
	{ pattern: '/admin/*', modulePath: './admin/admin.js', requiresAuth: true, requiresAdmin: true },
];

const HASH_HOME = '#/home';
const HASH_LOGIN = '#/login';
const KEY_RUTA_DESTINO = 'rutaDestino';

/**
 * Evita que un render viejo sobreescriba la vista cuando hay navegaciones consecutivas rapidas.
 */
let navigationToken = 0;

/**
 * Normaliza el hash actual a una ruta usable por el matcher.
 */
function getCurrentPath() {
	const rawHash = window.location.hash || '';
	const hashWithoutSymbol = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
	const [pathPart = ''] = hashWithoutSymbol.split('?');

	if (!pathPart || pathPart === '/') {
		return '';
	}

	const normalized = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
	return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized;
}

/**
 * Convierte ruta en segmentos limpios para comparar dinamicamente.
 */
function splitSegments(path) {
	return path
		.split('/')
		.map((segment) => segment.trim())
		.filter(Boolean);
}

/**
 * Intenta matchear una ruta contra el patron definido.
 * Retorna params dinamicos cuando coincide.
 */
function matchPattern(pattern, path) {
	const patternSegments = splitSegments(pattern);
	const pathSegments = splitSegments(path);
	const params = {};

	if (patternSegments.length === 0 && pathSegments.length === 0) {
		return { matched: true, params };
	}

	const wildcard = patternSegments[patternSegments.length - 1] === '*';
	if (!wildcard && patternSegments.length !== pathSegments.length) {
		return { matched: false, params: {} };
	}

	if (wildcard && pathSegments.length < patternSegments.length - 1) {
		return { matched: false, params: {} };
	}

	const limit = wildcard ? patternSegments.length - 1 : patternSegments.length;

	for (let index = 0; index < limit; index += 1) {
		const patternSegment = patternSegments[index];
		const pathSegment = pathSegments[index];

		if (patternSegment.startsWith(':')) {
			const paramName = patternSegment.slice(1);
			params[paramName] = decodeURIComponent(pathSegment);
			continue;
		}

		if (patternSegment !== pathSegment) {
			return { matched: false, params: {} };
		}
	}

	return { matched: true, params };
}

/**
 * Resuelve la ruta actual a su configuracion y parametros.
 * Ejemplo: #/retos/abc-123 => { route.pattern:'/retos/:id', params:{ id:'abc-123' } }
 */
function resolveRoute(path) {
	for (const route of ROUTES) {
		const result = matchPattern(route.pattern, path);
		if (result.matched) {
			return {
				route,
				params: result.params,
			};
		}
	}

	return null;
}

/**
 * Permite navegar de forma programatica desde cualquier modulo del frontend.
 */
function navegarA(hash) {
	const destino = hash.startsWith('#') ? hash : `#${hash}`;

	if (window.location.hash === destino) {
		renderCurrentRoute();
		return;
	}

	window.location.hash = destino;
}

/**
 * Obtiene la funcion render de un modulo de pagina/admin.
 * Soporta export nombrado, default function o default object con render.
 */
function resolveRenderFunction(moduleExports) {
	if (typeof moduleExports?.render === 'function') {
		return moduleExports.render;
	}

	if (typeof moduleExports?.default === 'function') {
		return moduleExports.default;
	}

	if (typeof moduleExports?.default?.render === 'function') {
		return moduleExports.default.render;
	}

	return null;
}

/**
 * Reglas de acceso para rutas protegidas y de administrador.
 */
function canAccessRoute(route) {
	if (route.requiresAuth && !auth.estaAutenticado()) {
		const destino = window.location.hash || HASH_HOME;
		sessionStorage.setItem(KEY_RUTA_DESTINO, destino);
		navegarA(HASH_LOGIN);
		return false;
	}

	if (route.requiresAdmin && !auth.esAdmin()) {
		navegarA(HASH_HOME);
		return false;
	}

	return true;
}

/**
 * Renderiza la ruta actual.
 * Flujo: resolver ruta -> validar acceso -> mostrar loader -> render pagina.
 */
async function renderCurrentRoute() {
	const appContainer = document.getElementById('app');
	if (!appContainer) {
		return;
	}

	const path = getCurrentPath();
	if (!path) {
		navegarA(HASH_HOME);
		return;
	}

	const resolved = resolveRoute(path);
	if (!resolved) {
		navegarA(HASH_HOME);
		return;
	}

	const { route, params } = resolved;
	if (!canAccessRoute(route)) {
		return;
	}

	const currentToken = ++navigationToken;
	mostrarLoader(appContainer);

	try {
		const moduleExports = await import(route.modulePath);

		if (currentToken !== navigationToken) {
			return;
		}

		const render = resolveRenderFunction(moduleExports);
		if (typeof render !== 'function') {
			throw new Error(`El modulo ${route.modulePath} no exporta una funcion render.`);
		}

		await render(appContainer, params);
	} catch (error) {
		if (currentToken !== navigationToken) {
			return;
		}

		const mensaje = error instanceof Error ? error.message : 'No fue posible renderizar la vista actual.';
		mostrarErrorPagina(appContainer, 'error', mensaje);
	}
}

/**
 * Renderiza navbar si el modulo correspondiente ya provee una funcion publica.
 */
async function renderNavbar() {
	const fn =
		navbarModule.renderNavbar
		|| (typeof navbarModule.default === 'function' ? navbarModule.default : null)
		|| navbarModule.default?.renderNavbar;

	if (typeof fn === 'function') {
		await fn();
	}
}

/**
 * Inicializa sesion, navbar y primera ruta del SPA.
 */
async function bootstrapApp() {
	await auth.verificarSesion();
	await renderNavbar();
	await renderCurrentRoute();

	const initialLoader = document.getElementById('initial-loader');
	if (initialLoader) {
		initialLoader.remove();
	}
}

window.addEventListener('hashchange', renderCurrentRoute);
window.addEventListener('DOMContentLoaded', bootstrapApp);

export { navegarA };

