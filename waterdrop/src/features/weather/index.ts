// Weather feature — public surface for the app orchestrator.
//
// WeatherCard pairs Open-Meteo current conditions with the corridor's river flow
// so a paddler gets a real go/no-go. Mount it in the corridor overview and the
// access-point detail with a [lat, lng] coords prop. Fails soft: the card
// degrades to "unavailable" rather than throwing when the network is down.

export { WeatherCard } from './WeatherCard';
export type { WeatherCardProps } from './WeatherCard';

export { useWeather } from './useWeather';
export type { UseWeatherResult } from './useWeather';

export { fetchWeather, wmoLabel, wmoIcon } from './weather';
export type { WeatherNow } from './weather';
