import React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
  Bar,
  Doughnut,
  Radar,
} from "react-chartjs-2";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

const API_URL = "http://127.0.0.1:5000/predict";
const INITIAL_POSITION = [22.9734, 78.6569];

const cityCoordinates = {
  Delhi: [28.6139, 77.209],
  Mumbai: [19.076, 72.8777],
  Chennai: [13.0827, 80.2707],
  Kolkata: [22.5726, 88.3639],
  Bengaluru: [12.9716, 77.5946],
  Hyderabad: [17.385, 78.4867],
  Pune: [18.5204, 73.8567],
  Jaipur: [26.9124, 75.7873],
};

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapMover({ center }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 7, { duration: 1.1 });
  }, [center, map]);
  return null;
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function App() {
  const [position, setPosition] = useState(INITIAL_POSITION);
  const [place, setPlace] = useState("India");
  const [layerStatus, setLayerStatus] = useState("Street");
  const [activeLayer, setActiveLayer] = useState("street");
  const [radarPath, setRadarPath] = useState("");
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    location: "",
    minTemp: "",
    maxTemp: "",
    rainfall: "",
    evaporation: "",
    sunshine: "",
    windGustSpeed: "",
    windSpeed9am: "",
    windSpeed3pm: "",
    humidity9am: "",
    humidity3pm: "",
    pressure9am: "",
    pressure3pm: "",
    temp9am: "",
    temp3pm: "",
    cloud9am: "",
    cloud3pm: "",
    windDir9am: "",
    windDir3pm: "",
    windGustDir: "",
    rainToday: "",
    area: "",
    slope: "",
  });

  const updateFormField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const applyWeather = (weather) => {
    setForm((prev) => ({
      ...prev,
      minTemp: weather.minTemp ?? prev.minTemp,
      maxTemp: weather.maxTemp ?? prev.maxTemp,
      rainfall: weather.rainfall ?? prev.rainfall,
      windGustSpeed: weather.windSpeed ?? prev.windGustSpeed,
      windSpeed9am: weather.windSpeed ?? prev.windSpeed9am,
      windSpeed3pm: weather.windSpeed ?? prev.windSpeed3pm,
      humidity9am: weather.humidity ?? prev.humidity9am,
      humidity3pm: weather.humidity ?? prev.humidity3pm,
      pressure9am: weather.pressure ?? prev.pressure9am,
      pressure3pm: weather.pressure ?? prev.pressure3pm,
      temp9am: weather.temperature ?? prev.temp9am,
      temp3pm: weather.temperature ?? prev.temp3pm,
      cloud9am: weather.cloudCover ?? prev.cloud9am,
      cloud3pm: weather.cloudCover ?? prev.cloud3pm,
    }));
  };

  const resolvePlace = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      return data.display_name || `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`;
    } catch {
      return `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`;
    }
  };

  const fetchWeatherForLocation = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,cloud_cover,precipitation&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
      );
      const data = await response.json();
      const current = data.current || {};
      const daily = data.daily || {};
      applyWeather({
        minTemp: daily.temperature_2m_min?.[0],
        maxTemp: daily.temperature_2m_max?.[0],
        rainfall: current.precipitation,
        windSpeed: current.wind_speed_10m,
        humidity: current.relative_humidity_2m,
        pressure: current.pressure_msl,
        temperature: current.temperature_2m,
        cloudCover: current.cloud_cover,
      });
    } catch {
      // Keep manual input available if API fails.
    }
  };

  const setPoint = async (lat, lng) => {
    setPosition([lat, lng]);
    const placeName = await resolvePlace(lat, lng);
    setPlace(placeName);
    await fetchWeatherForLocation(lat, lng);
  };

  useEffect(() => {
    fetchWeatherForLocation(INITIAL_POSITION[0], INITIAL_POSITION[1]);
  }, []);

  useEffect(() => {
    const loadRadarPath = async () => {
      try {
        const response = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        const data = await response.json();
        const latestRadar = data?.radar?.past?.[data.radar.past.length - 1];
        setRadarPath(latestRadar?.path || "");
      } catch {
        setRadarPath("");
      }
    };
    loadRadarPath();
  }, []);

  const handleLayerClick = (name) => {
    setActiveLayer(name);
    setLayerStatus(name.charAt(0).toUpperCase() + name.slice(1));
  };

  const toNumber = (value) => {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const payload = useMemo(() => {
    const temp9 = toNumber(form.temp9am);
    const temp3 = toNumber(form.temp3pm);
    const humidity9 = toNumber(form.humidity9am);
    const humidity3 = toNumber(form.humidity3pm);
    const wind9 = toNumber(form.windSpeed9am);
    const wind3 = toNumber(form.windSpeed3pm);
    const pressure9 = toNumber(form.pressure9am);
    const pressure3 = toNumber(form.pressure3pm);

    return {
      location: form.location || place,
      min_temp: toNumber(form.minTemp),
      max_temp: toNumber(form.maxTemp),
      rainfall: toNumber(form.rainfall),
      evaporation: toNumber(form.evaporation),
      sunshine: toNumber(form.sunshine),
      wind_gust_speed: toNumber(form.windGustSpeed),
      wind_speed_9am: wind9,
      wind_speed_3pm: wind3,
      humidity_9am: humidity9,
      humidity_3pm: humidity3,
      pressure_9am: pressure9,
      pressure_3pm: pressure3,
      temperature_9am: temp9,
      temperature_3pm: temp3,
      cloud_9am: toNumber(form.cloud9am),
      cloud_3pm: toNumber(form.cloud3pm),
      wind_dir_9am: form.windDir9am,
      wind_dir_3pm: form.windDir3pm,
      wind_gust_dir: form.windGustDir,
      rain_today: form.rainToday,
      latitude: position[0],
      longitude: position[1],
      area: toNumber(form.area),
      slope: toNumber(form.slope),
      temperature: temp3 ?? temp9 ?? 25,
      humidity: humidity3 ?? humidity9 ?? 70,
      wind_speed: wind3 ?? wind9 ?? 12,
      pressure: pressure3 ?? pressure9 ?? 1005,
    };
  }, [form, place, position]);

  const onSubmit = async (event) => {
    event.preventDefault();
    if (payload.rainfall === null || payload.area === null || payload.slope === null) {
      alert("Please enter rainfall, area and slope.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Prediction failed");
      }
      setOutput(result);
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const factorPercentages = useMemo(() => {
    if (!output) return [0, 0, 0, 0, 0, 0, 0];
    const factors = [
      { value: payload.rainfall ?? 0, max: 200 },
      { value: payload.humidity ?? 0, max: 100 },
      { value: payload.wind_speed ?? 0, max: 80 },
      { value: payload.cloud_3pm ?? payload.cloud_9am ?? 0, max: 100 },
      { value: payload.slope ?? 0, max: 70 },
      { value: payload.area ?? 0, max: 200 },
      { value: output.predicted_rainfall ?? 0, max: 200 },
    ];
    return factors.map((f) => Math.min(100, (f.value / f.max) * 100));
  }, [output, payload]);

  const baseLayerUrl =
    activeLayer === "satellite"
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const showRadar = activeLayer === "radar" && radarPath;
  const showPrecipitation = activeLayer === "precipitation" && radarPath;

  return (
    <>
      <header className="topbar">
        <div className="logo-wrap">
          <div className="logo-icon" />
          <span className="logo-text">KLOUDCAST</span>
        </div>
        <nav>
          <a href="#home">Home</a>
          <a href="#live-map">Live Map</a>
          <a href="#predictor">Predictor</a>
        </nav>
      </header>

      <section id="home" className="hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1>K L O U D C A S T</h1>
          <p>Your Weather Safety Companion</p>
          <a href="#predictor" className="hero-btn">Go To Predictor</a>
        </div>
      </section>

      <main className="page">
        <section id="live-map" className="card">
          <h2>Live Cloudburst Map</h2>
          <p className="muted">Click on map to auto-fetch weather factors.</p>
          <div className="map-shell">
            <aside className="map-panel">
              <h3>Weather Maps</h3>
              {["street", "satellite", "radar", "precipitation", "wind", "temperature", "humidity", "pressure"].map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`layer-btn ${activeLayer === name ? "active" : ""}`}
                  onClick={() => handleLayerClick(name)}
                >
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </button>
              ))}
              <p className="layer-status">Layer: {layerStatus}</p>
            </aside>
            <MapContainer center={position} zoom={5} style={{ minHeight: 390 }} id="map">
              <TileLayer url={baseLayerUrl} attribution="Map data providers" />
              {showRadar && (
                <TileLayer
                  url={`https://tilecache.rainviewer.com${radarPath}/256/{z}/{x}/{y}/2/1_1.png`}
                  opacity={0.7}
                />
              )}
              {showPrecipitation && (
                <TileLayer
                  url={`https://tilecache.rainviewer.com${radarPath}/256/{z}/{x}/{y}/4/1_1.png`}
                  opacity={0.72}
                />
              )}
              <Marker
                position={position}
                draggable
                eventHandlers={{
                  dragend: (event) => {
                    const marker = event.target;
                    const { lat, lng } = marker.getLatLng();
                    setPoint(lat, lng);
                  },
                }}
              >
                <Popup>{place}</Popup>
              </Marker>
              <MapClickHandler onMapClick={setPoint} />
              <MapMover center={position} />
            </MapContainer>
          </div>
          <div className="location-grid">
            <label>
              Selected Place
              <input type="text" value={place} readOnly />
            </label>
            <label>
              Latitude
              <input type="number" value={position[0].toFixed(6)} readOnly />
            </label>
            <label>
              Longitude
              <input type="number" value={position[1].toFixed(6)} readOnly />
            </label>
          </div>
        </section>

        <section id="predictor" className="card">
          <h2>Predictor</h2>
          <p className="muted">Cloudburst influence factors (no timing fields).</p>
          <form id="predictForm" onSubmit={onSubmit}>
            <div className="form-grid two-col">
              <label>
                Location
                <select
                  value={form.location}
                  onChange={async (e) => {
                    const value = e.target.value;
                    updateFormField("location", value);
                    if (cityCoordinates[value]) {
                      const [lat, lng] = cityCoordinates[value];
                      await setPoint(lat, lng);
                    }
                  }}
                >
                  <option value="">Select Location</option>
                  {Object.keys(cityCoordinates).map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="form-grid two-col">
              {[
                ["minTemp", "Minimum Temperature"],
                ["maxTemp", "Maximum Temperature"],
                ["rainfall", "Rainfall (mm)"],
                ["evaporation", "Evaporation"],
                ["sunshine", "Sunshine"],
                ["windGustSpeed", "Wind Gust Speed"],
                ["windSpeed9am", "Wind Speed 9am"],
                ["windSpeed3pm", "Wind Speed 3pm"],
                ["humidity9am", "Humidity 9am"],
                ["humidity3pm", "Humidity 3pm"],
                ["pressure9am", "Pressure 9am"],
                ["pressure3pm", "Pressure 3pm"],
                ["temp9am", "Temperature 9am"],
                ["temp3pm", "Temperature 3pm"],
                ["cloud9am", "Cloud 9am"],
                ["cloud3pm", "Cloud 3pm"],
                ["area", "Area (km²)"],
                ["slope", "Slope (degrees)"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    type="number"
                    step="0.1"
                    value={form[key]}
                    onChange={(e) => updateFormField(key, e.target.value)}
                    required={["rainfall", "area", "slope"].includes(key)}
                  />
                </label>
              ))}
              {[
                ["windDir9am", "Wind Direction at 9am"],
                ["windDir3pm", "Wind Direction at 3pm"],
                ["windGustDir", "Wind Gust Direction"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <select value={form[key]} onChange={(e) => updateFormField(key, e.target.value)}>
                    <option value="">Select</option>
                    <option value="N">N</option>
                    <option value="NE">NE</option>
                    <option value="E">E</option>
                    <option value="SE">SE</option>
                    <option value="S">S</option>
                    <option value="SW">SW</option>
                    <option value="W">W</option>
                    <option value="NW">NW</option>
                  </select>
                </label>
              ))}
              <label>
                Rain Today
                <select value={form.rainToday} onChange={(e) => updateFormField("rainToday", e.target.value)}>
                  <option value="">Did it rain today</option>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </label>
            </div>
            <button type="submit" id="predictBtn">{loading ? "Predicting..." : "Predict"}</button>
          </form>
        </section>

        <section className="card output-wrap">
          <h2>Prediction Output</h2>
          <div className="result-grid">
            <p><strong>Predicted Rainfall:</strong> {output ? `${output.predicted_rainfall} mm` : "-"}</p>
            <p><strong>River Discharge:</strong> {output?.discharge ?? "-"}</p>
            <p><strong>Hydrological Impact Index:</strong> {output?.hii ?? "-"}</p>
            <p><strong>Risk Level:</strong> <span id="riskLevel">{output?.risk_level ?? "-"}</span></p>
          </div>
          <div className="charts-grid">
            <div className="chart-card">
              <h3>Core Output Graph</h3>
              <Bar
                data={{
                  labels: ["Predicted Rainfall", "Discharge", "HII"],
                  datasets: [{
                    data: output ? [output.predicted_rainfall, output.discharge, output.hii] : [0, 0, 0],
                    backgroundColor: ["#0ea5e9", "#22c55e", "#f97316"],
                  }],
                }}
                options={{ responsive: true, plugins: { legend: { display: false } } }}
              />
            </div>
            <div className="chart-card">
              <h3>Cloudburst Influence Factors</h3>
              <Radar
                data={{
                  labels: ["Rainfall", "Humidity", "Wind Speed", "Cloud Cover", "Slope", "Area", "Pred Rain"],
                  datasets: [{
                    label: "Influence Strength (%)",
                    data: factorPercentages,
                    backgroundColor: "rgba(14, 165, 233, 0.25)",
                    borderColor: "#0284c7",
                  }],
                }}
                options={{ responsive: true, scales: { r: { beginAtZero: true, max: 100 } } }}
              />
            </div>
            <div className="chart-card full-width">
              <h3>Risk Composition</h3>
              <Doughnut
                data={{
                  labels: ["Risk Influence", "Safety Margin"],
                  datasets: [{
                    data: [Math.min(100, output?.hii || 0), Math.max(0, 100 - Math.min(100, output?.hii || 0))],
                    backgroundColor: ["#ef4444", "#dbeafe"],
                    borderWidth: 0,
                  }],
                }}
                options={{ responsive: true, cutout: "70%" }}
              />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
