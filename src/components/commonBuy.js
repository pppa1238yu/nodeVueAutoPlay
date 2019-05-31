import API from '@/api/getData';
import axios from 'axios';

export default {
    props: ['gameName'],
    data: function () {
        return {
            receiveResult: {}
        };
    },
    methods: {
        sendAjaxRequest() {
            return new Promise((resolve) => {
                // jsuk3 极速快三
                let sendArr = this.gameName.map(item => {
                    return API.getData({
                        shortName: item,
                        num: 5
                    })
                });
                axios.all(sendArr)
                    .then(axios.spread((...data) => {
                        data.map((item, index) => {
                            let resultObj = item.openCodeList[0];
                            if (resultObj) {
                                let curInd = resultObj.expect;
                                let result = resultObj.openCode.split(',');
                                if (this.receiveResult[index]) {
                                    if (curInd !== this.receiveResult[index].curInd) {
                                        this.calcFailCount('num0', result[0], result, curInd, index);
                                        this.calcFailCount('num1', result[1], result, curInd, index);
                                        this.calcFailCount('num2', result[2], result, curInd, index);
                                        this.calcFailCount('num3', result[3], result, curInd, index);
                                        this.calcFailCount('num4', result[4], result, curInd, index);
                                        this.caclLongHu(result[0], result[1], 'WQ', index, curInd, result);
                                        this.caclLongHu(result[0], result[2], 'WB', index, curInd, result);
                                        this.caclLongHu(result[0], result[3], 'WS', index, curInd, result);
                                        this.caclLongHu(result[0], result[4], 'WG', index, curInd, result);
                                        this.caclLongHu(result[1], result[2], 'QB', index, curInd, result);
                                        this.caclLongHu(result[1], result[3], 'QS', index, curInd, result);
                                        this.caclLongHu(result[1], result[4], 'QG', index, curInd, result);
                                        this.caclLongHu(result[2], result[3], 'BS', index, curInd, result);
                                        this.caclLongHu(result[2], result[4], 'BG', index, curInd, result);
                                        this.caclLongHu(result[3], result[4], 'SG', index, curInd, result);
                                        this.receiveResult[index] = {
                                            ...this.receiveResult[index],
                                            num0: result[0],
                                            num1: result[1],
                                            num2: result[2],
                                            num3: result[3],
                                            num4: result[4],
                                            curInd: curInd,
                                        };
                                    }
                                } else {
                                    this.receiveResult[index] = {
                                        num0: result[0],
                                        num1: result[1],
                                        num2: result[2],
                                        num3: result[3],
                                        num4: result[4],
                                        num0FailCount: 0,
                                        num1FailCount: 0,
                                        num2FailCount: 0,
                                        num3FailCount: 0,
                                        num4FailCount: 0,
                                        curInd: curInd,
                                        num0BuyState: false,
                                        num1BuyState: false,
                                        num2BuyState: false,
                                        num3BuyState: false,
                                        num4BuyState: false,
                                        maxFailCount: 0,
                                        WQFailCount: 0,
                                        WBFailCount: 0,
                                        WSFailCount: 0,
                                        WGFailCount: 0,
                                        QBFailCount: 0,
                                        QSFailCount: 0,
                                        QGFailCount: 0,
                                        BSFailCount: 0,
                                        BGFailCount: 0,
                                        SGFailCount: 0,
                                    }
                                }
                            }
                        });
                    }));
            })
        },
        caclLongHu(num1, num2, count, index, curInd, result) {
            let rule = 'lh' + count.toLowerCase();
            count = count + 'FailCount';
            if (num1 === num2) {
                this.receiveResult[index][count]++;
                if (this.receiveResult[index][count] >= 3) {
                    this.buyLonghu(curInd, index, rule, count)
                }
            } else {
                this.receiveResult[index][count] = 0;
            }
        },
        // 计算连号
        calcFailCount(numIndexName, resultNum, result, curInd, index) {
            let failName = numIndexName + 'FailCount';
            let buyStateName = numIndexName + 'BuyState';
            let tempObj = JSON.parse(JSON.stringify(this.receiveResult[index]));
            if (tempObj[numIndexName] === resultNum) {
                this.receiveResult[index][failName]++;
                if (this.receiveResult[index][failName] > this.receiveResult[index]['maxFailCount']) {
                    this.receiveResult[index]['maxFailCount'] = this.receiveResult[index][failName];
                }
                if (this.receiveResult[index][failName] >= 4) {
                    this.receiveResult[index][buyStateName] = true;
                    // console.log('numIndexName: ' + numIndexName
                    //     + '\n' + 'curIndex: ' + curInd
                    //     + '\n' + 'gameName: ' + this.gameName[index]
                    //     + '\n' + 'index: ' + index
                    //     + '\n' + 'failNameNum: ' + this.receiveResult[index][numIndexName]
                    //     + '\n' + 'openNum: ' + resultNum
                    //     + '\n' + result
                    //     + '\n' + 'maxFailCount: ' + this.receiveResult[index]['maxFailCount'])
                    this.buyNums(numIndexName, curInd, resultNum, index, failName);
                }
            } else {
                this.receiveResult[index][failName] = 0;
                if (this.receiveResult[index][buyStateName]) {
                    this.receiveResult[index][buyStateName] = false;
                }
            }
        },
        uuid(len, radix) {
            var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
            var uuid = [], i;
            radix = radix || chars.length;
            if (len) {
                for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix]
            } else {
                var r;
                uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
                uuid[14] = '4';
                for (i = 0; i < 36; i++) {
                    if (!uuid[i]) {
                        r = 0 | Math.random() * 16;
                        uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r]
                    }
                }
            }
            return uuid.join('')
        },
        buyLonghu(curInd,index, rule, count) {
            let uuid = (new Date()).getTime() + '-' + this.uuid(8).toUpperCase();
            let time = this.receiveResult[index][count] - 3;
            if (time >= 1) time = 1;
            let json = {
                "currExpect": Number(curInd) + 1,
                "currency": "rmb",
                "itemcount": 2,
                "items": {
                    [uuid]: {
                        "itemcount": "2",
                        "mode": 1994,
                        "repoint": "0.0",
                        "rulecode": rule,
                        "startPrize": 2.22,
                        "times": 3 * time * 10 || 3,
                        "total": 6 * time * 10 || 6,
                        "yjf": "1.00",
                        "balls": {
                            "zu": ["0", "1"]
                        }
                    }
                },
                "lottery": this.gameName[index],
                "ordercount": 1,
                "sumCount": 1,
                "total": 6 * time * 10 || 6
            };
            let params = {
                "orderlist": JSON.stringify(json),
                "userAccountType": "",
            };
            API.buyNum(params)
                .then( data => {
                    console.log(data);
                });
        },
        buyNums(numIndexName, curInd, resultNum, index, failName) {
            let uuid = (new Date()).getTime() + '-' + this.uuid(8).toUpperCase();
            let time = this.receiveResult[index][failName] - 4;
            let buyIndex = Number(numIndexName.split('num')[1]);
            let ballMap = ['w', 'q', 'b', 's', 'g'];
            let balls = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
            balls[Number(resultNum)] = "";
            let wei = ballMap[buyIndex];
            let buyBall = {};
            buyBall[wei] = balls;
            let json = {
                "currExpect": Number(curInd) + 1,
                "currency": "rmb",
                "itemcount": 9,
                "items": {
                    [uuid]: {
                        "rulecode": "dweid",
                        "startPrize": 9.969999999999999,
                        "total": 4.5 * time * 10 || 4.5,
                        "itemcount": "9",
                        "times": 5 * time * 10 || 5,
                        "yjf": "0.10",
                        "repoint": "0.0",
                        "mode": 1994,
                        "balls": buyBall
                    }
                },
                "lottery": this.gameName[index],
                "ordercount": 1,
                "sumCount": 1,
                "total": 4.5 * time * 10 || 4.5
            };
            let params = {
                "orderlist": JSON.stringify(json),
                "userAccountType": "",
            };
            API.buyNum(params)
                .then( data => {
                   console.log(data);
                });
        }
    },
}
;