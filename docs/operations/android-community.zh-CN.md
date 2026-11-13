# Android 简体中文个人社区版维护

维护状态以 [maintenance.json](../../community/android/maintenance.json) 为准。此分支尚未公开发布。保留上游 MIT 许可证、版权与第三方声明，没有导入外部社区译文。

## 已验证的基线

选定个人使用源码快照 `9ef52de2930782e413ca9d2b5fef7500496d7123`，没有对应 tag。未修改的源码已在 Windows 的相邻短路径工作树 `../cn` 构建成功：`APP_VARIANT=preview`、x86_64、`versionName=2.3.0`、`versionCode=1`、包名 `com.t3tools.t3code.preview`。退出码 0，最终增量构建耗时 3 分 18 秒。基线 APK SHA-256 为 `db53fe5d234753d12aecc86f3e5814ac0359aca48c2393c3648470c75ffb49f9`。它使用上游测试证书，只用于构建证据，不应覆盖安装官方应用。

2026-11-11 核验的 Android 渠道为 `android-beta-784`，`2.3.0 / 784`，属于 Google Play closed testing 的 GitHub prerelease 镜像。镜像 tag 指向 `6c9adfb2739205244b84e607736f6fd8b4611e69`，但上游镜像脚本在发布镜像时才打 tag，没有记录 APK 的构建 SHA，因此不能据此证明 APK 对应源码，更不能宣称是 Play 正式版。桌面端 Latest、main 与 Android 发布记录分别处理。

## 当前汉化范围

第五版修复了第四版构建遗漏上游公开连接配置的问题：此前确实隐藏了 T3 账户/登录、通知、添加环境中的 T3 Connect 入口，并非这些功能仅仅“未验证”。修复沿用上游 `.env.example` 明确允许源码构建使用的公开标识，不复制服务端私钥或绕过认证；构建前和 APK 打包后均校验配置。已在模拟器打开账号登录及通知页面。完整核对见 `community/android/feature-parity.json` 和维护状态的 `verification.featureParityFixV5`。真实账号认证、云中继、推送和域名验证仍有独立条件，不能用入口恢复或编译通过代替服务验收。

应用已有独立语言资源与稳定 key，支持“跟随系统 / English / 简体中文”。选择沿用现有 SQLite preferences 保存；中文缺失或源文/上下文过期时，生成器省略对应中文，运行时回退英文。系统语言按偏好顺序选择；繁体中文不冒充简体中文，没有支持的语言时使用英文。应用入口的 Locale provider 使用 Expo SDK 对应的 `expo-localization`，不拦截所有 Text，也不改协议、聊天内容或模型回复。

当前源码资源目录包含 4125 条界面文案，已扩展到会话与输入框、设置子页面、项目与文件、Git 与拉取请求、审批与提问、语音、用量、原生 Markdown 操作和 Android 通知显示。术语表在 `community/android/glossary.json`。品牌、模型名称、路径、命令、协议字段、用户内容、模型回复和原始诊断保留原文。代理编写的译文仍为未由维护者确认的草稿，不能标为 `humanReviewed=true`。

当前验收记录见 [acceptance-v13.json](../../community/android/acceptance-v13.json)，静态候选分类及检查范围见 [localization-audit.json](../../community/android/localization-audit.json)。这两个文件分别记录实际执行与静态检查，尚未宣称整体验收完成。

资源源文件是 `community/android/locales/en.json`、`zh-CN.json` 和 `translation-state.json`；应用导入 `apps/mobile/src/i18n/messages.generated.json`。修改资源后执行：

```sh
node scripts/android-community/generate-runtime.mjs --write
node scripts/android-community/generate-runtime.mjs --check
node scripts/android-community/translate.mjs --check
node scripts/android-community/translate.mjs --dry-run
node scripts/android-community/scan.mjs > android-ui-inventory.json
```

扫描器输出待核对清单，`complete=false`；它不能可靠发现所有动态、原生和第三方界面文本，不能以清单数量认定汉化率。占位符、链接、换行、格式标记、重复 key 和缺失资源由校验器检查。暂不支持的 ICU 复数表达式会被拒绝，不能静默改坏复数。需要复数文案时先明确资源格式并扩展校验，再接入界面。

