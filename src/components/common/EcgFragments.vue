<template>
    <div class="ecg-fragments-wrapper" ref="ecg-fragments-wrapper" :style="{width:width+'px'}">
        <div class="slideWrapper">
            <canvas ref="myCavansScatter" height="6px" :width="width+'px'"></canvas>
        </div>
        <el-slider v-model="slideValue" :max="pageObj.total"
                   @change="changeShowArr" v-if="hackResetSlide"></el-slider>
        <div ref="flexPaper" class="flexPaperBoxItem" v-loading="pageLoading">
            <div ref="selectBlock" class="selectBlockItem" draggable="false" @mousemove="noDefault"
                 @touchmove="noDefault"></div>
            <div ref="singlePaper" class="singlePaperItem" :data-pos="item.position" draggable="false"
                 v-for="item in showArr"
                 @dragenter="noDefault"
                 @dragover="noDefault">
                <canvas :ref="item.position+'scatter'" :data-position="item.position" :width="canvasWidth+'px'"
                        height="80px"></canvas>
            </div>
        </div>
        <div class="buttonBox">
            <div style="text-align: center" v-show="selectArray.length">
                {{Math.floor(pageObj.start / pageObj.limit) + 1}} / {{Math.ceil(pageObj.total / pageObj.limit)}}
            </div>
            <div style="text-align: center" v-show="selectArray.length === 0">
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
                       :disabled="pageObj.start === 0  || pageLoading">上一页
            </el-button>
            <br>
            <el-button type="primary" style="margin: 5px 0 5px 0;width: 100px" @click="pageDown"
                       :disabled="(pageObj.total <= pageObj.start + pageObj.limit) || pageLoading">下一页
            </el-button>
            <br>
            <el-button type="primary" style="margin: 5px 0 5px 0;width: 100px" @click="pageSelectAll"
                       :disabled="showArr.length === 0 || pageLoading">页全选
            </el-button>
            <br>
            <el-button type="primary" style="margin: 5px 0 5px 0;width: 100px" @click="pageReverseSelect"
                       :disabled="showArr.length === 0 || pageLoading">页反选
            </el-button>
            <br>
            <el-button type="primary" style="margin: 5px 0 5px 0;width: 100px" @click="selectAll"
                       :disabled="showArr.length === 0 || pageLoading">全选
            </el-button>
            <br>
            <el-button type="primary" style="width: 100px" @click="reverseSelect"
                       :disabled="showArr.length === 0 || pageLoading">反选
            </el-button>
            <br>
            <div style="border: 1px solid #ccc; padding: 8px 5px; border-radius: 2px; margin-top: 5px">
                <el-checkbox v-model="showEcgChecked" @change="changeCheckState">心电片段</el-checkbox>
            </div>
            <div style="margin: 5px 0; text-align: center;font-size: 14px">已选(<span
                    style="color: #de6f21;font-size: 14px">{{selectArr.length}}</span>)
            </div>
            <div style="margin: 5px 0; text-align: center;text-overflow: ellipsis;overflow: hidden;white-space: nowrap;">
                (<span style="color: #de6f21;font-size: 14px">{{selectArr.length +'/'+ selectArray.length}}</span>)
            </div>
        </div>
    </div>
