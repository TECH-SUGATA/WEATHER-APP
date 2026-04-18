// =======================================
//  NIMBUS WEATHER APP — JavaScript Logic
//  API: OpenWeatherMap (Free Tier)
// =======================================

const API_BASE = "https://api.openweathermap.org";
let apiKey =  "72fc6e50b083ab77234d0b237c920410";
let isCelsius = true;
let currentWeatherData = null;
let currentForecastData = null;
let currentAQIData = null;
let rainCanvas, rainCtx, rainDrops = [];
let rainAnimFrame;

// ─────────────────────────────────────
// DOM ELEMENTS
// ─────────────────────────────────────
const $ = id => document.getElementById(id);
const apiModal = $("apiModal");
const apiKeyInput = $("apiKeyInput");
const saveApiKeyBtn = $("saveApiKey");
const searchInput = $("searchInput");
const searchBtn = $("searchBtn");
const geoBtn = $("geoBtn");
const themeBtn = $("themeBtn");
const unitToggle = $("unitToggle");
const unitLabel = $("unitLabel");
const changeKeyBtn = $("changeKeyBtn");
const suggestionsBox = $("suggestionsBox");
const loadingOverlay = $("loadingOverlay");
const mainContent = $("mainContent");
const errorToast = $("errorToast");
const appBody = $("app-body");

// ─────────────────────────────────────
// INIT
// ─────────────────────────────────────
function init() {
  if (!apiKey) {
    apiModal.classList.remove("hidden");
  } else {
    apiModal.classList.add("hidden");
    fetchWeather("Kolkata");
  }
}

// ─────────────────────────────────────
// API KEY MANAGEMENT
// ─────────────────────────────────────
saveApiKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key || key.length < 20) {
    showError("Please enter a valid API key (min 20 characters).");
    return;
  }
  apiKey = key;
  localStorage.setItem("nimbus_api_key", key);
  apiModal.classList.add("hidden");
  fetchWeather("Kolkata");
});

apiKeyInput.addEventListener("keydown", e => {
  if (e.key === "Enter") saveApiKeyBtn.click();
});

changeKeyBtn.addEventListener("click", () => {
  apiKeyInput.value = apiKey;
  apiModal.classList.remove("hidden");
});

// ─────────────────────────────────────
// SEARCH
// ─────────────────────────────────────
searchBtn.addEventListener("click", doSearch);
searchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") doSearch();
});

function doSearch() {
  const query = searchInput.value.trim();
  if (!query) return;
  suggestionsBox.classList.remove("show");
  fetchWeather(query);
}

let debounceTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  const q = searchInput.value.trim();
  if (q.length < 2) {
    suggestionsBox.classList.remove("show");
    return;
  }
  debounceTimer = setTimeout(() => fetchSuggestions(q), 300);
});

document.addEventListener("click", e => {
  if (!e.target.closest(".search-section")) {
    suggestionsBox.classList.remove("show");
  }
});

async function fetchSuggestions(query) {
  try {
    const res = await fetch(
      `${API_BASE}/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=5&appid=${apiKey}`
    );
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      suggestionsBox.classList.remove("show");
      return;
    }
    suggestionsBox.innerHTML = data.map(place => `
      <div class="suggestion-item" data-lat="${place.lat}" data-lon="${place.lon}" data-name="${place.name}, ${place.country}">
        <i class="fa-solid fa-location-dot"></i>
        <span>${place.name}${place.state ? ', ' + place.state : ''}, ${place.country}</span>
      </div>
    `).join("");
    suggestionsBox.classList.add("show");

    suggestionsBox.querySelectorAll(".suggestion-item").forEach(item => {
      item.addEventListener("click", () => {
        const name = item.dataset.name;
        searchInput.value = name;
        suggestionsBox.classList.remove("show");
        fetchWeatherByCoords(item.dataset.lat, item.dataset.lon, name);
      });
    });
  } catch (e) {
    console.error("Suggestions error:", e);
  }
}

// ─────────────────────────────────────
// GEOLOCATION
// ─────────────────────────────────────

