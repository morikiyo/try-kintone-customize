console.log('my javascript loaded.');

(function() {
  "use strict";
  console.log('my anonymous function loaded.');

  let appId = null;
  let records = null;

  function outputCSV() {
    let rows = [];
    let recordIds = [];
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const row = [
        record.expenses_account.value,
        record.description.value,
        record.amount.value,
        record.tax.value,
        record.date.value,
        record.name.value,
        record.payment_due_date.value
      ];
      rows.push(row.join(','));
      recordIds.push(record['レコード番号'].value);
    }

    if (rows.length === 0) {
      alert('出力データがありません。')
      return;
    }

    const csvText = rows.join("\r\n");
    const blob    = new Blob([csvText], {'type': 'text/csv'});
    const url     = window.URL || window.webkitURL;
    const blobURL = url.createObjectURL(blob);

    let a = document.createElement('a');
    a.download = decodeURI('output.csv');
    a.href = blobURL;
    a.type = 'text/csv';

    a.click();

    let updateRecords = [];
    for (let i = 0; i < recordIds.length; i++) {
      const o = {
        'id': recordIds[i],
        'record': {
          'output_csv': {
            'value': ['済']
          }
        }
      }
      updateRecords.push(o);
    }

    let params = {
      app: appId,
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

    location.reload();
  }

  function displayOutputCSVButton() {
    // 増殖バグを防ぐ
    if (document.getElementById('my_index_button') !== null) {
        return;
    }

    // ボタン
    var myIndexButton = document.createElement('button');
    myIndexButton.id = 'my_index_button';
    myIndexButton.innerText = 'CSV出力';
    myIndexButton.onclick = function() {
      if (typeof Blob !== undefined) {
        if (window.confirm('CSVを出力します')) {
          outputCSV();
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
      appId = event.appId;
      records = event.records;
      displayOutputCSVButton();
    }
  });
})();
