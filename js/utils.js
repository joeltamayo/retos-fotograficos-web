/**
 * Formateadores reutilizables en espanol.
 * Se instancian una sola vez para evitar costo repetido en cada llamada.
 */
const formatoFechaLarga = new Intl.DateTimeFormat('es-MX', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
});

const formatoFechaCortaPartes = new Intl.DateTimeFormat('es-MX', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
});

const formatoHora = new Intl.DateTimeFormat('es-MX', {
	hour: '2-digit',
	minute: '2-digit',
	hour12: false,
});

const formatoRelativo = new Intl.RelativeTimeFormat('es-MX', {
	numeric: 'always',
});

/**
 * Configuracion visual para toast por tipo.
 * Los colores usan los tokens definidos en css/style.css.
 */
const TOAST_VARIANTES = {
	success: {
		icono: 'bi-check-circle-fill',
		color: 'var(--color-success)',
		fondo: 'var(--color-success-bg)',
	},
	danger: {
		icono: 'bi-x-circle-fill',
		color: 'var(--color-danger)',
		fondo: 'var(--color-danger-bg)',
	},
	warning: {
		icono: 'bi-exclamation-triangle-fill',
		color: 'var(--color-warning)',
		fondo: 'var(--color-warning-bg)',
	},
	info: {
		icono: 'bi-info-circle-fill',
		color: 'var(--color-info)',
		fondo: 'var(--color-info-bg)',
	},
};

/**
 * Textos e iconos para estados de error en pagina.
 */
const ERRORES_PAGINA = {
	'404': {
		icono: 'bi-search',
		titulo: 'No encontrado',
		mensaje: 'No encontramos el recurso que estas buscando.',
	},
	'acceso-denegado': {
		icono: 'bi-shield-lock',
		titulo: 'Acceso denegado',
		mensaje: 'No tienes permisos para acceder a esta seccion.',
	},
	'sin-conexion': {
		icono: 'bi-wifi-off',
		titulo: 'Sin conexion',
		mensaje: 'Revisa tu conexion a internet e intenta de nuevo.',
	},
	error: {
		icono: 'bi-exclamation-octagon',
		titulo: 'Ocurrio un error',
		mensaje: 'No pudimos cargar esta seccion en este momento.',
	},
};

const MILISEGUNDOS_DIA = 1000 * 60 * 60 * 24;

/**
 * Convierte una entrada ISO en Date valida o null.
 */
