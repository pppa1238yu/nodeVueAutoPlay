<template>
    <div style="width: 1300px;margin: 0 auto;">
        <!--顶部时序图-->
        <div style="overflow: hidden">
            <div style="float: left">
                <APViewHeader :setCurrentDate="setCurrentDate" :setLoading="setLoading"></APViewHeader>
            </div>
            <div style="float: left;">
                <el-select v-model="selectType" placeholder="请选择" @change="changeSelectType"
                           style="width: 130px;vertical-align: text-bottom;margin-right: 5px;">
                    <el-option
                            v-for="item in selectTypeOption"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value">
                    </el-option>
                </el-select>
                <div class="buttonClass" style="display: inline-block;vertical-align: text-bottom">
                    <BeatStatisticsBtns
                            :data="beatsData"
                            :defaultActiveIndex="defaultActiveIndex"
                            @change="beatTypeSelect"
                            v-if="hackResetBeatStatisticsBtns"
                    ></BeatStatisticsBtns>
                </div>
            </div>
        </div>
        <div v-loading="mainPageLoading">
            <div class="girdBox" style="padding: 5px 0 10px 0">
                <!--rrIntervalScatter-->
                <div class="normalHeight">
                    <div style="position: relative;width: 600px;height: 588px;background-color: #e1e2e2;border-radius: 4px"
                         id="showCnavasBox">
                        <canvas width="600" height="576" id="RRIntervalCanvas1"
                                style="position: absolute;left: 0; top:0; z-index: 1;"></canvas>
                        <canvas width="600" height="576" id="tempCanvas"
                                style="position: absolute;top: 0;left: 0; z-index: 99"></canvas>
                    </div>
                </div>
                <div class="papaers normalHeight">
                    <!--paperBlock-->
                    <div style="position: relative;min-height: 576px;">
                        <div style="position: absolute; top: -6px;: 14px;pointer-events: none;border-radius: 3px; overflow: hidden; z-index:2002">
                            <canvas id="myCavansScatter" width="596px" height="6px"></canvas>
                        </div>
                        <el-slider v-model="slideValue" style="width: 596px;" :max="pageObj.total"
                                   @change="changeShowArr" v-if="hackResetSlide"></el-slider>
                        <div class="flexPaper" id="flexPaperBox" v-loading="pageLoading">
                            <div class="selectBlock" draggable="false" @mousemove="noDefault"
                                 @touchmove="noDefault"></div>
                            <div class="singlePaper" :data-pos="item.position" draggable="false" v-for="item in showArr"
                                 @dragenter="noDefault"
                                 @dragover="noDefault">
                                <canvas :id="item.position + 'scatter'" width="140px" height="88px"></canvas>
                            </div>
                        </div>
                        <div class="buttonBox">
                            <div style="text-align: center" v-if="selectArray.length">
                                {{Math.floor(pageObj.start / pageObj.limit) + 1}} / {{Math.ceil(pageObj.total /
                                pageObj.limit)}}
                            </div>
                            <div style="text-align: center" v-if="selectArray.length === 0">
                                0 / 0
                            </div>
                            <el-select v-model="selectTypeValue" placeholder="请选择" style="width: 100px;"
                                       :disabled="!selectArr.length"
                                       @change="changeSelect">
                                <el-option
                                        v-for="item in options"
                                        :key="item.value"
                                        :label="item.label"
                                        :value="item.value">
                                </el-option>
                            </el-select>
                            <br>
                            <el-button type="primary" style="margin: 5px 0 5px 0;width: 100px" @click="pageUp"
                                       :disabled="pageObj.start === 0">上一页
                            </el-button>
                            <br>
                            <el-button type="primary" style="margin: 5px 0 5px 0;width: 100px" @click="pageDown"
                                       :disabled="pageObj.total <= pageObj.start + pageObj.limit">下一页
                            </el-button>
                            <br>
                            <el-button type="primary" style="margin: 5px 0 5px 0;width: 100px" @click="selectAll"
                                       :disabled="showArr.length === 0">全选
                            </el-button>
                            <br>
                            <el-button type="primary" style="width: 100px" @click="reverseSelect"
                                       :disabled="showArr.length === 0">反选
                            </el-button>
                            <br>
                            <div style="border: 1px solid #ccc; padding: 8px 5px; border-radius: 2px; margin-top: 5px">
                                <el-checkbox v-model="showEcgChecked" @change="changeCheckState">心电片段</el-checkbox>
                            </div>
                            <div style="margin: 5px 0; text-align: center; font-size: 14px">已选(<span
                                    style="color: #de6f21;font-size: 14px">{{selectArr.length}}</span>)
                            </div>
                            <div style="position: absolute; left: 50%; transform: translateX(-50%)">
                                (<span
                                    style="color: #de6f21;font-size: 14px">{{selectArr.length + '/' + Array.from(selectArrEcg).length}}</span>)
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div :class="showEcgChecked ? 'flexBox': 'flexBoxHide'" v-show="showEcgChecked">
                <!--scatterBlock-->
                <div style="position:relative;width: 1300px;" id="canvasWidthScatter" v-loading="ecgLoading"
                     @click="jumpToEcgPos">
                    <div style="position: absolute;bottom: 20px; left: 0;width: 100%;text-align: center">{{showTime}}
                    </div>
                    <canvas id="scatterCanvas2" :width="canvasWidth" height="230px"></canvas>
                </div>
            </div>
        </div>
    </div>
