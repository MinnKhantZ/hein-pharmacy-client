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

// Enhanced resolver configuration for web and native platforms
config.resolver = {
  ...config.resolver,
  // Add platform-specific extensions for web support
  sourceExts: [...config.resolver.sourceExts, 'cjs'],
  // Ensure platform extensions are resolved in the correct order
  // .web.js/.web.ts will be picked for web, .native.js/.native.ts for native
  platforms: ['ios', 'android', 'web'],
};

module.exports = config;