navigator.geolocation.getCurrentPosition(
  async pos => {
    geoBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>';

    const { latitude: lat, longitude: lon } = pos.coords;

    console.log("Lat:", lat, "Lon:", lon); // debug

    try {
      const res = await fetch(
        `${API_BASE}/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${apiKey}`
      );

      const data = await res.json();

      const name = data?.[0]
        ? `${data[0].name}, ${data[0].country}`
        : `${lat.toFixed(2)}, ${lon.toFixed(2)}`;

      searchInput.value = name;

      fetchWeatherByCoords(lat, lon, name);

    } catch {
      fetchWeatherByCoords(lat, lon, `${lat.toFixed(2)}, ${lon.toFixed(2)}`);
    }
  },

  // 🔴 ADD THIS ERROR HANDLER (IMPORTANT)
  (error) => {
    geoBtn.innerHTML = '<i class="fa-solid fa-location-crosshairs"></i>';

    if (error.code === 1) {
      showError("Permission denied. Enable location!");
    } else if (error.code === 2) {
      showError("Location unavailable.");
    } else {
      showError("Location timeout.");
    }

    console.error(error);
  },

  // 🔥 ADD THIS OPTIONS OBJECT (VERY IMPORTANT)
  {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0
  }
);



// ─────────────────────────────────────
// UNIT TOGGLE
// ─────────────────────────────────────
unitToggle.addEventListener("click", () => {
  isCelsius = !isCelsius;
  unitLabel.textContent = isCelsius ? "°C" : "°F";
  if (currentWeatherData) {
    renderWeather(currentWeatherData);
    renderForecast(currentForecastData);
  }
});

// ─────────────────────────────────────
// THEME TOGGLE
// ─────────────────────────────────────
themeBtn.addEventListener("click", () => {
  appBody.classList.toggle("dark-mode");
});

// ─────────────────────────────────────
// FETCH WEATHER BY CITY NAME
// ─────────────────────────────────────
async function fetchWeather(city) {
  showLoading(true);
  try {
    // Geocode
    const geoRes = await fetch(
      `${API_BASE}/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`
    );
    const geoData = await geoRes.json();

    if (!Array.isArray(geoData) || geoData.length === 0) {
      throw new Error(`City "${city}" not found.`);
    }
    const { lat, lon, name, country } = geoData[0];
    await fetchWeatherByCoords(lat, lon, `${name}, ${country}`);
  } catch (err) {
    showLoading(false);
    showError(err.message || "Failed to fetch weather.");
  }
}

// ─────────────────────────────────────
// FETCH WEATHER BY COORDINATES
// ─────────────────────────────────────
async function fetchWeatherByCoords(lat, lon, displayName) {
  showLoading(true);
  try {
    const [currentRes, forecastRes, aqiRes] = await Promise.all([
      fetch(`${API_BASE}/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`),
      fetch(`${API_BASE}/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`),
      fetch(`${API_BASE}/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`)
    ]);

    if (!currentRes.ok) {
      const errData = await currentRes.json();
      throw new Error(errData.message || "API Error. Check your API key.");
    }

    const current = await currentRes.json();
    const forecast = await forecastRes.json();
    const aqi = await aqiRes.json();

    current._displayName = displayName;
    current._lat = lat;
    current._lon = lon;

    currentWeatherData = current;
    currentForecastData = forecast;
    currentAQIData = aqi;

    renderWeather(current);
    renderHourly(forecast);
    renderForecast(forecast);
    renderAQI(aqi);
    renderLocationDetails(current, lat, lon);
    updateBackground(current.weather[0].main);
    updateWeatherEffects(current.weather[0].main);

    showLoading(false);
    mainContent.style.display = "block";
    mainContent.classList.add("show");

  } catch (err) {
    showLoading(false);
    showError(err.message || "Failed to fetch weather data.");
    console.error(err);
  }
}

