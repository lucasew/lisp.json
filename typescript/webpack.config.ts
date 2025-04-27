import {resolve} from 'path'
import { pathToFileURL } from 'url';
import webpack from 'webpack'

const config: webpack.Configuration = {
    entry: {
        "LispJSON": './src/web.ts'
    },
    output: {
        path: resolve(__dirname, "dist"),
        filename: '[name].js',
        library: {
            name: "LispJSON",
            type: "umd"
        }
    },
    resolve: {
        extensions: [".ts"],
    },
    devtool: 'source-map',
    optimization: {
        concatenateModules: true,
        minimize: true
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            }
        ]
    }
}

export default config;
