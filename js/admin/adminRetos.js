import api from '../api.js';
import { renderPaginacion } from '../components/paginacion.js';
import { mostrarToast, skeletonCard, cloudinaryUrl } from '../utils.js';
import { abrirModalCrearReto } from '../components/modalCrearReto.js';

const MODAL_ID = 'admin-reto-modal';
const DELETE_MODAL_ID = 'admin-reto-delete-modal';
const LIMITE = 10;

const ESTADOS = {
	activo: { label: 'Activo', badgeClass: 'admin-retos-badge--activo', icon: 'bi-check-circle' },
	finalizado: { label: 'Finalizado', badgeClass: 'admin-retos-badge--finalizado', icon: 'bi-archive' },
	programado: { label: 'Programado', badgeClass: 'admin-retos-badge--programado', icon: 'bi-clock' },
	archivado: { label: 'Archivado', badgeClass: 'admin-retos-badge--archivado', icon: 'bi-archive' },
};

let categoriasCache = null;

function escapeHtml(value) {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function toInt(value, fallback = 0) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

function formatDate(iso) {
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
		minute: '2-digit',
		hour: '2-digit',
		hour12: false,
	}).format(date).replaceAll('.', '');
}

function getEstadoMeta(estadoRaw) {
	const key = String(estadoRaw || '').trim().toLowerCase();
	return ESTADOS[key] || { label: key || '—', badgeClass: 'admin-retos-badge--default', icon: 'bi-circle' };
}

async function getCategorias() {
	if (Array.isArray(categoriasCache)) {
		return categoriasCache;
	}

	try {
		const response = await api.get('/catalogos/categorias');
		categoriasCache = Array.isArray(response?.categorias) ? response.categorias : [];
		return categoriasCache;
	} catch {
		categoriasCache = [];
		return categoriasCache;
	}
}

function setCategoriaOptions(selectElement, categorias = [], selectedId = '') {
	if (!selectElement) {
		return;
	}

	const selected = String(selectedId || '');
	const options = [
		'<option value="">Selecciona una categoría</option>',
		...categorias.map((categoria) => {
			const value = String(categoria?.id ?? '');
			const isSelected = selected && value === selected ? ' selected' : '';
			return `<option value="${escapeHtml(value)}"${isSelected}>${escapeHtml(categoria?.nombre || 'Sin nombre')}</option>`;
		}),
	];

	if (selected && !categorias.some((categoria) => String(categoria?.id ?? '') === selected)) {
		options.push(`<option value="${escapeHtml(selected)}" selected>Categoría actual (${escapeHtml(selected)})</option>`);
	}

	selectElement.innerHTML = options.join('');
}


function getState(contenedor) {
	return contenedor.__adminRetosState || {
		query: '',
		estado: 'todos',
		page: 1,
	};
}

function setState(contenedor, state) {
	contenedor.__adminRetosState = state;
}

function renderSummaryCards(resumen = {}) {
	const cards = [
		{ label: 'Retos Activos', meta: 'En curso', value: toInt(resumen.activos), icon: 'bi-check-circle', iconClass: 'admin-retos-icon--success' },
		{ label: 'Finalizados', meta: 'Completados', value: toInt(resumen.finalizados), icon: 'bi-archive', iconClass: 'admin-retos-icon--neutral' },
		{ label: 'Programados', meta: 'Próximos', value: toInt(resumen.programados), icon: 'bi-clock', iconClass: 'admin-retos-icon--info' },
		{ label: 'Participantes', meta: 'Total', value: toInt(resumen.total_participantes), icon: 'bi-people', iconClass: 'admin-retos-icon--purple' },
		{ label: 'Fotografías', meta: 'Enviadas', value: toInt(resumen.total_fotografias), icon: 'bi-image', iconClass: 'admin-retos-icon--gold' },
	];

	return `
		<div class="admin-retos-summary">
			${cards.map((card) => `
				<article class="admin-retos-card">
					<i class="bi ${card.icon} ${card.iconClass}"></i>
					<p class="admin-retos-card-title">${escapeHtml(card.label)}</p>
					<div class="admin-retos-card-value">${card.value}</div>
					<div class="admin-retos-card-meta">${escapeHtml(card.meta)}</div>
				</article>
			`).join('')}
		</div>
	`;
}

