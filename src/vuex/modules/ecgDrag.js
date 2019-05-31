// initial state
// shape: [{ id, quantity }]
import Util from '../../common/util';
const state = {
    curMin: 0,
    clickDragState:false,
    heartRates:[]
};

// getters
const getters = {};

// actions
const actions = {};

// mutations
const mutations = {
    changeCurMin(state, curMin){
        state.curMin = curMin;
    },
    changeClickDragState(state,clickDragState){
        state.clickDragState=clickDragState;
    },
    changeHeartRates(state,data){
        state.heartRates=data;
    },
    resetEcgDragModule(state,data){
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