</template>
<script type="text/ecmascript-6">
    import Util from '../../common/util';
    import API from '../../api/api_block_view';
    import axios from 'axios';
    import {mapState, mapMutations, mapActions} from 'vuex';

    export default {
        name: 'ecgFragments',
        props: {
            selectArray: { // 所有心电数据
                type: Array,
                default: function () {
                    return []
                }
            },
            width: {
                type: Number,
                default: 596
            },
            pageIndex: {
                type: Number,
                default: -1
            },
            size: {
                type: Object,
                default: function () {
                    return {x: 4, y: 6}
                }
            },
            currentDate: {
                type: String,
                default: ''
            },
            selectTypeNormal: { // 判断当前被选中的心拍类型，若等于快捷键改变的类型则不改变心电片段的类型
                type: String,
                default: ''
            }
        },
        data() {
            return {
                pageObj: {
                    limit: this.size.x * this.size.y,
                    start: 0,
                    total: 0
                },
                isEditBeat: false, // 控制当前selectArray变化是否是因为改变了心拍类型，若是，就不重置页数等
                eventFlag: false, // 控制按钮是否执行
                select: false,
                showArr: [],
                showEcgChecked: true,
                options: [
                    {value: 'N', label: 'N'},
                    {value: 'S', label: 'S'},
                    {value: 'V', label: 'V'},
                    {value: 'Q', label: 'Q'}
                ],
                selectBlock: { // 用于设置selectBlock的位置
                    startX: 0,
                    startY: 0
                },
                selectTypeValue: '', // 右边select选择的心拍类型
                selectArrLen: 0, // 当前选中的数据长度
                onCtrlButton: false,
                onShiftButton: false,
                onShiftStart: -1,
                hackResetSlide: true, // 是否显示进度条
                slideValue: 0, // 当前选中的分页
                selectArr: [], // 当前选中的singlePapper数据的index
                highLightBlockSlice: {
                    start: 60,
                    end: 80
                },
                currentDateTemp: '',
                showPosition: -5120,
                fillColorMap: {  // N,V,S,Q的颜色值
                    N: Util.nTag, //#1dd307
                    V: Util.vTag,
                    S: Util.sTag,
                    Q: Util.qTag
                },
                pageLoading: false // div的loading
            }
        },
        activated() {
            this.bindDocumentEvents();
        },
        mounted() {
            let that = this;
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
            that.$refs['flexPaper'].addEventListener('DOMMouseScroll', scrollFun);
            that.$refs['flexPaper'].addEventListener('mousewheel', scrollFun);

            $(that.$refs['flexPaper']).on('mousedown', function (e) {
                e.stopPropagation();
                e.preventDefault();
                if (!that.select) {
                    that.select = true;
                    that.selectBlock.startX = e.clientX - $(that.$refs['flexPaper']).offset().left;
                    that.selectBlock.startY = e.clientY - $(that.$refs['flexPaper']).offset().top;
                    $(that.$refs['selectBlock']).css({
                        display: 'block',
                        left: that.selectBlock.startX,
                        top: that.selectBlock.startY
                    });
                } else {
                    that.select = false;
                    that.isOverlap();
                }
            });
            $(that.$refs['flexPaper']).on('mouseup', function () {
                that.select = false;
                that.isOverlap();
            });
            $(that.$refs['flexPaper']).on('mouseleave', function () {
                that.select = false;
//                that.isOverlap();
            });
            $(that.$refs['flexPaper']).on('mousemove', function (e) {
                if (that.select) {
                    let width = e.clientX - $(that.$refs['flexPaper']).offset().left - that.selectBlock.startX;
                    let height = e.clientY - $(that.$refs['flexPaper']).offset().top - that.selectBlock.startY;
                    if (width >= 0) {
                        if (height >= 0) {
                            $(that.$refs['selectBlock']).css({
                                width: Math.abs(width),
                                height: Math.abs(height)
                            });
                        } else {
                            $(that.$refs['selectBlock']).css({
                                width: Math.abs(width),
                                height: Math.abs(height),
                                left: e.clientX - $(that.$refs['flexPaper']).offset().left - Math.abs(width),
                                top: e.clientY - $(that.$refs['flexPaper']).offset().top
                            });
                        }

                    } else {
                        if (height >= 0) {
                            $(that.$refs['selectBlock']).css({
                                width: Math.abs(width),
                                height: Math.abs(height),
                                left: e.clientX - $(that.$refs['flexPaper']).offset().left,
                                top: e.clientY - $(that.$refs['flexPaper']).offset().top - Math.abs(height)
                            });
                        } else {
                            $(that.$refs['selectBlock']).css({
                                width: Math.abs(width),
                                height: Math.abs(height),
                                left: e.clientX - $(that.$refs['flexPaper']).offset().left,
                                top: e.clientY - $(that.$refs['flexPaper']).offset().top
                            });
                        }
                    }
                } else {
                    $(that.$refs['selectBlock']).css({
                        display: 'none',
                        width: 0,
                        height: 0
                    });
                }
            });
            // 设置slide canvas宽高
            this.$nextTick(() => {
//            this.$refs['myCavansScatter'].style.width = this.width + 'px'
            })
        },
        watch: {
            currentDate(val) {
                this.currentDateTemp = this.formate(val)
            },
            selectArr: function () {
                if (!this.eventFlag && this.selectArr.length !== 0) {
                    this.$emit('handleUntyingEvent')
                    this.eventFlag = true
                }
                this.initCanvasScatter();
            },
            selectArray: function () {
                this.selectArr = [];
                this.showPosition = -5120;
                this.showArr = [];
                if (this.isEditBeat) {
                    this.isEditBeat = false
                } else {
                    this.handleResetPageObj()
                }
                this.init();
            },
            showPosition: function () {
                this.$emit('handleSelectFragment', {
                    showPosition: this.showPosition
                })
            }
        },
        computed: {
            ...mapState('ecgView', {
                wholeViewLoading: state => state.wholeViewLoading,
                perDateData: state => state.perDateData,
                tagChangeState: state => state.tagChangeState
            }),
            canvasWidth() {
                return parseInt(this.width / this.size.x - 8)
            }
        },
        methods: {
            ...mapActions('ecgView', [
                'changeVSTagData'
            ]),
            ...mapMutations('ecgView', [
                'changePerDayData',
                'changeViewLoadingState',
                'changeTagState'
            ]),
            init() {
                this.getSelectPointEcg();
            },
            handleLoadingShow() {
                if (!this.wholeViewLoading) {
                    this.pageLoading = true;
                }
            },
            formate(date) {
                let date1 = date.split(' ');
                date1[0].replace(/\//g, '-');
                return date1[0].replace(/\//g, '-');
            },
            // 关闭当前组件对1，2，3，4键的占用
            closeEvent() {
                this.eventFlag = false
            },
            changeShowArr(val) {
                let release = val % (this.size.x * this.size.y);
                this.pageObj = {
                    ...this.pageObj,
                    start: val - release
                };
                this.getSelectPointEcg();
            },
            initCanvasScatter() {
                let c_canvas = this.$refs['myCavansScatter'];
                if (c_canvas === null) {
                    return;
                }
                let context = c_canvas.getContext("2d");
                let width = c_canvas.width;
                let height = c_canvas.height;
                context.clearRect(0, 0, width, height);
                let per = 1 / this.pageObj.total * width;
                context.fillStyle = 'rgba(255,0,0,.5)';
                let endWidth = per;
                this.selectArr.map((item, index) => {
                    let x = item / this.pageObj.total * width;
                    context.fillRect(x, 0, endWidth, 6);
                });
            },
            // 页全选
            pageSelectAll() {
                let tempSelect = [];
                for (let i = 0; i < this.showArr.length; i++) {
                    if (this.selectArr.indexOf(this.pageObj.start + i) === -1) {
                        tempSelect.push(this.pageObj.start + i);
                    }
                }
                this.selectArr = this.selectArr.concat(tempSelect);
                this.showPosition = this.showArr[this.showArr.length - 1].position;
                $(this.$refs['singlePaper']).addClass('selectBorder');
            },
            // 页反选
            pageReverseSelect() {
                let tempSelect = [];
                for (let i = 0; i < this.showArr.length; i++) {
                    let index = this.selectArr.indexOf(this.pageObj.start + i)
                    if (index === -1) {
                        tempSelect.push(this.pageObj.start + i);
                    } else {
                        if (this.selectArr[index] >= this.pageObj.start) {
                            this.selectArr.splice(index, 1)
                        }
                    }
                }
                this.selectArr = this.selectArr.concat(tempSelect);
                this.showPosition = this.showArr[this.showArr.length - 1].position;
                this.drawSelectBorder();
            },
            /**
             * 全选
             */
            selectAll() {
                this.selectArr = [...''.padEnd(this.selectArray.length)].map((i, d) => d);
                this.showPosition = this.selectArray[this.selectArray.length - 1];
                $(this.$refs['singlePaper']).addClass('selectBorder');
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
                    this.showPosition = this.selectArray[this.selectArr[this.selectArr.length - 1]];
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
                        start: parseInt(start / (this.size.x * (this.size.y + 1))) * (this.size.x * (this.size.y + 1)),
                        limit: (this.size.x * (this.size.y + 1))
                    };
                    this.getSelectPointEcg();
                } else {
                    this.pageObj = {
                        ...this.pageObj,
                        start: parseInt(start / (this.size.x * this.size.y)) * (this.size.x * this.size.y),
                        limit: (this.size.x * this.size.y)
                    };
                    this.getSelectPointEcg();
                }
                this.$emit('handleChangeSize', val)
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
                let aim = $(this.$refs['selectBlock']);
                let offsetAim = aim.offset();
                let topAim = offsetAim.top;
                let leftAim = offsetAim.left;
                let widthAim = aim.width();
                let heightAim = aim.height();
                for (let i = 0, len = $(this.$refs['singlePaper']).length; i < len; i++) {
                    let obj = $(this.$refs['singlePaper']).eq(i);
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
                $(this.$refs['selectBlock']).css({
                    display: 'none',
                    width: 0,
                    height: 0
                });
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
            editBeatType(type, positions) {
                let reportId = localStorage.getItem('report_id'); //报告id
                let sendArr = [];  //并发ajax请求储存数组
                // let tempSendArr = [];
                // const BLOCK_SIZE = 512 * 60;
                // let nextBound = parseInt(positions[0] / BLOCK_SIZE) * BLOCK_SIZE + BLOCK_SIZE;
                // for (let position of positions) {
                //     if (position >= nextBound) {
                //         sendArr.push(API.changeBeatType({beatType: type, positions: tempSendArr}, reportId));
                //         tempSendArr = [];
                //         nextBound += BLOCK_SIZE * 100;
                //     }
                //     tempSendArr.push(position);
                // }
                // if (tempSendArr.length) {
                    sendArr.push(API.changeBeatType({beatType: type, positions: positions}, reportId));
                // }
                axios.all(sendArr)
                    .then(axios.spread(() => {
                        setTimeout(() => {
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
                            this.isEditBeat = true
                            this.showPosition = -5120;
                            this.binarySearch(positions, type);
                            this.changePageState()
                            this.$emit('handleChangePageState', positions)
                        }, 0);

                    })).catch(() => {
                    this.changeViewLoadingState(false)
                });
            },
            // 当前页面改变，改变其他页面对应的状态值
            changePageState() {
                let arr = []
                this.tagChangeState.map((val, index) => {
                    if (index === this.pageIndex) {
                        arr.push(false)
                    } else {
                        arr.push(true)
                    }
                })
                this.changeTagState(arr);
            },
            _binarySearch(index, data) {
                let l = 0, r = data.length - 1;
                while (l <= r) {
                    let mid = Math.floor((l + r) / 2);
                    let currentP = data[mid].p;
                    if (currentP < index) {
                        l = mid + 1;
                    } else if (currentP > index) {
                        r = mid - 1;
                    } else {
                        return mid;
                    }
                }
                return l;
            },
            binarySearch(positions, type) {
                let data = this.perDateData[this.currentDateTemp]['tag'][`${this.selectTypeNormal.toLowerCase()}TagData`];
                let arr = this.flatArray(Object.assign(data)).sort((a, b) => a.p - b.p);
                let tempData = Object.assign(this.perDateData[this.currentDateTemp]['data']);
                positions.map(item => {
                    let index = arr[this._binarySearch(item, arr)].i;
                    let tempDataItem = JSON.parse(tempData[index]);
                    if (tempDataItem.t !== type) {
                        tempDataItem.t = type;
                        tempData[index] = JSON.stringify(tempDataItem);
                    }
                });
                this.changePerDayData({
                    date: this.currentDateTemp,
                    tagData: tempData,
                    tag: {},
                    changed: true
                });
                this.changeVSTagData(this.currentDateTemp);
            },
            flatArray(arr) {
                if (arr === undefined) return [];
                return arr.reduce((pre, cur) => {
                    return pre.concat(cur);
                }, []);
            },
            changeSelect(val) {
                if (this.eventFlag) {
                    if (this.selectArr.length === 0) return;
                    if (this.selectTypeNormal === val) return;
                    let temp = [];
                    this.changeViewLoadingState(true)
                    this.selectArr.map(item => {
                        temp.push(this.selectArray[item]);
                    });
                    this.selectArrLen = this.selectArr.length;
                    this.editBeatType(val, temp);
                    this.selectTypeValue = '';
                }
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
                };
                let documentKeyUp = function () {
                    that.onCtrlButton = false;
                    that.onShiftButton = false
                };
                $(document).on('keydown', documentKeyDown);
                $(document).on('keyup', documentKeyUp);
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
            drawEcgPart(context, data, position, type, x_pos = 0, x_end_pos = this.canvasWidth, y_start_pos = 0, frequency = 512 * 2, add = 10, y_height = 80) {
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
                    let yPosition = - data[i] * add * 5 + y_height / 2;
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
             * 获取选中区域Ecg心电数据并绘制图形
             * @param changeBeat  是否变换的类型和初始类型不一样，不一样则要对页码进行操作
             * @param redraw  是否需要对页码进行操作
             */
            getSelectPointEcg(changeBeat = true, redraw = false) {
                if (this.selectArray.length) {
                    if (redraw) {
                        if (changeBeat) {
                            if (this.pageObj.start !== 0) {
                                if (this.pageObj.start >= this.pageObj.total - this.selectArrLen) {
                                    this.pageObj.start -= this.pageObj.limit;
                                }
                            }
                        }
                    }
                    if (!this.wholeViewLoading) {
                        this.pageLoading = true;
                    }
                    API.getBlockData({
                        limit: this.pageObj.limit,
                        positions: this.selectArray.slice(this.pageObj.start, this.pageObj.start + this.pageObj.limit) || [],
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
                                let id = item.position + 'scatter';
                                if (this.$refs[`${id}`] && this.$refs[`${id}`].length > 0) {
                                    let c_canvas = this.$refs[id][0]
                                    if (c_canvas) {
                                        let context = c_canvas.getContext("2d");
                                        context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                                        this.drawEcgPart(context, showData, item.position, item.beat.type);
                                    }
                                }
                            });
                            this.$nextTick(() => {
                                this.drawSelectBorder();
                            });
                        });
                        this.changeViewLoadingState(false)
                    }).catch(err => {
                        this.pageLoading = false;
                        this.hackResetSlide = false
                        this.$nextTick(() => {
                            this.hackResetSlide = true
                        })
                        this.changeViewLoadingState(false)
                    })
                } else {
                    this.pageObj.start = 0;
                    this.pageObj.total = 0;
                    this.slideValue = 0
                    this.hackResetSlide = false
                    this.$nextTick(() => {
                        this.hackResetSlide = true
                    })
                    this.pageLoading = false;
                    this.changeViewLoadingState(false)
                }
            },
            handleResetPageObj() {
                this.pageObj.start = 0;
                this.pageObj.total = 0;
                this.hackResetSlide = false
                this.slideValue = 0
                this.$nextTick(() => {
                    this.hackResetSlide = true
                })
            },
            /**
             * 将选中的图形框置红，其中selectArr为所有页的心电数据的选中集合
             */
            drawSelectBorder() {
                $(this.$refs['singlePaper']).removeClass('selectBorder');
                this.selectArr.map(item => {
                    let itemPos = $(this.$refs['singlePaper']).eq(item - this.pageObj.start).attr('data-pos');
                    let index = item - this.pageObj.start;
                    if (index >= 0 && index < this.pageObj.limit) {
                        if (this.showArr[item - this.pageObj.start]) {
                            if (Number(itemPos) === this.showArr[item - this.pageObj.start].position) {
                                $(this.$refs['singlePaper']).eq(item - this.pageObj.start).addClass('selectBorder');
                            }
                        }
                    }
                });
            },
            noDefault(e) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }
