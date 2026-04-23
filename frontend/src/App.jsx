import React from "react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Bar, Doughnut, Line, Radar } from "react-chartjs-2";
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
const AUTH_SIGNUP_URL = "http://127.0.0.1:5000/auth/signup";
const AUTH_LOGIN_URL = "http://127.0.0.1:5000/auth/login";
const EMAIL_REPORT_URL = "http://127.0.0.1:5000/send-report";
const REPORTS_URL = "http://127.0.0.1:5000/community/reports";
const PREF_URL = "http://127.0.0.1:5000/alerts/preferences";
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

function RiskTag({ level }) {
  const riskClass = `risk-chip ${String(level || "low").toLowerCase()}`;
  return <span className={riskClass}>{level || "LOW"}</span>;
}

export default function App() {
  const [position, setPosition] = useState(INITIAL_POSITION);
  const [place, setPlace] = useState("India");
  const [activeLayer, setActiveLayer] = useState("street");
  const [radarPath, setRadarPath] = useState("");
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authMessage, setAuthMessage] = useState("");
  const [emailReportLoading, setEmailReportLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [reportEmail, setReportEmail] = useState("");
  const [communityFeed, setCommunityFeed] = useState([]);
  const [communityMessage, setCommunityMessage] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [communityForm, setCommunityForm] = useState({
    report_type: "Heavy Rain",
    intensity: "Moderate",
    description: "",
    contact_email: "",
  });
  const [alertPref, setAlertPref] = useState({
    threshold: "High",
    radius_km: "20",
    email_enabled: true,
  });

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

  const updateFormField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateAuthField = (key, value) => setAuthForm((prev) => ({ ...prev, [key]: value }));
  const updateCommunityField = (key, value) => setCommunityForm((prev) => ({ ...prev, [key]: value }));

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
      // allow manual inputs
    }
  };

  const setPoint = async (lat, lng) => {
    setPosition([lat, lng]);
    const placeName = await resolvePlace(lat, lng);
    setPlace(placeName);
    await fetchWeatherForLocation(lat, lng);
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
    return factors.map((factor) => Math.min(100, (factor.value / factor.max) * 100));
  }, [output, payload]);

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

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch(REPORTS_URL);
        const data = await response.json();
        setCommunityFeed(data.reports || []);
      } catch {
        setCommunityFeed([]);
      }
    };
    fetchReports();
  }, []);

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
        body: JSON.stringify({
          ...payload,
          user_id: user?.id ?? null,
          email: (user?.email ?? reportEmail) || null,
        }),
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

  const onAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthMessage("");
    setAuthLoading(true);
    try {
      const endpoint = authMode === "signup" ? AUTH_SIGNUP_URL : AUTH_LOGIN_URL;
      const body =
        authMode === "signup"
          ? { name: authForm.name.trim(), email: authForm.email.trim(), password: authForm.password }
          : { email: authForm.email.trim(), password: authForm.password };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Authentication failed.");
      }
      setUser(result.user);
      setReportEmail(result.user.email);
      setAuthMessage(result.message || "Authentication successful.");
      setAuthForm({ name: "", email: "", password: "" });
    } catch (error) {
      setAuthMessage(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const sendReportEmail = async () => {
    setEmailMessage("");
    if (!output) return setEmailMessage("Run prediction first, then send report.");
    if (!reportEmail.trim()) return setEmailMessage("Please enter an email address.");
    setEmailReportLoading(true);
    try {
      const response = await fetch(EMAIL_REPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id ?? null,
          email: reportEmail.trim(),
          location: payload.location,
          latitude: position[0],
          longitude: position[1],
          prediction: output,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to send email report.");
      setEmailMessage(result.message || "Report email request completed.");
    } catch (error) {
      setEmailMessage(error.message);
    } finally {
      setEmailReportLoading(false);
    }
  };

  const submitCommunityReport = async (event) => {
    event.preventDefault();
    setCommunityMessage("");
    try {
      const response = await fetch(REPORTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...communityForm,
          user_id: user?.id ?? null,
          location: place,
          latitude: position[0],
          longitude: position[1],
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to submit report.");
      setCommunityMessage("Community report submitted.");
      setCommunityFeed((prev) => [result.report, ...prev].slice(0, 20));
      setCommunityForm((prev) => ({ ...prev, description: "" }));
    } catch (error) {
      setCommunityMessage(error.message);
    }
  };

  const saveAlertPreferences = async () => {
    setAlertMessage("");
    try {
      const response = await fetch(PREF_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id ?? null,
          email: (user?.email ?? reportEmail) || null,
          threshold: alertPref.threshold,
          radius_km: Number(alertPref.radius_km),
          email_enabled: alertPref.email_enabled,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save preferences.");
      setAlertMessage(result.message || "Alert preference saved.");
    } catch (error) {
      setAlertMessage(error.message);
    }
  };

  const baseLayerUrl =
    activeLayer === "satellite"
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const showRadar = activeLayer === "radar" && radarPath;
  const showPrecipitation = activeLayer === "precipitation" && radarPath;
  const currentRisk = output?.risk_level || "Low";
  const riskScore = Math.min(100, Math.max(10, Number(output?.hii || 20)));

  const DashboardScreen = (
    <>
      <section className="hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <h1>K L O U D C A S T</h1>
          <p>Live Cloudburst Risk Dashboard</p>
        </div>
      </section>
      <main className="page">
        <section className="card stat-grid">
          <div className="stat-card">
            <h3>Current Risk</h3>
            <RiskTag level={currentRisk} />
            <div className="meter-wrap">
              <div className="meter-fill" style={{ width: `${riskScore}%` }} />
            </div>
          </div>
          <div className="stat-card">
            <h3>Current Weather</h3>
            <p>Temp: {payload.temperature ?? "-"} C</p>
            <p>Humidity: {payload.humidity ?? "-"}%</p>
            <p>Wind: {payload.wind_speed ?? "-"} km/h</p>
          </div>
          <div className="stat-card">
            <h3>Prediction Summary</h3>
            <p>
              {output
                ? `High likelihood window: next 2-4 hours at ${payload.location}.`
                : "Run prediction to generate short-term warning summary."}
            </p>
          </div>
        </section>

        <section className="card">
          <h2>Live Cloudburst Map</h2>
          <p className="muted">Pick location to auto-fetch weather factors and update model inputs.</p>
          <div className="map-shell">
            <aside className="map-panel">
              <h3>Weather Maps</h3>
              {["street", "satellite", "radar", "precipitation"].map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`layer-btn ${activeLayer === name ? "active" : ""}`}
                  onClick={() => setActiveLayer(name)}
                >
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </button>
              ))}
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
        </section>
      </main>
    </>
  );

  const AnalysisScreen = (
    <main className="page page-top">
      <section className="card">
        <h2>Detailed Prediction & Hydrolysis Factors</h2>
        <p className="muted">Use factor inputs, run model, inspect atmospheric and risk composition graphs.</p>
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
                  <option key={city} value={city}>
                    {city}
                  </option>
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
          </div>
          <button type="submit">{loading ? "Predicting..." : "Run Detailed Prediction"}</button>
        </form>
      </section>

      <section className="card">
        <h2>Model Output</h2>
        <div className="result-grid">
          <p>
            <strong>Predicted Rainfall:</strong> {output ? `${output.predicted_rainfall} mm` : "-"}
          </p>
          <p>
            <strong>River Discharge:</strong> {output?.discharge ?? "-"}
          </p>
          <p>
            <strong>Hydrological Impact Index:</strong> {output?.hii ?? "-"}
          </p>
          <p>
            <strong>Risk Level:</strong> <RiskTag level={output?.risk_level || "Low"} />
          </p>
        </div>
        <div className="charts-grid">
          <div className="chart-card">
            <h3>Core Output Graph</h3>
            <Bar
              data={{
                labels: ["Predicted Rainfall", "Discharge", "HII"],
                datasets: [
                  {
                    data: output ? [output.predicted_rainfall, output.discharge, output.hii] : [0, 0, 0],
                    backgroundColor: ["#0ea5e9", "#22c55e", "#f97316"],
                  },
                ],
              }}
              options={{ responsive: true, plugins: { legend: { display: false } } }}
            />
          </div>
          <div className="chart-card">
            <h3>Hydrolysis Influence Factors</h3>
            <Radar
              data={{
                labels: ["Rainfall", "Humidity", "Wind Speed", "Cloud Cover", "Slope", "Area", "Pred Rain"],
                datasets: [
                  {
                    label: "Influence Strength (%)",
                    data: factorPercentages,
                    backgroundColor: "rgba(14, 165, 233, 0.25)",
                    borderColor: "#0284c7",
                  },
                ],
              }}
              options={{ responsive: true, scales: { r: { beginAtZero: true, max: 100 } } }}
            />
          </div>
          <div className="chart-card full-width">
            <h3>Atmospheric Trend</h3>
            <Line
              data={{
                labels: ["T-3h", "T-2h", "T-1h", "Now", "+1h", "+2h", "+3h"],
                datasets: [
                  {
                    label: "CAPE Proxy",
                    borderColor: "#ef4444",
                    data: factorPercentages.map((v, i) => Math.max(0, v - (i % 3) * 4)).slice(0, 7),
                  },
                  {
                    label: "Moisture Proxy",
                    borderColor: "#0ea5e9",
                    data: factorPercentages.map((v, i) => Math.min(100, v + (i % 4) * 3)).slice(0, 7),
                  },
                ],
              }}
              options={{ responsive: true }}
            />
          </div>
          <div className="chart-card full-width">
            <h3>Risk Composition</h3>
            <Doughnut
              data={{
                labels: ["Risk Influence", "Safety Margin"],
                datasets: [
                  {
                    data: [Math.min(100, output?.hii || 0), Math.max(0, 100 - Math.min(100, output?.hii || 0))],
                    backgroundColor: ["#ef4444", "#dbeafe"],
                    borderWidth: 0,
                  },
                ],
              }}
              options={{ responsive: true, cutout: "70%" }}
            />
          </div>
        </div>
      </section>
    </main>
  );

  const CommunityScreen = (
    <main className="page page-top">
      <section className="card auth-card">
        <h2>User Login / Signup</h2>
        <div className="auth-switch">
          <button
            type="button"
            className={`tab-btn ${authMode === "login" ? "active-tab" : ""}`}
            onClick={() => setAuthMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={`tab-btn ${authMode === "signup" ? "active-tab" : ""}`}
            onClick={() => setAuthMode("signup")}
          >
            Signup
          </button>
        </div>
        <form className="auth-form" onSubmit={onAuthSubmit}>
          {authMode === "signup" && (
            <label>
              Full Name
              <input
                type="text"
                value={authForm.name}
                onChange={(e) => updateAuthField("name", e.target.value)}
                required
              />
            </label>
          )}
          <label>
            Email
            <input
              type="email"
              value={authForm.email}
              onChange={(e) => updateAuthField("email", e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={authForm.password}
              onChange={(e) => updateAuthField("password", e.target.value)}
              required
            />
          </label>
          <button type="submit">
            {authLoading ? "Please wait..." : authMode === "signup" ? "Create Account" : "Login"}
          </button>
        </form>
        {authMessage && <p className="status-text">{authMessage}</p>}
      </section>

      <section className="card email-card">
        <h2>Email Weather Report</h2>
        <div className="email-row">
          <input
            type="email"
            placeholder="Enter email to receive report"
            value={reportEmail}
            onChange={(e) => setReportEmail(e.target.value)}
          />
          <button type="button" onClick={sendReportEmail}>
            {emailReportLoading ? "Sending..." : "Send Weather Data"}
          </button>
        </div>
        {emailMessage && <p className="status-text">{emailMessage}</p>}
      </section>

      <section className="card">
        <h2>Community Report Submission</h2>
        <form className="form-grid two-col" onSubmit={submitCommunityReport}>
          <label>
            Report Type
            <select
              value={communityForm.report_type}
              onChange={(e) => updateCommunityField("report_type", e.target.value)}
            >
              <option>Heavy Rain</option>
              <option>Rapid Stream Rise</option>
              <option>Lightning Strike</option>
              <option>Cloudburst Sign</option>
            </select>
          </label>
          <label>
            Intensity
            <select
              value={communityForm.intensity}
              onChange={(e) => updateCommunityField("intensity", e.target.value)}
            >
              <option>Low</option>
              <option>Moderate</option>
              <option>High</option>
              <option>Severe</option>
            </select>
          </label>
          <label className="full-width">
            Description
            <input
              type="text"
              value={communityForm.description}
              onChange={(e) => updateCommunityField("description", e.target.value)}
              placeholder="Describe your observation"
              required
            />
          </label>
          <label>
            Contact Email
            <input
              type="email"
              value={communityForm.contact_email}
              onChange={(e) => updateCommunityField("contact_email", e.target.value)}
            />
          </label>
          <button type="submit">Submit Report</button>
        </form>
        {communityMessage && <p className="status-text">{communityMessage}</p>}
      </section>

      <section className="card">
        <h2>Alert Preferences</h2>
        <div className="form-grid two-col">
          <label>
            Risk Threshold
            <select
              value={alertPref.threshold}
              onChange={(e) => setAlertPref((prev) => ({ ...prev, threshold: e.target.value }))}
            >
              <option>Moderate</option>
              <option>High</option>
              <option>Severe</option>
            </select>
          </label>
          <label>
            Radius (km)
            <input
              type="number"
              value={alertPref.radius_km}
              onChange={(e) => setAlertPref((prev) => ({ ...prev, radius_km: e.target.value }))}
            />
          </label>
          <label>
            Email Alerts
            <select
              value={String(alertPref.email_enabled)}
              onChange={(e) =>
                setAlertPref((prev) => ({ ...prev, email_enabled: e.target.value === "true" }))
              }
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </label>
          <button type="button" onClick={saveAlertPreferences}>
            Save Preferences
          </button>
        </div>
        {alertMessage && <p className="status-text">{alertMessage}</p>}
      </section>

      <section className="card">
        <h2>Community Feed</h2>
        <div className="feed-list">
          {communityFeed.length === 0 ? (
            <p className="muted">No reports yet.</p>
          ) : (
            communityFeed.map((item) => (
              <div key={item.id || `${item.report_type}-${item.created_at}`} className="feed-item">
                <strong>{item.report_type}</strong> - {item.intensity} at {item.location}
                <p>{item.description}</p>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );

  return (
    <>
      <header className="topbar">
        <div className="logo-wrap">
          <div className="logo-icon" />
          <span className="logo-text">KLOUDCAST</span>
        </div>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/analysis">Detailed Analysis</NavLink>
          <NavLink to="/community">Alerts & Community</NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={DashboardScreen} />
        <Route path="/analysis" element={AnalysisScreen} />
        <Route path="/community" element={CommunityScreen} />
      </Routes>
    </>
  );
}
