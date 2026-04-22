const apiUrl = "http://127.0.0.1:5000/predict";
let resultChart;
let map;
let marker;
let baseStreetLayer;
let baseSatelliteLayer;
let radarLayer;
let precipitationLayer;
let activeOverlay;
let latestRadarPath;

const placeInput = document.getElementById("selectedPlace");
const latInput = document.getElementById("latitude");
const lngInput = document.getElementById("longitude");
const locationSelect = document.getElementById("location");
const layerStatus = document.getElementById("layerStatus");

const cityCoordinates = {
    Delhi: [28.6139, 77.2090],
    Mumbai: [19.0760, 72.8777],
    Chennai: [13.0827, 80.2707],
    Kolkata: [22.5726, 88.3639],
    Bengaluru: [12.9716, 77.5946],
    Hyderabad: [17.3850, 78.4867],
    Pune: [18.5204, 73.8567],
    Jaipur: [26.9124, 75.7873]
};

function updateLocationFields(lat, lng, placeName) {
    latInput.value = lat.toFixed(6);
    lngInput.value = lng.toFixed(6);
    placeInput.value = placeName || `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`;
}

async function resolvePlace(lat, lng) {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();
        return data.display_name || "";
    } catch {
        return "";
    }
}

function initMap() {
    map = L.map("map").setView([22.9734, 78.6569], 5);

    baseStreetLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
    baseSatelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
            maxZoom: 18,
            attribution: "Tiles &copy; Esri"
        }
    );

    marker = L.marker([22.9734, 78.6569], { draggable: true }).addTo(map);
    updateLocationFields(22.9734, 78.6569, "India");

    marker.on("dragend", async (event) => {
        const position = event.target.getLatLng();
        const place = await resolvePlace(position.lat, position.lng);
        updateLocationFields(position.lat, position.lng, place);
        marker.bindPopup(`<strong>Monitoring Point</strong><br>${placeInput.value}`).openPopup();
    });

    map.on("click", async (event) => {
        marker.setLatLng(event.latlng);
        const place = await resolvePlace(event.latlng.lat, event.latlng.lng);
        updateLocationFields(event.latlng.lat, event.latlng.lng, place);
        marker.bindPopup(`<strong>Monitoring Point</strong><br>${placeInput.value}`).openPopup();
    });
}

async function initWeatherOverlays() {
    try {
        const response = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        const data = await response.json();
        const latestRadar = data?.radar?.past?.[data.radar.past.length - 1];

        if (latestRadar?.path) {
            latestRadarPath = latestRadar.path;
            radarLayer = L.tileLayer(
                `https://tilecache.rainviewer.com${latestRadarPath}/256/{z}/{x}/{y}/2/1_1.png`,
                { opacity: 0.7, attribution: "&copy; RainViewer" }
            );
            precipitationLayer = L.tileLayer(
                `https://tilecache.rainviewer.com${latestRadarPath}/256/{z}/{x}/{y}/4/1_1.png`,
                { opacity: 0.72, attribution: "&copy; RainViewer" }
            );
        }
    } catch {
        latestRadarPath = null;
    }
}

function setLayerStatus(text) {
    layerStatus.textContent = `Layer: ${text}`;
}

function activateOverlay(layerName) {
    if (activeOverlay) {
        map.removeLayer(activeOverlay);
        activeOverlay = null;
    }

    if (layerName === "radar" && radarLayer) {
        activeOverlay = radarLayer.addTo(map);
        setLayerStatus("Radar");
        return;
    }

    if (layerName === "precipitation" && precipitationLayer) {
        activeOverlay = precipitationLayer.addTo(map);
        setLayerStatus("Precipitation");
        return;
    }

    if (["wind", "temperature", "humidity", "pressure"].includes(layerName)) {
        setLayerStatus(`${layerName[0].toUpperCase()}${layerName.slice(1)} (demo placeholder)`);
        return;
    }

    setLayerStatus(layerName === "satellite" ? "Satellite" : "Street");
}

function switchBaseLayer(layerName) {
    if (layerName === "satellite") {
        if (map.hasLayer(baseStreetLayer)) {
            map.removeLayer(baseStreetLayer);
        }
        if (!map.hasLayer(baseSatelliteLayer)) {
            map.addLayer(baseSatelliteLayer);
        }
        return;
    }

    if (map.hasLayer(baseSatelliteLayer)) {
        map.removeLayer(baseSatelliteLayer);
    }
    if (!map.hasLayer(baseStreetLayer)) {
        map.addLayer(baseStreetLayer);
    }
}

