/**
 * Configuracion visual de badges por estado de reto.
 */
const ESTADO_STYLES = {
	activo: {
		fondo: '#DCFCE7',
		color: '#16A34A',
		texto: 'Activo',
	},
	finalizado: {
		fondo: '#F3F4F6',
		color: '#6B7280',
		texto: 'Finalizado',
	},
	programado: {
		fondo: '#DBEAFE',
		color: '#1D4ED8',
		texto: 'Programado',
	},
};

/**
 * Escapa texto para inyeccion segura en HTML.
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
 * Convierte valor a numero seguro para metadatos.
 */
function toSafeNumber(value) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Formatea fecha corta en es-MX para mostrar rango del reto.
 * Ejemplo: 27 oct.
 */
function formatearFechaDiaMes(iso) {
	if (!iso) {
		return '';
	}

	const fecha = new Date(iso);
	if (Number.isNaN(fecha.getTime())) {
		return '';
	}

	const parts = new Intl.DateTimeFormat('es-MX', {
		day: 'numeric',
		month: 'short',
	}).formatToParts(fecha);

	const dia = parts.find((part) => part.type === 'day')?.value ?? '';
	const mes = (parts.find((part) => part.type === 'month')?.value ?? '').replace('.', '');
	return `${dia} ${mes}`.trim();
}

/**
 * Construye el texto de fecha de inicio y fin para la card.
 */
function construirRangoFechas(reto) {
	const inicio = formatearFechaDiaMes(reto?.fecha_inicio);
	const fin = formatearFechaDiaMes(reto?.fecha_fin);

	if (inicio && fin) {
		return `${inicio} - ${fin}`;
	}

	return inicio || fin || 'Sin fecha';
}

/**
 * Devuelve el estilo de badge segun estado del reto.
 */
function getEstadoStyle(estadoRaw) {
	const key = String(estadoRaw ?? '').trim().toLowerCase();
	return ESTADO_STYLES[key] ?? ESTADO_STYLES.programado;
}

/**
 * Genera bloque superior de imagen o placeholder si no hay URL.
 */
function renderMedia(reto) {
	const imagenUrl = reto?.imagen_url ? escapeHtml(reto.imagen_url) : '';

	if (imagenUrl) {
		return `
			<img
				src="${imagenUrl}"
				alt="${escapeHtml(reto?.titulo || 'Reto fotografico')}"
				style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:14px 14px 0 0"
			>
		`;
	}

	return `
		<div
			class="d-flex align-items-center justify-content-center"
			style="width:100%;aspect-ratio:16/9;background:#F3F4F6;border-radius:14px 14px 0 0"
			aria-label="Sin imagen"
		>
			<i class="bi bi-image" style="font-size:2rem;color:#9CA3AF"></i>
		</div>
	`;
}

/**
 * Retorna el HTML de una card de reto con estilos del prototipo.
 */
function cardReto(reto = {}) {
	const estadoStyle = getEstadoStyle(reto.estado);
	const titulo = escapeHtml(reto.titulo || 'Reto sin titulo');
	const descripcion = escapeHtml(reto.descripcion || 'Sin descripcion disponible.');
	const rangoFechas = escapeHtml(construirRangoFechas(reto));
	const participantes = toSafeNumber(reto.total_participantes);
	const fotos = toSafeNumber(reto.total_fotografias);
	const id = escapeHtml(reto.id || '');

	return `
		<article
			class="card-reto card-interactive"
			data-reto-id="${id}"
			role="button"
			tabindex="0"
			style="
				position:relative;
				background:#FFFFFF;
				border:none;
				border-radius:14px;
				box-shadow:0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.05);
				overflow:hidden;
				cursor:pointer;
				transition:transform .2s ease, box-shadow .2s ease;
			"
			onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 4px 16px rgba(0,0,0,0.12)'"
			onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.05)'"
		>
			<div style="position:relative">
				${renderMedia(reto)}
				<span
					style="
						position:absolute;
						top:10px;
						right:10px;
						padding:4px 10px;
						border-radius:9999px;
						font-size:12px;
						font-weight:500;
						background:${estadoStyle.fondo};
						color:${estadoStyle.color};
					"
				>
					${escapeHtml(estadoStyle.texto)}
				</span>
			</div>

			<div style="padding:16px">
				<h3 style="margin:0 0 6px;font-size:16px;font-weight:600;color:#111827">${titulo}</h3>
				<p
					style="
						margin:0 0 14px;
						color:#6B7280;
						font-size:14px;
						line-height:1.45;
						overflow:hidden;
						display:-webkit-box;
						-webkit-line-clamp:2;
						-webkit-box-orient:vertical;
					"
				>
					${descripcion}
				</p>

				<div class="d-flex flex-wrap align-items-center gap-3" style="font-size:13px;color:#9CA3AF">
					<span class="d-inline-flex align-items-center gap-1">
						<i class="bi bi-calendar3"></i>
						${rangoFechas}
					</span>
					<span class="d-inline-flex align-items-center gap-1">
						<i class="bi bi-people"></i>
						${participantes}
					</span>
					<span class="d-inline-flex align-items-center gap-1">
						<i class="bi bi-image"></i>
						${fotos}
					</span>
				</div>
			</div>
		</article>
	`;
}

/**
 * Resuelve contenedor desde selector o elemento DOM.
 */
function resolveContainer(contenedor) {
	if (typeof contenedor === 'string') {
		return document.querySelector(contenedor);
	}

	if (contenedor instanceof HTMLElement) {
		return contenedor;
	}

	return null;
}

/**
 * Renderiza una lista de retos dentro del contenedor indicado.
 * Si no hay datos, muestra un estado vacio centrado.
 */
function gridRetos(retos = [], contenedor) {
	const container = resolveContainer(contenedor);
	if (!container) {
		return;
	}

	if (!Array.isArray(retos) || retos.length === 0) {
		container.innerHTML = `
			<div class="d-flex justify-content-center align-items-center text-center p-5" style="min-height:220px;color:#6B7280">
				<p class="m-0 fw-medium">No hay retos disponibles</p>
			</div>
		`;
		return;
	}

	container.innerHTML = `
		<div class="row g-4">
			${retos
				.map((reto) => `<div class="col-12 col-md-6 col-xl-4">${cardReto(reto)}</div>`)
				.join('')}
		</div>
	`;

	container.querySelectorAll('[data-reto-id]').forEach((card) => {
		const retoId = card.getAttribute('data-reto-id');

		card.addEventListener('click', () => {
			if (retoId) {
				window.location.hash = `#/retos/${retoId}`;
			}
		});

		card.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter' && event.key !== ' ') {
				return;
			}

			event.preventDefault();

			if (retoId) {
				window.location.hash = `#/retos/${retoId}`;
			}
		});
	});
}

export { cardReto, gridRetos };

export default {
	cardReto,
	gridRetos,
};

