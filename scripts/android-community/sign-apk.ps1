param(
  [Parameter(Mandatory)][string]$ApkPath,
  [Parameter(Mandatory)][string]$OutputPath,
  [string]$JavaHome = $env:JAVA_HOME,
  [string]$AndroidSdkRoot = $env:ANDROID_HOME,
  [string]$BuildToolsVersion = '37.0.0',
  [string]$KeyDirectory = (Join-Path $env:LOCALAPPDATA 'T3CodeCommunity/AndroidSigning/io.github.wuwei0727.t3code.zh')
)
$ErrorActionPreference = 'Stop'
if (!$IsWindows) { throw 'This personal signer uses Windows DPAPI. Use protected signing secrets for CI.' }
$source = (Resolve-Path -LiteralPath $ApkPath).Path
$destination = [IO.Path]::GetFullPath($OutputPath)
if ($source -eq $destination) { throw 'Output must differ from the input APK.' }
if (Test-Path -LiteralPath $destination) { throw 'Refusing to overwrite an existing signed APK.' }
$keytool = Join-Path $JavaHome 'bin/keytool.exe'
$tools = Join-Path $AndroidSdkRoot "build-tools/$BuildToolsVersion"
foreach ($file in @($keytool, (Join-Path $tools 'zipalign.exe'), (Join-Path $tools 'apksigner.bat'))) {
  if (!(Test-Path -LiteralPath $file)) { throw "Required tool missing: $file" }
}
$keyFile = Join-Path $KeyDirectory 'personal-community.p12'
$passwordFile = Join-Path $KeyDirectory 'password.dpapi'
if ((Test-Path -LiteralPath $keyFile) -ne (Test-Path -LiteralPath $passwordFile)) {
  throw 'Incomplete signing backup. Restore both original files; do not generate another key.'
}
New-Item -ItemType Directory -Path $KeyDirectory -Force | Out-Null
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
& icacls.exe $KeyDirectory /inheritance:r /grant:r "*${sid}:(OI)(CI)F" '*S-1-5-18:(OI)(CI)F' | Out-Null
if ($LASTEXITCODE) { throw 'Could not protect the signing directory.' }
$aligned = Join-Path ([IO.Path]::GetTempPath()) ("t3-community-" + [guid]::NewGuid().ToString('N') + '.apk')
$previousJavaHome = $env:JAVA_HOME
$passwordPointer = [IntPtr]::Zero
try {
  $env:JAVA_HOME = $JavaHome
  if (!(Test-Path -LiteralPath $keyFile)) {
    $env:T3_COMMUNITY_STORE_PASSWORD = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
    ConvertTo-SecureString $env:T3_COMMUNITY_STORE_PASSWORD -AsPlainText -Force |
      ConvertFrom-SecureString | Set-Content -LiteralPath $passwordFile -Encoding ascii
    & $keytool -genkeypair -keystore $keyFile -storetype PKCS12 -alias community -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=T3 Code Personal Community, OU=Personal Android' -storepass:env T3_COMMUNITY_STORE_PASSWORD -keypass:env T3_COMMUNITY_STORE_PASSWORD -noprompt
    if ($LASTEXITCODE) { throw 'Key generation failed. Inspect and restore signing state before retrying.' }
  } else {
    $secure = (Get-Content -LiteralPath $passwordFile -Raw).Trim() | ConvertTo-SecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $env:T3_COMMUNITY_STORE_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  }
  & (Join-Path $tools 'zipalign.exe') -P 16 4 $source $aligned
  if ($LASTEXITCODE) { throw 'APK alignment failed.' }
  New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
  & (Join-Path $tools 'apksigner.bat') sign --ks $keyFile --ks-key-alias community --ks-pass env:T3_COMMUNITY_STORE_PASSWORD --key-pass env:T3_COMMUNITY_STORE_PASSWORD --out $destination $aligned
  if ($LASTEXITCODE) { throw 'APK signing failed.' }
  & (Join-Path $tools 'apksigner.bat') verify --verbose --print-certs $destination
  if ($LASTEXITCODE) { throw 'Signed APK verification failed.' }
  & (Join-Path $tools 'zipalign.exe') -c -P 16 4 $destination
  if ($LASTEXITCODE) { throw 'Signed APK 16 KiB alignment verification failed.' }
  Get-FileHash -LiteralPath $destination -Algorithm SHA256
} finally {
  Remove-Item Env:T3_COMMUNITY_STORE_PASSWORD -ErrorAction SilentlyContinue
  $env:JAVA_HOME = $previousJavaHome
  if ($passwordPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer) }
  if (Test-Path -LiteralPath $aligned) { Remove-Item -LiteralPath $aligned }
}