function renderChart(predictedRainfall, discharge, hii) {
    const ctx = document.getElementById("resultChart");
    const data = {
        labels: ["Predicted Rainfall", "Discharge", "HII"],
        datasets: [{
            label: "Model Output",
            data: [predictedRainfall, discharge, hii],
            backgroundColor: ["#0ea5e9", "#22c55e", "#f97316"],
            borderColor: ["#0369a1", "#15803d", "#c2410c"],
            borderWidth: 1
        }]
    };

    if (resultChart) {
        resultChart.destroy();
    }

    resultChart = new Chart(ctx, {
        type: "bar",
        data,
        options: {
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });
}

function toNumber(id) {
    const value = parseFloat(document.getElementById(id).value);
    return Number.isNaN(value) ? null : value;
}

function collectPayload() {
    const rainfall = toNumber("rainfall");
    const area = toNumber("area");
    const slope = toNumber("slope");

    if (rainfall === null || area === null || slope === null) {
        throw new Error("Please enter rainfall, area, and slope values.");
    }

    const temp9 = toNumber("temp9am");
    const temp3 = toNumber("temp3pm");
    const humidity9 = toNumber("humidity9am");
    const humidity3 = toNumber("humidity3pm");
    const wind9 = toNumber("windSpeed9am");
    const wind3 = toNumber("windSpeed3pm");
    const pressure9 = toNumber("pressure9am");
    const pressure3 = toNumber("pressure3pm");

    return {
        date: document.getElementById("date").value,
        location: locationSelect.value || placeInput.value,
        min_temp: toNumber("minTemp"),
        max_temp: toNumber("maxTemp"),
        rainfall,
        evaporation: toNumber("evaporation"),
        sunshine: toNumber("sunshine"),
        wind_gust_speed: toNumber("windGustSpeed"),
        wind_speed_9am: wind9,
        wind_speed_3pm: wind3,
        humidity_9am: humidity9,
        humidity_3pm: humidity3,
        pressure_9am: pressure9,
        pressure_3pm: pressure3,
        temperature_9am: temp9,
        temperature_3pm: temp3,
        cloud_9am: toNumber("cloud9am"),
        cloud_3pm: toNumber("cloud3pm"),
        wind_dir_9am: document.getElementById("windDir9am").value,
        wind_dir_3pm: document.getElementById("windDir3pm").value,
        wind_gust_dir: document.getElementById("windGustDir").value,
        rain_today: document.getElementById("rainToday").value,
        latitude: toNumber("latitude"),
        longitude: toNumber("longitude"),
        area,
        slope,
        temperature: temp3 ?? temp9 ?? 25,
        humidity: humidity3 ?? humidity9 ?? 70,
        wind_speed: wind3 ?? wind9 ?? 12,
        pressure: pressure3 ?? pressure9 ?? 1005
    };
}

async function predictCloudburst(event) {
    event.preventDefault();

    try {
        const payload = collectPayload();
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Prediction failed");
        }

        document.getElementById("predictedRainfall").textContent = `${result.predicted_rainfall} mm`;
        document.getElementById("discharge").textContent = result.discharge;
        document.getElementById("hii").textContent = result.hii;
        document.getElementById("riskLevel").textContent = result.risk_level;

        renderChart(result.predicted_rainfall, result.discharge, result.hii);
        marker.bindPopup(`<strong>${result.risk_level} Risk Zone</strong><br>${placeInput.value}`).openPopup();
        map.flyTo([parseFloat(latInput.value), parseFloat(lngInput.value)], 7, { duration: 1.3 });
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

locationSelect.addEventListener("change", async () => {
    const coords = cityCoordinates[locationSelect.value];
    if (!coords) {
        return;
    }

    marker.setLatLng(coords);
    map.flyTo(coords, 7, { duration: 1.1 });
    const place = await resolvePlace(coords[0], coords[1]);
    updateLocationFields(coords[0], coords[1], place || locationSelect.value);
});

document.getElementById("predictForm").addEventListener("submit", predictCloudburst);
initMap();
initWeatherOverlays();

document.querySelectorAll(".layer-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
        const layerName = btn.dataset.layer;

        document.querySelectorAll(".layer-btn").forEach((item) => item.classList.remove("active"));
        btn.classList.add("active");

        switchBaseLayer(layerName);
        activateOverlay(layerName);

        if ((layerName === "radar" || layerName === "precipitation") && !latestRadarPath) {
            setLayerStatus(`${layerName} unavailable (network)`);
        }
    });
});