</template>
<script>

    import API from '../api/api_block_view';
    import API_ECG from '../api/api_ecg_view';
    import {mapState, mapMutations, mapActions} from 'vuex';
    import {EcgViewer} from '../common/ecg_viewer';
    import axios from 'axios';
    import echarts from 'echarts';
    import {bus} from '../bus';
    import APViewHeader from '../components/afView/AFViewGuoHeader.vue';
    import Util from '../common/util';
    import BeatStatisticsBtns from '../components/common/BeatStatisticsBtns.vue';
    import LateralDateSelector from '../components/common/LateralDateSelector.vue';

    export default {
        name: 'scatterView',
        components: {
            APViewHeader,
            BeatStatisticsBtns
        },
        data() {
            return {
                showEcgChecked: true,
                options: [
                    {value: 'N', label: 'N'},
                    {value: 'S', label: 'S'},
                    {value: 'V', label: 'V'},
                    {value: 'Q', label: 'Q'}
                ],
                slideValue: 0,
                defaultActiveIndex: -1,
                datesRange: [
                    {
                        date: '2019-02-10',
                        from: 0,
                        to: 5000000
                    },
                    {
                        date: '2019-02-12',
                        from: 0,
                        to: 5000000
                    }
                ],
                mainPageLoading: false,
                selectTypeOption: [],
                datePageIndex: 0,
                selectTypeValue: '',
                selectType: '',
                selectTypeNormal: '',
//                paperBlock
                select: false,
                selectArr: [],
                onCtrlButton: false,
                onShiftButton: false,
                showArr: [],
                pageLoading: false,
                hackReset: true,
                ecgLoading: false,
                onShiftStart: -1,
                selectBlock: {
                    startX: 0,
                    startY: 0
                },
                pageObj: {
                    limit: 24,
                    start: 0,
                    total: 0
                },
                //scatterBlock
                report_id: 0,
                ecgViewer: null,
                ecgData: [],
                tagData: [],
                hackResetBeatStatisticsBtns: true,
                canvasWidth: '',
                highLightBlock: {
                    start: 632,
                    end: 664
                },
                highLightBlockSlice: {
                    start: 60,
                    end: 80
                },
                showPosition: -5120,
                //rrInterval
                fillColorMap: {
                    N: Util.nTag, //#1dd307
                    V: Util.vTag,
                    S: Util.sTag,
                    Q: Util.qTag
                },
                selectArrEcg: new Set(),
                selectArray: [],
                selectArrLen: 0,
                hackResetSlide: true,
                beatsData: {
                    N: 0,
                    V: 0,
                    S: 0,
                    Q: 0
                },
                allCount: 0,
                curShowData: [],
                changeVSState: false,
                showTime: '',
                currentDate: '',
                selectSpliceType: ''
            }
        },
        computed: {
            datesPageNum: function () {
                return Math.floor(this.datesRange.length / 7)
            },
            ...mapState('ecgView', {
                perDateData: state => state.perDateData,
                changeReset: state => state.changeReset,
                ecgFastData: state => state.ecgFastData,
                ecgStartTime: state => state.ecgStartTime,
                tagChangeState: state => state.tagChangeState,
                selectComponent: state => state.selectComponent,
                validDates: state => state.validDates,
                pageChanged: state => state.pageChanged,
                datesIsContainData: state => state.datesIsContainData,
                lastBlockIndex: state => state.lastBlockIndex
            })
        },
        created() {
            this.currentDate = this.validDates[0];
        },
        watch: {
            showPosition: function () {
                this.ecgLoading = true;
                let moveToPosition = this.showPosition;
                if (moveToPosition > 2560) moveToPosition = moveToPosition - 2560;
                if (moveToPosition === -5120) {
                    this.showTime = '';
                } else {
                    this.showTime = this.calcEcgTime(moveToPosition + 2560);
                }
                this.ecgViewer.moveTo(moveToPosition);
            },
            selectArr: function () {
                this.initCanvasScatter();
            },
            selectArray: function () {
                this.selectArr = [];
                this.showPosition = -5120;
                this.showArr = [];
                this.init();
            },
            changeReset: function () {
                this.mainPageLoading = false;
                this.changeVSCount();
                this.initCanvasEcg();
            },
            selectComponent: function () {
//                this.selectArrEcg = new Set();
                if (this.selectComponent === 'scatter') {
                    if (this.tagChangeState[0]) {
                        let tempArr = Object.assign(this.tagChangeState);
                        tempArr[0] = false;
                        this.changeTagState(tempArr);
                        this.changeVSState = true;
                        this.showArr = [];
                        this.changeVSCount();
                        this.initCanvasEcg();
                    }
                    if (this.perDateData[this.currentDate].changed) {
                        this.mainPageLoading = true;
                        setTimeout(() => {
                            this.changeVSTagData(this.currentDate)
                        }, 200);
                    }
                }
            },
        },
        beforeDestroy() {
            $('#scatterCanvas2').remove();
            $(document).off();
            this.ecgViewer = null
        },
        deactivated() {
            this.ecgViewer = null
            $(document).off();
        },
        activated() {
            this.initEcgViewer();
            this.ecgViewer.moveTo(this.showPosition - 2560);
            this.bindDocumentEvents();
        },
        mounted() {
            let that = this;
            let firstValidIndex = Util.firstExistDataIndex(this.datesIsContainData);
            this.currentDate = this.validDates[firstValidIndex];
            if (this.perDateData[this.currentDate].changed) {
                this.mainPageLoading = true;
                setTimeout(() => {
                    this.changeVSTagData(this.currentDate)
                }, 200);
            } else {
                this.changeVSCount();
            }
//          rrInterval
            this.changeType('scatter');
            this.initCanvasEcg();

//            this.bindDocumentEvents();
            const scrollFun = function (e) {
                e.preventDefault();
                e.stopPropagation();
                /**
                 * 防抖处理
                 * @type {null}
                 */
                clearTimeout(timeoutTime);
                timeoutTime = setTimeout(() => {
                    if (that.selectArray.length) {
                        if (!that.pageLoading) {
                            let scrollWay = e.deltaY || e.detail;
                            if (scrollWay > 0) {
                                if (that.pageObj.total > that.pageObj.start + that.pageObj.limit) {
                                    that.pageDown();
                                }
                            } else {
                                if (that.pageObj.start !== 0) {
                                    that.pageUp();
                                }
                            }
                        }
                    }
                }, 300);
            };
//          paperBlock

            let timeoutTime = null;
            document.getElementById('flexPaperBox').addEventListener('DOMMouseScroll', scrollFun);
            document.getElementById('flexPaperBox').addEventListener('mousewheel', scrollFun);

            $('.flexPaper').on('mousedown', function (e) {
                e.stopPropagation();
                e.preventDefault();
                if (!that.select) {
                    that.select = true;
                    that.selectBlock.startX = e.clientX - $('.flexPaper').offset().left;
                    that.selectBlock.startY = e.clientY - $('.flexPaper').offset().top;
                    $('.selectBlock').css({
                        display: 'block',
                        left: that.selectBlock.startX,
                        top: that.selectBlock.startY
                    });
                } else {
                    that.select = false;
                    that.isOverlap();
                }
            });
            $('.flexPaper').on('mouseup', function () {
                that.select = false;
                that.isOverlap();
            });
            $('.flexPaper').on('mouseleave', function () {
                that.select = false;
//                that.isOverlap();
            });
            $('.flexPaper').on('mousemove', function (e) {
                if (that.select) {
                    let width = e.clientX - $('.flexPaper').offset().left - that.selectBlock.startX;
                    let height = e.clientY - $('.flexPaper').offset().top - that.selectBlock.startY;
                    if (width >= 0) {
                        if (height >= 0) {
                            $('.selectBlock').css({
                                width: Math.abs(width),
                                height: Math.abs(height)
                            });
                        } else {
                            $('.selectBlock').css({
                                width: Math.abs(width),
                                height: Math.abs(height),
                                left: e.clientX - $('.flexPaper').offset().left - Math.abs(width),
                                top: e.clientY - $('.flexPaper').offset().top
                            });
                        }

                    } else {
                        if (height >= 0) {
                            $('.selectBlock').css({
                                width: Math.abs(width),
                                height: Math.abs(height),
                                left: e.clientX - $('.flexPaper').offset().left,
                                top: e.clientY - $('.flexPaper').offset().top - Math.abs(height)
                            });
                        } else {
                            $('.selectBlock').css({
                                width: Math.abs(width),
                                height: Math.abs(height),
                                left: e.clientX - $('.flexPaper').offset().left,
                                top: e.clientY - $('.flexPaper').offset().top
                            });
                        }
                    }
                } else {
                    $('.selectBlock').css({
                        display: 'none',
                        width: 0,
                        height: 0
                    });
                }
            });
            //scatterBlock
            this.report_id = localStorage.getItem('report_id');
            this.canvasWidth = $('#canvasWidthScatter').width();
            this.initEcgViewer();
            this.ecgViewer.moveTo(this.showPosition - 2560);
        },
        methods: {
            ...mapActions('ecgView', [
                'changeVSTagData'
            ]),
            ...mapMutations('ecgView', [
                'changeTagState',
                'changeFastData',
                'changePerDayData',
                'changeSelectComponent',
            ]),
//            paperBlock
            ...mapMutations('paperBlock', [
                'changeshowPosition'
            ]),
            beatTypeSelect(item) {
                this.pageObj.start = 0;
                this.pageObj.total = 0;
                this.changeSelectType(item, true)
            },
            bindDocumentEvents() {
                let that = this;
                const actions = new Map([
                    ['default', () => false],
                    ['49', () => this.changeSelect('N')],
                    ['50', () => this.changeSelect('V')],
                    ['51', () => this.changeSelect('S')],
                    ['52', () => this.changeSelect('Q')],
                    ['97', () => this.changeSelect('N')],
                    ['98', () => this.changeSelect('V')],
                    ['99', () => this.changeSelect('S')],
                    ['100', () => this.changeSelect('Q')]
                ]);
                const onButtonClick = (keyCode, onShift) => {
                    let tempKeyCode = keyCode.toString();
                    let action = null;
                    action = actions.get(tempKeyCode) || actions.get('default');
                    action.call(this);
                };
                let documentKeyDown = function (e) {
                    if (that.selectComponent === 'scatter') {
                        that.onCtrlButton = e.ctrlKey;
                        that.onShiftButton = e.shiftKey;
                        let keyCode = e.keyCode;
                        onButtonClick(keyCode);
                        if (e.shiftKey) {
                            if (that.selectArr.length) {
                                if (that.onShiftStart === -1) {
                                    that.onShiftStart = that.selectArr[0];
                                }
                            } else {
                                that.onShiftStart = -1;
//                        that.$message('请先选择起始卡片')
                            }
                        }
                    }
                };
                let documentKeyUp = function () {
                    that.onCtrlButton = false;
                    that.onShiftButton = false
                };
                $(document).on('keydown', documentKeyDown);
                $(document).on('keyup', documentKeyUp);
            },
            initCanvasScatter() {
                let c_canvas = document.getElementById('myCavansScatter');
                if (c_canvas === null) {
                    return;
                }
                let context = c_canvas.getContext("2d");
                let width = 596;
                let height = c_canvas.height;
                context.clearRect(0, 0, width, height);
                context.beginPath();
                let per = 1 / this.pageObj.total * width;
                this.selectArr.map(item => {
                    let x = item / this.pageObj.total * width;
                    let endWidth = per;
                    context.fillStyle = 'rgba(255,0,0,.5)';
                    context.fillRect(x, 0, endWidth, 6);
                });
                context.stroke();
                context.closePath();
            },
            initEcgViewer() {
                if (this.ecgViewer === null) {
                    this.ecgViewer = new EcgViewer(
                        this.report_id, // reportId
                        512 * 60, // 块大小
                        this.lastBlockIndex + 1, // 块数量
                        512 * 10, // 显示数据量
                        0, // 向前预加载显示数据的2倍
                        0, // 向后预加载显示数据的2倍,
                        () => {
                            this.ecgData = this.ecgViewer.getVisibleData();
                            if (this.ecgData) {
                                let requestId = this.ecgViewer.getRequestId();
                                axios.get('/ecg/abnormal_list', {
                                    headers: {
                                        'id': requestId
                                    },
                                    params: {
                                        report_id: this.report_id,
                                        start: this.showPosition - 2560,
                                        end: this.showPosition + 2560
                                    }
                                }).then(data => {
                                    this.ecgLoading = false;
                                    this.tagData = data.data.tagPos;
                                    let index = this.tagData.findIndex((val) => {
                                        return val.p === this.showPosition
                                    });
                                    if (index === -1) {
                                        this.selectSpliceType = 'N';
                                    } else {
                                        this.selectSpliceType = this.tagData[index].t;
                                    }
                                    this.initCanvas();
                                }).catch(err => {
                                    this.ecgLoading = false;
                                });
                            }
                        }
                    );
                }
            },
            setLoading() {
                this.mainPageLoading = true;
            },
            setCurrentDate(index) {
                if (this.currentDate !== this.validDates[Number(index)]) {
                    $('.normalButton').removeClass('dashBorder');
                    this.currentDate = this.validDates[Number(index)];
                    this.changeVSState = true;
                    this.slideValue = 0;
                    this.selectType = 'ALL';
                    this.resetBeatStatisticsBtns();
                    this.selectTypeNormal = '';
                    if (this.perDateData[this.currentDate]) {
                        this.changeVSCount();
                        this.initCanvasEcg();
                    } else {
                        this.mainPageLoading = true;
                    }
                }
            },
            resetBeatStatisticsBtns() {
                this.hackResetBeatStatisticsBtns = false;
                this.$nextTick(() => {
                    this.hackResetBeatStatisticsBtns = true;
                });
            },
            changeShowArr(val) {
                let release = val % 24;
                this.pageObj = {
                    ...this.pageObj,
                    start: val - release
                };
                this.getSelectPointEcg();
            },
            changeSelectType(val, fromNormalButton = false) {
                if (val !== 'N' && val !== 'V' && val !== 'Q' && val !== 'S') $('.normalButton').removeClass('dashBorder');
                if (fromNormalButton) {
                    this.selectTypeNormal = val;
                    this.selectType = '';
                } else {
                    this.selectTypeNormal = '';
                    this.selectType = val;
                }
                this.slideValue = 0;
                this.hackResetSlide = false;
                this.$nextTick(() => {
                    this.hackResetSlide = true;
                });
                this.selectArrEcg = new Set();
                this.showArr = [];
                this.showPosition = -5120;
                this.changeVSState = true;
                this.initCanvasEcg();
            },
            noDefault(e) {
                e.preventDefault();
                e.stopPropagation();
            },
            jumpToEcgPos() {
                if (this.showPosition !== -5120) {
                    this.changeSelectComponent('main');
                    bus.$emit('getPosEcg', this.showPosition, false);
                }
            },
            changeVSCount() {
                this.showArr = [];
                let tempArr = [];    // 用于展示的下拉框
                let tagObj = {};    //获取vuex的clone数据
                if (this.perDateData[this.currentDate].tag) {
                    tagObj = Object.assign(this.perDateData[this.currentDate].tag)
                }
                this.allCount = this.flatArray(tagObj.allTagData).length;
                this.beatsData = {
                    N: this.flatArray(tagObj.nTagData).length,
                    V: this.flatArray(tagObj.vTagData).length,
                    S: this.flatArray(tagObj.sTagData).length,
                    Q: this.flatArray(tagObj.qTagData).length
                };
                Object.keys(tagObj).map(item => {
                    let tempFlatArray = this.flatArray(tagObj[item]);
                    let type = item.split('Tag')[0].toUpperCase();
                    if (type === 'ALL') {
                        tempFlatArray.length ? tempArr.push({label: `全部(${tempFlatArray.length})`, value: type}) : null
                    } else {
                        tempFlatArray.length ? tempArr.push({
                            label: `${type}(${tempFlatArray.length})`,
                            value: type
                        }) : null
                    }
                });
                this.selectTypeOption = tempArr;
                if (this.selectTypeNormal !== '') {
                    return;
                }
                if (tempArr.filter(item => item.value === this.selectType).length === 0) {
                    this.selectType = 'ALL'
                }
                if (tempArr.length) {
                    if (this.selectType === '') this.selectType = 'ALL'
                }
            },
            flatArray(arr) {
                if (arr === undefined) return [];
                return arr.reduce((pre, cur) => {
                    return pre.concat(cur);
                }, []);
            },
            binarySearch(positions, type) {
                let tempData = Object.assign(this.perDateData[this.currentDate]['data']);
                positions.map(item => {
                    let tempDataItem = JSON.parse(tempData[item.i]);
                    if (tempDataItem.t !== type) {
                        tempDataItem.t = type;
                        tempData[item.i] = JSON.stringify(tempDataItem);
                    }
                });
                this.changePerDayData({
                    date: this.currentDate,
                    tagData: tempData,
                    tag: {},
                    changed: true
                });
                this.changeVSTagData(this.currentDate);
            },
            editBeatType(type, positions) {
                this.pageLoading = true;
                let reportId = localStorage.getItem('report_id'); //报告id
                let sendArr = [];  //并发ajax请求储存数组
                // let tempSendArr = [];
                // const BLOCK_SIZE = 512 * 60;
                // let nextBound = parseInt(positions[0].p / BLOCK_SIZE) * BLOCK_SIZE + BLOCK_SIZE;
                // for (let position of positions) {
                //     if (position.p >= nextBound) {
                //         sendArr.push(API.changeBeatType({beatType: type, positions: tempSendArr}, reportId));
                //         tempSendArr = [];
                //         nextBound += BLOCK_SIZE * 100;
                //     }
                //     tempSendArr.push(position.p);
                // }
                // if (tempSendArr.length) {
                let sendPos = positions.map(item => item.p);
                sendArr.push(API.changeBeatType({beatType: type, positions: sendPos}, reportId));
                // }
                axios.all(sendArr)
                    .then(axios.spread(() => {
                        // 将多个请求获取到的position同步到本地代码
                        // let notWorkPositions = [];
                        // arguments.map(item => notWorkPositions = notWorkPositions.concat(item));
                        this.pageLoading = false;
                        this.slideValue = 0;
                        if (this.selectType === '') {
                            let releaseNums = 0;
                            for (let i = 0; i < this.selectArr.length; i++) {
                                if (this.selectArr[i] < this.pageObj.start) {
                                    releaseNums++;
                                }
                            }
                            let reduceNum = Math.ceil(releaseNums / this.pageObj.limit) * this.pageObj.limit;
                            this.pageObj = {
                                ...this.pageObj,
                                start: this.pageObj.start - reduceNum
                            };
                        }
                        this.changeVSCount();
                        this.showPosition = -5120;
                        this.binarySearch(positions, type);
                        this.changePageState()
                    })).catch(err => {
                        this.pageLoading = false;
                })
            },
            // 当前页面改变，改变其他页面对应的状态值
            changePageState() {
                let arr = []
                this.tagChangeState.map((val, index) => {
                    if (index === 0) {
                        arr.push(false)
                    } else {
                        arr.push(true)
                    }
                })
                this.changeTagState(arr);
            },
            changeSelect(val) {
                let temp = [];
                this.selectArrEcg = new Set();
                this.selectArr.map(item => {
                    temp.push(this.selectArray[item]);
                });
                if (this.selectArr.length === 0) return;
                if (this.selectType === val || this.selectTypeNormal === val) return;
                this.selectArrLen = this.selectArr.length;
                let accessUserType = JSON.parse(localStorage.getItem('access-user')).userType;
                // if (accessUserType === 2 || accessUserType === 4) {
                //     this.$message.error('不能修改该状态下的报告');
                // } else {
                this.editBeatType(val, temp);
                // }
                this.selectTypeValue = '';
            },
            init() {
                // this.pageObj.start = 0;
                // this.pageObj.total = 0;
                this.getSelectPointEcg();
            },
            //计算每行心电起始时间
            calcEcgTime(index) {
                let startDate = new Date(this.ecgStartTime);
                startDate.setSeconds(startDate.getSeconds() + Math.floor(index / 512));
                let hour = startDate.getHours() < 10 ? '0' + startDate.getHours() : startDate.getHours();
                let minute = startDate.getMinutes() < 10 ? '0' + startDate.getMinutes() : startDate.getMinutes();
                let second = startDate.getSeconds() < 10 ? '0' + startDate.getSeconds() : startDate.getSeconds();
                return hour + ':' + minute + ':' + second;
            },
            addArr(index) {
                if (!this.onShiftButton) {
                    index = index + this.pageObj.start;
                }
                let selectIndex = this.selectArr.indexOf(index);
                if (selectIndex === -1) {
                    this.selectArr.push(index);
                    this.selectArr.sort((a, b) => a - b);
                    if (this.showArr[index - this.pageObj.start]) {
                        this.showPosition = this.showArr[index - this.pageObj.start].position;
                    }
                } else if (this.onShiftButton) {
                    this.selectArr.push(index);
                    this.selectArr.sort((a, b) => a - b);
                    let lastIndex = this.selectArr[this.selectArr.length - 1];
                    if (this.showArr[index - this.pageObj.start]) {
                        this.showPosition = this.showArr[index - this.pageObj.start].position;
                    }
                } else {
                    this.selectArr.splice(selectIndex, 1);
                    let lastIndex = this.selectArr[this.selectArr.length - 1];
                    if (lastIndex >= this.pageObj.limit + this.pageObj.start) {
                        lastIndex = index;
                    }
                    if (this.showArr[index - this.pageObj.start]) {
                        this.showPosition = this.showArr[index - this.pageObj.start].position;
                    }
                }
            },
            //scatterBlock
            initCanvas() {
                let c_canvas = $('#scatterCanvas2')[0];
                let options = {
                    data: this.ecgData,
                    frequency: 512 * 10,
                    x_start_pos: 0,
                    x_end_pos: this.canvasWidth,
                    y_start_pos: [30],
                    y_height: 200,
                    add: 10,
                    tagData: this.tagData,
                    rhythm: []
                };
                if (c_canvas) {
                    let context = c_canvas.getContext("2d");
                    context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                    this.drawGrid(c_canvas, options);
                }
            },
            drawBigGrid(c_canvas, x_pos, x_end_pos, y_start_pos, y_height) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#000";
                context.strokeWidth = 1;
                context.beginPath();
                context.strokeRect(0, 0, x_end_pos, y_height + 30);
                y_start_pos.map(item => {
                    let y_end_pos = item + y_height;
                    context.moveTo(x_pos + 0.5, item + 0.5);
                    context.lineTo(x_end_pos, item + 0.5);
                    context.moveTo(x_pos + 0.5, item + 0.5);
                    context.lineTo(x_pos + 0.5, y_end_pos - 0.5);
                    context.moveTo(x_end_pos, item + 0.5);
                    context.lineTo(x_end_pos, y_end_pos - 0.5);
                    context.moveTo(x_pos + 0.5, y_end_pos - 0.5);
                    context.lineTo(x_end_pos, y_end_pos - 0.5);
                });
                context.stroke();
                return;
            },
            drawMediumGrid(c_canvas, x_pos, x_end_pos, y_start_pos, y_height) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#c3c3dc";
                context.strokeWidth = 1;
                context.beginPath();
                y_start_pos.map(item => {
                    let y_end_pos = item + y_height;
                    for (let x = x_pos; x < x_end_pos; x += 25) {
                        context.moveTo(x + 0.5, item + 0.5);
                        context.lineTo(x + 0.5, y_end_pos - 0.5);
                    }
                    for (let y = item; y < y_end_pos; y += 25) {
                        context.moveTo(x_pos + 0.5, y + 0.5);
                        context.lineTo(x_end_pos, y + 0.5);
                    }
                });
                context.stroke();
                return;
            },
            drawSmallGrid(c_canvas, x_pos, x_end_pos, y_start_pos, y_end_pos) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#d7e7ed";
                context.beginPath();
                for (let x = x_pos; x <= x_end_pos; x += 5) {
                    context.moveTo(x + 0.5, 30 + 0.5);
                    context.lineTo(x + 0.5, y_end_pos + 30 - 0.5);
                }
                for (let y = 30; y <= y_end_pos + 30; y += 5) {
                    context.moveTo(x_pos + 0.5, y + 0.5);
                    context.lineTo(x_end_pos, y + 0.5);
                }
                context.stroke();
            },
            drawEcg(c_canvas, data, x_pos, x_end_pos, y_start_pos, frequency, add, y_height) {
                let context = c_canvas.getContext("2d");
                context.lineWidth = 1;
                context.beginPath();
                let length = data.length;
                context.moveTo(x_pos, y_height / 2 + y_start_pos[0]);
                let color = this.fillColorMap[this.selectSpliceType];
                if (this.selectSpliceType === 'N') {
                    color = '#312bff'
                }
                for (let i = 0; i < length; i++) {
                    let xPosition = x_pos + i % frequency / frequency * (x_end_pos - x_pos);
                    let yPosition = 30 - data[i] * add * 5 + y_height / 2;
                    if (xPosition >= this.highLightBlock.start && xPosition <= this.highLightBlock.end) {
                        if (context.strokeStyle !== color) {
                            context.stroke();
                            context.beginPath();
                            context.strokeStyle = color;
                        }
                    } else {
                        if (context.strokeStyle !== '#030304') {
                            context.stroke();
                            context.beginPath();
                            context.strokeStyle = '#030304';
                        }
                    }
                    context.lineTo(xPosition, yPosition);
                }
                context.stroke();
                return;
            },
            drawTags(c_canvas, x_pos, x_end_pos, y_start_pos, tagData, frequency) {
                let context = c_canvas.getContext("2d");
                context.beginPath();

                tagData.map((item, index) => {
                    let xPosition = (item.p - this.showPosition + 2560) % frequency / frequency * (x_end_pos - x_pos) + x_pos;
                    context.font = "12pt Calibri";
                    if (item.t === this.selectType || this.selectTypeNormal) {
                        context.fillStyle = "red";
                        context.fillText(item.t, xPosition - 10, 20);
                    } else {
                        context.lineWidth = 1;
                        context.fillStyle = "#000";
                        context.fillText(item.t, xPosition - 10, 20);
                    }
                    context.lineWidth = 2;
                    if (xPosition - 18 === this.highLightBlock.start && xPosition + 14 === this.highLightBlock.end) {
                        context.strokeStyle = '#224df8';
                        context.strokeRect(this.highLightBlock.start, 30, 30, 199);
                    }
                    if (tagData[index + 1]) {
                        context.fillStyle = "#000";
                        let fillText = parseInt((tagData[index + 1].p - tagData[index].p) / 512 * 1000);
                        let nextXPosition = (tagData[index + 1].p - this.showPosition + 2560) % frequency / frequency * (x_end_pos - x_pos) + x_pos;
                        context.font = "10pt Calibri";
                        context.fillText(fillText, xPosition + (nextXPosition - xPosition) / 2 - 10, 20);
                    }
                    context.moveTo(xPosition - 4, 30);
                    context.lineTo(xPosition - 4, 26);
                });
                context.stroke();
                return;
            },
            drawGrid(c_canvas, options) {
                let {data, x_start_pos, x_end_pos, y_start_pos, y_height, tagData, frequency, add, rhythm} = {...options};
//                绘制网格线
                this.drawSmallGrid(c_canvas, x_start_pos, x_end_pos, y_start_pos, y_height);
                this.drawMediumGrid(c_canvas, x_start_pos, x_end_pos, y_start_pos, y_height);
                this.drawBigGrid(c_canvas, x_start_pos, x_end_pos, y_start_pos, y_height);
                if (this.showPosition !== -5120) {
                    this.drawTags(c_canvas, x_start_pos, x_end_pos, y_start_pos, tagData, frequency);
                    this.drawEcg(c_canvas, data, x_start_pos, x_end_pos, y_start_pos, frequency, add, y_height);
                }
            },
