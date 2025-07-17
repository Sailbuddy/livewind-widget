// netlify/functions/winddata.js
const axios = require("axios");

exports.handler = async function (event, context) {
  const apiKey = process.env.METEOSTAT_API_KEY;
  const station = event.queryStringParameters.station || "16108";

  // Dynamischer Zeitbereich: letzte 36 Stunden bis jetzt
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const startDate = new Date(now.getTime() - 36 * 60 * 60 * 1000);
  const start = startDate.toISOString().slice(0, 10);

  try {
    const response = await axios.get("https://meteostat.p.rapidapi.com/stations/hourly", {
      params: {
        station,
        start,
        end,
        tz: "UTC"
      },
      headers: {
        "x-rapidapi-host": "meteostat.p.rapidapi.com",
        "x-rapidapi-key": apiKey
      }
    });

    const data = response.data?.data;
    if (!data || data.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Keine aktuellen Winddaten verfügbar.", fallback: true })
      };
    }

    const pastEntries = data.filter(entry => new Date(entry.time) <= now);
    const lastValid = pastEntries[pastEntries.length - 1];

    if (!lastValid) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Noch keine Messwerte vor dem aktuellen Zeitpunkt vorhanden.", fallback: true })
      };
    }

    // Korrekte Umrechnung: km/h → kn (1 kn = 1.852 km/h)
    const wspd_knots = lastValid.wspd ? (lastValid.wspd / 1.852).toFixed(1) : null;
    const wpgt_knots = lastValid.wpgt ? (lastValid.wpgt / 1.852).toFixed(1) : null;
    const timeLocal = new Date(lastValid.time).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });

    return {
      statusCode: 200,
      body: JSON.stringify({
        time: timeLocal,
        wspd_knots,
        wpgt_knots,
        wdir: lastValid.wdir,
        rhum: lastValid.rhum,
        coco: lastValid.coco
      })
    };
  } catch (error) {
    console.error("❌ Fehler beim Abruf:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Fehler beim Abruf der Winddaten.", fallback: true })
    };
  }
};
