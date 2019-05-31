// initial state
// shape: [{ id, quantity }]
import API from "../../api/api_ecg_view";
import Util from "../../common/util";

const state = {
    wholeViewLoading: false,
    gainSelected: 10,
    rhythmTypeSelected: '',
    dayStartIndex: 0,
    ecgStartTime: '',
    ecgEndTime: '',
    currentDate: '',
    currentDateIndex: 0,
    ecgChangeDirectionNext: 1,//心电图变化的方向，向下为1，向上为-1
    clickDateState: false,
    basicInfo: {
        age: 0,
        gender: '',
        fullName: '',
        record_begin_time: '',
        record_end_time: '',
        phone: '',
        address: '',
        company: '',
        idNumber: '',
        deviceNumber: '',
        bloodPressure: 0,
        bloodPressureHigh: 0,
        isSmoke: false,
        pymptom: '',
        sickHistory: '',
        medicalCase: '',
        reportAttachmentUrls: [],
        symbols: [500, 50000, 10000000]
    },
    ecgDataLoading: false,
    tagPos: [],//数组元素为{t:'Q',p:0}
    rhythm: [],//数组元素为{type:'V',begin:0,end:0}
    currentDateHour: '',
    currentDateMinNum: 0,
    deleteTagState: false,
    deleteTagState2: false,
    updateTagQState: false,
    updateTagQState2: false,
    getTagRhythmLoading: false,
    refreshState: false,
    ecgFastData: null,
    fastDataLoading: false,
    changeReset: false,
    selectMain: true,
    selectComponent: null,
    tagChangeState: [false, false, false], // 散点图 直方图 叠加图
    validDates: [],
    datesIsContainData: [],
    currentDateTags: [],
    perDateData: {},
    pageChanged: false,
    mainPageLoading: false,
    lastBlockIndex: 0,//最大数据块索
    inPic: false,
    RRShowState: false,
    rhythmTypeSelectDisabled:false,
    freshPageScatter: false,
    freshPageLineBlock: false,
};

// getters
const getters = {};

/**
 * 去重並返回修改后的對象
 * @param tempObj
 * @param rrParse
 * @param sendData
 * @param degree
 */
function calcType(tempObj, rrParse, sendData, degree = 25) {
    if (typeof rrParse === 'number') {
        if (tempObj === undefined) tempObj = [];
        let degreeIndex = parseInt(rrParse / degree);
        if (degreeIndex > 120) {
            degreeIndex = 120;
        }
        if (tempObj[degreeIndex]) {
            let tempArr = tempObj[degreeIndex];
            let sendP = sendData.p;
            // 取巧的方式，序列的push绝对为上一个index到下一个index，所以只需要判断上一个是否重复就行，略掉去重操作，速度提升N倍
            if (tempArr[tempArr.length - 1].p !== sendP) {
                if (sendData.d !== 2 && sendData.p !== -1 && sendData.t !== 'Q') {
                    tempObj[degreeIndex].push(sendData);
                }
            }
        } else {
            if (sendData.d !== 2 && sendData.p !== -1 && sendData.t !== 'Q') {
                tempObj[degreeIndex] = [sendData];
            }
        }
    }
}

function calcQtyle(tempObj, rrParse, sendData, degree = 25) {
    if (typeof rrParse === 'number') {
        if (tempObj === undefined) tempObj = [];
        if (tempObj[parseInt(rrParse / degree)]) {
            let tempArr = tempObj[parseInt(rrParse / degree)];
            let sendP = sendData.p;
            // 取巧的方式，序列的push绝对为上一个index到下一个index，所以只需要判断上一个是否重复就行，略掉去重操作，速度提升N倍
            if (tempArr[tempArr.length - 1].p !== sendP) {
                if (sendData.d !== 2 && sendData.p !== -1) {
                    if (sendData.t !== 'O')tempObj[parseInt(rrParse / degree)].push(sendData);
                }
            }
        } else {
            if (sendData.d !== 2 && sendData.p !== -1) {
                if (sendData.t !== 'O')tempObj[parseInt(rrParse / degree)] = [sendData];
            }
        }
    }
}

