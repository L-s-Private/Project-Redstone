# Project Redstone

TikTok LIVE のギフト・いいねで、Minecraft Java版 26.3（Fabric）に妨害を出す配信ツール。

- `app/` … PCアプリ（Electron＋Node）。TikTok を受けて、MOD に TCP（127.0.0.1:25599, 1行1JSON）で送る。操作画面は http://127.0.0.1:25600/
- `mod/` … Fabric MOD（Java 25）。26.x は難読化なし（Mojang の名前そのまま・マッピングなし）
- `docs/protocol.md` … アプリ ↔ MOD の約束ごと。型を足したら必ず更新する

## 進め方（ユーザーとの約束）

- やりとりは日本語。ユーザーは開発者ではない配信者なので、専門用語は避けてわかりやすく
- 機能を勝手に考えて足さない。配信でよくある形を調べるか、ユーザーに聞く
- 修正はまとめて1回のテストにする。テスト手順は「何を起動して／何を押して／マイクラでどうなればOKか」を表で、変わったところだけ
- 配る用の exe は GitHub Actions（`.github/workflows/ci.yml` の `exe` ジョブ）で作る。手元の開発では exe は作らない

## 手元での開発ループ（Windows）

```powershell
# MOD 入りのマイクラ（開発用）を起動。ワールドを作って入ると、MOD が 25599 で待ち受ける
cd mod; .\gradlew runClient

# 別のターミナルでアプリを起動（ソースのまま。exe は不要）
cd app; npm install; npm run app        # TikTok にもつなぐ
cd app; npm run app:mock                # TikTok なし。テスト送信だけ
```

- MOD を直したら、マイクラを閉じて `.\gradlew runClient` をやり直す
- アプリの画面（`app/src/ui/*.js`）やサーバー側を直したら、アプリを起動し直す
- ログ: マイクラ `mod/run/logs/latest.log`、アプリ `%APPDATA%\ProjectRedstone\app.log`（どちらも Claude が直接読んでよい）

## テスト

```powershell
cd app; npm test           # アプリ（node --test）
cd mod; .\gradlew test     # MOD の Minecraft に依存しない部分（FillGame, ActionRequest）
```

コミット前に両方通すこと。

## MOD を書くときの注意

- 26.x は版ごとに名前がよく変わる（例: エンティティ種別は `EntityTypes`、`EntityType.byString` はない、`ServerBossEvent` は UUID が必要）。書く前に実物で確かめる:
  ```powershell
  # .\gradlew compileJava のあと
  $jar = Get-ChildItem $env:USERPROFILE\.gradle\caches\fabric-loom -Recurse -Filter minecraft-merged.jar | Select-Object -First 1
  javap -cp $jar.FullName -p net.minecraft.world.entity.item.PrimedTnt
  ```
  （GitHub Actions の `mc-symbols` ワークフローでも同じことができる）
- ゲームの決まり（枠・数え方・爆発で消す範囲など）は `mod/.../game/FillGame.java` に Minecraft に依存しない形で書き、単体テストする
- MOD を変えたら `mod/gradle.properties` の `mod_version` を上げる（アプリが古い jar を自動で入れ替えるため。ファイル名で判定している）
- アプリを変えたら `app/package.json` の `version` を上げる
