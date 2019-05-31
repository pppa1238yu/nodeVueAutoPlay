<template>
    <div>
        <BasicInfo/>
        <div class="right-content">
            <div class="ecg-dayCards-box">
                <EcgDayCards/>
            </div>
            <div>
                <div class="ecg-rates-box">
                    <DragEcg/>
                </div>
                <div class="rr-scatter-box">
                    <RRIntervalScatter2/>
                </div>
                <div>
                    <EcgViewChart/>
                </div>
            </div>
        </div>
    </div>
</template>
<script>
    import {mapState, mapMutations, mapActions} from 'vuex'
    import BasicInfo from './BasicInfo.vue';
    import EcgDayCards from './EcgDayCards.vue';
    import DragEcg from '../dragEcg/DragEcg.vue';
    import EcgViewChart from './EcgViewChart.vue';
    import RRIntervalScatter2 from './RRIntervalScatter2.vue';

    export default {
        name: 'EcgViewContent',
        components: {
            BasicInfo,
            EcgDayCards,
            DragEcg,
            EcgViewChart,
            RRIntervalScatter2
        },
        data() {
            return {

            }
        },
        mounted() {

        },
        computed:{

        }
    }
</script>
<style scoped lang="scss">
    .right-content {
        display: flex;
    }

    .ecg-dayCards-box {
        width: 220px;
        height: 760px;
        overflow-y: auto;
    }

    .ecg-rates-box,.rr-scatter-box{
        margin-left: 50px;
    }
</style>