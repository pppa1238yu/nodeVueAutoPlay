<template>
    <div class="agentBox">
        <AddNewHospitalDialog :searchPage="searchPage"/>
        <span class="searchText">医院名称:</span>
        <span class="expandBox">
            <el-input v-model="hospitalName" placeholder="请输入医院名称或标识" style="width: 300px; margin-left: 20px"
                      @input="changeInput" @focus="showFocus"
                      @blur="showBlur"
            ></el-input>
            <div class="el-treeBox" v-show="showExpand"
                 @mouseenter="enterTreeBoxState = true;"
                 @mouseleave="enterTreeBoxState = false;">
                <el-tree
                        :data="treeData"
                        node-key="id"
                        default-expand-all
                        v-loading="listLoading"
                        @node-click="handleNodeClick">
                    <span class="custom-tree-node" slot-scope="{ node, data }">
                         <span v-if="data.name.toString().indexOf(hospitalName) === -1">{{data.name}}</span>
                        <span v-else>
                            <div v-if="data.name">
                                <span>{{data.name.toString().substr(0, data.name.toString().indexOf(hospitalName))}}</span>
                                <span style="color: red">{{data.name.toString().substr(data.name.toString().indexOf(hospitalName), hospitalName.length)}}</span>
                                <span>{{data.name.toString().substr(data.name.toString().indexOf(hospitalName)+hospitalName.length)}}</span>
                            </div>
                        </span>
                    </span>
                </el-tree>
            </div>
        </span>
        <el-button plain @click="resetSearchData" style="margin-left: 10px">重置</el-button>
        <el-button type="success" @click="openAddNewDialog(false, null, null, 0)">+ 新建</el-button>
        <el-table
                :data="tableData"
                style="width: 100%;margin-bottom: 20px;"
                v-loading="pageLoading"
                @sort-change="sortPage"
                row-key="id">
            <el-table-column
                    prop="name"
                    label="医院名称">
            </el-table-column>
            <el-table-column
                    label="报告统计">
                <template slot-scope="scope">
                    共<span style="color: #5a5aff">{{scope.row.totalCount}}</span>份心电报告，
                    已完成<span style="color: #5aad5a">{{scope.row.finishedCount}}</span>，
                    还剩<span style="color: #ff5a5a">{{scope.row.totalCount - scope.row.finishedCount}}</span>份
                </template>
            </el-table-column>
            <el-table-column
                    prop="doctorCount"
                    sortable="custom"
                    label="医生人数">
            </el-table-column>
            <el-table-column
                    prop="reportTemplate"
                    label="报告模板">
                <template slot-scope="scope">
                    {{reportTemplate[scope.row.reportTemplate]}}
                </template>
            </el-table-column>
            <el-table-column
                    label="操作"
            >
                <template slot-scope="scope">
                    <el-button
                            type="text"
                            style="padding: 0 5px"
                            @click="addNewInstitutions(scope.row, 1)"
                            size="small">
                        新增
                    </el-button>
                    <span>|</span>
                    <el-button
                            type="text"
                            style="padding: 0 5px"
                            size="small"
                            @click="deleteInstitution(scope.row.id)"
                    >
                        删除
                    </el-button>
                    <span>|</span>
                    <el-button
                            type="text"
                            style="padding: 0 5px"
                            @click="addNewInstitutions(scope.row, 2)"
                            size="small">
                        系统配置
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
        <!--<el-pagination-->
        <!--background-->
        <!--@size-change="handleSizeChange"-->
        <!--@current-change="handleCurrentChange"-->
        <!--:current-page="page"-->
        <!--:page-sizes="[10, 20, 30, 40]"-->
        <!--:page-size="limit"-->
        <!--layout="total, sizes, prev, pager, next, jumper"-->
        <!--:total="total">-->
        <!--</el-pagination>-->
    </div>
