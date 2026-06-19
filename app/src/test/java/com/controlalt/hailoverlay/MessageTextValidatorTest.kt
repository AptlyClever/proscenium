package com.controlalt.hailoverlay

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class MessageTextValidatorTest {

    @Test
    fun accepts_axiom_authored_messages() {
        listOf(
            "Spoon transporter check",
            "Sniff check initiated.",
            "Nose protocol online.",
        ).forEach { message ->
            val result = MessageTextValidator.validate(message)
            assertTrue(result.isSuccess)
            assertEquals(message, result.getOrNull())
        }
    }

    @Test
    fun trims_surrounding_whitespace() {
        val result = MessageTextValidator.validate("  Spoon transporter check  ")
        assertTrue(result.isSuccess)
        assertEquals("Spoon transporter check", result.getOrNull())
    }

    @Test
    fun rejects_blank() {
        assertTrue(MessageTextValidator.validate("").isFailure)
        assertTrue(MessageTextValidator.validate("   ").isFailure)
        assertTrue(MessageTextValidator.validate(null).isFailure)
    }

    @Test
    fun rejects_overlong() {
        val result = MessageTextValidator.validate("a".repeat(MessageTextValidator.MAX_LENGTH + 1))
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull()?.message?.contains("120") == true)
    }

    @Test
    fun rejects_control_characters() {
        assertTrue(MessageTextValidator.validate("hello\u0007").isFailure)
    }

    @Test
    fun rejects_html_like_text() {
        assertTrue(MessageTextValidator.validate("<b>hi</b>").isFailure)
        assertTrue(MessageTextValidator.validate("javascript:alert(1)").isFailure)
    }
}
