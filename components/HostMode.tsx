import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TcpSocket from 'react-native-tcp-socket';

export default function HostMode() {
    const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [server, setServer] = useState<TcpSocket.Server | null>(null);
    const [serverStatus, setServerStatus] = useState('Stopped');
    const [clientCount, setClientCount] = useState(0);

    useEffect(() => {
        // Start the server on mount
        const newServer = TcpSocket.createServer((socket) => {
            setClientCount((prev) => prev + 1);

            socket.on('data', (data) => {
                console.log('Received from client:', data.toString());
                // For a WebSocket handshake, we would parse headers and respond with 101 Switching Protocols.
                // For now, we accept the connection but standard Websocket clients might drop if handshake fails.
            });

            socket.on('error', (error) => {
                console.log('Client socket error:', error);
            });

            socket.on('close', () => {
                console.log("A connection was closed")
                setClientCount((prev) => Math.max(0, prev - 1));
            });
        }).listen({ host: "0.0.0.0", port: 8080 }, () => console.log("Listeing"))

        newServer.on('error', (error) => {
            setServerStatus('Error: ' + error.message);
        });

        setServer(newServer);

        return () => {
            if (sound) {
                sound.unloadAsync();
            }
            newServer.close();
        };
    }, []);

    const pickAudioFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'audio/*',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setSelectedFile(result.assets[0]);
                // Unload previous sound if any
                if (sound) {
                    await sound.unloadAsync();
                    setSound(null);
                    setIsPlaying(false);
                }
            }
        } catch (error) {
            Alert.alert('Error picking file', String(error));
        }
    };

    const playPauseAudio = async () => {
        if (!selectedFile) {
            alert('Please select an MP3 file first.');
            return;
        }

        try {
            if (!sound) {
                // Load the sound
                const { sound: newSound } = await Audio.Sound.createAsync(
                    { uri: selectedFile.uri },
                    { shouldPlay: true },
                    (status) => {
                        if (status.isLoaded) {
                            setIsPlaying(status.isPlaying);
                        }
                    }
                );
                setSound(newSound);
                setIsPlaying(true);
            } else {
                if (isPlaying) {
                    await sound.pauseAsync();
                } else {
                    await sound.playAsync();
                }
            }
        } catch (error) {
            Alert.alert('Playback Error', String(error));
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Host Mode</Text>

            <View style={styles.serverInfo}>
                <Text style={styles.label}>Audio Server Status: <Text style={{ fontWeight: 'bold', color: serverStatus.includes('Listening') ? '#4CAF50' : '#F44336' }}>{serverStatus}</Text></Text>
                <Text style={styles.label}>Connected Speakers: <Text style={{ fontWeight: 'bold' }}>{clientCount}</Text></Text>
            </View>

            <View style={styles.centerContent}>
                <TouchableOpacity style={styles.selectButton} onPress={pickAudioFile}>
                    <Text style={styles.buttonText}>Select MP3 File</Text>
                </TouchableOpacity>

                {selectedFile && (
                    <View style={styles.fileInfoCard}>
                        <Text style={styles.fileInfoText} numberOfLines={1} ellipsizeMode="middle">
                            Selected: {selectedFile.name}
                        </Text>
                        <Text style={styles.fileSizeText}>
                            Size: {selectedFile.size ? (selectedFile.size / 1024 / 1024).toFixed(2) : 0} MB
                        </Text>
                    </View>
                )}
            </View>

            {/* Audio Playback Handler docked to the bottom */}
            <View style={styles.playbackHandler}>
                <Text style={styles.playbackLabel}>Playback Controls</Text>
                <TouchableOpacity
                    style={[styles.playButton, !selectedFile && styles.disabledButton]}
                    onPress={playPauseAudio}
                    disabled={!selectedFile}
                >
                    <Text style={styles.buttonText}>{isPlaying ? 'Pause' : 'Play'}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        width: '100%',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 24,
        color: '#333',
        textAlign: 'center',
    },
    serverInfo: {
        backgroundColor: '#f5f5f5',
        padding: 16,
        borderRadius: 8,
        marginBottom: 32,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        color: '#333',
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
    },
    selectButton: {
        backgroundColor: '#FF9800',
        padding: 16,
        borderRadius: 8,
        width: '100%',
        alignItems: 'center',
        marginBottom: 16,
    },
    fileInfoCard: {
        backgroundColor: '#E3F2FD',
        padding: 16,
        borderRadius: 8,
        width: '100%',
        borderWidth: 1,
        borderColor: '#90CAF9',
    },
    fileInfoText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1565C0',
        marginBottom: 8,
    },
    fileSizeText: {
        fontSize: 14,
        color: '#1976D2',
    },
    playbackHandler: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        paddingVertical: 16,
        paddingHorizontal: 10,
        marginTop: 'auto', // Pushes to bottom
    },
    playbackLabel: {
        fontSize: 14,
        color: '#757575',
        marginBottom: 10,
        textAlign: 'center',
    },
    playButton: {
        backgroundColor: '#4CAF50',
        padding: 16,
        borderRadius: 30, // fully rounded
        alignItems: 'center',
        marginBottom: 10,
    },
    disabledButton: {
        backgroundColor: '#A5D6A7',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
