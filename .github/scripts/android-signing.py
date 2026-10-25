"""Liga a assinatura de release no projeto Android gerado pelo Tauri.

O `tauri android init` gera `gen/android/app/build.gradle.kts` sem assinatura. Este script
acrescenta a configuração que lê `gen/android/keystore.properties` (escrito pelo workflow a
partir dos segredos do repositório) e a usa no build de release. Uso:

    python android-signing.py apps/desktop/src-tauri/gen/android/app/build.gradle.kts
"""

import sys

SIGNING = """
    signingConfigs {
        create("release") {
            val keystoreProperties = Properties()
            val keystorePropertiesFile = rootProject.file("keystore.properties")
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(java.io.FileInputStream(keystorePropertiesFile))
            }
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["password"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["password"] as String
        }
    }
"""

path = sys.argv[1]
text = open(path, encoding="utf-8").read()
if "signingConfigs" in text:
    sys.exit(0)

anchor = "android {\n"
release = 'getByName("release") {\n'
if anchor not in text or release not in text:
    sys.exit(f"Formato inesperado em {path}: não achei 'android {{' ou o bloco de release.")

text = text.replace(anchor, anchor + SIGNING, 1)
text = text.replace(
    release, release + '            signingConfig = signingConfigs.getByName("release")\n', 1
)
if "import java.util.Properties" not in text:
    text = "import java.util.Properties\n" + text
open(path, "w", encoding="utf-8").write(text)
print("assinatura de release ligada")