function parsearFecha(iso) {
	const fecha = new Date(iso);
	return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/**
 * Escapa texto para inyeccion segura dentro de innerHTML.
 */
function escaparHtml(valor) {
	return String(valor ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

/**
 * Resuelve un contenedor desde selector o nodo HTMLElement.
 */
function resolverContenedor(contenedor) {
	if (typeof contenedor === 'string') {
		return document.querySelector(contenedor);
	}

	if (contenedor instanceof HTMLElement) {
		return contenedor;
	}

	return null;
}

/**
 * Formato largo: "15 de enero de 2024".
 */
function formatearFecha(iso) {
	const fecha = parsearFecha(iso);
	return fecha ? formatoFechaLarga.format(fecha) : '';
}

/**
 * Formato corto: "15 ene 2025".
 */
function formatearFechaCorta(iso) {
	const fecha = parsearFecha(iso);

	if (!fecha) {
		return '';
	}

	const partes = formatoFechaCortaPartes.formatToParts(fecha);
	const dia = partes.find((parte) => parte.type === 'day')?.value ?? '';
	const mes = (partes.find((parte) => parte.type === 'month')?.value ?? '').replace('.', '');
	const anio = partes.find((parte) => parte.type === 'year')?.value ?? '';

	return `${dia} ${mes} ${anio}`.trim();
}

/**
 * Formato fecha y hora: "15 ene 2025, 14:30".
 */
function formatearFechaHora(iso) {
	const fecha = parsearFecha(iso);

	if (!fecha) {
		return '';
	}

	return `${formatearFechaCorta(fecha.toISOString())}, ${formatoHora.format(fecha)}`;
}

/**
 * Devuelve distancia relativa al momento actual.
 * Ejemplos: "hace 2 horas", "hace 3 dias".
 */
function tiempoRelativo(iso) {
	const fecha = parsearFecha(iso);

	if (!fecha) {
		return '';
	}

	const diferenciaMs = fecha.getTime() - Date.now();
	const diferenciaSegundos = diferenciaMs / 1000;
	const absSegundos = Math.abs(diferenciaSegundos);

	if (absSegundos < 60) {
		return formatoRelativo.format(Math.round(diferenciaSegundos), 'second');
	}

	const diferenciaMinutos = diferenciaSegundos / 60;
	const absMinutos = Math.abs(diferenciaMinutos);

	if (absMinutos < 60) {
		return formatoRelativo.format(Math.round(diferenciaMinutos), 'minute');
	}

	const diferenciaHoras = diferenciaMinutos / 60;
	const absHoras = Math.abs(diferenciaHoras);

	if (absHoras < 24) {
		return formatoRelativo.format(Math.round(diferenciaHoras), 'hour');
	}

	const diferenciaDias = diferenciaHoras / 24;
	const absDias = Math.abs(diferenciaDias);

	if (absDias < 30) {
		return formatoRelativo.format(Math.round(diferenciaDias), 'day');
	}

	const diferenciaMeses = diferenciaDias / 30;
	const absMeses = Math.abs(diferenciaMeses);

	if (absMeses < 12) {
		return formatoRelativo.format(Math.round(diferenciaMeses), 'month');
	}

	const diferenciaAnios = diferenciaDias / 365;
	return formatoRelativo.format(Math.round(diferenciaAnios), 'year');
}

/**
 * Devuelve dias restantes hasta la fecha de cierre.
 * Si ya paso la fecha, regresa un numero negativo.
 */
function diasRestantes(fechaFin) {
	const fecha = parsearFecha(fechaFin);

	if (!fecha) {
		return 0;
	}

	const diferencia = (fecha.getTime() - Date.now()) / MILISEGUNDOS_DIA;
	return diferencia >= 0 ? Math.ceil(diferencia) : Math.floor(diferencia);
}

/**
 * Recorta texto largo y agrega ellipsis al final.
 */
function truncarTexto(texto, max = 100) {
	const valor = String(texto ?? '');

	if (valor.length <= max) {
		return valor;
	}

	return `${valor.slice(0, max).trimEnd()}...`;
}

/**
 * Muestra una notificacion toast de Bootstrap en #toast-container.
 * Se destruye automaticamente despues de 4 segundos.
 */
function mostrarToast(mensaje, tipo = 'success') {
	const variante = TOAST_VARIANTES[tipo] ?? TOAST_VARIANTES.success;
	const texto = escaparHtml(mensaje || 'Operacion realizada correctamente.');

	let contenedor = document.getElementById('toast-container');
	if (!contenedor) {
		contenedor = document.createElement('div');
		contenedor.id = 'toast-container';
		contenedor.className = 'position-fixed bottom-0 end-0 p-3';
		contenedor.style.zIndex = '1100';
		document.body.appendChild(contenedor);
	}

	const toast = document.createElement('div');
	toast.className = 'toast border-0 shadow-sm';
	toast.setAttribute('role', 'alert');
	toast.setAttribute('aria-live', 'assertive');
	toast.setAttribute('aria-atomic', 'true');
	toast.style.backgroundColor = variante.fondo;
	toast.style.borderLeft = `4px solid ${variante.color}`;
	toast.dataset.bsAutohide = 'true';
	toast.dataset.bsDelay = '4000';

	toast.innerHTML = `
		<div class="toast-body d-flex align-items-center gap-2" style="color:var(--color-text)">
			<i class="bi ${variante.icono}" style="color:${variante.color}"></i>
			<span>${texto}</span>
		</div>
	`;

	contenedor.appendChild(toast);

	toast.addEventListener(
		'hidden.bs.toast',
		() => {
			toast.remove();
		},
		{ once: true },
	);

	if (window.bootstrap?.Toast) {
		const instancia = new window.bootstrap.Toast(toast, {
			autohide: true,
			delay: 4000,
		});
		instancia.show();
		return;
	}

	toast.classList.add('show');
	setTimeout(() => {
		toast.remove();
	}, 4000);
}

/**
 * Inyecta un loader visual en el contenedor indicado.
 */
function mostrarLoader(contenedor) {
	const nodo = resolverContenedor(contenedor);

	if (!nodo) {
		return;
	}

	nodo.innerHTML = `
		<div class="d-flex justify-content-center p-5" data-loader="true">
			<div class="spinner-border" style="color:var(--color-primary)"></div>
		</div>
	`;
}

/**
 * Elimina el loader previamente inyectado en el contenedor.
 */
function ocultarLoader(contenedor) {
	const nodo = resolverContenedor(contenedor);

	if (!nodo) {
		return;
	}

	const loader = nodo.querySelector('[data-loader="true"]');
	if (loader) {
		loader.remove();
	}
}

/**
 * Construye un query string desde un objeto de parametros.
 * Omite null, undefined y cadenas vacias.
 */
function construirQueryString(params = {}) {
	const searchParams = new URLSearchParams();

	Object.entries(params).forEach(([clave, valor]) => {
		if (valor === null || valor === undefined || valor === '') {
			return;
		}

		searchParams.append(clave, String(valor));
	});

	const query = searchParams.toString();
	return query ? `?${query}` : '';
}

/**
 * Devuelve el HTML de una tarjeta skeleton configurable por alto.
 */
function skeletonCard(alto = '200px') {
	const valorAlto = escaparHtml(alto);
	return `<div class="skeleton" style="height:${valorAlto}"></div>`;
}

/**
 * Renderiza estrellas llenas/vacias segun promedio.
 * Ejemplo: 4.3 con max=5 => 4 llenas + 1 vacia.
 */
function renderEstrellas(promedio, max = 5) {
	const total = Number.isFinite(Number(promedio)) ? Number(promedio) : 0;
	const maximo = Number.isFinite(Number(max)) ? Number(max) : 5;
	const estrellasLlenas = Math.max(0, Math.min(maximo, Math.floor(total)));
	const estrellasVacias = Math.max(0, maximo - estrellasLlenas);

	const llenas = Array.from({ length: estrellasLlenas }, () => '<i class="bi bi-star-fill"></i>').join('');
	const vacias = Array.from({ length: estrellasVacias }, () => '<i class="bi bi-star"></i>').join('');

	return `<span class="d-inline-flex align-items-center gap-1" style="color:var(--color-warning)">${llenas}${vacias}</span>`;
}

/**
 * Renderiza una pantalla de error centrada con icono y boton volver.
 */
function mostrarErrorPagina(contenedor, tipo, mensaje) {
	const nodo = resolverContenedor(contenedor);

	if (!nodo) {
		return;
	}

	const config = ERRORES_PAGINA[tipo] ?? ERRORES_PAGINA.error;
	const titulo = escaparHtml(config.titulo);
	const texto = escaparHtml(mensaje || config.mensaje);

	nodo.innerHTML = `
		<div class="text-center py-5 page-enter">
			<i class="bi ${config.icono} d-block mb-3" style="font-size:4rem;color:var(--color-text-muted)"></i>
			<h3 class="mb-2">${titulo}</h3>
			<p class="text-muted mb-4">${texto}</p>
			<button type="button" class="btn btn-outline-dark" onclick="history.back()">&larr; Volver</button>
		</div>
	`;
}

/**
 * Detecta errores de red cuando fetch falla antes de tener status HTTP.
 */
function esErrorDeRed(error) {
	if (!error || error?.status) {
		return false;
	}

	if (error instanceof TypeError) {
		return true;
	}

	const texto = String(error?.message || error?.error || '').toLowerCase();
	return texto.includes('failed to fetch') || texto.includes('network');
}

/**
 * Aplica un manejo consistente de errores API para vistas de pagina.
 */
function manejarErrorDePagina(contenedor, error, opciones = {}) {
	const status = Number(error?.status);
	const {
		notFoundMessage = 'No encontrado',
		forbiddenMessage = 'No tienes permisos para acceder a esta seccion.',
		networkMessage = 'No fue posible conectar con el servidor. Revisa tu conexion e intenta de nuevo.',
		fallbackMessage = 'Ocurrio un error en el servidor.',
		redirectOn401 = true,
	} = opciones;

	if (status === 404) {
		mostrarErrorPagina(contenedor, '404', notFoundMessage);
		return;
	}

	if (status === 401) {
		if (redirectOn401) {
			window.location.hash = '#/login';
			return;
		}

		mostrarErrorPagina(contenedor, 'acceso-denegado', forbiddenMessage);
		return;
	}

	if (status === 403) {
		mostrarErrorPagina(contenedor, 'acceso-denegado', forbiddenMessage);
		return;
	}

	if (esErrorDeRed(error)) {
		mostrarErrorPagina(contenedor, 'sin-conexion', networkMessage);
		return;
	}

	mostrarToast(error?.error || error?.message || fallbackMessage, 'danger');
}

export {
	formatearFecha,
	formatearFechaCorta,
	formatearFechaHora,
	tiempoRelativo,
	diasRestantes,
	truncarTexto,
	mostrarToast,
	mostrarLoader,
	ocultarLoader,
	construirQueryString,
	skeletonCard,
	renderEstrellas,
	mostrarErrorPagina,
	manejarErrorDePagina,
};

export default {
	formatearFecha,
	formatearFechaCorta,
	formatearFechaHora,
	tiempoRelativo,
	diasRestantes,
	truncarTexto,
	mostrarToast,
	mostrarLoader,
	ocultarLoader,
	construirQueryString,
	skeletonCard,
	renderEstrellas,
	mostrarErrorPagina,
	manejarErrorDePagina,
};
