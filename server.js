const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.static('public'));

// Search stations by city name
app.get('/api/air-quality', async (req, res) => {
    try {
        const { city } = req.query;
        if (!city) {
            return res.status(400).json({ error: 'City parameter is required.' });
        }

        const apiKey = process.env.WAQI_API_KEY;
        if (!apiKey || apiKey === "demo_key_replace_me") {
            return res.status(500).json({
                error: 'WAQI_API_KEY is missing or invalid in server environment. Please define it in the .env file.'
            });
        }

        const url = `https://api.waqi.info/search/?token=${apiKey}&keyword=${encodeURIComponent(city)}`;
        const response = await axios.get(url);

        if (response.data.status === 'error') {
            throw new Error(response.data.data || 'Unknown API Error');
        }

        res.json(response.data);
    } catch (error) {
        console.error('Server Integration Error:', error.message);
        res.status(500).json({ error: 'Failed to communicate with Air Quality sensors. Please try again.' });
    }
});

// Get detailed station data (pollutants, forecast) by station ID or @stationId
app.get('/api/station/:id', async (req, res) => {
    try {
        const stationId = req.params.id;
        const apiKey = process.env.WAQI_API_KEY;
        if (!apiKey || apiKey === "demo_key_replace_me") {
            return res.status(500).json({ error: 'WAQI_API_KEY is missing or invalid.' });
        }

        const url = `https://api.waqi.info/feed/@${stationId}/?token=${apiKey}`;
        const response = await axios.get(url);

        if (response.data.status === 'error') {
            throw new Error(response.data.data || 'Unknown API Error');
        }

        res.json(response.data);
    } catch (error) {
        console.error('Station detail error:', error.message);
        res.status(500).json({ error: 'Failed to fetch station details.' });
    }
});

// Get nearest station by geo coordinates
app.get('/api/geo', async (req, res) => {
    try {
        const { lat, lng } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ error: 'lat and lng parameters are required.' });
        }

        const apiKey = process.env.WAQI_API_KEY;
        if (!apiKey || apiKey === "demo_key_replace_me") {
            return res.status(500).json({ error: 'WAQI_API_KEY is missing or invalid.' });
        }

        const url = `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${apiKey}`;
        const response = await axios.get(url);

        if (response.data.status === 'error') {
            throw new Error(response.data.data || 'Unknown API Error');
        }

        res.json(response.data);
    } catch (error) {
        console.error('Geo lookup error:', error.message);
        res.status(500).json({ error: 'Failed to fetch air quality for your location.' });
    }
});

// Get map bounds data for multiple stations
app.get('/api/map-stations', async (req, res) => {
    try {
        const { lat1, lng1, lat2, lng2 } = req.query;
        const apiKey = process.env.WAQI_API_KEY;
        if (!apiKey || apiKey === "demo_key_replace_me") {
            return res.status(500).json({ error: 'WAQI_API_KEY is missing or invalid.' });
        }

        const url = `https://api.waqi.info/v2/map/bounds/?latlng=${lat1},${lng1},${lat2},${lng2}&networks=all&token=${apiKey}`;
        const response = await axios.get(url);

        if (response.data.status === 'error') {
            throw new Error(response.data.data || 'Unknown API Error');
        }

        res.json(response.data);
    } catch (error) {
        console.error('Map stations error:', error.message);
        res.status(500).json({ error: 'Failed to fetch map station data.' });
    }
});

app.listen(PORT, () => {
    console.log(`EcoBreathe Server active on http://localhost:${PORT}`);
});
