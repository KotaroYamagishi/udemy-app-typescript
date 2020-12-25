// node.jsでmoduleをexportする方法
const path=require('path');

module.exports ={
    entry:'./src/app.ts',
    // バンドルファイルの出力設定
    output:{
        filename:'bundle.js',
        path:path.resolve(__dirname,'src'),
        publicPath:'src'
    },
    // ソースマップの出力設定
    devtool:'inline-source-map',
    // webpackしたものをどうするか設定する
    module:{
        rules:[
            {
                test: /\.ts$/,
                use:'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    //importされたモジュールをどのように処理するか
    resolve:{
        extensions: ['.ts', '.js']
    }
}