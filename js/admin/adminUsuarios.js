import api from '../api.js';
import { renderPaginacion } from '../components/paginacion.js';
import { mostrarToast, skeletonCard } from '../utils.js';

const STYLE_ID = 'admin-usuarios-styles';
const DELETE_MODAL_ID = 'admin-usuario-delete-modal';
const LIMITE = 10;

/**
 * Metadatos visuales para badges de estado en la tabla.
 */
const ESTADO_META = {
	activo: { label: 'Activo', bg: 'var(--color-success-bg)', color: 'var(--color-success)', icon: 'bi-check-circle' },
	suspendido: { label: 'Suspendido', bg: 'var(--color-danger-bg)', color: 'var(--color-danger)', icon: 'bi-slash-circle' },
};

/**
 * Opciones disponibles para cambio de rol inline.
 */
const ROL_OPTIONS = [
	{ value: 'usuario', label: 'Usuario' },
	{ value: 'moderador', label: 'Moderador' },
	{ value: 'administrador', label: 'Admin' },
];

/**
 * Escapa texto para uso seguro en plantillas HTML.
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
 * Convierte cualquier valor numérico a entero no negativo.
 */
function toInt(value, fallback = 0) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

/**
 * Formatea fecha corta para columnas de tabla.
 */
function formatDateShort(iso) {
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
	}).format(date).replaceAll('.', '');
}

/**
 * Resuelve metadatos de estado con fallback visual.
 */
function getEstadoMeta(estadoRaw) {
	const key = String(estadoRaw ?? '').trim().toLowerCase();
	return ESTADO_META[key] || {
		label: key || '—',
		bg: 'var(--color-neutral-bg)',
		color: 'var(--color-neutral)',
		icon: 'bi-circle',
	};
}

/**
 * Inyecta estilos del módulo una sola vez por sesión.
 */