//            rrInterval
            ...mapMutations('paperBlock', [
                'changeSelected',
                'changeType'
            ]),
            initCanvasEcg(option = {}) {
                let c_canvas = document.getElementById('RRIntervalCanvas1');
                let tempCanvas = document.getElementById('tempCanvas');
                this.selectArrEcg = new Set();
                this.showArr = [];
                this.curShowData = [];
                if (this.selectTypeNormal !== '') {
                    this.curShowData = this.flatArray(this.perDateData[this.currentDate]['tag'][`${this.selectTypeNormal.toLowerCase()}TagData`]);
                } else {
                    this.curShowData = this.flatArray(this.perDateData[this.currentDate]['tag'][`${this.selectType.toLowerCase()}TagData`]);
                }
                let options = {
                    data: this.curShowData,
                    rhythms: [],
                    x_start_pos: 40,
                    x_end_pos: 560,
                    timeData: [0, 500, 1000, 1500, 2000, 2500, 3000],
                    yMax: 3000
                };
                options = Object.assign(options, option);
                if (c_canvas && tempCanvas) {
                    let context = c_canvas.getContext("2d");
                    let tempContext = tempCanvas.getContext("2d");
                    context.beginPath();
                    context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                    if (this.changeVSState) {
                        tempContext.beginPath();
                        tempContext.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
                    }
                    this.drawGridEcg(c_canvas, options);
                    this.draw(tempCanvas, tempContext, options);
                    this.changeVSState = false;
                }
            },
            draw(canvas, ctx, options) {
                let that = this;
                let {x_start_pos, x_end_pos, timeData, data, yMax, rhythms} = {...options};
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                that.drawScatter(ctx, x_start_pos, x_end_pos, data, yMax, rhythms);
                canvas.onmousedown = null;
                canvas.onmouseleave = null;
                document.onmouseup = null;
                document.onmouseup = null;
                canvas.onmousedown = function (ev) {
                    that.pageObj = {
                        ...that.pageObj,
                        start: 0,
                        total: 0
                    };
                    that.slideValue = 0;
                    var ev = ev || event;
                    that.selectArrEcg = new Set();
                    ctx.beginPath();
                    ctx.strokeStyle = "#000";
                    ctx.moveTo(ev.layerX, ev.layerY);
                    let lastPos = {
                        x: 0,
                        y: 0
                    };
                    canvas.onmousemove = function (ev) {
                        var ev = ev || event;
                        let distanse = Math.pow(ev.layerX - lastPos.x, 2) + Math.pow(ev.layerY - lastPos.y, 2);
                        if (distanse >= 400) {
                            lastPos = {
                                ...lastPos,
                                x: ev.layerX,
                                y: ev.layerY
                            };
                            ctx.lineTo(ev.layerX, ev.layerY);
                            ctx.stroke();
                        }
                    };
                    canvas.onmouseup = function (ev) {
                        canvas.onmousemove = canvas.onmouseup = canvas.onmouseleave = null;
                        ctx.closePath();
                        ctx.stroke();
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        that.drawScatter(ctx, x_start_pos, x_end_pos, data, yMax, rhythms);
                    };
                    canvas.onmouseleave = function () {
                        ctx.closePath();
                        ctx.stroke();
                        canvas.onmouseleave = null;
                        canvas.onmousemove = null;
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        that.drawScatter(ctx, x_start_pos, x_end_pos, data, yMax, rhythms);
//                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                };

            },
            drawGridEcg(c_canvas, options) {
                let {x_start_pos, x_end_pos, timeData, data, yMax, rhythms} = {...options};
                this.drawClickEcg(c_canvas, x_start_pos, x_end_pos, timeData, yMax);
//                this.drawScatter(c_canvas, x_start_pos, x_end_pos, data, yMax, rhythms);
            },
            drawClickEcg(c_canvas, x_start_pos, x_end_pos, timeData, yMax) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#000";
                context.strokeWidth = 1;
                context.beginPath();
                context.font = "8pt Calibri";
                context.fillStyle = '#000';
                // 绘制x,y轴
                context.moveTo(x_start_pos, 566);
                context.lineTo(x_start_pos, 10);
                context.moveTo(x_start_pos, 566);
                context.lineTo(x_end_pos, 566);
                //画坐标轴的单位
                context.fillText('(ms)', 45, 20);
                context.fillText('(ms)', x_end_pos + 15, 572);
                // 绘制y轴click
                for (let y = yMax; y >= 0; y -= 500) {
                    context.moveTo(x_start_pos, 10 + (yMax - y) * (556 / yMax));
                    context.lineTo(x_start_pos - 6, 10 + (yMax - y) * (556 / yMax));
                    if (y % 1000 === 0) {
                        if (y > 0) {
                            context.fillText(y, x_start_pos - 32, 13 + (yMax - y) * (556 / yMax));
                        } else {
                            context.fillText(y, x_start_pos - 14, 13 + (yMax - y) * (556 / yMax));
                        }
                    }
                }
                //                绘制x轴click
                for (let x = 0; x < timeData.length; x++) {
                    let xPos = x_start_pos + x * (x_end_pos - x_start_pos) / 6;
                    if (x === 0) continue;
                    context.moveTo(xPos, 561);
                    context.lineTo(xPos, 566);
                    if (timeData[x] % 1000 === 0) {
                        context.fillText(timeData[x], xPos - 12, 576);
                    }
                }
                context.stroke();
                context.closePath();

            },
            drawScatter(ctx, x_start_pos, x_end_pos, data, yMax, rhythms) {
                for (let i = 0; i < data.length; i++) {
                    if (data[i].t !== 'O') {
                        let x = data[i].x;
                        let y = data[i].y;
                        if (x <= 0) {
                            x = 100;
                        }
                        if (y <= 0) {
                            y = 100;
                        }
                        if (x >= 3000) {
                            x = 2900;
                        }

                        if (y >= 3000) {
                            y = 2900;
                        } else {
                            y = y + 30;
                        }
                        let xPos = x_start_pos + (x_end_pos - x_start_pos) / 3000 * x;
                        let yPos = 10 + (yMax - y) * (566 / yMax);
                        if (ctx.isPointInPath(xPos + 4, yPos)) {
                            this.selectArrEcg.add(data[i]);
                        }
                        ctx.fillStyle = this.fillColorMap[data[i].t];
                        ctx.fillText('●', xPos, yPos + 4);
                        ctx.stroke();
                    }
                }
                this.selectArray = Array.from(this.selectArrEcg).sort((a, b) => a.p - b.p);
            },
            /**
             *  心电片段模块代码
             */
            /**
             *  1、 isOverLap 是否在框选区域
             *  用于在心电片段用鼠标框选，判断鼠标框选区域和singlePaper Div是否有重叠，有重叠则被选中
             */
            isOverlap() {
                if (!this.onCtrlButton && !this.onShiftButton) {
                    this.selectArr = [];
                }
                let aim = $('.selectBlock');
                let offsetAim = aim.offset();
                let topAim = offsetAim.top;
                let leftAim = offsetAim.left;
                let widthAim = aim.width();
                let heightAim = aim.height();
                for (let i = 0, len = $('.singlePaper').length; i < len; i++) {
                    let obj = $('.singlePaper').eq(i);
                    let offsetObj = obj.offset();
                    let topObj = offsetObj.top;
                    let leftObj = offsetObj.left;
                    let widthObj = obj.width();
                    let heightObj = obj.height();
                    let isOverlap = true;
                    if (leftAim > leftObj + widthObj) {
                        isOverlap = false;
                    }
                    if (leftAim + widthAim < leftObj) {
                        isOverlap = false;
                    }
                    if (topAim >= topObj + heightObj) {
                        isOverlap = false;
                    }
                    if (topAim + heightAim < topObj) {
                        isOverlap = false;
                    }
                    if (isOverlap) {
                        if (!this.onShiftButton) {
                            this.onShiftStart = i + this.pageObj.start;
                        }
                        if (this.onCtrlButton) {
                            this.addArr(i);
                            this.onCtrlButton = false;
                        } else if (this.onShiftButton) {
                            if (this.selectArr.length === 0) {
                                this.addArr(i);
                            } else {
                                this.selectArr = [];
                                let endIndex = i + this.pageObj.start;
                                let startIndex = this.onShiftStart;
                                if (startIndex > endIndex) {
                                    let temp = startIndex;
                                    startIndex = endIndex;
                                    endIndex = temp;
                                }
                                for (let i = startIndex; i <= endIndex; i++) {
                                    this.addArr(i);
                                }
                            }
                            this.onShiftButton = false;
                        } else {
                            this.addArr(i);
                        }
                    }
                }
                this.drawSelectBorder();
                $('.selectBlock').css({
                    display: 'none',
                    width: 0,
                    height: 0
                });
            },
            /**
             * 上一页
             */
            pageUp() {
                if (this.pageObj.start <= 0) {
                    this.pageObj.start = 0;
                } else {
                    this.pageObj.start -= this.pageObj.limit;
                }
                this.getSelectPointEcg(false);
            },
            /**
             * 下一页
             */
            pageDown() {
                if (this.pageObj.start + this.pageObj.limit < this.pageObj.total) {
                    this.pageObj.start += this.pageObj.limit;
                }
                this.getSelectPointEcg(false);
            },
            /**
             * 获取选中区域Ecg心电数据并绘制图形
             * @param changeBeat  是否变换的类型和初始类型不一样，不一样则要对页码进行操作
             * @param redraw  是否需要对页码进行操作
             */
            getSelectPointEcg(changeBeat = true, redraw = false) {
                if (this.selectArray.length) {
                    // this.pageLoading = true;
                    if (redraw) {
                        if (changeBeat) {
                            if (this.pageObj.start !== 0) {
                                if (this.pageObj.start >= this.pageObj.total - this.selectArrLen) {
                                    this.pageObj.start -= this.pageObj.limit;
                                }
                            }
                        }
                    }
                    let positionsArray = this.selectArray.slice(this.pageObj.start, this.pageObj.start + this.pageObj.limit);
                    let positions = positionsArray.map(item => item.p);
                    API.getBlockData({
                        limit: this.pageObj.limit,
                        positions: positions,
                        report_id: localStorage.getItem('report_id'),
                        start: 0
                    }).then(data => {
                        this.pageLoading = false;
                        /**
                         *  当获取数据的长度为0时 需要将页码返回上一页，并重新获取数据
                         */
                        if (data.length === 0) {
                            this.getSelectPointEcg(true, true);
                            return;
                        }
                        this.pageObj.total = this.selectArray.length;
                        this.slideValue = this.pageObj.start + data.length;
                        this.showArr = data;
                        this.$nextTick(() => {
                            this.showArr.map(item => {
                                let showData = item.voltages;
                                let id = '#' + item.position + 'scatter';
                                let c_canvas = $(id)[0];
                                if (c_canvas) {
                                    let context = c_canvas.getContext("2d");
                                    context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                                    let type = '';
                                    if (item.beat) type = item.beat.type;
                                    this.drawEcgPart(context, showData, item.position, type);
                                }
                            });
                            this.$nextTick(() => {
                                this.drawSelectBorder();
                            });
                        });
                    }).catch(err => {
                        this.pageLoading = false;
                    })
                }
            },
            /**
             * 绘制ecgCanvas图形
             * @param context
             * @param data
             * @param position
             * @param type
             * @param x_pos
             * @param x_end_pos
             * @param y_start_pos
             * @param frequency
             * @param add
             * @param y_height
             */
            drawEcgPart(context, data, position, type, x_pos = 0, x_end_pos = 140, y_start_pos = 0, frequency = 512 * 2, add = 10, y_height = 88) {
                context.lineWidth = 1;
                context.beginPath();
                let length = data.length;
                context.moveTo(x_pos, y_height / 2 + y_start_pos[0]);
                let color = this.fillColorMap[type] || '#030304';
                if (type === 'N') {
                    color = '#312bff'
                }
                for (let i = 0; i < length; i++) {
                    let xPosition = x_pos + i % frequency / frequency * (x_end_pos - x_pos);
                    let yPosition = 2 - data[i] * add * 5 + y_height / 2;
                    if (xPosition >= this.highLightBlockSlice.start && xPosition <= this.highLightBlockSlice.end) {
                        if (context.strokeStyle !== color) {
                            context.stroke();
                            context.beginPath();
                            context.strokeStyle = color;
                        }
                    } else {
                        if (context.strokeStyle !== '#030304') {
                            context.stroke();
                            context.beginPath();
                            context.strokeStyle = '#030304';
                        }
                    }
                    context.lineTo(xPosition, yPosition);
                }
                context.stroke();
                return;
            },
            /**
             * 将选中的图形框置红，其中selectArr为所有页的心电数据的选中集合
             */
            drawSelectBorder() {
                $('.singlePaper').removeClass('selectBorder');
                this.selectArr.map(item => {
                    let itemPos = $('.singlePaper').eq(item - this.pageObj.start).attr('data-pos');
                    let index = item - this.pageObj.start;
                    if (index >= 0 && index < this.pageObj.limit) {
                        if (this.showArr[item - this.pageObj.start]) {
                            if (Number(itemPos) === this.showArr[item - this.pageObj.start].position) {
                                $('.singlePaper').eq(item - this.pageObj.start).addClass('selectBorder');
                            }
                        }
                    }
                });
            },
            /**
             * 全选
             */
            selectAll() {
                this.selectArr = [...''.padEnd(this.selectArray.length)].map((i, d) => d);
                this.showPosition = this.selectArray[this.selectArray.length - 1].p;
                $('.singlePaper').addClass('selectBorder');
            },
            /**
             * 反选
             */
            reverseSelect() {
                let tempSelect = [];
                let temp = {};
                this.selectArr.map((i, d) => {
                    temp[this.selectArr[d]] = true;
                });
                for (let i = 0; i < this.selectArray.length; i++) {
                    if (!temp[i]) {
                        tempSelect.push(i);
                    }
                }
                this.selectArr = tempSelect;
                if (tempSelect.length) {
                    this.showPosition = this.selectArray[this.selectArr[this.selectArr.length - 1]].p;
                } else {
                    this.showPosition = -5120;
                }
                this.drawSelectBorder();
            },
            /**
             * 修改页面布局，既一页显示多少个心电片段
             * @param val
             */
            changeCheckState(val) {
                let start = this.pageObj.start;
                if (!val) {
                    this.pageObj = {
                        ...this.pageObj,
                        start: parseInt(start / 32) * 32,
                        limit: 32
                    };
                    this.getSelectPointEcg();
                } else {
                    this.pageObj = {
                        ...this.pageObj,
                        start: parseInt(start / 24) * 24,
                        limit: 24
                    };
                    this.getSelectPointEcg();
                }
            },
        }
    }
