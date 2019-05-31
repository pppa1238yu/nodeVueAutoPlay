<template>
    <div style="width: 1300px;margin: 0 auto;">
        <!--顶部时序图-->
        <div style="overflow: hidden">
            <div style="float: left">
                <APViewHeader :setCurrentDate="setCurrentDate" :setLoading="setLoading"></APViewHeader>
            </div>
            <div style="float: left;">
                <el-select v-model="selectType" placeholder="请选择" @change="changeSelectType"
                           style="width: 130px;vertical-align: top;margin-right: 5px;">
                    <el-option
                            v-for="item in selectTypeOption"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value">
                    </el-option>
                </el-select>
                <div class="buttonClass" style="display: inline-block;vertical-align: top">
                    <BeatStatisticsBtns
                            :data="beatsData"
                            :defaultActiveIndex="defaultActiveIndex"
                            @change="beatTypeSelect"
                            v-if="hackResetBeatStatisticsBtns"
                    ></BeatStatisticsBtns>
                </div>
            </div>
        </div>
        <div v-loading="mainPageLoading" style="margin-top: 5px">
            <div class="flexBox"
                 style="box-shadow: 0 0 1px 1px rgba(0,0,0, .4); border-radius: 4px; box-sizing: border-box; padding: 10px 0 0 0;">
                <div id="myChart" style="width: 1300px; height: 300px;" v-show="hackReset">

                </div>
            </div>
            <div class="papaers normalHeight">
                <!--<div class="titleBox">选择片段</div>-->
                <div v-loading="pageLoading" style="position: relative;min-height: 300px;">
                    <div style="position: absolute; top: -17px;: 14px;pointer-events: none;border-radius: 3px; overflow: hidden; z-index:2002">
                        <canvas id="myCavansLineBlock" width="1194px" height="6px"></canvas>
                    </div>
                    <el-slider v-model="slideValue" style="width: 1194px;position: absolute;top: -11px;"
                               v-if="hackResetSlide"
                               :max="pageObj.total" @change="changeShowArr"></el-slider>
                    <div class="flexPaper" id="flexPaperBlock">
                        <div class="selectBlock"></div>
                        <div class="singlePaper" :data-pos="item.position" draggable="false" v-for="item in showArr"
                             :key="item.position">
                            <canvas :id="item.position + 'histogram'" width="140px" height="88px"></canvas>
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
                        <div style="margin: 5px 0; text-align: center;font-size: 14px;">已选(<span
                                style="color: #de6f21;font-size: 14px">{{selectArr.length}}</span>)
                        </div>
                    </div>
                </div>
            </div>
            <div :class="showEcgChecked ? 'flexBox': 'flexBoxHide'" v-show="showEcgChecked">
                <!--<div class="titleBox">片段心电图</div>-->
                <div style="position:relative;width: 100%" id="canvasWidth" v-loading="ecgLoading"
                     @click="jumpToEcgPos">
                    <div style="position: absolute;bottom: 20px; left: 0;width: 100%;text-align: center">{{showTime}}
                    </div>
                    <canvas id="scatterCanvas1" :width="canvasWidth" height="230px"></canvas>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
    import API from '../api/api_block_view';
    import {mapState, mapMutations, mapActions} from 'vuex';
    import {EcgViewer} from '../common/ecg_viewer';
    import {bus} from '../bus';
    import axios from 'axios';
    import echarts from 'echarts';
    import APViewHeader from '../components/afView/AFViewGuoHeader.vue';
    import Util from '../common/util';
    import BeatStatisticsBtns from '../components/common/BeatStatisticsBtns.vue';

    export default {
        name: 'histogramView',
        components: {
            APViewHeader,
            BeatStatisticsBtns
        },
        data() {
            return {
                showEcgChecked: true,
                selectTypeValue: '',
                options: [
                    {value: 'N', label: 'N'},
                    {value: 'S', label: 'S'},
                    {value: 'V', label: 'V'},
                    {value: 'Q', label: 'Q'}
                ],
                defaultActiveIndex: -1,
                hackResetSlide: true,
                slideValue: 0,
                myChart: null,
                selectType: 'ALL',
                selectTypeNormal: '',
                //paperBlock
                select: false,
                selectArr: [],
                selectArrLen: 0,
                selectArray: [],
                ecgLoading: false,
                onCtrlButton: false,
                onShiftButton: false,
                showArr: [],
                pageLoading: false,
                mainPageLoading: false,
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
                canvasWidth: '',
                highLightBlock: {
                    start: 628,
                    end: 663
                },
                showPosition: -5120,
                fillColorMap: {
                    N: Util.nTag, //#1dd307
                    V: Util.vTag,
                    S: Util.sTag,
                    Q: Util.qTag
                },
                highLightBlockSlice: {
                    start: 60,
                    end: 80
                },
                //echartsBox
                degree: 25,
                beatsData: {
                    N: 0,
                    V: 0,
                    S: 0,
                    Q: 0
                },
                hackResetBeatStatisticsBtns: true,
                allCount: 0,
                selectEchartIndex: -1,
                hackReset: true,
                showTime: '',
                currentDate: '',
                selectTypeOption: [],
                selectSpliceType: ''
            }
        },
        computed: {
            ...mapState('ecgView', {
                perDateData: state => state.perDateData,
                selectComponent: state => state.selectComponent,
                ecgStartTime: state => state.ecgStartTime,
                tagChangeState: state => state.tagChangeState,
                changeReset: state => state.changeReset,
                ecgFastData: state => state.ecgFastData,
                validDates: state => state.validDates,
                datesIsContainData: state => state.datesIsContainData,
                lastBlockIndex: state => state.lastBlockIndex
            })
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
                this.initCanvasLineBlock();
            },
            changeReset: function () {
                this.mainPageLoading = false;
                this.showPosition = -5120;
                if (this.selectTypeNormal !== '') {
                    this.changeShowBlock(this.perDateData[this.currentDate]['tag'][`${this.selectTypeNormal.toLowerCase()}TagData`]);
                } else {
                    this.changeShowBlock(this.perDateData[this.currentDate]['tag'][`${this.selectType.toLowerCase()}TagData`]);
                }
            },
            selectComponent: function () {
                if (this.selectComponent === 'lineBlock') {
                    if (this.perDateData[this.currentDate].changed) {
                        this.mainPageLoading = true;
                        setTimeout(() => {
                            this.changeVSTagData(this.currentDate)
                        }, 500);
                    } else {
                        let tempData = [];
                        if (this.selectTypeNormal !== '') {
                            tempData = this.perDateData[this.currentDate]['tag'][`${this.selectTypeNormal.toLowerCase()}TagData`];
                        } else {
                            tempData = this.perDateData[this.currentDate]['tag'][`${this.selectType.toLowerCase()}TagData`];
                        }
                        if (tempData) {
                            if (this.tagChangeState[1]) {
                                let tempArr = Object.assign(this.tagChangeState);
                                tempArr[1] = false;
                                this.changeTagState(tempArr);
                                this.showArr = [];
                                let c_canvas = $('#scatterCanvas1')[0];
                                if (c_canvas) {
                                    let context = c_canvas.getContext("2d");
                                    context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                                }
                                this.myChart.clear();
                                this.selectEchartIndex = 10000;
                                this.drawEchart();
                                this.selectArr = [];
                            }
                        }
                    }
                }
            },
            selectArray: function () {
//                this.selectArr = [];
//                this.showPosition = -5120;
                this.init();
            }
        },
        created() {
            this.currentDate = this.validDates[0];
        },
        beforeDestroy() {
            this.myChart.clear();
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
            let firstValidIndex = Util.firstExistDataIndex(this.datesIsContainData);
            this.currentDate = this.validDates[firstValidIndex];
            this.report_id = localStorage.getItem('report_id');
            this.canvasWidth = $('#canvasWidth').width();
            if (this.perDateData[this.currentDate].changed) {
                this.mainPageLoading = true;
                setTimeout(() => {
                    this.changeVSTagData(this.currentDate)
                }, 200);
            } else {
                this.changeVSCount();
            }
            //paperBlock
            let that = this;
            let timeoutTime = null;
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
            document.getElementById('flexPaperBlock').addEventListener('mousewheel', scrollFun);
            document.getElementById('flexPaperBlock').addEventListener('DOMMouseScroll', scrollFun);
            // this.bindDocumentEvents();

            bus.$off('bindDocumentBlock');
            bus.$on('bindDocumentBlock', () => {
                // $(document).on('keydown', documentKeyDownBlock);
                $(document).on('keydown', documentKeyDownBlock);
            });
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
//
            //scatterBlock

            this.initEcgViewer();
            this.ecgViewer.moveTo(this.showPosition - 2560);
//            //echartsBox
            this.drawEchart();
        },
        methods: {
            //paperBlock
            ...mapMutations('paperBlock', [
                'changeshowPosition',
                'changeType',
                'changeSelected',
            ]),
            ...mapMutations('ecgView', [
                'changeTagState',
                'changeFastData',
                'changeSelectComponent',
                'changePerDayData'
            ]),
            ...mapActions('ecgView', [
                'changeVSTagData',
            ]),
            beatTypeSelect(item) {
                this.pageObj.start = 0;
                this.pageObj.total = 0;
                this.selectArr = [];
                this.slideValue = 0;
                this.hackResetSlide = false;
                this.$nextTick(() => {
                    this.hackResetSlide = true;
                });
                this.selectTypeNormal = item;
                this.selectType = '';
                this.selectEchartIndex = -1;
                this.drawEchart();
                this.selectArray = [];
                this.showArr = [];
                this.showPosition = -5120;
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
                let documentKeyDownBlock = function (e) {
                    if (that.selectComponent === 'lineBlock') {
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
                $(document).on('keydown', documentKeyDownBlock);
                $(document).on('keyup', documentKeyUp);
            },
            changeCheckState(val) {
                let start = this.pageObj.start;
                if (!val) {
                    this.pageObj = {
                        ...this.pageObj,
                        start: parseInt(start / 40) * 40,
                        limit: 40
                    };
                } else {
                    this.pageObj = {
                        ...this.pageObj,
                        start: parseInt(start / 24) * 24,
                        limit: 24
                    };
                }
                this.getSelectPointEcg();
            },
            initCanvasLineBlock() {
                let c_canvas = document.getElementById('myCavansLineBlock');
                if (c_canvas === null) {
                    return;
                }
                let context = c_canvas.getContext("2d");
                let width = 1194;
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
            changeSelectType(val) {
                $('.normalButton').removeClass('dashBorder');
                this.selectType = val;
                this.selectTypeNormal = '';
                this.slideValue = 0;
                this.hackResetSlide = false;
                this.$nextTick(() => {
                    this.hackResetSlide = true;
                });
                this.selectEchartIndex = -1;
                this.drawEchart();
                this.selectArray = []
                this.showArr = [];
                this.showPosition = -5120;
            },
            changeShowArr(val) {
                let release = val % 24;
                this.pageObj = {
                    ...this.pageObj,
                    start: val - release
                };
                this.getSelectPointEcg();
            },
            setLoading() {
                this.mainPageLoading = true;
            },
//            全选
            selectAll() {
                this.selectArr = [...''.padEnd(this.selectArray.length)].map((i, d) => d)
                this.showPosition = this.selectArray[this.selectArray.length - 1].p;
                $('.singlePaper').addClass('selectBorder');
            },
            // 反选
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
//            设置当前时间
            setCurrentDate(index) {
                if (this.currentDate !== this.validDates[Number(index)]) {
                    $('.normalButton').removeClass('dashBorder');
                    this.currentDate = this.validDates[Number(index)];
                    this.selectArr = [];
                    this.slideValue = 0;
                    this.selectEchartIndex = -1;
                    this.resetBeatStatisticsBtns();
                    this.selectTypeNormal = '';
                    this.selectType = 'ALL';
                    if (this.perDateData[this.currentDate]) {
                        this.changeVSCount();
                        this.showPosition = -5120;
                        let tempData = [];
                        if (this.selectTypeNormal !== '') {
                            tempData = this.perDateData[this.currentDate]['tag'][`${this.selectTypeNormal.toLowerCase()}TagData`];
                        } else {
                            tempData = this.perDateData[this.currentDate]['tag'][`${this.selectType.toLowerCase()}TagData`];
                        }
                        if (tempData) {
                            this.changeShowBlock(tempData);
                        }
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
            //计算每行心电起始时间
            calcEcgTime(index) {
                let startDate = new Date(this.ecgStartTime);
                startDate.setSeconds(startDate.getSeconds() + Math.floor(index / 512));
                let hour = startDate.getHours() < 10 ? '0' + startDate.getHours() : startDate.getHours();
                let minute = startDate.getMinutes() < 10 ? '0' + startDate.getMinutes() : startDate.getMinutes();
                let second = startDate.getSeconds() < 10 ? '0' + startDate.getSeconds() : startDate.getSeconds();
                return hour + ':' + minute + ':' + second;
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
            changeShowBlock(getData) {
                let tempSelectArray = [];
                if (this.selectTypeNormal !== '') {
                    tempSelectArray = this.perDateData[this.currentDate]['tag'][`${this.selectTypeNormal.toLowerCase()}TagData`][this.selectEchartIndex];
                } else {
                    tempSelectArray = this.perDateData[this.currentDate]['tag'][`${this.selectType.toLowerCase()}TagData`][this.selectEchartIndex];
                }
                if (tempSelectArray !== undefined) {
                    this.selectArray = tempSelectArray;
                } else {
                    this.showArr = [];
                    this.selectArray = [];
                }
                this.changeVSCount();
                let xData = [];
                let data = [];
                let max = 0;
                for (let i in getData) {
                    if (Number(i) > Number(max)) {
                        max = i;
                    }
                }
                for (let t = 0; t <= max; t++) {
                    xData.push(t * this.degree);
                    if (getData[t]) {
                        data.push(getData[t].length);
                    } else {
                        data.push(0)
                    }
                }
                this.myChart.setOption({
                    xAxis: {
                        data: xData,
                    },
                    series: [{
                        data: data
                    }]
                });
            },
            changeSelect(val) {
                let temp = [];
                this.selectArr.map(item => {
                    temp.push(this.selectArray[item]);
                });
                if (this.selectArr.length === 0) return;
                if (this.selectType === val || this.selectTypeNormal === val) return;
                this.selectArrLen = this.selectArr.length;
                this.pageLoading = true;
                // let accessUserType = JSON.parse(localStorage.getItem('access-user')).userType;
                // if (accessUserType === 2 || accessUserType === 4) {
                //     this.$message.error('不能修改该状态下的报告');
                // } else {
                this.editBeatType(val, temp);
                // }
                this.selectTypeValue = '';
            },
            editBeatType(type, positions) {
                this.pageLoading = true;
                let reportId = localStorage.getItem('report_id'); //报告id
                let sendArr = [];  //并发ajax请求储存数组
                // let tempSendArr = [];
                // const BLOCK_SIZE  = 512 *  60;
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
                //     sendArr.push(API.changeBeatType({beatType: type, positions: tempSendArr}, reportId));
                // }
                let sendPos = positions.map(item => item.p);
                sendArr.push(API.changeBeatType({beatType: type, positions: sendPos}, reportId));
                axios.all(sendArr)
                    .then(axios.spread(() => {
                        if (this.selectType === '') {
                            let releaseNums = 0;
                            this.slideValue = 0;
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
                        this.pageLoading = false;
                        this.showPosition = -5120;
                        this.selectArr = [];
                        this.binarySearch(positions, type);
                        this.changePageState()
                    })).catch(err => {
                        this.pageLoading = false;
                });
            },
            // 当前页面改变，改变其他页面对应的状态值
            changePageState() {
                let arr = []
                this.tagChangeState.map((val, index) => {
                    if (index === 1) {
                        arr.push(false)
                    } else {
                        arr.push(true)
                    }
                })
                this.changeTagState(arr);
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
            flatArray(arr) {
                if (arr === undefined) return [];
                return arr.reduce((pre, cur) => {
                    return pre.concat(cur);
                }, []);
            },
            init() {
                // this.pageObj.start = 0;
                // this.pageObj.total = 0;
                this.getSelectPointEcg();
            },
            pageUp() {
                if (this.pageObj.start <= 0) {
                    this.pageObj.start = 0;
                } else {
                    this.pageObj.start -= this.pageObj.limit;
                    if (this.pageObj.start < 0) this.pageObj.start = 0;
                }
                this.getSelectPointEcg(false);
            },
            pageDown() {
                if (this.pageObj.start + this.pageObj.limit < this.pageObj.total) {
                    this.pageObj.start += this.pageObj.limit;
                }
                this.getSelectPointEcg(false);
            },
            getSelectPointEcg(changeBeat = true, redraw = false) {
                if (this.selectArray.length) {
                    let sendPosition = [];
                    this.selectArray.map(item => {
                        sendPosition.push(item.p);
                    });
                    if (redraw) {
                        if (changeBeat) {
                            if (this.pageObj.start !== 0) {
                                if (this.pageObj.start >= this.pageObj.total - this.selectArrLen) {
                                    this.pageObj.start -= this.pageObj.limit;
                                }
                            }
                        }
                    }
                    if (sendPosition.length) {
                        // this.pageLoading = true;
                        API.getBlockData({
                            limit: this.pageObj.limit,
                            positions: sendPosition.slice(this.pageObj.start, this.pageObj.start + this.pageObj.limit),
                            report_id: localStorage.getItem('report_id'),
                            start: 0
                        }).then(data => {
                            if (data.length === 0) {
                                this.getSelectPointEcg(true, true);
                                return;
                            }
                            this.pageLoading = false;
                            this.pageObj.total = this.selectArray.length;
                            this.showArr = data;
                            this.slideValue = this.pageObj.start + data.length;
                            this.$nextTick(() => {
                                this.showArr.map(item => {
                                    let showData = item.voltages;
                                    let id = '#' + item.position + 'histogram';
                                    let c_canvas = $(id)[0];
                                    if (c_canvas) {
                                        let context = c_canvas.getContext("2d");
                                        context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                                        let type = '';
                                        if (item.beat) type = item.beat.type;
                                        this.drawEcgCanvas(context, showData, item.position, type);
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
                }
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
                    if (lastIndex >= 24 + this.pageObj.start) {
                        lastIndex = index;
                    }
                    if (this.showArr[index - this.pageObj.start]) {
                        this.showPosition = this.showArr[index - this.pageObj.start].position;
                    }
                }
            },
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
            drawSelectBorder() {
                $('.singlePaper').removeClass('selectBorder');
                this.selectArr.map(item => {
                    let itemPos = $('.singlePaper').eq(item - this.pageObj.start).attr('data-pos');
                    let index = item - this.pageObj.start;
                    if (index >= 0 && index < 24) {
                        if (this.showArr[item - this.pageObj.start]) {
                            if (Number(itemPos) === this.showArr[item - this.pageObj.start].position) {
                                $('.singlePaper').eq(item - this.pageObj.start).addClass('selectBorder');
                            }
                        }
                    }
                });
            },
            drawEcgCanvas(context, data, position, type, x_pos = 0, x_end_pos = 140, y_start_pos = 0, frequency = 512 * 2, add = 10, y_height = 88) {
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
            //scatterBlock
            initCanvas() {
                let c_canvas = $('#scatterCanvas1')[0];
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
                let context = c_canvas.getContext("2d");
                context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                this.drawGrid(c_canvas, options);
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
                    if (xPosition - 22 === this.highLightBlock.start && xPosition + 13 === this.highLightBlock.end) {
                        context.strokeStyle = '#224df8';
                        context.strokeRect(this.highLightBlock.start, 30, 40, 199);
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
            drawEchart() {
                let dom = document.getElementById('myChart');
                if (dom) {
                    this.myChart = echarts.init(dom);
                    let xData = [];
                    let data = [];
                    let max = 0;
                    let tempData = [];
                    if (this.selectTypeNormal !== '') {
                        tempData = this.perDateData[this.currentDate]['tag'][`${this.selectTypeNormal.toLowerCase()}TagData`];
                    } else {
                        tempData = this.perDateData[this.currentDate]['tag'][`${this.selectType.toLowerCase()}TagData`];
                    }
                    if (tempData) {
                        for (let i in tempData) {
                            if (Number(i) > max) {
                                max = i;
                            }
                        }
                        if (max >= 120) max = 120;
                        for (let t = 0; t <= max; t++) {
                            xData.push(t * this.degree);
                            if (tempData[t]) {
                                data.push(tempData[t].length);
                            } else {
                                data.push(0);
                            }
                        }
                        let option = {
                            tooltip: {
                                trigger: 'axis',
                                axisPointer: {
                                    type: 'cross',
                                    label: {
                                        backgroundColor: '#283b56'
                                    }
                                }
                            },
                            grid: {
                                x: 40,
                                y: 10,
                                x2: 10,
                                y2: 40
                            },
                            xAxis: {
                                data: xData,
                                axisLabel: {
                                    inside: false,
                                    textStyle: {
                                        color: '#000'
                                    },
                                    fontSize: 12
                                },
                                axisTick: {
                                    show: false
                                },
                                axisLine: {
                                    show: false
                                },
                                z: 10
                            },
                            yAxis: {
                                axisLine: {
                                    show: false
                                },
                                axisTick: {
                                    show: false
                                },
                                axisLabel: {
                                    textStyle: {
                                        color: '#999'
                                    },
                                    formatter: function (value) {
                                        if (value.toString().indexOf('.') === -1) {
                                            return value;
                                        }
                                    }
                                }
                            },
                            dataZoom: [
                                {
                                    type: 'inside'
                                }
                            ],
                            series: [
                                {
                                    type: 'bar',
                                    animation: false,
                                    itemStyle: {
                                        normal: {
                                            color: (parms) => {
                                                if (this.selectEchartIndex === parms.dataIndex) {
                                                    return new echarts.graphic.LinearGradient(
                                                        0, 0, 0, 1,
                                                        [
                                                            {offset: 0, color: '#83bff6'},
                                                            {offset: 0.5, color: '#188df0'},
                                                            {offset: 1, color: '#188df0'}
                                                        ]
                                                    )
                                                } else {
                                                    return new echarts.graphic.LinearGradient(
                                                        0, 0, 0, 1,
                                                        [
                                                            {offset: 0, color: '#f7dc0f'},
                                                            {offset: 0.5, color: '#f0e172'},
                                                            {offset: 1, color: '#f6f3e6'}
                                                        ]
                                                    )
                                                }
                                            }
                                        }
                                    },
                                    data: data
                                }
                            ]
                        };
                        this.myChart.setOption(option);
                        this.myChart.off('click');
                        this.myChart.on('click', (parms) => {
                            let selectTempData = [];
                            if (this.selectTypeNormal !== '') {
                                selectTempData = this.perDateData[this.currentDate]['tag'][`${this.selectTypeNormal.toLowerCase()}TagData`];
                            } else {
                                selectTempData = this.perDateData[this.currentDate]['tag'][`${this.selectType.toLowerCase()}TagData`];
                            }
                            this.pageObj = {
                                ...this.pageObj,
                                start: 0,
                                total: 0
                            };
                            let name = parms.name;
                            let index = Number(name) / 25;
                            this.showPosition = -5120;
                            this.selectEchartIndex = parms.dataIndex;
                            this.slideValue = 0;
                            this.selectArr = [];
                            this.selectArray = [];
                            this.hackResetSlide = false;
                            this.$nextTick(() => {
                                this.hackResetSlide = true;
                            });
                            this.selectArray = selectTempData[index];
                            this.myChart.clear();
                            this.drawEchart();
                        });
                    }
                }
            }
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
</style>
<style scoped>
    .flexBox {
        position: relative;
        display: flex;
        justify-content: space-between;
    }

    .buttonClass {
        box-sizing: border-box;
    }

    .dashBorder {
        border: 1px dashed red;
    }

    .normalButton {
        position: relative;
        width: 56px;
        height: 38px;
        box-shadow: 1px 1px 1px 1px rgba(0, 0, 0, .2);
        font-size: 24px;
        font-weight: 600;
    }

    .girdBox {
        display: grid;
        grid-template-columns: 600px 700px;
    }

    .normalHeight {
        /*height: 700px;*/
    }

    .flexPaper {
        position: relative;
        min-width: 600px;
        width: calc(100% - 106px);
        min-height: 300px;
        overflow: hidden;
        border-radius: 4px;
        box-shadow: 0 0 1px 1px rgba(0, 0, 0, .4);
        margin: 15px 0;
        justify-content: space-around;
        background-color: #fffdfd
    }

    .singlePaper {
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
        background-color: rgba(45, 245, 255, 0.2);
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

    .footCount {
        position: absolute;
        width: 100%;
        text-align: center;
        bottom: -2px;
        left: 0;
        color: #000;
        font-size: 14px;
    }
</style>