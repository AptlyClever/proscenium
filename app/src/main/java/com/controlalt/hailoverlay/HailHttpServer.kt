package com.controlalt.hailoverlay

import android.util.Log
import fi.iki.elonen.NanoHTTPD

class HailHttpServer(
    private val onShowHail: (HailRegistry.ValidatedHail) -> Unit,
) : NanoHTTPD(HailRegistry.HTTP_PORT) {

    override fun serve(session: IHTTPSession): Response {
        val uri = session.uri ?: "/"
        val method = session.method

        if (uri == "/health" && method == Method.GET) {
            return jsonResponse(
                status = Response.Status.OK,
                body = """{"status":"ok","port":${HailRegistry.HTTP_PORT},"app":"control-alt-hails","version":"${BuildConfig.VERSION_NAME}"}""",
            )
        }

        if (uri != "/hail/show") {
            return jsonResponse(
                status = Response.Status.NOT_FOUND,
                body = """{"error":"not_found"}""",
            )
        }

        if (method != Method.POST) {
            return jsonResponse(
                status = Response.Status.METHOD_NOT_ALLOWED,
                body = """{"error":"method_not_allowed"}""",
            )
        }

        return try {
            val body = readBody(session)
            val parsed = HailShowRequest.fromJson(body).getOrElse { error ->
                return jsonResponse(
                    status = Response.Status.BAD_REQUEST,
                    body = """{"error":"invalid_json","detail":"${error.message}"}""",
                )
            }

            val validated = parsed.validate().getOrElse { error ->
                val detail = error.message.orEmpty()
                val errorCode = when (detail) {
                    OverlayBrokerGate.ERROR_REQUIRED -> OverlayBrokerGate.ERROR_REQUIRED
                    OverlayBrokerGate.ERROR_INVALID -> OverlayBrokerGate.ERROR_INVALID
                    else -> "not_allowlisted"
                }
                val responseDetail = when (detail) {
                    OverlayBrokerGate.ERROR_REQUIRED -> OverlayBrokerGate.DETAIL_REQUIRED
                    OverlayBrokerGate.ERROR_INVALID -> OverlayBrokerGate.DETAIL_INVALID
                    else -> detail
                }
                return jsonResponse(
                    status = Response.Status.BAD_REQUEST,
                    body = """{"error":"$errorCode","detail":"$responseDetail"}""",
                )
            }

            onShowHail(validated)
            jsonResponse(
                status = Response.Status.OK,
                body = """{"status":"shown","hail_id":"${validated.hailId}","effect_id":"${validated.effectId}","placement_id":"${validated.placement.placementId}","duration_ms":${validated.durationMs}}""",
            )
        } catch (error: Exception) {
            Log.e(TAG, "Failed to handle hail request", error)
            jsonResponse(
                status = Response.Status.INTERNAL_ERROR,
                body = """{"error":"internal_error"}""",
            )
        }
    }

    private fun readBody(session: IHTTPSession): String {
        val files = HashMap<String, String>()
        session.parseBody(files)
        return files["postData"] ?: ""
    }

    private fun jsonResponse(status: Response.Status, body: String): Response {
        return newFixedLengthResponse(
            status,
            "application/json; charset=utf-8",
            body,
        )
    }

    companion object {
        private const val TAG = "HailHttpServer"
    }
}