// ─────────────────────────────────────
// RENDER CURRENT WEATHER
// ─────────────────────────────────────
function renderWeather(data) {
  const temp = convertTemp(data.main.temp);
  const feelsLike = convertTemp(data.main.feels_like);
  const tempMin = convertTemp(data.main.temp_min);
  const tempMax = convertTemp(data.main.temp_max);
  const unit = isCelsius ? "°C" : "°F";

  $("cityName").textContent = data._displayName || data.name;
  $("countryName").textContent = data.sys.country;
  $("currentDate").textContent = formatDate(new Date());
  $("tempValue").textContent = Math.round(temp);
  $("heroUnit").textContent = unit;
  $("weatherDesc").textContent = data.weather[0].description;
  $("feelsLike").textContent = `${Math.round(feelsLike)}${unit}`;
  $("tempMinMax").textContent = `↓ ${Math.round(tempMin)}${unit}  ↑ ${Math.round(tempMax)}${unit}`;

  // Big icon
  $("bigIcon").textContent = getWeatherEmoji(data.weather[0].id, data.weather[0].icon);

  // Sunrise / Sunset
  $("sunrise").textContent = formatTime(data.sys.sunrise, data.timezone);
  $("sunset").textContent = formatTime(data.sys.sunset, data.timezone);

  // Stats
  $("humidity").textContent = `${data.main.humidity}%`;
  $("humidityBar").style.width = `${data.main.humidity}%`;
  $("windSpeed").textContent = `${(data.wind.speed * 3.6).toFixed(1)} km/h`;
  $("windDir").textContent = `↑ ${windDegToDirection(data.wind.deg)} direction`;
  $("pressure").textContent = `${data.main.pressure} hPa`;
  $("visibility").textContent = `${(data.visibility / 1000).toFixed(1)} km`;
  $("clouds").textContent = `${data.clouds.all}%`;
  $("windDeg").textContent = `${data.wind.deg}° (${windDegToDirection(data.wind.deg)})`;
}

// ─────────────────────────────────────
// RENDER HOURLY FORECAST (24h)
// ─────────────────────────────────────
function renderHourly(data) {
  const now = Date.now() / 1000;
  const next24 = data.list.filter(item => item.dt <= now + 86400).slice(0, 8);
  const unit = isCelsius ? "°C" : "°F";

  $("hourlyScroll").innerHTML = next24.map((item, i) => {
    const time = i === 0 ? "Now" : formatHour(item.dt);
    const temp = Math.round(convertTemp(item.main.temp));
    const icon = getWeatherEmoji(item.weather[0].id, item.weather[0].icon);
    const rain = item.pop > 0 ? `💧 ${Math.round(item.pop * 100)}%` : "";
    return `
      <div class="hourly-item ${i === 0 ? 'now' : ''}">
        <span class="hourly-time">${time}</span>
        <span class="hourly-icon">${icon}</span>
        <span class="hourly-temp">${temp}${unit}</span>
        ${rain ? `<span class="hourly-rain">${rain}</span>` : ""}
      </div>
    `;
  }).join("");
}

// ─────────────────────────────────────
// RENDER 5-DAY FORECAST
// ─────────────────────────────────────
function renderForecast(data) {
  const unit = isCelsius ? "°C" : "°F";
  const daily = getDailyForecast(data.list);

  $("forecastList").innerHTML = daily.map(day => `
    <div class="forecast-item">
      <span class="forecast-day">${day.label}</span>
      <span class="forecast-icon">${getWeatherEmoji(day.id, day.icon)}</span>
      <span class="forecast-desc">${day.desc}</span>
      ${day.pop > 0 ? `<span class="forecast-rain">💧 ${Math.round(day.pop * 100)}%</span>` : '<span class="forecast-rain"></span>'}
      <div class="forecast-temps">
        <span class="forecast-max">${Math.round(convertTemp(day.max))}${unit}</span>
        <span class="forecast-min">${Math.round(convertTemp(day.min))}${unit}</span>
      </div>
    </div>
  `).join("");
}

