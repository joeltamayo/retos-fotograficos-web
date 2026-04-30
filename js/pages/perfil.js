import api from '../api.js';
import auth from '../auth.js';
import { cardFoto } from '../components/cardFoto.js';
import { abrirModalFoto } from '../components/modalFoto.js';
import { abrirModalEditarPerfil } from '../components/modalEditarPerfil.js';
import { manejarErrorDePagina, mostrarErrorPagina, skeletonCard } from '../utils.js';
import { cloudinaryUrl } from '../utils.js';

const ORDEN_RECIENTES = 'recientes';
const ORDEN_MEJORES = 'mejores';

/**
 * Escapa texto para render HTML seguro.
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
 * Convierte a entero visual seguro.
 */
function toInt(value) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

/**
 * Convierte a decimal visual con 1 digito.
 */
function toDecimal(value) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed.toFixed(1) : '0.0';
}

/**
 * Formatea fecha de registro como "abril de 2026".
 */
function formatMemberSince(value) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return 'fecha no disponible';
	}

	return new Intl.DateTimeFormat('es-MX', {
		month: 'long',
		year: 'numeric',
	}).format(date);
}

/**
 * Obtiene nombre completo o fallback.
 */
function getFullName(perfil) {
	const nombre = String(perfil?.nombre || '').trim();
	const apellido = String(perfil?.apellido || '').trim();
	const joined = [nombre, apellido].filter(Boolean).join(' ').trim();
	return joined || perfil?.nombre_usuario || 'Usuario';
}


/**
 * Devuelve avatar o placeholder.
 */
function renderAvatar(url, altText) {
	if (url) {
		return `<img class="pf-avatar" src="${escapeHtml(url)}" alt="${escapeHtml(altText)}">`;
	}

	return '<span class="pf-avatar-placeholder"><i class="bi bi-person"></i></span>';
}

/**
 * Renderiza estructura base y devuelve referencias DOM.
 */
function renderLayout(contenedor, perfil, esPerfilPropio, ordenActivo) {
	const totalFotos = toInt(perfil?.total_fotos);
	const totalRetos = toInt(perfil?.total_retos);
	const totalVotos = toInt(perfil?.total_votos_recibidos);
	const promedio = toDecimal(perfil?.calificacion_promedio);
	const nombreUsuario = perfil?.nombre_usuario || '';
	const nombreCompleto = getFullName(perfil);
	const avatarUrl = perfil?.foto_perfil_public_id
		? cloudinaryUrl(perfil.foto_perfil_public_id, { width: 200, height: 200, crop: 'fill' })
		: (perfil?.foto_perfil_url || '');

	contenedor.innerHTML = `
		<section class="pf-page page-enter">
			<a class="pf-breadcrumb" href="#/home">
				<span>←</span>
				<span>Perfil de Usuario</span>
			</a>

			<section class="pf-card" aria-label="Perfil de usuario">
				<header class="pf-header">
					<div>${renderAvatar(avatarUrl, `Avatar de ${nombreCompleto}`)}</div>

					<div>
						<h1 class="pf-name">${escapeHtml(nombreCompleto)}</h1>
						<p class="pf-username">@${escapeHtml(nombreUsuario)}</p>
						<p class="pf-bio">${escapeHtml(perfil?.biografia || 'Este usuario aún no agregó una biografía.')}</p>
						<p class="pf-member"><i class="bi bi-calendar3"></i>Miembro desde ${escapeHtml(formatMemberSince(perfil?.fecha_registro))}</p>
					</div>

					${esPerfilPropio
						? `
							<button type="button" id="perfil-editar-btn" class="pf-edit-btn">
								<i class="bi bi-pencil-square"></i>
								<span>Editar Perfil</span>
							</button>
						`
						: ''}
				</header>

				<div class="pf-divider"></div>

				<section class="pf-stats" aria-label="Estadísticas del perfil">
					<article class="pf-stat">
						<span class="pf-stat-value">${totalFotos}</span>
						<span class="pf-stat-label"><i class="bi bi-camera"></i>Fotografías</span>
					</article>

					<article class="pf-stat">
						<span class="pf-stat-value">${totalRetos}</span>
						<span class="pf-stat-label"><i class="bi bi-trophy"></i>Retos</span>
					</article>

					<article class="pf-stat">
						<span class="pf-stat-value">${totalVotos}</span>
						<span class="pf-stat-label"><i class="bi bi-star"></i>Votos</span>
					</article>

					<article class="pf-stat">
						<span class="pf-stat-value">${promedio}</span>
						<span class="pf-stat-label"><i class="bi bi-bar-chart-line"></i>Promedio</span>
					</article>
				</section>

				<div class="pf-divider"></div>

				<section aria-label="Insignias">
					<h2 class="pf-badges-title"><i class="bi bi-award"></i>Insignias</h2>
					<div class="pf-badges-placeholders">
						<span class="pf-badge-placeholder"></span>
						<span class="pf-badge-placeholder"></span>
						<span class="pf-badge-placeholder"></span>
					</div>
				</section>
			</section>

			<div class="pf-tabs" role="tablist" aria-label="Cambiar orden de fotos">
				<button type="button" class="pf-tab-btn ${ordenActivo === ORDEN_RECIENTES ? 'is-active' : ''}" data-orden="${ORDEN_RECIENTES}">
					<i class="bi bi-image"></i>
					<span>Fotografías (${totalFotos})</span>
				</button>

				<button type="button" class="pf-tab-btn ${ordenActivo === ORDEN_MEJORES ? 'is-active' : ''}" data-orden="${ORDEN_MEJORES}">
					<i class="bi bi-trophy"></i>
					<span>Más Votadas</span>
				</button>
			</div>

			<section class="pf-grid-wrap" id="perfil-fotos-wrap" aria-label="Fotografías del usuario"></section>
		</section>
	`;

	return {
		editarBtn: contenedor.querySelector('#perfil-editar-btn'),
		tabs: Array.from(contenedor.querySelectorAll('.pf-tab-btn')),
		fotosWrap: contenedor.querySelector('#perfil-fotos-wrap'),
	};
}

