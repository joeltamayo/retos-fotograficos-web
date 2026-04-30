import api from '../api.js';
import { abrirModalFoto } from '../components/modalFoto.js';
import { renderPaginacion } from '../components/paginacion.js';
import { mostrarToast, skeletonCard, cloudinaryUrl } from '../utils.js';

const DELETE_MODAL_ID = 'admin-foto-delete-modal';
const LIMITE = 10;

const ESTADO_META = {
	revision: { label: 'Pendiente', badgeClass: 'admin-fotos-badge--revision', dot: true },
	aprobada: { label: 'Aprobada', badgeClass: 'admin-fotos-badge--aprobada' },
	desaprobada: { label: 'Rechazada', badgeClass: 'admin-fotos-badge--desaprobada' },
};

// Escapa texto para render seguro.
function escapeHtml(value) {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

//Convierte a entero positivo.
function toInt(value, fallback = 0) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

//Formatea fecha y hora corta.
function formatDateTime(iso) {
	if (!iso) {
		return '—';
	}

	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) {
		return '—';
	}

	return new Intl.DateTimeFormat('es-MX', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}).format(date).replaceAll('.', '');
}

// Obtiene el meta visual por estado.
function getEstadoMeta(estadoRaw) {
	const estado = String(estadoRaw ?? '').trim().toLowerCase();
	return ESTADO_META[estado] || {
		label: estado || '—',
		badgeClass: 'admin-fotos-badge--default',
	};
}

// Devuelve estado persistido en el contenedor.
function getState(contenedor) {
	return contenedor.__adminFotosState || {
		query: '',
		estado: 'todos',
		page: 1,
		loading: false,
		error: null,
	};
}

/**
 * Guarda estado en el contenedor.
 */
function setState(contenedor, state) {
	contenedor.__adminFotosState = state;
}

/**
 * Formatea etiquetas para badges de estado.
 */
function renderEstadoBadge(estadoRaw) {
	const meta = getEstadoMeta(estadoRaw);
	const pendingClass = String(estadoRaw ?? '').toLowerCase() === 'revision' ? ' admin-fotos-badge--pending' : '';
	return `<span class="admin-fotos-badge ${meta.badgeClass}${pendingClass}">${escapeHtml(meta.label)}</span>`;
}

/**
 * Construye tarjeta de resumen.
 */
function renderSummaryCards(resumen = {}) {
	const cards = [
		{ label: 'Total Fotos', meta: 'En la plataforma', value: toInt(resumen.total), icon: 'bi-eye', iconClass: 'admin-fotos-summary-icon--info' },
		{ label: 'Pendientes', meta: 'Por moderar', value: toInt(resumen.en_revision), icon: 'bi-clock', iconClass: 'admin-fotos-summary-icon--warning' },
		{ label: 'Aprobadas', meta: 'Publicadas', value: toInt(resumen.aprobadas), icon: 'bi-check-lg', iconClass: 'admin-fotos-summary-icon--success' },
		{ label: 'Rechazadas', meta: 'No publicadas', value: toInt(resumen.desaprobadas), icon: 'bi-x-lg', iconClass: 'admin-fotos-summary-icon--danger' },
	];

	return `
		<div class="admin-fotos-summary">
			${cards.map((card) => `
				<article class="admin-fotos-summary-card">
					<i class="bi ${card.icon} admin-fotos-summary-icon ${card.iconClass}"></i>
					<p class="admin-fotos-summary-title">${escapeHtml(card.label)}</p>
					<div class="admin-fotos-summary-value">${card.value}</div>
					<div class="admin-fotos-summary-meta">${escapeHtml(card.meta)}</div>
				</article>
			`).join('')}
		</div>
	`;
}

/**
 * Skeleton de carga.
 */
function renderSkeleton(contenedor) {
	contenedor.innerHTML = `
		<div class="admin-fotos-skeleton-grid">
			${Array.from({ length: 4 }, () => skeletonCard('138px')).join('')}
		</div>

		<div class="admin-fotos-filter admin-mt-1">
			${skeletonCard('44px')}
			${skeletonCard('44px')}
		</div>

		<div class="admin-fotos-table-card admin-mt-1">
			${skeletonCard('40px')}
			<div class="admin-fotos-skeleton-table admin-mt-3">
				${Array.from({ length: 5 }, () => skeletonCard('74px')).join('')}
			</div>
		</div>
	`;
}

/**
 * Dibuja celda del usuario.
 */
