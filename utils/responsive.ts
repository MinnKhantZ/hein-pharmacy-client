// Responsive breakpoints and utility for web/desktop
import * as React from 'react';

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
  const [width, setWidth] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth : breakpoints.mobile
  );

  React.useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return getDeviceType(width);
}