/**
 * @param type
 * @param rrParse1
 * @param rrParse2
 * @param addNData
 * @param addVData
 * @param addSData
 * @param tempObj
 * @param rrTagData
 * @param rnTagData
 * @param rvTagData
 * @param rsTagData
 * @param sendData
 * @param sendSecData
 */
function calcAllType(type, rrParse1, rrParse2, addNData, addVData, addSData, tempObj, rrTagData, rnTagData, rvTagData, rsTagData, sendData, sendSecData) {
    if (type !== 'Q') {
        switch (type) {
            case 'N':
                calcType(addNData, rrParse1, sendData);
                calcType(addNData, rrParse2, sendSecData);

                calcType(rrTagData, rrParse1, sendData);
                calcType(rrTagData, rrParse2, sendSecData);

                calcType(rnTagData, rrParse1, sendData);
                calcType(rnTagData, rrParse2, sendSecData);
                break;
            case 'V':
                calcType(addVData, rrParse1, sendData);
                calcType(addVData, rrParse2, sendSecData);

                calcType(rrTagData, rrParse1, sendData);
                calcType(rrTagData, rrParse2, sendSecData);

                calcType(rvTagData, rrParse1, sendData);
                calcType(rvTagData, rrParse2, sendSecData);
                break;
            case 'S':
                calcType(addSData, rrParse1, sendData);
                calcType(addSData, rrParse2, sendSecData);

                calcType(rrTagData, rrParse1, sendData);
                calcType(rrTagData, rrParse2, sendSecData);

                calcType(rsTagData, rrParse1, sendData);
                calcType(rsTagData, rrParse2, sendSecData);
                break;
            default:
                break;
        }
    }

    calcType(tempObj, rrParse1, sendData);
}

/**************生成对应对象其中的意义为
 * @param p position 位置
 * @param x x坐标
 * @param y y坐标
 * @param t type 类型
 * @param i index 在ecgdata中的序列
 * @param d deleted 是否被删除
 * @returns {{p: *, x: *, y: *, t: *, i: *, d: *}}
 */
function retPosObj(p, x, y, t, i, d) {
    if (x >= 3000) x = 3000;
    if (y >= 3000) y = 3000;
    return {p, x, y, t, i, d}
}

