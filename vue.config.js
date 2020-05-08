var OpenBrowserPlugin = require('open-browser-webpack-plugin');
const path = require('path');

module.exports = {
  pages: {
    controller: {
      // entry for the page
      entry: 'src/entry/controller.js',
      // the source template
      template: 'public/controller.html',
      // output as dist/index.html
      filename: 'game/controller.html'
    },
    screen: {
      // entry for the page
      entry: 'src/entry/screen.js',
      // the source template
      template: 'public/screen.html',
      // output as dist/index.html
      filename: 'game/screen.html'
    }
  },
  devServer: {
    port: 9090,
  },
  configureWebpack: {
    module: {
      rules: [
        {
          test: require.resolve('./src/vendor/airconsole.js'),
          use: 'exports-loader?AirConsole'
        },
      ],
    },
    plugins: [
      new OpenBrowserPlugin({ url: 'http://www.airconsole.com/simulator/#http://localhost:9090/game/' })
    ]
  }
}
