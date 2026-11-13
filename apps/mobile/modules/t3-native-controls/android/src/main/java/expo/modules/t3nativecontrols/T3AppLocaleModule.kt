package expo.modules.t3nativecontrols

import android.app.LocaleManager
import android.content.res.Resources
import android.os.Build
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.os.LocaleListCompat
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class T3AppLocaleModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("T3AppLocale")

    Function("getSystemLocaleTags") {
      val context = appContext.reactContext
      val locales = if (Build.VERSION.SDK_INT >= 33 && context != null) {
        context.getSystemService(LocaleManager::class.java).systemLocales
      } else {
        Resources.getSystem().configuration.locales
      }
      locales.toLanguageTags()
    }

    AsyncFunction("setLocale") { languageTag: String ->
      require(languageTag == "en" || languageTag == "zh-CN")
      appContext.reactContext?.getSharedPreferences("t3-community-language", 0)
        ?.edit()?.putString("resolvedLocale", languageTag)?.apply()
      val locales = LocaleListCompat.forLanguageTags(languageTag)
      if (AppCompatDelegate.getApplicationLocales() != locales) {
        AppCompatDelegate.setApplicationLocales(locales)
      }
    }.runOnQueue(Queues.MAIN)
  }
}
