console.log('customer_list_custom loaded.');

(function() {
  "use strict";
  console.log('my anonymous function loaded.');

  kintone.events.on('app.record.index.show', function(event) {
    const questionnaireAnswerChecker = new QuestionnaireAnswerChecker(event.appId);

    if (questionnaireAnswerChecker.existsButton()) {
      return;
    }

    kintone.app.getHeaderMenuSpaceElement().appendChild(questionnaireAnswerChecker.button);
  });

  class QuestionnaireAnswerChecker {
    constructor(appId) {
      this.buttonId = 'my_questionnaire_check_button';
      this.appId = appId;
      this.title = 'アンケート回答確認'
      this.button = this.__createButton();
    }
    existsButton() {
      return (document.getElementById(this.buttonId) !== null);
    }
    __createButton() {
      let element = document.createElement('button');
      element.id = this.buttonId;
      element.classList.add('kintoneplugin-button-normal');
      element.innerText = this.title;
      element.checker = this;
      element.onclick = () => {
        kintoneUtility.rest.getRecords({
          app: this.appId,
          query: 'questionnaire_status not in ("回答済") and questionnaire.$id not in ("")',
          fields: ['$id'],
          totalCount: true
        }).then((response) => {
          if (response.totalCount > 0) {
            this.updateRecords(response.records);
          } else {
            this.alert('更新対象のレコードはありません。');
          }
        }).catch((error) => {
          this.handleError(error, '検索処理でエラーが発生しました。');
        });
      };
      return element;
    }
    updateRecords(records) {
      swal({
        title: this.title,
        text: `回答済に更新されていないレコードが ${records.length} 件あります。\n更新してよろしいですか？`,
        icon: 'warning',
        buttons: {
          cancel: true,
          confirm: { closeModal: false }
        }
      }).then((isConfirm) => {
        if (!isConfirm) return;

        const newRecords = records.map((record) => {
          return {
            id: record['$id'].value,
            record: { 'questionnaire_status': { value: '回答済' } }
          };
        });

        kintoneUtility.rest.putAllRecords({
          app: this.appId,
          records: newRecords
        }).then((response) => {
          swal({
            title: this.title,
            text: `${newRecords.length} 件のレコードを更新しました。`,
            icon: 'success'
          }).then(() => {
            location.reload();
          });
        }).catch((error) => {
          this.handleError(error, 'レコード更新エラーが発生しました。')
        });
      });
    }
    alert(message) {
      sweetAlert(this.title, message);
    }
    handleError(error, message) {
      console.log(error);
      sweetAlert(this.title, message, 'error');
    }
  };
})();
