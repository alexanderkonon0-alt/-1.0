export interface RadioStation {
  id: string;
  name: string;
  description: string;
  url: string;
  genre: string;
  emoji: string;
}

export const RADIO_STATIONS: RadioStation[] = [
  {
    id: 'drone_zone',
    name: 'Drone Zone',
    description: 'Atmospheric ambient electronic soundscapes',
    url: 'https://ice.somafm.com/dronezone-128-mp3',
    genre: 'Ambient',
    emoji: '\u{1F30C}',
  },
  {
    id: 'fluid',
    name: 'Fluid',
    description: 'New Age, smooth electronic chillout',
    url: 'https://ice.somafm.com/fluid-128-mp3',
    genre: 'Chill',
    emoji: '\u{1F4A7}',
  },
  {
    id: 'sleep',
    name: 'Sleep.fm',
    description: 'Peaceful ambient music for rest and sleep',
    url: 'https://ice.somafm.com/sleep-128-mp3',
    genre: 'Sleep',
    emoji: '\u{1F319}',
  },
  {
    id: 'groove_salad',
    name: 'Groove Salad',
    description: 'Chilled ambient / downtempo beats and grooves',
    url: 'https://ice.somafm.com/groovesalad-128-mp3',
    genre: 'Downtempo',
    emoji: '\u{1F33F}',
  },
  {
    id: 'space_station',
    name: 'Space Station',
    description: 'Float out: ambient music for deep relaxation',
    url: 'https://ice.somafm.com/spacestation-128-mp3',
    genre: 'Space',
    emoji: '\u{1F680}',
  },
  {
    id: 'deep_space',
    name: 'Deep Space One',
    description: 'Deep ambient electronic from the edges of space',
    url: 'https://ice.somafm.com/deepspaceone-128-mp3',
    genre: 'Deep Ambient',
    emoji: '\u2728',
  },
  {
    id: 'lush',
    name: 'Lush',
    description: 'Sensuous mellow vocals and light electronica',
    url: 'https://ice.somafm.com/lush-128-mp3',
    genre: 'Lush',
    emoji: '\u{1F33A}',
  },
  {
    id: 'the_trip',
    name: 'The Trip',
    description: 'Progressive exploratory electronica for late nights',
    url: 'https://ice.somafm.com/thetrip-128-mp3',
    genre: 'Electronic',
    emoji: '\u{1F3B6}',
  },
  {
    id: 'suburbs_goa',
    name: 'Suburbs of Goa',
    description: 'Goa, psy-trance and world beats',
    url: 'https://ice.somafm.com/suburbsofgoa-128-mp3',
    genre: 'Goa Trance',
    emoji: '\u{1F334}',
  },
  {
    id: 'mission_control',
    name: 'Mission Control',
    description: 'Ambient space music for the soul',
    url: 'https://ice.somafm.com/missioncontrol-128-mp3',
    genre: 'Zen',
    emoji: '\u{1F30A}',
  },
];

export const STATION_URLS_ORDERED = RADIO_STATIONS.map(s => s.url);

export const GOOGLE_PHOTOS_URL = 'https://photos.app.goo.gl/E8frgv5QyePtvHZr5';
export const INSTAGRAM_URL = 'https://www.instagram.com/konon_photographer?igsh=MXJwdGduNXV2aGIzcg==';
export const WEBSITE_URL = 'https://NINSET8.wixsite.com/rare';
export const EMAIL = 'ninset8@gmail.com';
export const APK_DRIVE_URL = 'https://drive.google.com/drive/folders/1LwYDQ90WMq2nN1OEiV58sU15yIQkNOlP?usp=sharing';
