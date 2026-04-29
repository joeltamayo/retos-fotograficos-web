import api from '../api.js';
import { manejarErrorDePagina, skeletonCard } from '../utils.js';

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
	contenedor.innerHTML = `
		<section class="rk-page page-enter">
			<header class="rk-header">
				<h1 class="rk-title"><i class="bi bi-graph-up-arrow"></i>Ranking Semanal</h1>

				<div class="rk-filters">
					<select id="ranking-periodo" class="rk-select" aria-label="Seleccionar periodo de ranking">
						${Object.entries(PERIODOS)
							.map(([value, label]) => `<option value="${value}" ${value === periodo ? 'selected' : ''}>${escapeHtml(label)}</option>`)
							.join('')}
					</select>

					<select class="rk-select" aria-label="Semana actual" disabled>
						<option>Semana 44 - 2025 (Actual)</option>
					</select>
				</div>

				<p class="rk-range">27 de octubre de 2025 - 2 de noviembre de 2025</p>
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
 * Obtiene ranking y lo enriquece con foto de referencia por usuario.
 */
async function fetchRankingData(periodo) {
	const response = await api.get('/ranking', { periodo });
	const ranking = Array.isArray(response?.ranking) ? response.ranking : [];

	const enriched = await Promise.all(
		ranking.map(async (item) => {
			const nombreUsuario = String(item?.nombre_usuario || '').trim();
			const foto = await fetchBestPhotoByUser(nombreUsuario);

			return {
				posicion: Number(item?.posicion) || 0,
				nombre_usuario: nombreUsuario || 'usuario',
				foto_perfil_url: item?.foto_perfil_url || '',
				puntos_totales: Number(item?.puntos_totales) || 0,
				foto,
			};
		}),
	);

	return enriched.sort((a, b) => a.posicion - b.posicion);
}

/**
 * Crea un fallback visual cuando falta informacion de un lugar.
 */
function createFallbackEntry(posicion) {
	return {
		posicion,
		nombre_usuario: 'sin-datos',
		foto_perfil_url: '',
		puntos_totales: 0,
		foto: null,
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
 */
function renderPodiumCard(entry, medalla) {
	const item = entry || createFallbackEntry(0);
	const foto = item.foto || {};
	const tituloFoto = foto?.titulo || 'Fotografia sin titulo';
	const usuario = item.nombre_usuario || 'usuario';
	const badge = BADGES_PODIO[medalla];
	const scoreValue = formatDecimal(foto?.puntuacion_promedio ?? item.puntos_totales);

	return `
		<article class="rk-podium-card rk-podium-card--${medalla}">
			<div class="rk-podium-media rk-podium-media--${medalla}">
				${renderMainImage(foto?.imagen_url || '', tituloFoto)}
				<span class="rk-podium-badge ${badge.className}">${badge.label}</span>
			</div>

			<div class="rk-podium-body">
				<div class="rk-place">
					<i class="bi ${badge.placeIcon}"></i>
					<span class="rk-place-label">${badge.placeLabel}</span>
				</div>

				<h3 class="rk-photo-title">${escapeHtml(tituloFoto)}</h3>

				<div class="rk-user-row">
					${renderAvatar(item.foto_perfil_url, usuario)}
					<span>${escapeHtml(usuario)}</span>
				</div>

				<div class="rk-score-box ${badge.scoreClass}">
					<div class="rk-score-value">${scoreValue}</div>
					<div class="rk-score-label">Puntuación Total</div>
				</div>
			</div>
		</article>
	`;
}

/**
 * Renderiza cards de desglose de calificacion para top 3.
 */
function renderDetailCards(primero, segundo, tercero) {
	const entries = [primero, segundo, tercero];

	return `
		<section class="rk-details" aria-label="Detalles top 3">
			${entries
				.map((entry, index) => {
					const foto = entry?.foto || {};
					return `
						<article class="rk-detail-card">
							<h3 class="rk-detail-title">Detalles - ${index + 1}° Lugar</h3>
							<ul class="rk-detail-list">
								<li class="rk-detail-item">
									<span class="rk-detail-name"><i class="bi bi-lightbulb rk-detail-icon--creatividad"></i>Creatividad</span>
									<strong>${formatDecimal(foto?.prom_creatividad)}</strong>
								</li>
								<li class="rk-detail-item">
									<span class="rk-detail-name"><i class="bi bi-grid-3x3 rk-detail-icon--composicion"></i>Composición</span>
									<strong>${formatDecimal(foto?.prom_composicion)}</strong>
								</li>
								<li class="rk-detail-item">
									<span class="rk-detail-name"><i class="bi bi-bullseye rk-detail-icon--tema"></i>Tema</span>
									<strong>${formatDecimal(foto?.prom_tema)}</strong>
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
						const foto = entry?.foto || {};
						const titulo = foto?.titulo || 'Sin fotografia';
						const usuario = entry?.nombre_usuario || 'usuario';
						const puntos = formatDecimal(entry?.puntos_totales);
						const avatar = renderAvatar(entry?.foto_perfil_url || '', usuario);

						const thumb = foto?.imagen_url
							? `<img class="rk-other-thumb" src="${escapeHtml(foto.imagen_url)}" alt="${escapeHtml(titulo)}">`
							: '<span class="rk-other-thumb-placeholder"><i class="bi bi-image"></i></span>';

						return `
							<article class="rk-other-item">
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
	await loadRanking(refs.content, state.periodo);

	refs.periodoSelect?.addEventListener('change', async (event) => {
		const nextPeriodo = String(event.target.value || 'semanal').toLowerCase();
		if (nextPeriodo === state.periodo) {
			return;
		}

		state.periodo = Object.prototype.hasOwnProperty.call(PERIODOS, nextPeriodo) ? nextPeriodo : 'semanal';
		updatePeriodoHash(state.periodo);

		await applyFade(refs.content, async () => {
			await loadRanking(refs.content, state.periodo);
		});
	});
}

export { render };

export default {
	render,
};
