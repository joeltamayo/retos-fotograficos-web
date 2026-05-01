import api from '../api.js';
import { abrirModalFoto } from '../components/modalFoto.js';
import { manejarErrorDePagina, skeletonCard, cloudinaryUrl } from '../utils.js';

const PERIODOS = {
	semanal: 'Semanal',
	diario: 'Diario',
	mensual: 'Mensual',
	anual: 'Anual',
	historico: 'Historico',
};

const BADGES_PODIO = {
	oro: {
		label: '🏅 Oro',
		className: 'rk-podium-badge--oro',
		scoreClass: 'rk-score--oro',
		placeLabel: '1er Lugar',
		placeIcon: 'bi-trophy',
	},
	plata: {
		label: '🥈 Plata',
		className: 'rk-podium-badge--plata',
		scoreClass: 'rk-score--plata',
		placeLabel: '2do Lugar',
		placeIcon: 'bi-gem',
	},
	bronce: {
		label: '🥉 Bronce',
		className: 'rk-podium-badge--bronce',
		scoreClass: 'rk-score--bronce',
		placeLabel: '3er Lugar',
		placeIcon: 'bi-award',
	},
};

/**
 * Escapa contenido para render HTML seguro.
 */
function escapeHtml(value) {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function formatDateLong(date) {
	return new Intl.DateTimeFormat('es-MX', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	}).format(date);
}

function getStartOfWeek(date) {
	const start = new Date(date);
	const day = start.getDay();
	const diff = (day + 6) % 7;
	start.setDate(start.getDate() - diff);
	start.setHours(0, 0, 0, 0);
	return start;
}

function getEndOfWeek(date) {
	const end = new Date(date);
	const day = end.getDay();
	const diff = (7 - day) % 7;
	end.setDate(end.getDate() + diff);
	end.setHours(23, 59, 59, 999);
	return end;
}

function getWeekNumber(date) {
	const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const day = target.getUTCDay() || 7;
	target.setUTCDate(target.getUTCDate() + 4 - day);
	const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
	const diffDays = (target - yearStart) / 86400000;
	return Math.ceil((diffDays + 1) / 7);
}

function getPeriodoMeta(periodo) {
	const now = new Date();

	if (periodo === 'diario') {
		return {
			label: `Dia ${formatDateLong(now)}`,
			range: formatDateLong(now),
		};
	}

	if (periodo === 'semanal') {
		const start = getStartOfWeek(now);
		const end = getEndOfWeek(now);
		const week = getWeekNumber(now);
		return {
			label: `Semana ${week} - ${now.getFullYear()} (Actual)`,
			range: `${formatDateLong(start)} - ${formatDateLong(end)}`,
		};
	}

	if (periodo === 'mensual') {
		const start = new Date(now.getFullYear(), now.getMonth(), 1);
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
		return {
			label: `Mes ${new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(now)}`,
			range: `${formatDateLong(start)} - ${formatDateLong(end)}`,
		};
	}

	if (periodo === 'anual') {
		const start = new Date(now.getFullYear(), 0, 1);
		const end = new Date(now.getFullYear(), 11, 31);
		return {
			label: `Ano ${now.getFullYear()}`,
			range: `${formatDateLong(start)} - ${formatDateLong(end)}`,
		};
	}

	return {
		label: 'Todo el tiempo',
		range: 'Todo el tiempo',
	};
}

/**
 * Convierte a numero decimal seguro con un digito.
 */
function formatDecimal(value, fallback = '0.0') {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return fallback;
	}

	return parsed.toFixed(1);
}

/**
 * Convierte a entero visible seguro.
 */
function formatInteger(value, fallback = '0') {
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return fallback;
	}

	return String(Math.max(0, Math.round(parsed)));
}

/**
 * Obtiene el periodo desde query del hash.
 */
function getPeriodoFromHash() {
	const rawHash = window.location.hash || '#/ranking';
	const hashWithoutSymbol = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
	const queryString = hashWithoutSymbol.includes('?') ? hashWithoutSymbol.split('?')[1] : '';
	const params = new URLSearchParams(queryString);
	const periodoRaw = String(params.get('periodo') || 'semanal').toLowerCase();

	return Object.prototype.hasOwnProperty.call(PERIODOS, periodoRaw) ? periodoRaw : 'semanal';
}

