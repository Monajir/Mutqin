# SQLite source archive for Android builds

This is the unmodified SQLite **3.45.3** amalgamation required by our locked
`expo-sqlite` **14.0.6** dependency. It is build input, not the application's
Quran database. The source includes SQLite's public-domain notice.

- Official source: https://www.sqlite.org/2024/sqlite-amalgamation-3450300.zip
- Downloaded over HTTPS: 24 October 2026
- Size: 2,733,959 bytes
- Locally recorded SHA-256: `ea170e73e447703e8359308ca2e4366a3ae0c4304a8665896f068c736781c651`

The 23 October EAS build failed at `:expo-sqlite:downloadSQLite` with
`java.net.SocketException: Network is unreachable`. The build had reached the
native SQLite download; no asset error was reported.

`scripts/prepare-sqlite-build.cjs` verifies this checksum and the installed
SQLite version, then seeds `node_modules/expo-sqlite/android/build/downloads`.
It also honors an absolute `REACT_NATIVE_DOWNLOADS_DIR` override. The upstream
Gradle download task has `overwrite(false)`, which skips downloading an
existing file, even with `onlyIfNewer(true)`. No dependency patch is needed.

The `eas-build-post-install` hook runs after installation/prebuild and before
Gradle on Android, so fresh EAS builds receive this file without contacting
sqlite.org. It skips iOS. For a local build after cleaning native dependency
build directories, run `npm run eas-build-post-install` before Gradle.

References:
- https://docs.expo.dev/build-reference/npm-hooks/
- https://docs.expo.dev/build-reference/android-builds/
- https://github.com/michel-kraemer/gradle-download-task/blob/5.5.0/src/main/java/de/undercouch/gradle/tasks/download/DownloadAction.java

When upgrading expo-sqlite, re-check its Gradle download version and layout.
Update or remove this hook and archive as appropriate. This workaround removes
the SQLite website dependency only; other build dependencies still need network.
