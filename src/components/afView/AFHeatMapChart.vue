<template>
    <div class="wrapper" ref="outerBox" @mousedown="clearDropDom"  @mouseup="showDropDown"  @mouseenter="clearDropDom">
        <div class="fixedBox" :style="{position:'absolute',zIndex: 2012,left: mouseOrigin.x +'px', top: mouseOrigin.y + 'px'}">
            <el-dropdown ref="operationMenuHeat" placement="bottom-end" trigger="click" @command="handleMenuOperation"
                         @visible-change="handleMenuVisible"
            >
                <span class="el-dropdown-link"></span>
                <el-dropdown-menu slot="dropdown">
                    <el-dropdown-item command="add">添加</el-dropdown-item>
                    <el-dropdown-item command="remove">删除</el-dropdown-item>
                </el-dropdown-menu>
            </el-dropdown>
        </div>
        <div class="chart" ref="chartDiv"></div>
        <div
                class="dragged-region"
                v-if="xAxisDraggingInfo !== null"
                :style="{
                    left: xAxisDraggingInfo.left + 'px',
                    width: xAxisDraggingInfo.width + 'px'
                }">
        </div>
        <div class="clicked-line" v-if="clickedLine !== null" :style="{left: clickedLine.position + 'px'}"></div>
    </div>
</template>

