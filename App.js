import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const DAILY_GOAL_ML = 2000;
const STORAGE_KEY = 'two-liters-state-v1';

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
                await AsyncStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify({
                        remaining,
                        streak,
                        lastCompletionDate,
                        lastOpenDate: lastOpenDate ?? todayKey,
                    })
                );
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
        }
    };

    const fillPercentage = Math.round((remaining / DAILY_GOAL_ML) * 100);

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>2 Liter Vand</Text>
            <Text style={styles.subtitle}>Streak: {streak} dage i træk</Text>

            <View style={styles.bottle}>
                <View style={[styles.bottleFill, { height: `${fillPercentage}%` }]} />
                <Text style={styles.bottleText}>{remaining} ml tilbage</Text>
            </View>

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
        backgroundColor: '#f2f7fb',
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
        width: 200,
        height: 360,
        borderRadius: 24,
        borderWidth: 3,
        borderColor: '#3b82f6',
        backgroundColor: '#e5f0ff',
        overflow: 'hidden',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    bottleFill: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        backgroundColor: '#60a5fa',
    },
    bottleText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#12324b',
        marginBottom: 16,
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
});
