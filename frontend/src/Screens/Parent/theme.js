import { colors as baseColors } from '../../styles/colors';

// Parent module theme: the shared palette plus the few extra tokens this module needs.
// Text sizes are larger than the rest of the app on purpose (NFR01, finding DR-06):
// parents may have limited digital literacy, so nothing here goes below 12px.
export const colors = {
  ...baseColors,
  danger: '#DC2626',
  dangerLight: '#FEF2F2',
  dangerBorder: '#FECACA',
  successLight: '#ECFDF5',
  successText: '#047857',
  warnText: '#92400E',
  overlay: 'rgba(15, 23, 42, 0.45)',
};

export const font = {
  title: 22,
  heading: 17,
  body: 15,
  small: 13,
  tiny: 12,
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

// Minimum comfortable touch target.
export const TOUCH = 44;

export const cardShadow = {
  shadowColor: baseColors.shadow,
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};
