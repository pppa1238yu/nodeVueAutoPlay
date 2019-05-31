<template>
    <div class="overlay-view">
        <div class="overlay-view-header">
            <div>
                <LateralDateSelector :dates="validDates"
                                     :datesIsContainData="datesIsContainData"
                                     :defaultActiveIndex="defaultActiveIndex"
                                     @change="getCurrentDateTags"
                >
                </LateralDateSelector>
            </div>
            <div style="margin-left: 10px">
                <BeatStatisticsBtns :data="beatsData" @change="beatTypeSelect"
                                    ref="beatStatisticsBtns"></BeatStatisticsBtns>
            </div>
        </div>
        <div class="overlay-view-content">
            <div class="overlay-view-content-left">
                <OverlayMain :slotBeatCounts="slotBeatCounts" @selectOverlayArea="selectOverlayArea"
                             @slotChange="slotChange"
                             ref="overlayMain"></OverlayMain>
            </div>
            <div style="flex-grow: 1">
                <RRIScatter :data="rriData" :xStartTime="currentDate" :symbolColor="symbolColor"
                            :resetRRIHandle="resetRRIHandle"
                            @selectTime="rriSelectTimeChange" @selectTimeRange="rriSelectTimeRangeChange"
                            ref="RRIScatter">

                </RRIScatter>
                <ecg-fragments
                        ref="ecgFragments"
                        :selectArray="currentSlotBeats"
                        :pageIndex="2"
                        :size="{x: 7, y: 5}"
                        :width="950"
                        :currentDate="currentDate"
                        :selectTypeNormal="currentBeatType"
                        @handleUntyingEvent="handleUntyingEvent"
                        @handleChangeSize="handleChangeSize"
                        @handleSelectFragment="handleSelectFragment"
                        @handleChangePageState="handleChangePageState"
                ></ecg-fragments>
            </div>
        </div>
        <div v-show="isShowBottom">
            <scatter-block :showPosition="showPosition" :isInit="false"
            ></scatter-block>
        </div>
    </div>