/**
 * Actualiza el query del hash sin forzar navegacion.
 */
function updatePeriodoHash(periodo) {
	const safePeriodo = Object.prototype.hasOwnProperty.call(PERIODOS, periodo) ? periodo : 'semanal';
	const currentHash = window.location.hash || '#/ranking';
	const [path = '/ranking'] = currentHash.replace(/^#/, '').split('?');
	const nextHash = `#${path}?periodo=${encodeURIComponent(safePeriodo)}`;

	if (window.location.hash !== nextHash) {
		history.replaceState(null, '', nextHash);
	}
}


/**
 * Construye la estructura base y retorna refs para render dinámico.
 */
function renderLayout(contenedor, periodo) {
	const periodoLabel = PERIODOS[periodo] ?? PERIODOS.semanal;
	const periodoMeta = getPeriodoMeta(periodo);

	contenedor.innerHTML = `
		<section class="rk-page page-enter">
			<header class="rk-header">
				<h1 class="rk-title"><i class="bi bi-graph-up-arrow"></i>Ranking ${escapeHtml(periodoLabel)}</h1>

				<div class="rk-filters">
					<select id="ranking-periodo" class="rk-select" aria-label="Seleccionar periodo de ranking">
						${Object.entries(PERIODOS)
							.map(([value, label]) => `<option value="${value}" ${value === periodo ? 'selected' : ''}>${escapeHtml(label)}</option>`)
							.join('')}
					</select>

					<select class="rk-select" aria-label="Periodo actual" disabled>
						<option>${escapeHtml(periodoMeta.label)}</option>
					</select>
				</div>

				<p class="rk-range">${escapeHtml(periodoMeta.range)}</p>
				<span class="rk-status">En Curso</span>
			</header>

			<div id="ranking-content" class="rk-content"></div>
		</section>
	`;

	return {
		periodoSelect: contenedor.querySelector('#ranking-periodo'),
		content: contenedor.querySelector('#ranking-content'),
	};
}

/**
 * Renderiza skeletons de toda la vista antes de cargar datos.
 */
function renderSkeleton(contenedor) {
	contenedor.innerHTML = `
		<div class="rk-skeleton-podium">
			<div class="skeleton rk-sk-podium rk-sk-podium--left"></div>
			<div class="skeleton rk-sk-podium rk-sk-podium--center"></div>
			<div class="skeleton rk-sk-podium rk-sk-podium--right"></div>
		</div>

		<div class="rk-skeleton-details">
			${Array.from({ length: 3 }, () => skeletonCard('180px')).join('')}
		</div>

		<div class="rk-skeleton-others">
			<h3>Otras Posiciones</h3>
			<div class="rk-skeleton-rows">
				${Array.from({ length: 2 }, () => skeletonCard('98px')).join('')}
			</div>
		</div>
	`;
}

/**
 * Trae la mejor foto de un usuario para poder construir el podio visual.
 */
async function fetchBestPhotoByUser(nombreUsuario) {
	if (!nombreUsuario) {
		return null;
	}

	try {
		const response = await api.get(`/usuarios/${encodeURIComponent(nombreUsuario)}/fotos`, {
			orden: 'mejores',
			pagina: 1,
			limite: 1,
		});

		const fotos = Array.isArray(response?.fotos)
			? response.fotos
			: Array.isArray(response?.items)
				? response.items
				: [];

		return fotos[0] || null;
	} catch {
		return null;
	}
}

/**
 * Obtiene ranking de fotos (ahora devuelve fotos directamente, sin enriquecimiento).
 */
async function fetchRankingData(periodo) {
	const response = await api.get('/ranking', { periodo });
	const ranking = Array.isArray(response?.ranking)
		? response.ranking.map((item) => ({
			...item,
			posicion: Number(item?.posicion ?? 0),
		}))
		: [];

	// Ya no necesitamos enriquecer con fotos porque el ranking devuelve fotos directamente
	return ranking.sort((a, b) => (a?.posicion || 0) - (b?.posicion || 0));
}

/**
 * Crea un fallback visual cuando falta informacion de una posicion.
 * Ahora devuelve una foto vacía directamente (no necesita .foto)
 */
function createFallbackEntry(posicion) {
	return {
		posicion,
		fotografia_id: '',
		foto_titulo: 'sin-datos',
		foto_url: '',
		imagen_public_id: '',
		usuario_id: '',
		nombre_usuario: 'sin-datos',
		nombre: '',
		apellido: '',
		foto_perfil_url: '',
		foto_perfil_public_id: '',
		puntos_totales: 0,
		promedio_total: 0,
		total_calificaciones: 0,
		prom_creatividad: 0,
		prom_composicion: 0,
		prom_tema: 0,
	};
}

/**
 * Retorna HTML de avatar o placeholder.
 */
function renderAvatar(url, altName) {
	if (url) {
		return `<img class="rk-user-avatar" src="${escapeHtml(url)}" alt="Avatar de ${escapeHtml(altName)}">`;
	}

	return '<span class="rk-user-avatar-placeholder"><i class="bi bi-person"></i></span>';
}

/**
 * Retorna HTML de imagen principal o placeholder.
 */
function renderMainImage(url, title) {
	if (url) {
		return `<img class="rk-podium-image" src="${escapeHtml(url)}" alt="${escapeHtml(title)}">`;
	}

	return `
		<div class="rk-podium-image-placeholder" aria-label="Sin imagen">
			<i class="bi bi-image u-icon-2xl"></i>
		</div>
	`;
}

/**
 * Renderiza card de podio para 1ro, 2do o 3ro.
 * Ahora item ES la foto directamente (no necesita .foto)
 */
function renderPodiumCard(entry, medalla) {
	const item = entry || createFallbackEntry(0);
	const tituloFoto = item?.foto_titulo || 'Fotografia sin titulo';
	const usuario = item?.nombre_usuario || 'usuario';
	const badge = BADGES_PODIO[medalla];
	const scoreValue = formatDecimal(item?.promedio_total ?? item?.puntos_totales);
	const fotoId = String(item?.fotografia_id || '').trim();
	const clickableClass = fotoId ? ' rk-photo-open-trigger' : '';
	const clickableAttrs = fotoId
		? ` data-fotografia-id="${escapeHtml(fotoId)}" role="button" tabindex="0" aria-label="Abrir detalle de ${escapeHtml(tituloFoto)}"`
		: '';

	return `
		<article class="rk-podium-card rk-podium-card--${medalla}${clickableClass}"${clickableAttrs}>
			<div class="rk-podium-media rk-podium-media--${medalla}">
				${renderMainImage(item?.imagen_public_id ? cloudinaryUrl(item.imagen_public_id, { width: 900, quality: 'auto', crop: 'limit' }) : (item?.foto_url || ''), tituloFoto)}
				<span class="rk-podium-badge ${badge.className}">${badge.label}</span>
			</div>

			<div class="rk-podium-body">
				<div class="rk-top-row">
					<div class="rk-place-row">
						<i class="bi ${badge.placeIcon} rk-place-icon"></i>
						<div class="rk-place-and-title">
							<div class="rk-place"><span class="rk-place-label">${badge.placeLabel}</span></div>
							<h3 class="rk-photo-title">${escapeHtml(tituloFoto)}</h3>
						</div>
					</div>

					<div class="rk-user-inline">
						${renderAvatar(item?.foto_perfil_public_id ? cloudinaryUrl(item.foto_perfil_public_id, { width: 64, height: 64, crop: 'fill' }) : item?.foto_perfil_url, usuario)}
						<span>${escapeHtml(usuario)}</span>
					</div>
				</div>

					<div class="rk-score-box ${badge.scoreClass}">
					<div class="rk-score-value">${scoreValue}</div>
					<div class="rk-score-label">Promedio Total</div>
				</div>
			</div>
		</article>
	`;
}

/**
 * Renderiza cards de desglose de calificacion para top 3.
 * Ahora entry ES la foto directamente (no necesita .foto)
 */
function renderDetailCards(primero, segundo, tercero) {
	const entries = [primero, segundo, tercero];

	return `
		<section class="rk-details" aria-label="Detalles top 3">
			${entries
				.map((entry, index) => {
					return `
						<article class="rk-detail-card">
							<h3 class="rk-detail-title">Detalles - ${index + 1}° Lugar</h3>
							<ul class="rk-detail-list">
								<li class="rk-detail-item">
									<span class="rk-detail-name"><i class="bi bi-lightbulb rk-detail-icon--creatividad"></i>Creatividad</span>
									<strong>${formatDecimal(entry?.prom_creatividad)}</strong>
								</li>
								<li class="rk-detail-item">
									<span class="rk-detail-name"><i class="bi bi-grid-3x3 rk-detail-icon--composicion"></i>Composición</span>
									<strong>${formatDecimal(entry?.prom_composicion)}</strong>
								</li>
								<li class="rk-detail-item">
									<span class="rk-detail-name"><i class="bi bi-bullseye rk-detail-icon--tema"></i>Tema</span>
									<strong>${formatDecimal(entry?.prom_tema)}</strong>
								</li>
							</ul>
						</article>
					`;
				})
				.join('')}
		</section>
	`;
}

/**
 * Renderiza lista compacta de posiciones 4 y 5.
 * Ahora entry ES la foto directamente (no necesita .foto)
 */
function renderOtherPositions(entries) {
	if (!entries.length) {
		return `
			<section class="rk-others" aria-label="Otras posiciones">
				<h3 class="rk-others-title">Otras Posiciones</h3>
				<p class="rk-empty">No hay más posiciones para mostrar.</p>
			</section>
		`;
	}

	return `
		<section class="rk-others" aria-label="Otras posiciones">
			<h3 class="rk-others-title">Otras Posiciones</h3>
			<div class="rk-other-list">
				${entries
					.map((entry) => {
						const titulo = entry?.foto_titulo || 'Sin fotografia';
						const usuario = entry?.nombre_usuario || 'usuario';
						const puntos = formatDecimal(entry?.promedio_total ?? entry?.puntos_totales);
						const fotoId = String(entry?.fotografia_id || '').trim();
						const clickableClass = fotoId ? ' rk-photo-open-trigger' : '';
						const clickableAttrs = fotoId
							? ` data-fotografia-id="${escapeHtml(fotoId)}" role="button" tabindex="0" aria-label="Abrir detalle de ${escapeHtml(titulo)}"`
							: '';
						const avatar = renderAvatar(entry?.foto_perfil_public_id ? cloudinaryUrl(entry.foto_perfil_public_id, { width: 64, height: 64, crop: 'fill' }) : (entry?.foto_perfil_url || ''), usuario);

						const thumb = entry?.foto_url || entry?.imagen_public_id
							? `<img class="rk-other-thumb" src="${entry?.imagen_public_id ? cloudinaryUrl(entry.imagen_public_id, { width: 160, height: 160, crop: 'fill' }) : escapeHtml(entry.foto_url)}" alt="${escapeHtml(titulo)}">`
							: '<span class="rk-other-thumb-placeholder"><i class="bi bi-image"></i></span>';

						return `
							<article class="rk-other-item${clickableClass}"${clickableAttrs}>
								<div class="rk-other-position">${formatInteger(entry?.posicion)}</div>
								${thumb}
								<div>
									<p class="rk-other-name">${escapeHtml(titulo)}</p>
									<p class="rk-other-user">${avatar}<span>${escapeHtml(usuario)}</span></p>
								</div>
								<div class="rk-other-points">
									<span class="rk-other-points-value">${puntos}</span>
									<span class="rk-other-points-label">puntos</span>
								</div>
							</article>
						`;
					})
					.join('')}
			</div>
		</section>
	`;
}

/**
 * Renderiza toda la vista con datos ya procesados.
 */
function renderRankingContent(contenedor, ranking) {
	const primero = ranking.find((item) => item.posicion === 1) || createFallbackEntry(1);
	const segundo = ranking.find((item) => item.posicion === 2) || createFallbackEntry(2);
	const tercero = ranking.find((item) => item.posicion === 3) || createFallbackEntry(3);
	const otras = ranking.filter((item) => item.posicion >= 4 && item.posicion <= 5);

	if (!ranking.length) {
		contenedor.innerHTML = '<p class="rk-empty">No hay datos de ranking para este periodo.</p>';
		return;
	}
	contenedor.innerHTML = `
		<section class="rk-podium" aria-label="Podio del ranking">
			${renderPodiumCard(segundo, 'plata')}
			${renderPodiumCard(primero, 'oro')}
			${renderPodiumCard(tercero, 'bronce')}
		</section>

		${renderDetailCards(primero, segundo, tercero)}

		${renderOtherPositions(otras)}
	`;
}

/**
 * Aplica transicion fade para cambio de periodo.
 */
async function applyFade(contenedor, callback) {
	contenedor.classList.add('is-fading-out');
	await new Promise((resolve) => {
		window.setTimeout(resolve, 180);
	});

	await callback();

	contenedor.classList.remove('is-fading-out');
	contenedor.classList.add('is-fading-in');

	window.setTimeout(() => {
		contenedor.classList.remove('is-fading-in');
	}, 260);
}

/**
 * Carga datos de ranking y los renderiza.
 */
async function loadRanking(contenedor, periodo) {
	renderSkeleton(contenedor);

	try {
		const ranking = await fetchRankingData(periodo);
		renderRankingContent(contenedor, ranking);
	} catch (error) {
		manejarErrorDePagina(contenedor, error, {
			notFoundMessage: 'No encontramos ranking para este periodo.',
			forbiddenMessage: 'No tienes permisos para acceder al ranking.',
			fallbackMessage: 'No se pudo cargar el ranking en este momento.',
		});
	}
}

/**
 * Render principal de la pagina de ranking.
 */
async function render(contenedor, params = {}) {
	if (!(contenedor instanceof HTMLElement)) {
		return;
	}

	void params;

	const state = {
		periodo: getPeriodoFromHash(),
	};

	const refs = renderLayout(contenedor, state.periodo);
	refs.content?.addEventListener('click', async (event) => {
		const trigger = event.target instanceof Element ? event.target.closest('[data-fotografia-id]') : null;
		if (!trigger) {
			return;
		}

		const fotografiaId = String(trigger.getAttribute('data-fotografia-id') || '').trim();
		if (!fotografiaId) {
			return;
		}

		event.preventDefault();
		await abrirModalFoto(fotografiaId);
	});

	refs.content?.addEventListener('keydown', async (event) => {
		if (!(event.target instanceof Element)) {
			return;
		}

		const trigger = event.target.closest('[data-fotografia-id]');
		if (!trigger) {
			return;
		}

		if (event.key !== 'Enter' && event.key !== ' ') {
			return;
		}

		const fotografiaId = String(trigger.getAttribute('data-fotografia-id') || '').trim();
		if (!fotografiaId) {
			return;
		}

		event.preventDefault();
		await abrirModalFoto(fotografiaId);
	});

	await loadRanking(refs.content, state.periodo);

	refs.periodoSelect?.addEventListener('change', async (event) => {
		const nextPeriodo = String(event.target.value || 'semanal').toLowerCase();
		if (nextPeriodo === state.periodo) {
			return;
		}

		state.periodo = nextPeriodo;
		updatePeriodoHash(nextPeriodo);

		await applyFade(refs.content, async () => {
			await loadRanking(refs.content, nextPeriodo);
		});
	});

	// Refresca el ranking cuando se crea una calificación nueva en otra página
	window.addEventListener('calificacion-creada', async () => {
		await applyFade(refs.content, async () => {
			await loadRanking(refs.content, state.periodo);
		});
	});
}

export { render };

export default {
	render,
};