function ensureStyles() {
	if (document.getElementById(STYLE_ID)) {
		return;
	}

	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = `
		.admin-usuarios {
			display: grid;
			gap: 24px;
		}

		.admin-usuarios-summary {
			display: grid;
			grid-template-columns: repeat(4, minmax(0, 1fr));
			gap: 16px;
		}

		.admin-usuarios-card,
		.admin-usuarios-filter,
		.admin-usuarios-table-card {
			background: #FFFFFF;
			border-radius: 14px;
			box-shadow: var(--shadow-card);
		}

		.admin-usuarios-card {
			position: relative;
			padding: 18px;
			min-height: 138px;
			overflow: hidden;
		}

		.admin-usuarios-card i {
			position: absolute;
			top: 16px;
			right: 16px;
			font-size: 18px;
		}

		.admin-usuarios-card-title {
			margin: 0;
			font-size: 14px;
			font-weight: 500;
			color: #111827;
		}

		.admin-usuarios-card-value {
			margin-top: 34px;
			font-size: 34px;
			font-weight: 700;
			line-height: 1;
			color: #111827;
		}

		.admin-usuarios-card-meta {
			margin-top: 6px;
			font-size: 14px;
			color: #6B7280;
		}

		.admin-usuarios-filter {
			padding: 14px;
			display: grid;
			grid-template-columns: minmax(0, 1fr) 170px 170px;
			gap: 12px;
			align-items: center;
		}

		.admin-usuarios-search,
		.admin-usuarios-select,
		.admin-usuarios-role {
			width: 100%;
			border: 1px solid #E5E7EB;
			background: #F9FAFB;
			border-radius: 10px;
			padding: 11px 14px;
			font-size: 14px;
			color: #111827;
		}

		.admin-usuarios-search::placeholder {
			color: #9CA3AF;
		}

		.admin-usuarios-table-card {
			padding: 18px;
		}

		.admin-usuarios-table-title {
			margin: 0 0 14px;
			font-size: 18px;
			font-weight: 600;
			color: #111827;
		}

		.admin-usuarios-table-wrap {
			overflow-x: auto;
		}

		.admin-usuarios-table {
			width: 100%;
			min-width: 1180px;
			border-collapse: collapse;
		}

		.admin-usuarios-table th {
			text-align: left;
			font-size: 14px;
			font-weight: 600;
			color: #374151;
			padding: 12px 10px;
			border-bottom: 1px solid #E5E7EB;
			white-space: nowrap;
		}

		.admin-usuarios-table td {
			padding: 14px 10px;
			border-bottom: 1px solid #F3F4F6;
			vertical-align: middle;
			font-size: 14px;
			color: #111827;
		}

		.admin-usuarios-user {
			display: inline-flex;
			align-items: center;
			gap: 10px;
		}

		.admin-usuarios-avatar,
		.admin-usuarios-avatar-placeholder {
			width: 36px;
			height: 36px;
			border-radius: 50%;
			flex: 0 0 auto;
		}

		.admin-usuarios-avatar {
			object-fit: cover;
			background: #E5E7EB;
		}

		.admin-usuarios-avatar-placeholder {
			background: #E5E7EB;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			color: #9CA3AF;
		}

		.admin-usuarios-name {
			display: grid;
			gap: 2px;
		}

		.admin-usuarios-name strong {
			font-size: 14px;
			font-weight: 600;
			color: #111827;
		}

		.admin-usuarios-name span {
			font-size: 13px;
			color: #6B7280;
		}

		.admin-usuarios-email {
			color: #111827;
			font-size: 14px;
		}

		.admin-usuarios-badge {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			padding: 4px 10px;
			border-radius: 9999px;
			font-size: 12px;
			font-weight: 500;
			white-space: nowrap;
		}

		.admin-usuarios-badge--muted {
			background: var(--color-neutral-bg);
			color: var(--color-neutral);
		}

		.admin-usuarios-role-select {
			min-width: 132px;
			padding: 10px 12px;
			border-radius: 10px;
			border: 1px solid #E5E7EB;
			background: #F9FAFB;
			font-size: 14px;
			color: #111827;
		}

		.admin-usuarios-actions {
			display: inline-flex;
			align-items: center;
			gap: 8px;
			flex-wrap: wrap;
		}

		.admin-usuarios-action-btn {
			width: 32px;
			height: 32px;
			border-radius: 8px;
			border: 1px solid #E5E7EB;
			background: #FFFFFF;
			color: #111827;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			padding: 0;
		}

		.admin-usuarios-action-btn--danger {
			color: #DC2626;
		}

		.admin-usuarios-action-btn--success {
			color: #16A34A;
		}

		.admin-usuarios-action-btn--warning {
			color: #D97706;
		}

		.admin-usuarios-empty,
		.admin-usuarios-error {
			margin: 0;
			padding: 16px;
			border-radius: 10px;
			font-size: 14px;
		}

		.admin-usuarios-empty {
			background: #F8FAFC;
			color: #6B7280;
		}

		.admin-usuarios-error {
			background: #FEE2E2;
			color: #991B1B;
		}

		.admin-usuarios-pagination {
			margin-top: 16px;
		}

		.admin-usuarios-skeleton-grid {
			display: grid;
			grid-template-columns: repeat(4, minmax(0, 1fr));
			gap: 16px;
		}

		.admin-usuarios-skeleton-table {
			display: grid;
			gap: 12px;
		}

		#${DELETE_MODAL_ID} .modal-content {
			border: 0;
			border-radius: 20px;
			box-shadow: var(--shadow-modal);
			overflow: hidden;
		}

		.admin-modal-title {
			margin: 0;
			font-size: 20px;
			font-weight: 700;
			color: #111827;
		}

		.admin-modal-subtitle {
			margin: 6px 0 0;
			font-size: 14px;
			color: #6B7280;
		}

		.admin-modal-confirm {
			font-size: 14px;
			color: #374151;
		}

		.admin-modal-actions {
			display: flex;
			justify-content: flex-end;
			gap: 10px;
			margin-top: 16px;
		}

		.admin-modal-btn {
			border-radius: 10px;
			padding: 10px 16px;
			font-size: 14px;
			font-weight: 600;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
		}

		.admin-modal-btn--dark {
			background: #111827;
			color: #FFFFFF;
			border: 0;
		}

		.admin-modal-btn--outline {
			background: #FFFFFF;
			color: #111827;
			border: 1px solid #E5E7EB;
		}

		@media (max-width: 1199.98px) {
			.admin-usuarios-summary,
			.admin-usuarios-skeleton-grid {
				grid-template-columns: repeat(2, minmax(0, 1fr));
			}
		}

		@media (max-width: 991.98px) {
			.admin-usuarios-filter {
				grid-template-columns: 1fr;
			}
		}

		@media (max-width: 767.98px) {
			.admin-usuarios-summary,
			.admin-usuarios-skeleton-grid {
				grid-template-columns: 1fr;
			}
		}
	`;

	document.head.appendChild(style);
}