function getDailyForecast(list) {
  const days = {};
  list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const key = date.toDateString();
    if (!days[key]) {
      days[key] = {
        label: formatDay(date),
        max: item.main.temp_max,
        min: item.main.temp_min,
        id: item.weather[0].id,
        icon: item.weather[0].icon,
        desc: item.weather[0].description,
        pop: item.pop || 0,
        count: 1
      };
    } else {
      days[key].max = Math.max(days[key].max, item.main.temp_max);
      days[key].min = Math.min(days[key].min, item.main.temp_min);
      days[key].pop = Math.max(days[key].pop, item.pop || 0);
      days[key].count++;
    }
  });

  return Object.values(days).slice(0, 5);
}

// ─────────────────────────────────────
// RENDER AQI
// ─────────────────────────────────────
function renderAQI(data) {
  if (!data.list || !data.list.length) return;
  const aqi = data.list[0].main.aqi;
  const comps = data.list[0].components;

  const labels = ["", "Good", "Fair", "Moderate", "Poor", "Very Poor"];
  const classes = ["", "aqi-good", "aqi-moderate", "aqi-poor", "aqi-bad", "aqi-bad"];

  $("aqiIndex").textContent = aqi;
  $("aqiIndex").className = `aqi-index ${classes[aqi] || ""}`;
  $("aqiLabel").textContent = labels[aqi] || "Unknown";
  $("aqiLabel").className = `aqi-label ${classes[aqi] || ""}`;

  $("aqiDetails").innerHTML = [
    { name: "PM2.5", val: comps.pm2_5?.toFixed(1) + " μg/m³" },
    { name: "PM10", val: comps.pm10?.toFixed(1) + " μg/m³" },
    { name: "NO₂", val: comps.no2?.toFixed(1) + " μg/m³" },
    { name: "O₃", val: comps.o3?.toFixed(1) + " μg/m³" },
    { name: "SO₂", val: comps.so2?.toFixed(1) + " μg/m³" },
    { name: "CO", val: comps.co?.toFixed(1) + " μg/m³" },
  ].map(c => `
    <div class="aqi-detail-item">
      <span class="aqi-detail-name">${c.name}</span>
      <span class="aqi-detail-value">${c.val}</span>
    </div>
  `).join("");
}

// ─────────────────────────────────────
// RENDER LOCATION DETAILS
// ─────────────────────────────────────
function renderLocationDetails(data, lat, lon) {
  $("locationDetails").innerHTML = [
    { key: "Latitude", val: parseFloat(lat).toFixed(4) + "°" },
    { key: "Longitude", val: parseFloat(lon).toFixed(4) + "°" },
    { key: "Country", val: data.sys.country },
    { key: "Timezone", val: formatTimezone(data.timezone) },
    { key: "Local Time", val: formatLocalTime(data.timezone) },
    { key: "Weather ID", val: `#${data.weather[0].id}` },
  ].map(item => `
    <div class="loc-item">
      <span class="loc-key">${item.key}</span>
      <span class="loc-val">${item.val}</span>
    </div>
  `).join("");
}

// ─────────────────────────────────────
// UPDATE BACKGROUND BY CONDITION
// ─────────────────────────────────────
function updateBackground(condition) {
  const map = {
    Clear: "weather-clear",
    Clouds: "weather-clouds",
    Rain: "weather-rain",
    Drizzle: "weather-rain",
    Thunderstorm: "weather-thunderstorm",
    Snow: "weather-snow",
    Mist: "weather-fog",
    Smoke: "weather-fog",
    Haze: "weather-fog",
    Dust: "weather-fog",
    Fog: "weather-fog",
    Sand: "weather-fog",
    Ash: "weather-fog",
    Squall: "weather-rain",
    Tornado: "weather-thunderstorm"
  };

  appBody.className = "";
  if (appBody.classList.contains("dark-mode")) appBody.classList.add("dark-mode");
  appBody.classList.add(map[condition] || "weather-clear");
}

// ─────────────────────────────────────
// RAIN EFFECT
// ─────────────────────────────────────
function updateWeatherEffects(condition) {
  stopRain();
  if (condition === "Rain" || condition === "Drizzle" || condition === "Thunderstorm") {
    startRain(condition === "Thunderstorm" ? 150 : 80);
  }
}