</script>
<style>
    .el-slider__button-wrapper {
        display: none;
    }

    .el-slider__runway {
        margin: 2px 0;
    }

    .buttonClass .el-button + .el-button {
        margin-left: 0;
    }

    .buttonBox .el-checkbox__label {
        opacity: 1;
    }
</style>
<style scoped>
    .normalButton {
        position: relative;
        width: 56px;
        height: 38px;
        box-shadow: 1px 1px 1px 1px rgba(0, 0, 0, .2);
        font-size: 24px;
        font-weight: 600;
    }

    .flexBox {
        display: flex;
        justify-content: space-between;
    }

    .flexBoxHide {
        display: flex;
        justify-content: space-between;
        height: 0;
        overflow: hidden;
    }

    .buttonClass {
        box-sizing: border-box;
    }

    .dashBorder {
        border: 1px dashed red;
    }

    .girdBox {
        display: grid;
        grid-template-columns: 600px 700px;
        box-sizing: border-box;
    }

    .normalHeight {
        /*height: 700px;*/
    }

    .flexPaper {
        position: relative;
        min-width: 576px;
        width: calc(100% - 106px);
        min-height: 576px;
        overflow: hidden;
        justify-content: space-around;
        border-radius: 4px;
        box-shadow: 0 1px 1px 1px rgba(0, 0, 0, .4);
        background-color: #fffdfd
    }

    .singlePaper {
        position: relative;
        z-index: 1;
        float: left;
        width: 140px;
        height: 88px;
        border: 1px solid #7b7b7b;
        margin: 3px;
    }

    .buttonBox {
        position: absolute;
        right: 0;
        top: 0;
    }

    .selectBorder {
        border: 1px solid #ff0a18;
        box-shadow: 0 0 1px 0 rgba(255, 10, 24, 0.4);
    }

    .selectBlock {
        position: absolute;
        display: none;
        width: 0;
        height: 0;
        left: 0;
        top: 0;
        border: 1px solid #ccc;
        z-index: 99;
        background-color: rgba(45, 245, 255, 0.2);
    }

    .footCount {
        position: absolute;
        width: 100%;
        text-align: center;
        bottom: -2px;
        left: 0;
        color: #000;
        font-size: 14px;
    }

    .titleBox {
        box-sizing: border-box;
        /*border: 1px solid black;*/
        border-radius: 3px;
        background-color: #e8e8e8;
        padding: 5px 20px;
        margin: 10px 0;
        box-shadow: 0 1px 1px 1px rgba(0, 0, 0, .4);
        font-size: 18px;
    }

    #showCnavasBox {
        cursor: crosshair;
    }

    #RRIntervalCanvas1 {
        transform: translate(0, 0);
    }

    #tempCanvas {
        transform: translate(0, 0);
    }

</style>