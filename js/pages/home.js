import api from '../api.js';
import auth from '../auth.js';
import { gridRetos } from '../components/cardReto.js';
import { gridFotos } from '../components/cardFoto.js';
import { manejarErrorDePagina, skeletonCard } from '../utils.js';

/**
 * Escapa HTML para renderizado seguro de texto dinámico.
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
 * Construye el layout base de la página y devuelve referencias útiles.
 */
function renderLayout(contenedor, usuarioAutenticado) {
	const nombre = escapeHtml(usuarioAutenticado?.nombre || usuarioAutenticado?.nombre_usuario || 'Usuario');

	contenedor.innerHTML = `
		<section class="hm-page page-enter">
			${usuarioAutenticado
				? `
					<header class="hm-greeting mb-2">
						<h1 class="hm-greeting-title">Bienvenido, ${nombre}</h1>
						<p class="hm-greeting-subtitle">Explora los retos activos y comparte tu mejor trabajo</p>
					</header>
				`
				: ''}

			<section class="hm-section" aria-label="Retos activos">
				<div class="hm-section-header">
					<h2 class="hm-section-title">Retos Activos</h2>
					<a class="hm-ver-todos" href="#/retos">Ver todos &rarr;</a>
				</div>
				<div id="home-retos-contenido"></div>
			</section>

			<section class="hm-section" aria-label="Fotos recientes">
				<div class="hm-section-header">
					<h2 class="hm-section-title">Fotos Recientes</h2>
				</div>
				<div id="home-fotos-contenido"></div>
			</section>

			${usuarioAutenticado
				? `
					<section class="hm-section" aria-label="Mis participaciones">
						<div class="hm-section-header">
							<h2 class="hm-section-title">Mis Participaciones</h2>
						</div>
						<div id="home-participaciones-contenido"></div>
					</section>
				`
				: ''}
		</section>
	`;

	return {
		retos: contenedor.querySelector('#home-retos-contenido'),
		fotos: contenedor.querySelector('#home-fotos-contenido'),
		participaciones: contenedor.querySelector('#home-participaciones-contenido'),
	};
}

/**
 * Muestra skeletons para la sección de retos.
 */
function showRetosSkeleton(contenedor) {
	if (!contenedor) {
		return;
	}

	contenedor.innerHTML = `
		<div class="hm-skeleton-grid hm-skeleton-grid--retos">
			${Array.from({ length: 3 }, () => skeletonCard('290px')).join('')}
		</div>
	`;
}

/**
 * Muestra skeletons cuadrados para fotos recientes y participaciones.
 */
function showFotosSkeleton(contenedor, cantidad, variante = 'fotos') {
	if (!contenedor) {
		return;
	}

	const claseVariante = variante === 'participaciones'
		? 'hm-skeleton-grid--participaciones'
		: 'hm-skeleton-grid--fotos';

	contenedor.innerHTML = `
		<div class="hm-skeleton-grid ${claseVariante}">
			${Array.from({ length: cantidad }, () => `<div class="hm-skeleton-square skeleton"></div>`).join('')}
		</div>
	`;
}

/**
 * Muestra un mensaje simple de error dentro de una sección.
 */
function showSectionError(contenedor, mensaje) {
	if (!contenedor) {
		return;
	}

	contenedor.innerHTML = `<p class="hm-error-note">${escapeHtml(mensaje)}</p>`;
}

/**
 * Convierte participaciones del endpoint a estructura compatible con cardFoto().
 */
function mapParticipacionesToFotos(participaciones, usuarioActual) {
	if (!Array.isArray(participaciones)) {
		return [];
	}

	return participaciones
		.filter((item) => item?.fotografia_id)
		.map((item) => ({
			id: item.fotografia_id,
			imagen_url: item.foto_imagen_url || item.imagen_url || '',
			titulo: item.foto_titulo || item.reto_titulo || 'Sin título',
			nombre_usuario: usuarioActual?.nombre_usuario || 'usuario',
			foto_perfil_url: usuarioActual?.foto_perfil_url || '',
			total_comentarios: item.total_comentarios || 0,
			puntuacion_promedio: item.puntuacion_promedio || 0,
			prom_creatividad: item.prom_creatividad || 0,
			prom_composicion: item.prom_composicion || 0,
			prom_tema: item.prom_tema || 0,
			reto_titulo: item.reto_titulo || '',
		}));
}

/**
 * Render principal de la página Home.
 */
async function render(contenedor, params = {}) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	void params;

	const usuarioAutenticado = auth.getUsuario();
	const refs = renderLayout(contenedor, usuarioAutenticado);

	showRetosSkeleton(refs.retos);
	showFotosSkeleton(refs.fotos, 8, 'fotos');

	if (refs.participaciones) {
		showFotosSkeleton(refs.participaciones, 4, 'participaciones');
	}

	const homePromise = api.get('/home');

	// Requisito: usar Promise.all para secciones de retos y fotos recientes.
	const retosPromise = homePromise.then((response) => response?.retos_activos || []);
	const fotosPromise = homePromise.then((response) => response?.fotos_recientes || []);

	const participacionesPromise = refs.participaciones
		? api.get('/usuarios/me/participaciones', { limite: 4 })
		: Promise.resolve(null);

	const [homeSectionsResult, participacionesResult] = await Promise.allSettled([
		Promise.all([retosPromise, fotosPromise]),
		participacionesPromise,
	]);

	if (homeSectionsResult.status === 'rejected') {
		manejarErrorDePagina(contenedor, homeSectionsResult.reason, {
			notFoundMessage: 'No encontramos la portada solicitada.',
			forbiddenMessage: 'No tienes permisos para acceder a esta seccion.',
			fallbackMessage: 'No se pudieron cargar los datos principales de inicio.',
		});
		return;
	}

	const [retosActivos, fotosRecientes] = homeSectionsResult.value;
	gridRetos(Array.isArray(retosActivos) ? retosActivos.slice(0, 3) : [], refs.retos);
	gridFotos(Array.isArray(fotosRecientes) ? fotosRecientes.slice(0, 8) : [], refs.fotos);

	if (refs.participaciones) {
		if (participacionesResult.status === 'fulfilled') {
			const participaciones = participacionesResult.value?.participaciones || [];
			const fotosParticipacion = mapParticipacionesToFotos(participaciones, usuarioAutenticado).slice(0, 4);

			if (fotosParticipacion.length === 0) {
				refs.participaciones.innerHTML = '<p class="hm-empty-note">Aún no has participado en ningún reto. ¡Únete ahora!</p>';
			} else {
				gridFotos(fotosParticipacion, refs.participaciones, { mostrarReto: true });
			}
		} else {
			const status = Number(participacionesResult.reason?.status);
			if (status === 401) {
				window.location.hash = '#/login';
				return;
			}

			if (status === 403) {
				showSectionError(refs.participaciones, 'Acceso denegado a tus participaciones.');
				return;
			}

			showSectionError(refs.participaciones, participacionesResult.reason?.error || 'No se pudieron cargar tus participaciones.');
		}
	}
}

export { render };

export default {
	render,
};
