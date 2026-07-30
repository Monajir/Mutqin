/** @type {import('expo/config').ExpoConfig} */
module.exports = ({ config }) => ({
    ...config,
    owner: "munzirxleo",
    name: 'Mutqin',
    slug: 'mutqin',
    scheme: 'mutqin',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    icon: './assets/icon.png',
    splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#0F6B5C',
    },
    assetBundlePatterns: ['**/*'],
    plugins: [
        'expo-router',
        'expo-font',
        'expo-location',
        [
            'expo-notifications',
            {
                icon: './assets/notification-icon.png',
                color: '#0F6B5C',
            },
        ],
    ],
    ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.mutqin.app',
    },
    android: {
        package: 'com.mutqin.app',
        adaptiveIcon: {
            foregroundImage: './assets/adaptive-icon.png',
            backgroundColor: '#0F6B5C',
        },
    },
    extra: {
        apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.mutqin.app/v1',
        contentVersion: '1.0.0',
        eas: {
            projectId: "3d764400-4bf3-4338-bf78-41052f1aeec2",
        },
    },
    experiments: {
        typedRoutes: true,
    },
});