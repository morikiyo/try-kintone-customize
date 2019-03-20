console.log('my javascript loaded.');

(function() {
  "use strict";
  console.log('my anonymous function loaded.');

  class CSV {
    constructor(records, newline = '\r\n') {
      this._srcRecords = records;
      this.newline = newline;
      this._ready = false;
      this._costAccountCodeMap = {
        '6212': '外注費',
        '6113': '広告宣伝費',
        '5214': 'ｺﾐｯｼｮﾝ料',
        '6331': 'SaaS代',
        '6332': '仕入外注費'
      };
    }

    getRows() {
      if (!this._ready) this._convert();
      return this._rows;
    }

    getRecords() {
      if (!this._ready) this._convert();
      return this._records;
    }

    toString() {
      const rows = this.getRows();
      if (rows.length === 0) {
        return '';
      }

      return rows.map(function(e){return e.join(',')}).join(this.newline);
    }

    _convert() {
      this._rows = [];
      this._records = [];
      this._userNameMap = null;
      for (let i = 0; i < this._srcRecords.length; i++) {
        const record = this._srcRecords[i];
        const row = this._convertRecord(record);
        if (row !== null) {
          this._rows.push(row);
          this._records.push(record);
        }
      }
      this._ready = true;
    }

    _convertRecord(record) {
      const expensesAccount = record.expenses_account.value;
      const payerName = record.name.value;
      if (!expensesAccount || !payerName) {
        return null;
      }

      if (this._userNameMap === null) {
        this._makeUserNameMap(record.user_json.value);
      }

      let row = Array(29).fill('');
      // 1 処理区分
      row[0] = '1';
      // 2 データID
      // 3 伝票日付
      row[2] = record.date.value;
      // 4 伝票番号
      // 5 入力日付
      // ---- 借方 ----
      // 6 科目
      row[5] = this._toAccountCode(expensesAccount);
      // 7 補助コード
      // 科目 = 6212:外注費 の場合は '13' [NOTICE] 現状、外注費は選択できない
      // 8 部門コード
      // 9 取引先コード
      // 10 取引先名
      // 11 税種別
      row[10] = this._toTaxType(row[5]);
      // 12 事業区分
      row[11] = '1';
      // 13 税率
      row[12] = this._toTaxRate(record.tax.value);
      // 14 内外別記
      if (row[12] !== '0') row[13] = '1'; // 1:内税
      // 15 金額
      row[14] = record.amount.value;
      // 16 税額
      // 17 摘要
      row[16] = record.description.value;
      // ---- 貸方 ----
      // 18 貸方科目
      row[17] = this._toCreditAccountCode(payerName);
      // 19 補助コード
      row[18] = this._toPayerCode(payerName, );
      // 20 部門コード
      // 21 取引先コード
      // 22 取引先名
      // 23 税種別
      row[22] = row[10];
      // 24 事業区分
      row[23] = '1';
      // 25 税率
      row[24] = row[12];
      // 26 内外別記
      row[25] = row[13];
      // 27 金額
      row[26] = row[14];
      // 28 税額
      // 29 摘要
      row[28] = row[16];

      return row;
    }

    _toAccountCode(value) {
      return value.split(':')[1];
    }

    _toTaxType(accountCode) {
      return (accountCode in this._costAccountCodeMap) ? '50' : '60';
    }

    _toTaxRate(value) {
      return (value === '対象外') ? '0' : '8';
    }

    _toCreditAccountCode(payerName) {
      return (payerName === '小口現金') ? '1118' : '2114';
    }

    _toPayerCode(payerName) {
      return (payerName in this._userNameMap) ? this._userNameMap[payerName] : '';
    }

    _makeUserNameMap(value) {
      const json = value.replace(/\"/g, '').replace(/([^,:\n]+):(\d+)/g, "\"$1\":\"$2\"");
      this._userNameMap = JSON.parse(json);
    }
  }

  class CSVGenerator {
    constructor(appId, records) {
      this.appId = appId;
      this.csv = new CSV(records);
    }

    generate() {
      if (this.csv.getRows().length === 0) {
        alert('出力データがありません。')
        return;
      }

      this._downloadFile();
      this._updateOutputCSV();

      location.reload();
    }

    _downloadFile() {
      const str2array = function(str) {
        let array = [];
        for (let i = 0; i < str.length; i++) array.push(str.charCodeAt(i));
        return array;
      };

      console.info('CSVを出力します。')
      console.table(this.csv.getRows());

      const csvbuf = this.csv.toString();
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

    _updateOutputCSV() {
      const csvRecords = this.csv.getRecords();
      let updateRecords = [];
      for (let i = 0; i < csvRecords.length; i++) {
        const o = {
          'id': csvRecords[i]['レコード番号'].value,
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

  function displayOutputCSVButton(csvGenerator) {
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
        if (csvGenerator && window.confirm('CSVを出力します。')) {
          csvGenerator.generate();
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
      const csvGenerator = new CSVGenerator(event.appId, event.records);
      displayOutputCSVButton(csvGenerator);
    }
  });
})();
