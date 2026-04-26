import api from '../api.js';
import auth from '../auth.js';
import { cardFoto } from '../components/cardFoto.js';
import { abrirModalFoto } from '../components/modalFoto.js';
import { abrirModalEditarPerfil } from '../components/modalEditarPerfil.js';
import { mostrarErrorPagina, skeletonCard } from '../utils.js';

const STYLE_ID = 'perfil-page-styles';
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
 * Inyecta estilos de la vista una sola vez.
 */
function ensureStyles() {
	if (document.getElementById(STYLE_ID)) {
		return;
	}

	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = `
		.perfil-page {
			max-width: var(--content-max-width);
			margin: 0 auto;
			padding: 28px var(--page-padding-x) 48px;
		}

		.perfil-breadcrumb {
			display: inline-flex;
			align-items: center;
			gap: 8px;
			margin-bottom: 16px;
			font-size: 16px;
			font-weight: 500;
			color: #111827;
			text-decoration: none;
		}

		.perfil-breadcrumb:hover {
			text-decoration: underline;
		}

		.perfil-card {
			background: #FFFFFF;
			border-radius: 14px;
			box-shadow: var(--shadow-card);
			padding: 24px;
		}

		.perfil-header {
			display: grid;
			grid-template-columns: auto minmax(0, 1fr) auto;
			gap: 18px;
			align-items: start;
		}

		.perfil-avatar {
			width: 92px;
			height: 92px;
			border-radius: 9999px;
			object-fit: cover;
			background: #E5E7EB;
			display: block;
		}

		.perfil-avatar-placeholder {
			width: 92px;
			height: 92px;
			border-radius: 9999px;
			background: #E5E7EB;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			color: #9CA3AF;
			font-size: 34px;
		}

		.perfil-name {
			margin: 0;
			font-size: 22px;
			font-weight: 700;
			line-height: 1.2;
			color: #111827;
		}

		.perfil-username {
			margin: 3px 0 0;
			font-size: 15px;
			color: #6B7280;
		}

		.perfil-bio {
			margin: 12px 0 0;
			font-size: 16px;
			line-height: 1.35;
			color: #4B5563;
		}

		.perfil-member {
			margin: 10px 0 0;
			display: inline-flex;
			align-items: center;
			gap: 8px;
			font-size: 14px;
			color: #6B7280;
		}

		.perfil-edit-btn {
			border: 0;
			border-radius: 10px;
			background: #111827;
			color: #FFFFFF;
			padding: 10px 14px;
			font-size: 14px;
			font-weight: 600;
			display: inline-flex;
			align-items: center;
			gap: 8px;
		}

		.perfil-divider {
			height: 1px;
			background: #E5E7EB;
			margin: 18px 0;
		}

		.perfil-stats {
			display: grid;
			grid-template-columns: repeat(4, minmax(0, 1fr));
			gap: 12px;
		}

		.perfil-stat {
			text-align: center;
		}

		.perfil-stat-value {
			display: block;
			font-size: 32px;
			font-weight: 700;
			line-height: 1.05;
			color: #111827;
		}

		.perfil-stat-label {
			margin-top: 4px;
			display: inline-flex;
			align-items: center;
			gap: 6px;
			font-size: 14px;
			color: #9CA3AF;
		}

		.perfil-badges-title {
			margin: 0;
			font-size: 18px;
			font-weight: 600;
			color: #111827;
			display: inline-flex;
			align-items: center;
			gap: 8px;
		}

		.perfil-badges-placeholders {
			margin-top: 10px;
			display: inline-flex;
			gap: 8px;
		}

		.perfil-badge-placeholder {
			width: 18px;
			height: 18px;
			border-radius: 9999px;
			background: #E5E7EB;
		}

		.perfil-tabs {
			margin-top: 18px;
			display: inline-flex;
			align-items: center;
			gap: 4px;
			background: #F3F4F6;
			padding: 4px;
			border-radius: 12px;
		}

		.perfil-tab-btn {
			border: 0;
			background: transparent;
			border-radius: 10px;
			padding: 8px 12px;
			font-size: 15px;
			font-weight: 600;
			color: #111827;
			display: inline-flex;
			align-items: center;
			gap: 8px;
		}

		.perfil-tab-btn.is-active {
			background: #FFFFFF;
			box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
		}

		.perfil-grid-wrap {
			margin-top: 16px;
		}

		.perfil-grid {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 18px;
		}

		.perfil-grid-item .card-foto {
			height: 100%;
		}

		.perfil-empty,
		.perfil-error {
			margin: 0;
			padding: 16px;
			border-radius: 10px;
			font-size: 14px;
		}

		.perfil-empty {
			background: #F8FAFC;
			color: #6B7280;
		}

		.perfil-error {
			background: #FEE2E2;
			color: #991B1B;
		}

		.perfil-skeleton-grid {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 18px;
		}

		@media (max-width: 1199.98px) {
			.perfil-grid,
			.perfil-skeleton-grid {
				grid-template-columns: repeat(2, minmax(0, 1fr));
			}
		}

		@media (max-width: 991.98px) {
			.perfil-page {
				padding: 22px 16px 40px;
			}

			.perfil-header {
				grid-template-columns: 1fr;
			}

			.perfil-stats {
				grid-template-columns: repeat(2, minmax(0, 1fr));
			}
		}

		@media (max-width: 767.98px) {
			.perfil-grid,
			.perfil-skeleton-grid {
				grid-template-columns: repeat(1, minmax(0, 1fr));
			}
		}
	`;

	document.head.appendChild(style);
}

