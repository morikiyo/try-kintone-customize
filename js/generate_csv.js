console.log('my javascript loaded.');

(function() {
  "use strict";
  console.log('my anonymous function loaded.');

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
      window.confirm('CSVを出力します');
    };

    // メニューの右側の空白部分にボタンを設置
    kintone.app.getHeaderMenuSpaceElement().appendChild(myIndexButton);
  }

  kintone.events.on('app.record.index.show', function(event) {
    if (event.viewId === 5299939) {
      displayOutputCSVButton();
    }
  });
})();