社区 APK 构建须保留下方命令中的 `native-build.init.gradle`：当前 React Native 的 Gradle 打包输入默认只含 JS/TS，不含 JSON。社区脚本将生成的语言 JSON 及 `client-runtime`、`contracts`、`shared` 源码目录显式登记为输入，使仅修改译文或共享代码也会重新打包，避免构建显示成功但 APK 仍含旧文案。只比较源码目录一致不足以验收，还需检查安装包中的实际显示。

## 中文文案约定

面向中国大陆用户，以国内软件常用表达为准。完整规则和示例保存在 [translation-style.json](../../community/android/translation-style.json)，翻译脚本读取同一份规范与术语表。按钮表达动作，标题和菜单使用短词，空状态先说明现状，错误提示先说明问题再给出下一步；不照搬英文语序，不擅自增删条件或推断错误原因。个人筛选统一用“我”，例如“待我评审”“我创建的”。

同一个英文词按语境区分：Open file 的动作译为“打开”，拉取请求的 Open 状态译为“开启中”，与“已关闭 / 已合并 / 全部状态”组成一组。状态可能包含草稿，不能缩窄为“待合并”。“评审通过”与 CI“检查已通过”、工具权限“审批”分别表达，不能混用。

保留“会话、工作区、工作树、提供方、环境、拉取请求、评审、审批”等术语，不能把环境一律改为电脑，也不能将 Open 改成含义不同的“待合并”。审批文案必须准确保留“仅本次”和“本次会话”的授权范围。占位符、命令、产品名、用户内容及英文资源保持原样。

译文修改后更新生成资源，运行资源校验并核对实际页面。代理润色不等于维护者确认，不自动设置 `humanReviewed=true`。中英文对照表由当前资源生成，旧版产物中的对照表是当时的快照。

本地查看当前翻译、英文和界面语境：

```sh
node scripts/android-community/export-review.mjs .t3/translation-review
```

输出 Markdown 和可用 Excel 打开的 UTF-8 CSV；CSV 的“建议中文”列供审校记录，脚本不会自动回写。修改中文后运行上方资源生成和校验命令。上下文变化也参与原文指纹；已确认译文会进入待审状态，本轮由代理核对的上下文与译文仍保留待维护者确认标记。

规范变化会隔离翻译请求缓存和维护分支名称，避免旧风格的缓存被当作新结果。已有有效译文继续复用，不会只因规范变化自动调用模型或覆盖人工译文。工作流会一并上传翻译对照；带翻译凭据执行前仍需审核规范、术语表、维护脚本和工作流。

## 本地开发与构建

社区构建必须包含 T3 Connect 公开客户端配置，否则上游会隐藏账户登录、通知设置及“添加环境”的 T3 Connect 区域。先在仓库根目录执行 `node scripts/android-community/configure-connect.mjs`：仅在 `.env` 不存在时，从上游明确允许源码构建使用的 `.env.example` 复制四项公开标识；不复制服务端密钥，不覆盖已有配置。既有 `.env.local` 和进程环境变量仍按上游优先级覆盖。若已有 `.env` 刻意关闭云功能，脚本保留它，但社区构建的连接配置检查会失败，需自行检查该配置。

在 `apps/mobile` 执行 `vp exec expo config --type public --json` 将结果保存到本地文件，再用 `node ../../scripts/android-community/configure-connect.mjs --check-expo-config <文件>` 检查。GitHub 构建会自动执行准备、配置检查及 APK 内 `assets/app.config` 检查，缺项即失败。可以用同名 Actions Variables `T3CODE_CLERK_PUBLISHABLE_KEY`、`T3CODE_CLERK_JWT_TEMPLATE`、`T3CODE_RELAY_URL` 覆盖公开默认值；更换实例时三项应成套配置。公开配置存在仅证明入口有条件显示，不能代替实际鉴权。

完整功能核对清单保存在 `community/android/feature-parity.json`，包括88个与选定上游源码相同的原生栈页面注册、业务源码差异、已发现缺陷和外部依赖。它区分“源码入口保留”和“运行验收通过”，不是全功能测试通过证明。自定义包具体第三方 SSO 的 Clerk 回调授权、Firebase 与发送端匹配，以及官方域名的 verified links 绑定，需要服务管理员配合；当前没有修改认证逻辑或冒用官方包名来绕过这些条件。

