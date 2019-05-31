
var int53 = require('int53')
require('buffer')

var ABNORMAL_TYPE = [
    'N', 'S', 'V', 'Q', 'F', 'O'   //O 代表 noise
];

var FastData = function (reportId, viewDate, loadedCallback) {
    this.reportId = reportId;
    this.viewDate = viewDate || '';
    this.fastData = [];
    this.loadedCallback = loadedCallback;
};

FastData.prototype.getAjaxFastData = function(start = 0, end = -1) {
    var that = this;
    var oReq = new XMLHttpRequest();
    oReq.open("GET", "/ecg/fast_beat_list?report_id=" + this.reportId + '&date=' + this.viewDate + '&start=' + start + '&end=' + end, true);
    oReq.responseType = "arraybuffer";
    oReq.onload = function (oEvent) {
        let arrayBuffer = oReq.response; // Note: not oReq.responseText
        if (arrayBuffer) {
            let byteArray = new Uint8Array(arrayBuffer);
            that.fastData = new Array(byteArray.byteLength/11);
            for (let i = 0, t= 0; i < byteArray.byteLength ; i+=11, t++) { //按照 11 位循环，前 8 位为position，第9位为type，第10位为是否选中，第11位为原始类型
                that.fastData[t] = that._bytesToLong(byteArray, i);
            }
        }
        that.loadedCallback();
    };
    oReq.send(null);
};

FastData.prototype._bytesToLong = function (array, position) {
    if (array.length === 0) return 0;

    let p = int53.readInt64BE(Buffer.from(array.buffer, position, 8));

    return JSON.stringify({
        p: p,
        t: ABNORMAL_TYPE[array[position + 8] & 0xff],
        d: array[position + 9] & 0xff
    });
};

FastData.prototype.getFastData = function () {
    return this.fastData;
};

export {FastData};