/**
 * Custom JSX Plugin for esbuild
 * 
 * This plugin configures esbuild to properly handle JSX and provides
 * automatic import path resolution to fix common issues.
 */
const fs = require('fs');
const path = require('path');

const jsxPlugin = {
  name: 'react-jsx-plugin',
  setup(build) {
    // Configure JSX transformation
    build.onLoad({ filter: /\.(jsx?|tsx)$/ }, async (args) => {
      // Read the file
      const source = await fs.promises.readFile(args.path, 'utf8');
      
      // Skip files that don't contain JSX
      if (!source.includes('React') && !source.includes('jsx') && 
          !source.includes('<') && !source.includes('/>')) {
        return null;
      }
      
      // Handle both JS and JSX files
      const loader = path.extname(args.path) === '.jsx' ? 'jsx' : 'jsx';
      
      return {
        contents: source,
        loader
      };
    });
    
    // Fix imports for common paths that need resolution
    build.onResolve({ filter: /^(@\/.*)/ }, (args) => {
      // Handle @ path alias
      const parts = args.path.split('/');
      parts[0] = 'src'; // Replace @ with src
      
      const resolvedPath = path.resolve(
        path.dirname(process.cwd()),
        parts.join('/')
      );
      
      return { path: resolvedPath };
    });
    
    // Handle @features, @contexts, etc. aliases
    build.onResolve({ filter: /^(@(features|contexts|utils|services|store)\/.*)/ }, (args) => {
      const parts = args.path.split('/');
      const aliasType = parts[0].substring(1); // Remove @ from @features, etc.
      parts.shift(); // Remove the first part (@features)
      
      const resolvedPath = path.resolve(
        path.dirname(process.cwd()),
        'src',
        aliasType,
        ...parts
      );
      
      return { path: resolvedPath };
    });
  }
};

module.exports = jsxPlugin;