按仓库锁文件使用 Node 26.12.1、Vite+ 1.4.0、pnpm 12.14.0、JDK 17、Expo 58.0.23、React Native 0.88.1。优先用 `vp`，不要用系统另一版 pnpm 重建锁文件。正常开发使用项目现有 `vp run dev` 和 `apps/mobile` 的开发脚本；服务状态只能放在工作树 `.t3`，不能启动服务指向正在使用的 `~/.t3/userdata`。

Linux/GitHub Actions 是推荐的可重现构建环境；Windows 已跑通，但需要额外处理长路径。在短的实际目录中构建，不能用 subst：React Native Codegen 的 native realpath 会把盘符还原，造成不同根目录错误。当前 Windows 使用真实 `../cn`，冻结安装指定 `PNPM_CONFIG_VIRTUAL_STORE_DIR=build/p`、`PNPM_CONFIG_VIRTUAL_STORE_DIR_MAX_LENGTH=32`，而非改锁文件或删除已有数据。

本机已开启 `HKLM\SYSTEM\CurrentControlSet\Control\FileSystem\LongPathsEnabled=1`，原值不存在，恢复记录在原工作树 `.t3/android-long-paths-original.json`；没有重启电脑。SDK CMake 3.22.1 自带 Ninja 1.10.2 对长路径不够可靠，使用短工作树 `build/cmake` 中的私有 CMake 副本和 Ninja 1.13.2，未替换全局 SDK。官方 Ninja Windows ZIP SHA-256：`07fc8261b42b20e71d1720b39068c2e14ffcee6396b76fb7a795fb460b78dc65`。每次 Expo prebuild 后，重新写入 gitignored `apps/mobile/android/local.properties` 的 `cmake.dir=<短工作树>/build/cmake`，否则它可能重新使用 SDK 旧 Ninja。

可复现命令（路径按机器修改；先检查工作区和已有 setup 标记）：

```sh
vp install --frozen-lockfile --filter=@t3tools/mobile... --filter=@t3tools/scripts...
```

在 `apps/mobile` 设置以下构建环境后执行 `vp exec expo prebuild --platform android --no-install`：

```text
JAVA_HOME=<JDK 17>
ANDROID_HOME=<Android SDK>
APP_VARIANT=preview
T3CODE_COMMUNITY_ANDROID=1
T3CODE_COMMUNITY_VERSION_CODE=10
T3CODE_MOBILE_UPDATES_ENABLED=0
EXPO_NO_DOTENV=1
EXPO_NO_TYPESCRIPT_SETUP=1
```

在生成的 `apps/mobile/android` 中执行：

```sh
./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a -Pt3CommunityUnsigned=true \
  --no-daemon --build-cache --max-workers=2 -Pkotlin.compiler.execution.strategy=in-process \
  '-Dorg.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1536m' \
  --init-script ../../../scripts/android-community/native-build.init.gradle
```

PowerShell 使用 `gradlew.bat`，将包含点号的 `-P` 参数整体加引号，避免拆成任务名。模拟器改用 `x86_64`，这类包不能装到大多数 ARM 手机。构建辅助脚本限制 CMake 编译并发 2、链接并发 1、Metro 并发 2；不能把 JVM 再降到 2 GB，本机已经出现堆内存耗尽。Expo 资源生成子进程曾两次以 `0xC0000005` 退出，一次独立重试通过，Windows Node 崩溃根因尚未确认，失败日志保留。社区版关闭 OTA，运行时改用现有 appVersion 策略，避免无用的完整源码指纹计算；资源生成任务仍保留。未来开启自己的 OTA 时必须重新审核原生运行时兼容策略。全量原生编译曾出现 1 GiB Metaspace 警告，本机后续重试增至 1536 MiB，JVM heap 仍为 4 GiB。

## 测试与连接条件

