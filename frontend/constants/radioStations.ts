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
    id: 'nature_forest',
    name: 'Forest Ambience',
    description: 'Sounds of a tranquil forest with birdsong',
    url: 'https://ice.somafm.com/dronezone-128-mp3',
    genre: 'Forest',
    emoji: '\u{1F332}',
  },
  {
    id: 'nature_rain',
    name: 'Gentle Rain',
    description: 'Calming rain and distant thunder',
    url: 'https://ice.somafm.com/fluid-128-mp3',
    genre: 'Rain',
    emoji: '\u{1F327}',
  },
  {
    id: 'nature_ocean',
    name: 'Ocean Waves',
    description: 'Rhythmic waves on a peaceful shore',
    url: 'https://ice.somafm.com/ambient-128-mp3',
    genre: 'Ocean',
    emoji: '\u{1F30A}',
  },
  {
    id: 'nature_night',
    name: 'Night Crickets',
    description: 'Peaceful night sounds with crickets',
    url: 'https://ice.somafm.com/sleep-128-mp3',
    genre: 'Night',
    emoji: '\u{1F319}',
  },
  {
    id: 'nature_birds',
    name: 'Morning Birds',
    description: 'Dawn chorus of birdsong at sunrise',
    url: 'https://ice.somafm.com/spacestation-128-mp3',
    genre: 'Birds',
    emoji: '\u{1F426}',
  },
  {
    id: 'nature_stream',
    name: 'Mountain Stream',
    description: 'Babbling brook in the mountains',
    url: 'https://ice.somafm.com/drone-128-mp3',
    genre: 'Water',
    emoji: '\u{1F3D4}',
  },
  {
    id: 'nature_wind',
    name: 'Wind & Meadow',
    description: 'Gentle wind through meadow grass',
    url: 'https://ice.somafm.com/deepspace-128-mp3',
    genre: 'Wind',
    emoji: '\u{1F343}',
  },
  {
    id: 'nature_cosmos',
    name: 'Starry Night',
    description: 'Deep ambient space for meditation',
    url: 'https://ice.somafm.com/metal-128-mp3',
    genre: 'Cosmos',
    emoji: '\u{2728}',
  },
  {
    id: 'nature_garden',
    name: 'Zen Garden',
    description: 'Peaceful zen garden with water fountain',
    url: 'https://ice.somafm.com/groovesalad-128-mp3',
    genre: 'Zen',
    emoji: '\u{1F33F}',
  },
  {
    id: 'nature_tropical',
    name: 'Tropical Jungle',
    description: 'Exotic sounds of the tropical rainforest',
    url: 'https://ice.somafm.com/lush-128-mp3',
    genre: 'Tropical',
    emoji: '\u{1F334}',
  },
];

export const GOOGLE_PHOTOS_URL = 'https://photos.app.goo.gl/E8frgv5QyePtvHZr5';
export const INSTAGRAM_URL = 'https://www.instagram.com/konon_photographer?igsh=MXJwdGduNXV2aGIzcg==';
export const WEBSITE_URL = 'https://NINSET8.wixsite.com/rare';
export const EMAIL = 'ninset8@gmail.com';
export const APK_DRIVE_URL = 'https://drive.google.com/drive/folders/1LwYDQ90WMq2nN1OEiV58sU15yIQkNOlP?usp=sharing';
