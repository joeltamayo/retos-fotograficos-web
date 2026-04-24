const STYLE_ID = 'pc-pagination-styles';

/**
 * Convierte a número seguro para evitar estados inválidos de paginación.
 */
function toSafeInt(value, fallback = 1) {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Limita un número dentro de un rango definido.
 */
function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

/**
 * Inyecta estilos mínimos para distinguir escritorio y móvil.
 */
function ensureStyles() {
	if (document.getElementById(STYLE_ID)) {
		return;
	}

	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = `
		.pc-pagination-wrap {
			display: flex;
			justify-content: center;
			align-items: center;
			width: 100%;
		}

		.pc-pagination-desktop {
			display: flex;
		}

		.pc-pagination-mobile {
			display: none;
			align-items: center;
			gap: 10px;
			font-size: 14px;
			font-weight: 500;
			color: #6B7280;
		}

		.pc-pagination-mobile .btn {
			border-color: #E5E7EB;
			color: #111827;
			background: #FFFFFF;
			min-width: 36px;
			height: 36px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
		}

		.pc-pagination-mobile .btn:disabled {
			opacity: 0.55;
		}

		.pc-pagination-mobile-status {
			white-space: nowrap;
		}

		@media (max-width: 767.98px) {
			.pc-pagination-desktop {
				display: none;
			}

			.pc-pagination-mobile {
				display: inline-flex;
			}
		}
	`;

	document.head.appendChild(style);
}

/**
 * Genera los items numéricos para escritorio.
 * Si hay muchas páginas, usa la forma: 1 ... centrales ... última.
 */
function buildPageItems(paginaActual, totalPaginas) {
	if (totalPaginas <= 7) {
		return Array.from({ length: totalPaginas }, (_, index) => index + 1);
	}

	const items = [1];
	const start = Math.max(2, paginaActual - 1);
	const end = Math.min(totalPaginas - 1, paginaActual + 1);

	if (start > 2) {
		items.push('ellipsis-left');
	}

	for (let page = start; page <= end; page += 1) {
		items.push(page);
	}

	if (end < totalPaginas - 1) {
		items.push('ellipsis-right');
	}

	items.push(totalPaginas);
	return items;
}

/**
 * Renderiza el componente de paginación y conecta callbacks de cambio.
 */
function renderPaginacion(contenedor, paginaActual, totalPaginas, onCambio) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	const safeTotal = Math.max(1, toSafeInt(totalPaginas, 1));
	const safeActual = clamp(toSafeInt(paginaActual, 1), 1, safeTotal);
	const callback = typeof onCambio === 'function' ? onCambio : () => {};

	ensureStyles();

	const canGoPrev = safeActual > 1;
	const canGoNext = safeActual < safeTotal;
	const pageItems = buildPageItems(safeActual, safeTotal);

	contenedor.innerHTML = `
		<div class="pc-pagination-wrap">
			<nav class="pc-pagination-desktop" aria-label="Navegación de páginas">
				<ul class="pagination m-0">
					<li class="page-item ${canGoPrev ? '' : 'disabled'}">
						<button class="page-link" type="button" data-page-action="prev" aria-label="Página anterior">Anterior</button>
					</li>

					${pageItems
						.map((item) => {
							if (typeof item !== 'number') {
								return '<li class="page-item disabled" aria-hidden="true"><span class="page-link">...</span></li>';
							}

							const activeClass = item === safeActual ? 'active' : '';
							return `
								<li class="page-item ${activeClass}">
									<button class="page-link" type="button" data-page="${item}" aria-label="Ir a página ${item}">${item}</button>
								</li>
							`;
						})
						.join('')}

					<li class="page-item ${canGoNext ? '' : 'disabled'}">
						<button class="page-link" type="button" data-page-action="next" aria-label="Página siguiente">Siguiente</button>
					</li>
				</ul>
			</nav>

			<div class="pc-pagination-mobile" aria-label="Navegación de páginas móvil">
				<button
					type="button"
					class="btn btn-sm"
					data-page-action="prev"
					${canGoPrev ? '' : 'disabled'}
					aria-label="Página anterior"
				>
					<i class="bi bi-chevron-left"></i>
				</button>

				<span class="pc-pagination-mobile-status">Página ${safeActual} de ${safeTotal}</span>

				<button
					type="button"
					class="btn btn-sm"
					data-page-action="next"
					${canGoNext ? '' : 'disabled'}
					aria-label="Página siguiente"
				>
					<i class="bi bi-chevron-right"></i>
				</button>
			</div>
		</div>
	`;

	contenedor.querySelectorAll('[data-page]').forEach((button) => {
		button.addEventListener('click', () => {
			const targetPage = toSafeInt(button.getAttribute('data-page'), safeActual);
			if (targetPage !== safeActual) {
				callback(targetPage);
			}
		});
	});

	contenedor.querySelectorAll('[data-page-action="prev"]').forEach((button) => {
		button.addEventListener('click', () => {
			if (canGoPrev) {
				callback(safeActual - 1);
			}
		});
	});

	contenedor.querySelectorAll('[data-page-action="next"]').forEach((button) => {
		button.addEventListener('click', () => {
			if (canGoNext) {
				callback(safeActual + 1);
			}
		});
	});
}

export { renderPaginacion };

export default {
	renderPaginacion,
};
