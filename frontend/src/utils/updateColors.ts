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
    primary: '#0F28A8',
    secondary: '#2830EE',
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
  const body = document.body;

  const currentColorPalette = COLOR_PALETTES.findIndex((colorPalette) => {
    return (
      body.style.getPropertyValue('--primary') === colorPalette.primary &&
      body.style.getPropertyValue('--secondary') === colorPalette.secondary &&
      body.style.getPropertyValue('--tertiary') === colorPalette.tertiary
    );
  });

  // Make sure we don't pick the same color palette again
  const filteredColorPalettes = COLOR_PALETTES.filter(
    (_, index) => index !== currentColorPalette
  );

  const randomIndex = Math.floor(Math.random() * filteredColorPalettes.length);
  const randomColorPalette = filteredColorPalettes[randomIndex];

  body.style.setProperty('--primary', randomColorPalette.primary);
  body.style.setProperty('--secondary', randomColorPalette.secondary);
  body.style.setProperty('--tertiary', randomColorPalette.tertiary);
};
