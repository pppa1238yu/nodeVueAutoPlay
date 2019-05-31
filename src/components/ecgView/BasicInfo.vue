<template>
    <div class="basic-info">
        <el-dialog
                :visible.sync="dialogVisibleWindow"
                width="560px"
                title="心电片段重新分析">
            <el-form ref="form" :model="form" label-width="120px">
                <el-form-item label="心电片段时间段">
                    <el-date-picker
                            v-model="form.timeValue"
                            type="datetimerange"
                            value-format="yyyy/MM/dd HH:mm:ss"
                            range-separator="至"
                            start-placeholder="开始日期"
                            :default-value="defaultDate"
                            :default-time="defaultTime"
                            @change="changeSelectTime"
                            end-placeholder="结束日期">
                    </el-date-picker>
                </el-form-item>
            </el-form>
            <span slot="footer" class="dialog-footer">
                <el-button type="primary" @click="reAnalystPart">重新分析</el-button>
            </span>
        </el-dialog>
        <div class="basic-info-left">
            <span><span>姓名：</span><span class="basic-name" :title="basicInfo.name">{{basicInfo.name}}</span></span>
            <span>年龄：<span>{{basicInfo.age}}</span></span>
            <span>性别：<span>{{basicInfo.gender}}</span></span>
            <!--<span>病史：<span>-&#45;&#45;</span></span>-->
        </div>
        <div class="basic-info-right">
            <!--<el-tooltip class="item" effect="dark" content="刷新统计信息和节律异常" placement="left">
                <el-button style="margin-right: 10px" @click="reanalysis" :disabled="refreshState">
                    {{refreshState ? '分析中' : '刷新'}}
                </el-button>
            </el-tooltip>-->
            <el-checkbox v-model="RRShowState" @change="changeRRShowState" style="margin-right: 10px">显示RR间期和心率
            </el-checkbox>
            <el-button style="margin-right: 10px" @click="dialogVisible = true">快捷键</el-button>
            <el-select class="select" v-model="rhythmTypeSelected" :disabled="rhythmTypeSelectDisabled" clearable placeholder="请选择节律异常类型"
                       @change="changeRhythmType">
                <el-option
                        v-for="item in rhythmTypeOptions"
                        :key="item"
                        :value="item"
                        :label="rhythmTypeLabel(item)"
                >
                </el-option>
            </el-select>
            <el-select class="select" v-model="value" placeholder="请选择" @change="changeGain">
                <el-option
                        v-for="item in options"
                        :key="item"
                        :value="item">
                </el-option>
            </el-select>
            <el-button @click="returnPatientList">返回列表</el-button>
            <!--<el-button type="primary" @click="dialogVisibleWindow = true">重新片段分析</el-button>-->
            <!--<router-link :to="toSrc" target="_blank">-->
            <!--<el-button type="primary" :disabled="refreshState">报告编辑</el-button>-->
            <!--</router-link>-->
        </div>
        <el-dialog
                title="快捷键说明"
                :visible.sync="dialogVisible"
                width="30%"
                center
        >
            <div class="explain">
                <p>ESC:取消掉当前状态，包括心拍心律选中状态，新增心拍或心律状态</p>
                <p>W:跳转到上一个异常心拍</p>
                <p>S:跳转到下一个异常心拍</p>
                <p>A:跳转到上一个心拍</p>
                <p>D:跳转到下一个心拍</p>
                <p>1/2/3/4:把当前心拍标注为N,V,S,Q</p>
                <p>/:将当前心拍类型设置为导航心拍</p>
                <p>,:需先让当前心拍为导航心拍(/),导航到上一个同类心拍</p>
                <p>.:需先让当前心拍为导航心拍(/),导航到下一个同类心拍</p>
                <p>Q:跳转到上一个心律异常</p>
                <p>E:跳转到下一个心律异常</p>
                <p>R:跳转到当前心律异常的结束标识位置</p>
                <p>Delete:删除/恢复当前事件</p>
                <p>U:选择/取消当前事件作为报告用图</p>
                <p>J:在当前小时内，跳转到上一个RR间期大于1500ms的心拍位置</p>
                <p>L:在当前小时内，跳转到下一个RR间期大于1500ms的心拍位置</p>
                <p>鼠标左键点击可快速定位相应位置的心拍</p>
                <p>点击+键后，进入添加节律状态，鼠标点击两次确定要添加的节律起点终点，最后点击上方的节律异常下拉列表，确定添加的节律类型</p>
                <p>使用快捷键进行心拍浏览和修正时，使用一个200ms宽，2mV高的50%透明度绿色方框作为当前心拍的指示标志，
                    在切换为同类心拍导航时，柱子颜色变为黄色，在心律导航时柱子会变成蓝色。</p>
                <p>
                    报告用图中时间长度统一为30秒，心拍事件图以心拍为中心取前15秒和后15秒；节律事件以事件起始点为中心前15秒和后15秒。
                </p>
                <p>Z:跳转到上一个手动事件</p>
                <p>X:跳转到下一个手动事件</p>
                <p>Alt:进入到添加心拍的状态，鼠标光标位置出现红竖线，
                    左键点击可自动识别当前位置附近的心电最高点，这时可按住Ctrl键不放，这时添加的心拍位置就是鼠标点击位置，不会自动寻找最高点。</p>
            </div>
        </el-dialog>
    </div>
</template>

