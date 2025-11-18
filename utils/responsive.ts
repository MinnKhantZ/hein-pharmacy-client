// Responsive breakpoints and utility for web/desktop
import * as React from 'react';
import { Dimensions, Platform } from 'react-native';

export const breakpoints = {
  mobile: 0,
  tablet: 600,
  desktop: 1024,
  largeDesktop: 1440,
};

export function getDeviceType(width: number): 'mobile' | 'tablet' | 'desktop' | 'largeDesktop' {
  if (width >= breakpoints.largeDesktop) return 'largeDesktop';
  if (width >= breakpoints.desktop) return 'desktop';
  if (width >= breakpoints.tablet) return 'tablet';
  return 'mobile';
}

export function useBreakpoint() {
  const getInitialWidth = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return Dimensions.get('window').width;
  };

  const [width, setWidth] = React.useState(getInitialWidth());

  React.useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      function handleResize() {
        setWidth(window.innerWidth);
      }
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    } else {
      // Use React Native's Dimensions API for native platforms
      const subscription = Dimensions.addEventListener('change', ({ window }) => {
        setWidth(window.width);
      });
      return () => subscription?.remove();
    }
  }, []);

  return getDeviceType(width);
}