</template>
<script>

    import AddNewHospitalDialog from './AddNewHospitalDialog';
    import {bus} from '../../bus';
    import PageManage from './PageManage';
    import API from '../../api/api_super_admin';

    export default {
        components: {
            AddNewHospitalDialog
        },
        mixins: [PageManage],
        data() {
            return {
                hospitalName: '',
                tableData: [],
                showExpand: true,
                listLoading: false,
                resetTree: false,
                pageLoading: false,
                enterTreeBoxState: false,
                hospitalId: '',
                treeData: [],
                timer: null,
                reportTemplate: {
                    'panzhihua': '体检模板',
                    'default': '长程模板'
                }
            }
        },
        mounted() {
            this.showExpand = false;
            this.getPageList();
        },
        methods: {
            openAddNewDialog(addState, id, name, toState) {
                bus.$emit('openAddNewHospitalDialog', {
                    state: addState,
                    id: id,
                    name: name,
                    toState: toState
                });
            },
            openEditDoctorDialog(val) {
                bus.$emit('openEditDoctorDialog', val);
            },
            resetSearchData() {
                this.hospitalName = "";
                this.hospitalId = '';
                this.showExpand = false;
                this.searchPage(true, true);
            },
            showFocus() {
                this.showExpand = true;
                if (this.treeData.length === 0) {
                    this.searchPage(true);
                }
            },
            showBlur() {
                if (!this.enterTreeBoxState) {
                    this.showExpand = false;
                }
            },
            getPageList() {
                this.pageLoading = true;
                API.viewAgencyList({
                    page: this.page,
                    search: this.hospitalName,
                    sort: 'DOCTOR_COUNT',
                }).then(data => {
                    this.pageLoading = false;
                    this.tableData = data.hospitalShowEntityList;
                    this.total = data.totalCount;
                }).catch(() => {
                    this.pageLoading = false;
                })
            },
            searchHospital() {
                if (this.hospitalId) {
                    this.page = 1;
                    this.pageLoading = true;
                    API.getHospitals({}, this.hospitalId).then(data => {
                        this.tableData = [data];
                        this.pageLoading = false;
                    }).catch(err => {
                        this.pageLoading = false;
                    });
                }
            },
            searchPage(changeList = false, both = false) {
                this.page = 1;
                this.listLoading = true;
                API.viewAgencyList({
                    page: this.page,
                    search: this.hospitalName,
                    sort: 'DOCTOR_COUNT',
                }).then(data => {
                    if (changeList) {
                        this.listLoading = false;
                        this.treeData = data.hospitalShowEntityList;
                        this.resetTree = false;
                        this.$nextTick(() => {
                            this.resetTree = true;
                        });
                    } else {
                        this.tableData = data.hospitalShowEntityList;
                    }
                    if (both) {
                        this.listLoading = false;
                        this.treeData = data.hospitalShowEntityList;
                        this.tableData = data.hospitalShowEntityList;
                    }
                    this.total = data.totalCount;
                });
            },
            sortPage(val) {
                const orderMap = {
                    "descending": 'DOWN',
                    "ascending": 'UP'
                };
                const sortType = {
                    "doctorCount": 'DOCTOR_COUNT',
                };
                this.page = 1;
                this.pageLoading = true;
                API.viewAgencyList({
                    page: this.page,
                    search: this.hospitalName,
                    sort: sortType[val.prop],
                    sort_state: orderMap[val.order]
                }).then(data => {
                    this.pageLoading = false;
                    this.tableData = data.hospitalShowEntityList;
                    this.total = data.totalCount;
                }).catch(err => {
                    this.pageLoading = false;
                });
            },
            handleNodeClick(val) {
                this.hospitalName = val.name;
                this.hospitalId = val.id;
                setTimeout(() => {
                    this.showExpand = false;
                    this.searchHospital();
                    this.searchPage(true);
                }, 100);
            },
            changeInput() {
                this.showExpand = true;
                this.hospitalId = '';
                clearTimeout(this.timer);
                this.timer = setTimeout(() => {
                    this.searchPage(true)
                }, 300);
            },
            handleSizeChange(val) {
                this.limit = val;
                this.searchPage(false, false);
            },
            handleCurrentChange(val) {
                this.page = val;
                this.searchPage(false, false);
            },
            deleteInstitution(val) {
                this.$confirm(`确认要删除所选医院？`, '', {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning',
                    callback: action => {
                        if (action === 'confirm') {
                            API.deleteAgency({}, val)
                                .then(_ => {
                                    this.searchPage(false, true);
                                    this.$message.success('删除成功!')
                                });
                        }
                    }
                });

            },
            addNewInstitutions(val, toState) {
                this.openAddNewDialog(true, val.id, val.name, toState);
            }
        }
    }
</script>
<style>
    /*.agentBox .el-dialog__body {*/
    /*padding: 9px 20px 30px 20px;*/
    /*}*/

    .agentBox .el-form-item {
        margin-bottom: 16px;
    }

    .el-treeBox .el-tree {
        border: 1px solid #ccc;
        min-width: 280px;
        max-height: 400px;
        overflow-y: scroll;
        border-radius: 3px;
    }
</style>
<style scoped>
    .agentBox {
        box-sizing: border-box;
        padding: 18px 40px;
    }

    .searchText {
        font-size: 14px;
    }

    .expandBox {
        position: relative;
    }

    .el-treeBox {
        position: absolute;
        z-index: 2099;
        top: 34px;
        left: 20px;
    }
</style>