<template>
    <div class="AF-view-header">
        <div style="display: flex">
            <el-button icon="el-icon-arrow-left" :disabled="datePageIndex===0"
                       @click="changeDatePage(false)"></el-button>
            <div class="data-list-box">
                <div class="date-list">
                    <div v-for="(date, index) in validDates" v-show="datesIsContainData[index]">
                        {{date}}
                    </div>
                </div>
            </div>
            <el-button icon="el-icon-arrow-right" :disabled="datePageIndex===datesPageNum"
                       @click="changeDatePage(true)"></el-button>
        </div>
    </div>
</template>

<script>
    import {mapState, mapMutations, mapActions} from 'vuex';
    import {FastData} from '../../common/ecg_get_fast_data';
    import {bus} from '../../bus';
    import Util from '../../common/util';

    export default {
        name: 'AFViewHeader',
        props: ['setCurrentDate', 'setLoading'],
        data() {
            return {
                datePageIndex: 0,//当前显示日期的页数,从0开始
                isHeatMapShow: true,
                fastData: null
            }
        },
        computed: {
            ...mapState('ecgView', {
                validDates: state => state.validDates,
                perDateData: state => state.perDateData,
                currentDate: state => state.currentDate,
                datesIsContainData: state => state.datesIsContainData
            }),
            datesPageNum: function () {
                let validLength = this.datesIsContainData.filter(v => v === true).length;
                if (validLength !== 0) {
                    return Math.floor((validLength - 1) / 7)
                } else {
                    return 0;
                }
            }
        },
        methods: {
            ...mapMutations('ecgView', [
                'changePerDayData',
                'changeCurrentDate'
            ]),
            ...mapActions('ecgView', [
                'changeVSTagData'
            ]),
            changeDatePage(next) {
                if (next) {
                    if (this.datePageIndex < this.datesPageNum) {
                        this.datePageIndex++;
                        let marginLeftNum = this.datePageIndex * 777;
                        $('.AF-view-header .date-list').animate({marginLeft: `-${marginLeftNum}px`});
                    }
                } else {
                    if (this.datePageIndex > 0) {
                        this.datePageIndex--;
                        let marginLeftNum = this.datePageIndex * 777;
                        $('.AF-view-header .date-list').animate({marginLeft: `-${marginLeftNum}px`});
                    }
                }
            },
            toggleHeatTime() {
                this.isHeatMapShow = !this.isHeatMapShow;
            },
            getCurrentDateTags(index = 0) {
                let report_id = localStorage.getItem('report_id');
                this.fastData = new FastData(
                    report_id,
                    this.validDates[index],
                    () => {
                        let currentDateTags = this.fastData.getFastData();
                        if (this.perDateData[this.validDates[index]] === undefined) {
                            this.changePerDayData({
                                date: this.validDates[index],
                                tagData: currentDateTags,
                                tag: {},
                                changed: true
                            });
                            this.changeVSTagData(this.validDates[index]);
                        }
                    }
                );
                this.fastData.getAjaxFastData();
            }
        },
        created() {

        },
        mounted() {
            let that = this;
            let firstValidIndex = Util.firstExistDataIndex(this.datesIsContainData);
            $(`.AF-view-header .date-list>div:eq(${firstValidIndex})`).addClass('active');
            if (this.validDates.length !== 0) {
                if (this.perDateData[this.currentDate] === undefined) this.getCurrentDateTags();
                $('.AF-view-header .date-list').on('click', 'div', function (event) {
                    $('.AF-view-header .date-list>div').removeClass('active');
                    that.setCurrentDate($(this).index());
                    $(this).addClass('active');
                    let index = Number($(this).index());
                    if (that.perDateData[that.validDates[index]] === undefined) {
                        that.getCurrentDateTags(index);
                    } else if (that.perDateData[that.validDates[index]].changed) {
                        that.setLoading();
                        setTimeout(() => {
                            that.changeVSTagData(that.validDates[index]);
                        }, 0);
                    }
                })
            }
        },
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
    .date-list {
        display: flex;
        list-style: none;
        font-size: 14px;
        border: 1px solid #ccc;
        margin-left: 0;
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
