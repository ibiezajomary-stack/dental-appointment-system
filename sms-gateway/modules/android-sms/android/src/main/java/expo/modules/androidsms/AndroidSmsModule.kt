package expo.modules.androidsms

import android.os.Build
import android.telephony.SmsManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AndroidSmsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AndroidSms")

    AsyncFunction("send") { phone: String, message: String ->
      if (phone.isBlank()) {
        throw IllegalArgumentException("Phone number is required")
      }
      if (message.isBlank()) {
        throw IllegalArgumentException("Message is required")
      }

      val context = appContext.reactContext
        ?: throw IllegalStateException("React context is not available")

      val smsManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        context.getSystemService(SmsManager::class.java)
      } else {
        @Suppress("DEPRECATION")
        SmsManager.getDefault()
      } ?: throw IllegalStateException("SmsManager is not available on this device")

      val parts = smsManager.divideMessage(message)
      if (parts.size > 1) {
        smsManager.sendMultipartTextMessage(phone, null, parts, null, null)
      } else {
        smsManager.sendTextMessage(phone, null, message, null, null)
      }
      true
    }
  }
}