<script>
    import echarts from 'echarts';
    import {mapState, mapMutations, mapActions} from 'vuex';
    import {RRExtractor} from '../../common/rr_extractor';
    import AbstractNavigator from './AbstractNavigator';

    const STEP_MINUTE = 10;
    const STEP_RR = 32;
    const STEP_HOUR = STEP_MINUTE / 60;
    const X_AIXS_DATA = (function () {
        let max = 24 * 60 / STEP_MINUTE;
        let arr = new Array(max);
        for (var i = 0; i < max; i++) {
            arr[i] = i;
        }
        return arr;
    })();

    const MAX_RR_MS = 1500;

    const VISUAL_MAP_PIECES = (function() {
        var arr = new Array(8);
        arr[0] = {min: 0, max: 1, color: "rgb(0, 0, 128)"};
        arr[1] = {min: 1, max: 2, color: "rgb(0, 0, 255)"};
        arr[2] = {min: 2, max: 3, color: "rgb(0, 255, 255)"};
        arr[3] = {min: 3, max: 4, color: "rgb(0, 128, 255)"};
        arr[4] = {min: 4, max: 5, color: "rgb(0, 255, 0)"};
        arr[5] = {min: 5, max: 6, color: "rgb(255, 255, 128)"};
        arr[6] = {min: 6, max: 7, color: "rgb(255, 128, 64)"};
        arr[7] = {min: 7, max: 8, color: "rgb(255, 0, 0)"};

        return arr;
    })();

    export default {
        name: "AFHeatMapChart",
        mixins: [AbstractNavigator],
        props: ['handleMenuOperation', 'handleMenuVisible'],
        data() {
            return {
                mouseOrigin: {
                    x: 0,
                    y: 0
                },
                drawState: false,
                selectState: false,
            };
        },
        computed: {
            ...mapState('afView', {
                selectedRange: state => state.selectedRange,
                afFragmentData: state => state.afFragmentData,
            }),
            heats: function () {
                let hour = parseInt(this.ecgStartTime.substr(this.ecgStartTime.length - 8, 2));
                let min = parseInt(this.ecgStartTime.substr(this.ecgStartTime.length - 5, 2));
                let offset = Math.ceil(((hour - 24 * this.dateIndex) * 60 + min) / STEP_MINUTE);
                var heats = [];
                if (this.currentDateTags.length != 0) {
                    let rrExtractor = new RRExtractor(512, this.currentDateTags, this.ecgStartTime);
                    let matrix = rrExtractor.distributionsRatioByMax(STEP_MINUTE * 60, STEP_RR, 0, MAX_RR_MS);
                    for (var x = 0; x < matrix.length; x++) {
                        let col = matrix[x];
                        for (var y = 0; y < col.length; y++) {
                            let v = col[y];
                            if (v) {
                                heats.push([x + offset, y, Math.floor(v * VISUAL_MAP_PIECES.length)]);
                            }
                        }
                    }
                }
                return heats;
            }
        },
        watch: {
            heats: function () {
                this.drawChart();
                this.selectHour(this.startHour);
            },
            selectComponent: function () {
                if (this.selectComponent === 'afView') {
                    document.addEventListener('keyup', this.doNavigate);
                } else {
                    document.removeEventListener('keyup', this.doNavigate);
                }
            },
        },
        methods: {
            drawChart: function () {
                var levels = new Array(Math.round(MAX_RR_MS / STEP_RR));
                for (var i = 0; i < levels.length; i++) {
                    levels[i] = STEP_RR * i;
                }
                var options = {
                    backgroundColor: 'black',
                    animation: false,
                    grid: {
                        x: 40,
                        y: 30,
                        x2: 40,
                        y2: 30
                    },
                    xAxis: [
                        {
                            type: 'category',
                            data: X_AIXS_DATA,
                            show: false
                        },
                        {
                            type: 'value',
                            position: 'bottom',
                            min: 0,
                            max: 24,
                            interval: 1,
                            axisLine: {
                                lineStyle: {
                                    color: 'white'
                                }
                            },
                            axisLabel: {
                                formatter: function (value) {
                                    return (value < 10 ? "0" : "") + value + ":00"
                                }
                            },
                            splitLine: {
                                show: false
                            }
                        }
                    ],
                    yAxis: [
                        {
                            type: 'category',
                            data: levels,
                            show: false
                        },
                        {
                            type: 'value',
                            data: levels,
                            position: 'left',
                            min: 0,
                            max: levels.length,
                            axisLine: {
                                lineStyle: {
                                    color: 'white'
                                }
                            },
                            axisLabel: {
                                formatter: function (value) {
                                    return levels[value];
                                }
                            },
                            splitLine: {
                                show: false
                            }
                        }
                    ],
                    series: [
                        {
                            type: 'heatmap',
                            data: this.heats
                        }
                    ],
                    visualMap: {
                        show: false,
                        type: 'piecewise',
                        splitNumber: VISUAL_MAP_PIECES.length,
                        pieces: VISUAL_MAP_PIECES
                    }
                };
                this.chart.setOption(options);
            },
            doNavigate(event) {
                if (event.keyCode === 37 && this.clickedLine && this.clickedLine.hour >= this.startHour + STEP_HOUR) {
                    this.selectHour(this.clickedLine.hour - STEP_HOUR);
                } else if (event.keyCode === 39 && this.clickedLine && this.clickedLine.hour < this.endHour - STEP_HOUR) {
                    this.selectHour(this.clickedLine.hour + STEP_HOUR);
                }
            },
            showDropDown(e) {
                if (this.selectedRange !== null && this.selectedRange.from !== this.selectedRange.to)  {
                    this.mouseOrigin = {
                        ...this.mouseOrigin,
                        x: e.offsetX,
                        y: e.offsetY
                    };
                    setTimeout(() => {
                        this.$refs.operationMenuHeat.show();
                    }, 0);
                }
            },
            clearDropDom() {
                this.$refs.operationMenuHeat.hide();
            },
        },
        mounted() {
            this.chart = echarts.init(this.$refs.chartDiv);
            this.bindXAxisEvents();
            this.drawChart();
            document.addEventListener('keyup', this.doNavigate);
        },
        beforeDestroy(){
            document.removeEventListener('keyup', this.doNavigate);
            this.chart.dispose();
            this.chart = null;
        },
        destroyed() {

        },
    }
</script>

<style scoped lang="scss">

    $line-color: #aaaaaa;

    $area-color: #555555;

    div.wrapper {

        position: relative;

        div.chart {
            height: 100%;
        }

        div.dragged-region {
            position: absolute;
            background-color: $area-color;
            border-left: solid 1px $line-color;
            border-right: solid 1px $line-color;
            top: 0px;
            bottom: 0px;
            opacity: 0.5;
            pointer-events: none;
        }

        div.clicked-line {
            position: absolute;
            width: 0px;
            top: 0px;
            bottom: 0px;
            border-left: solid 1px $line-color;
            pointer-events: none;
        }
    }
</style>