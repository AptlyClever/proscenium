plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val overlayBrokerSecret = (
    project.findProperty("overlayBrokerSecret") as String?
        ?: System.getenv("LCARD_OVERLAY_BROKER_SECRET")
        ?: ""
    ).trim()

fun requireOverlayBrokerSecret(taskLabel: String) {
    if (overlayBrokerSecret.length < 16) {
        throw GradleException(
            "Missing overlay broker secret for $taskLabel. " +
                "Set LCARD_OVERLAY_BROKER_SECRET (min 16 chars) or -PoverlayBrokerSecret=... before building the APK.",
        )
    }
}

android {
    namespace = "com.controlalt.hailoverlay"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.controlalt.hailoverlay"
        minSdk = 26
        targetSdk = 34
        versionCode = 2000031
        versionName = "2.0.0-alpha.33"
        buildConfigField(
            "String",
            "OVERLAY_BROKER_SECRET",
            "\"${overlayBrokerSecret.replace("\\", "\\\\").replace("\"", "\\\"")}\"",
        )
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }

    testOptions {
        unitTests.isReturnDefaultValues = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

listOf("assembleDebug", "assembleRelease").forEach { taskName ->
    tasks.matching { it.name == taskName }.configureEach {
        doFirst {
            requireOverlayBrokerSecret(taskName)
        }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.02.00")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.animation:animation")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.lifecycle:lifecycle-service:2.7.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0")
    implementation("androidx.savedstate:savedstate:1.2.1")
    implementation("org.nanohttpd:nanohttpd:2.3.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
