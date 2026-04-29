function toSafeInt(value, fallback = 1) {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

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

function renderPaginacion(contenedor, paginaActual, totalPaginas, onCambio) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	const safeTotal = Math.max(1, toSafeInt(totalPaginas, 1));
	const safeActual = clamp(toSafeInt(paginaActual, 1), 1, safeTotal);
	const callback = typeof onCambio === 'function' ? onCambio : () => {};

	const canGoPrev = safeActual > 1;
	const canGoNext = safeActual < safeTotal;
	const pageItems = buildPageItems(safeActual, safeTotal);

	contenedor.innerHTML = `
		<div class="pg-wrap">
			<nav class="pg-desktop" aria-label="Navegación de páginas">
				<button class="pg-btn pg-btn--nav" type="button" data-page-action="prev" ${canGoPrev ? '' : 'disabled'}>Anterior</button>
				${pageItems
					.map((item) => {
						if (typeof item !== 'number') {
							return '<span class="pg-ellipsis">...</span>';
						}
						return `<button class="pg-btn ${item === safeActual ? 'pg-btn--active' : ''}" type="button" data-page="${item}">${item}</button>`;
					})
					.join('')}
				<button class="pg-btn pg-btn--nav" type="button" data-page-action="next" ${canGoNext ? '' : 'disabled'}>Siguiente</button>
			</nav>

			<div class="pg-mobile" aria-label="Navegación de páginas móvil">
				<button type="button" class="pg-btn pg-btn--icon" data-page-action="prev" ${canGoPrev ? '' : 'disabled'} aria-label="Página anterior">
					<i class="bi bi-chevron-left"></i>
				</button>
				<span class="pg-mobile-status">Página ${safeActual} de ${safeTotal}</span>
				<button type="button" class="pg-btn pg-btn--icon" data-page-action="next" ${canGoNext ? '' : 'disabled'} aria-label="Página siguiente">
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
