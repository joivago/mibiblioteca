plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.ivan.mibiblioteca"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.ivan.mibiblioteca"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    // Firma fija: así cada versión nueva se instala encima de la anterior
    // sin desinstalar y sin perder los libros guardados.
    signingConfigs {
        create("propia") {
            storeFile = file("mibiblioteca.jks")
            storePassword = "biblioteca2026"
            keyAlias = "mibiblioteca"
            keyPassword = "biblioteca2026"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("propia")
        }
        debug {
            signingConfig = signingConfigs.getByName("propia")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    lint {
        abortOnError = false
        checkReleaseBuilds = false
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-ktx:1.9.2")
    implementation("androidx.webkit:webkit:1.11.0")
    implementation("androidx.exifinterface:exifinterface:1.3.7")
    implementation("com.journeyapps:zxing-android-embedded:4.3.0")
}
