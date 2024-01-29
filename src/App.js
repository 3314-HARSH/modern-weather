import { useEffect, useState } from "react";

function App() {
  const [location, setLocation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [displayLocation, setDisplayLocation] = useState("");
  const [weather, setWeather] = useState({});

  function convertToFlag(countryCode) {
    const codePoints = countryCode //IN
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  }

  async function fetchWeather(controller) {
    if (location.length < 2) {
      setWeather({});
      return;
    }
    try {
      setIsLoading(true);
      // 1) Getting location (geocoding)
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${location}`,
        { signal: controller.signal }
      );
      const geoData = await geoRes.json();
      // console.log("geoData", geoData);

      if (!geoData.results) throw new Error("Location not found");

      const { latitude, longitude, timezone, name, country_code } =
        geoData.results.at(0);
      // console.log(`${name} ${this.convertToFlag(country_code)}`);
      setDisplayLocation(`${name} ${convertToFlag(country_code)}`);
      // 2) Getting actual weather
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=${timezone}&daily=weathercode,temperature_2m_max,temperature_2m_min`,
        { signal: controller.signal }
      );
      const weatherData = await weatherRes.json();
      // console.log("daily", weatherData.daily);
      setWeather(weatherData.daily);
    } catch (err) {
      if (err.name !== "AbortError") console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(function () {
    let location = localStorage.getItem("location");
    if (location) {
      setLocation(location);
    }
  }, []);

  useEffect(
    function () {
      let controller = new AbortController();
      (async function () {
        await fetchWeather(controller);
        localStorage.setItem("location", location);
      })();

      return function () {
        controller.abort();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location]
  );
  return (
    <div className="app">
      <h1>Modern Weather</h1>
      <Input location={location} onChangeLocation={setLocation} />
      {isLoading && <p>loading....</p>}
      {weather.weathercode && (
        <Weather weather={weather} location={displayLocation} />
      )}
    </div>
  );
}
function Input({ location, onChangeLocation }) {
  return (
    <input
      type="text"
      value={location}
      placeholder="Enter your location..."
      onChange={(e) => onChangeLocation(e.target.value)}
    />
  );
}
function Weather({ weather, location }) {
  const {
    temperature_2m_max: max,
    temperature_2m_min: min,
    time: dates,
    weathercode: codes,
  } = weather;

  return (
    <div>
      <h2>weather {location}</h2>
      <ul className="weather">
        {dates.map((date, i) => (
          <Day
            max={max.at(i)}
            date={date}
            min={min.at(i)}
            code={codes.at(i)}
            isToday={i === 0}
            key={date}
          />
        ))}
      </ul>
    </div>
  );
}

function Day({ max, min, date, code, isToday }) {
  function getWeatherIcon(wmoCode) {
    const icons = new Map([
      [[0], "☀️"],
      [[1], "🌤"],
      [[2], "⛅️"],
      [[3], "☁️"],
      [[45, 48], "🌫"],
      [[51, 56, 61, 66, 80], "🌦"],
      [[53, 55, 63, 65, 57, 67, 81, 82], "🌧"],
      [[71, 73, 75, 77, 85, 86], "🌨"],
      [[95], "🌩"],
      [[96, 99], "⛈"],
    ]);
    const arr = [...icons.keys()].find((key) => key.includes(wmoCode));
    if (!arr) return "NOT FOUND";
    return icons.get(arr);
  }

  function formatDay(dateStr) {
    return new Intl.DateTimeFormat("en", {
      weekday: "short",
    }).format(new Date(dateStr));
  }

  return (
    <li className="day">
      <span>{getWeatherIcon(code)}</span>
      <p>{isToday ? "Today" : formatDay(date)}</p>
      <p>
        {Math.floor(min)}&deg; &mdash; <strong>{Math.ceil(max)}&deg;</strong>
      </p>
    </li>
  );
}
export default App;
