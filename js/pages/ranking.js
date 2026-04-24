import api from '../api.js';
import { skeletonCard } from '../utils.js';

const STYLE_ID = 'ranking-page-styles';

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
		className: 'ranking-podium-badge--oro',
		scoreClass: 'ranking-score--oro',
		placeLabel: '1er Lugar',
		placeIcon: 'bi-trophy',
	},
	plata: {
		label: '🥈 Plata',
		className: 'ranking-podium-badge--plata',
		scoreClass: 'ranking-score--plata',
		placeLabel: '2do Lugar',
		placeIcon: 'bi-gem',
	},
	bronce: {
		label: '🥉 Bronce',
		className: 'ranking-podium-badge--bronce',
		scoreClass: 'ranking-score--bronce',
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
 * Inyecta estilos de la vista una sola vez.
 */
function ensureStyles() {
	if (document.getElementById(STYLE_ID)) {
		return;
	}

	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = `
		.ranking-page {
			max-width: var(--content-max-width);
			margin: 0 auto;
			padding: 28px var(--page-padding-x) 48px;
		}

		.ranking-header {
			text-align: center;
			margin-bottom: 22px;
		}

		.ranking-title {
			margin: 0;
			font-size: 32px;
			font-weight: 700;
			color: #111827;
			display: inline-flex;
			align-items: center;
			gap: 8px;
		}

		.ranking-title i {
			font-size: 24px;
		}

		.ranking-filters {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 12px;
			margin-top: 14px;
			flex-wrap: wrap;
		}

		.ranking-select {
			background: #F3F4F6;
			border: 1px solid #E5E7EB;
			border-radius: 10px;
			padding: 10px 14px;
			font-size: 15px;
			color: #111827;
			min-width: 220px;
		}

		.ranking-select:disabled {
			opacity: 1;
			cursor: default;
		}

		.ranking-range {
			margin: 14px 0 0;
			font-size: 16px;
			color: #6B7280;
		}

		.ranking-status {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			margin-top: 12px;
			padding: 4px 12px;
			border-radius: 9999px;
			background: #DBEAFE;
			color: #1D4ED8;
			font-size: 12px;
			font-weight: 600;
		}

		.ranking-content {
			transition: opacity 0.2s ease, transform 0.2s ease;
		}

		.ranking-content.is-fading-out {
			opacity: 0;
			transform: translateY(6px);
		}

		.ranking-content.is-fading-in {
			animation: rankingFadeIn 0.24s ease;
		}

		@keyframes rankingFadeIn {
			from {
				opacity: 0;
				transform: translateY(6px);
			}

			to {
				opacity: 1;
				transform: translateY(0);
			}
		}

		.ranking-podium {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 22px;
			align-items: end;
		}

		.ranking-podium-card {
			background: #FFFFFF;
			border-radius: 14px;
			box-shadow: var(--shadow-card);
			overflow: hidden;
		}

		.ranking-podium-card--oro {
			border: 2px solid rgba(234, 179, 8, 0.75);
			box-shadow: 0 8px 20px rgba(234, 179, 8, 0.22);
		}

		.ranking-podium-media {
			position: relative;
			background: #E5E7EB;
			overflow: hidden;
		}

		.ranking-podium-media--plata {
			height: 370px;
		}

		.ranking-podium-media--oro {
			height: 430px;
		}

		.ranking-podium-media--bronce {
			height: 345px;
		}

		.ranking-podium-image {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}

		.ranking-podium-image-placeholder {
			width: 100%;
			height: 100%;
			display: flex;
			align-items: center;
			justify-content: center;
			color: #9CA3AF;
			background: #E5E7EB;
		}

		.ranking-podium-badge {
			position: absolute;
			top: 10px;
			right: 10px;
			border-radius: 9999px;
			padding: 4px 10px;
			font-size: 12px;
			font-weight: 700;
			line-height: 1;
			color: #FFFFFF;
		}

		.ranking-podium-badge--oro { background: linear-gradient(135deg, #FACC15, #EAB308); }
		.ranking-podium-badge--plata { background: linear-gradient(135deg, #94A3B8, #64748B); }
		.ranking-podium-badge--bronce { background: linear-gradient(135deg, #EA580C, #C2410C); }

		.ranking-podium-body {
			padding: 14px;
		}

		.ranking-place {
			display: inline-flex;
			align-items: center;
			gap: 8px;
			font-size: 28px;
			color: #6B7280;
		}

		.ranking-place-label {
			font-size: 30px;
			font-weight: 400;
			color: #6B7280;
		}

		.ranking-photo-title {
			margin: 6px 0 8px;
			font-size: 32px;
			font-weight: 500;
			line-height: 1.22;
			color: #111827;
		}

		.ranking-user-row {
			display: flex;
			align-items: center;
			gap: 8px;
			margin-bottom: 12px;
			font-size: 28px;
			color: #111827;
		}

		.ranking-user-avatar {
			width: 28px;
			height: 28px;
			border-radius: 9999px;
			object-fit: cover;
			background: #E5E7EB;
		}

		.ranking-user-avatar-placeholder {
			width: 28px;
			height: 28px;
			border-radius: 9999px;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			background: #E5E7EB;
			color: #9CA3AF;
			font-size: 14px;
		}

		.ranking-score-box {
			border-radius: 10px;
			padding: 12px;
			text-align: center;
			color: #FFFFFF;
		}

		.ranking-score-value {
			font-size: 40px;
			font-weight: 500;
			line-height: 1;
		}

		.ranking-score-label {
			margin-top: 4px;
			font-size: 24px;
			line-height: 1;
		}

		.ranking-score--oro { background: linear-gradient(135deg, #FACC15 0%, #EAB308 55%, #D97706 100%); }
		.ranking-score--plata { background: linear-gradient(135deg, #94A3B8 0%, #64748B 100%); }
		.ranking-score--bronce { background: linear-gradient(135deg, #EA580C 0%, #C2410C 100%); }

		.ranking-details {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 16px;
			margin-top: 24px;
		}

		.ranking-detail-card {
			background: #FFFFFF;
			border-radius: 14px;
			box-shadow: var(--shadow-card);
			padding: 22px;
		}

		.ranking-detail-title {
			margin: 0;
			font-size: 16px;
			font-weight: 700;
			color: #111827;
		}

		.ranking-detail-list {
			margin: 12px 0 0;
			padding: 0;
			list-style: none;
		}

		.ranking-detail-item {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			align-items: center;
			gap: 12px;
			padding: 6px 0;
			font-size: 15px;
			color: #111827;
		}

		.ranking-detail-item strong {
			font-weight: 700;
		}

		.ranking-detail-name {
			display: inline-flex;
			align-items: center;
			gap: 8px;
		}

		.ranking-detail-icon--creatividad { color: #8B5CF6; }
		.ranking-detail-icon--composicion { color: #3B82F6; }
		.ranking-detail-icon--tema { color: #22C55E; }

		.ranking-others {
			margin-top: 20px;
		}

		.ranking-others-title {
			margin: 0 0 12px;
			font-size: 28px;
			font-weight: 400;
			color: #111827;
		}

		.ranking-other-list {
			display: flex;
			flex-direction: column;
			gap: 10px;
		}

		.ranking-other-item {
			background: #FFFFFF;
			border-radius: 14px;
			box-shadow: var(--shadow-card);
			padding: 14px 18px;
			display: grid;
			grid-template-columns: auto auto minmax(0, 1fr) auto;
			align-items: center;
			gap: 14px;
		}

		.ranking-other-position {
			font-size: 36px;
			font-weight: 400;
			color: #6B7280;
			width: 40px;
			text-align: center;
		}

		.ranking-other-thumb {
			width: 72px;
			height: 72px;
			border-radius: 8px;
			object-fit: cover;
			background: #E5E7EB;
		}

		.ranking-other-thumb-placeholder {
			width: 72px;
			height: 72px;
			border-radius: 8px;
			background: #E5E7EB;
			color: #9CA3AF;
			display: inline-flex;
			align-items: center;
			justify-content: center;
		}

		.ranking-other-name {
			margin: 0;
			font-size: 32px;
			font-weight: 400;
			line-height: 1.2;
			color: #111827;
		}

		.ranking-other-user {
			margin: 4px 0 0;
			font-size: 28px;
			font-weight: 400;
			color: #6B7280;
			display: inline-flex;
			align-items: center;
			gap: 8px;
		}

		.ranking-other-points {
			text-align: right;
			min-width: 120px;
		}

		.ranking-other-points-value {
			display: block;
			font-size: 40px;
			line-height: 1;
			color: #111827;
			font-weight: 400;
		}

		.ranking-other-points-label {
			display: block;
			font-size: 24px;
			line-height: 1.2;
			color: #6B7280;
		}

		.ranking-empty,
		.ranking-error {
			margin: 0;
			padding: 16px;
			border-radius: 10px;
			font-size: 14px;
		}

		.ranking-empty {
			background: #F8FAFC;
			color: #6B7280;
		}

		.ranking-error {
			background: #FEE2E2;
			color: #991B1B;
		}

		.ranking-skeleton-podium {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 22px;
		}

		.ranking-skeleton-details {
			display: grid;
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 16px;
			margin-top: 24px;
		}

		.ranking-skeleton-others {
			margin-top: 20px;
		}

		.ranking-skeleton-others h3 {
			font-size: 28px;
			font-weight: 400;
			margin: 0 0 12px;
		}

		.ranking-skeleton-rows {
			display: grid;
			gap: 10px;
		}

		@media (max-width: 1199.98px) {
			.ranking-photo-title,
			.ranking-other-name {
				font-size: 24px;
			}

			.ranking-place-label,
			.ranking-user-row,
			.ranking-other-user,
			.ranking-score-label,
			.ranking-other-points-label {
				font-size: 18px;
			}

			.ranking-score-value,
			.ranking-other-points-value {
				font-size: 30px;
			}
		}

		@media (max-width: 991.98px) {
			.ranking-page {
				padding: 22px 16px 40px;
			}

			.ranking-title {
				font-size: 28px;
			}

			.ranking-podium,
			.ranking-details,
			.ranking-skeleton-podium,
			.ranking-skeleton-details {
				grid-template-columns: repeat(1, minmax(0, 1fr));
			}

			.ranking-podium-media--plata,
			.ranking-podium-media--oro,
			.ranking-podium-media--bronce {
				height: 300px;
			}

			.ranking-other-item {
				grid-template-columns: auto auto minmax(0, 1fr);
			}

			.ranking-other-points {
				grid-column: 1 / -1;
				display: flex;
				align-items: baseline;
				justify-content: flex-end;
				gap: 8px;
			}
		}
	`;

	document.head.appendChild(style);
}

/**
 * Construye la estructura base y retorna refs para render dinámico.
 */
function renderLayout(contenedor, periodo) {
	contenedor.innerHTML = `
		<section class="ranking-page page-enter">
			<header class="ranking-header">
				<h1 class="ranking-title"><i class="bi bi-graph-up-arrow"></i>Ranking Semanal</h1>

				<div class="ranking-filters">
					<select id="ranking-periodo" class="ranking-select" aria-label="Seleccionar periodo de ranking">
						${Object.entries(PERIODOS)
							.map(([value, label]) => `<option value="${value}" ${value === periodo ? 'selected' : ''}>${escapeHtml(label)}</option>`)
							.join('')}
					</select>

					<select class="ranking-select" aria-label="Semana actual" disabled>
						<option>Semana 44 - 2025 (Actual)</option>
					</select>
				</div>

				<p class="ranking-range">27 de octubre de 2025 - 2 de noviembre de 2025</p>
				<span class="ranking-status">En Curso</span>
			</header>

			<div id="ranking-content" class="ranking-content"></div>
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
		<div class="ranking-skeleton-podium">
			${Array.from({ length: 3 }, () => skeletonCard('430px')).join('')}
		</div>

		<div class="ranking-skeleton-details">
			${Array.from({ length: 3 }, () => skeletonCard('180px')).join('')}
		</div>

		<div class="ranking-skeleton-others">
			<h3>Otras Posiciones</h3>
			<div class="ranking-skeleton-rows">
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
		return `<img class="ranking-user-avatar" src="${escapeHtml(url)}" alt="Avatar de ${escapeHtml(altName)}">`;
	}

	return '<span class="ranking-user-avatar-placeholder"><i class="bi bi-person"></i></span>';
}

/**
 * Retorna HTML de imagen principal o placeholder.
 */
function renderMainImage(url, title) {
	if (url) {
		return `<img class="ranking-podium-image" src="${escapeHtml(url)}" alt="${escapeHtml(title)}">`;
	}

	return `
		<div class="ranking-podium-image-placeholder" aria-label="Sin imagen">
			<i class="bi bi-image" style="font-size:2rem"></i>
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
		<article class="ranking-podium-card ${medalla === 'oro' ? 'ranking-podium-card--oro' : ''}">
			<div class="ranking-podium-media ranking-podium-media--${medalla}">
				${renderMainImage(foto?.imagen_url || '', tituloFoto)}
				<span class="ranking-podium-badge ${badge.className}">${badge.label}</span>
			</div>

			<div class="ranking-podium-body">
				<div class="ranking-place">
					<i class="bi ${badge.placeIcon}"></i>
					<span class="ranking-place-label">${badge.placeLabel}</span>
				</div>

				<h3 class="ranking-photo-title">${escapeHtml(tituloFoto)}</h3>

				<div class="ranking-user-row">
					${renderAvatar(item.foto_perfil_url, usuario)}
					<span>${escapeHtml(usuario)}</span>
				</div>

				<div class="ranking-score-box ${badge.scoreClass}">
					<div class="ranking-score-value">${scoreValue}</div>
					<div class="ranking-score-label">Puntuación Total</div>
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
		<section class="ranking-details" aria-label="Detalles top 3">
			${entries
				.map((entry, index) => {
					const foto = entry?.foto || {};
					return `
						<article class="ranking-detail-card">
							<h3 class="ranking-detail-title">Detalles - ${index + 1}° Lugar</h3>
							<ul class="ranking-detail-list">
								<li class="ranking-detail-item">
									<span class="ranking-detail-name"><i class="bi bi-lightbulb ranking-detail-icon--creatividad"></i>Creatividad</span>
									<strong>${formatDecimal(foto?.prom_creatividad)}</strong>
								</li>
								<li class="ranking-detail-item">
									<span class="ranking-detail-name"><i class="bi bi-grid-3x3 ranking-detail-icon--composicion"></i>Composición</span>
									<strong>${formatDecimal(foto?.prom_composicion)}</strong>
								</li>
								<li class="ranking-detail-item">
									<span class="ranking-detail-name"><i class="bi bi-bullseye ranking-detail-icon--tema"></i>Tema</span>
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
			<section class="ranking-others" aria-label="Otras posiciones">
				<h3 class="ranking-others-title">Otras Posiciones</h3>
				<p class="ranking-empty">No hay más posiciones para mostrar.</p>
			</section>
		`;
	}

	return `
		<section class="ranking-others" aria-label="Otras posiciones">
			<h3 class="ranking-others-title">Otras Posiciones</h3>
			<div class="ranking-other-list">
				${entries
					.map((entry) => {
						const foto = entry?.foto || {};
						const titulo = foto?.titulo || 'Sin fotografia';
						const usuario = entry?.nombre_usuario || 'usuario';
						const puntos = formatDecimal(entry?.puntos_totales);
						const avatar = renderAvatar(entry?.foto_perfil_url || '', usuario);

						const thumb = foto?.imagen_url
							? `<img class="ranking-other-thumb" src="${escapeHtml(foto.imagen_url)}" alt="${escapeHtml(titulo)}">`
							: '<span class="ranking-other-thumb-placeholder"><i class="bi bi-image"></i></span>';

						return `
							<article class="ranking-other-item">
								<div class="ranking-other-position">${formatInteger(entry?.posicion)}</div>
								${thumb}
								<div>
									<p class="ranking-other-name">${escapeHtml(titulo)}</p>
									<p class="ranking-other-user">${avatar}<span>${escapeHtml(usuario)}</span></p>
								</div>
								<div class="ranking-other-points">
									<span class="ranking-other-points-value">${puntos}</span>
									<span class="ranking-other-points-label">puntos</span>
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
		contenedor.innerHTML = '<p class="ranking-empty">No hay datos de ranking para este periodo.</p>';
		return;
	}

	contenedor.innerHTML = `
		<section class="ranking-podium" aria-label="Podio del ranking">
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
		contenedor.innerHTML = `<p class="ranking-error">${escapeHtml(error?.error || 'No se pudo cargar el ranking en este momento.')}</p>`;
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
	ensureStyles();

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
