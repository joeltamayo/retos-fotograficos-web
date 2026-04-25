import api from '../api.js';
import { renderPaginacion } from '../components/paginacion.js';
import { mostrarToast, skeletonCard } from '../utils.js';

const STYLE_ID = 'admin-retos-styles';
const MODAL_ID = 'admin-reto-modal';
const DELETE_MODAL_ID = 'admin-reto-delete-modal';
const LIMITE = 10;

const ESTADOS = {
	activo: { label: 'Activo', bg: 'var(--color-success-bg)', color: 'var(--color-success)', icon: 'bi-check-circle' },
	finalizado: { label: 'Finalizado', bg: 'var(--color-neutral-bg)', color: 'var(--color-neutral)', icon: 'bi-archive' },
	programado: { label: 'Programado', bg: 'var(--color-info-bg)', color: 'var(--color-info)', icon: 'bi-clock' },
	archivado: { label: 'Archivado', bg: 'var(--color-neutral-bg)', color: 'var(--color-text-muted)', icon: 'bi-archive' },
};

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
	return ESTADOS[key] || { label: key || '—', bg: 'var(--color-neutral-bg)', color: 'var(--color-text-secondary)', icon: 'bi-circle' };
}

function ensureStyles() {
	if (document.getElementById(STYLE_ID)) {
		return;
	}

	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = `
		.admin-retos {
			display: grid;
			gap: 24px;
		}

		.admin-retos-summary {
			display: grid;
			grid-template-columns: repeat(4, minmax(0, 1fr));
			gap: 16px;
		}

		.admin-retos-card,
		.admin-retos-toolbar,
		.admin-retos-table-card {
			background: #FFFFFF;
			border-radius: 14px;
			box-shadow: var(--shadow-card);
		}

		.admin-retos-card {
			position: relative;
			padding: 18px;
			min-height: 138px;
			overflow: hidden;
		}

		.admin-retos-card i {
			position: absolute;
			top: 16px;
			right: 16px;
			font-size: 18px;
		}

		.admin-retos-card-title {
			margin: 0;
			font-size: 14px;
			font-weight: 500;
			color: #111827;
		}

		.admin-retos-card-value {
			margin-top: 34px;
			font-size: 34px;
			font-weight: 700;
			line-height: 1;
			color: #111827;
		}

		.admin-retos-card-meta {
			margin-top: 6px;
			font-size: 14px;
			color: #6B7280;
		}

		.admin-retos-toolbar {
			padding: 14px;
			display: grid;
			grid-template-columns: minmax(0, 1fr) 220px auto;
			gap: 12px;
			align-items: center;
		}

		.admin-retos-search,
		.admin-retos-select,
		.admin-retos-input,
		.admin-retos-textarea {
			width: 100%;
			border: 1px solid #E5E7EB;
			background: #F9FAFB;
			border-radius: 10px;
			padding: 11px 14px;
			font-size: 14px;
			color: #111827;
		}

		.admin-retos-search::placeholder {
			color: #9CA3AF;
		}

		.admin-retos-btn {
			border: 0;
			border-radius: 10px;
			padding: 11px 16px;
			font-size: 14px;
			font-weight: 600;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
		}

		.admin-retos-btn--dark {
			background: #111827;
			color: #FFFFFF;
		}

		.admin-retos-table-card {
			padding: 18px;
		}

		.admin-retos-table-title {
			margin: 0 0 14px;
			font-size: 18px;
			font-weight: 600;
			color: #111827;
		}

		.admin-retos-table-wrap {
			overflow-x: auto;
		}

		.admin-retos-table {
			width: 100%;
			min-width: 1120px;
			border-collapse: collapse;
		}

		.admin-retos-table th {
			text-align: left;
			font-size: 14px;
			font-weight: 600;
			color: #374151;
			padding: 12px 10px;
			border-bottom: 1px solid #E5E7EB;
			white-space: nowrap;
		}

		.admin-retos-table td {
			padding: 14px 10px;
			border-bottom: 1px solid #F3F4F6;
			vertical-align: top;
			font-size: 14px;
			color: #111827;
		}

		.admin-retos-thumb,
		.admin-retos-thumb-placeholder {
			width: 48px;
			height: 48px;
			border-radius: 6px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
		}

		.admin-retos-thumb {
			object-fit: cover;
			background: #E5E7EB;
		}

		.admin-retos-thumb-placeholder {
			background: #E5E7EB;
			color: #9CA3AF;
		}

		.admin-retos-title {
			margin: 0;
			font-size: 15px;
			font-weight: 600;
			color: #111827;
		}

		.admin-retos-desc {
			margin: 4px 0 0;
			font-size: 14px;
			color: #6B7280;
			line-height: 1.35;
			display: -webkit-box;
			-webkit-line-clamp: 2;
			-webkit-box-orient: vertical;
			overflow: hidden;
		}

		.admin-retos-badge {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			padding: 4px 10px;
			border-radius: 9999px;
			font-size: 12px;
			font-weight: 500;
			white-space: nowrap;
		}

		.admin-retos-actions {
			display: inline-flex;
			align-items: center;
			gap: 8px;
			flex-wrap: wrap;
		}

		.admin-retos-action-btn {
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

		.admin-retos-action-btn--danger {
			color: #DC2626;
		}

		.admin-retos-action-btn--success {
			color: #16A34A;
		}

		.admin-retos-action-btn--warning {
			color: #D97706;
		}

		.admin-retos-empty,
		.admin-retos-error {
			margin: 0;
			padding: 16px;
			border-radius: 10px;
			font-size: 14px;
		}

		.admin-retos-empty {
			background: #F8FAFC;
			color: #6B7280;
		}

		.admin-retos-error {
			background: #FEE2E2;
			color: #991B1B;
		}

		.admin-retos-pagination {
			margin-top: 16px;
		}

		.admin-retos-skeleton-grid {
			display: grid;
			grid-template-columns: repeat(4, minmax(0, 1fr));
			gap: 16px;
		}

		.admin-retos-skeleton-table {
			display: grid;
			gap: 12px;
		}

		#${MODAL_ID} .modal-content,
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

		.admin-form-grid {
			display: grid;
			gap: 14px;
		}

		.admin-form-label {
			margin: 0 0 8px;
			font-size: 14px;
			font-weight: 600;
			color: #111827;
		}

		.admin-form-textarea {
			min-height: 112px;
			resize: vertical;
		}

		.admin-form-error {
			margin-top: 6px;
			font-size: 12px;
			color: #DC2626;
			min-height: 16px;
		}

		.admin-form-actions {
			display: flex;
			justify-content: flex-end;
			gap: 10px;
			margin-top: 8px;
		}

		.admin-form-btn {
			border-radius: 10px;
			padding: 10px 16px;
			font-size: 14px;
			font-weight: 600;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
		}

		.admin-form-btn--dark {
			background: #111827;
			color: #FFFFFF;
			border: 0;
		}

		.admin-form-btn--outline {
			background: #FFFFFF;
			color: #111827;
			border: 1px solid #E5E7EB;
		}

		@media (max-width: 1199.98px) {
			.admin-retos-summary,
			.admin-retos-skeleton-grid {
				grid-template-columns: repeat(2, minmax(0, 1fr));
			}
		}

		@media (max-width: 991.98px) {
			.admin-retos-toolbar {
				grid-template-columns: 1fr;
			}
		}

		@media (max-width: 767.98px) {
			.admin-retos-summary,
			.admin-retos-skeleton-grid {
				grid-template-columns: 1fr;
			}
		}
	`;

	document.head.appendChild(style);
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
		{ label: 'Retos Activos', meta: 'En curso', value: toInt(resumen.activos), icon: 'bi-check-circle', color: '#16A34A' },
		{ label: 'Finalizados', meta: 'Completados', value: toInt(resumen.finalizados), icon: 'bi-archive', color: '#6B7280' },
		{ label: 'Programados', meta: 'Próximos', value: toInt(resumen.programados), icon: 'bi-clock', color: '#1D4ED8' },
		{ label: 'Participantes', meta: 'Total', value: toInt(resumen.total_participantes), icon: 'bi-people', color: '#A855F7' },
		{ label: 'Fotografías', meta: 'Enviadas', value: toInt(resumen.total_fotografias), icon: 'bi-image', color: '#D4AF37' },
	];

	return `
		<div class="admin-retos-summary">
			${cards.map((card) => `
				<article class="admin-retos-card">
					<i class="bi ${card.icon}" style="color:${card.color}"></i>
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

		<div class="admin-retos-toolbar mt-1">
			${skeletonCard('44px')}
			${skeletonCard('44px')}
			${skeletonCard('44px')}
		</div>

		<div class="admin-retos-table-card mt-1">
			${skeletonCard('42px')}
			<div class="admin-retos-skeleton-table mt-3">
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
	return `<span class="admin-retos-badge" style="background:${meta.bg};color:${meta.color}">${escapeHtml(meta.label)}</span>`;
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
										? `<img class="admin-retos-thumb" src="${escapeHtml(reto.imagen_url)}" alt="${escapeHtml(reto.titulo || 'Reto')}">`
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

