# Friends English Trainer

GitHub Pagesでそのまま公開できる静的サイトです。

## 公開方法

リポジトリ直下にこのフォルダの内容を置き、GitHubの **Settings → Pages** で公開元ブランチを選択します。

`file://` で `index.html` を直接開くとブラウザの制限でJSONを取得できません。ローカル確認時は、このフォルダで次のようにサーバーを起動してください。

```bash
python3 -m http.server 8000
```

その後、`http://localhost:8000/` を開きます。

## Season 5以降の追加

1. `data/season5.json` を既存JSONと同じ構造で作成します。
2. `js/app.js` 冒頭の `DATA_FILES` に `"data/season5.json"` を追加します。
3. フレーズID・ダイアログIDは既存IDと重複しない値を使います。

件数、シーズン範囲、シーズンタブは読み込んだデータから自動生成されます。既存のlocalStorageキーは以下のままです。

- `friendsBookmarks_phrase`
- `friendsBookmarks_dialogue`
- `friendsWeakStats`
