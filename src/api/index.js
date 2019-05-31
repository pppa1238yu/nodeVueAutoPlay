/**
 * Created by jerry on 2017/6/9.
 */
import axios from "axios";
const qs = require('qs');
axios.defaults.withCredentials = true;
// axios.defaults.headers.common['Authorization'] = AUTH_TOKEN;
axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';//配置请求头


//添加一个请求拦截器
// axios.interceptors.request.use(function (config) {
//   console.dir(config);
//   return config;
// }, function (error) {
//   // Do something with request error
//   return Promise.reject(error);
// });
// transformRequest: [function (data) {
//     let formData = new URLSearchParams();
//     Object.keys(data).forEach(key => formData.append(key, data[key]));
//     return formData.toString();
// }]

// 添加一个响应拦截器el-date-picker
axios.interceptors.response.use(function (response) {
    if (response.data && response.data.errcode) {
        if (parseInt(response.data.errcode) === 40001) {
            //未登录
        }
    }
    return response;
}, function (error) {
    // Do something with response error
    if (error.response) {
        if (error.response.status === 401) {
            location.reload(true);
            return;
        } else {
            return Promise.reject(error);
        }
    }
});

//基地址
// let base = 'http://127.0.0.1:8000';  //接口代理地址参见：config/index.js中的proxyTable配置
let base = '';  //接口代理地址参见：config/index.js中的proxyTable配置

//通用方法
export const POST = (url, params) => {
    return axios.post(`${base}${url}`, params, {
        transformRequest: [function (data) {
            let formData = new URLSearchParams();
            Object.keys(data).forEach(key => formData.append(key, data[key]));
            return formData;
        }]
    }).then(res => res.data)
}

export const GET = (url, params) => {
    return axios.get(`${base}${url}`, {params: params, paramsSerializer: params => {
            return qs.stringify(params, { indices: false })
        }}).then(res => res.data)
};

export const PUT = (url, params) => {
    return axios.put(`${base}${url}`, params, {
        transformRequest: [function (data) {
            let formData = new URLSearchParams();
            Object.keys(data).forEach(key => formData.append(key, data[key]));
            return formData;
        }]
    }).then(res => res.data)
}

export const PUT_JSON = (url, params) => {
    return axios.put(`${base}${url}`, params).then(res => res.data)
}

export const DELETE = (url, params) => {
    return axios.delete(`${base}${url}`, {params: params}).then(res => res.data)
}

export const PATCH = (url, params) => {
    return axios.patch(`${base}${url}`, params).then(res => res.data)
}
