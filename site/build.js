const fs = require('fs');
const path = require('path');
const { minify } = require("terser");
const { performance } = require('perf_hooks');
const CleanCSS = require('clean-css');
const jsxPlugin = require('./react-jsx-plugin');

const cleanCSSInstance = new CleanCSS({});
const productionMode = process.argv.some((arg) => arg === '--prod');
if (productionMode) {
  console.log("Production mode is enabled");
}

const mapJsonPlugin = {
  name: 'mapTilesJson',
  setup(build) {
    const mapImageFiles = fs.readdirSync("public/map").filter((file) => file.endsWith('.webp')).map((file) => path.basename(file, '.webp'));

    const tiles = [[], [], [], []];
    for (const mapImageFile of mapImageFiles) {
      const [plane, x, y] = mapImageFile.split('_').map((x) => parseInt(x, 10));
      tiles[plane].push(((x + y) * (x + y + 1)) / 2 + y);
    }

    const icons = JSON.parse(fs.readFileSync("public/data/map_icons.json", 'utf8'));

    const labels = JSON.parse(fs.readFileSync("public/data/map_labels.json", 'utf8'));

    const result = {
      tiles,
      icons,
      labels
    };

    fs.writeFileSync('public/data/map.json', JSON.stringify(result));
  }
}

const componentBuildPlugin = {
  name: 'componentBuild',
  setup(build) {
    const components = new Set(JSON.parse(fs.readFileSync('components.json', 'utf8')));

    build.onLoad({ filter: /\.js$/ }, async (args) => {
      const componentDir = path.dirname(args.path);
      const componentName = path.basename(args.path, '.js');

      const isComponent = components.has(componentName);
      let jsText = await fs.promises.readFile(args.path, 'utf8');
      if (isComponent) {
        try {
          let htmlText = await fs.promises.readFile(`${componentDir}/${componentName}.html`, 'utf8');
          jsText = jsText.replace(`{{${componentName}.html}}`, htmlText);
        } catch {}
      }

      return {
        contents: jsText,
        loader: 'js'
      };
    });
  }
}

const buildLoggingPlugin = {
  name: "buildLogging",
  setup(build) {
    let start;
    build.onStart(() => {
      start = performance.now();
      console.log('\nBuild started');
    });

    build.onEnd(() => {
      console.log(`Build finished in ${(performance.now() - start).toFixed(1)}ms`);
    });
  }
};

const htmlBuildPlugin = {
  name: "htmlBuild",
  setup(build) {
    const components = JSON.parse(fs.readFileSync('components.json', 'utf8'));
    const imagesToInline = [
      "/ui/border-button.png",
      "/ui/border-button-dark.png",
      "/ui/checkbox.png", 
      "/ui/border.png",
      "/ui/border-dark.png",
      "/ui/border-tiny.png",
      "/ui/border-tiny-dark.png",
      "/ui/297-0.png",
      "/ui/297-0-dark.png"
    ];

    build.onEnd(async () => {
      try {
        // Read the original HTML template
        let htmlFile = await fs.promises.readFile("src/index.html", "utf8");

        // Prepare and inject CSS
        const cssFiles = ['src/main.css', ...components.map((component) => `./src/${component}/${component}.css`)];
        const cssReadResults = await Promise.all(cssFiles.map((cssFile) => {
          try {
            return fs.promises.readFile(cssFile, "utf8");
          } catch (error) {
            console.error(`Error reading CSS file: ${cssFile}`, error);
            return '';
          }
        }));
        let css = cssReadResults.join('');

        for (imagePath of imagesToInline) {
          try {
            const imageData = await fs.promises.readFile(`public/${imagePath}`, "base64");
            css = css.replace(imagePath, `data:image/png;base64,${imageData}`);
          } catch (error) {
            console.error(`Error inlining image: ${imagePath}`, error);
          }
        }

        if (productionMode) {
          css = cleanCSSInstance.minify(css).styles;
        }
        
        // Replace CSS placeholder
        htmlFile = htmlFile.replace("{{style}}", css);
        
        // Create script tag for app.js
        const scriptTag = '<script src="app.js"></script>';
        
        // Find the position of the {{js}} placeholder
        const jsPosition = htmlFile.indexOf('<script>{{js}}</script>');
        
        if (jsPosition !== -1) {
          // Replace the {{js}} placeholder with our app.js script tag
          htmlFile = htmlFile.replace('<script>{{js}}</script>', scriptTag);
        } else {
          // If the placeholder isn't found, add the script tag before the closing body tag
          htmlFile = htmlFile.replace('</body>', scriptTag + '</body>');
        }
        
        // Write the final HTML file
        await fs.promises.writeFile("public/index.html", htmlFile);
        console.log('Successfully wrote index.html with app.js script tag');
      } catch (error) {
        console.error('Error in htmlBuildPlugin:', error);
      }
    });
  }
};

const minifyJsPlugin = {
  name: "minifyJs",
  setup(build) {
    build.onEnd(async () => {
      if (!productionMode) return;

      console.log('Minifying app.js');
      const code = await fs.promises.readFile("public/app.js", "utf8");
      const result = await minify(code, {
        sourceMap: {
          filename: "app.js",
          url: "app.js.map"
        },
        ecma: "2017",
        mangle: {
          keep_classnames: false,
          keep_fnames: false,
          module: true,
          reserved: [],
          toplevel: true
        },
        compress: {
          ecma: "2017"
        },
        module: true
      });

      await fs.promises.writeFile("public/app.js", result.code);
      await fs.promises.writeFile("public/app.js.map", result.map);
    });
  }
};

function build() {
  require('esbuild').build({
    entryPoints: ['src/index.js'],
    bundle: true,
    sourcemap: true,
    minify: false,
    format: 'esm',
    outfile: 'public/app.js',
    plugins: [
      jsxPlugin,
      componentBuildPlugin, 
      minifyJsPlugin, 
      htmlBuildPlugin, 
      buildLoggingPlugin, 
      mapJsonPlugin
    ],
    loader: { 
      '.js': 'jsx',
      '.jsx': 'jsx',
      '.png': 'file',
      '.jpg': 'file',
      '.gif': 'file',
      '.svg': 'file'
    },
    resolveExtensions: ['.js', '.jsx', '.json'],
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    define: {
      'process.env.NODE_ENV': productionMode ? '"production"' : '"development"',
      'process.env.API_URL': '"http://localhost:8080/api"'
    },
    alias: {
      '@features': path.resolve(__dirname, 'src/features'),
      '@contexts': path.resolve(__dirname, 'src/contexts'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@store': path.resolve(__dirname, 'src/store')
    }
  }).catch(() => process.exit(1));
}

const watch = process.argv.find((arg) => arg === "--watch");
if (watch) {
  const chokidar = require('chokidar');
  const watcher = chokidar.watch('src', {
    ignorePermissionErrors: true,
    ignored: ".#*"
  });
  watcher.on('change', (event, path) => {
    build();
  });
}

build();