function renderUserCell(foto) {
	if (foto?.foto_perfil_url || foto?.foto_perfil_public_id) {
		const avatarSrc = foto?.foto_perfil_public_id
			? cloudinaryUrl(foto.foto_perfil_public_id, { width: 64, height: 64, crop: 'fill' })
			: escapeHtml(foto.foto_perfil_url);
		return `
			<span class="admin-fotos-user">
				<img class="admin-fotos-user-avatar" src="${avatarSrc}" alt="${escapeHtml(foto.nombre_usuario || 'Usuario')}" loading="lazy" decoding="async" width="64" height="64">
				<span class="admin-fotos-user-name">@${escapeHtml(foto.nombre_usuario || 'usuario')}</span>
			</span>
		`;
	}

	return `
		<span class="admin-fotos-user">
			<span class="admin-fotos-user-avatar-placeholder"><i class="bi bi-person"></i></span>
			<span class="admin-fotos-user-name">@${escapeHtml(foto?.nombre_usuario || 'usuario')}</span>
		</span>
	`;
}

/**
 * Orden visible: revision primero cuando no hay filtro de estado.
 */
function sortFotos(fotos, estadoFiltro) {
	const copied = [...fotos];
	if (String(estadoFiltro) !== 'todos') {
		return copied.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
	}

	const priority = { revision: 0, aprobada: 1, desaprobada: 2 };
	return copied.sort((a, b) => {
		const priorityDiff = (priority[String(a.estado).toLowerCase()] ?? 99) - (priority[String(b.estado).toLowerCase()] ?? 99);
		if (priorityDiff !== 0) {
			return priorityDiff;
		}

		return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
	});
}

/**
 * Filtro de búsqueda cliente sobre el lote actual.
 */
function applySearchFilter(fotos, query) {
	const normalized = String(query || '').trim().toLowerCase();
	if (!normalized) {
		return fotos;
	}

	return fotos.filter((foto) => {
		const terms = [foto?.titulo, foto?.descripcion, foto?.nombre_usuario, foto?.reto_titulo]
			.filter(Boolean)
			.join(' ')
			.toLowerCase();
		return terms.includes(normalized);
	});
}

/**
 * Renderiza la tabla.
 */
function renderTable(contenedor, fotos, handlers) {
	if (!Array.isArray(fotos) || fotos.length === 0) {
		contenedor.innerHTML = '<p class="admin-fotos-empty">No se encontraron fotografías con los filtros actuales.</p>';
		return;
	}

	contenedor.innerHTML = `
		<div class="admin-fotos-table-wrap">
			<table class="admin-fotos-table">
				<thead>
					<tr>
						<th>Imagen</th>
						<th>Título</th>
						<th>Usuario</th>
						<th>Estado</th>
						<th>Fecha</th>
						<th>Votos</th>
						<th>Comentarios</th>
						<th>Puntuación</th>
						<th>Acciones</th>
					</tr>
				</thead>
				<tbody>
					${fotos.map((foto) => {
						const estadoMeta = getEstadoMeta(foto.estado);
						const isRevision = String(foto.estado || '').toLowerCase() === 'revision';
						const puntuacion = Number.isFinite(Number(foto.puntuacion_total))
							? Number(foto.puntuacion_total).toFixed(1)
							: '0.0';

						return `
							<tr>
								<td>
									${foto.imagen_url
											? `<img class="admin-fotos-thumb" src="${foto.imagen_public_id ? cloudinaryUrl(foto.imagen_public_id, { width: 100, height: 100, crop: 'fill' }) : escapeHtml(foto.imagen_url)}" alt="${escapeHtml(foto.titulo || 'Fotografía')}" loading="lazy" decoding="async" width="100" height="100">`
										: '<span class="admin-fotos-thumb-placeholder"><i class="bi bi-image"></i></span>'}
								</td>
								<td>
									<p class="admin-fotos-title">${escapeHtml(foto.titulo || 'Sin título')}</p>
									<p class="admin-fotos-desc">${escapeHtml(foto.descripcion || 'Sin descripción disponible.')}</p>
								</td>
								<td>${renderUserCell(foto)}</td>
								<td>${renderEstadoBadge(foto.estado)}</td>
								<td>${escapeHtml(formatDateTime(foto.created_at))}</td>
								<td><span class="admin-fotos-score">⭐ ${toInt(foto.total_calificaciones)}</span></td>
								<td><span class="admin-fotos-score">💬 ${toInt(foto.total_comentarios)}</span></td>
								<td><span class="admin-fotos-score">${escapeHtml(puntuacion)}</span></td>
								<td>
									<div class="admin-fotos-actions">
										<button type="button" class="admin-fotos-action-btn" data-action="view" data-id="${escapeHtml(foto.id)}" aria-label="Ver detalle">
											<i class="bi bi-eye"></i>
										</button>
										${isRevision ? `
											<button type="button" class="admin-fotos-action-btn admin-fotos-action-btn--success" data-action="approve" data-id="${escapeHtml(foto.id)}" aria-label="Aprobar fotografía">
												<i class="bi bi-check-lg"></i>
											</button>
											<button type="button" class="admin-fotos-action-btn admin-fotos-action-btn--warning" data-action="reject" data-id="${escapeHtml(foto.id)}" aria-label="Rechazar fotografía">
												<i class="bi bi-x-lg"></i>
											</button>
										` : ''}
										<button type="button" class="admin-fotos-action-btn admin-fotos-action-btn--danger" data-action="delete" data-id="${escapeHtml(foto.id)}" aria-label="Eliminar fotografía">
											<i class="bi bi-trash"></i>
										</button>
									</div>
								</td>
							</tr>
						`;
					}).join('')}
				</tbody>
			</table>
		</div>
	`;

	contenedor.querySelectorAll('[data-action="view"]').forEach((button) => {
		button.addEventListener('click', () => handlers.onView(button.dataset.id || ''));
	});

	contenedor.querySelectorAll('[data-action="approve"]').forEach((button) => {
		button.addEventListener('click', () => handlers.onModerate(button.dataset.id || '', 'aprobada'));
	});

	contenedor.querySelectorAll('[data-action="reject"]').forEach((button) => {
		button.addEventListener('click', () => handlers.onModerate(button.dataset.id || '', 'desaprobada'));
	});

	contenedor.querySelectorAll('[data-action="delete"]').forEach((button) => {
		button.addEventListener('click', () => handlers.onDelete(button.dataset.id || ''));
	});
}

