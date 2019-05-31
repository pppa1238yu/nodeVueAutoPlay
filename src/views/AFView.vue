<template>
    <div class="view-box" v-loading="tagsLoading">
        <AFViewHeader/>
        <div class="navigator">
            <AFHeatMapChart
                    class="navigator-chart"
                    :style="{visibility : !showDiffChart && !tagsLoading ? 'visible' : 'hidden'}"
                    :handleMenuOperation="handleMenuOperation"
                    :handleMenuVisible="handleMenuVisible"/>
            <AFDiffDegreeChart
                    class="navigator-chart"
                    :style="{visibility : showDiffChart && !tagsLoading ? 'visible' : 'hidden'}"
                    :handleMenuOperation="handleMenuOperation"
                    :handleMenuVisible="handleMenuVisible"/>
            <canvas id="myCavansHeat" width="1370px" height="20px" style="position: absolute; bottom: 14px;pointer-events: none;"></canvas>

        </div>
        <div class="flexBox">
            <AFFragmentList/>
            <RRILineChartView class="rri-chart" :handleMenuOperation="handleMenuOperation"
                              :handleMenuVisible="handleMenuVisible"/>
        </div>
        <ScatterView/>
        <el-dialog
                :visible.sync="dragEditDialogState"
                width="400px"
                center
                top="430px"
                :show-close="false"
                :close-on-click-modal="false"
                :close-on-press-escape="false"
        >
            <div class="edit-dialog-content">
                <div>
                    发生时刻：
                    <el-time-picker
                            v-model="dragEditTime"
                            :picker-options="{
                        selectableRange: '00:00:00 - 23:59:59'
                    }"
                            placeholder="发生时刻">
                    </el-time-picker>
                </div>
                <div>
                    持续时间：
                    <el-time-picker
                            v-model="dragEditTimeLen"
                            :picker-options="{
                        selectableRange: '00:00:10 - 23:59:59'
                    }"
                            placeholder="持续时间">
                    </el-time-picker>
                </div>
                <div style="height: 40px;line-height: 40px">
                    事件类型：
                    <el-radio v-model="dragEditRhythmType" label="AF">房颤</el-radio>
                    <el-radio v-model="dragEditRhythmType" label="AFLUT">房扑</el-radio>
                </div>
            </div>
            <span slot="footer" class="dialog-footer">
                 <el-button type="primary" @click="confirmDragEdit">修改</el-button>
                 <el-button @click="cancelDragEdit">取 消</el-button>
            </span>
        </el-dialog>
    </div>
</template>