function ensureRetoModal() {
	const container = ensureModalContainer();
	let modal = document.getElementById(MODAL_ID);

	if (!modal) {
		container.insertAdjacentHTML('beforeend', `
			<div class="modal fade" id="${MODAL_ID}" tabindex="-1" aria-hidden="true">
				<div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
					<div class="modal-content">
						<div class="modal-header border-0 pb-0 px-4 px-md-5 pt-4 pt-md-5">
							<div>
								<h3 class="admin-modal-title" id="admin-reto-modal-title">Crear Nuevo Reto</h3>
								<p class="admin-modal-subtitle" id="admin-reto-modal-subtitle">Define los detalles del nuevo reto fotográfico que deseas crear.</p>
							</div>
							<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
						</div>
						<div class="modal-body px-4 px-md-5 pb-4 pb-md-5 pt-4">
							<form id="admin-reto-form" class="admin-form-grid" novalidate>
								<input type="hidden" name="retoId" value="">
								<div>
									<label class="admin-form-label" for="admin-reto-titulo">Título del Reto *</label>
									<input id="admin-reto-titulo" name="titulo" class="admin-retos-input" type="text" placeholder="Ej: Atardecer Dorado">
									<p class="admin-form-error" data-error="titulo"></p>
								</div>
								<div>
									<label class="admin-form-label" for="admin-reto-descripcion">Descripción *</label>
									<textarea id="admin-reto-descripcion" name="descripcion" class="admin-retos-textarea" placeholder="Describe el reto y qué tipo de fotografías buscas..."></textarea>
									<p class="admin-form-error" data-error="descripcion"></p>
								</div>
								<div>
									<label class="admin-form-label" for="admin-reto-categoria">Categoría *</label>
									<input id="admin-reto-categoria" name="categoria_nombre" class="admin-retos-input" type="text" placeholder="Ej: Naturaleza, Urbano, Retrato...">
									<p class="admin-form-error" data-error="categoria_nombre"></p>
								</div>
								<div>
									<label class="admin-form-label" for="admin-reto-duracion">Duración *</label>
									<select id="admin-reto-duracion" name="duracion" class="admin-retos-select">
										<option value="24h">24h</option>
										<option value="1 Semana" selected>1 Semana</option>
										<option value="1 Mes">1 Mes</option>
										<option value="Personalizado">Personalizado</option>
									</select>
									<p class="admin-form-error" data-error="duracion"></p>
								</div>
								<div class="row g-3">
									<div class="col-12 col-md-6">
										<label class="admin-form-label" for="admin-reto-inicio">Fecha de Inicio *</label>
										<input id="admin-reto-inicio" name="fecha_inicio" class="admin-retos-input" type="date">
										<p class="admin-form-error" data-error="fecha_inicio"></p>
									</div>
									<div class="col-12 col-md-6">
										<label class="admin-form-label" for="admin-reto-fin">Fecha de Fin *</label>
										<input id="admin-reto-fin" name="fecha_fin" class="admin-retos-input" type="date">
										<p class="admin-form-error" data-error="fecha_fin"></p>
									</div>
								</div>
								<div>
									<label class="admin-form-label" for="admin-reto-imagen">URL de Imagen de Portada</label>
									<input id="admin-reto-imagen" name="imagen_url" class="admin-retos-input" type="url" placeholder="https://ejemplo.com/imagen.jpg">
									<p class="admin-form-error" data-error="imagen_url"></p>
								</div>
								<div class="admin-form-actions">
									<button type="button" class="admin-form-btn admin-form-btn--outline" data-bs-dismiss="modal">Cancelar</button>
									<button type="submit" class="admin-form-btn admin-form-btn--dark" id="admin-reto-submit-btn">
										<span id="admin-reto-submit-label">+ Crear Reto</span>
									</button>
								</div>
								<p class="admin-form-error" data-error="form"></p>
							</form>
						</div>
					</div>
				</div>
			</div>
		`);
		modal = document.getElementById(MODAL_ID);
	}

	return modal;
}

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
								<h3 class="admin-modal-title">Eliminar Reto</h3>
								<p class="admin-modal-subtitle">Esta acción eliminará el reto y todos sus datos relacionados.</p>
							</div>
							<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
						</div>
						<div class="modal-body px-4 px-md-5 pb-4 pb-md-5 pt-3">
							<p class="admin-modal-subtitle" id="admin-delete-message"></p>
							<div class="admin-form-actions mt-4">
								<button type="button" class="admin-form-btn admin-form-btn--outline" data-bs-dismiss="modal">Cancelar</button>
								<button type="button" class="admin-form-btn admin-form-btn--dark" id="admin-delete-confirm-btn">Eliminar</button>
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