/**
 * Crea modal de confirmación para eliminar.
 */
function ensureDeleteModal() {
	let container = document.getElementById('modal-container');
	if (!container) {
		container = document.createElement('div');
		container.id = 'modal-container';
		document.body.appendChild(container);
	}

	let modal = document.getElementById(DELETE_MODAL_ID);
	if (!modal) {
		container.insertAdjacentHTML('beforeend', `
			<div class="modal fade" id="${DELETE_MODAL_ID}" tabindex="-1" aria-hidden="true">
				<div class="modal-dialog modal-dialog-centered">
					<div class="modal-content">
						<div class="admin-modal-header">
							<div>
								<h3 class="admin-modal-title">Eliminar Fotografía</h3>
								<p class="admin-modal-subtitle">Esta acción eliminará la fotografía y su información relacionada.</p>
							</div>
							<button type="button" class="admin-modal-close" data-bs-dismiss="modal" aria-label="Cerrar">&times;</button>
						</div>
						<div class="admin-modal-body">
							<p class="admin-modal-confirm" id="admin-foto-delete-message"></p>
							<div class="admin-modal-actions">
								<button type="button" class="admin-modal-btn admin-modal-btn--outline" data-bs-dismiss="modal">Cancelar</button>
								<button type="button" class="admin-modal-btn admin-modal-btn--dark" id="admin-foto-delete-confirm">Eliminar</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		`);
		modal = document.getElementById(DELETE_MODAL_ID);
	}

	return modal;
}

/**
 * Abre confirmación de borrado.
 */
function openDeleteModal(foto, onConfirm) {
	const modal = ensureDeleteModal();
	const message = modal.querySelector('#admin-foto-delete-message');
	const confirmBtn = modal.querySelector('#admin-foto-delete-confirm');

	if (message) {
		message.textContent = `Vas a eliminar “${foto?.titulo || 'esta fotografía'}” de @${foto?.nombre_usuario || 'usuario'}. Esta acción no se puede deshacer.`;
	}

	if (confirmBtn) {
		confirmBtn.onclick = async () => {
			confirmBtn.disabled = true;
			try {
				await onConfirm();
				window.bootstrap?.Modal.getInstance(modal)?.hide();
			} finally {
				confirmBtn.disabled = false;
			}
		};
	}

	const instance = window.bootstrap?.Modal ? new window.bootstrap.Modal(modal) : null;
	instance?.show();
}

/**
 * Carga y renderiza la vista.
 */
