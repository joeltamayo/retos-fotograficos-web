import api from '../api.js';
import { mostrarToast } from '../utils.js';

const MODAL_ID = 'modal-crear-reto';

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('\"', '&quot;')
        .replaceAll("'", '&#39;');
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
        imagen_url: String(form.imagen_url?.value || '').trim(),
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
    if (values.imagen_url) formData.append('imagen_url', values.imagen_url);
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
    form.imagen_url.value = reto?.imagen_url || '';
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
                    <label class="mcr-label" for="mcr-imagen">Imagen de Portada (URL o archivo)</label>
                    <input id="mcr-imagen" name="imagen_url" class="mcr-input" type="url" placeholder="https://ejemplo.com/imagen.jpg">
                    <div class="mcr-mt-1">
                        <input id="mcr-imagen-file" name="imagen_file" class="mcr-input" type="file" accept="image/jpeg,image/png,image/webp">
                    </div>
                    <p class="mcr-error" data-error="imagen_url"></p>
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

    form.onsubmit = async (event) => {
        event.preventDefault();
        clearErrors(form);

        const values = buildPayload(form);
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

    modal.addEventListener('hidden.bs.modal', () => { form.onsubmit = null; }, { once: true });

    window.bootstrap?.Modal ? new window.bootstrap.Modal(modal).show() : modal.classList.add('show');
}

export { abrirModalCrearReto };
export default { abrirModalCrearReto };
