const path = require("path");

module.exports = {
  entry: "./src/client/index.js",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "public"),
    publicPath: "/",
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
  // Le sujet impose une SPA servie par un unique bundle.js : le seuil de 244 KiB
  // de webpack vise le code splitting, qui est ici hors sujet.
  performance: { hints: false },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  devServer: {
    static: path.resolve(__dirname, "public"),
    historyApiFallback: true,
    port: 8080,
  },
};
