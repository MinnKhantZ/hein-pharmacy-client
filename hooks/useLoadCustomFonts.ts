import * as Font from 'expo-font';
import { useEffect, useState } from 'react';
import { customFonts } from '../constants/customFonts';

export function useLoadCustomFonts() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      await Font.loadAsync(customFonts);
      setFontsLoaded(true);
    })();
  }, []);

  return fontsLoaded;
}