function clearErrors(form) {
	form.querySelectorAll('[data-error]').forEach((node) => {
		node.textContent = '';
	});
}

function setError(form, field, message) {
	const node = form.querySelector(`[data-error="${field}"]`);
	if (node) {
		node.textContent = message;
	}
}

function buildPayload(form) {
	return {
		titulo: String(form.titulo?.value || '').trim(),
		descripcion: String(form.descripcion?.value || '').trim(),
		categoria_nombre: String(form.categoria_nombre?.value || '').trim(),
		duracion: String(form.duracion?.value || '').trim(),
		fecha_inicio: String(form.fecha_inicio?.value || '').trim(),
		fecha_fin: String(form.fecha_fin?.value || '').trim(),
		imagen_url: String(form.imagen_url?.value || '').trim(),
	};
}

function validateForm(values) {
	const errors = {};

	if (!values.titulo) errors.titulo = 'Ingresa un título.';
	if (!values.descripcion) errors.descripcion = 'Ingresa una descripción.';
	if (!values.categoria_nombre) errors.categoria_nombre = 'Ingresa la categoría.';
	if (!values.fecha_inicio) errors.fecha_inicio = 'Selecciona la fecha de inicio.';
	if (!values.fecha_fin) errors.fecha_fin = 'Selecciona la fecha de fin.';
	if (values.fecha_inicio && values.fecha_fin && values.fecha_fin <= values.fecha_inicio) {
		errors.fecha_fin = 'La fecha de fin debe ser mayor a la de inicio.';
	}

	return errors;
}

