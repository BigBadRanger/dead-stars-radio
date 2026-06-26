export function getSpectralColor(spectralClass?: string): string {
  if (!spectralClass) return '#FFB800'; // Default to amber/gold

  const cls = spectralClass.toUpperCase().charAt(0);
  switch (cls) {
    case 'O':
      return '#9bb0ff'; // Blue
    case 'B':
      return '#aabfff'; // Blue-white
    case 'A':
      return '#cad7ff'; // White
    case 'F':
      return '#f8f7ff'; // Yellow-white
    case 'G':
      return '#fff4ea'; // Yellow
    case 'K':
      return '#ffd2a1'; // Orange
    case 'M':
      return '#ffcc6f'; // Red-orange
    default:
      return '#FFB800';
  }
}
