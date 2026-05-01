import api from '../api.js';
import { mostrarToast } from '../utils.js';

/**
 * Convierte un valor a número finito con fallback.
 */
function toNumber(value, fallback = 0) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Limita un valor a un rango dado.
 */
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

/**
 * Deriva el valor de 1..5 a partir de la calificación previa del backend.
 */
function getStarValueFromExistingRating(calificacion) {
	if (!calificacion || typeof calificacion !== 'object') {
		return 0;
	}

	if (Number.isFinite(Number(calificacion.total))) {
		return clamp(Math.round(toNumber(calificacion.total) / 3), 1, 5);
	}

	const creatividad = toNumber(calificacion.creatividad, 0);
	const composicion = toNumber(calificacion.composicion, 0);
	const tema = toNumber(calificacion.tema, 0);
	const promedio = (creatividad + composicion + tema) / 3;

	return clamp(Math.round(promedio), 1, 5);
}

/**
 * Renderiza 5 estrellas según valor seleccionado/hover.
 */
function paintStars(contenedor, selectedValue, hoverValue = 0) {
	const activeValue = hoverValue > 0 ? hoverValue : selectedValue;
	const stars = contenedor.querySelectorAll('[data-star-value]');

	stars.forEach((starButton) => {
		const value = toNumber(starButton.getAttribute('data-star-value'));
		starButton.classList.toggle('is-active', value <= activeValue);
	});
}

/**
 * Actualiza el desglose (creatividad/composición/tema) en el modal sin recargarlo completo.
 */
function patchBreakdownUI(contenedor, detalleFotografia) {
	const section = contenedor.closest('#pc-rating-section') || contenedor.parentElement;
	if (!section) {
		return;
	}

	const breakdown = section.querySelector('#pc-breakdown');
	if (breakdown) {
		const creatividadNode = breakdown.querySelector('.creatividad span:last-child');
		const composicionNode = breakdown.querySelector('.composicion span:last-child');
		const temaNode = breakdown.querySelector('.tema span:last-child');

		if (creatividadNode) {
			creatividadNode.textContent = toNumber(detalleFotografia?.prom_creatividad).toFixed(1);
		}

		if (composicionNode) {
			composicionNode.textContent = toNumber(detalleFotografia?.prom_composicion).toFixed(1);
		}

		if (temaNode) {
			temaNode.textContent = toNumber(detalleFotografia?.prom_tema).toFixed(1);
		}
	}

	const scoreContainer = section.querySelector('.pc-rating-score');
	if (scoreContainer) {
		const spans = scoreContainer.querySelectorAll('span');
		if (spans[0]) {
			const puntuacionTotal = detalleFotografia?.puntuacion_total ?? detalleFotografia?.puntuacion_promedio ?? 0;
			spans[0].textContent = toNumber(puntuacionTotal).toFixed(2);
		}

		if (spans[1]) {
			const totalCalificaciones = toNumber(detalleFotografia?.total_calificaciones, 0);
			spans[1].textContent = `(${totalCalificaciones} calificaciones)`;
		}
	}
}

/**
 * Crea el HTML base de la fila de estrellas.
 */
function getStarsMarkup() {
	return `
		<div class="es-stars-row" data-stars-row>
			${Array.from({ length: 5 }, (_, index) => {
				const value = index + 1;
				return `
					<button
						type="button"
						class="es-star-btn"
						data-star-value="${value}"
						aria-label="Calificar con ${value} estrella(s)"
					>
						<i class="bi bi-star-fill"></i>
					</button>
				`;
			}).join('')}
		</div>
	`;
}

/**
 * Renderiza y conecta el componente de calificación de 5 estrellas.
 * El valor seleccionado se mapea de forma equitativa a creatividad/composición/tema.
 */
async function renderComponenteCalificar(contenedor, fotografiaId) {
	if (!(contenedor instanceof HTMLElement) || !fotografiaId) {
		return null;
	}

	contenedor.innerHTML = getStarsMarkup();

	const state = {
		selectedValue: 0,
		hoverValue: 0,
		isSubmitting: false,
	};

	const starsRow = contenedor.querySelector('[data-stars-row]');
	const evaluarButton = (contenedor.closest('#pc-rating-section') || contenedor.parentElement)?.querySelector('[data-accion="evaluar"]');

	const setButtonsDisabled = (disabled) => {
		contenedor.querySelectorAll('[data-star-value]').forEach((starButton) => {
			starButton.disabled = disabled;
		});
	};

	const setEvaluarButtonState = (loading) => {
		if (!evaluarButton) {
			return;
		}

		evaluarButton.disabled = loading;
		evaluarButton.innerHTML = loading
			? '<span class="app-spinner app-spinner--sm" aria-hidden="true"></span>'
			: 'Evaluar';
	};

	// Carga la calificación previa para reflejar edición directa de estrellas.
	try {
		const response = await api.get(`/fotografias/${encodeURIComponent(fotografiaId)}/calificaciones/mia`);
		state.selectedValue = getStarValueFromExistingRating(response?.calificacion);
		paintStars(contenedor, state.selectedValue, 0);
	} catch {
		// Si no hay sesión o el endpoint falla, dejamos el componente listo para interacción local.
	}

	starsRow?.querySelectorAll('[data-star-value]').forEach((starButton) => {
		starButton.addEventListener('mouseenter', () => {
			state.hoverValue = toNumber(starButton.getAttribute('data-star-value'));
			paintStars(contenedor, state.selectedValue, state.hoverValue);
		});

		starButton.addEventListener('click', () => {
			state.selectedValue = toNumber(starButton.getAttribute('data-star-value'));
			paintStars(contenedor, state.selectedValue, 0);
		});
	});

	starsRow?.addEventListener('mouseleave', () => {
		state.hoverValue = 0;
		paintStars(contenedor, state.selectedValue, 0);
	});

	if (evaluarButton) {
		evaluarButton.addEventListener('click', async () => {
			if (state.isSubmitting) {
				return;
			}

			if (state.selectedValue < 1) {
				mostrarToast('Selecciona una puntuación antes de evaluar.', 'warning');
				return;
			}

			state.isSubmitting = true;
			setButtonsDisabled(true);
			setEvaluarButtonState(true);

			const payload = {
				creatividad: state.selectedValue,
				composicion: state.selectedValue,
				tema: state.selectedValue,
			};

			try {
				await api.post(`/fotografias/${encodeURIComponent(fotografiaId)}/calificaciones`, payload);

				// Refresca solo el bloque de puntuaciones para mantener el modal abierto.
				const detalle = await api.get(`/fotografias/${encodeURIComponent(fotografiaId)}`);
				patchBreakdownUI(contenedor, detalle);			
			// Dispara evento global para que el ranking se refresque si está abierto.
			window.dispatchEvent(new CustomEvent('calificacion-creada', { detail: { fotografiaId } }));
							mostrarToast('¡Calificación guardada!', 'success');
			} catch (error) {
				mostrarToast(error?.error || 'No se pudo guardar la calificación.', 'danger');
			} finally {
				state.isSubmitting = false;
				setButtonsDisabled(false);
				setEvaluarButtonState(false);
			}
		});
	}

	return {
		getValue() {
			return state.selectedValue;
		},
	};
}

export { renderComponenteCalificar };

export default {
	renderComponenteCalificar,
};