function startRain(count) {
  if (!rainCanvas) {
    rainCanvas = document.createElement("canvas");
    rainCanvas.className = "rain-canvas";
    document.body.appendChild(rainCanvas);
  }
  rainCanvas.width = window.innerWidth;
  rainCanvas.height = window.innerHeight;
  rainCtx = rainCanvas.getContext("2d");

  rainDrops = Array.from({ length: count }, () => ({
    x: Math.random() * rainCanvas.width,
    y: Math.random() * rainCanvas.height,
    speed: 8 + Math.random() * 10,
    length: 15 + Math.random() * 20,
    opacity: 0.2 + Math.random() * 0.4
  }));

  function draw() {
    rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
    rainDrops.forEach(drop => {
      rainCtx.beginPath();
      rainCtx.moveTo(drop.x, drop.y);
      rainCtx.lineTo(drop.x - 2, drop.y + drop.length);
      rainCtx.strokeStyle = `rgba(174, 214, 241, ${drop.opacity})`;
      rainCtx.lineWidth = 1;
      rainCtx.stroke();
      drop.y += drop.speed;
      if (drop.y > rainCanvas.height) {
        drop.y = -drop.length;
        drop.x = Math.random() * rainCanvas.width;
      }
    });
    rainAnimFrame = requestAnimationFrame(draw);
  }
  draw();
}

function stopRain() {
  if (rainAnimFrame) cancelAnimationFrame(rainAnimFrame);
  if (rainCanvas) {
    rainCanvas.remove();
    rainCanvas = null;
  }
}

window.addEventListener("resize", () => {
  if (rainCanvas) {
    rainCanvas.width = window.innerWidth;
    rainCanvas.height = window.innerHeight;
  }
});

// ─────────────────────────────────────
// HELPERS
// ─────────────────────────────────────
function convertTemp(c) {
  return isCelsius ? c : (c * 9 / 5) + 32;
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });
}

function formatTime(unixTs, tzOffset) {
  const d = new Date((unixTs + tzOffset) * 1000);
  return d.toUTCString().slice(17, 22);
}

function formatLocalTime(tzOffset) {
  const utcNow = Math.floor(Date.now() / 1000);
  const d = new Date((utcNow + tzOffset) * 1000);
  return d.toUTCString().slice(17, 22);
}

function formatHour(ts) {
  return new Date(ts * 1000).toLocaleTimeString("en-US", {
    hour: "numeric", hour12: true
  });
}

function formatDay(date) {
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Today";
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

function formatTimezone(offset) {
  const hrs = Math.floor(Math.abs(offset) / 3600);
  const mins = Math.floor((Math.abs(offset) % 3600) / 60);
  const sign = offset >= 0 ? "+" : "-";
  return `UTC${sign}${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function windDegToDirection(deg) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

function getWeatherEmoji(id, icon) {
  const isNight = icon && icon.endsWith("n");
  if (id >= 200 && id < 300) return "⛈️";
  if (id >= 300 && id < 400) return "🌦️";
  if (id >= 500 && id < 600) {
    if (id === 511) return "🌨️";
    if (id >= 502) return "🌧️";
    return "🌦️";
  }
  if (id >= 600 && id < 700) return "❄️";
  if (id === 701 || id === 741) return "🌫️";
  if (id === 711 || id === 721 || id === 731 || id === 751 || id === 761) return "🌫️";
  if (id === 762) return "🌋";
  if (id === 771) return "💨";
  if (id === 781) return "🌪️";
  if (id === 800) return isNight ? "🌙" : "☀️";
  if (id === 801) return isNight ? "🌙" : "🌤️";
  if (id === 802) return "⛅";
  if (id === 803 || id === 804) return "☁️";
  return "🌡️";
}

// ─────────────────────────────────────
// UI UTILITIES
// ─────────────────────────────────────
function showLoading(show) {
  loadingOverlay.classList.toggle("show", show);
  if (show) mainContent.style.display = "none";
}

let toastTimer;
function showError(msg) {
  errorToast.textContent = msg;
  errorToast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => errorToast.classList.remove("show"), 4000);
}

// ─────────────────────────────────────
// START
// ─────────────────────────────────────
document.addEventListener("DOMContentLoaded", init);





