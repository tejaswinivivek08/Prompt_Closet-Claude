/**
 * Weather Service — OpenWeatherMap free tier integration
 * Returns Singapore weather with clothing-relevant metrics.
 */

export interface WeatherData {
  temperature: number; // Celsius
  feelsLike: number;
  humidity: number; // percentage
  description: string;
  icon: string;
  city: string;
  isRainy: boolean;
  isHumid: boolean; // >70%
  isHot: boolean; // >30°C
  isCool: boolean; // <22°C
  windSpeed: number; // m/s
}

// Singapore default coordinates
const SINGAPORE_LAT = 1.3521;
const SINGAPORE_LON = 103.8198;

export async function getCurrentWeather(
  apiKey: string,
  lat: number = SINGAPORE_LAT,
  lon: number = SINGAPORE_LON,
): Promise<WeatherData> {
  const url =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data = await response.json();

  const temp = data.main.temp;
  const humidity = data.main.humidity;
  const weather = data.weather[0];

  return {
    temperature: Math.round(temp),
    feelsLike: Math.round(data.main.feels_like),
    humidity,
    description: weather.description,
    icon: weather.icon,
    city: data.name,
    isRainy:
      weather.main === "Rain" ||
      weather.main === "Drizzle" ||
      weather.main === "Thunderstorm",
    isHumid: humidity > 70,
    isHot: temp > 30,
    isCool: temp < 22,
    windSpeed: data.wind.speed,
  };
}

/**
 * Generate a weather-aware outfit context string for Magic Bar queries.
 */
export function weatherToQuery(weather: WeatherData): string {
  const parts: string[] = [];

  if (weather.isRainy) {
    parts.push("rainy weather, waterproof or quick-dry fabric");
  }
  if (weather.isHot) {
    parts.push("hot weather, breathable light fabric");
  }
  if (weather.isCool) {
    parts.push("cool weather, layered look");
  }
  if (weather.isHumid && !weather.isRainy) {
    parts.push("humid conditions, moisture-wicking fabric");
  }

  if (parts.length === 0) {
    parts.push("comfortable room temperature");
  }

  return parts.join(", ");
}

/**
 * Get the weather icon URL from OpenWeatherMap.
 */
export function getWeatherIconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}
