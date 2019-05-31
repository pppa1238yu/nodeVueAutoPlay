// initial state
// shape: [{ id, quantity }]
import Util from '../../common/util';
const state = {
    dates:[],
    getEcgDatesLoading:false
};

// getters
const getters = {};

// actions
const actions = {};

// mutations
const mutations = {
    changeDates(state,dates){
        state.dates=dates;
    },
    changeGetEcgDatesLoading(state,data){
        state.getEcgDatesLoading=data;
    },
    resetEcgDayCardModule(state,data){
        Util.resetVuexState(state);
    }
};

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}
