// netlify/functions/winddata.js
const axios = require("axios");


exports.handler = async function (event, context) {
  const apiKey = process.env.METEOSTAT_API_KEY;
  const station = event.queryStringParameters.station || "11643";
  const start = "2025-07-08";
  const end = "2025-07-10";

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

    const now = new Date();
    const pastEntries = data.filter(entry => new Date(entry.time) <= now);
    const lastValid = pastEntries[pastEntries.length - 1];

    if (!lastValid) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Noch keine Messwerte vor dem aktuellen Zeitpunkt vorhanden.", fallback: true })
      };
    }

    const wspd_knots = lastValid.wspd ? (lastValid.wspd * 1.94384).toFixed(1) : null;
    const timeLocal = new Date(lastValid.time).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });

    return {
      statusCode: 200,
      body: JSON.stringify({
        time: timeLocal,
        wspd_knots,
        wdir: lastValid.wdir,
        rhum: lastValid.rhum,
        wpgt: lastValid.wpgt,
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