function ruleAnalys(commit, state, date) {
    let ecgFastData = [];
    let viewDate = date;
    ecgFastData = state.perDateData[viewDate].data;
    let tagData = state.perDateData[viewDate].tag || {};
    let allTagData = tagData.allTagData || [];
    let vTagData = tagData.vTagData || [];
    let sTagData = tagData.sTagData || [];
    let nTagData = tagData.nTagData || [];
    let qTagData = tagData.qTagData || [];
    let nnTagData = tagData.nnTagData || [];
    let nvTagData = tagData.nvTagData || [];
    let nsTagData = tagData.nsTagData || [];
    let nrTagData = tagData.nrTagData || [];
    let vvTagData = tagData.vvTagData || [];
    let vnTagData = tagData.vnTagData || [];
    let vsTagData = tagData.vsTagData || [];
    let vrTagData = tagData.vrTagData || [];
    let ssTagData = tagData.ssTagData || [];
    let snTagData = tagData.snTagData || [];
    let svTagData = tagData.svTagData || [];
    let srTagData = tagData.srTagData || [];
    let rrTagData = tagData.rrTagData || [];
    let rnTagData = tagData.rnTagData || [];
    let rsTagData = tagData.rsTagData || [];
    let rvTagData = tagData.rvTagData || [];
    let sssTagData = tagData.sssTagData || [];
    let vvvTagData = tagData.vvvTagData || [];

    if (ecgFastData.length) {
        // 计算前四位数的所有规则分析
        let firstObj = JSON.parse(ecgFastData[0]);
        let secondObj = JSON.parse(ecgFastData[1]);
        let thirdObj = JSON.parse(ecgFastData[2]);
        let fourthObj = JSON.parse(ecgFastData[3]);
        let y = parseInt((secondObj.p - firstObj.p) / 512 * 1000); //向前计算的

        let thiX = parseInt((thirdObj.p - secondObj.p) / 512 * 1000); //第三个元素的相对值
        let fouX = parseInt((fourthObj.p - thirdObj.p) / 512 * 1000); //第四个元素的相对值

        let tempObjFirst = retPosObj(firstObj.p, 3000, y, firstObj.t, 0, firstObj.d);
        let secTempObj = retPosObj(secondObj.p, y, thiX, secondObj.t, 1, secondObj.d);
        let thirdTempObj = retPosObj(thirdObj.p, thiX, fouX, thirdObj.t, 2, thirdObj.d);

        if (firstObj.t === 'S' && secondObj.t === 'S' && thirdObj.t === 'S') {
            calcType(sssTagData, 3000, tempObjFirst);
            calcType(sssTagData, y, secTempObj);
            calcType(sssTagData, thiX, thirdTempObj);
        }
        if (firstObj.t === 'V' && secondObj.t === 'V' && thirdObj.t === 'V') {
            calcType(vvvTagData, 3000, tempObjFirst);
            calcType(vvvTagData, y, secTempObj);
            calcType(vvvTagData, thiX, thirdTempObj);
        }
        // 当第一个元素或最后一个元素为某个类型时需要做特殊处理
        switch (firstObj.t) {
            case 'V':
                calcAllType(secondObj.t, 3000, y, vnTagData, vvTagData, vsTagData, vTagData, rrTagData, rnTagData, rvTagData, rsTagData, tempObjFirst, secTempObj);
                break;
            case 'S':
                calcAllType(secondObj.t, 3000, y, snTagData, svTagData, ssTagData, sTagData, rrTagData, rnTagData, rvTagData, rsTagData, tempObjFirst, secTempObj);
                break;
            case 'N':
                calcAllType(secondObj.t, 3000, y, nnTagData, nvTagData, nsTagData, nTagData, rrTagData, rnTagData, rvTagData, rsTagData, tempObjFirst, secTempObj);
                break;
            case 'Q':
                calcQtyle(qTagData, 3000, tempObjFirst);
            default:
                break;
        }
        calcQtyle(allTagData, 3000, tempObjFirst);
        // 遍历所有元素类型
        for (let i = 0, len = ecgFastData.length; i < len; i++) {
            let rrParse = 0;
            if (ecgFastData[i + 3]) {
                let curObj = JSON.parse(ecgFastData[i]);
                let nextObj = JSON.parse(ecgFastData[i + 1]);
                let nextDouObj = JSON.parse(ecgFastData[i + 2]);
                let fourthObj = JSON.parse(ecgFastData[i + 3]);
                rrParse = parseInt((nextObj.p - curObj.p) / 512 * 1000);
                let y = 0;
                if (nextDouObj) {
                    y = parseInt((nextDouObj.p - nextObj.p) / 512 * 1000);
                }
                if (rrParse > 3000) rrParse = 3000;
                if (rrParse < 0) rrParse = 0;

                let thirdRRParse = parseInt((fourthObj.p - nextDouObj.p) / 512 * 1000); //计算第三个元素与第四个元素的间距
                let tempObj = retPosObj(nextObj.p, rrParse, y, nextObj.t, i + 1, nextObj.d); //生成对应对象
                let nextObjTempObj = retPosObj(nextDouObj.p, y, thirdRRParse, nextDouObj.t, i + 2, nextDouObj.d);

                calcQtyle(allTagData, rrParse, tempObj);  //添加所有tag的数据集

                if (i >= 1) {
                    let firstObj = JSON.parse(ecgFastData[i - 1]);
                    let firstRRParse = parseInt((curObj.p - firstObj.p) / 512 * 1000);
                    let firstTempObj = retPosObj(curObj.p, firstRRParse, rrParse, curObj.t, i, curObj.d);
                    if (curObj.t === 'S' && nextObj.t === 'S' && nextDouObj.t === 'S') {
                        calcType(sssTagData, firstRRParse, firstTempObj);
                        calcType(sssTagData, rrParse, tempObj);
                        calcType(sssTagData, thirdRRParse, nextObjTempObj);
                    }
                    if (curObj.t === 'V' && nextObj.t === 'V' && nextDouObj.t === 'V') {
                        calcType(vvvTagData, firstRRParse, firstTempObj);
                        calcType(vvvTagData, rrParse, tempObj);
                        calcType(vvvTagData, thirdRRParse, nextObjTempObj);
                    }
                }
                switch (nextObj.t) {
                    case 'V':
                        calcAllType(nextDouObj.t, rrParse, y, vnTagData, vvTagData, vsTagData, vTagData, rrTagData, rnTagData, rvTagData, rsTagData, tempObj, nextObjTempObj);
                        break;
                    case 'S':
                        calcAllType(nextDouObj.t, rrParse, y, snTagData, svTagData, ssTagData, sTagData, rrTagData, rnTagData, rvTagData, rsTagData, tempObj, nextObjTempObj);
                        break;
                    case 'N':
                        calcAllType(nextDouObj.t, rrParse, y, nnTagData, nvTagData, nsTagData, nTagData, rrTagData, rnTagData, rvTagData, rsTagData, tempObj, nextObjTempObj);
                        break;
                    case 'Q':
                        calcQtyle(qTagData, rrParse, tempObj);
                        break;
                    default:
                        break;
                }
            }
        }

        // 计算后四位的所有规则分析
        let lastObj = JSON.parse(ecgFastData[ecgFastData.length - 1]);
        let lastSecObj = JSON.parse(ecgFastData[ecgFastData.length - 2]);
        let lastThirObj = JSON.parse(ecgFastData[ecgFastData.length - 3]);
        let x = parseInt((lastObj.p - lastSecObj.p) / 512 * 1000); //向后计算的
        let xOther = parseInt((lastSecObj.p - lastThirObj.p) / 512 * 1000); //向后计算的
        let tempObjLast = retPosObj(lastObj.p, x, 3000, lastObj.t, ecgFastData.length - 1, lastObj.d);
        let tempObjOther = retPosObj(lastSecObj.p, xOther, x, lastSecObj.t, ecgFastData.length - 2, lastObj.d);

        calcQtyle(allTagData, x, tempObjLast);  //添加最后两位数据到alltag
        calcQtyle(allTagData, xOther, tempObjOther);

        switch (lastSecObj.t) {
            case 'V':
                calcType(vTagData, xOther, tempObjOther);
                break;
            case 'S':
                calcType(sTagData, xOther, tempObjOther);
                break;
            case 'N':
                calcType(nTagData, xOther, tempObjOther);
                break;
            case 'Q':
                calcQtyle(qTagData, xOther, tempObjOther);
                break;
            default:
                break;
        }
        switch (lastObj.t) {
            case 'V':
                calcType(vTagData, x, tempObjLast);
                break;
            case 'S':
                calcType(sTagData, x, tempObjLast);
                break;
            case 'N':
                calcType(nTagData, x, tempObjLast);
                break;
            case 'Q':
                calcQtyle(qTagData, x, tempObjLast);
                break;
            default:
                break;
        }

    }
    nrTagData = nnTagData.concat(nvTagData, nsTagData);
    vrTagData = vnTagData.concat(vvTagData, vsTagData);
    srTagData = snTagData.concat(svTagData, ssTagData);
    let sendObj = {
        allTagData,
        vTagData,
        sTagData,
        qTagData,
        nTagData,
        nnTagData,
        nvTagData,
        nsTagData,
        nrTagData,
        vvTagData,
        vnTagData,
        vsTagData,
        vrTagData,
        ssTagData,
        snTagData,
        svTagData,
        srTagData,
        rrTagData,
        rnTagData,
        rsTagData,
        rvTagData,
        sssTagData,
        vvvTagData
    };
    let sendMainData = {
        date: viewDate,
        tagData: ecgFastData,
        tag: sendObj,
        changed: false
    };
    commit('changePerDayData', sendMainData);
    commit('changeReset', !state.changeReset);
    commit('changePageChangedStatus', false);
}

