console.log('my javascript loaded.');

(function() {
  "use strict";
  console.log('my anonymous function loaded.');

  class CSV {
    constructor(appId, records) {
      this.appId = appId;
      this.records = records;
    }

    output() {
      if (this.records.length === 0) {
        alert('出力データがありません。')
        return;
      }

      this._downloadFile();
      this._updateRecords();

      location.reload();
    }

    _downloadFile() {
      const str2array = function(str) {
        let array = [];
        for (let i = 0; i < str.length; i++) array.push(str.charCodeAt(i));
        return array;
      };

      const data = this._toCSVData();
      const csvbuf = data.map(function(e){return e.join(',')}).join('\r\n');
      const utf8Array = str2array(csvbuf);
      const sjisArray = Encoding.convert(utf8Array, 'SJIS', 'UNICODE');
      const uint8Array = new Uint8Array(sjisArray);
      const blob    = new Blob([uint8Array], { type: 'text/csv' });
      const url     = window.URL || window.webkitURL;
      const blobURL = url.createObjectURL(blob);

      let a = document.createElement('a');
      a.download = decodeURI(`output-${(new Date()).getTime()}.csv`);
      a.href = blobURL;
      a.type = 'text/csv';

      a.click();
    }

    _toCSVData() {
      let rows = [];
      for (let i = 0; i < this.records.length; i++) {
        rows.push(this._toCSVRecord(this.records[i]));
      }
      return rows;
    }

    _toCSVRecord(record) {
      return [
        record.expenses_account.value,
        record.description.value,
        record.amount.value,
        record.tax.value,
        record.date.value,
        record.name.value,
        record.payment_due_date.value
      ];
    }

    _updateRecords() {
      let updateRecords = [];
      for (let i = 0; i < this.records.length; i++) {
        const o = {
          'id': this.records[i]['レコード番号'].value,
          'record': {
            'output_csv': {
              'value': ['済']
            }
          }
        }
        updateRecords.push(o);
      }

      let params = {
        app: this.appId,
        records: updateRecords
      }

      kintone.api('/k/v1/records', 'PUT', params, function (resp){
        alert('レコード更新成功');
      }, function(rest) {
        var errmsg = 'レコード更新時にエラーが発生しました。';
        if (resp.message !== undefined) {
            errmsg += '\n' + resp.message;
        }
        alert(errmsg);
      });
    }
  }

  function displayOutputCSVButton(csv) {
    // 増殖バグを防ぐ
    if (document.getElementById('my_output_csv_button') !== null) {
        return;
    }

    // ボタン
    var myIndexButton = document.createElement('button');
    myIndexButton.id = 'my_output_csv_button';
    myIndexButton.innerText = 'CSV出力';
    myIndexButton.onclick = function() {
      if (typeof Blob !== undefined) {
        if (csv && window.confirm('CSVを出力します。')) {
          csv.output();
        }
      } else {
        window.alert('このブラウザには対応していません');
      }
    };

    // メニューの右側の空白部分にボタンを設置
    kintone.app.getHeaderMenuSpaceElement().appendChild(myIndexButton);
  }

  kintone.events.on('app.record.index.show', function(event) {
    if (event.viewId === 5299939) {
      const csv = new CSV(event.appId, event.records);
      displayOutputCSVButton(csv);
    }
  });
})();