2026-11-13 验收更正：用户报告 Apple、GitHub、Google、Microsoft 四个入口均失败；截图确认原生 Clerk 在进入提供方认证前拒绝社区版回调地址。当前状态是**第三方登录被配置阻塞，同时原生错误提示漏汉化**，不能只记为“尚未测试”。详见 [auth-acceptance.json](../../community/android/auth-acceptance.json)。此前邮箱登录及升级后账户保留的证据不代表第三方回调通过。

若继续使用 `clerk://io.github.wuwei0727.t3code.zh.callback`，需要所选 T3 Clerk 实例管理员授权。第十一版已构建另一条经用户指定的修复路径：保留社区包名、签名、存储和官方登录实例，利用 SDK 的公开 `redirectUrl` 参数单独传入 `clerk://com.t3tools.t3code.callback`，并由 SDK 原有接收器处理，保留其状态校验。匿名原生登录请求的实际预检中，旧社区回调返回 HTTP400／`resource_missmatch`，指定官方回调后四个提供方均返回 HTTP200 和认证跳转地址。预检没有登录账号或完成回调，不能据此认定整项验收通过。

Clerk Android UI 1.4.1 的 `AuthStateEffects` 直接显示非空服务端错误，绕过已有中文资源；其预制 `AuthView` 没有错误文案替换参数。因此社区构建使用固定源码 commit `f152db19e2999011c1008d3af465d2268915b39d` 的 UI 模块，由 `scripts/android-community/prepare-clerk-ui.mjs` 校验 SHA-256 后准备源码。补丁仅涉及 OAuth 入口回调、Google 浏览器 OAuth 偏好和已知错误的显示；底层 API 库及认证校验保持上游发布物。主登录／注册、其他登录方式／找回密码、关联／重新关联账号均传入相同地址。已知回调错误使用统一语言 key `auth.error.redirectNotAllowed`，保留 URI 和换行；未知诊断原文不改写。中文缺失／过期时沿用英文回退。源码和单元测试通过不代表已完成装包页面复验。

Expo prebuild 自动准备此模块，首次需要网络访问固定上游源码及系统 `tar`；校验不符、补丁锚点漂移、资源未生成或缓存文件被改动时停止。MIT 许可证和源码文件哈希保存在忽略目录 `.t3/clerk-ui/<修订>/` 的 `LICENSE`、`origin.json` 中。修改源码准备脚本后重新执行 prebuild。prebuild 和 Gradle 阶段都必须设置 `T3CODE_COMMUNITY_ANDROID=1`；复用构建目录进行非社区构建时，Gradle 明确关闭模块替换，社区包漏设开关则报错。GitHub 构建先运行该模块的错误显示测试，再打包并保存来源清单。

