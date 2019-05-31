<template>
    <div class="AF-view-header">
        <div style="display: flex">
            <LateralDateSelector :dates="validDates"
                                 :datesIsContainData="datesIsContainData"
                                 :defaultActiveIndex="defaultActiveIndex"
                                 @change="dateItemClick"
            >
            </LateralDateSelector>
            <el-button @click="toggleHeatTime">
                {{showDiffChart ? '热力图' : '差异度'}}
            </el-button>
        </div>
    </div>
</template>

<script>
    import {mapState, mapMutations, mapActions} from 'vuex';
    import {FastData} from '../../common/ecg_get_fast_data';
    import Util from '../../common/util';
    import LateralDateSelector from '../../components/common/LateralDateSelector.vue';
    export default {
        name: 'AFViewHeader',
        components:{
            LateralDateSelector
        },
        data() {
            return {

            }
        },
        computed: {
            ...mapState('ecgView', {
                validDates: state => state.validDates,
                datesIsContainData: state => state.datesIsContainData,
                perDateData: state => state.perDateData,
            }),
            ...mapState('afView', {
                showDiffChart: state => state.showDiffChart,
                dateIndex: state => state.dateIndex
            }),
            defaultActiveIndex() {
                return Util.firstExistDataIndex(this.datesIsContainData);
            },
        },
        methods: {
            ...mapMutations('ecgView', [
                'changeCurrentDateTags',
                'changePerDayData',
                'changeTagState'
            ]),
            ...mapMutations('afView', [
                'changeDateIndex',
                'changeShowDiffChart',
                'changeTagsLoading'
            ]),
            toggleHeatTime() {
                this.changeShowDiffChart(!this.showDiffChart);
            },
            getCurrentDateTags(index = 0) {
//                if(this.perDateData[this.validDates[index]]===undefined){
//
//                }else {
//                    this.changeCurrentDateTags(this.perDateData[this.validDates[index]].data.map(e=>JSON.parse(e)));
//                }
                let report_id = localStorage.getItem('report_id');
                this.changeTagsLoading(true);
                setTimeout(
                    () => {
                        let fastData = new FastData(
                            report_id,
                            this.validDates[index],
                            () => {
                                let tags = fastData.getFastData();
                                let currentDateTags = tags.map(e => JSON.parse(e));
                                this.changeCurrentDateTags(currentDateTags);
                                this.changeTagsLoading(false);
                                if(this.perDateData[this.validDates[index]] === undefined) {
                                    this.changePerDayData({
                                        date: this.validDates[index],
                                        tagData: tags,
                                        tag: {},
                                        changed: true
                                    });
                                }
                            }
                        );
                        fastData.getAjaxFastData();
                    },
                    0
                );
            },
            dateItemClick(index) {
                this.changeDateIndex(index);
                this.getCurrentDateTags(index);
            }
        },
        created() {

        },
        mounted() {
            if (this.validDates.length !== 0) {
                this.getCurrentDateTags(this.dateIndex);
            }
        },
        beforeDestroy(){
            this.changeCurrentDateTags([]);
        }
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
    .date-list {
        display: flex;
        list-style: none;
        font-size: 14px;
        border: 1px solid #ccc;
        transition: margin-left .5s;
    }

    .date-list > div {
        width: 110px;
        height: 40px;
        line-height: 40px;
        text-align: center;
        background-color: #fff;
        border-right: 1px solid #ccc;
        flex-shrink: 0;
        cursor: pointer;
    }

    .data-list-box {
        width: 778px;
        overflow: hidden;
    }

    .AF-view-header .active {
        color: #1f32de;
    }
</style>