// actions
const actions = {
    getDayStartIndex({commit}, params) {
        API.getDayStartEcg(params).then(data => {
            commit('changeDayStartIndex', data);
        })
    },
    changeVSTagData({commit, state}, date) {
        ruleAnalys(commit, state, date);
    },
    overPageReset({commit, state}) {
        let temp = !state.changeReset;
        commit('changeReset', temp);
    }
};

// mutations
const mutations = {
    changeViewLoadingState(state, data) {
        state.wholeViewLoading = data;
    },
    changeFreshPageScatterState(state, data) {
        state.freshPageScatter = data;
    },
    changeFreshPageLineBlockState(state, data) {
        state.freshPageLineBlock = data;
    },
    changeGainSelected(state, data) {
        state.gainSelected = data;
    },
    changeTagState(state, data) {
        state.tagChangeState = data;
    },
    changeReset(state, data) {
        state.changeReset = data;
    },
    changeInPic(state, data) {
        state.inPic = data;
    },
    changePerDayData(state, data) {
        let date = data.date;
        let tagData = data.tagData;
        let tag = data.tag;
        if (!state.perDateData[date]) {
            state.perDateData[date] = {
                data: tagData,
                tag: tag,
                changed: data.changed
            }
        } else {
            state.perDateData[date] = {
                data: tagData,
                tag: tag,
                changed: data.changed
            }
        }
    },
    clearPerData(state, data) {
        state.perDateData = data;
    },
    changePageChangedStatus(state, data) {
        state.pageChanged = data;
    },
    changeSelectComponent(state, data) {
        state.selectComponent = data;
    },

    changeSelectMain(state, data) {
        state.selectMain = data;
    },

    changeFastData(state, data) {
        state.ecgFastData = data;
    },
    changeRhythmTypeSelected(state, data) {
        state.rhythmTypeSelected = data;
    },
    changeDayStartIndex(state, data) {
        state.dayStartIndex = data;
    },
    changeCurrentDate(state, data) {
        state.currentDate = data;
    },
    changeCurrentDateIndex(state, data) {
        state.currentDateIndex = data;
    },
    changeClickDateState(state, data) {
        state.clickDateState = data;
    },
    changeEcgStartTime(state, data) {
        state.ecgStartTime = data;
    },
    changeEcgEndTime(state, data) {
        state.ecgEndTime = data;
    },
    changeBasicInfo(state, data) {
        state.basicInfo = data;
    },
    changeEcgDataLoading(state, data) {
        state.ecgDataLoading = data;
    },
    changeTagPos(state, data) {
        state.tagPos = data;
    },
    updateTag(state, payload) {
        state.tagPos[payload.index].t = payload.t;
    },
    deleteTag(state, payload) {
        if (payload.deleteState) {
            state.tagPos[payload.index].state = payload.stateNum
        } else {
            delete state.tagPos[payload.index].state
        }
    },
    useTag(state, payload) {
        if (payload.useState) {
            state.tagPos[payload.index].state = payload.stateNum
        } else {
            delete state.tagPos[payload.index].state
        }
    },
    changeRhythm(state, data) {
        state.rhythm = data;
    },
    updateRhythm(state, payload) {
        state.rhythm[payload.index].type = payload.type
    },
    deleteRhy(state, payload) {
        if (payload.deleteState) {
            state.rhythm[payload.index].state = payload.stateNum
        } else {
            delete state.rhythm[payload.index].state
        }
    },
    useRhy(state, payload) {
        if (payload.useState) {
            state.rhythm[payload.index].state = payload.stateNum
        } else {
            delete state.rhythm[payload.index].state
        }
    },
    changeHour(state, data) {
        state.currentDateHour = data;
    },
    changeMinNum(state, data) {
        state.currentDateMinNum = data;
    },
    changeDeleteTagState(state, data) {
        state.tagState = data;
    },
    changeDeleteTagState2(state, data) {
        state.deleteTagState2 = data;
    },
    changeUpdateTagQState(state, data) {
        state.updateTagQState = data;
    },
    changeUpdateTagQState2(state, data) {
        state.updateTagQState2 = data;
    },
    changeGetTagRhythmLoading(state, data) {
        state.getTagRhythmLoading = data;
    },
    changeRefreshState(state, data) {
        state.refreshState = data;
    },
    changeEcgChangeDirectionNext(state, data) {
        state.ecgChangeDirectionNext = data;
    },
    changeValidDates(state, data) {
        state.validDates = data.map(v => v.day);
        state.datesIsContainData = data.map(v => v.isContainData);
    },
    changeCurrentDateTags(state, data) {
        state.currentDateTags = data;
    },
    changeLastBlockIndex(state, data) {
        state.lastBlockIndex = data;
    },
    changeRRShowState(state, data) {
        state.RRShowState = data;
    },
    changeRhythmTypeSelectDisabled(state,data){
        state.rhythmTypeSelectDisabled=data;
    },
    resetEcgViewModule(state, data) {
        Util.resetVuexState(state, data);
    }
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}