<script>
    import {mapMutations, mapState} from 'vuex'
    import API from '../../api/api_ecg_view';
    import {bus} from '../../bus';
    import Util from '../../common/util';

    export default {
        name: 'BasicInfo',
        data() {
            return {
                dialogVisibleWindow: false,
                options: ['5mm/mV', '10mm/mV', '20mm/mV','40mm/mV','60mm/mV'],
                value: '10mm/mV',
                rhythmTypeOptions: ['NORMAL', 'BRD', 'TAC', 'ARR', 'VC', 'CV', 'BGM', 'TGM', 'VR', 'VF',
                    'VTAC', 'VBRD',  'SC', 'CS', 'SBGM', 'STGM', 'STAC', 'SBRD', 'SVR', 'AF', 'AFLUT','NOISE', 'CUSTOM'],
                dialogVisible: false,
                toSrc: '/doctor/ecgReport',
                form: {
                    timeValue: [],
                    frequency: '',
                    window: ''
                },
                defaultDate: [],
                defaultTime: []
            }
        },
        methods: {
            ...mapMutations('ecgView', [
                'changeGainSelected',
                'changeRhythmTypeSelected',
                'changeRefreshState',
                'changeRRShowState'
            ]),
            changeGain(data) {
                this.changeGainSelected(parseInt(data));
            },
            changeRhythmType(data) {
                this.changeRhythmTypeSelected(data);
            },
            changeSelectTime() {
                let startTime = this.form.timeValue[0].split(' ')[1];
                let endTime = this.form.timeValue[1].split(' ')[1];
                let secStart = 0;
                let secEnd = 0;
                startTime.split(":").map((item, index) => {
                    let per = item * Math.pow(60, 2 - index);
                    secStart += per;
                });
                endTime.split(':').map((item, index) => {
                    let per = item * Math.pow(60, 2 - index);
                    secEnd += per;
                });

                if (Math.abs(secEnd - secStart) >= 300) {
                    this.$message.error('所选时间片段大于5分钟，已为您重新规划时间！');
                    let endDate = new Date(this.form.timeValue[0]);
                    endDate.setMinutes(endDate.getMinutes() + 5);
                    this.form.timeValue[1] = Util.formatTimeM(endDate);
                }
            },
            reAnalystPart() {
                if (this.form.timeValue.length >= 2) {
                    this.$confirm('你确定要对该时间段重新AI分析吗？', '提示!', {
                        showCancelButton: false
                    }).then(() => {
                        API.reAnalystPart(this.report_id, {
                            fromTime: this.form.timeValue[0],
                            toTime: this.form.timeValue[1]
                        }).then(data => {
                            this.dialogVisibleWindow = false;
                            bus.$emit('reAnalystLoading', true);
                        });
                    });
                }
            },
            reanalysis() {
                this.changeRefreshState(true);
                API.reanalysisRule({
                    report_id: this.report_id
                }).then((data) => {
                    this.changeRefreshState(false);
                }).catch(() => {
                    this.changeRefreshState(false);
                });
            },
            returnPatientList() {
                let user = JSON.parse(localStorage.getItem('access-user'));
                if (user.userType === 0) {
                    this.$router.push('/doctor/patientList');
                }
                if (user.userType === 3) {
                    this.$router.push('/auditor/patientList');
                }
            },
            rhythmTypeLabel(value) {
                return Util.rhythmTranslateMap[value] || value
            }
        },
        mounted() {
            let user = JSON.parse(localStorage.getItem('access-user'));
            let userType = user.userType;
            let doctorId = user.id;
            let reportId = localStorage.getItem('report_id');
            let scopeRow = JSON.parse(localStorage.getItem('scope_row'));
            let recordState = scopeRow.record_state;
            let auditState = scopeRow.audit_state;
            let recordId = scopeRow.record_id;
            let isRecommit = scopeRow.isRecommit;
            this.toSrc += `?userType=${userType}&doctorId=${doctorId}&reportId=${reportId}&recordState=${recordState}&auditState=${auditState}&recordId=${recordId}&isRecommit=${isRecommit}`;
        },
        watch: {
            ecgStartTime: function () {
                this.form.timeValue[0] = this.ecgStartTime;
                this.defaultDate = [this.ecgStartTime.split(' ')[0]];
                this.defaultTime = [this.ecgStartTime.split(' ')[1]];
            }
        },
        computed: {
            ...mapState('ecgView', {
                basicInfo: state => state.basicInfo,
                refreshState: state => state.refreshState,
                ecgStartTime: state => state.ecgStartTime,
                rhythmTypeSelectDisabled:state=>state.rhythmTypeSelectDisabled
            }),
            RRShowState: {
                get: function () {
                    return this.$store.state.ecgView.RRShowState;
                },
                set: function () {
                }
            },
            rhythmTypeSelected: {
                get: function () {
                    return this.$store.state.ecgView.rhythmTypeSelected
                },
                set: function () {

                }
            },
            report_id: function () {
                return localStorage.getItem('report_id');
            }
        }
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
    .basic-info {
        display: flex;
        justify-content: space-between;
    }

    .select {
        margin-right: 10px;
    }

    .basic-info-left > span {
        margin-right: 10px;
    }

    .explain > p {
        margin-bottom: 5px;
    }

    .basic-name {
        display: inline-block;
        width: 80px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        vertical-align: bottom;
    }
</style>
