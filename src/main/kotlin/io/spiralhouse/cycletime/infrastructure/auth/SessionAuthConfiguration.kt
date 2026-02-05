package io.spiralhouse.cycletime.infrastructure.auth

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.auth.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.sessions.*

fun Application.configureSessionAuth() {
    val sessionMaxAge = environment.config.propertyOrNull("session.maxAgeSeconds")?.getString()?.toLong()
        ?: 604800L

    authentication {
        session<UserSession>("session-auth") {
            validate { session ->
                val sessionAge = System.currentTimeMillis() - session.createdAt
                if (sessionAge < sessionMaxAge * 1000) {
                    session
                } else {
                    null
                }
            }
            challenge {
                if (call.request.acceptsHtml()) {
                    call.respondRedirect("/login")
                } else {
                    call.respond(HttpStatusCode.Unauthorized, mapOf("error" to "Authentication required"))
                }
            }
        }
    }
}

fun ApplicationRequest.acceptsHtml(): Boolean {
    return accept()?.contains("text/html") == true
}
