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
        libraryTarget: 'var',
        library: 'LispJSON',
    },
    resolve: {
        extensions: [".ts"],
        fallback: {
            "console": false
        },
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
        ],
        
    },
    // module: {
    //     loaders: [{
    //         test: /\.tsx?$/,
    //         loader: 'awesome-typescript-loader',
    //         exclude: /node_modules/,
    //         query: {
    //             declaration: false,
    //         }
    //     }]
    // }
}

export default config;