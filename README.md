# Sitcom English in Action v3.0

GitHub Pagesで動作する、海外ドラマ英語の静的学習アプリです。

## 収録データ

- Friends Season 1–8
- 947 phrases
- 149 dialogues

## 起動方法

`index.html`をGitHub Pages、またはローカルHTTPサーバーから開いてください。

## 既存バージョンとの互換性

既存のフレーズ／ダイアログIDと以下の保存キーを維持しています。

- `friendsBookmarks_phrase`
- `friendsBookmarks_dialogue`
- `friendsWeakStats`

同じ公開URLへv3.0を配置すると、既存のBookmarksとWeak履歴を引き継ぎます。

## v3.0 Phase 1–2

Phrase Detailから「覚えた」状態を切り替えられます。学習状態はPhrase ID単位で、以下の新しいキーへseries別に保存されます。

- `sitcomEnglish_learnedPhrases`

PhrasesとQuizでは「未習得」を含む5種類の学習フィルターを利用できます。Quizの問題は開始時に最大10問へ確定され、既存のResume仕様を維持します。