async function loadAndRender(state, refs) {
	renderSkeleton(refs.content);

	try {
		const params = {
			pagina: state.page,
			limite: LIMITE,
		};

		if (state.estado !== 'todos') {
			params.estado = state.estado;
		}

		if (state.query) {
			params.buscar = state.query;
		}

		const response = await api.get('/admin/fotografias', params);
		const resumen = response?.resumen || {};
		const rawFotos = Array.isArray(response?.fotografias) ? response.fotografias : [];
		const orderedFotos = sortFotos(rawFotos, state.estado);
		const visibleFotos = applySearchFilter(orderedFotos, state.query);
		const total = toInt(response?.total, visibleFotos.length);
		const totalPages = Math.max(1, Math.ceil(total / LIMITE));

		refs.content.innerHTML = `
			${renderSummaryCards(resumen)}

			<div class="admin-fotos-filter">
				<input
					type="search"
					id="admin-fotos-search"
					class="admin-fotos-search"
					placeholder="Buscar por título o usuario..."
					value="${escapeHtml(state.query)}"
				>
				<select id="admin-fotos-status" class="admin-fotos-select">
					<option value="todos" ${state.estado === 'todos' ? 'selected' : ''}>Todos los estados</option>
					<option value="revision" ${state.estado === 'revision' ? 'selected' : ''}>Pendientes</option>
					<option value="aprobada" ${state.estado === 'aprobada' ? 'selected' : ''}>Aprobadas</option>
					<option value="desaprobada" ${state.estado === 'desaprobada' ? 'selected' : ''}>Rechazadas</option>
				</select>
			</div>

			<div class="admin-fotos-table-card">
				<h2 class="admin-fotos-table-title">Fotografías Enviadas (${total})</h2>
				<div id="admin-fotos-table-area"></div>
				<div class="admin-fotos-pagination" id="admin-fotos-pagination"></div>
			</div>
		`;

		const searchInput = refs.content.querySelector('#admin-fotos-search');
		const statusSelect = refs.content.querySelector('#admin-fotos-status');
		const tableArea = refs.content.querySelector('#admin-fotos-table-area');
		const pagination = refs.content.querySelector('#admin-fotos-pagination');

		if (searchInput) {
			searchInput.addEventListener('input', () => {
				window.clearTimeout(state.searchTimer);
				state.query = searchInput.value.trim();
				state.page = 1;
				state.searchTimer = window.setTimeout(() => {
					loadAndRender(state, refs);
				}, 250);
			});
		}

		if (statusSelect) {
			statusSelect.addEventListener('change', async () => {
				state.estado = statusSelect.value;
				state.page = 1;
				await loadAndRender(state, refs);
			});
		}

		renderTable(tableArea, visibleFotos, {
			onView: async (id) => {
				await abrirModalFoto(id, { useAdminEndpoint: true });
			},
			onModerate: async (id, estado) => {
				try {
					await api.patch(`/admin/fotografias/${encodeURIComponent(id)}/estado`, { estado });
					mostrarToast(estado === 'aprobada' ? 'Fotografía aprobada correctamente.' : 'Fotografía rechazada correctamente.', 'success');
					await loadAndRender(state, refs);
				} catch (error) {
					mostrarToast(error?.error || 'No se pudo actualizar el estado de la fotografía.', 'warning');
				}
			},
			onDelete: async (id) => {
				const foto = orderedFotos.find((item) => String(item.id) === String(id));
				if (!foto) {
					return;
				}

				openDeleteModal(foto, async () => {
					try {
						await api.delete(`/admin/fotografias/${encodeURIComponent(id)}`);
						mostrarToast('Fotografía eliminada correctamente.', 'success');
						await loadAndRender(state, refs);
					} catch (error) {
						mostrarToast(error?.error || 'No se pudo eliminar la fotografía.', 'warning');
					}
				});
			},
		});

		renderPaginacion(pagination, state.page, totalPages, async (page) => {
			if (page === state.page) {
				return;
			}

			state.page = page;
			await loadAndRender(state, refs);
		});

		setState(refs.content, state);
	} catch (error) {
		refs.content.innerHTML = `<p class="admin-fotos-error">${escapeHtml(error?.error || 'No se pudieron cargar las fotografías.')}</p>`;
	}
}

/**
 * Render principal.
 */
async function render(contenedor) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	const state = getState(contenedor);
	contenedor.innerHTML = '<div class="admin-fotos"><div id="admin-fotos-root"></div></div>';

	const root = contenedor.querySelector('#admin-fotos-root');
	if (!root) {
		return;
	}

	await loadAndRender(state, { content: root });
}

export { render };

export default {
	render,
};