function renderSkeleton(contenedor) {
	contenedor.innerHTML = `
		<div class="admin-retos-skeleton-grid">
			${Array.from({ length: 5 }, () => skeletonCard('138px')).join('')}
		</div>

		<div class="admin-retos-toolbar admin-mt-1">
			${skeletonCard('44px')}
			${skeletonCard('44px')}
			${skeletonCard('44px')}
		</div>

		<div class="admin-retos-table-card admin-mt-1">
			${skeletonCard('42px')}
			<div class="admin-retos-skeleton-table admin-mt-3">
				${Array.from({ length: 4 }, () => skeletonCard('74px')).join('')}
			</div>
		</div>
	`;
}

function buildDateRange(reto) {
	const inicio = formatDate(reto?.fecha_inicio);
	const fin = formatDate(reto?.fecha_fin);
	if (inicio && fin && inicio !== '—' && fin !== '—') {
		return `${inicio} - ${fin}`;
	}

	return inicio || fin || '—';
}

function normalizeDuration(reto) {
	if (reto?.duracion) {
		return String(reto.duracion);
	}

	const inicio = reto?.fecha_inicio ? new Date(reto.fecha_inicio) : null;
	const fin = reto?.fecha_fin ? new Date(reto.fecha_fin) : null;
	if (!inicio || !fin || Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
		return '—';
	}

	const diffMs = Math.max(0, fin.getTime() - inicio.getTime());
	const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
	if (diffDays <= 1) {
		return '24h';
	}

	if (diffDays <= 7) {
		return '1 Semana';
	}

	if (diffDays <= 31) {
		return '1 Mes';
	}

	return `${Math.round(diffDays / 30)} Meses`;
}

function renderEstadoBadge(estado) {
	const meta = getEstadoMeta(estado);
	return `<span class="admin-retos-badge ${meta.badgeClass}">${escapeHtml(meta.label)}</span>`;
}

function renderTable(contenedor, retos, handlers) {
	if (!Array.isArray(retos) || retos.length === 0) {
		contenedor.innerHTML = '<p class="admin-retos-empty">No se encontraron retos con los filtros actuales.</p>';
		return;
	}

	contenedor.innerHTML = `
		<div class="admin-retos-table-wrap">
			<table class="admin-retos-table">
				<thead>
					<tr>
						<th>Imagen</th>
						<th>Título</th>
						<th>Categoría</th>
						<th>Estado</th>
						<th>Duración</th>
						<th>Fechas</th>
						<th>Participantes</th>
						<th>Fotos</th>
						<th>Acciones</th>
					</tr>
				</thead>
				<tbody>
					${retos.map((reto) => {
		const isRevision = String(reto.estado || '').toLowerCase() === 'revision';
		return `
							<tr>
								<td>
									${reto.imagen_url
					? `<img class="admin-retos-thumb" src="${reto.imagen_public_id ? cloudinaryUrl(reto.imagen_public_id, { width: 100, height: 100, crop: 'fill' }) : escapeHtml(reto.imagen_url)}" alt="${escapeHtml(reto.titulo || 'Reto')}" loading="lazy" decoding="async" width="100" height="100">`
				: '<span class="admin-retos-thumb-placeholder"><i class="bi bi-image"></i></span>'}
								</td>
								<td>
									<p class="admin-retos-title">${escapeHtml(reto.titulo || 'Sin título')}</p>
									<p class="admin-retos-desc">${escapeHtml(reto.descripcion || 'Sin descripción disponible.')}</p>
								</td>
								<td>${escapeHtml(reto.categoria_nombre || '—')}</td>
								<td>${renderEstadoBadge(reto.estado)}</td>
								<td>${escapeHtml(normalizeDuration(reto))}</td>
								<td>${escapeHtml(buildDateRange(reto))}</td>
								<td>${toInt(reto.total_participantes)}</td>
								<td>${toInt(reto.total_fotografias)}</td>
								<td>
									<div class="admin-retos-actions">
										<button type="button" class="admin-retos-action-btn" data-action="edit" data-id="${escapeHtml(reto.id)}" aria-label="Editar reto">
											<i class="bi bi-pencil-square"></i>
										</button>
										${isRevision ? `
											<button type="button" class="admin-retos-action-btn admin-retos-action-btn--success" data-action="approve" data-id="${escapeHtml(reto.id)}" aria-label="Aprobar reto">
												<i class="bi bi-check-lg"></i>
											</button>
											<button type="button" class="admin-retos-action-btn admin-retos-action-btn--warning" data-action="reject" data-id="${escapeHtml(reto.id)}" aria-label="Rechazar reto">
												<i class="bi bi-x-lg"></i>
											</button>
										` : ''}
										<button type="button" class="admin-retos-action-btn admin-retos-action-btn--danger" data-action="delete" data-id="${escapeHtml(reto.id)}" aria-label="Eliminar reto">
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

	contenedor.querySelectorAll('[data-action="edit"]').forEach((button) => {
		button.addEventListener('click', () => handlers.onEdit(button.dataset.id || ''));
	});

	contenedor.querySelectorAll('[data-action="approve"]').forEach((button) => {
		button.addEventListener('click', () => handlers.onModerate(button.dataset.id || '', 'activo'));
	});

	contenedor.querySelectorAll('[data-action="reject"]').forEach((button) => {
		button.addEventListener('click', () => handlers.onModerate(button.dataset.id || '', 'archivado'));
	});

	contenedor.querySelectorAll('[data-action="delete"]').forEach((button) => {
		button.addEventListener('click', () => handlers.onDelete(button.dataset.id || ''));
	});
}