</script>
<style type="text/css" scoped lang="scss">
    .ecg-fragments-wrapper /deep/ .el-slider__button-wrapper {
        display: none;
    }

    .ecg-fragments-wrapper /deep/ .el-slider__runway {
        margin: 2px 0;
    }

    .ecg-fragments-wrapper {
        position: relative;
    }

    .slideWrapper {
        position: absolute;
        top: 0px;
        pointer-events: none;
        border-radius: 2px;
        height: 6px;
        z-index: 1002;
        margin: 2px 0;

        canvas {
            position: absolute;
            top: 0;
            left: 0;
        }

    }

    .buttonBox {
        position: absolute;
        right: -107px;
        width: 100px;
        top: 0;
    }

    .singlePaperItem {
        position: relative;
        z-index: 1;
        float: left;
        height: 80px;
        border: 1px solid #7b7b7b;
        margin: 3px;
    }

    .flexPaperBoxItem {
        position: relative;
        overflow: hidden;
        min-height: 440px;
        justify-content: space-around;
        border-radius: 4px;
        box-shadow: 0 1px 1px 1px rgba(0, 0, 0, .4);
        background-color: #fffdfd
    }

    .selectBlockItem {
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

    .selectBorder {
        border-color: #ff0a18;
        box-shadow: 0 0 1px 0 rgba(255, 10, 24, 0.4);
    }
</style>