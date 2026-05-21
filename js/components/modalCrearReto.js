import api from '../api.js';
import { mostrarToast } from '../utils.js';

const MODAL_ID = 'modal-crear-reto';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const DURACION_RULES = [
    { match: (value) => value === '24h', apply: (date) => addDays(date, 1) },
    { match: (value) => /semana/i.test(value), apply: (date, amount) => addDays(date, 7 * amount) },
    { match: (value) => /mes/i.test(value), apply: (date, amount) => addMonths(date, amount) },
    { match: (value) => /an(?:o|io)/i.test(value), apply: (date, amount) => addYears(date, amount) },
];

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('\"', '&quot;')
        .replaceAll("'", '&#39;');
}

function getTodayDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function parseDateInput(value) {
    if (!value) return null;
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function addMonths(date, months) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
}

function addYears(date, years) {
    const next = new Date(date);
    next.setFullYear(next.getFullYear() + years);
    return next;
}

function parseDurationAmount(value) {
    const match = value.match(/(\d+)/);
    if (!match) return 1;
    const parsed = Number.parseInt(match[1], 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function resolveDurationRule(value) {
    return DURACION_RULES.find((rule) => rule.match(value)) || null;
}

let categoriasCache = null;
async function getCategorias() {
    if (Array.isArray(categoriasCache)) return categoriasCache;
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
    if (!selectElement) return;

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

function getModalContainer() {
    let container = document.getElementById('modal-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'modal-container';
        document.body.appendChild(container);
    }
    return container;
}

function getLoadingHtml() {
    return `
        <div class="modal fade" id="${MODAL_ID}" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="u-center-content u-min-h-520">
                        <div class="app-spinner" role="status" aria-label="Cargando"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function clearErrors(form) {
    form.querySelectorAll('[data-error]').forEach((node) => { node.textContent = ''; });
}

function setError(form, field, message) {
    const node = form.querySelector(`[data-error="${field}"]`);
    if (node) node.textContent = message;
}

function buildPayload(form) {
    return {
        titulo: String(form.titulo?.value || '').trim(),
        descripcion: String(form.descripcion?.value || '').trim(),
        categoria_id: String(form.categoria_id?.value || '').trim(),
        duracion: String(form.duracion?.value || '').trim(),
        fecha_inicio: String(form.fecha_inicio?.value || '').trim(),
        fecha_fin: String(form.fecha_fin?.value || '').trim(),
    };
}

function validateForm(values) {
    const errors = {};
    if (!values.titulo) errors.titulo = 'Ingresa un título.';
    if (!values.descripcion) errors.descripcion = 'Ingresa una descripción.';
    if (!values.categoria_id || !/^\d+$/.test(values.categoria_id)) errors.categoria_id = 'Selecciona una categoría válida.';
    if (!values.fecha_inicio) errors.fecha_inicio = 'Selecciona la fecha de inicio.';
    if (!values.fecha_fin) errors.fecha_fin = 'Selecciona la fecha de fin.';
    if (values.fecha_inicio && values.fecha_fin && values.fecha_fin <= values.fecha_inicio) {
        errors.fecha_fin = 'La fecha de fin debe ser mayor a la de inicio.';
    }
    if (!values.isEditing) {
        const today = getTodayDateString();
        if (values.fecha_inicio && values.fecha_inicio < today) {
            errors.fecha_inicio = 'La fecha de inicio no puede estar en el pasado.';
        }
        if (values.fecha_fin && values.fecha_fin < today) {
            errors.fecha_fin = 'La fecha de fin no puede estar en el pasado.';
        }
        if (!values.imagen_file) {
            errors.imagen_file = 'Carga una imagen de portada.';
        }
    }
    return errors;
}

function buildApiBody(values, isEditing = false) {
    const formData = new FormData();
    formData.append('titulo', values.titulo);
    formData.append('descripcion', values.descripcion);
    formData.append('categoria_id', values.categoria_id);
    formData.append('fecha_inicio', values.fecha_inicio);
    formData.append('fecha_fin', values.fecha_fin);
    if (!isEditing) formData.append('estado', 'activo');
    formData.append('duracion', values.duracion);
    if (values.imagen_file) formData.append('imagen', values.imagen_file);
    return formData;
}

function fillForm(form, reto) {
    form.retoId.value = reto?.id || '';
    form.titulo.value = reto?.titulo || '';
    form.descripcion.value = reto?.descripcion || '';
    if (form.categoria_id) form.categoria_id.value = reto?.categoria_id ? String(reto.categoria_id) : '';
    form.duracion.value = reto?.duracion || '1 Semana';
    form.fecha_inicio.value = reto?.fecha_inicio ? String(reto.fecha_inicio).slice(0, 10) : '';
    form.fecha_fin.value = reto?.fecha_fin ? String(reto.fecha_fin).slice(0, 10) : '';
    if (form.imagen_file) form.imagen_file.value = '';
}

function renderModalContent(state) {
    state.modalElement.querySelector('.modal-content').innerHTML = `
        <div class="modal-header mcr-header">
            <div>
                <h3 class="modal-title mcr-title">${escapeHtml(state.isEditing ? 'Editar Reto' : 'Crear Nuevo Reto')}</h3>
                <p class="mcr-subtitle">${escapeHtml(state.isEditing ? 'Modifica los detalles del reto fotográfico seleccionado.' : 'Define los detalles del nuevo reto fotográfico que deseas crear.')}</p>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>
        <div class="modal-body mcr-body">
            <form id="mcr-form" class="mcr-form" novalidate>
                <input type="hidden" name="retoId" value="">
                <div class="mcr-section">
                    <label class="mcr-label" for="mcr-titulo">Título del Reto *</label>
                    <input id="mcr-titulo" name="titulo" class="mcr-input" type="text" placeholder="Ej: Atardecer Dorado">
                    <p class="mcr-error" data-error="titulo"></p>
                </div>
                <div class="mcr-section">
                    <label class="mcr-label" for="mcr-descripcion">Descripción *</label>
                    <textarea id="mcr-descripcion" name="descripcion" class="mcr-textarea" placeholder="Describe el reto y qué tipo de fotografías buscas..."></textarea>
                    <p class="mcr-error" data-error="descripcion"></p>
                </div>
                <div class="mcr-section">
                    <label class="mcr-label" for="mcr-categoria">Categoría *</label>
                    <select id="mcr-categoria" name="categoria_id" class="mcr-select">
                        <option value="">Cargando categorías...</option>
                    </select>
                    <p class="mcr-error" data-error="categoria_id"></p>
                </div>
                <div class="mcr-section">
                    <label class="mcr-label" for="mcr-duracion">Duración *</label>
                    <select id="mcr-duracion" name="duracion" class="mcr-select">
                        <option value="24h">24h</option>
                        <option value="1 Semana" selected>1 Semana</option>
                        <option value="1 Mes">1 Mes</option>
                        <option value="Personalizado">Personalizado</option>
                    </select>
                    <p class="mcr-error" data-error="duracion"></p>
                </div>
                <div class="mcr-row">
                    <div class="mcr-col">
                        <label class="mcr-label" for="mcr-inicio">Fecha de Inicio *</label>
                        <input id="mcr-inicio" name="fecha_inicio" class="mcr-input" type="date">
                        <p class="mcr-error" data-error="fecha_inicio"></p>
                    </div>
                    <div class="mcr-col">
                        <label class="mcr-label" for="mcr-fin">Fecha de Fin *</label>
                        <input id="mcr-fin" name="fecha_fin" class="mcr-input" type="date">
                        <p class="mcr-error" data-error="fecha_fin"></p>
                    </div>
                </div>
                <div class="mcr-section">
                    <div class="mcr-label">Imagen de Portada ${state.isEditing ? '' : '*'}</div>
                    <input id="mcr-imagen-file" name="imagen_file" type="file" accept="image/jpeg,image/png,image/webp" hidden>
                    <div id="mcr-upload-zone"></div>
                    <p class="mcr-error" data-error="imagen_file"></p>
                </div>
                <p class="mcr-error mcr-form-error" data-error="form"></p>
                <div class="mcr-actions">
                    <button type="button" class="mcr-btn mcr-btn--outline" data-bs-dismiss="modal">Cancelar</button>
                    <button type="submit" class="mcr-btn mcr-btn--primary" id="mcr-submit-btn">
                        <i class="bi ${state.isEditing ? 'bi-check2' : 'bi-plus'}"></i>
                        <span>${escapeHtml(state.isEditing ? 'Guardar Cambios' : 'Crear Reto')}</span>
                    </button>
                </div>
            </form>
        </div>
    `;
}

async function abrirModalCrearReto(onSaved = null, reto = null) {
    const container = getModalContainer();
    let modal = document.getElementById(MODAL_ID);
    if (!modal) {
        container.insertAdjacentHTML('beforeend', getLoadingHtml());
        modal = document.getElementById(MODAL_ID);
    }

    const state = {
        modalElement: modal,
        isEditing: Boolean(reto?.id),
        reto: reto || null,
        previewUrl: '',
        imageUrl: reto?.imagen_url || '',
    };

    renderModalContent(state);

    const form = modal.querySelector('#mcr-form');
    const submitBtn = modal.querySelector('#mcr-submit-btn');
    if (!form || !submitBtn) return;

    const categorias = await getCategorias();
    setCategoriaOptions(form.categoria_id, categorias, reto?.categoria_id || '');

    if (!reto && categorias.length === 0) {
        setError(form, 'form', 'No se pudieron cargar las categorías. Intenta nuevamente.');
    }

    if (reto) fillForm(form, reto);

    const dateStart = form.querySelector('#mcr-inicio');
    const dateEnd = form.querySelector('#mcr-fin');
    const durationSelect = form.querySelector('#mcr-duracion');
    const fileInput = form.querySelector('#mcr-imagen-file');
    const uploadZone = form.querySelector('#mcr-upload-zone');

    const today = getTodayDateString();
    if (!state.isEditing) {
        if (dateStart) dateStart.min = today;
        if (dateEnd) dateEnd.min = today;
    }

    const updateRangeFromDuration = () => {
        if (!dateStart || !dateEnd || !durationSelect) return;

        const durationValue = String(durationSelect.value || '').trim();
        const rule = resolveDurationRule(durationValue);
        const amount = parseDurationAmount(durationValue);

        if (!rule) {
            dateEnd.readOnly = false;
            if (!state.isEditing) {
                dateEnd.min = dateStart.value || today;
            }
            return;
        }

        if (!dateStart.value) {
            dateStart.value = today;
        }

        const startDate = parseDateInput(dateStart.value);
        if (!startDate) return;

        const endDate = rule.apply(startDate, amount);
        dateEnd.value = formatDateInput(endDate);
        dateEnd.readOnly = true;
        if (!state.isEditing) {
            dateEnd.min = dateStart.value;
        }
    };

    const renderUploadZone = () => {
        if (!uploadZone) return;

        if (state.previewUrl) {
            uploadZone.innerHTML = `
                <div class="mcr-upload-preview">
                    <img src="${escapeHtml(state.previewUrl)}" alt="Preview de imagen de portada">
                    <button type="button" class="mcr-upload-remove" data-accion="quitar-imagen" aria-label="Quitar imagen">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
            `;
            return;
        }

        if (state.imageUrl) {
            uploadZone.innerHTML = `
                <div class="mcr-upload-preview" data-accion="abrir-imagen-file">
                    <img src="${escapeHtml(state.imageUrl)}" alt="Imagen actual del reto">
                </div>
            `;
            return;
        }

        uploadZone.innerHTML = `
            <div class="mcr-upload-area" data-accion="abrir-imagen-file">
                <div>
                    <i class="bi bi-image u-icon-3xl u-text-muted"></i>
                    <p class="mcr-upload-prompt">Click para seleccionar imagen</p>
                    <p class="mcr-upload-helper">PNG, JPG hasta 10MB</p>
                </div>
            </div>
        `;
    };

    const setPreviewFile = (file) => {
        if (state.previewUrl) {
            URL.revokeObjectURL(state.previewUrl);
            state.previewUrl = '';
        }

        state.previewUrl = file ? URL.createObjectURL(file) : '';
        renderUploadZone();
    };

    uploadZone?.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target.closest('[data-accion]') : null;
        if (!target) return;

        const action = target.getAttribute('data-accion');
        if (action === 'abrir-imagen-file') {
            fileInput?.click();
            return;
        }

        if (action === 'quitar-imagen') {
            event.preventDefault();
            if (fileInput) fileInput.value = '';
            setPreviewFile(null);
        }
    });

    fileInput?.addEventListener('change', () => {
        const file = fileInput.files?.[0] || null;
        if (!file) {
            setPreviewFile(null);
            return;
        }

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setError(form, 'imagen_file', 'Solo se permiten imágenes PNG, JPG o WEBP.');
            fileInput.value = '';
            setPreviewFile(null);
            return;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            setError(form, 'imagen_file', 'La imagen no puede superar 10MB.');
            fileInput.value = '';
            setPreviewFile(null);
            return;
        }

        clearErrors(form);
        setPreviewFile(file);
    });

    durationSelect?.addEventListener('change', updateRangeFromDuration);
    dateStart?.addEventListener('change', updateRangeFromDuration);
    dateEnd?.addEventListener('change', () => {
        if (!durationSelect) return;
        const durationValue = String(durationSelect.value || '').trim();
        const rule = resolveDurationRule(durationValue);
        if (rule) {
            updateRangeFromDuration();
            return;
        }

        if (!state.isEditing && dateStart?.value) {
            dateEnd.min = dateStart.value;
        }
    });

    updateRangeFromDuration();
    renderUploadZone();

    form.onsubmit = async (event) => {
        event.preventDefault();
        clearErrors(form);

        const values = buildPayload(form);
        values.isEditing = state.isEditing;
        values.imagen_file = form.imagen_file?.files?.[0] || null;
        const errors = validateForm(values);
        if (Object.keys(errors).length > 0) {
            Object.entries(errors).forEach(([field, message]) => setError(form, field, message));
            return;
        }

        submitBtn.disabled = true;
        const originalHtml = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split"></i><span>Guardando...</span>';

        try {
            const body = buildApiBody(values, state.isEditing);
            let response;
            if (state.isEditing) {
                response = await api.upload(`/admin/retos/${encodeURIComponent(reto.id)}`, body, 'PUT');
                mostrarToast('Reto actualizado correctamente.', 'success');
            } else {
                response = await api.upload('/admin/retos', body, 'POST');
                mostrarToast('Reto creado y publicado correctamente.', 'success');
            }

            const createdReto = response?.reto || response;
            window.dispatchEvent(new CustomEvent('reto-creado-o-editado', { detail: { reto: createdReto, isEditing: state.isEditing } }));

            window.bootstrap?.Modal.getInstance(modal)?.hide();
            if (typeof onSaved === 'function') await onSaved(createdReto);
        } catch (error) {
            setError(form, 'form', error?.error || 'No se pudo guardar el reto.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHtml;
        }
    };

    modal.addEventListener(
        'hidden.bs.modal',
        () => {
            form.onsubmit = null;
            if (state.previewUrl) {
                URL.revokeObjectURL(state.previewUrl);
            }
        },
        { once: true },
    );

    window.bootstrap?.Modal ? new window.bootstrap.Modal(modal).show() : modal.classList.add('show');
}

export { abrirModalCrearReto };
export default { abrirModalCrearReto };
