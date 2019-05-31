module.exports = {
    // 修改的配置
    // 将baseUrl: '/api',改为baseUrl: '/',
    baseUrl: './',
    devServer: {
        proxy: 'http://192.168.1.157:8082'
    },
    configureWebpack: {
        output: {
            globalObject: 'this' // `typeof self !== 'undefined' ? self : this`'' -- not working
        }
    }
};