function buildApiBody(values) {
	const formData = new FormData();
	formData.append('titulo', values.titulo);
	formData.append('descripcion', values.descripcion);
	formData.append('fecha_inicio', values.fecha_inicio);
	formData.append('fecha_fin', values.fecha_fin);
	formData.append('estado', 'programado');
	formData.append('duracion', values.duracion);

	if (/^\d+$/.test(values.categoria_nombre)) {
		formData.append('categoria_id', values.categoria_nombre);
	} else {
		formData.append('categoria_nombre', values.categoria_nombre);
	}

	if (values.imagen_url) {
		formData.append('imagen_url', values.imagen_url);
	}

	return formData;
}

function fillForm(form, reto) {
	form.retoId.value = reto?.id || '';
	form.titulo.value = reto?.titulo || '';
	form.descripcion.value = reto?.descripcion || '';
	form.categoria_nombre.value = reto?.categoria_nombre || '';
	form.duracion.value = reto?.duracion || '1 Semana';
	form.fecha_inicio.value = reto?.fecha_inicio ? String(reto.fecha_inicio).slice(0, 10) : '';
	form.fecha_fin.value = reto?.fecha_fin ? String(reto.fecha_fin).slice(0, 10) : '';
	form.imagen_url.value = reto?.imagen_url || '';
}

