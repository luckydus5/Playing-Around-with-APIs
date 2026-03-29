document.addEventListener('DOMContentLoaded', () => {
    // ========== DOM ELEMENTS ==========
    const monitorForm = document.getElementById('monitor-form');
    const cityInput = document.getElementById('city-input');
    const riskFilter = document.getElementById('risk-filter');
    const sortControl = document.getElementById('sort-control');
    const resultsContainer = document.getElementById('results');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('error-message');
    const geoBtn = document.getElementById('geo-btn');
    const themeToggle = document.getElementById('theme-toggle');
    const favoritesToggle = document.getElementById('favorites-toggle');
    const favoritesDrawer = document.getElementById('favorites-drawer');
    const favoritesList = document.getElementById('favorites-list');
    const closeFavorites = document.getElementById('close-favorites');
    const favCount = document.querySelector('.fav-count');
    const compareBtn = document.getElementById('compare-btn');
    const comparePanel = document.getElementById('compare-panel');
    const closeCompare = document.getElementById('close-compare');
    const runCompare = document.getElementById('run-compare');
    const compareResults = document.getElementById('compare-results');
    const mapToggleBtn = document.getElementById('map-toggle');
    const mapContainer = document.getElementById('map-container');
    const modal = document.getElementById('station-modal');
    const closeModal = document.getElementById('close-modal');
    const refreshToggle = document.getElementById('refresh-toggle');
    const refreshIndicator = document.getElementById('refresh-indicator');
    const refreshCountdown = document.getElementById('refresh-countdown');

    const WAQI_TOKEN = '65d925576a85e76f22256ce567bce0ebe51e334f';
    const WAQI_API = 'https://api.waqi.info';

    let currentStationsData = [];
    let currentCity = '';
    let favorites = JSON.parse(localStorage.getItem('ecobreathe-favorites') || '[]');
    let map = null;
    let mapMarkers = [];
    let forecastChart = null;
    let autoRefreshInterval = null;
    let countdownInterval = null;
    let countdownValue = 300;

    // ========== INIT ==========
    initTheme();
    updateFavoritesUI();
    fetchAirQuality('London');

    // ========== EVENT LISTENERS ==========
    monitorForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const city = cityInput.value.trim();
        if (city) fetchAirQuality(city);
    });

    riskFilter.addEventListener('change', () => applyFiltersAndSort());
    sortControl.addEventListener('change', () => applyFiltersAndSort());
    geoBtn.addEventListener('click', handleGeolocation);
    themeToggle.addEventListener('click', toggleTheme);
    favoritesToggle.addEventListener('click', () => favoritesDrawer.classList.toggle('hidden'));
    closeFavorites.addEventListener('click', () => favoritesDrawer.classList.add('hidden'));
    compareBtn.addEventListener('click', () => comparePanel.classList.toggle('hidden'));
    closeCompare.addEventListener('click', () => comparePanel.classList.add('hidden'));
    runCompare.addEventListener('click', handleCompare);
    mapToggleBtn.addEventListener('click', toggleMap);
    closeModal.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
    refreshToggle.addEventListener('click', toggleAutoRefresh);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') modal.classList.add('hidden');
    });

    // ========== FETCH AIR QUALITY ==========
    async function fetchAirQuality(city) {
        currentCity = city;
        showLoader();
        clearError();
        resultsContainer.innerHTML = '';
        currentStationsData = [];

        // Show skeleton cards
        showSkeletons();

        try {
            const endpoint = `${WAQI_API}/search/?token=${WAQI_TOKEN}&keyword=${encodeURIComponent(city)}`;
            const response = await fetch(endpoint);

            if (!response.ok) {
                throw new Error(`HTTP Sensor Error: ${response.status}`);
            }

            const payload = await response.json();

            if (payload.status !== 'ok') {
                throw new Error(payload.data || "Invalid response from WAQI API");
            }

            if (payload.data && payload.data.length > 0) {
                currentStationsData = payload.data;
                applyFiltersAndSort();
                updateMapMarkers();
                showToast(`Found ${payload.data.length} stations for "${city}"`, 'success');
            } else {
                showError(`No air quality stations found for "${city}". Try another location.`);
            }

        } catch (error) {
            console.error('Fetch operation failed:', error);
            showError(`System Warning: ${error.message}`);
        } finally {
            hideLoader();
        }
    }

    // ========== FILTER & SORT ==========
    function applyFiltersAndSort() {
        if (currentStationsData.length === 0) return;

        const riskValue = riskFilter.value;
        const sortValue = sortControl.value;

        let processedData = currentStationsData.filter(station => {
            const aqiNum = parseInt(station.aqi);
            if (isNaN(aqiNum)) return false;
            if (riskValue === 'all') return true;
            if (riskValue === 'good') return aqiNum >= 0 && aqiNum <= 50;
            if (riskValue === 'moderate') return aqiNum >= 51 && aqiNum <= 100;
            if (riskValue === 'unhealthy') return aqiNum > 100;
            return true;
        });

        processedData.sort((a, b) => {
            const aqiA = parseInt(a.aqi);
            const aqiB = parseInt(b.aqi);
            return sortValue === 'highest' ? aqiB - aqiA : aqiA - aqiB;
        });

        renderStations(processedData);
    }

    // ========== RENDER STATIONS ==========
    function renderStations(stations) {
        resultsContainer.innerHTML = '';

        if (stations.length === 0) {
            resultsContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 2rem;">
                    <i class="fas fa-filter" style="font-size:2rem; margin-bottom:0.5rem; display:block;"></i>
                    No stations match your current filters.
                </div>`;
            return;
        }

        stations.forEach(station => {
            const aqiVal = parseInt(station.aqi);
            const aqiCategory = getAqiCategory(aqiVal);
            const isFav = favorites.includes(station.station.name);
            const stationUid = station.uid;

            // Gauge percentage (capped at 500)
            const gaugePercent = Math.min((aqiVal / 500) * 100, 100);

            const card = document.createElement('article');
            card.className = 'station-card';
            card.innerHTML = `
                <div class="card-actions">
                    <button class="card-action-btn fav-btn ${isFav ? 'favorited' : ''}" data-station="${station.station.name}" title="Save city">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <h3>${station.station.name}</h3>
                <div class="aqi-display ${aqiCategory.cssClass}">
                    <span class="aqi-number">${station.aqi}</span>
                    <span class="aqi-label">${aqiCategory.label}</span>
                </div>
                <div class="aqi-gauge">
                    <div class="aqi-gauge-fill" style="width:${gaugePercent}%; background:${aqiCategory.color};"></div>
                </div>
                <div class="station-meta">
                    <span><i class="fas fa-clock"></i> ${formatDate(station.time.stime)}</span>
                    <span class="view-details" data-uid="${stationUid}">Details <i class="fas fa-arrow-right"></i></span>
                </div>
            `;

            // Card click → open detail modal
            card.querySelector('.view-details').addEventListener('click', (e) => {
                e.stopPropagation();
                openStationDetail(stationUid, station.station.name, aqiVal);
            });

            // Favorite button
            card.querySelector('.fav-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(station.station.name, e.currentTarget);
            });

            resultsContainer.appendChild(card);
        });
    }

    // ========== SKELETON LOADING ==========
    function showSkeletons() {
        resultsContainer.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-card';
            skeleton.innerHTML = `
                <div class="skeleton-line title"></div>
                <div class="skeleton-line aqi"></div>
                <div class="skeleton-line meta"></div>
            `;
            resultsContainer.appendChild(skeleton);
        }
    }

    // ========== STATION DETAIL MODAL ==========
    async function openStationDetail(uid, name, aqiVal) {
        document.getElementById('modal-station-name').textContent = name;
        document.getElementById('health-advice').innerHTML = getHealthAdvice(aqiVal);
        document.getElementById('pollutant-bars').innerHTML = '<p style="color:var(--text-secondary);">Loading pollutant data...</p>';
        document.getElementById('no-forecast').classList.add('hidden');
        modal.classList.remove('hidden');

        // Destroy old chart
        if (forecastChart) {
            forecastChart.destroy();
            forecastChart = null;
        }

        try {
            const response = await fetch(`${WAQI_API}/feed/@${uid}/?token=${WAQI_TOKEN}`);
            const payload = await response.json();

            if (payload.status === 'ok' && payload.data) {
                renderPollutants(payload.data.iaqi || {});
                renderForecast(payload.data.forecast?.daily || {});
            } else {
                document.getElementById('pollutant-bars').innerHTML = '<p style="color:var(--text-secondary);">No detailed data available.</p>';
                document.getElementById('no-forecast').classList.remove('hidden');
            }
        } catch (err) {
            console.error('Station detail fetch failed:', err);
            document.getElementById('pollutant-bars').innerHTML = '<p style="color:#c62828;">Failed to load station details.</p>';
        }
    }

    // ========== POLLUTANT BREAKDOWN ==========
    function renderPollutants(iaqi) {
        const container = document.getElementById('pollutant-bars');
        const pollutantNames = {
            pm25: 'PM2.5', pm10: 'PM10', o3: 'O₃', no2: 'NO₂', so2: 'SO₂', co: 'CO',
            t: 'Temp', h: 'Humidity', w: 'Wind', p: 'Pressure'
        };

        const mainPollutants = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co'];
        const available = mainPollutants.filter(k => iaqi[k]);

        if (available.length === 0) {
            container.innerHTML = '<p style="color:var(--text-secondary);">No pollutant breakdown available for this station.</p>';
            return;
        }

        container.innerHTML = available.map(key => {
            const val = iaqi[key].v;
            const maxVal = key === 'co' ? 300 : 500;
            const pct = Math.min((val / maxVal) * 100, 100);
            const color = getPollutantColor(val);
            return `
                <div class="pollutant-row">
                    <span class="pollutant-name">${pollutantNames[key] || key}</span>
                    <div class="pollutant-bar-track">
                        <div class="pollutant-bar-fill" style="width:${pct}%; background:${color};"></div>
                    </div>
                    <span class="pollutant-value">${val}</span>
                </div>
            `;
        }).join('');
    }

    function getPollutantColor(val) {
        if (val <= 50) return '#009966';
        if (val <= 100) return '#ffde33';
        if (val <= 150) return '#ff9933';
        if (val <= 200) return '#cc0033';
        return '#7e0023';
    }

    // ========== FORECAST CHART ==========
    function renderForecast(daily) {
        const canvas = document.getElementById('forecast-chart');
        const noForecast = document.getElementById('no-forecast');

        // Try pm25 first, then o3, then pm10
        const forecastKey = daily.pm25 ? 'pm25' : daily.o3 ? 'o3' : daily.pm10 ? 'pm10' : null;

        if (!forecastKey) {
            noForecast.classList.remove('hidden');
            canvas.style.display = 'none';
            return;
        }

        canvas.style.display = 'block';
        const data = daily[forecastKey];
        const labels = data.map(d => {
            const date = new Date(d.day);
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        });
        const avgValues = data.map(d => d.avg);
        const maxValues = data.map(d => d.max);
        const minValues = data.map(d => d.min);

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';
        const textColor = isDark ? '#9ab8a2' : '#666';

        forecastChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: `${forecastKey.toUpperCase()} Avg`,
                        data: avgValues,
                        borderColor: '#2ca25f',
                        backgroundColor: 'rgba(44,162,95,0.1)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 4,
                        pointBackgroundColor: '#2ca25f',
                    },
                    {
                        label: 'Max',
                        data: maxValues,
                        borderColor: '#cc0033',
                        borderDash: [5, 5],
                        pointRadius: 2,
                        tension: 0.3,
                        fill: false,
                    },
                    {
                        label: 'Min',
                        data: minValues,
                        borderColor: '#009966',
                        borderDash: [5, 5],
                        pointRadius: 2,
                        tension: 0.3,
                        fill: false,
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: { color: textColor, font: { size: 12 } }
                    }
                },
                scales: {
                    x: { ticks: { color: textColor }, grid: { color: gridColor } },
                    y: { ticks: { color: textColor }, grid: { color: gridColor } }
                }
            }
        });
    }

    // ========== HEALTH ADVICE ==========
    function getHealthAdvice(aqi) {
        let advice;
        if (aqi <= 50) {
            advice = {
                level: 'Good',
                cssClass: 'advice-good',
                icon: '🌿',
                summary: 'Air quality is excellent.',
                tips: [
                    'Perfect for outdoor activities and exercise',
                    'Open windows to ventilate your home',
                    'Great day for a walk or cycling'
                ]
            };
        } else if (aqi <= 100) {
            advice = {
                level: 'Moderate',
                cssClass: 'advice-moderate',
                icon: '⚠️',
                summary: 'Air quality is acceptable for most people.',
                tips: [
                    'Sensitive individuals should limit prolonged outdoor exertion',
                    'People with asthma should keep medication nearby',
                    'Consider indoor exercise if you feel symptoms'
                ]
            };
        } else if (aqi <= 150) {
            advice = {
                level: 'Unhealthy for Sensitive Groups',
                cssClass: 'advice-unhealthy',
                icon: '🟠',
                summary: 'Members of sensitive groups may experience health effects.',
                tips: [
                    'Children, elderly, and those with respiratory issues should reduce outdoor activity',
                    'Close windows and use air purifiers indoors',
                    'Wear an N95 mask if going outside',
                    'Avoid exercising near high-traffic areas'
                ]
            };
        } else if (aqi <= 200) {
            advice = {
                level: 'Unhealthy',
                cssClass: 'advice-very-unhealthy',
                icon: '🔴',
                summary: 'Everyone may begin to experience health effects.',
                tips: [
                    'Avoid prolonged outdoor activities',
                    'Keep all windows and doors closed',
                    'Use air purifiers on high settings',
                    'Wear N95 mask outdoors — surgical masks are insufficient',
                    'Monitor for symptoms: coughing, shortness of breath, eye irritation'
                ]
            };
        } else {
            advice = {
                level: 'Hazardous',
                cssClass: 'advice-hazardous',
                icon: '☠️',
                summary: 'Health emergency — everyone is affected.',
                tips: [
                    'Stay indoors with windows sealed',
                    'Run all available air purifiers',
                    'Avoid ALL outdoor physical activity',
                    'Wear N95/P100 respirator if you must go outside',
                    'Seek medical attention if experiencing difficulty breathing',
                    'Keep children and elderly strictly indoors'
                ]
            };
        }

        return `
            <div class="${advice.cssClass}">
                <span class="advice-icon">${advice.icon}</span>
                <div>
                    <h4>${advice.level}</h4>
                    <p>${advice.summary}</p>
                    <ul>${advice.tips.map(t => `<li>${t}</li>`).join('')}</ul>
                </div>
            </div>
        `;
    }

    // ========== INTERACTIVE MAP ==========
    function toggleMap() {
        const isCollapsed = mapContainer.classList.contains('collapsed');
        if (isCollapsed) {
            mapContainer.classList.remove('collapsed');
            mapContainer.classList.add('expanded');
            mapToggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i> Collapse';
            if (!map) {
                setTimeout(initMap, 100);
            } else {
                map.invalidateSize();
                updateMapMarkers();
            }
        } else {
            mapContainer.classList.remove('expanded');
            mapContainer.classList.add('collapsed');
            mapToggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i> Expand';
        }
    }

    function initMap() {
        map = L.map('aqi-map').setView([20, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 18,
        }).addTo(map);
        updateMapMarkers();
    }

    function updateMapMarkers() {
        if (!map) return;

        // Clear old markers
        mapMarkers.forEach(m => map.removeLayer(m));
        mapMarkers = [];

        currentStationsData.forEach(station => {
            if (!station.station.geo) return;
            const [lat, lng] = station.station.geo;
            const aqiVal = parseInt(station.aqi);
            if (isNaN(aqiVal)) return;

            const cat = getAqiCategory(aqiVal);
            const marker = L.circleMarker([lat, lng], {
                radius: 10,
                fillColor: cat.color,
                color: '#fff',
                weight: 2,
                fillOpacity: 0.85,
            }).addTo(map);

            marker.bindPopup(`
                <strong>${station.station.name}</strong><br>
                AQI: <strong style="color:${cat.color}">${aqiVal}</strong> — ${cat.label}
            `);

            mapMarkers.push(marker);
        });

        // Fit bounds if markers exist
        if (mapMarkers.length > 0) {
            const group = L.featureGroup(mapMarkers);
            map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    // ========== GEOLOCATION ==========
    function handleGeolocation() {
        if (!navigator.geolocation) {
            showToast('Geolocation is not supported by your browser', 'error');
            return;
        }

        geoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                geoBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';

                try {
                    showLoader();
                    showSkeletons();
                    clearError();

                    const response = await fetch(`${WAQI_API}/feed/geo:${latitude};${longitude}/?token=${WAQI_TOKEN}`);
                    const payload = await response.json();

                    if (payload.status === 'ok' && payload.data) {
                        const data = payload.data;
                        currentCity = data.city?.name || 'Your Location';
                        cityInput.value = currentCity;

                        // Wrap in search-like format for consistency
                        currentStationsData = [{
                            uid: data.idx,
                            aqi: String(data.aqi),
                            station: { name: data.city?.name || 'Your Location', geo: data.city?.geo },
                            time: { stime: data.time?.iso || new Date().toISOString() }
                        }];

                        applyFiltersAndSort();
                        updateMapMarkers();
                        showToast(`Showing air quality for your location`, 'success');
                    } else {
                        showError('Could not find air quality data for your location.');
                    }
                } catch (err) {
                    showError(`Location fetch failed: ${err.message}`);
                } finally {
                    hideLoader();
                }
            },
            (error) => {
                geoBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
                showToast('Location access denied. Please enable GPS.', 'error');
            }
        );
    }

    // ========== FAVORITES ==========
    function toggleFavorite(stationName, btn) {
        const idx = favorites.indexOf(stationName);
        if (idx > -1) {
            favorites.splice(idx, 1);
            btn.classList.remove('favorited');
            showToast('Removed from favorites', 'info');
        } else {
            favorites.push(stationName);
            btn.classList.add('favorited');
            showToast('Added to favorites', 'success');
        }
        localStorage.setItem('ecobreathe-favorites', JSON.stringify(favorites));
        updateFavoritesUI();
    }

    function updateFavoritesUI() {
        if (favorites.length > 0) {
            favCount.textContent = favorites.length;
            favCount.classList.remove('hidden');
            favoritesList.innerHTML = favorites.map(name => `
                <div class="fav-chip" data-city="${name}">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${name.split(',')[0]}</span>
                    <span class="remove-fav" data-name="${name}"><i class="fas fa-times"></i></span>
                </div>
            `).join('');

            // Click to search
            favoritesList.querySelectorAll('.fav-chip').forEach(chip => {
                chip.addEventListener('click', (e) => {
                    if (e.target.closest('.remove-fav')) return;
                    const cityName = chip.dataset.city.split(',')[0].trim();
                    cityInput.value = cityName;
                    fetchAirQuality(cityName);
                    favoritesDrawer.classList.add('hidden');
                });
            });

            // Remove from favorites
            favoritesList.querySelectorAll('.remove-fav').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const name = btn.dataset.name;
                    favorites = favorites.filter(f => f !== name);
                    localStorage.setItem('ecobreathe-favorites', JSON.stringify(favorites));
                    updateFavoritesUI();
                    showToast('Removed from favorites', 'info');
                });
            });
        } else {
            favCount.classList.add('hidden');
            favoritesList.innerHTML = '<p class="empty-fav">No saved cities yet. Click the <i class="fas fa-heart"></i> on any station card to save it.</p>';
        }
    }

    // ========== COMPARE MODE ==========
    async function handleCompare() {
        const city1 = document.getElementById('compare-city-1').value.trim();
        const city2 = document.getElementById('compare-city-2').value.trim();

        if (!city1 || !city2) {
            showToast('Enter both cities to compare', 'error');
            return;
        }

        compareResults.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--text-secondary);"><i class="fas fa-spinner fa-spin"></i> Comparing...</p>';

        try {
            const [res1, res2] = await Promise.all([
                fetch(`${WAQI_API}/search/?token=${WAQI_TOKEN}&keyword=${encodeURIComponent(city1)}`).then(r => r.json()),
                fetch(`${WAQI_API}/search/?token=${WAQI_TOKEN}&keyword=${encodeURIComponent(city2)}`).then(r => r.json())
            ]);

            const s1 = res1.data?.[0];
            const s2 = res2.data?.[0];

            if (!s1 || !s2) {
                compareResults.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#c62828;">Could not find data for one or both cities.</p>';
                return;
            }

            const aqi1 = parseInt(s1.aqi);
            const aqi2 = parseInt(s2.aqi);
            const cat1 = getAqiCategory(aqi1);
            const cat2 = getAqiCategory(aqi2);

            compareResults.innerHTML = `
                <div class="compare-card">
                    <h4>${s1.station.name.split(',')[0]}</h4>
                    <div class="compare-aqi" style="color:${cat1.color}">${aqi1}</div>
                    <div class="compare-label">${cat1.label}</div>
                </div>
                <div class="compare-card">
                    <h4>${s2.station.name.split(',')[0]}</h4>
                    <div class="compare-aqi" style="color:${cat2.color}">${aqi2}</div>
                    <div class="compare-label">${cat2.label}</div>
                </div>
            `;
        } catch (err) {
            compareResults.innerHTML = '<p style="grid-column:1/-1; color:#c62828;">Comparison failed. Please try again.</p>';
        }
    }

    // ========== AUTO-REFRESH ==========
    function toggleAutoRefresh() {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            clearInterval(countdownInterval);
            autoRefreshInterval = null;
            countdownInterval = null;
            refreshToggle.classList.remove('active');
            refreshIndicator.classList.add('hidden');
            showToast('Auto-refresh disabled', 'info');
        } else {
            countdownValue = 300;
            refreshToggle.classList.add('active');
            refreshIndicator.classList.remove('hidden');

            countdownInterval = setInterval(() => {
                countdownValue--;
                refreshCountdown.textContent = countdownValue;
                if (countdownValue <= 0) countdownValue = 300;
            }, 1000);

            autoRefreshInterval = setInterval(() => {
                if (currentCity) {
                    fetchAirQuality(currentCity);
                    countdownValue = 300;
                }
            }, 300000); // 5 minutes

            showToast('Auto-refresh enabled (every 5 min)', 'success');
        }
    }

    // ========== DARK MODE ==========
    function initTheme() {
        const saved = localStorage.getItem('ecobreathe-theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
        updateThemeIcon(saved);
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('ecobreathe-theme', next);
        updateThemeIcon(next);
    }

    function updateThemeIcon(theme) {
        themeToggle.innerHTML = theme === 'dark'
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
    }

    // ========== TOAST NOTIFICATIONS ==========
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
        toast.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(30px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ========== HELPERS ==========
    function getAqiCategory(aqi) {
        if (isNaN(aqi)) return { label: 'Unknown', cssClass: 'bg-unknown', color: '#9e9e9e' };
        if (aqi <= 50) return { label: 'Good', cssClass: 'bg-good', color: '#009966' };
        if (aqi <= 100) return { label: 'Moderate', cssClass: 'bg-moderate', color: '#ffde33' };
        if (aqi <= 150) return { label: 'Unhealthy / Sensitive', cssClass: 'bg-unhealthy-sensitive', color: '#ff9933' };
        if (aqi <= 200) return { label: 'Unhealthy', cssClass: 'bg-unhealthy', color: '#cc0033' };
        return { label: 'Hazardous', cssClass: 'bg-hazardous', color: '#7e0023' };
    }

    function formatDate(timeString) {
        try {
            const date = new Date(timeString);
            return date.toLocaleString();
        } catch (e) {
            return timeString;
        }
    }

    function showLoader() { loader.classList.remove('hidden'); }
    function hideLoader() { loader.classList.add('hidden'); }
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
    function clearError() {
        errorMessage.textContent = '';
        errorMessage.classList.add('hidden');
    }
});