/**
 * Recupera estado de UI persistido en el contenedor.
 */
function getState(contenedor) {
	return contenedor.__adminUsuariosState || {
		query: '',
		rol: 'todos',
		estado: 'todos',
		page: 1,
	};
}

/**
 * Guarda estado de UI para conservar filtros/paginación entre renders.
 */
function setState(contenedor, state) {
	contenedor.__adminUsuariosState = state;
}

/**
 * Renderiza las 4 tarjetas de resumen del dashboard.
 */
function renderSummaryCards(resumen = {}) {
	const cards = [
		{ label: 'Total Usuarios', meta: 'Registrados', value: toInt(resumen.total), icon: 'bi-people', color: '#3B82F6' },
		{ label: 'Activos', meta: 'En la plataforma', value: toInt(resumen.activos), icon: 'bi-person-check', color: '#16A34A' },
		{ label: 'Suspendidos', meta: 'Bloqueados', value: toInt(resumen.suspendidos), icon: 'bi-person-slash', color: '#DC2626' },
		{ label: 'Moderadores', meta: 'Con permisos', value: toInt(resumen.moderadores), icon: 'bi-shield-lock', color: '#2563EB' },
	];

	return `
		<div class="admin-usuarios-summary">
			${cards.map((card) => `
				<article class="admin-usuarios-card">
					<i class="bi ${card.icon}" style="color:${card.color}"></i>
					<p class="admin-usuarios-card-title">${escapeHtml(card.label)}</p>
					<div class="admin-usuarios-card-value">${card.value}</div>
					<div class="admin-usuarios-card-meta">${escapeHtml(card.meta)}</div>
				</article>
			`).join('')}
		</div>
	`;
}

/**
 * Renderiza placeholders skeleton mientras cargan datos.
 */
function renderSkeleton(contenedor) {
	contenedor.innerHTML = `
		<div class="admin-usuarios-skeleton-grid">
			${Array.from({ length: 4 }, () => skeletonCard('138px')).join('')}
		</div>

		<div class="admin-usuarios-filter mt-1">
			${skeletonCard('44px')}
			${skeletonCard('44px')}
			${skeletonCard('44px')}
		</div>

		<div class="admin-usuarios-table-card mt-1">
			${skeletonCard('42px')}
			<div class="admin-usuarios-skeleton-table mt-3">
				${Array.from({ length: 4 }, () => skeletonCard('78px')).join('')}
			</div>
		</div>
	`;
}

/**
 * Construye badge de estado para cada fila.
 */
function renderEstadoBadge(estado) {
	const meta = getEstadoMeta(estado);
	return `<span class="admin-usuarios-badge" style="background:${meta.bg};color:${meta.color}">${escapeHtml(meta.label)}</span>`;
}

/**
 * Renderiza celda de usuario con avatar, nombre y @usuario.
 */
