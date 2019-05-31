/**
 */
import * as API from './'

export default {
    getData: params => {
        return API.GET('/getOpenDataList', params)
    },
    buyNum: params => {
        return API.GET('/buyNum', params);
    }
}
