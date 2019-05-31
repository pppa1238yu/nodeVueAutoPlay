<template>
    <div>
        <el-form :model="filters" :inline="true">
            <template v-for="(val, index) in queryItems">
                <el-form-item :label="val.label" v-if="val.type === 'input'">
                    <el-input v-model="filters[val.model.key]" @keyup.enter.native="handleEmit"></el-input>
                </el-form-item>
                <el-form-item :label="val.label" v-if="val.type === 'checkBox'">
                    <el-checkbox-group v-model="filters[val.model.key]" @change="handleEmit">
                        <el-checkbox
                                v-for="item in val.data"
                                :key="item.value"
                                :label="item.value"
                        >{{item.label}}
                        </el-checkbox>
                    </el-checkbox-group>
                </el-form-item>
                <el-form-item :label="val.label" v-if="val.type === 'tree'">
                    <expand-tree style="margin-right: 10px"
                                 :ref="'expandTree-'+val.model.key"
                                 :treeKey="val.model.key"
                                 :defaultValue="treeData[val.model.value]"
                                 :loading="treeData[val.model.key+'loading']"
                                 :treeData='treeData[val.model.key]'
                                 @focus="handleLoadData(val)"
                                 @selectValue="handleSelectItem"
                                 @clear="handleClearTree"
                    >
                    </expand-tree>
                </el-form-item>
                <el-form-item :label="val.label" v-if="val.type === 'select'">
                    <el-select v-model="filters[val.model.key]" ref="select" placeholder="请选择" clearable
                               @change="handleEmit" style="margin-right: 10px">
                        <el-option
                                v-for="item in val.data"
                                :key="item.value"
                                :label="item.label"
                                :value="item.value">
                        </el-option>
                    </el-select>
                </el-form-item>
                <el-form-item :label="val.label" v-if="val.type === 'date'">
                    <el-date-picker
                            v-model="filters[val.model.key]"
                            type="daterange"
                            :picker-options="reportTimePicker"
                            range-separator="至"
                            start-placeholder="开始日期"
                            end-placeholder="结束日期"
                            align="center"
                            format="yyyy/MM/dd"
                            value-format="yyyy/MM/dd"
                            @change="handleDateChange(val.model.key)"
                    >
                    </el-date-picker>
                </el-form-item>
                <el-form-item v-if="val.type === 'actions'">
                    <template v-for="(v, i) in val.actions">
                        <el-button :type="v.type" @click="handleSearch(v)" size="medium"> {{v.label}}</el-button>
                    </template>
                </el-form-item>
            </template>
        </el-form>
    </div>
</template>
<script type="text/ecmascript-6">
    import ExpandTree from '../components/common/ExpandTree.vue';
    import Util from '../common/util';
    export default {
        components: {
            ExpandTree
        },
        props: {
            queryItems: {
                type: Array,
                default: function () {
                    return []
                }
            }
        },
        data() {
            return {
                filters: {},
                treeData: {},
                initData: {},
                reportTimePicker: {
                    shortcuts: [
                        {
                            text: '今日',
                            onClick(picker) {
                                let now = new Date();
                                let end = new Date(now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate() + ' 23:59:00');
                                let start = new Date(now.getFullYear() + '/' + (now.getMonth() + 1) + '/' + now.getDate() + ' 00:00:00');
                                picker.$emit('pick', [start, end]);
                            }
                        },
                        {
                            text: '最近一周',
                            onClick(picker) {
                                picker.$emit('pick', Util.calcShortCuts(7));
                            }
                        }, {
                            text: '最近一个月',
                            onClick(picker) {
                                picker.$emit('pick', Util.calcShortCuts(30));
                            }
                        }, {
                            text: '最近三个月',
                            onClick(picker) {
                                picker.$emit('pick', Util.calcShortCuts(90));
                            }
                        }]
                }
            }
        },
        created () {
            this._renderFilters()
        },
        methods: {
            handleDateChange (key) {
                this.handleEmit()
            },
            // 将queryItems的model字段映射成filters的model
            _renderFilters () {
                this.queryItems.forEach((val) => {
                    if (val.model) {
                        this.$set(this.filters, val.model.key, val.model.value)
                        if (val.type === 'tree') {
                            this.$set(this.treeData, val.model.key, [])
                            this.$set(this.treeData, val.model.key + 'Loading', false)
                        }
                    }
                })
                this.initData = Object.assign({}, this.filters)
            },
            // 当是tree类型时 选择Item触发事件
            handleSelectItem (val, key) {
                this.filters[key] = val
                this.handleEmit()
            },
            // 加载可选数据： tree是一个方法
            handleLoadData (val) {
                if (typeof (val.data) === 'function') {
                    this.treeData[val.model.key + 'Loading'] = true
                    val.data().then((data) => {
                        this.treeData[val.model.key + 'Loading'] = false
                        this.treeData[val.model.key] = data
                    });
                }
            },
            // 清空树形选中的数据
            handleClearTree (key) {
                this.filters[key] = this.initData[key]
                this.handleEmit()
            },
            // 按钮的事件
            handleSearch (val) {
                if (val.key === 'search') {
                    this.handleEmit()
                } else if (val.key === 'reset') {
                    this._renderFilters()
                    this.queryItems.forEach((val) => {
                        if (val.type === 'tree') {
                            this.$refs['expandTree-' + val.model.key][0].reset()
                        }
                    })
                    this.handleEmit()
                } else {
                    this.$emit('handleBtnClick', val)
                }
            },
            // 将当前的数据传回父组件
            handleEmit () {
//                let result = {}
//                for (let key in this.filters) {
//                    if (this.filters[key] === null) {
//                        result[key] = this.initData[key]
//                    } else {
//                        result[key] = this.filters[key]
//                    }
//                }
                this.$emit('handleReturnData', this.filters)
            }
        }
    }
</script>
<style type="text/css" scoped lang="scss">

</style>
<!--//            queryItems: [  // 从外面传入的queryItems各种类型例子-->
<!--//                {-->
<!--//                    type: 'input',-->
<!--//                    model: {key: 'name', value: ''},-->
<!--//                    label: '医生账户名:'-->
<!--//                },-->
<!--//                {-->
<!--//                    type: 'tree',-->
<!--//                    model: {key: 'treeData', value: {}},-->
<!--//                    label: '所属医院',-->
<!--//                    data: () => {-->
<!--//                        return  new Promise((resolve, reject) => {-->
<!--//                            API.getInstitutions({-->
<!--//                                showReportCount: false-->
<!--//                            }).then(res => {-->
<!--//                                resolve(res);-->
<!--//                            })-->
<!--//                        });-->
<!--//                    }-->
<!--//                },-->
<!--//                {-->
<!--//                    type: 'select',-->
<!--//                    model: {key: 'statu', value: ''},-->
<!--//                    data: [{-->
<!--//                        value: false,-->
<!--//                        label: '正常'-->
<!--//                    }, {-->
<!--//                        value: true,-->
<!--//                        label: '禁用'-->
<!--//                    }],-->
<!--//                    label:  '状态'-->
<!--//                },-->
<!--//                {-->
<!--//                    type: 'date',-->
<!--//                    model: {key: 'date', value: []},-->
<!--//                },-->
<!--//                {-->
<!--//                    type: 'actions',-->
<!--//                    actions: [-->
<!--//                        {label: '查询', type: 'primary', key:'search'},-->
<!--//                        {label: '重置', key:'reset'},-->
<!--//                        {label: '新建', type: 'success', key:'add'}-->
<!--//                    ]-->
<!--//                }-->
<!--//            ],-->