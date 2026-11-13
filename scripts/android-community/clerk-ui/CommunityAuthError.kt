package com.clerk.ui.auth

internal const val REDIRECT_ERROR_PREFIX =
  "The current redirect url passed in the sign in or sign up request does not match an authorized redirect URI for this instance. Review authorized redirect urls for your instance."

internal fun communityAuthError(message: String?, fallback: String, redirectExplanation: String): String =
  when {
    message == null -> fallback
    message.startsWith(REDIRECT_ERROR_PREFIX) ->
      redirectExplanation + message.removePrefix(REDIRECT_ERROR_PREFIX)
    else -> message
  }
