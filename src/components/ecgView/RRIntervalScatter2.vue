<template>
    <div style="display: flex">
        <div class="RR2-box">
            <div class="rr-line-operate" ref="rrLineOperate">
                <div class="rr-line" :style="{width:lineWidthMap[add]+'px'}">
                </div>
            </div>
            <canvas width="1000" height="150" id="RRIntervalCanvas2"></canvas>
        </div>
        <div class="explain">
            <p :style="{color:fillColorMap.N}">
                窦性:N
            </p>
            <p :style="{color:fillColorMap.V}">
                室早:V
            </p>
            <p :style="{color:fillColorMap.S}">
                房早:S
            </p>
            <p :style="{color:fillColorMap.AF}">
                房颤房扑
            </p>
        </div>
    </div>
</template>
<script>
    import {mapMutations, mapState} from 'vuex';
    import Util from '../../common/util';
    import {bus} from '../../bus';
    import API from '../../api/api_ecg_view';

    export default {
        name: 'RRIntervalScatter2',
        data() {
            return {
                x_start_pos: 40,
                x_end_pos: 980,
                y_start_pos: 10,
                y_end_pos: 130,
                fillColorMap: {
                    N: Util.nTag,
                    V: Util.vTag,
                    S: Util.sTag,
                    AF: Util.afRythmColor,
                    AFLUT: Util.aflutRythmColor
                },
                longRR: [],
                currentLongRRIndex: -1,
                startP: 0,
                endP: 0,
                scrollStartTime: 0,
                scrollEndTime: 0,
                lineWidthMap: {
                    '5': 10,
                    '10': 6,
                    '20': 2
                }
            }
        },
        mounted() {
            $(document).unbind('keyup', this.viewLongRR);
            $(document).bind('keyup', this.viewLongRR);
            bus.$off('bindViewLongRR');
            bus.$on('bindViewLongRR', () => {
                $(document).unbind('keyup', this.viewLongRR);
                $(document).bind('keyup', this.viewLongRR);
            });
            this.$refs.rrLineOperate.addEventListener('mousewheel', this.rrLineOperateScroll);
            this.$refs.rrLineOperate.addEventListener('DOMMouseScroll', this.rrLineOperateScroll);
        },
        computed: {
            ...mapState('ecgView', {
                tagPos: state => state.tagPos,
                currentDateHour: state => state.currentDateHour,
                ecgStartTime: state => state.ecgStartTime,
                currentDateMinNum: state => state.currentDateMinNum,
                ecgDataLoading: state => state.ecgDataLoading,
                deleteTagState2: state => state.deleteTagState2,
                rhythm: state => state.rhythm,
                updateTagQState2: state => state.updateTagQState2,
                getTagRhythmLoading: state => state.getTagRhythmLoading,
                add: state => state.gainSelected,
            }),
            curMin: {
                get: function () {
                    return this.$store.state.ecgDrag.curMin;
                },
                set: function () {
                }
            }
        },
        watch: {
            currentDateMinNum: function (currentDateMinNum) {
                this.translateDragLine(currentDateMinNum / 3600 * (this.x_end_pos - this.x_start_pos));
            },
            ecgDataLoading: function (ecgDataLoading) {
                if (ecgDataLoading) {
                    $('.RR2-box').off('click');
                } else {
                    $('.RR2-box').on('click', '.rr-line-operate', (e) => {
                        let offsetX = e.clientX - $('.rr-line-operate').offset().left;
                        this.rrLineClick(offsetX);
                    })
                }
            },
            deleteTagState2: function (deleteTagState2) {
                if (deleteTagState2) {
                    this.initCanvas({
                        data: this.currentHourTagsRhys(true, this.currentDateHour),
                        rhythms: this.rhythm
                    });
                    this.changeDeleteTagState2(false);
                }
            },
            updateTagQState2: function (updateTagQState2) {
                if (updateTagQState2) {
                    this.initCanvas({
                        data: this.currentHourTagsRhys(true, this.currentDateHour),
                        rhythms: this.rhythm
                    });
                    this.changeUpdateTagQState2(false);
                }
            },
            getTagRhythmLoading: function (getTagRhythmLoading) {
                if (!getTagRhythmLoading) {
                    this.initCanvas({
                        data: this.currentHourTagsRhys(true, this.currentDateHour),
                        rhythms: this.rhythm
                    });
                }
            }
        },
        methods: {
            ...mapMutations('ecgDrag', [
                'changeCurMin',
                'changeClickDragState'
            ]),
            ...mapMutations('ecgView', [
                'changeMinNum',
                'changeDeleteTagState2',
                'changeUpdateTagQState2'
            ]),
            initCanvas(option = {}) {
                let c_canvas = document.getElementById('RRIntervalCanvas2');
                if (c_canvas) {
                    let options = {
                        data: [],
                        rhythms: [],
                        x_start_pos: this.x_start_pos,
                        x_end_pos: this.x_end_pos,
                        yMax: 3000,
                        y_start_pos: this.y_start_pos,
                        y_end_pos: this.y_end_pos
                    };
                    options = Object.assign(options, option);
                    let context = c_canvas.getContext("2d");
                    context.clearRect(0, 0, c_canvas.width, c_canvas.height);
                    this.drawGrid(c_canvas, options);
                }
            },
            drawGrid(c_canvas, options) {
                let {x_start_pos, x_end_pos, data, yMax, rhythms, y_start_pos, y_end_pos} = {...options};
                this.drawClick(c_canvas, x_start_pos, x_end_pos, yMax, y_start_pos, y_end_pos);
                this.drawScatter(c_canvas, x_start_pos, x_end_pos, data, yMax, rhythms, y_start_pos, y_end_pos);
            },
            drawClick(c_canvas, x_start_pos, x_end_pos, yMax, y_start_pos, y_end_pos) {
                let context = c_canvas.getContext("2d");
                context.strokeStyle = "#000";
                context.strokeWidth = 1;
                context.beginPath();
                context.font = "8pt Calibri";
                context.fillStyle = '#000';
                // 绘制x,y轴
                context.moveTo(x_start_pos, y_end_pos);
                context.lineTo(x_start_pos, y_start_pos);
                context.moveTo(x_start_pos, y_end_pos);
                context.lineTo(x_end_pos, y_end_pos);
                //画坐标轴的单位
                context.fillText('(ms)', 45, 20);
                // 绘制y轴click
                let yLength = y_end_pos - y_start_pos;
                for (let y = yMax; y > 0; y -= 500) {
                    context.moveTo(x_start_pos, y_start_pos + (yMax - y) * (yLength / yMax));
                    context.lineTo(x_start_pos - 6, y_start_pos + (yMax - y) * (yLength / yMax));
                    if (y % 1000 === 0) {
                        context.fillText(y, x_start_pos - 32, y_start_pos + 3 + (yMax - y) * (yLength / yMax));
                    }
                }
                let startTime = new Date(this.currentDateHour).getTime();
                let endTime = new Date(this.currentDateHour).setHours(new Date(this.currentDateHour).getHours() + 1);
                //                绘制x轴click
                for (let x = startTime; x <= endTime; x += 20 * 60 * 1000) {
                    let xPos = x_start_pos + (x - startTime) * (x_end_pos - x_start_pos) / (60 * 60 * 1000);
                    context.moveTo(xPos, y_end_pos);
                    context.lineTo(xPos, y_end_pos + 6);
                    let hour = new Date(x).getHours() < 10 ? '0' + new Date(x).getHours() : new Date(x).getHours();
                    let min = new Date(x).getMinutes() < 10 ? '0' + new Date(x).getMinutes() : new Date(x).getMinutes();
                    context.fillText(hour + ':' + min, xPos - 12, y_end_pos + 15);
                }
                context.stroke();
                context.closePath();
            },
            beatIncludedRhythm(index, rhythms) {
                let flag = false;
                for (let k = 0; k < rhythms.length; k++) {
                    if (index >= rhythms[k].begin && index < rhythms[k].end) {
                        flag = true;
                        break;
                    }
                }
                return flag;
            },
            drawScatter(c_canvas, x_start_pos, x_end_pos, data, yMax, rhythms, y_start_pos, y_end_pos) {
                this.longRR = [];
                this.currentLongRRIndex = -1;//复原相关rr间期的导航所需参数
                let noises = rhythms.filter(e => {
                    return e.type === 'NOISE'
                });
                let afRhythms = rhythms.filter(e => {
                    return e.type === 'AF' && e.state !== 0
                });
                let aflutRhythms = rhythms.filter(e => {
                    return e.type === 'AFLUT' && e.state !== 0
                });
                let context = c_canvas.getContext("2d");
                let startTime = new Date(this.currentDateHour).getTime();
                let preTagP = 0;
                let draw_cycle = true;

                for (let i = 0; i < data.length; i++) {
                    if (data[i].state !== 0 && data[i].t === 'Q') {
                        preTagP = 0;
                        continue;
                    }
                    if (preTagP !== 0) {
                        if (data[i].state !== 0) {
                            draw_cycle = true;
                            let rri = (data[i].p - preTagP) / 512;
                            for (let j = 0; j < noises.length; j++) {
                                let rhyLen = noises[j].end - noises[j].begin;
                                if (rhyLen + (data[i].p - preTagP) >= Math.max(data[i].p, noises[j].end) - Math.min(preTagP, noises[j].begin)) {
                                    draw_cycle = false;
                                    break;
                                }
                            }
                            if (rri < 60 && rri > 0 && draw_cycle) {
                                if (rri > 1.5) {
                                    this.longRR.push(data[i].p);
                                }
                                context.fillStyle = this.fillColorMap[data[i].t] || '#666';
                                if (this.beatIncludedRhythm(data[i].p, afRhythms)) {
                                    context.fillStyle = this.fillColorMap.AF;
                                }
                                if (this.beatIncludedRhythm(data[i].p, aflutRhythms)) {
                                    context.fillStyle = this.fillColorMap.AFLUT;
                                }
                                let y = rri * 1000;
                                let x = new Date(this.ecgStartTime).setSeconds(new Date(this.ecgStartTime).getSeconds() + data[i].p / 512);
                                let xPos = x_start_pos + (x_end_pos - x_start_pos) / (60 * 60 * 1000) * (x - startTime);
                                if (y > 3000) {
                                    y = 3000;
                                }
                                let yPos = y_start_pos + (yMax - y) * ((y_end_pos - y_start_pos) / yMax);
                                context.beginPath();
                                context.arc(xPos, yPos, 2, 0, 360, false);
                                context.fill();//画实心圆
                                context.closePath();
                            }
                        }
                    }
                    if (data[i].state !== 0) {
                        preTagP = data[i].p
                    }
                }
            },
            //取当前小时的心拍以及当前本地
            currentHourTagsRhys(isTag, currentDateHour) {
                let endTime = new Date(currentDateHour).setHours(new Date(currentDateHour).getHours() + 1);
                if (new Date(currentDateHour).getTime() < new Date(this.ecgStartTime).getTime()) {
                    this.startP = 0;
                } else {
                    this.startP = (new Date(currentDateHour).getTime() - new Date(this.ecgStartTime).getTime()) / 1000 * 512;
                }
                this.endP = (endTime - new Date(this.ecgStartTime).getTime()) / 1000 * 512;
                let startIndex = isTag ? this.binarySearch(this.startP, this.tagPos, 'p') : this.binarySearch(this.startP, this.rhythm, 'begin');
                let endIndex = isTag ? this.binarySearch(this.endP, this.tagPos, 'p') : this.binarySearch(this.endP, this.rhythm, 'begin');
                return isTag ? this.tagPos.slice(startIndex, endIndex) : this.rhythm.slice(startIndex, endIndex);
            },
            binarySearch(index, data, pos) {
                let l = 0, r = data.length - 1;
                while (l <= r) {
                    let mid = parseInt((l + r) / 2);
                    let currentP = data[mid][pos];
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
            translateDragLine(offsetX) {
                if (offsetX > (this.x_end_pos - this.x_start_pos) || offsetX < 0) return;
                $('.rr-line').css({
                    left: offsetX + 'px'
                })
            },
            viewLongRR(event) {
                if (event.keyCode === 74) {
                    this.viewLongRRDo(false);
                } else if (event.keyCode === 76) {
                    this.viewLongRRDo(true);
                }
            },
            viewLongRRDo(isNext) {
                if (this.longRR.length === 0) {
                    this.$message({
                        message: '当前小时没有RR间期大于1.5秒的心拍!',
                        type: 'warning'
                    });
                    return;
                }
                if (isNext) {
                    if (this.currentLongRRIndex < this.longRR.length - 1) {
                        this.currentLongRRIndex++;
                        let offsetX = 0;
                        if (new Date(this.currentDateHour).getTime() < new Date(this.ecgStartTime).getTime()) {//当前是开始测心电的那个小时
                            let startOffset = (new Date(this.ecgStartTime).getTime() - new Date(this.currentDateHour).getTime())
                                / 1000 / 3600 * (this.x_end_pos - this.x_start_pos);
                            offsetX = startOffset + Math.floor((this.x_end_pos - this.x_start_pos - startOffset)
                                * ((this.longRR[this.currentLongRRIndex] - this.startP) / (this.endP - this.startP)));
                        } else {
                            offsetX = Math.floor((this.x_end_pos - this.x_start_pos)
                                * ((this.longRR[this.currentLongRRIndex] - this.startP) / (this.endP - this.startP)));
                        }
                        this.rrLineClick(offsetX);
                    } else {
                        this.$message({
                            message: '当前小时的长RR间期导航结束！',
                            type: 'warning'
                        });
                    }
                } else {
                    if (this.currentLongRRIndex > 0) {
                        this.currentLongRRIndex--;
                        let offsetX = Math.round((this.x_end_pos - this.x_start_pos) * ((this.longRR[this.currentLongRRIndex] - this.startP) / (this.endP - this.startP)));
                        this.rrLineClick(offsetX);
                    } else {
                        this.$message({
                            message: '当前小时的长RR间期导航结束！',
                            type: 'warning'
                        });
                    }
                }
            },
            rrLineClick(offsetX) {
                if (offsetX > (this.x_end_pos - this.x_start_pos) || offsetX < 0) return;
                let calcMin = Number((new Date(this.currentDateHour).getHours() * 60 + offsetX / (this.x_end_pos - this.x_start_pos) * 60).toFixed(1));
                this.changeClickDragState(true);
                this.changeCurMin(calcMin);
                this.changeMinNum(offsetX / (this.x_end_pos - this.x_start_pos) * 3600);
            },
            rrLineOperateScroll(event) {
                event.preventDefault();
                this.scrollStartTime = new Date().getTime();
                if (this.scrollEndTime - this.scrollStartTime < -100) {
                    let down = true; // 定义一个标志，当滚轮向下滚时，执行一些操作
                    down = event.wheelDelta ? event.wheelDelta < 0 : event.detail > 0;
                    this.changeClickDragState(true);
                    if (down) {
                        if (this.curMin + 30 < 1440) {
                            this.changeCurMin(this.curMin + 30);
                        }
                    } else {
                        if (this.curMin - 30 >= 0) {
                            this.changeCurMin(this.curMin - 30);
                        }
                    }
                }
                this.scrollEndTime = new Date().getTime();
            }
        },
        beforeDestroy() {
            $('.RR2-box').off();
            $(document).off();
            this.$refs.rrLineOperate.removeEventListener('mousewheel', this.rrLineOperateScroll);
            this.$refs.rrLineOperate.removeEventListener('DOMMouseScroll', this.rrLineOperateScroll);
        },
        destroyed() {

        },
        activated(){
            //只要进入心电报告主页，即重绘一小时散点图，保证散点图为最新
            this.initCanvas({
                data: this.currentHourTagsRhys(true, this.currentDateHour),
                rhythms: this.rhythm
            });
        }
    }
</script>
<style scoped lang="scss">
    $canvas-height: 150px;
    .RR2-box {
        position: relative;
        width: 1000px;
        height: $canvas-height;
        .rr-line-operate {
            position: absolute;
            left: 40px;
            top: 10px;
            width: 940px;
            height: $canvas-height - 10px - 20px;
            .rr-line {
                position: absolute;
                left: 0;
                top: -10px;
                height: $canvas-height - 20px;
                border: 1px solid #409EFF;
            }
        }
    }

    .explain {
        margin-left: 20px;
        font-size: 14px;
        margin-top: 10px;
    }

    .explain > p {
        margin-bottom: 10px;
    }
</style>