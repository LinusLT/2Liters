import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Easing,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const DAILY_GOAL_ML = 2000;
const STORAGE_KEY = 'two-liters-state-v1';
const BOTTLE_IMAGE_HEIGHT = 360;
const BOTTLE_IMAGE_WIDTH = 240;

const bottleEmptyImage = require('./assets/bottle-empty.png');
const bottleFullImage = require('./assets/bottle-full.png');

const formatDateKey = (date) => date.toISOString().slice(0, 10);

const getYesterdayKey = (todayKey) => {
    const [year, month, day] = todayKey.split('-').map(Number);
    const yesterday = new Date(year, month - 1, day - 1);
    return formatDateKey(yesterday);
};

export default function App() {
    const [remaining, setRemaining] = useState(DAILY_GOAL_ML);
    const [inputValue, setInputValue] = useState('');
    const [streak, setStreak] = useState(0);
    const [lastCompletionDate, setLastCompletionDate] = useState(null);
    const [lastOpenDate, setLastOpenDate] = useState(null);
    const [showCelebration, setShowCelebration] = useState(false);

    const confettiAnimation = useRef(new Animated.Value(0)).current;
    const popupAnimation = useRef(new Animated.Value(0)).current;

    const confettiPieces = useMemo(
        () =>
            Array.from({ length: 24 }, (_, index) => ({
                id: index,
                left: Math.random() * 220,
                size: 6 + Math.random() * 8,
                color: ['#38bdf8', '#facc15', '#f472b6', '#34d399', '#fb7185'][index % 5],
                rotation: Math.random() * 160 - 80,
            })),
        []
    );

    const todayKey = useMemo(() => formatDateKey(new Date()), []);
    const yesterdayKey = useMemo(() => getYesterdayKey(todayKey), [todayKey]);

    useEffect(() => {
        const loadState = async () => {
            try {
                const saved = await AsyncStorage.getItem(STORAGE_KEY);
                if (!saved) {
                    setLastOpenDate(todayKey);
                    return;
                }
                const parsed = JSON.parse(saved);
                const savedCompletion = parsed.lastCompletionDate ?? null;
                const savedRemaining = typeof parsed.remaining === 'number' ? parsed.remaining : DAILY_GOAL_ML;
                const savedStreak = typeof parsed.streak === 'number' ? parsed.streak : 0;
                const savedLastOpen = parsed.lastOpenDate ?? todayKey;

                let nextRemaining = savedRemaining;
                let nextStreak = savedStreak;

                if (savedCompletion && savedCompletion !== todayKey && savedCompletion !== yesterdayKey) {
                    nextStreak = 0;
                }

                if (savedLastOpen !== todayKey) {
                    nextRemaining = DAILY_GOAL_ML;
                }

                setRemaining(nextRemaining);
                setStreak(nextStreak);
                setLastCompletionDate(savedCompletion);
                setLastOpenDate(todayKey);
            } catch (error) {
                console.warn('Kunne ikke indlæse data', error);
            }
        };

        loadState();
    }, [todayKey, yesterdayKey]);

    useEffect(() => {
        const saveState = async () => {
            try {
                const payload = JSON.stringify({
                    remaining,
                    streak,
                    lastCompletionDate,
                    lastOpenDate: lastOpenDate ?? todayKey,
                });
                await AsyncStorage.setItem(STORAGE_KEY, payload);
            } catch (error) {
                console.warn('Kunne ikke gemme data', error);
            }
        };

        saveState();
    }, [remaining, streak, lastCompletionDate, lastOpenDate, todayKey]);

    const handleAddIntake = () => {
        const amount = Number(inputValue.replace(',', '.'));
        if (!amount || Number.isNaN(amount) || amount <= 0) {
            Alert.alert('Ugyldigt tal', 'Skriv et positivt tal i milliliter.');
            return;
        }

        const nextRemaining = Math.max(0, remaining - amount);
        setRemaining(nextRemaining);
        setInputValue('');

        if (nextRemaining === 0 && lastCompletionDate !== todayKey) {
            const nextStreak = lastCompletionDate === yesterdayKey ? streak + 1 : 1;
            setStreak(nextStreak);
            setLastCompletionDate(todayKey);
            triggerCelebration();
        }
    };

    const triggerCelebration = () => {
        setShowCelebration(true);
        confettiAnimation.setValue(0);
        popupAnimation.setValue(0);

        Animated.parallel([
            Animated.timing(confettiAnimation, {
                toValue: 1,
                duration: 1600,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.sequence([
                Animated.spring(popupAnimation, {
                    toValue: 1,
                    useNativeDriver: true,
                    friction: 6,
                }),
                Animated.delay(1200),
                Animated.timing(popupAnimation, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]),
        ]).start(({ finished }) => {
            if (finished) {
                setShowCelebration(false);
            }
        });
    };

    const remainingRatio = Math.max(0, Math.min(1, remaining / DAILY_GOAL_ML));
    const visibleHeight = Math.max(
        0,
        Math.min(BOTTLE_IMAGE_HEIGHT, remainingRatio * BOTTLE_IMAGE_HEIGHT)
    );
    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>2 Liter Vand</Text>
            <Text style={styles.subtitle}>Streak: {streak} dage i træk</Text>

            <View style={styles.bottle}>
                <View style={styles.bottleImageFrame}>
                    <Image source={bottleEmptyImage} style={styles.bottleImage} />
                    <View style={[styles.bottleFillMask, { height: visibleHeight }]}>
                        <Image source={bottleFullImage} style={styles.bottleImage} />
                    </View>
                </View>
                <Text style={styles.bottleText}>{remaining} ml tilbage</Text>
            </View>

            {showCelebration && (
                <View style={styles.celebrationLayer} pointerEvents="none">
                    {confettiPieces.map((piece) => {
                        const translateY = confettiAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-40, 420],
                        });
                        const opacity = confettiAnimation.interpolate({
                            inputRange: [0, 0.7, 1],
                            outputRange: [1, 1, 0],
                        });
                        return (
                            <Animated.View
                                key={piece.id}
                                style={[
                                    styles.confettiPiece,
                                    {
                                        backgroundColor: piece.color,
                                        width: piece.size,
                                        height: piece.size * 1.4,
                                        left: piece.left,
                                        opacity,
                                        transform: [
                                            { translateY },
                                            { rotate: `${piece.rotation}deg` },
                                        ],
                                    },
                                ]}
                            />
                        );
                    })}
                    <Animated.View
                        style={[
                            styles.popup,
                            {
                                opacity: popupAnimation,
                                transform: [
                                    {
                                        scale: popupAnimation.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.9, 1],
                                        }),
                                    },
                                ],
                            },
                        ]}
                    >
                        <Text style={styles.popupText}>Godt gået! Du har nået dagens mål!</Text>
                    </Animated.View>
                </View>
            )}

            <View style={styles.inputRow}>
                <TextInput
                    style={styles.input}
                    placeholder="Indtast ml"
                    keyboardType="numeric"
                    value={inputValue}
                    onChangeText={setInputValue}
                    returnKeyType="done"
                    onSubmitEditing={handleAddIntake}
                />
                <TouchableOpacity style={styles.button} onPress={handleAddIntake}>
                    <Text style={styles.buttonText}>Tilføj</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.helperText}>Målet er {DAILY_GOAL_ML} ml pr. dag.</Text>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        padding: 24,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#12324b',
        marginTop: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#3c5870',
        marginTop: 4,
    },
    bottle: {
        marginTop: 32,
        width: BOTTLE_IMAGE_WIDTH,
        height: BOTTLE_IMAGE_HEIGHT,
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    bottleImageFrame: {
        width: BOTTLE_IMAGE_WIDTH,
        height: BOTTLE_IMAGE_HEIGHT,
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bottleImage: {
        width: BOTTLE_IMAGE_WIDTH,
        height: BOTTLE_IMAGE_HEIGHT,
        resizeMode: 'contain',
    },
    bottleFillMask: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        overflow: 'hidden',
        zIndex: 2,
    },
    bottleText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#12324b',
        marginTop: 12,
    },
    inputRow: {
        flexDirection: 'row',
        marginTop: 32,
        width: '100%',
        gap: 12,
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#cfe3f5',
    },
    button: {
        backgroundColor: '#2563eb',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
    },
    buttonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 16,
    },
    helperText: {
        marginTop: 16,
        fontSize: 14,
        color: '#5a7287',
    },
    celebrationLayer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confettiPiece: {
        position: 'absolute',
        top: 0,
        borderRadius: 4,
    },
    popup: {
        position: 'absolute',
        bottom: 120,
        backgroundColor: '#0f172a',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    popupText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 16,
        textAlign: 'center',
    },
});