function openRetoModal(onSaved, reto = null) {
	const modal = ensureRetoModal();
	const title = modal.querySelector('#admin-reto-modal-title');
	const subtitle = modal.querySelector('#admin-reto-modal-subtitle');
	const submitLabel = modal.querySelector('#admin-reto-submit-label');
	const form = modal.querySelector('#admin-reto-form');
	const submitBtn = modal.querySelector('#admin-reto-submit-btn');

	if (!form || !submitBtn || !title || !subtitle || !submitLabel) {
		return;
	}

	if (reto) {
		title.textContent = 'Editar Reto';
		subtitle.textContent = 'Modifica los detalles del reto fotográfico seleccionado.';
		submitLabel.textContent = 'Guardar Cambios';
	} else {
		title.textContent = 'Crear Nuevo Reto';
		subtitle.textContent = 'Define los detalles del nuevo reto fotográfico que deseas crear.';
		submitLabel.textContent = '+ Crear Reto';
	}

	form.reset();
	clearErrors(form);
	if (reto) {
		fillForm(form, reto);
	}

	form.onsubmit = async (event) => {
		event.preventDefault();
		clearErrors(form);

		const values = buildPayload(form);
		const errors = validateForm(values);
		if (Object.keys(errors).length > 0) {
			Object.entries(errors).forEach(([field, message]) => setError(form, field, message));
			return;
		}

		submitBtn.disabled = true;
		submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" aria-hidden="true"></span><span>Guardando...</span>';

		try {
			const body = buildApiBody(values);
			if (reto?.id) {
				await api.upload(`/admin/retos/${encodeURIComponent(reto.id)}`, body, 'PUT');
				mostrarToast('Reto actualizado correctamente.', 'success');
			} else {
				await api.upload('/admin/retos', body, 'POST');
				mostrarToast('Reto creado correctamente.', 'success');
			}

			window.bootstrap?.Modal.getInstance(modal)?.hide();
			await onSaved();
		} catch (error) {
			setError(form, 'form', error?.error || 'No se pudo guardar el reto.');
		} finally {
			submitBtn.disabled = false;
			submitBtn.innerHTML = reto ? 'Guardar Cambios' : '+ Crear Reto';
		}
	};

	modal.addEventListener('hidden.bs.modal', () => {
		form.onsubmit = null;
	}, { once: true });

	window.bootstrap?.Modal ? new window.bootstrap.Modal(modal).show() : modal.classList.add('show');
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
			createBtn.addEventListener('click', () => {
				openRetoModal(async () => {
					await loadAndRender(state, refs);
				});
			});
		}

		renderTable(tableArea, retos, {
			onEdit: async (id) => {
				try {
					const reto = await api.get(`/admin/retos/${encodeURIComponent(id)}`);
					openRetoModal(async () => {
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

	ensureStyles();

	const state = getState(contenedor);
	contenedor.innerHTML = '<div class="admin-retos"><div id="admin-retos-root"></div></div>';

	const root = contenedor.querySelector('#admin-retos-root');
	if (!root) {
		return;
	}

	await loadAndRender(state, { content: root });
}

export { render };

export default {
	render,
};