<script>
    import {mapState, mapMutations, mapActions} from 'vuex';
    import AFViewHeader from '../components/afView/AFViewHeader.vue';
    import AFHeatMapChart from '../components/afView/AFHeatMapChart.vue';
    import AFDiffDegreeChart from '../components/afView/AFDiffDegreeChart.vue';
    import RRILineChartView from '../components/afView/RRILineChartView';
    import AFFragmentList from '../components/afView/AFFragmentList.vue';
    import ScatterView from '../components/block/ScatterBlock.vue';
    import Util from '../common/util';
    import {LabelSet} from '../common/label_set';

    export default {
        name: 'AFView',
        data() {
            return {
                dragEditDialogState: false,
                dragEditTime: '',
                dragEditTimeLen: '',
                dragEditRhythmType: 'AF',
                drawData: []
            };
        },
        components: {
            AFViewHeader,
            RRILineChartView,
            AFHeatMapChart,
            AFDiffDegreeChart,
            AFFragmentList,
            ScatterView
        },
        computed: {
            ...mapState('afView', {
                tagsLoading: state => state.tagsLoading,
                showDiffChart: state => state.showDiffChart,
                selectedRange: state => state.selectedRange,
                dateIndex: state => state.dateIndex,
                afFragmentData: state => state.afFragmentData,
            }),
            ...mapState('ecgView', {
                ecgStartTime: state => state.ecgStartTime,
                validDates: state => state.validDates,
            }),
        },
        methods: {
            ...mapMutations('afView', [
                'changeSelectedRange',
                'changeAfFragmentData2',
            ]),
            initCanvas() {
                let c_canvas = document.getElementById('myCavansHeat');
                if(c_canvas===null){
                    return;
                }
                let context = c_canvas.getContext("2d");
                let width = 1290;
                let height = c_canvas.height;
                context.clearRect(0, 0, width, height);
                context.beginPath();
                this.drawData.map(item => {
                    let x = item.begin * width + 40;
                    let endWidth = item.end * width + 2;
                    context.fillStyle = '#ff4f04';
                    if (item.type === 'AFLUT') {
                        context.fillStyle = '#1c87ff'
                    }
                    context.fillRect(x, 0, endWidth, 4);
                });
                context.stroke();
                context.closePath();
            },
            timeToPer(time) {
                let i = 3600;
                let calcSec = 0;
                time.split(':').map(item => {
                    calcSec += Number(item) * i;
                    i = parseInt(i/60);
                });
                return calcSec / 86400;
            },
            handleMenuOperation(command) {
                if (command === 'add') {
                    this.dragEditDialogState = true;
                } else {
                    if (this.selectedRange !== null) {
                        let formatAfFragmentData = this.formatAfFragments();
                        if (formatAfFragmentData.length !== 0) {
                            let begin = this.selectedRange.from;
                            let end = this.selectedRange.to;
                            this.$confirm('确定要删除这段心律?', '提示', {
                                confirmButtonText: '确定',
                                cancelButtonText: '取消',
                                type: 'warning'
                            }).then(() => {
                                let ls = new LabelSet();
                                ls.setLabels(formatAfFragmentData);
                                ls.erase(begin, end);
                                this.changeAfFragmentData2(this.formatLabels(ls.getLabels()));
                            }).catch(() => {

                            });
                        } else {
                            this.$message({
                                message: '房颤临时表无数据，不能进行该操作',
                                type: 'warning'
                            });
                        }
                    }
                }
            },
            handleMenuVisible(visible) {
                if (!visible) {
                    this.changeSelectedRange(null);
                }
            },
            confirmDragEdit() {
                let formatYMD = this.validDates[this.dateIndex].replace(/\-/g, '/');
                let formatAfFragmentData = this.formatAfFragments();
                let editStartPos = (new Date(this.dragEditTime).getTime() - new Date(this.ecgStartTime).getTime()) / 1000 * 512;
                let editEndPos = editStartPos + (this.dragEditTimeLen.getTime() - new Date(formatYMD + ' 00:00:00').getTime()) / 1000 * 512;
                let ls = new LabelSet();
                ls.setLabels(formatAfFragmentData);
                ls.set(this.dragEditRhythmType, editStartPos, editEndPos);
                this.dragEditDialogState = false;
//                if (ls.hasConflict()) {
//                    this.$message({
//                        type: 'error',
//                        message: '保存心律失败，该时段存在其他心律！'
//                    });
//                } else {
//                    this.changeAfFragmentData2(this.formatLabels(ls.getLabels()));
//                }
                this.changeAfFragmentData2(this.formatLabels(ls.getLabels()));
            },
            cancelDragEdit() {
                this.dragEditDialogState = false;
            },
            //将labels数组(集合操作临时列表的模块)转为临时列表的数据结构
            formatLabels(labels) {
                let startDate = null;
                let endDate = null;
                return labels.map(label => {
                    let date = new Date(this.ecgStartTime);
                    date.setSeconds(date.getSeconds() + parseInt(label.begin / 512));
                    startDate = date;
                    let time = Util.formatTimeH(startDate);
                    date = new Date(this.ecgStartTime);
                    date.setSeconds(date.getSeconds() + parseInt(label.end / 512));
                    endDate = date;
                    return {
                        time: time,
                        timeLen: Util.calcTimeLength(startDate, endDate),
                        type: label.type,
                        isSavedState: false
                    }
                })
            },
            //将临时列表转为labels数组(集合操作临时列表的模块)
            formatAfFragments() {
                let formatYMD = this.validDates[this.dateIndex].replace(/\-/g, '/');
                return this.afFragmentData.map(v => {
                    let date = new Date(formatYMD + ' ' + v.time);
                    let beginPos = (date.getTime() - new Date(this.ecgStartTime).getTime()) / 1000 * 512;
                    let seconds = (new Date(formatYMD + ' ' + v.timeLen).getTime() - new Date(formatYMD + ' 00:00:00').getTime()) / 1000;
                    let endPos = beginPos + seconds * 512;
                    return {
                        begin: beginPos,
                        end: endPos,
                        type: v.type
                    }
                });
            }
        },
        mounted() {

        },
        watch: {
            selectedRange: function () {
                if (this.selectedRange != null) {
                    let startDate = new Date(this.ecgStartTime);
                    startDate.setSeconds(startDate.getSeconds() + Math.floor(this.selectedRange.from / 512));
                    this.dragEditTime = startDate;
                    let endPos=this.selectedRange.to;
                    //横向拖动选择的时间片段必须大于等于10秒,否则重置为10秒
                    if (this.selectedRange.to - this.selectedRange.from < 512 * 10) {
                        endPos = this.selectedRange.from + 512 * 10;
                    }
                    let endDate = new Date(this.ecgStartTime);
                    endDate.setSeconds(endDate.getSeconds() + Math.floor(endPos / 512));
                    let tempEditTimeLen = this.validDates[this.dateIndex].replace(/\-/g, '/') + ' ' + Util.calcTimeLength(startDate, endDate);
                    this.dragEditTimeLen = new Date(tempEditTimeLen);
                }
            },
            afFragmentData: function () {
                if (this.afFragmentData.length) {
                    let temp = [];
                    this.afFragmentData.map( item => {
                        temp.push({
                            begin: this.timeToPer(item.time),
                            end: this.timeToPer(item.timeLen),
                            type: item.type
                        })
                    });
                    this.drawData = temp;
                    this.initCanvas();
                }else {
                    let c_canvas = document.getElementById('myCavansHeat');
                    let context = c_canvas.getContext("2d");
                    context.clearRect(0, 0, c_canvas.width, c_canvas.height)
                }
            }
        },
        destroyed(){

        }
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
    div.view-box {
        width: 1370px;

        div.navigator {
            position: relative;
            margin-top: 2px;
            height: 300px;
            box-sizing: content-box;

            .navigator-chart {
                position: absolute;
                left: 0px;
                top: 0px;
                right: 0px;
                bottom: 0px;
            }
        }

        .rri-chart {
            width: 600px;
            height: 300px;
        }
    }

    .flexBox {
        display: flex;
        justify-content: space-around;
    }

    .edit-dialog-content > div {
        margin-bottom: 10px;
    }
</style>