官方版与社区版同时安装时，两者都能声明同一个自定义回调，Android 可能让用户选择应用，也可能打开已设为默认的官方版。独立包名只能保证安装隔离，不能保证共享回调的唯一接收；必须验证选择社区版、选错应用后重试、取消、冷启动和账户保留，才能验收共存登录。若需要完全独立且无路由争用，仍需官方为社区版授权专属回调，见 [Clerk 原生 SSO 配置文档](https://clerk.com/docs/android/guides/configure/auth-strategies/social-connections/overview)。

第十版测试包已在 API35/36 模拟器完成覆盖安装；原账号和真实 T3 Connect 连接保留，当前会话实时接收及手机发送标记通过。Android 16 /1440×3200 的中文系统跟随、显式中英文切换与重启保存、1.0/1.5倍字体下的外观/设置/原生登录页完成限定复验。修复解码队列饥饿后，最终包跨模拟器实际画面、重载和远程主屏幕控制通过，详见 `community/android/acceptance-v10.json`。560 DPI 为测试假设，不代表 Redmi 实际逻辑密度或 HyperOS/ARM 真机；真实推送仍未验证，第三方登录已发现配置阻塞及英文提示漏项，整体验收未完成。

当前交付为 `2.3.0-zh.13 / versionCode 13` 的 ARM64 和 x86_64 个人测试候选，沿用固定社区包名及签名。原模拟器从第七版依次覆盖升级至第十版，匹配 API36 的模拟器从第八版升级至第十版。直接配对、手机发送/电脑消息实时显示、免费 Replay 提问/审批、断线队列恢复与附件原始字节的完整基线属于 `acceptance-v8.json`；未把它们混算为第十版逐项全部重跑。历史版本与最终版本的范围、截图及 APK 哈希均分开记录。

第十版源码的 38 项移动端、18 项共享视频流、12 项维护脚本测试，以及移动端/共享运行时类型、定向 lint、资源和实际包内脚本一致性检查通过。第八版的68项云/语言、35项布局、36项图片/工作流/工作树测试和此前原生通知108项 Robolectric 测试为历史证据；本轮未重跑通知 Robolectric，也未把它当作真实 FCM 送达。没有运行仓库全套检查或 GitHub Actions。

资源 JSON 同时生成应用消息和 review-diff / agent-notifications 两个模块的中英文 XML，勿直接编辑生成 XML。原生状态值仍使用上游英文协议枚举，只在显示时本地化。Android 7–12 的后台通知从应用保存的已解析语言创建资源 Context；Android 服务不能依赖 Activity 的 AppCompat Context 自动传递语言。通知模块的 Robolectric Android 16 测试需要 JDK 21；现有 Android Studio JBR 可以供 Gradle Java toolchain 使用，应用构建仍使用 JDK 17。

用户已在原生页面完成真实登录，并确认使用邮箱验证码或邮箱密码；已发现并连接真实电脑，连接详情显示唯一正在使用的 T3 Connect 路径。手机打开同一维护会话、接收实时更新并发送验收消息成功，依次覆盖升级至第十版后账户和连接保留。第十一版已修复回调白名单问题，并依次完成 Microsoft、GitHub、Google、Apple 登录回调及重启保留测试，详情见 `acceptance-v11.json`；独立桌面界面、第二台实体电脑、ARM 真机与真实推送仍未验证。APK 缺少匹配的 Firebase app ID / sender 配置；第七版通知提示仅确认系统授权，不能据此声称推送送达。

社区标识为 `io.github.wuwei0727.t3code.zh`，scheme 为 `t3code-zh`。Android Manifest 包含社区包自己的 `.callback`、`.oauth` 和 `.hosted-callback` 三个 Clerk 回调 host；原生 SSO 使用 `clerk://io.github.wuwei0727.t3code.zh.callback`，需要所选 Clerk 实例允许此地址。HTTPS 会话链接保留 `app.t3.codes/threads/` 匹配并设为 `autoVerify=false`，不宣称域名已验证。FCM 需要匹配新包名和签名的自有 Firebase 配置与中继发送配置。公开 Clerk 标识和 relay 地址在构建前及 APK 打包后检查；它们不是服务端私钥，也不代表已认证。

历史 v4/v5 构建及验收保留在 maintenance.json 的历史字段与 feature-parity.json。不要把旧版本的源码哈希、资源数量或入口检查直接当作当前版本证据。

## GitHub 首次配置与执行

先将审阅后的分支通过常规方式合入自己的默认分支；当前没有替你推送、创建远程 PR 或公开发布。本机没有可用的 gh 登录，工作流尚未在 GitHub 执行。

翻译工作流需要：

- Secrets：`OPENAI_API_KEY`，仅在翻译步骤注入。
- Variables：`OPENAI_BASE_URL`（默认 `https://api.openai.com/v1`）、`TRANSLATION_MODEL`（填你账号实际可调用的模型，无默认模型）。
- Environment：`community-translation`，设置 required reviewers 与仅默认分支允许部署，审查后再允许带 Key 运行。
- 仓库 Actions 设置允许机器人按工作流所需写分支和创建 PR；不要给不可信 PR 翻译/签名密钥。

`Community Android Check` 每天 `17 2 * * *` 运行一次，**时区 UTC，北京时间 10:17**，也可手动 Run workflow。无新 Android Beta 则结束，不调用 AI；发现更新则按该版本创建或更新待处理 issue。由于镜像缺少可靠的 APK 构建 SHA，目前**自动源码合并仍有明确来源校验门禁**，没有假装实现无审核的自动升级。确认对应源码后再维护 selectedBaseline；不能把发布时间的 tag 当作 APK 来源。重要认证、依赖、构建和工作流变化需审查，不让 AI 自动解决冲突或绕过测试。

`Community Android Translate` 从默认分支手动触发，勾选已审查基础设施后仍受 Environment 保护。源文和上下文未变复用译文；人工确认过的译文不会被覆盖，源文变动标记待审。单次最多 8 次请求（含最多 3 次有限重试），预留输出 token 总上限 16384。缓存按源文、上下文、术语、端点、模型区分，避免重复调用；记录实际 API usage，服务未返回时明确不完整，不知道价格时费用为 null。结果严格按 JSON 数据解析，不执行模型内容。用源文目录哈希复用维护分支和草稿 PR；翻译分支只允许中文资源、状态、生成消息 JSON 及两个原生模块的中文生成 XML 变化；不允许修改 Kotlin、业务代码或英文源文。合并冲突或任何额外代码变化会失败并要求人工处理。

翻译任务通过 needs 显式调用 `Community Android Test APK`，构建刚生成的同一 commit，不依赖机器人 push 再触发 CI。也可单独手动构建。构建使用按 ABI 和锁文件/原生配置区分的 Gradle 缓存，不接收翻译密钥或签名密钥，上传**未签名 APK**、源码版本、真实测试/构建日志、各步骤成功/失败/跳过状态、资源差异和扫描清单。第三方 Actions 固定 commit。没有 `pull_request_target` 执行不可信代码，没有自动公开发布。

失败时查看 Actions 对应红色步骤与 artifacts 中的日志及 result JSON。源码冲突需在维护分支由人处理，保留汉化与认证语义，重新执行校验和构建；不强推、不删测试、不让模型任意修认证。工作流、构建脚本或依赖发生变化后，再次审查默认分支与分支差异，才允许接触翻译 Key。

## 固定签名、发布和回滚

社区 versionCode 与上游独立，当前 13（尚未公开发布）；每次可安装的更新递增，在 maintenance.json 记录对应上游 SHA。versionName 采用 `2.3.0-zh.13`。相同包名必须一直使用同一签名，不能每次生成新 key。

Windows 个人测试签名脚本 `scripts/android-community/sign-apk.ps1` 在首次签名时创建一次私有 PKCS12，默认存于 `%LOCALAPPDATA%\T3CodeCommunity\AndroidSigning\io.github.wuwei0727.t3code.zh`；目录 ACL 仅当前用户和 SYSTEM，密码由当前 Windows 用户 DPAPI 加密保存。之后复用；缺少 key/password 任一个文件就停止，不能悄悄重建。签名密码只传给可信 keytool/apksigner 子进程，不传给 Gradle/Metro，不写进仓库或日志。签名前按 16 KiB 对齐，签名后核验签名及对齐。

```powershell
$env:JAVA_HOME='<JDK 17>'
$env:ANDROID_HOME='<Android SDK>'
./scripts/android-community/sign-apk.ps1 -ApkPath '<unsigned APK>' -OutputPath '<新的已签名 APK 路径>'
```

私有签名仅用于可覆盖更新的个人测试包，不代表已批准正式发布。正式发布之前，必须把原 key、别名和密码备份到安全可恢复的位置：**DPAPI 文件依赖当前 Windows 用户和系统，复制它并不能保证换电脑后恢复**。通过受保护的密码管理器/离线备份保存可恢复密码与原 keystore；不要在聊天中粘贴密码。CI 签名以后使用独立受保护 Environment 和 Secrets，需你确认后才执行，不给 PR 代码暴露。

正式发布为独立人工确认步骤，当前没有发布工作流。默认不做应用内 OTA，社区配置不能重新指向官方更新项目。回滚优先用同一 key 将已知良好的旧源码重建为更高 versionCode 的 APK，保持数据与覆盖安装；不要通过卸载清数据来冒充回滚成功。Android 拒绝低 versionCode 覆盖属于正常保护。

第十二版已实测云端离线消息恢复和手机允许/拒绝审批。第十三版补齐环境列表及账户页的连接超时提示，两处均已在安装后的 APK 中显示中文；API36 模拟器覆盖升级保留账户。官方 beta784 APK 与社区版可同时安装，但官方 ARM 包在此 x86_64 模拟器因 `libreactnative.so` 加载失败而崩溃，共存登录仍需 ARM 真机验证。
