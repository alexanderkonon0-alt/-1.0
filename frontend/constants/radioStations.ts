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
    id: 'soma_drone',
    name: 'Drone Zone',
    description: 'Served ambient + atmospheric soundscapes',
    url: 'https://ice6.somafm.com/dronezone-128-mp3',
    genre: 'Ambient',
    emoji: '\u{1F30C}',
  },
  {
    id: 'soma_deepspace',
    name: 'Deep Space One',
    description: 'Deep ambient electronic, experimental',
    url: 'https://ice4.somafm.com/deepspaceone-128-mp3',
    genre: 'Space',
    emoji: '\u{1F680}',
  },
  {
    id: 'soma_lush',
    name: 'Lush',
    description: 'Serene and lush electronica',
    url: 'https://ice4.somafm.com/lush-128-mp3',
    genre: 'Relaxation',
    emoji: '\u{1F33F}',
  },
  {
    id: 'soma_sleep',
    name: 'Sleep',
    description: 'Sounds for deeper sleep',
    url: 'https://ice1.somafm.com/sleep-128-mp3',
    genre: 'Sleep',
    emoji: '\u{1F319}',
  },
  {
    id: 'soma_groove',
    name: 'Groove Salad',
    description: 'A nicely chilled plate of ambient beats',
    url: 'https://ice6.somafm.com/groovesalad-128-mp3',
    genre: 'Chill',
    emoji: '\u{1F343}',
  },
  {
    id: 'soma_spacestation',
    name: 'Space Station Soma',
    description: 'Tune in, turn on, space out',
    url: 'https://ice6.somafm.com/spacestation-128-mp3',
    genre: 'Space',
    emoji: '\u{2B50}',
  },
  {
    id: 'soma_digitalis',
    name: 'Digitalis',
    description: 'Digitally compressed flower, glitchy',
    url: 'https://ice6.somafm.com/digitalis-128-mp3',
    genre: 'Ambient',
    emoji: '\u{1F49A}',
  },
  {
    id: 'soma_fluid',
    name: 'Fluid',
    description: 'Blurring the lines between genres',
    url: 'https://ice2.somafm.com/fluid-128-mp3',
    genre: 'Electronic',
    emoji: '\u{1F30A}',
  },
  {
    id: 'soma_suburban',
    name: 'Suburban Train',
    description: 'Ambient underground & overground journey',
    url: 'https://ice2.somafm.com/suburbantrain-128-mp3',
    genre: 'Ambient',
    emoji: '\u{1F32B}',
  },
  {
    id: 'soma_beatblend',
    name: 'Beat Blender',
    description: 'Late night blend of deep, electro and tech',
    url: 'https://ice4.somafm.com/beatblender-128-mp3',
    genre: 'Electronic',
    emoji: '\u{2728}',
  },
];

export const GOOGLE_PHOTOS_URL = 'https://photos.app.goo.gl/E8frgv5QyePtvHZr5';
export const INSTAGRAM_URL = 'https://www.instagram.com/konon_photographer?igsh=MXJwdGduNXV2aGIzcg==';
export const WEBSITE_URL = 'https://NINSET8.wixsite.com/rare';
export const EMAIL = 'ninset8@gmail.com';
export const APK_DRIVE_URL = 'https://drive.google.com/drive/folders/1LwYDQ90WMq2nN1OEiV58sU15yIQkNOlP?usp=sharing';
