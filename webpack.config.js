const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isDevelopment = argv.mode === 'development';

  return {
    entry: {
      newtab: './src/newtab/index.jsx',
      background: './src/background/background.js',
      popup: './src/popup/popup.jsx'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-react']
            }
          }
        },
        {
          test: /\.css$/,
          use: [
            isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
            'css-loader'
          ]
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
          type: 'asset/resource',
          generator: {
            filename: 'images/[name][ext]'
          }
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/newtab.html',
        filename: 'newtab.html',
        chunks: ['newtab']
      }),
      new HtmlWebpackPlugin({
        template: './public/popup.html',
        filename: 'popup.html',
        chunks: ['popup']
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'public/manifest.json',
            to: 'manifest.json'
          },
          {
            from: 'public/preload.js',
            to: 'preload.js'
          },
          {
            from: 'releases/FavouriteEdge-v1.6.7/images',
            to: 'images'
          }
        ]
      }),
      ...(isDevelopment ? [] : [
        new MiniCssExtractPlugin({
          filename: '[name].css'
        })
      ])
    ],
    resolve: {
      extensions: ['.js', '.jsx'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    devtool: isDevelopment ? 'cheap-module-source-map' : false,
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist')
      },
      compress: true,
      port: 3000,
      hot: true
    }
  };
}; 