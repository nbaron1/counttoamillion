const COLOR_PALETTES: {
  primary: string;
  secondary: string;
  tertiary: string;
}[] = [
  {
    primary: '#6813d3',
    secondary: '#8f35ff',
    tertiary: '#b880ff',
  },
  {
    primary: '#0019F9',
    secondary: '#2B34FF',
    tertiary: '#3F50EE',
  },
  {
    primary: '#D313CC',
    secondary: '#FF58F8',
    tertiary: '#FF74F9',
  },
  {
    primary: '#0C8351',
    secondary: '#0FA868',
    tertiary: '#11C077',
  },
  {
    primary: '#D35813',
    secondary: '#EC7531',
    tertiary: '#EE8144',
  },
];

export const updateColors = () => {
  const randomIndex = Math.floor(Math.random() * COLOR_PALETTES.length);
  const randomColorPalette = COLOR_PALETTES[randomIndex];

  const documentElement = document.body;

  documentElement.style.setProperty('--primary', randomColorPalette.primary);
  documentElement.style.setProperty(
    '--secondary',
    randomColorPalette.secondary
  );
  documentElement.style.setProperty('--tertiary', randomColorPalette.tertiary);
};