</template>
<script>
    import {mapState, mapMutations, mapActions} from 'vuex';
    import LateralDateSelector from '../components/common/LateralDateSelector.vue';
    import BeatStatisticsBtns from '../components/common/BeatStatisticsBtns.vue';
    import EcgFragments from '../components/common/EcgFragments.vue';
    import RRIScatter from '../components/common/RRIScatter.vue';
    import ScatterBlock from '../components/block/tenSecondsEcg.vue';
    import OverlayMain from '../components/overlayView/OverlayMain.vue';
    import Util from '../common/util';
    import {bus} from '../bus';
    import {FastData} from '../common/ecg_get_fast_data';
    import APIEcgView from '../api/api_ecg_view';
    import API from '../api/api_overlay';
    import axios from 'axios';

    export default {
        name: 'OverlayView',
        components: {
            LateralDateSelector,
            BeatStatisticsBtns,
            RRIScatter,
            EcgFragments,
            ScatterBlock,
            OverlayMain
        },
        data() {
            return {
                isShowBottom: true,
                showPosition: -5120,
                currentDateIndex: 0,
                beatsData: {
                    N: 0,
                    V: 0,
                    S: 0,
                    Q: 0
                },
                rriData: [],
                currentDate: '',
                symbolColorMap: {
                    N: Util.nTag,
                    V: Util.vTag,
                    S: Util.sTag,
                    Q: Util.qTag
                },
                symbolColor: Util.nTag,
                rriSelectTimeRange: {
                    start: '',
                    end: ''
                },
                resetRRIHandle: true,
                overlayDragArea: null,//{left,right,top,bottom}
                moveOverlayKeyCodeMap: {
                    '48': 0,
                    '96': 0,
                    '49': 1,
                    '97': 1,
                    '50': 2,
                    '98': 2,
                    '51': 3,
                    '99': 3,
                    '52': 4,
                    '100': 4,
                },
                currentActiveSlot: 0,
                slotBeatCounts: new Array(5).fill(0),
                currentSlotBeats: [],
                currentBeatType: 'N',
                slotBeats: new Array(5).fill([]),
                initOverlayTimeRange: {
                    start: '',
                    end: ''
                },
            }
        },
        computed: {
            ...mapState('ecgView', {
                wholeViewLoading: state => state.wholeViewLoading,
                validDates: state => state.validDates,
                datesIsContainData: state => state.datesIsContainData,
                perDateData: state => state.perDateData,
                ecgStartTime: state => state.ecgStartTime,
                ecgEndTime: state => state.ecgEndTime,
                tagChangeState: state => state.tagChangeState
            }),
            defaultActiveIndex() {
                return Util.firstExistDataIndex(this.datesIsContainData);
            },
            report_id() {
                return localStorage.getItem('report_id');
            }
        },
        watch: {},
        methods: {
            ...mapMutations('ecgView', [
                'changePerDayData',
                'changeViewLoadingState',
                'changeTagState'
            ]),
            ...mapActions('ecgView', [
                'changeVSTagData'
            ]),
            // 解除迭加图对1,2,3,4键的绑定
            handleUntyingEvent() {
                this.overlayDragArea = null
                this.$refs.overlayMain.resetDragArea();
            },
            // 通知当前页面修改了
            handleChangePageState(positions) {
                //更新心拍统计按钮
                let currentDateTags = this.perDateData[this.validDates[this.currentDateIndex]].data;
                this.beatsData.N = this.filterBeatByType(currentDateTags, 'N').length;
                this.beatsData.V = this.filterBeatByType(currentDateTags, 'V').length;
                this.beatsData.S = this.filterBeatByType(currentDateTags, 'S').length;
                this.beatsData.Q = this.filterBeatByType(currentDateTags, 'Q').length;
                //更新散点图，如果有拖拽区域和点击指示线，则保留
                this.$refs.RRIScatter.changeRRILoading(true);
                this.$refs.ecgFragments.handleLoadingShow();
                this.resetRRIHandle = false;
                this.rriData = this.createRRIData(currentDateTags, this.currentBeatType);
                //更新当前选中的叠加图
                if (positions) {
                    if (!this.wholeViewLoading) {
                        this.$refs.overlayMain.changeOverlayImgLoading(this.currentActiveSlot, true);
                    }
                    axios.put(`/overlay/remove/${this.report_id}/SLOT_${this.currentActiveSlot}`, positions).then(() => {
                        this.$refs.overlayMain.changeOverlayImgUrls(this.currentActiveSlot,
                            `/overlay/image/${this.report_id}/SLOT_${this.currentActiveSlot}?${new Date().getTime()}`);
                        return API.getSlotBeats(this.report_id, `SLOT_${this.currentActiveSlot}`);
                    }).then(beats => {
                        this.currentSlotBeats = beats.sort((a, b) => a - b);
                        this.slotBeats.splice(this.currentActiveSlot, 1, beats);
                        this.slotBeatCounts.splice(this.currentActiveSlot, 1, beats.length);
                    });
                } else {
                    this.initOverlay(this.currentBeatType);
                }
            },
            // 改变选择的心电片段
            handleSelectFragment(val) {
                this.showPosition = val.showPosition
            },
            handleChangeSize(val) {
                this.isShowBottom = val
            },
            getCurrentDateTags(index = 0) {
                this.changeViewLoadingState(true)
                this.$refs.ecgFragments.closeEvent();
                this.overlayDragArea = null;
                this.$refs.overlayMain.resetDragArea();
                this.$refs.RRIScatter.changeRRILoading(true);
                this.reset();
                this.currentDateIndex = index;
                this.currentDate = this.formatDate(this.validDates[index]);
                if (this.perDateData[this.validDates[index]] === undefined) {
                    let fastData = new FastData(
                        this.report_id,
                        this.validDates[index],
                        () => {
                            let currentDateTags = fastData.getFastData();
                            this.changePerDayData({
                                date: this.validDates[index],
                                tagData: currentDateTags,
                                tag: {},
                                changed: true
                            });
                            this.changeVSTagData(this.validDates[index]);
                            this.dateItemChangeDo(currentDateTags);
                        }
                    );
                    fastData.getAjaxFastData();
                } else {
                    this.dateItemChangeDo(this.perDateData[this.validDates[index]].data);
                }
                this.initOverlay();
            },
            dateItemChangeDo(currentDateTags) {
                this.beatsData.N = this.filterBeatByType(currentDateTags, 'N').length;
                this.beatsData.V = this.filterBeatByType(currentDateTags, 'V').length;
                this.beatsData.S = this.filterBeatByType(currentDateTags, 'S').length;
                this.beatsData.Q = this.filterBeatByType(currentDateTags, 'Q').length;
                this.resetRRIHandle = true;
                this.rriData = this.createRRIData(currentDateTags, 'N');
            },
            //重置散点图和心电统计按钮组
            reset() {
                this.$refs.beatStatisticsBtns.reset();
                this.symbolColor = this.symbolColorMap.N;
            },
            formatDate(date) {
                return date.replace(/-/g, '/') + ' 00:00:00';
            },
            filterBeatByType(tags, type) {
                return tags.filter(tag => {
                    return JSON.parse(tag).t === type && JSON.parse(tag).d !== 2
                });
            },
            createRRIData(currentDateTags, beatType) {
                let res = [];
                if (currentDateTags.length >= 2) {
                    for (let i = 0; i < currentDateTags.length; i++) {
                        let currentTag = null;
                        let preTag = null;
                        if (i === 0) {
                            currentTag = JSON.parse(currentDateTags[i]);
                            preTag = JSON.parse(currentDateTags[i + 1]);
                        } else {
                            currentTag = JSON.parse(currentDateTags[i]);
                            preTag = JSON.parse(currentDateTags[i - 1]);
                        }
                        if (currentTag.d !== 2 && currentTag.t === beatType) {
                            let rri = parseInt((currentTag.p - preTag.p) / 512 * 1000);
                            if (rri > 3000) {
                                rri = 3000;
                            }
                            let x = new Date(this.ecgStartTime).setSeconds(new Date(this.ecgStartTime).getSeconds() + currentTag.p / 512);
                            res.push([x, rri]);
                        }
                    }
                }
                return res
            },
            beatTypeSelect(item) {
                this.changeViewLoadingState(true)
                this.$refs.RRIScatter.changeRRILoading(true);
                this.resetRRIHandle = true;
                this.symbolColor = this.symbolColorMap[item];
                let currentDateTags = this.perDateData[this.validDates[this.currentDateIndex]].data;
                this.rriData = this.createRRIData(currentDateTags, item);
                this.initOverlay(item);
            },
            rriSelectTimeChange({start, end}) {
                this.initOverlay(this.currentBeatType, start, end);
                this.rriSelectTimeRange = {start, end};
            },
            rriSelectTimeRangeChange(timeRange) {
                //避免鼠标单击后，鼠标keyup事件再次触发相同的请求
                if (this.rriSelectTimeRange.start === timeRange.start && this.rriSelectTimeRange.end === timeRange.end) {
                    return;
                }
                this.rriSelectTimeRange = {
                    start: timeRange.start,
                    end: timeRange.end
                };
                this.initOverlay(this.currentBeatType, this.rriSelectTimeRange.start, this.rriSelectTimeRange.end);
            },
            selectOverlayArea(left, right, top, bottom) {
                if (this.overlayDragArea !== null) {
                    if (this.overlayDragArea.left === left && this.overlayDragArea.right === right
                        && this.overlayDragArea.top === top && this.overlayDragArea.bottom === bottom) {
                        return;
                    }
                }
                this.overlayDragArea = {left, right, top, bottom};
                this.$refs.ecgFragments.closeEvent();
            },
            moveOverlayDo(keyCode) {
                //当前窗口移动到当前窗口，则操作无效
                if (this.currentActiveSlot === this.moveOverlayKeyCodeMap[keyCode]) {
                    return;
                }
                if (this.overlayDragArea !== null) {
                    this.$refs.ecgFragments.handleLoadingShow();
                    if (!this.wholeViewLoading) {
                        this.$refs.overlayMain.changeOverlayImgLoading(this.currentActiveSlot, true);
                        this.$refs.overlayMain.changeOverlayImgLoading(this.moveOverlayKeyCodeMap[keyCode], true);
                    }
                    API.movementOverlay(this.report_id, {
                        src: `SLOT_${this.currentActiveSlot}`,
                        dst: `SLOT_${this.moveOverlayKeyCodeMap[keyCode]}`,
                        fromX: this.overlayDragArea.left,
                        toX: this.overlayDragArea.right,
                        fromY: this.overlayDragArea.top,
                        toY: this.overlayDragArea.bottom
                    }).then(() => {
                        this.$refs.overlayMain.changeOverlayImgUrls(this.currentActiveSlot,
                            `/overlay/image/${this.report_id}/SLOT_${this.currentActiveSlot}?${new Date().getTime()}`);
                        this.$refs.overlayMain.changeOverlayImgUrls(this.moveOverlayKeyCodeMap[keyCode],
                            `/overlay/image/${this.report_id}/SLOT_${this.moveOverlayKeyCodeMap[keyCode]}?${new Date().getTime()}`);
                        axios.all([API.getSlotBeats(this.report_id, `SLOT_${this.currentActiveSlot}`),
                            API.getSlotBeats(this.report_id, `SLOT_${this.moveOverlayKeyCodeMap[keyCode]}`)])
                            .then(axios.spread((srcBeats, dstBeats) => {
                                this.currentSlotBeats = srcBeats.sort((a, b) => a - b);
                                this.slotBeats.splice(this.currentActiveSlot, 1, srcBeats);
                                this.slotBeats.splice(this.moveOverlayKeyCodeMap[keyCode], 1, dstBeats);
                                this.slotBeatCounts.splice(this.currentActiveSlot, 1, srcBeats.length);
                                this.slotBeatCounts.splice(this.moveOverlayKeyCodeMap[keyCode], 1, dstBeats.length);
                            }));
                        this.overlayDragArea = null;
                        this.$refs.overlayMain.resetDragArea();
                    })
                } else {
                    this.$refs.overlayMain.resetDragArea();
                }
            },
            moveOverlay(e) {
                switch (e.keyCode) {
                    case 48:
                    case 96:
                        this.moveOverlayDo(e.keyCode);
                        break;
                    case 49:
                    case 97:
                        this.moveOverlayDo(e.keyCode);
                        break;
                    case 50:
                    case 98:
                        this.moveOverlayDo(e.keyCode);
                        break;
                    case 51:
                    case 99:
                        this.moveOverlayDo(e.keyCode);
                        break;
                    case 52:
                    case 100:
                        this.moveOverlayDo(e.keyCode);
                        break;
                }
            },
            adjacentDateTime(time) {
                let date = new Date(time);
                date.setDate(date.getDate() + 1);
                return Util.formatTimeM(date);
            },
            slotChange(slot) {
                this.currentActiveSlot = slot;
                this.currentSlotBeats = this.slotBeats[slot].sort((a, b) => a - b);
//                this.currentSlotBeats =
            },
            initOverlay(beatType = 'N', beginTime = this.currentDate, endTime = this.adjacentDateTime(this.currentDate)) {
                this.currentActiveSlot = 0;
                this.currentBeatType = beatType;
                this.slotBeatCounts = new Array(5).fill(0);
                this.$refs.overlayMain.reset();
                //重置一些与叠加图相关的状态
                if (!this.wholeViewLoading) {
                    this.$refs.overlayMain.changeOverlayImgLoading(0, true);
                }
                this.$refs.ecgFragments.handleLoadingShow();
                API.loadOverlayData(this.report_id, {
                    beatType: beatType,
                    beginTime: beginTime,
                    endTime: endTime,
                }).then((res) => {
                    this.$refs.overlayMain.changeOverlayImgUrls(0, `/overlay/image/${this.report_id}/SLOT_0?${new Date().getTime()}`);
                    return API.getSlotBeats(this.report_id, 'SLOT_0');
                }).then(beats => {
                    this.currentSlotBeats = beats.sort((a, b) => a - b);//更新右侧的心电片段列表
                    this.slotBeats.splice(this.currentActiveSlot, 1, beats);
                    this.slotBeatCounts.splice(0, 1, this.currentSlotBeats.length);
                })
            }
        },
        mounted() {
            this.currentDateIndex = this.defaultActiveIndex;
            this.currentDate = this.formatDate(this.validDates[this.defaultActiveIndex]);
            this.getCurrentDateTags(this.defaultActiveIndex);
        },
        beforeDestroy() {

        },
        activated() {
            $(document).on('keyup', this.moveOverlay);
            if (this.tagChangeState[2]) {
                this.handleChangePageState();
                let tempTagStates = this.tagChangeState;
                tempTagStates[2] = false;
                this.changeTagState(tempTagStates);
            }
        },
        deactivated() {
            $(document).off();
        }
    }
</script>
<style scoped lang="scss">
    .overlay-view {
        width: 1370px;
    }

    .overlay-view-header {
        display: flex;
    }

    .overlay-view-content {
        display: flex;
        margin-top: 10px;
    }

    .overlay-view-content-left {
        width: 300px;
        margin-right: 10px;
    }
</style>