function ensureModalContainer() {
	let container = document.getElementById('modal-container');
	if (!container) {
		container = document.createElement('div');
		container.id = 'modal-container';
		document.body.appendChild(container);
	}

	return container;
}

// Reto modal moved to separate component: modalCrearReto.js

function ensureDeleteModal() {
	const container = ensureModalContainer();
	let modal = document.getElementById(DELETE_MODAL_ID);

	if (!modal) {
		container.insertAdjacentHTML('beforeend', `
			<div class="modal fade" id="${DELETE_MODAL_ID}" tabindex="-1" aria-hidden="true">
				<div class="modal-dialog modal-dialog-centered">
					<div class="modal-content">
						<div class="admin-modal-header">
							<div>
								<h3 class="admin-modal-title">Eliminar Reto</h3>
								<p class="admin-modal-subtitle">Esta acción eliminará el reto y todos sus datos relacionados.</p>
							</div>
							<button type="button" class="admin-modal-close" data-bs-dismiss="modal" aria-label="Cerrar">&times;</button>
						</div>
						<div class="admin-modal-body">
							<p class="admin-modal-subtitle" id="admin-delete-message"></p>
							<div class="admin-modal-actions">
								<button type="button" class="admin-modal-btn admin-modal-btn--outline" data-bs-dismiss="modal">Cancelar</button>
								<button type="button" class="admin-modal-btn admin-modal-btn--dark" id="admin-delete-confirm-btn">Eliminar</button>
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

async function openRetoModal(onSaved, reto = null) {
	// Delegate to centralized modal component
	return abrirModalCrearReto(onSaved, reto);
}

function openDeleteModal(reto, onConfirm) {
	const modal = ensureDeleteModal();
	const message = modal.querySelector('#admin-delete-message');
	const confirmBtn = modal.querySelector('#admin-delete-confirm-btn');

	if (message) {
		message.textContent = `Vas a eliminar “${reto?.titulo || 'este reto'}”. Esta acción no se puede deshacer.`;
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

	window.bootstrap?.Modal ? new window.bootstrap.Modal(modal).show() : modal.classList.add('show');
}

async function loadAndRender(state, refs) {
	renderSkeleton(refs.content);

	try {
		const response = await api.get('/admin/retos', {
			pagina: state.page,
			limite: LIMITE,
			buscar: state.query || undefined,
			estado: state.estado !== 'todos' ? state.estado : undefined,
		});

		const resumen = response?.resumen || {};
		const retos = Array.isArray(response?.retos) ? response.retos : [];
		const total = toInt(response?.total, retos.length);
		const totalPages = Math.max(1, Math.ceil(total / LIMITE));

		refs.content.innerHTML = `
			${renderSummaryCards(resumen)}

			<div class="admin-retos-toolbar">
				<input type="search" id="admin-retos-search" class="admin-retos-search" placeholder="Buscar por título o categoría..." value="${escapeHtml(state.query)}">
				<select id="admin-retos-status" class="admin-retos-select">
					<option value="todos" ${state.estado === 'todos' ? 'selected' : ''}>Todos los estados</option>
					<option value="revision" ${state.estado === 'revision' ? 'selected' : ''}>Pendiente</option>
					<option value="activo" ${state.estado === 'activo' ? 'selected' : ''}>Activo</option>
					<option value="finalizado" ${state.estado === 'finalizado' ? 'selected' : ''}>Finalizado</option>
					<option value="programado" ${state.estado === 'programado' ? 'selected' : ''}>Programado</option>
					<option value="archivado" ${state.estado === 'archivado' ? 'selected' : ''}>Archivado</option>
				</select>
				<button type="button" class="admin-retos-btn admin-retos-btn--dark" id="admin-retos-create-btn"><i class="bi bi-plus"></i> Crear</button>
			</div>

			<div class="admin-retos-table-card">
				<h2 class="admin-retos-table-title">Listado de Retos (${total})</h2>
				<div id="admin-retos-table-area"></div>
				<div id="admin-retos-pagination" class="admin-retos-pagination"></div>
			</div>
		`;

		const searchInput = refs.content.querySelector('#admin-retos-search');
		const statusSelect = refs.content.querySelector('#admin-retos-status');
		const createBtn = refs.content.querySelector('#admin-retos-create-btn');
		const tableArea = refs.content.querySelector('#admin-retos-table-area');
		const pagination = refs.content.querySelector('#admin-retos-pagination');

		let searchTimer = null;
		if (searchInput) {
			searchInput.addEventListener('input', () => {
				window.clearTimeout(searchTimer);
				searchTimer = window.setTimeout(async () => {
					state.query = searchInput.value.trim();
					state.page = 1;
					await loadAndRender(state, refs);
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

		if (createBtn) {
			createBtn.addEventListener('click', async () => {
				await openRetoModal(async () => {
					await loadAndRender(state, refs);
				});
			});
		}

		renderTable(tableArea, retos, {
			onEdit: async (id) => {
				try {
					const reto = await api.get(`/admin/retos/${encodeURIComponent(id)}`);
					await openRetoModal(async () => {
						await loadAndRender(state, refs);
					}, reto?.reto || reto);
				} catch (error) {
					mostrarToast(error?.error || 'No se pudo cargar el reto.', 'warning');
				}
			},
			onModerate: async (id, estado) => {
				try {
					await api.patch(`/admin/retos/${encodeURIComponent(id)}/estado`, { estado });
					mostrarToast('Estado actualizado correctamente.', 'success');
					await loadAndRender(state, refs);
				} catch (error) {
					mostrarToast(error?.error || 'No se pudo actualizar el estado.', 'warning');
				}
			},
			onDelete: async (id) => {
				const reto = retos.find((item) => String(item.id) === String(id));
				if (!reto) {
					return;
				}

				openDeleteModal(reto, async () => {
					try {
						await api.delete(`/admin/retos/${encodeURIComponent(id)}`);
						mostrarToast('Reto eliminado correctamente.', 'success');
						await loadAndRender(state, refs);
					} catch (error) {
						mostrarToast(error?.error || 'No se pudo eliminar el reto.', 'warning');
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
		refs.content.innerHTML = `<p class="admin-retos-error">${escapeHtml(error?.error || 'No se pudieron cargar los retos.')}</p>`;
	}
}

async function render(contenedor) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	const state = getState(contenedor);
	contenedor.innerHTML = '<div class="admin-retos"><div id="admin-retos-root"></div></div>';

	const root = contenedor.querySelector('#admin-retos-root');
	if (!root) {
		return;
	}

	await loadAndRender(state, { content: root });

	// Auto-refresh list when a reto is created or edited elsewhere
	window.addEventListener('reto-creado-o-editado', async () => {
		try {
			state.page = 1;
			await loadAndRender(state, { content: root });
		} catch {
			// ignore
		}
	});
}

async function abrirModalCrearRetoAdmin(onSaved = async () => {}) {
	await openRetoModal(onSaved);
}

export { render, abrirModalCrearRetoAdmin };

export default {
	render,
};