/**
 * Muestra skeleton de carga para el perfil completo (header + fotos).
 */
function renderProfileHeaderSkeleton(contenedor) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	contenedor.innerHTML = `
		<section class="pf-page page-enter">
			<a class="pf-breadcrumb" href="#/home">
				<span>←</span>
				<span>Perfil de Usuario</span>
			</a>

			<section class="pf-card" aria-label="Perfil de usuario">
				<header class="pf-header">
					<div class="skeleton pf-sk-avatar"></div>
					<div>
						<div class="skeleton pf-sk-line pf-sk-line--title"></div>
						<div class="skeleton pf-sk-line pf-sk-line--user"></div>
						<div class="skeleton pf-sk-line pf-sk-line--bio"></div>
						<div class="skeleton pf-sk-line pf-sk-line--meta"></div>
					</div>
				</header>

				<div class="pf-divider"></div>

				<section class="pf-stats" aria-label="Estadísticas del perfil">
					${Array.from({ length: 4 }, () => `<article class="pf-stat">
						<div class="skeleton pf-sk-stat-num"></div>
						<div class="skeleton pf-sk-stat-label"></div>
					</article>`).join('')}
				</section>

				<div class="pf-divider"></div>

				<section aria-label="Insignias">
					<h2 class="pf-badges-title"><i class="bi bi-award"></i>Insignias</h2>
					<div class="pf-badges-placeholders">
						${Array.from({ length: 3 }, () => '<div class="skeleton pf-sk-dot"></div>').join('')}
					</div>
				</section>
			</section>

			<div class="pf-tabs" role="tablist" aria-label="Cambiar orden de fotos">
				${Array.from({ length: 2 }, () => `<button class="pf-tab-btn" disabled>
					<div class="skeleton pf-sk-tab-label"></div>
				</button>`).join('')}
			</div>

			<section class="pf-grid-wrap">
				<div class="pf-skeleton-grid">
					${Array.from({ length: 6 }, () => skeletonCard('300px')).join('')}
				</div>
			</section>
		</section>
	`;
}

/**
 * Muestra skeleton de carga en el grid.
 */
function renderFotosSkeleton(contenedor) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	contenedor.innerHTML = `
		<div class="pf-skeleton-grid">
			${Array.from({ length: 6 }, () => skeletonCard('300px')).join('')}
		</div>
	`;
}

/**
 * Renderiza grid con cardFoto y click para abrir detalle.
 */
