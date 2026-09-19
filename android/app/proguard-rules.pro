# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# React Native & TurboModules
-keep class com.facebook.react.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.react.bridge.JavaScriptModule { *; }
-keep class com.facebook.react.bridge.NativeModule { *; }
-keepclassmembers class * extends com.facebook.react.bridge.NativeModule {
    <init>(...);
    @com.facebook.react.bridge.ReactMethod *;
    @com.facebook.react.bridge.ReactMethodSync *;
}
-keep class com.facebook.jni.** { *; }

# Hermes
-keep class com.facebook.hermes.unicode.** { *; }

# Expo
-keep class expo.modules.** { *; }

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }

# react-native-gesture-handler
-keep class com.swmansion.gesturehandler.** { *; }

# react-native-screens
-keep class com.swmansion.rnscreens.** { *; }

# react-native-google-mobile-ads
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.ads.mediation.** { *; }
-keep class io.invertase.googlemobileads.** { *; }

# react-native-keychain
-keep class com.oblador.keychain.** { *; }

# react-native-webview
-keepclassmembers class * extends com.facebook.react.uimanager.events.Event {
    <init>(...);
}
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve debugging attributes and annotations
-keepattributes SourceFile,LineNumberTable,InnerClasses,EnclosingMethod,Signature,*Annotation*

# Suppress harmless warnings from dependencies
-dontwarn com.facebook.react.**
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn org.jetbrains.annotations.**
-dontwarn com.google.android.gms.**
