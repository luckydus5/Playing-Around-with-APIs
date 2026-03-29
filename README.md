# EcoBreathe - Real-time Global Air Quality Index (AQI) Health Monitor

EcoBreathe is a feature-rich web application that monitors real-time Air Quality Index (AQI) levels across the globe. It helps users especially vulnerable groups like asthmatics, the elderly, children, and athletes make informed decisions about outdoor activities based on live environmental data.

The application connects to the [World Air Quality Index (WAQI) API](https://aqicn.org/api/) to fetch city-specific atmospheric data and presents it through an intuitive, interactive dashboard.

---

## Table of Contents

- [System Overview](#system-overview)
- [How It Works (Detailed)](#how-it-works-detailed)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Credits](#credits)

---

## System Overview

EcoBreathe operates as a client-side web application that communicates directly with the WAQI API. When a user searches for a city, the app sends a request to the WAQI Search endpoint, receives a list of air quality monitoring stations matching that query, and renders them as interactive, color-coded cards on a responsive dashboard.

### Data Flow

```
User enters a city name (e.g., "Tokyo")
        |
        v
Frontend sends HTTPS request to WAQI Search API
   (https://api.waqi.info/search/?keyword=Tokyo&token=...)
        |
        v
WAQI API returns JSON array of matching stations
   Each station includes: AQI value, station name, coordinates, timestamp
        |
        v
Frontend stores the station array in memory
        |
        v
Filter & Sort engine processes the data
   - Filters by risk level (Good / Moderate / Unhealthy)
   - Sorts by AQI (highest-first or lowest-first)
        |
        v
Render engine creates station cards in the results grid
   - Color-coded by AQI severity
   - Each card shows: station name, AQI number, category label, gauge bar, timestamp
        |
        v
User can click "Details" on any card
        |
        v
Frontend sends HTTPS request to WAQI Station Feed API
   (https://api.waqi.info/feed/@{stationId}/?token=...)
        |
        v
WAQI API returns detailed data:
   - Individual pollutant readings (PM2.5, PM10, O3, NO2, SO2, CO)
   - Multi-day forecast (avg, min, max per day)
   - Weather conditions (temperature, humidity, wind, pressure)
        |
        v
Modal opens showing:
   - Health advice tailored to the AQI level
   - Pollutant breakdown with colored bar chart
   - Line chart forecast for upcoming days
```

---

## How It Works (Detailed)

### 1. City Search

When the user types a city name and clicks **Check Data**, the app calls the WAQI Search API. This returns all monitoring stations that match the keyword for example, searching "London" returns stations across Greater London, each with its own AQI reading. The results are stored in memory so that filtering and sorting can happen instantly without re-fetching.

### 2. AQI Color Classification

Every station's AQI value is classified into one of six severity levels, each with a distinct color following the international AQI standard:

| AQI Range | Category                    | Color   | Meaning                                      |
|-----------|-----------------------------|---------|----------------------------------------------|
| 0–50      | Good                        | Green   | Air quality is satisfactory                  |
| 51–100    | Moderate                    | Yellow  | Acceptable, but sensitive individuals at risk |
| 101–150   | Unhealthy for Sensitive Groups | Orange | Children, elderly, and respiratory patients should limit outdoor activity |
| 151–200   | Unhealthy                   | Red     | Everyone may experience health effects        |
| 201–300   | Very Unhealthy              | Purple  | Health alert: everyone at serious risk        |
| 300+      | Hazardous                   | Maroon  | Health emergency: entire population affected  |

### 3. Filtering & Sorting

Users can filter results by risk level (e.g., show only "Unhealthy" stations) and sort by AQI value (most polluted first or cleanest first). These operations run entirely on the client no additional API calls are made. The raw station data stays in memory, and the UI re-renders based on the selected filter/sort combination.

### 4. Station Detail Modal

Clicking **Details** on any station card opens a detailed modal that fetches the station's full feed from the WAQI API. This modal displays three sections:

- **Health Recommendations**: Actionable advice based on the AQI level what to do, what to avoid, whether to wear a mask, whether it's safe to exercise outdoors.
- **Pollutant Breakdown**: Individual readings for PM2.5, PM10, O3 (ozone), NO2 (nitrogen dioxide), SO2 (sulfur dioxide), and CO (carbon monoxide), displayed as horizontal colored bars with numeric values.
- **AQI Forecast Chart**: A Chart.js line graph showing the predicted AQI for the next 5–9 days, with three lines average, maximum, and minimum so users can plan ahead.

### 5. Interactive Map

The Live AQI Map uses Leaflet.js with OpenStreetMap tiles. When expanded, it plots every station from the current search results as a colored circle marker on the world map. Marker colors correspond to the AQI severity level. Clicking a marker shows a popup with the station name and AQI. The map automatically zooms to fit all markers.

### 6. Geolocation (Use My Location)

The crosshairs button next to the search bar requests the browser's Geolocation API. Once GPS coordinates are obtained, the app calls the WAQI Geo Feed API (`/feed/geo:lat;lng/`) to find the nearest monitoring station and displays its data. This is especially useful for travelers or people who don't know the name of their nearest monitoring station.

### 7. City Comparison

The Compare feature lets users enter two city names side by side and see their AQI values compared visually. Both cities are fetched in parallel using `Promise.all`, and the results are rendered as two large cards showing the AQI number and category for each city.

### 8. Favorites (Saved Cities)

Users can click the heart icon on any station card to bookmark it. Favorites are stored in the browser's `localStorage` and persist across sessions. The favorites drawer (accessible from the header bookmark icon) shows all saved cities as clickable chips clicking one immediately searches for that city. Users can also remove cities from favorites.

### 9. Dark Mode

A theme toggle in the header switches between light and dark mode. The preference is saved in `localStorage`. Dark mode uses a deep green/charcoal palette that's comfortable for nighttime use while maintaining the environmental aesthetic. All components (cards, modals, charts, maps) adapt to the selected theme.

### 10. Auto-Refresh

When enabled, the app automatically re-fetches data for the current city every 5 minutes. A visible countdown timer shows seconds until the next refresh. This is useful for users monitoring a location throughout the day for example, checking if air quality improves in the afternoon.

### 11. Toast Notifications

Instead of intrusive alert boxes, the app uses subtle slide-in toast notifications in the bottom-right corner. These appear for 3 seconds and indicate actions like successful data fetches, favorites added/removed, errors, and auto-refresh status changes.

### 12. Skeleton Loading

While data is being fetched, the results grid shows animated placeholder cards (skeleton screens) that mimic the shape of real station cards. This provides better perceived performance than a simple spinner and tells the user that content is on its way.

### 13. AQI Gauge Bar

Each station card includes a thin progress bar below the AQI display. The bar fills proportionally (AQI / 500) and is colored to match the severity level, giving users an at-a-glance visual indicator of how severe the reading is relative to the maximum scale.

---

## Features

| Feature | Description |
|---------|-------------|
| City Search | Search for air quality monitoring stations by city name |
| AQI Cards | Color-coded station cards with AQI value, category label, and timestamp |
| Risk Filtering | Filter stations by health risk level (Good / Moderate / Unhealthy) |
| AQI Sorting | Sort results by highest or lowest AQI |
| Station Details | Modal with health advice, pollutant breakdown, and forecast chart |
| Pollutant Breakdown | Individual PM2.5, PM10, O3, NO2, SO2, CO readings with bar visualization |
| AQI Forecast | Chart.js line graph showing multi-day AQI predictions (avg/min/max) |
| Interactive Map | Leaflet.js world map with color-coded station markers |
| Geolocation | Auto-detect user location and show nearest station |
| City Comparison | Compare AQI between two cities side by side |
| Favorites | Bookmark cities to localStorage for quick access |
| Dark Mode | Toggle dark/light theme with persistent preference |
| Auto-Refresh | Automatic data refresh every 5 minutes with countdown timer |
| Toast Notifications | Non-intrusive slide-in notifications for user feedback |
| Skeleton Loading | Animated placeholder cards during data fetching |
| AQI Gauge Bar | Visual progress indicator on each station card |
| Responsive Design | Mobile-first layout that works on all screen sizes |
| Sticky Header | Header stays visible while scrolling through results |

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Markup | HTML5 | Semantic page structure |
| Styling | CSS3 (Custom Properties) | Theming, responsive layout, animations |
| Logic | Vanilla JavaScript (ES6+) | All client-side interactivity |
| Mapping | Leaflet.js 1.9.4 | Interactive map with OpenStreetMap tiles |
| Charts | Chart.js 4.4.0 | AQI forecast line charts |
| Icons | Font Awesome 6.4.0 | UI icons throughout the app |
| Data API | WAQI API | Real-time air quality data from worldwide stations |
| Backend (optional) | Node.js + Express | Proxy server for secure API key management |

---

## Project Structure

```
Playing Around with APIs/
├── public/
│   ├── index.html          # Main application page
│   ├── app.js              # All client-side logic (770+ lines)
│   ├── style.css           # Complete styling with dark mode support
│   └── inde.html           # (unused test file)
├── server.js               # Express backend (optional for secure API key proxying)
├── package.json            # Node.js dependencies
├── .env                    # Environment variables (API key, port)
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

---

## Getting Started

### Option 1: Live Server Only (Simplest)

This is the quickest way no Node.js required.

1. Open the project folder in **VS Code**
2. Right-click `public/index.html` and select **Open with Live Server**
3. The app loads in your browser and works immediately

> Note: This mode calls the WAQI API directly from the browser.

### Option 2: Node.js Backend (Production / Secure)

Use this for production deployments where you want to hide the API key from the client.

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure `.env`:**
   ```env
   WAQI_API_KEY=your_token_here
   PORT=3000
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. Open `http://localhost:3000` in your browser.

### Getting a WAQI API Token

1. Visit [aqicn.org/data-platform/token](https://aqicn.org/data-platform/token/)
2. Register with your email
3. You'll receive a free API token immediately

---

## Deployment

This section details how the application is deployed to a distributed, highly-available architecture using three servers: two application servers and one load balancer.

### Server Details
| Server Role | Server Name | IP Address |
| ----------- | ----------- | ---------- |
| Web Server 1| web-01 | `<WEB01_IP_ADDRESS>` |
| Web Server 2| web-02 | `<WEB02_IP_ADDRESS>` |
| Load Balancer| lb-01 | `<LB_IP_ADDRESS>` |

### Server Architecture

```text
                    ┌──────────────┐
                    │   Internet   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Lb-01 (LB)  │
                    │   <LB_IP>    │
                    └──┬────────┬──┘
                       │        │
              ┌────────▼──┐ ┌──▼────────┐
              │  Web-01   │ │  Web-02   │
              │ <WEB_01>  │ │ <WEB_02>  │
              │ Node+Nginx│ │ Node+Nginx│
              └───────────┘ └───────────┘
```

- **Web01 & Web02**: Express servers running the Node app, managed by PM2, and served behind Nginx reverse proxies.
- **Lb01**: Nginx acting as a load balancer distributing incoming traffic sequentially (Round-Robin) between Web01 and Web02.

### Step 1: Deploying to Web Servers (Web01 & Web02)

Connect to both **web-01** and **web-02** via SSH and execute the following steps on **each** server:

1. **Install Dependencies**
   ```bash
   sudo apt-get update
   sudo apt-get install -y nodejs npm git nginx
   ```

2. **Clone the Repository**
   ```bash
   cd /var/www/html
   sudo git clone https://github.com/luckydus5/Playing-Around-with-APIs.git ecobreathe
   cd ecobreathe
   ```

3. **Install Node Modules & Configure Environment**
   ```bash
   sudo npm install
   
   # Create environment file to protect API Keys
   sudo nano .env
   # Add: WAQI_API_KEY=your_waqi_api_token
   # Add: PORT=3000
   ```

4. **Start Application with PM2**
   To keep the application running continuously in the background:
   ```bash
   sudo npm install -g pm2
   pm2 start server.js --name "ecobreathe"
   pm2 startup
   pm2 save
   ```

5. **Configure Nginx Reverse Proxy**
   Replace the default Nginx configuration to forward port 80 traffic to our Node app running on port 3000.
   ```bash
   sudo nano /etc/nginx/sites-available/default
   ```
   Add:
   ```nginx
   server {
       listen 80;
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   Restart Nginx to apply changes:
   ```bash
   sudo systemctl restart nginx
   ```

### Step 2: Configuring the Load Balancer (Lb01)

Connect to the load balancer **lb-01** via SSH context:

1. **Install Nginx**
   ```bash
   sudo apt-get update
   sudo apt-get install -y nginx
   ```

2. **Configure Nginx for Load Balancing**
   Open the Nginx default config:
   ```bash
   sudo nano /etc/nginx/sites-available/default
   ```
   Replace its contents with an upstream cluster configuration pointing to the IPs of the two web servers:
   ```nginx
   upstream ecobreathe_cluster {
       server <WEB01_IP_ADDRESS>;   # Web-01
       server <WEB02_IP_ADDRESS>;  # Web-02
   }

   server {
       listen 80;
       
       location / {
           proxy_pass http://ecobreathe_cluster;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```

3. **Restart Nginx**
   ```bash
   sudo systemctl restart nginx
   ```

### Application Testing & Load Balancer Verification

To test that everything distributes correctly:
1. Open a browser and visit the Load Balancer's IP: `http://<LB_IP_ADDRESS>`
2. Ensure the application loads correctly.
3. *Proof of Load Balancing*: SSH into both `web-01` and `web-02` and monitor their Nginx access logs:
   ```bash
   tail -f /var/log/nginx/access.log
   ```
4. Refresh the page in your browser multiple times. You should see incoming requests alternating evenly (round-robin) between Web01 and Web02's access logs. This guarantees scalability and robustness if one server unexpectedly goes down.
sudo apt-get install -y nginx
sudo nano /etc/nginx/nginx.conf
```

Nginx config for load balancer:
```nginx
http {
    upstream backend_nodes {
        server <IP_OF_WEB01>;
        server <IP_OF_WEB02>;
    }

    server {
        listen 80;
        location / {
            proxy_pass http://backend_nodes;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

```bash
sudo systemctl restart nginx
```

Test by navigating to `http://<Lb01_IP>`.

---

## Credits

- Air quality data provided by the [World Air Quality Index (WAQI) Project](https://aqicn.org/api/)
- Interactive maps powered by [Leaflet.js](https://leafletjs.com/) with [OpenStreetMap](https://www.openstreetmap.org/)
- Forecast charts rendered with [Chart.js](https://www.chartjs.org/)
- UI icons by [Font Awesome](https://fontawesome.com/)
