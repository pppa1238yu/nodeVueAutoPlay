<template>
    <div class="systemMessageBox">
        <el-dialog
                :visible.sync="systemDialogVisible"
                :before-close="handleClose"
                width="460px"
        >
            <el-form
                    ref="agentForm"
                    :model="messageForm"
                    label-width="80p"
                    :rules="rules"
                    v-if="hackResetForm"
            >
                <el-form-item label="通知名称:" prop="messageName">
                    <el-input v-model="messageForm.messageName" style="width: 338px"></el-input>
                </el-form-item>
                <el-form-item label="通知内容:" prop="message">
                    <el-input type="textarea"
                              :autosize="{ minRows: 12, maxRows: 18}" v-model="messageForm.message"
                              style="width: 338px"></el-input>
                </el-form-item>
            </el-form>
            <div style="width: 200px; margin: 20px auto; display: flex;justify-content: space-around">
                <el-button type="primary" @click="emitNotification">发布</el-button>
                <el-button @click="handleClose">取消</el-button>
            </div>
        </el-dialog>
        <span class="searchText">通知名称:</span>
        <el-input v-model="message" placeholder="请输入如版本通知，停服通知" style="width: 300px; margin-left: 20px"  @keyup.enter.native="searchPageData"></el-input>
        <el-button type="primary" style="margin-left: 10px" @click="searchPageData">查询</el-button>
        <el-button type="success" @click="handleOpen">+ 发布</el-button>
        <el-table
                :data="messageData"
                style="width: 100%;margin-bottom: 20px;"
        >
            <el-table-column
                    prop="title"
                    label="通知名称">
            </el-table-column>
            <el-table-column
                    prop="content"
                    label="通知内容">
            </el-table-column>
            <el-table-column
                    prop="createTime"
                    label="发布时间">
            </el-table-column>
            <el-table-column
                    label="操作">
                <template slot-scope="scope">
                    <el-button
                            type="text"
                            style="padding: 0 5px"
                            size="small"
                            @click="deleteNotification(scope.row)"
                    >
                        删除
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
        <el-pagination
                background
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange"
                :current-page="page"
                :page-sizes="[10, 20, 30, 40]"
                :page-size="limit"
                layout="total, sizes, prev, pager, next, jumper"
                :total="total">
        </el-pagination>
    </div>
</template>
<script>
    import PageManage from '../superAdmin/PageManage';
    import API from '../../api/api_super_admin';

    export default {
        mixins: [PageManage],
        data() {
            return {
                message: '',
                systemDialogVisible: false,
                messageForm: {},
                messageData: [],
                sortState: 'DOWN',
                hackResetForm: true,
                rules: {
                    messageName: [
                        { required: true, message: '请输入通知名称', trigger: 'blur'},
                        { min: 3, max: 16, message: '长度在 3 到 16 个字符', trigger: 'blur' }
                    ],
                    message: [
                        { required: true, message: '请输入通知内容', trigger: 'blur'}
                    ]
                }
            }
        },
        mounted() {
            this.getPageData();
        },
        methods: {
            handleOpen() {
                this.systemDialogVisible = true;
            },
            handleClose() {
                this.messageForm = {};
                this.systemDialogVisible = false;
                this.hackResetForm = false;
                this.$nextTick(() => {
                    this.hackResetForm = true;
                });
            },
            getPageData() {
                API.getNotifications({
                    limit: this.limit,
                    skip: this.limit * (this.page - 1)
                }).then(data => {
                    this.messageData = data.list;
                    this.total = data.total;
                });
            },
            emitNotification() {
                this.$refs['agentForm'].validate((valid) => {
                   if (valid) {
                       API.emitNotification({
                           title: this.messageForm.messageName,
                           content: this.messageForm.message,
                       }).then(data => {
                           this.$message({
                               type: 'success',
                               message: '发布成功'
                           });
                           this.handleClose();
                           this.getPageData();
                       });
                   }
                });
            },
            deleteNotification(val) {
                API.deleteNotification({
                    id: val.id
                }).then( _ => {
                    this.$message({
                        type: 'success',
                        message: '删除成功'
                    });
                    this.getPageData();
                });
            },
            searchPageData() {
                API.getNotifications({
                    limit: this.limit,
                    text: this.message,
                    skip: 0
                }).then(data => {
                    this.messageData = data.list;
                    this.total = data.total;
                });
            },
            handleSizeChange(val) {
                this.limit = val;
                this.getPageData();
            },
            handleCurrentChange(val) {
                this.page = val;
                this.getPageData();
            },
        }
    }
</script>
<style>
    .systemMessageBox .el-dialog__body {
        padding: 9px 20px 30px 20px;
    }
</style>
<style scoped>
    .systemMessageBox {
        box-sizing: border-box;
        padding: 18px 40px;
    }

    .searchText {
        font-size: 14px;
    }
</style>