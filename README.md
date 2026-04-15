# ⛅ Nimbus — Weather Intelligence App

A fully-featured, professional weather web application with real-time data, stunning glassmorphism UI, and dynamic animated backgrounds.

---

## 🚀 Features

- **Real-time Weather** – Current temperature, description, feels-like, min/max
- **24-Hour Forecast** – Hourly breakdown with rain probability
- **5-Day Forecast** – Daily highs/lows with weather icons
- **Air Quality Index (AQI)** – PM2.5, PM10, NO₂, O₃, SO₂, CO
- **Wind Info** – Speed, direction in compass degrees
- **Humidity, Pressure, Visibility, Cloud Cover**
- **Sunrise & Sunset times**
- **Location Details** – Lat/lon, timezone, local time
- **City Search with Autocomplete**
- **GPS Geolocation** – Use your current location
- **°C / °F Toggle**
- **Dark Mode Toggle**
- **Dynamic Backgrounds** – Change with weather condition
- **Rain Animation Effect** – Canvas-based rain for rainy weather
- **Responsive** – Works on mobile, tablet, and desktop

---

## 🔑 Getting Your Free API Key

1. Visit [https://openweathermap.org/api](https://openweathermap.org/api)
2. Click **Sign Up** and create a free account
3. Go to **API Keys** tab in your dashboard
4. Copy your default key (or generate a new one)
5. **Note:** New keys may take up to **2 hours** to activate

**Free tier includes:**
- Current weather (60 calls/min)
- 5-day/3-hour forecast
- Geocoding API
- Air Pollution API

---

## 🛠️ Setup

### Option 1: Direct Open
Just open `index.html` in any modern browser. No build step needed!

### Option 2: Local Server (Recommended)
```bash
# Python
python -m http.server 8080

# Node.js (npx)
npx serve .

# Then visit http://localhost:8080
```

---

## 📁 File Structure

```
nimbus-weather/
├── index.html       # Main HTML structure
├── style.css        # All styles (glassmorphism, animations, responsive)
├── app.js           # JavaScript logic + API integration
└── README.md        # This file
```

---

## 🌐 APIs Used

| API | Endpoint | Purpose |
|-----|----------|---------|
| Current Weather | `/data/2.5/weather` | Live weather data |
| 5-Day Forecast | `/data/2.5/forecast` | Hourly & daily forecast |
| Air Pollution | `/data/2.5/air_pollution` | AQI + pollutants |
| Geocoding | `/geo/1.0/direct` | City → coordinates |
| Reverse Geocoding | `/geo/1.0/reverse` | Coordinates → city name |

All from **[OpenWeatherMap](https://openweathermap.org)** — free tier.

---

## 🎨 Tech Stack

- **Vanilla HTML5, CSS3, JavaScript** — No frameworks, no dependencies
- **Font Awesome 6.5** – Icons
- **Google Fonts** – Syne (display) + DM Sans (body)
- **OpenWeatherMap API** – Weather data

---

## 📸 Screenshots

The app features:
- Glassmorphism cards with backdrop blur
- Animated floating orbs in the background
- Dynamic gradient backgrounds per weather condition
- Canvas-based rain animation for rainy weather
- Smooth entrance animations for all UI elements

---

## 📝 License

MIT License — Free to use, modify, and distribute.

---

## 👨‍💻 Author

Built with ❤️ using Nimbus Weather Intelligence
