// Paddling regions WaterDrop covers. Each access point / gauge is tagged with a
// region id; the active region drives the map framing and the overview.

export interface Region {
  id: string;
  name: string;
  shortName: string;
  blurb: string;
  center: [number, number]; // [lat, lng] map focus
  zoom: number;
}

export const regions: Region[] = [
  {
    id: 'austin',
    name: 'Austin',
    shortName: 'Austin',
    blurb: 'Lady Bird Lake, Lake Austin, and the Colorado below Longhorn Dam.',
    center: [30.252, -97.715],
    zoom: 12,
  },
  {
    id: 'san-marcos',
    name: 'San Marcos River',
    shortName: 'San Marcos',
    blurb: 'City Park to Luling: spring-fed, clear, and runnable most of the year.',
    center: [29.83, -97.86],
    zoom: 11,
  },
  {
    id: 'hill-country',
    name: 'Hill Country',
    shortName: 'Hill Country',
    blurb: 'Pedernales, Llano, San Gabriel, Blanco, and the Highland Lakes.',
    center: [30.5, -98.3],
    zoom: 9,
  },
  {
    id: 'guadalupe',
    name: 'Guadalupe & Comal',
    shortName: 'Guadalupe',
    blurb: 'The Canyon Lake run, Gruene, New Braunfels, and downstream.',
    center: [29.78, -98.05],
    zoom: 10,
  },
];

export const DEFAULT_REGION = 'austin';

export const regionById = (id: string): Region | undefined =>
  regions.find((r) => r.id === id);