function renderUserCell(usuario) {
	if (usuario?.foto_perfil_url) {
		return `
			<span class="admin-usuarios-user">
				<img class="admin-usuarios-avatar" src="${escapeHtml(usuario.foto_perfil_url)}" alt="${escapeHtml(usuario.nombre_usuario || 'Usuario')}">
				<span class="admin-usuarios-name">
					<strong>${escapeHtml(`${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || usuario.nombre_usuario || 'Usuario')}</strong>
					<span>@${escapeHtml(usuario.nombre_usuario || 'usuario')}</span>
				</span>
			</span>
		`;
	}

	return `
		<span class="admin-usuarios-user">
			<span class="admin-usuarios-avatar-placeholder"><i class="bi bi-person"></i></span>
			<span class="admin-usuarios-name">
				<strong>${escapeHtml(`${usuario?.nombre || ''} ${usuario?.apellido || ''}`.trim() || usuario?.nombre_usuario || 'Usuario')}</strong>
				<span>@${escapeHtml(usuario?.nombre_usuario || 'usuario')}</span>
			</span>
		</span>
	`;
}

/**
 * Traduce el valor de rol recibido a etiqueta legible.
 */
function roleLabel(value) {
	const normalized = String(value || '').toLowerCase();
	const option = ROL_OPTIONS.find((item) => item.value === normalized || (item.value === 'administrador' && normalized === 'admin'));
	return option?.label || String(value || 'usuario');
}

/**
 * Renderiza tabla principal y conecta eventos de acciones inline.
 */
function renderTable(contenedor, usuarios, handlers) {
	if (!Array.isArray(usuarios) || usuarios.length === 0) {
		contenedor.innerHTML = '<p class="admin-usuarios-empty">No se encontraron usuarios con los filtros actuales.</p>';
		return;
	}

	contenedor.innerHTML = `
		<div class="admin-usuarios-table-wrap">
			<table class="admin-usuarios-table">
				<thead>
					<tr>
						<th>Usuario</th>
						<th>Email</th>
						<th>Rol</th>
						<th>Estado</th>
						<th>Registro</th>
						<th>Retos</th>
						<th>Fotos</th>
						<th>Votos</th>
						<th>Acciones</th>
					</tr>
				</thead>
				<tbody>
					${usuarios.map((usuario) => {
						const estadoKey = String(usuario.estado || '').toLowerCase();
						const esSuspendido = estadoKey === 'suspendido';
						return `
							<tr data-user-id="${escapeHtml(usuario.id)}">
								<td>${renderUserCell(usuario)}</td>
								<td><span class="admin-usuarios-email">${escapeHtml(usuario.correo || '—')}</span></td>
								<td>
									<select class="admin-usuarios-role" data-action="role" data-id="${escapeHtml(usuario.id)}" aria-label="Cambiar rol">
										${ROL_OPTIONS.map((option) => {
											const currentRol = String(usuario.rol || '').toLowerCase();
											const isSelected = option.value === currentRol || (option.value === 'administrador' && currentRol === 'admin');
											return `<option value="${option.value}" ${isSelected ? 'selected' : ''}>${escapeHtml(option.label)}</option>`;
										}).join('')}
									</select>
								</td>
								<td class="admin-usuarios-status-cell">${renderEstadoBadge(usuario.estado)}</td>
								<td>${escapeHtml(formatDateShort(usuario.created_at))}</td>
								<td>${toInt(usuario.total_retos)}</td>
								<td>${toInt(usuario.total_fotos)}</td>
								<td>${toInt(usuario.total_votos)}</td>
								<td>
									<div class="admin-usuarios-actions">
										${esSuspendido ? `
											<button type="button" class="admin-usuarios-action-btn admin-usuarios-action-btn--success" data-action="toggle-status" data-id="${escapeHtml(usuario.id)}" aria-label="Activar usuario">
												<i class="bi bi-check-circle"></i>
											</button>
										` : `
											<button type="button" class="admin-usuarios-action-btn admin-usuarios-action-btn--warning" data-action="toggle-status" data-id="${escapeHtml(usuario.id)}" aria-label="Suspender usuario">
												<i class="bi bi-slash-circle"></i>
											</button>
										`}
										<button type="button" class="admin-usuarios-action-btn admin-usuarios-action-btn--danger" data-action="delete" data-id="${escapeHtml(usuario.id)}" aria-label="Eliminar usuario">
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

	contenedor.querySelectorAll('[data-action="role"]').forEach((select) => {
		select.addEventListener('change', () => {
			handlers.onChangeRole(select.dataset.id || '', select.value);
		});
	});

	contenedor.querySelectorAll('[data-action="toggle-status"]').forEach((button) => {
		button.addEventListener('click', () => {
			handlers.onToggleStatus(button.dataset.id || '');
		});
	});

	contenedor.querySelectorAll('[data-action="delete"]').forEach((button) => {
		button.addEventListener('click', () => {
			handlers.onDelete(button.dataset.id || '');
		});
	});
}

/**
 * Crea (si no existe) contenedor global para modales.
 */
function ensureModalContainer() {
	let container = document.getElementById('modal-container');
	if (!container) {
		container = document.createElement('div');
		container.id = 'modal-container';
		document.body.appendChild(container);
	}

	return container;
}

/**
 * Construye modal de confirmación para eliminación de usuario.
 */
function ensureDeleteModal() {
	const container = ensureModalContainer();
	let modal = document.getElementById(DELETE_MODAL_ID);

	if (!modal) {
		container.insertAdjacentHTML('beforeend', `
			<div class="modal fade" id="${DELETE_MODAL_ID}" tabindex="-1" aria-hidden="true">
				<div class="modal-dialog modal-dialog-centered">
					<div class="modal-content">
						<div class="modal-header border-0 pb-0 px-4 px-md-5 pt-4 pt-md-5">
							<div>
								<h3 class="admin-modal-title">Eliminar Usuario</h3>
								<p class="admin-modal-subtitle">Esta acción eliminará la cuenta y sus datos relacionados.</p>
							</div>
							<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
						</div>
						<div class="modal-body px-4 px-md-5 pb-4 pb-md-5 pt-3">
							<p class="admin-modal-confirm" id="admin-usuario-delete-message"></p>
							<div class="admin-modal-actions">
								<button type="button" class="admin-modal-btn admin-modal-btn--outline" data-bs-dismiss="modal">Cancelar</button>
								<button type="button" class="admin-modal-btn admin-modal-btn--dark" id="admin-usuario-delete-confirm">Eliminar</button>
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
 * Abre modal de confirmación y delega la acción final.
 */
function openDeleteModal(usuario, onConfirm) {
	const modal = ensureDeleteModal();
	const message = modal.querySelector('#admin-usuario-delete-message');
	const confirmBtn = modal.querySelector('#admin-usuario-delete-confirm');

	if (message) {
		message.textContent = `Vas a eliminar “${usuario?.nombre_usuario || 'este usuario'}”. Esta acción no se puede deshacer.`;
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

/**
 * Carga datos de backend y realiza render completo de la vista.
 */
async function loadAndRender(state, refs) {
	renderSkeleton(refs.content);

	try {
		const response = await api.get('/admin/usuarios', {
			pagina: state.page,
			limite: LIMITE,
			buscar: state.query || undefined,
			rol: state.rol !== 'todos' ? state.rol : undefined,
		estado: state.estado !== 'todos' ? state.estado : undefined,
		});

		const resumen = response?.resumen || {};
		const usuarios = Array.isArray(response?.usuarios) ? response.usuarios : [];
		const total = toInt(response?.total, usuarios.length);
		const totalPages = Math.max(1, Math.ceil(total / LIMITE));

		refs.content.innerHTML = `
			${renderSummaryCards(resumen)}

			<div class="admin-usuarios-filter">
				<input type="search" id="admin-usuarios-search" class="admin-usuarios-search" placeholder="Buscar por nombre, usuario o email..." value="${escapeHtml(state.query)}">
				<select id="admin-usuarios-role-filter" class="admin-usuarios-select">
					<option value="todos" ${state.rol === 'todos' ? 'selected' : ''}>Todos los roles</option>
					${ROL_OPTIONS.map((option) => `<option value="${option.value}" ${state.rol === option.value ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('')}
				</select>
				<select id="admin-usuarios-status-filter" class="admin-usuarios-select">
					<option value="todos" ${state.estado === 'todos' ? 'selected' : ''}>Todos</option>
					<option value="activo" ${state.estado === 'activo' ? 'selected' : ''}>Activos</option>
					<option value="suspendido" ${state.estado === 'suspendido' ? 'selected' : ''}>Suspendidos</option>
				</select>
			</div>

			<div class="admin-usuarios-table-card">
				<h2 class="admin-usuarios-table-title">Usuarios Registrados (${total})</h2>
				<div id="admin-usuarios-table-area"></div>
				<div id="admin-usuarios-pagination" class="admin-usuarios-pagination"></div>
			</div>
		`;

		const searchInput = refs.content.querySelector('#admin-usuarios-search');
		const roleFilter = refs.content.querySelector('#admin-usuarios-role-filter');
		const statusFilter = refs.content.querySelector('#admin-usuarios-status-filter');
		const tableArea = refs.content.querySelector('#admin-usuarios-table-area');
		const pagination = refs.content.querySelector('#admin-usuarios-pagination');

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

		if (roleFilter) {
			roleFilter.addEventListener('change', async () => {
				state.rol = roleFilter.value;
				state.page = 1;
				await loadAndRender(state, refs);
			});
		}

		if (statusFilter) {
			statusFilter.addEventListener('change', async () => {
				state.estado = statusFilter.value;
				state.page = 1;
				await loadAndRender(state, refs);
			});
		}

		renderTable(tableArea, usuarios, {
			onChangeRole: async (id, rol) => {
				try {
					await api.patch(`/admin/usuarios/${encodeURIComponent(id)}/rol`, { rol });
					mostrarToast('Rol actualizado correctamente.', 'success');
				} catch (error) {
					mostrarToast(error?.error || 'No se pudo actualizar el rol.', 'warning');
				}
			},
			onToggleStatus: async (id) => {
				const usuario = usuarios.find((item) => String(item.id) === String(id));
				if (!usuario) {
					return;
				}

				const nuevoEstado = String(usuario.estado || '').toLowerCase() === 'suspendido' ? 'activo' : 'suspendido';

				try {
					await api.patch(`/admin/usuarios/${encodeURIComponent(id)}/estado`, { estado: nuevoEstado });
					usuario.estado = nuevoEstado;

					const row = tableArea.querySelector(`tr[data-user-id="${CSS.escape(String(id))}"]`);
					if (row) {
						const statusCell = row.querySelector('.admin-usuarios-status-cell');
						const actionCell = row.querySelector('.admin-usuarios-actions');
						if (statusCell) {
							statusCell.innerHTML = renderEstadoBadge(nuevoEstado);
						}
						if (actionCell) {
							actionCell.innerHTML = nuevoEstado === 'suspendido'
								? `
									<button type="button" class="admin-usuarios-action-btn admin-usuarios-action-btn--success" data-action="toggle-status" data-id="${escapeHtml(id)}" aria-label="Activar usuario">
										<i class="bi bi-check-circle"></i>
									</button>
									<button type="button" class="admin-usuarios-action-btn admin-usuarios-action-btn--danger" data-action="delete" data-id="${escapeHtml(id)}" aria-label="Eliminar usuario">
										<i class="bi bi-trash"></i>
									</button>
								`
								: `
									<button type="button" class="admin-usuarios-action-btn admin-usuarios-action-btn--warning" data-action="toggle-status" data-id="${escapeHtml(id)}" aria-label="Suspender usuario">
										<i class="bi bi-slash-circle"></i>
									</button>
									<button type="button" class="admin-usuarios-action-btn admin-usuarios-action-btn--danger" data-action="delete" data-id="${escapeHtml(id)}" aria-label="Eliminar usuario">
										<i class="bi bi-trash"></i>
									</button>
								`;
								actionCell.querySelectorAll('[data-action="toggle-status"]').forEach((button) => {
									button.addEventListener('click', () => {
										handlers.onToggleStatus(button.dataset.id || '');
									});
								});
								actionCell.querySelectorAll('[data-action="delete"]').forEach((button) => {
									button.addEventListener('click', () => {
										handlers.onDelete(button.dataset.id || '');
									});
								});
						}
					}

					mostrarToast(nuevoEstado === 'suspendido' ? 'Usuario suspendido correctamente.' : 'Usuario activado correctamente.', 'success');
				} catch (error) {
					mostrarToast(error?.error || 'No se pudo actualizar el estado.', 'warning');
				}
			},
			onDelete: async (id) => {
				const usuario = usuarios.find((item) => String(item.id) === String(id));
				if (!usuario) {
					return;
				}

				openDeleteModal(usuario, async () => {
					try {
						await api.delete(`/admin/usuarios/${encodeURIComponent(id)}`);
						mostrarToast('Usuario eliminado correctamente.', 'success');
						await loadAndRender(state, refs);
					} catch (error) {
						mostrarToast(error?.error || 'No se pudo eliminar el usuario.', 'warning');
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
		refs.content.innerHTML = `<p class="admin-usuarios-error">${escapeHtml(error?.error || 'No se pudieron cargar los usuarios.')}</p>`;
	}
}

/**
 * Entrada pública del módulo para el shell admin.
 */
async function render(contenedor) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	ensureStyles();

	const state = getState(contenedor);
	contenedor.innerHTML = '<div class="admin-usuarios"><div id="admin-usuarios-root"></div></div>';

	const root = contenedor.querySelector('#admin-usuarios-root');
	if (!root) {
		return;
	}

	await loadAndRender(state, { content: root });
}

export { render };

export default {
	render,
};