/**
 * Devuelve avatar o placeholder.
 */
function renderAvatar(url, altText) {
	if (url) {
		return `<img class="perfil-avatar" src="${escapeHtml(url)}" alt="${escapeHtml(altText)}">`;
	}

	return '<span class="perfil-avatar-placeholder"><i class="bi bi-person"></i></span>';
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

	contenedor.innerHTML = `
		<section class="perfil-page page-enter">
			<a class="perfil-breadcrumb" href="#/home">
				<span>←</span>
				<span>Perfil de Usuario</span>
			</a>

			<section class="perfil-card" aria-label="Perfil de usuario">
				<header class="perfil-header">
					<div>${renderAvatar(perfil?.foto_perfil_url || '', `Avatar de ${nombreCompleto}`)}</div>

					<div>
						<h1 class="perfil-name">${escapeHtml(nombreCompleto)}</h1>
						<p class="perfil-username">@${escapeHtml(nombreUsuario)}</p>
						<p class="perfil-bio">${escapeHtml(perfil?.biografia || 'Este usuario aún no agregó una biografía.')}</p>
						<p class="perfil-member"><i class="bi bi-calendar3"></i>Miembro desde ${escapeHtml(formatMemberSince(perfil?.fecha_registro))}</p>
					</div>

					${esPerfilPropio
						? `
							<button type="button" id="perfil-editar-btn" class="perfil-edit-btn">
								<i class="bi bi-pencil-square"></i>
								<span>Editar Perfil</span>
							</button>
						`
						: ''}
				</header>

				<div class="perfil-divider"></div>

				<section class="perfil-stats" aria-label="Estadísticas del perfil">
					<article class="perfil-stat">
						<span class="perfil-stat-value">${totalFotos}</span>
						<span class="perfil-stat-label"><i class="bi bi-camera"></i>Fotografías</span>
					</article>

					<article class="perfil-stat">
						<span class="perfil-stat-value">${totalRetos}</span>
						<span class="perfil-stat-label"><i class="bi bi-trophy"></i>Retos</span>
					</article>

					<article class="perfil-stat">
						<span class="perfil-stat-value">${totalVotos}</span>
						<span class="perfil-stat-label"><i class="bi bi-star"></i>Votos</span>
					</article>

					<article class="perfil-stat">
						<span class="perfil-stat-value">${promedio}</span>
						<span class="perfil-stat-label"><i class="bi bi-bar-chart-line"></i>Promedio</span>
					</article>
				</section>

				<div class="perfil-divider"></div>

				<section aria-label="Insignias">
					<h2 class="perfil-badges-title"><i class="bi bi-award"></i>Insignias</h2>
					<div class="perfil-badges-placeholders">
						<span class="perfil-badge-placeholder"></span>
						<span class="perfil-badge-placeholder"></span>
						<span class="perfil-badge-placeholder"></span>
					</div>
				</section>
			</section>

			<div class="perfil-tabs" role="tablist" aria-label="Cambiar orden de fotos">
				<button type="button" class="perfil-tab-btn ${ordenActivo === ORDEN_RECIENTES ? 'is-active' : ''}" data-orden="${ORDEN_RECIENTES}">
					<i class="bi bi-image"></i>
					<span>Fotografías (${totalFotos})</span>
				</button>

				<button type="button" class="perfil-tab-btn ${ordenActivo === ORDEN_MEJORES ? 'is-active' : ''}" data-orden="${ORDEN_MEJORES}">
					<i class="bi bi-trophy"></i>
					<span>Más Votadas</span>
				</button>
			</div>

			<section class="perfil-grid-wrap" id="perfil-fotos-wrap" aria-label="Fotografías del usuario"></section>
		</section>
	`;

	return {
		editarBtn: contenedor.querySelector('#perfil-editar-btn'),
		tabs: Array.from(contenedor.querySelectorAll('.perfil-tab-btn')),
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
		<section class="perfil-page page-enter">
			<a class="perfil-breadcrumb" href="#/home">
				<span>←</span>
				<span>Perfil de Usuario</span>
			</a>

			<section class="perfil-card" aria-label="Perfil de usuario">
				<header class="perfil-header">
					<div class="skeleton" style="width:92px;height:92px;border-radius:9999px;flex-shrink:0"></div>
					<div>
						<div class="skeleton" style="height:22px;width:180px;margin-bottom:8px"></div>
						<div class="skeleton" style="height:15px;width:120px;margin-bottom:12px"></div>
						<div class="skeleton" style="height:16px;width:280px;margin-bottom:10px"></div>
						<div class="skeleton" style="height:14px;width:200px"></div>
					</div>
				</header>

				<div class="perfil-divider"></div>

				<section class="perfil-stats" aria-label="Estadísticas del perfil">
					${Array.from({ length: 4 }, () => `<article class="perfil-stat">
						<div class="skeleton" style="height:32px;width:40px;margin:0 auto 8px"></div>
						<div class="skeleton" style="height:14px;width:80px;margin:0 auto"></div>
					</article>`).join('')}
				</section>

				<div class="perfil-divider"></div>

				<section aria-label="Insignias">
					<h2 class="perfil-badges-title"><i class="bi bi-award"></i>Insignias</h2>
					<div class="perfil-badges-placeholders">
						${Array.from({ length: 3 }, () => '<div class="skeleton" style="width:18px;height:18px;border-radius:9999px"></div>').join('')}
					</div>
				</section>
			</section>

			<div class="perfil-tabs" role="tablist" aria-label="Cambiar orden de fotos">
				${Array.from({ length: 2 }, () => `<button class="perfil-tab-btn" disabled>
					<div class="skeleton" style="height:15px;width:100px"></div>
				</button>`).join('')}
			</div>

			<section class="perfil-grid-wrap">
				<div class="perfil-skeleton-grid">
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
		<div class="perfil-skeleton-grid">
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
		contenedor.innerHTML = '<p class="perfil-empty">Este usuario no tiene fotografías en esta sección.</p>';
		return;
	}

	contenedor.innerHTML = `
		<div class="perfil-grid">
			${fotos.map((foto) => `<div class="perfil-grid-item">${cardFoto(foto)}</div>`).join('')}
		</div>
	`;

	contenedor.querySelectorAll('.card-foto').forEach((card, index) => {
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
		refs.fotosWrap.innerHTML = `<p class="perfil-error">${escapeHtml(error?.error || 'No se pudieron cargar las fotografías.')}</p>`;
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

	ensureStyles();

	const usuarioSesion = auth.getUsuario()?.nombre_usuario || '';
	const usuarioObjetivo = String(params?.usuario || usuarioSesion).trim();

	if (!usuarioObjetivo) {
		mostrarErrorPagina(contenedor, '404', 'Perfil no encontrado.');
		return;
	}

	renderProfileHeaderSkeleton(contenedor);

	try {
		const perfil = await api.get(`/usuarios/${encodeURIComponent(usuarioObjetivo)}`);
		const esPerfilPropio = auth.getUsuario()?.nombre_usuario === params.usuario;

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
		if (error?.status === 404) {
			mostrarErrorPagina(contenedor, '404', 'Perfil no encontrado.');
			return;
		}

		mostrarErrorPagina(contenedor, 'error', error?.error || 'No se pudo cargar el perfil.');
	}
}

export { render };

export default {
	render,
};