function renderFotosGrid(contenedor, fotos) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	if (!Array.isArray(fotos) || fotos.length === 0) {
		contenedor.innerHTML = '<p class="pf-empty">Este usuario no tiene fotografías en esta sección.</p>';
		return;
	}

	contenedor.innerHTML = `
		<div class="pf-grid">
			${fotos.map((foto) => `<div class="pf-grid-item">${cardFoto(foto)}</div>`).join('')}
		</div>
	`;

	contenedor.querySelectorAll('.cf-card').forEach((card, index) => {
		const foto = fotos[index];

		card.addEventListener('mouseenter', () => {
			card.classList.add('is-hovering');
		});

		card.addEventListener('mouseleave', () => {
			card.classList.remove('is-hovering');
		});

		card.addEventListener('click', async () => {
			if (foto?.id) {
				await abrirModalFoto(foto.id);
			}
		});
	});
}

/**
 * Carga fotos por orden y renderiza resultado.
 */
async function loadFotos(state, refs) {
	renderFotosSkeleton(refs.fotosWrap);

	if (Array.isArray(state.fotosPorOrden[state.ordenActivo])) {
		renderFotosGrid(refs.fotosWrap, state.fotosPorOrden[state.ordenActivo]);
		return;
	}

	try {
		const response = await api.get(`/usuarios/${encodeURIComponent(state.usuario)}/fotos`, {
			orden: state.ordenActivo,
			pagina: 1,
			limite: 12,
		});

		const fotos = Array.isArray(response?.fotos) ? response.fotos : [];
		state.fotosPorOrden[state.ordenActivo] = fotos;
		renderFotosGrid(refs.fotosWrap, fotos);
	} catch (error) {
		manejarErrorDePagina(refs.fotosWrap, error, {
			notFoundMessage: 'No encontramos fotografias para este perfil.',
			forbiddenMessage: 'No tienes permisos para ver estas fotografias.',
			fallbackMessage: 'No se pudieron cargar las fotografias.',
			redirectOn401: false,
		});
	}
}

/**
 * Vincula eventos de tabs para alternar orden de fotos.
 */
function bindTabs(state, refs) {
	refs.tabs.forEach((tab) => {
		tab.addEventListener('click', async () => {
			const nextOrden = String(tab.dataset.orden || ORDEN_RECIENTES);
			if (nextOrden === state.ordenActivo) {
				return;
			}

			state.ordenActivo = nextOrden;
			refs.tabs.forEach((button) => {
				button.classList.toggle('is-active', button === tab);
			});

			await loadFotos(state, refs);
		});
	});
}

/**
 * Vincula edición de perfil y recarga cuando cierra modal.
 */
function bindEditButton(esPerfilPropio, refs, refrescar) {
	if (!esPerfilPropio || !refs.editarBtn) {
		return;
	}

	refs.editarBtn.addEventListener('click', async () => {
		const onHidden = async (event) => {
			if (event?.target?.id !== 'modal-editar-perfil') {
				return;
			}

			document.removeEventListener('hidden.bs.modal', onHidden);
			await refrescar();
		};

		document.addEventListener('hidden.bs.modal', onHidden);
		await abrirModalEditarPerfil();
	});
}

/**
 * Render principal de la página de perfil.
 */
async function render(contenedor, params = {}) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	const usuarioSesion = auth.getUsuario()?.nombre_usuario || '';
	const usuarioObjetivo = String(params?.usuario || usuarioSesion).trim();

	if (!usuarioObjetivo) {
		mostrarErrorPagina(contenedor, '404', 'Perfil no encontrado.');
		return;
	}

	renderProfileHeaderSkeleton(contenedor);

	try {
		const perfil = await api.get(`/usuarios/${encodeURIComponent(usuarioObjetivo)}`);
		const esPerfilPropio = auth.getUsuario()?.nombre_usuario === usuarioObjetivo;

		const state = {
			usuario: usuarioObjetivo,
			ordenActivo: ORDEN_RECIENTES,
			fotosPorOrden: {
				[ORDEN_RECIENTES]: null,
				[ORDEN_MEJORES]: null,
			},
		};

		const refs = renderLayout(contenedor, perfil, esPerfilPropio, state.ordenActivo);

		bindTabs(state, refs);
		bindEditButton(esPerfilPropio, refs, async () => {
			await render(contenedor, { usuario: usuarioObjetivo });
		});

		await loadFotos(state, refs);
	} catch (error) {
		manejarErrorDePagina(contenedor, error, {
			notFoundMessage: 'Perfil no encontrado.',
			forbiddenMessage: 'No tienes permisos para ver este perfil.',
			fallbackMessage: 'No se pudo cargar el perfil.',
		});
	}
}

export { render };

export default {
	render,
};
