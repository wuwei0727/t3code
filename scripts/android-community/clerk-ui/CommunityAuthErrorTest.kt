package com.clerk.ui.auth

import org.junit.Assert.assertEquals
import org.junit.Test

class CommunityAuthErrorTest {
  @Test fun redirectErrorPreservesCallbackAndNewlines() {
    val details = "\nclerk://com.t3tools.t3code.callback"
    assertEquals("回调地址未获授权。$details", communityAuthError(REDIRECT_ERROR_PREFIX + details, "失败", "回调地址未获授权。"))
  }

  @Test fun unknownErrorsAndEnglishRemainUnchanged() {
    val unknown = "Provider unavailable: provider_id=example"
    assertEquals(unknown, communityAuthError(unknown, "失败", "回调地址未获授权。"))
    val english = REDIRECT_ERROR_PREFIX + "\nclerk://com.t3tools.t3code.callback"
    assertEquals(english, communityAuthError(english, "Failed", REDIRECT_ERROR_PREFIX))
    assertEquals("失败", communityAuthError(null, "失败", "回调地址未获授权。"))
  }
}
