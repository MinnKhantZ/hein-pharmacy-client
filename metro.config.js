const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Prevent Metro from trying to read non-existent source map files
config.symbolicator = {
  customizeFrame: (frame) => {
    // Prevent InternalBytecode.js errors by returning null for invalid frames
    if (frame.file && !frame.file.includes('node_modules')) {
      return frame;
    }
    return frame;
  },
};

// Enhanced resolver configuration
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'cjs'],
};

module.exports = config;
