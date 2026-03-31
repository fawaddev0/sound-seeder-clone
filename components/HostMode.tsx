import { Buffer } from 'buffer';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TcpSocket from 'react-native-tcp-socket';

export default function HostMode() {
    const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
    const player = useAudioPlayer(selectedFile ? { uri: selectedFile.uri } : null);
    const audioStatus = useAudioPlayerStatus(player);

    const [server, setServer] = useState<TcpSocket.Server | null>(null);
    const [serverStatus, setServerStatus] = useState('Stopped');
    const [clientCount, setClientCount] = useState(0);
    const [clients, setClients] = useState<TcpSocket.Socket[]>([])

    const selectedFileRef = useRef<DocumentPicker.DocumentPickerAsset | null>(null);
    useEffect(() => {
        selectedFileRef.current = selectedFile;
    }, [selectedFile]);

    useEffect(() => {
        // Configure audio mode for background playback
        setAudioModeAsync({
            playsInSilentMode: true,
            shouldPlayInBackground: true,
            interruptionMode: 'mixWithOthers'
        });

        // Command server
        const newServer = TcpSocket.createServer((socket) => {
            setClientCount((prev) => prev + 1);
            setClients(prev => [...prev, socket])

            if (selectedFileRef.current) {
                socket.write("New file");
            }

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
        }).listen({ host: "0.0.0.0", port: 8080 }, () => console.log("Listening command server on 8080"));

        // HTTP Stream server on mount
        const streamServer = TcpSocket.createServer((socket) => {
            socket.on('data', async (data) => {
                const request = data.toString();
                if (request.startsWith('GET ')) {
                    console.log(`[HTTP STREAM] Received audio request from a speaker! (${request.split('\r\n')[0]})`);
                    const file = selectedFileRef.current;
                    if (!file || !file.size) {
                        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
                        socket.end();
                        return;
                    }

                    let start = 0;
                    let end = file.size - 1;
                    const rangeMatch = request.match(/Range: bytes=(\d+)-(\d*)/);
                    if (rangeMatch) {
                        start = parseInt(rangeMatch[1], 10);
                        if (rangeMatch[2]) {
                            end = parseInt(rangeMatch[2], 10);
                        }
                    }

                    const contentLength = end - start + 1;
                    if (rangeMatch) {
                        socket.write(
                            'HTTP/1.1 206 Partial Content\r\n' +
                            'Content-Type: audio/mpeg\r\n' +
                            `Content-Length: ${contentLength}\r\n` +
                            `Content-Range: bytes ${start}-${end}/${file.size}\r\n` +
                            'Connection: close\r\n\r\n'
                        );
                    } else {
                        socket.write(
                            'HTTP/1.1 200 OK\r\n' +
                            'Content-Type: audio/mpeg\r\n' +
                            `Content-Length: ${file.size}\r\n` +
                            'Accept-Ranges: bytes\r\n' +
                            'Connection: close\r\n\r\n'
                        );
                    }

                    try {
                        const chunkSize = 1024 * 64; // 64KB
                        let position = start;

                        while (position <= end) {
                            const length = Math.min(chunkSize, end - position + 1);
                            const base64Data = await FileSystem.readAsStringAsync(file.uri, {
                                encoding: 'base64',
                                position,
                                length
                            });

                            if (!base64Data) break;

                            const buffer = Buffer.from(base64Data, 'base64');
                            if (buffer.length > 0) {
                                socket.write(buffer);
                                position += buffer.length;
                            }
                            await new Promise(resolve => setTimeout(resolve, 0));
                        }
                    } catch (error) {
                        console.log('HTTP stream error:', error);
                    } finally {
                        socket.end();
                    }
                }
            });
        }).listen({ host: "0.0.0.0", port: 8082 }, () => console.log("HTTP Server Listening on 8082"));

        newServer.on('error', (error) => {
            setServerStatus('Error: ' + error.message);
        });

        streamServer.on('error', (error) => {
            console.log('Stream server error: ', error);
        });

        setServer(newServer);

        return () => {
            newServer.close();
            streamServer.close();
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
                clients.forEach(c => c.write("New file"));
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
            if (audioStatus.playing) {
                clients.forEach(c => c.write(`Stopping audio|${player.currentTime}`))
                player.pause();
            } else {
                clients.forEach(c => c.write("Playing audio"))
                // Give the TCP packets and speaker decoder a tiny head-start to prevent echo
                setTimeout(() => {
                    player.play();
                }, 175);
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
                    <Text style={styles.buttonText}>{audioStatus.playing ? 'Pause' : 'Play'}</Text>
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
